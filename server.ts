import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Render (and most cloud hosts) assign the actual port via process.env.PORT
// at runtime — the container MUST bind to that port, not a hardcoded one.
// 3000 is only used as a local-dev fallback.
const PORT = Number(process.env.PORT) || 3000;

// Increase JSON payload limits (base64 audio / long chat history payloads)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ============================================================================
// Google GenAI client — SERVER SIDE ONLY.
// The API key is read from process.env on the Node process and is NEVER sent
// to the browser (no `define` injection, no bundling into client JS).
// ============================================================================
// ----------------------------------------------------------------------------
// Settings state — reverted back to the original "day one" pattern: simple
// shared module-level variables, set once via setAiSettings()/POST /api/settings
// and read directly by every call. This app is single-user, so the earlier
// per-request statelessness (meant to guard against multi-user concurrency)
// has been removed at the user's request as unnecessary complexity.
// ----------------------------------------------------------------------------
let customApiKey: string | null = null;
let selectedTextModel: string = "gemini-3.5-flash";
let selectedTtsModel: string = "gemini-3.1-flash-tts-preview";
let thinkingLevel: "low" | "normal" | "high" = "low";

const ALLOWED_TEXT_MODELS: Record<string, boolean> = {
  "gemini-3.5-flash": true,
  "gemini-3.0-flash": true,
  "gemini-3.1-flash-lite": true,
  "gemini-2.5-flash": true,
  "gemini-2.5-flash-lite": true,
};
const THINKING_CAPABLE_MODELS = new Set(["gemini-3.5-flash", "gemini-3.0-flash", "gemini-2.5-flash"]);

const ALLOWED_TTS_MODELS: Record<string, boolean> = {
  "gemini-3.1-flash-tts-preview": true,
  "gemini-2.5-flash": true,
};

function getGenAI(): GoogleGenAI {
  const keyToUse = customApiKey && customApiKey.trim().length > 0 ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error("GEMINI_API_KEY environment variable is not defined in Secrets.");
  }
  return new GoogleGenAI({
    apiKey: keyToUse,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

// Updates the shared settings — mirrors the old client-side setAiSettings().
app.post("/api/settings", (req, res) => {
  const { apiKey, model, thinking, ttsModel } = req.body;
  customApiKey = apiKey || null;
  selectedTextModel = model && ALLOWED_TEXT_MODELS[model] ? model : "gemini-3.5-flash";
  const supportsThinking = THINKING_CAPABLE_MODELS.has(selectedTextModel);
  thinkingLevel = supportsThinking && (thinking === "low" || thinking === "normal" || thinking === "high") ? thinking : "low";
  selectedTtsModel = ttsModel && ALLOWED_TTS_MODELS[ttsModel] ? ttsModel : "gemini-3.1-flash-tts-preview";
  res.json({ ok: true });
});

/**
 * Builds the { model, config } pair for a text generation call, reading
 * directly from the shared settings state above (no parameters — same as
 * the original geminiService.ts's getTextModelConfig()).
 */
function buildTextModelConfig() {
  const modelId = selectedTextModel;
  const supportsThinking = THINKING_CAPABLE_MODELS.has(modelId);

  const config: any = {
    systemInstruction: "You are a helpful AI.",
    temperature: 0.7,
  };

  if (supportsThinking && thinkingLevel !== "low") {
    if (modelId.startsWith("gemini-3.")) {
      config.thinkingConfig = { thinkingLevel: thinkingLevel === "high" ? "HIGH" : "LOW" };
    } else {
      config.thinkingConfig = { thinkingBudget: thinkingLevel === "high" ? 2048 : 1024 };
    }
  }

  return {
    model: modelId,
    config,
    usedModelInfo: { modelId, thinkingEnabled: thinkingLevel !== "low", thinkingLevel },
  };
}

/**
 * Retry logic with TWO fully independent counters/conditions, as requested:
 *  - 429 (rate limit / quota): up to `maxRetries` (default 1) extra attempts,
 *    2s × attempt backoff — unchanged from before.
 *  - 503 (server overloaded): its OWN separate counter, always exactly 3
 *    extra attempts, short fixed 1s interval — completely independent of
 *    the 429 counter/limit above, per the user's explicit requirement.
 */
async function generateWithRetry<T>(operation: () => Promise<T>, maxRetries = 1): Promise<T> {
  let rateLimitAttempts = 0;
  let overloadAttempts = 0;
  const MAX_503_RETRIES = 3;
  const RETRY_503_DELAY_MS = 1000; // short, fixed interval for transient server overload

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      const status = error?.status;

      if (status === 503) {
        if (overloadAttempts < MAX_503_RETRIES) {
          overloadAttempts++;
          console.warn(`Gemini overloaded (503). Retry ${overloadAttempts}/${MAX_503_RETRIES}...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_503_DELAY_MS));
          continue;
        }
        throw error;
      }

      if (status === 429) {
        if (rateLimitAttempts < maxRetries) {
          rateLimitAttempts++;
          console.warn(`Rate limited (429). Retry ${rateLimitAttempts}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, rateLimitAttempts * 2000));
          continue;
        }
        throw error;
      }

      throw error;
    }
  }
}

// Normalizes a thrown Gemini/SDK error into a stable { status, message } shape
// so the (unchanged) client-side quota-detection logic keeps working exactly
// as before — it only needs error.status and an error.message string.
function sendApiError(res: express.Response, error: any, context: string) {
  console.error(`Gemini API error [${context}]:`, error);
  const status = typeof error?.status === "number" ? error.status : 500;
  const message = error?.message || error?.toString() || "خطای ناشناخته در ارتباط با هوش مصنوعی.";
  res.status(status).json({ error: message, status, details: error?.toString?.() });
}

// ============================================================================
// Shared prompt-building helpers (ported as-is from the old geminiService.ts)
// ============================================================================
type AnalysisStyle = "news" | "podcast" | "deep" | "quick";

const getPersianDate = (): string =>
  new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

const getGregorianAndPersianDays = (numDays: number) => {
  const mapping: { greg: string; pers: string; relative: string }[] = [];
  const now = new Date();
  const relativeLabels = ["امروز", "دیروز", "۲ روز پیش", "۳ روز پیش", "۴ روز پیش", "۵ روز پیش", "۶ روز پیش", "۷ روز پیش", "۸ روز پیش"];
  for (let i = 0; i <= numDays; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    mapping.push({
      greg: d.toISOString().split("T")[0],
      pers: new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
      relative: relativeLabels[i] || `${i} روز پیش`,
    });
  }
  return mapping;
};

const getStyleInstruction = (style: AnalysisStyle, isDaily = false): string => {
  const commonDateRule = isDaily
    ? `
  **قانون حیاتی تاریخ (Critical Date Rule):**
  - تاریخ شمسی خبر را فقط و فقط یک بار در همان ابتدای کل متن (آغاز کلام) بنویس.
  - به هیچ عنوان تاریخ را در شروع خبرهای فرعی بعدی یا پاراگراف‌های دیگر تکرار نکن.
  - تمام اخبار امروز باید به صورت زنجیره‌وار و پیوسته زیر این تاریخ یکتا و اولیه قرار بگیرند.
  `
    : `
  **قانون حیاتی تاریخ (Critical Date Rule):**
  - قبل از بیان هر خبر یا پاراگراف جدید، حتماً تاریخ وقوع آن را به شمسی ذکر کن.
  - فرمت: "روز ماه - متن خبر". (مثال: "۲ دی - شرکت اپل اعلام کرد...")
  - تاریخ‌ها باید بر اساس واقعیت و سرچ گوگل باشند. از تاریخ‌های غلط پرهیز کن.
  `;

  switch (style) {
    case "news":
      return `
      ${commonDateRule}
      **سبک: خبری (News Mode)**
      - نقش: گوینده اخبار رسمی و حرفه‌ای.
      - لحن: جدی، قاطع، بدون حاشیه و رسمی.
      - ساختار: ${isDaily ? "در ابتدا تاریخ امروز را یک‌بار بگو، سپس خبرها را به صورت تیترهای استاندارد و حرفه‌ای پشت سر هم بیاور بدون اینکه برای هر تیتر تاریخ را تکرار کنی." : "هر خبر را با تاریخ دقیق شروع کن. تیتروار و استاندارد."}
      `;
    case "podcast":
      return `
      ${commonDateRule}
      **سبک: پادکست (Podcast Mode)**
      - نقش: پادکستر تکنولوژی.
      - لحن: صمیمی و گرم، اما در مورد تاریخ‌ها دقیق باش.
      - ساختار: ${isDaily ? "پادکست را با ذکر یک‌باره‌ی تاریخ امروز شروع کن (مثلاً \"خب همراهان عزیز، امروز [تاریخ] است و اینم از اخبار جدید...\") و خبرهای فرعی امروز را پشت سر هم بگو بدون تکرار مجدد تاریخ." : "با گفتن تاریخ (مثلاً \"خب، بریم سراغ ۲ دی...\") خبر را شروع کن."}
      `;
    case "deep":
      return `
      ${commonDateRule}
      **سبک: تحلیل عمیق (Deep Analysis)**
      - نقش: تحلیلگر ارشد.
      - لحن: تحلیلی و دقیق.
      - ساختار: ${isDaily ? "در آغاز متن ابتدا ۱ بار تاریخ امروز را بیان کن، سپس به ریشه‌یابی و تحلیل اخبار مختلف امروز بپرداز بدون تکرار تاریخ." : "ابتدا تاریخ خبر را بگو، سپس تحلیل و ریشه‌یابی کن."}
      `;
    case "quick":
      return `
      ${commonDateRule}
      **سبک: سریع (Quick Summary)**
      - نقش: خلاصه‌نویس.
      - لحن: سریع و چکشی.
      - ساختار: ${isDaily ? "تنها یک بار در خط اول تاریخ امروز را ذکر کن. سپس لیست خبرهای خلاصه را به صورت Bullet-points (-) ادامه بده بدون اینکه در شروع هر بولت تاریخ بگذاری." : "لیست وار: [تاریخ] - [خلاصه خبر]."}
      `;
    default:
      return "";
  }
};

const BASE_SYSTEM_INSTRUCTION = `
    وظیفه شما تحلیل محتوا، صحت‌سنجی تاریخ‌ها و سنجش اعتبار است.

    بخش سنجش اعتبار (Credibility Score):
    - بر اساس اعتبار دامنه وب‌سایت و پوشش خبری، از 0 تا 100 امتیاز بده.

    بخش سوالات پیشنهادی:
    - دقیقاً ۳ سوال کوتاه که کاربر ممکن است بپرسد.

    **فرمت خروجی (JSON):**
    {
      "analysis": "متن تولید شده...",
      "questions": ["سوال ۱", "سوال ۲", "سوال ۳"],
      "credibilityScore": 85
    }
`;

interface SourceLink { title: string; url: string }
interface CredibilityData { score: number; level: "low" | "doubtful" | "trustworthy" | "verified"; label: string }

function determineCredibility(score: number): CredibilityData {
  let level: CredibilityData["level"] = "doubtful";
  let label = "نیازمند بررسی";
  if (score <= 40) { level = "low"; label = "کم‌اعتبار / شایعه"; }
  else if (score <= 70) { level = "doubtful"; label = "نیازمند بررسی"; }
  else if (score <= 90) { level = "trustworthy"; label = "موثق / معتبر"; }
  else { level = "verified"; label = "کاملاً معتبر"; }
  return { score, level, label };
}

function extractGroundingSources(response: any): SourceLink[] {
  const sources: SourceLink[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri && !sources.some((s) => s.url === chunk.web.uri)) {
        sources.push({ title: chunk.web.title || new URL(chunk.web.uri).hostname, url: chunk.web.uri });
      }
    });
  }
  return sources;
}

function processAnalysisResponse(response: any) {
  const sources = extractGroundingSources(response);
  let textResponse: string | undefined = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) throw new Error("No text analysis received from the model.");

  textResponse = textResponse.trim();
  textResponse = textResponse.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const jsonStart = textResponse.indexOf("{");
  const jsonEnd = textResponse.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) textResponse = textResponse.substring(jsonStart, jsonEnd + 1);

  let parsedResult: { text: string; questions: string[]; sources: SourceLink[]; credibility?: CredibilityData };
  try {
    const json = JSON.parse(textResponse);
    const score = typeof json.credibilityScore === "number" ? json.credibilityScore : 80;
    parsedResult = { text: json.analysis, questions: json.questions || [], sources, credibility: determineCredibility(score) };
  } catch {
    let questions: string[] = [];
    const questionsMatch = textResponse.match(/"questions"\s*:\s*\[(.*?)\]/s);
    if (questionsMatch?.[1]) {
      questions = questionsMatch[1].split(",").map((q) => q.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"')).filter((q) => q.length > 0);
    }
    const analysisMatch = textResponse.match(/"analysis"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    let analysisText = "";
    if (analysisMatch?.[1]) {
      analysisText = analysisMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else if (!textResponse.includes('"analysis":')) {
      analysisText = textResponse;
    }
    const scoreMatch = textResponse.match(/"credibilityScore"\s*:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;
    parsedResult = { text: analysisText || "خطا در تحلیل متن.", questions, sources, credibility: determineCredibility(score) };
  }

  const questionMarkers = [/\n\s*سوالات پیشنهادی:.*/s, /\n\s*سوالات:.*/s, /\n\s*Questions:.*/s];
  for (const marker of questionMarkers) {
    const match = parsedResult.text.match(marker);
    if (match) {
      const embeddedSection = match[0];
      parsedResult.text = parsedResult.text.replace(marker, "").trim();
      if (!parsedResult.questions || parsedResult.questions.length === 0) {
        const extractedQs = embeddedSection.split("\n").map((line) => line.replace(/^[\-\d\.\s]+/, "").trim()).filter((line) => line.includes("?") || line.length > 5);
        if (extractedQs.length > 0) parsedResult.questions = extractedQs.slice(0, 3);
      }
    }
  }
  if (!parsedResult.questions || parsedResult.questions.length === 0) {
    parsedResult.questions = (parsedResult.credibility?.score || 100) < 70
      ? ["منبع دقیق این خبر چیست؟", "آیا تایید رسمی شده؟", "شواهد چیست؟"]
      : ["بیشتر توضیح بده", "چرا این مهمه؟", "مثال بزن"];
  }
  return parsedResult;
}

function processQAResponse(response: any) {
  const sources = extractGroundingSources(response);
  let text: string | undefined = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response received.");
  text = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);

  let answerText = "";
  let nextQs: string[] = [];
  let credibility: CredibilityData | undefined;
  try {
    const json = JSON.parse(text);
    answerText = json.answer;
    nextQs = Array.isArray(json.nextQuestions) && json.nextQuestions.length > 0 ? json.nextQuestions : [];
    const score = typeof json.credibilityScore === "number" ? json.credibilityScore : 60;
    credibility = determineCredibility(score);
  } catch {
    const answerMatch = text.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    answerText = answerMatch ? answerMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : text.replace(/[{}]/g, "").trim();
    const qMatch = text.match(/"(?:nextQuestions|questions)"\s*:\s*\[(.*?)\]/s);
    if (qMatch?.[1]) nextQs = qMatch[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "").replace(/\\"/g, '"')).filter((s) => s.length > 0);
    const scoreMatch = text.match(/"credibilityScore"\s*:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    credibility = determineCredibility(score);
  }

  const questionMarkers = [/\n\s*سوالات بعدی:.*/s, /\n\s*Next Questions:.*/s];
  for (const marker of questionMarkers) {
    if (answerText.match(marker)) answerText = answerText.replace(marker, "").trim();
  }
  if (!nextQs.length) nextQs = ["ادامه بده", "توضیح بیشتر", "مرتبط با این موضوع"];
  return { answer: answerText, nextQuestions: nextQs, sources, credibility };
}

// ============================================================================
// Routes
// ============================================================================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Text-to-Speech ---
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName = "Kore" } = req.body;
    if (!text) { res.status(400).json({ error: "Missing 'text'." }); return; }

    const ai = getGenAI();
    const modelId = selectedTtsModel;

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      })
    );

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (audioPart?.inlineData?.data) {
      res.json({ audio: audioPart.inlineData.data });
    } else {
      throw new Error("No audio data received from the model.");
    }
  } catch (error: any) {
    sendApiError(res, error, "tts");
  }
});

// --- Rewrite text for TTS style ---
app.post("/api/rewrite", async (req, res) => {
  try {
    const { text, style } = req.body;
    if (style === "normal" || !text) { res.json({ text }); return; }

    const stylePrompts: Record<string, string> = {
      podcast: "لحن پادکستی، روایی، جذاب، شنیدنی و کمی نمایشی",
      simple: "لحن بسیار ساده، کوتاه، مستقیم، بدون پیچیدگی و قابل فهم برای همه",
      intimate: "لحن صمیمی، گرم، دوستانه، خودمانی و غیررسمی",
      romantic: "لحن عاشقانه، احساسی، شاعرانه، لطیف و ادبی",
    };
    const prompt = `
    وظیفه: بازنویسی متن زیر برای تبدیل به گفتار (Text-to-Speech) به زبان فارسی.
    سبک مورد نظر: ${stylePrompts[style] || ""}.

    دستورالعمل:
    1. مفهوم متن اصلی باید کاملاً حفظ شود.
    2. فقط لحن و کلمات تغییر کنند تا با سبک "${style}" همخوانی داشته باشند.
    3. خروجی نهایی فقط متن بازنویسی شده باشد. هیچ توضیح اضافه‌ای نده.

    متن اصلی:
    "${text}"
    `;

    const ai = getGenAI();
    const { model, config } = buildTextModelConfig();
    const response = await generateWithRetry(() =>
      ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config })
    );
    const rewritten = response.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ text: rewritten?.trim() || text });
  } catch (error: any) {
    // Same "fail soft to original text" behavior as the original client code
    console.error("Rewrite error:", error);
    res.json({ text: req.body?.text || "" });
  }
});

// --- Weekly topic analysis ---
app.post("/api/analyze-topic", async (req, res) => {
  try {
    const { topicId, topicLabel, style } = req.body;
    const todayDate = getPersianDate();
    const todayGregorian = new Date().toISOString().split("T")[0];
    const daysMapping = getGregorianAndPersianDays(8);
    const mappingTableStr = daysMapping.map((d) => `- میلادی: ${d.greg} -> شمسی: ${d.pers} (${d.relative})`).join("\n");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startGregorian = startDate.toISOString().split("T")[0];
    const styleInstruction = getStyleInstruction(style);

    let searchInstructions = "";
    let sourceConstraint = "";
    if (topicId === "custom_search") {
      searchInstructions = `در گوگل جستجو کن: "${topicLabel}" after:${startGregorian} before:${todayGregorian}`;
      sourceConstraint = "منابع معتبر را بررسی کن تا تاریخ‌ها دقیق باشند.";
    } else if (topicId === "cinema_iran" || topicId === "music_iran") {
      sourceConstraint = "فقط از منابع خبری معتبر داخلی استفاده کن.";
      searchInstructions = topicId === "cinema_iran"
        ? `در گوگل جستجو کن: "اخبار سینمای ایران" after:${startGregorian} before:${todayGregorian}`
        : `در گوگل جستجو کن: "اخبار موسیقی ایران" after:${startGregorian} before:${todayGregorian}`;
    } else {
      sourceConstraint = "از منابع معتبر بین‌المللی استفاده کن و تاریخ میلادی را دقیق به شمسی تبدیل کن.";
      searchInstructions = `Search Google for: "${topicLabel} news" after:${startGregorian} before:${todayGregorian}`;
    }

    const prompt = `
    ${BASE_SYSTEM_INSTRUCTION}
    ${styleInstruction}
    موضوع: **${topicLabel}**
    تاریخ امروز (شمسی): ${todayDate}
    تاریخ امروز (میلادی): ${todayGregorian}
    بازه زمانی دقیق هفتگی: از ${startGregorian} تا ${todayGregorian} (۷ روز گذشته)
    جدول تطبیقی دقیق تاریخ میلادی به شمسی:
    ${mappingTableStr}
    دستورالعمل‌های حیاتی:
    1. ${searchInstructions}
    2. ${sourceConstraint}
    3. ابتدا "تاریخ شمسی" هر روز را بنویس، سپس اخبار آن روز را کامل شرح بده، سپس به روز قبل برو.
    4. فقط از تاریخ شمسی استفاده کن، هرگز تاریخ میلادی در خروجی نهایی نیاید.
    5. اخبار مهم هر یک از ۷ روز گذشته را کامل پوشش بده.
    `;

    const ai = getGenAI();
    const { model, config, usedModelInfo } = buildTextModelConfig();
    const response = await generateWithRetry(() =>
      ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { ...config, tools: [{ googleSearch: {} }] } })
    );
    const result: any = processAnalysisResponse(response);
    result.usedModel = usedModelInfo;
    res.json(result);
  } catch (error: any) {
    sendApiError(res, error, "analyze-topic");
  }
});

// --- Daily (last 24h) topic analysis ---
app.post("/api/analyze-daily", async (req, res) => {
  try {
    const { topicId, topicLabel, style } = req.body;
    const todayDate = getPersianDate();
    const daysMapping = getGregorianAndPersianDays(2);
    const mappingTableStr = daysMapping.map((d) => `- میلادی: ${d.greg} -> شمسی: ${d.pers} (${d.relative})`).join("\n");
    const now = new Date();
    const endGregorian = now.toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startGregorian = yesterday.toISOString();
    const styleInstruction = getStyleInstruction(style, true);

    let searchInstructions = "";
    let sourceConstraint = "";
    if (topicId === "custom_search") {
      searchInstructions = `در گوگل جستجو کن: "${topicLabel}" after:${startGregorian.split("T")[0]} "اخبار ${topicLabel} امروز"`;
      sourceConstraint = "فقط منابع آپدیت شده در امروز را بررسی کن.";
    } else if (topicId === "cinema_iran" || topicId === "music_iran") {
      sourceConstraint = "فقط اخبار منتشر شده در امروز از منابع خبری معتبر داخلی را بررسی کن.";
      searchInstructions = topicId === "cinema_iran"
        ? `در گوگل جستجو کن: "اخبار سینما ایران" after:${startGregorian.split("T")[0]}`
        : `در گوگل جستجو کن: "اخبار موسیقی ایران" after:${startGregorian.split("T")[0]}`;
    } else {
      sourceConstraint = "از منابع معتبر بین‌المللی استفاده کن، فقط اخبار امروز (۲۴ ساعت اخیر) را استخراج کن.";
      searchInstructions = `Search Google for: "${topicLabel} news" after:${startGregorian.split("T")[0]}`;
    }

    const prompt = `
    ${BASE_SYSTEM_INSTRUCTION}
    ${styleInstruction}
    موضوع: **${topicLabel}**
    تاریخ امروز (شمسی): ${todayDate}
    بازه زمانی دقیق ۲۴ ساعت گذشته: از ${startGregorian} تا ${endGregorian}
    جدول تطبیقی دقیق تاریخ:
    ${mappingTableStr}
    دستورالعمل‌های حیاتی:
    1. ${searchInstructions} فقط ۲۴ ساعت اخیر.
    2. ${sourceConstraint}
    3. در خروجی فقط از تاریخ شمسی (${todayDate}) استفاده کن، فقط یک‌بار در ابتدا.
    4. اکیداً اخبار دیروز یا قبل‌تر را حذف کن.
    `;

    const ai = getGenAI();
    const { model, config, usedModelInfo } = buildTextModelConfig();
    const response = await generateWithRetry(() =>
      ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { ...config, tools: [{ googleSearch: {} }] } })
    );
    const result: any = processAnalysisResponse(response);
    result.usedModel = usedModelInfo;
    res.json(result);
  } catch (error: any) {
    sendApiError(res, error, "analyze-daily");
  }
});

// --- Analyze a specific URL ---
app.post("/api/analyze-url", async (req, res) => {
  try {
    const { url, style } = req.body;
    const todayDate = getPersianDate();
    const styleInstruction = getStyleInstruction(style);
    const prompt = `
    ${BASE_SYSTEM_INSTRUCTION}
    ${styleInstruction}
    تاریخ امروز: ${todayDate}
    یک لینک خبر به شما داده می‌شود: ${url}
    1. لینک را بخوان.
    2. تاریخ انتشار یا تاریخ وقوع رویداد ذکر شده در متن را پیدا کن.
    3. متن تحلیل را حتماً با ذکر تاریخ شمسی آن رویداد شروع کن.
    `;

    const ai = getGenAI();
    const { model, config, usedModelInfo } = buildTextModelConfig();

    try {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { ...config, tools: [{ googleSearch: {} }] } })
      );
      const result: any = processAnalysisResponse(response);
      result.usedModel = usedModelInfo;
      res.json(result);
    } catch (innerError: any) {
      if (innerError.status === 403) {
        const fallbackPrompt = prompt + "\n\n(توجه: دسترسی به جستجو مقدور نیست. بر اساس متن و دامنه URL تحلیل کن.)";
        const response = await generateWithRetry(() =>
          ai.models.generateContent({ model, contents: [{ parts: [{ text: fallbackPrompt }] }], config })
        );
        const result: any = processAnalysisResponse(response);
        result.usedModel = usedModelInfo;
        res.json(result);
        return;
      }
      throw innerError;
    }
  } catch (error: any) {
    sendApiError(res, error, "analyze-url");
  }
});

// --- Follow-up Q&A chat ---
app.post("/api/ask-question", async (req, res) => {
  try {
    const { contextText, question, history = [] } = req.body;
    const historyText = (history as any[]).map((msg) => `${msg.role === "user" ? "کاربر" : "دستیار"}: ${msg.text}`).join("\n");
    const prompt = `
    زمینه گفتگو (تحلیل قبلی): """${contextText}"""
    تاریخچه چت: """${historyText}"""
    سوال کاربر: "${question}"
    دستورالعمل:
    1. **جستجوی گوگل اجباری:** برای پاسخ به این سوال، در گوگل جستجو کن.
    2. **سنجش اعتبار پاسخ:** امتیاز 0 تا 100 بده.
    3. پاسخ کوتاه و مفید باشد.
    فرمت خروجی JSON:
    { "answer": "...", "nextQuestions": ["...", "...", "..."], "credibilityScore": 85 }
    `;

    const ai = getGenAI();
    const { model, config, usedModelInfo } = buildTextModelConfig();

    try {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { ...config, tools: [{ googleSearch: {} }] } })
      );
      const result: any = processQAResponse(response);
      result.usedModel = usedModelInfo;
      res.json(result);
    } catch (innerError: any) {
      if (innerError.status === 403) {
        const fallbackPrompt = prompt + "\n(جستجو در دسترس نیست، تخمینی پاسخ بده)";
        const response = await generateWithRetry(() =>
          ai.models.generateContent({ model, contents: [{ parts: [{ text: fallbackPrompt }] }], config })
        );
        const result: any = processQAResponse(response);
        result.usedModel = usedModelInfo;
        res.json(result);
        return;
      }
      throw innerError;
    }
  } catch (error: any) {
    sendApiError(res, error, "ask-question");
  }
});

// --- Live "radar" intelligence report ---
app.post("/api/radar-report", async (req, res) => {
  try {
    const prompt = `
    You are an advanced global intelligence AI.
    Your task is to scan the top news, geopolitical events, and tech advancements of the last 24 hours.
    Output a strictly formatted JSON object representing a "Radar Report". No markdown block.
    Ensure ALL text fields are in the Persian (Farsi) language.
    Format:
    {
      "globalMood": <number 0-100>,
      "volatility": <number 0-100>,
      "topEntities": [{"name": "نام موجودیت به فارسی", "sentiment": "positive"|"neutral"|"negative", "mentions": <1-100>, "trend": "up"|"down"|"stable"}],
      "threats": ["تهدید ۱ به فارسی"],
      "opportunities": ["فرصت ۱ به فارسی"],
      "briefing": "یک خلاصه دو جمله‌ای اجرایی به زبان فارسی."
    }
    `;
    const ai = getGenAI();
    const { model, config, usedModelInfo } = buildTextModelConfig();
    const response = await generateWithRetry(() =>
      ai.models.generateContent({ model, contents: [{ parts: [{ text: prompt }] }], config: { ...config, tools: [{ googleSearch: {} }] } })
    );
    let text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response received.");
    text = text.replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "");
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);
    const reportData = JSON.parse(text);
    reportData.usedModel = usedModelInfo;
    res.json(reportData);
  } catch (error: any) {
    console.error("Radar generation error:", error);
    // Same graceful demo-data fallback as the original client code
    res.json({
      globalMood: 50,
      volatility: 50,
      topEntities: [
        { name: "هوش مصنوعی", sentiment: "positive", mentions: 90, trend: "up" },
        { name: "بازارهای مالی", sentiment: "neutral", mentions: 70, trend: "stable" },
        { name: "تغییرات اقلیمی", sentiment: "negative", mentions: 50, trend: "down" },
      ],
      threats: ["خطاهای موقتی شبکه در اتصال به هوش مصنوعی"],
      opportunities: ["تحلیل‌های داده‌محور زنده"],
      briefing: "در ارتباط با هسته هوش مصنوعی خطایی رخ داد. این داده‌ها دمو هستند.",
    });
  }
});

// --- Supplementary/expanded news info for a single sentence ---
app.post("/api/supplementary-news", async (req, res) => {
  try {
    const { newsText } = req.body;
    const prompt = `
    شما یک تحلیلگر اخبار و روزنامه‌نگار حرفه‌ای هستید.
    وظیفه شما: ارائه اطلاعات تکمیلی، جامع اما خلاصه‌تر از کل مرجع خبر، مفید و کامل درباره خبر یا جمله زیر است.
    جمله یا خبر مورد نظر: "${newsText}"
    دستورالعمل‌ها:
    1. متن تکمیلی باید تمامی نکات مربوط به این خبر را پوشش دهد، به زبان فارسی روان.
    2. جستجو در وب برای یافتن جدیدترین و مطلع‌ترین اطلاعات الزامی است.
    3. آرایه sources را در قالب JSON کاملاً خالی [] بگذار؛ منابع واقعی به طور خودکار از grounding استخراج می‌شوند.
    خروجی را صرفاً در قالب یک شیء JSON برگردانید:
    { "summary": "متن کامل اطلاعات تکمیلی به زبان فارسی..." }
    `;
    const ai = getGenAI();
    const { model, config } = buildTextModelConfig();

    const runCall = async (finalPrompt: string, withSearch: boolean) => {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: finalPrompt }] }],
          config: withSearch ? { ...config, tools: [{ googleSearch: {} }] } : config,
        })
      );
      let textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("پاسخی از مدل دریافت نشد.");
      textResponse = textResponse.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
      const jsonStart = textResponse.indexOf("{");
      const jsonEnd = textResponse.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) textResponse = textResponse.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(textResponse);
      return { parsed, response };
    };

    let parsed: any, response: any;
    try {
      ({ parsed, response } = await runCall(prompt, true));
    } catch (innerError: any) {
      if (innerError.status === 403 || innerError.toString().includes("PERMISSION_DENIED")) {
        ({ parsed, response } = await runCall(prompt + "\n(توجه: جستجوی گوگل قطع است، پاسخ تفصیلی به این خبر بنویسید)", false));
      } else {
        throw innerError;
      }
    }

    // Show every real source grounding actually found — never pad or cap to
    // a fixed count. Only when literally zero sources were found do we add
    // a single live Google search link as the sole fallback.
    const finalSources: SourceLink[] = extractGroundingSources(response);
    if (finalSources.length === 0) {
      finalSources.push({ title: "جستجوی زنده گوگل درباره این خبر", url: `https://www.google.com/search?q=${encodeURIComponent(newsText)}` });
    }

    res.json({ summary: parsed.summary || "اطلاعات تکمیلی در دسترس نیست.", sources: finalSources });
  } catch (error: any) {
    sendApiError(res, error, "supplementary-news");
  }
});

// ============================================================================
// Vite middleware (dev) / static serving (prod) — identical pattern to Zencraft
// ============================================================================
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zendia Backend running on port ${PORT}`);
  });
}

initServer().catch((e) => {
  console.error("Failed to start server:", e);
});
