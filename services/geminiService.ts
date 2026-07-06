
import { GoogleGenAI, Modality } from "@google/genai";
import { ChatMessage, AnalysisResult, AnalysisStyle, QAResponse, SourceLink, CredibilityData, RewriteStyle } from "../types";

// Dynamic API Key Support
let customApiKey: string | null = null;

export const setCustomApiKey = (key: string | null) => {
  customApiKey = key;
};

export const getCustomApiKey = () => {
  return customApiKey;
};

const getAiInstance = () => {
  const apiKey = customApiKey || process.env.API_KEY;
  return new GoogleGenAI({ apiKey });
};

const ai = {
  get models() {
    return getAiInstance().models;
  }
};

// Models
const TEXT_MODEL = 'gemini-3.1-flash-lite';
const TTS_MODEL = 'gemini-2.5-flash';

export const generatePersianSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.[0];
    
    if (audioPart?.inlineData?.data) {
      return audioPart.inlineData.data;
    } else {
      throw new Error("No audio data received from the model.");
    }
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

export const rewriteText = async (text: string, style: RewriteStyle): Promise<string> => {
  if (style === 'normal') return text;

  const stylePrompts: Record<string, string> = {
    podcast: "لحن پادکستی، روایی، جذاب، شنیدنی و کمی نمایشی",
    simple: "لحن بسیار ساده، کوتاه، مستقیم، بدون پیچیدگی و قابل فهم برای همه",
    intimate: "لحن صمیمی، گرم، دوستانه، خودمانی و غیررسمی",
    romantic: "لحن عاشقانه، احساسی، شاعرانه، لطیف و ادبی"
  };

  const prompt = `
    وظیفه: بازنویسی متن زیر برای تبدیل به گفتار (Text-to-Speech) به زبان فارسی.
    سبک مورد نظر: ${stylePrompts[style]}.
    
    دستورالعمل:
    1. مفهوم متن اصلی باید کاملاً حفظ شود.
    2. فقط لحن و کلمات تغییر کنند تا با سبک "${style}" همخوانی داشته باشند.
    3. خروجی نهایی فقط متن بازنویسی شده باشد. هیچ توضیح اضافه‌ای نده.

    متن اصلی:
    "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    
    let rewritten = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return rewritten?.trim() || text;
  } catch (error) {
    console.error("Rewrite error:", error);
    return text; // Fallback to original if error
  }
};

const getStyleInstruction = (style: AnalysisStyle, isDaily: boolean = false): string => {
  const commonDateRule = isDaily ? `
  **قانون حیاتی تاریخ (Critical Date Rule):**
  - تاریخ شمسی خبر را فقط و فقط یک بار در همان ابتدای کل متن (آغاز کلام) بنویس.
  - به هیچ عنوان تاریخ را در شروع خبرهای فرعی بعدی یا پاراگراف‌های دیگر تکرار نکن.
  - تمام اخبار امروز باید به صورت زنجیره‌وار و پیوسته زیر این تاریخ یکتا و اولیه قرار بگیرند.
  ` : `
  **قانون حیاتی تاریخ (Critical Date Rule):**
  - قبل از بیان هر خبر یا پاراگراف جدید، حتماً تاریخ وقوع آن را به شمسی ذکر کن.
  - فرمت: "روز ماه - متن خبر". (مثال: "۲ دی - شرکت اپل اعلام کرد...")
  - تاریخ‌ها باید بر اساس واقعیت و سرچ گوگل باشند. از تاریخ‌های غلط پرهیز کن.
  `;

  switch (style) {
    case 'news':
      return `
      ${commonDateRule}
      **سبک: خبری (News Mode)**
      - نقش: گوینده اخبار رسمی و حرفه‌ای.
      - لحن: جدی، قاطع، بدون حاشیه و رسمی.
      - ساختار: ${isDaily ? 'در ابتدا تاریخ امروز را یک‌بار بگو، سپس خبرها را به صورت تیترهای استاندارد و حرفه‌ای پشت سر هم بیاور بدون اینکه برای هر تیتر تاریخ را تکرار کنی.' : 'هر خبر را با تاریخ دقیق شروع کن. تیتروار و استاندارد.'}
      `;
    case 'podcast':
      return `
      ${commonDateRule}
      **سبک: پادکست (Podcast Mode)**
      - نقش: پادکستر تکنولوژی.
      - لحن: صمیمی و گرم، اما در مورد تاریخ‌ها دقیق باش.
      - ساختار: ${isDaily ? 'پادکست را با ذکر یک‌باره‌ی تاریخ امروز شروع کن (مثلاً "خب همراهان عزیز، امروز [تاریخ] است و اینم از اخبار جدید...") و خبرهای فرعی امروز را پشت سر هم بگو بدون تکرار مجدد تاریخ.' : 'با گفتن تاریخ (مثلاً "خب، بریم سراغ ۲ دی...") خبر را شروع کن.'}
      `;
    case 'deep':
      return `
      ${commonDateRule}
      **سبک: تحلیل عمیق (Deep Analysis)**
      - نقش: تحلیلگر ارشد.
      - لحن: تحلیلی و دقیق.
      - ساختار: ${isDaily ? 'در آغاز متن ابتدا ۱ بار تاریخ امروز را بیان کن، سپس به ریشه‌یابی و تحلیل اخبار مختلف امروز بپرداز بدون تکرار تاریخ.' : 'ابتدا تاریخ خبر را بگو، سپس تحلیل و ریشه‌یابی کن.'}
      `;
    case 'quick':
      return `
      ${commonDateRule}
      **سبک: سریع (Quick Summary)**
      - نقش: خلاصه‌نویس.
      - لحن: سریع و چکشی.
      - ساختار: ${isDaily ? 'تنها یک بار در خط اول تاریخ امروز را ذکر کن. سپس لیست خبرهای خلاصه را به صورت Bullet-points (-) ادامه بده بدون اینکه در شروع هر بولت تاریخ بگذاری.' : 'لیست وار: [تاریخ] - [خلاصه خبر].'}
      `;
    default:
      return "";
  }
};

const getPersianDate = (): string => {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
};

const getGregorianAndPersianDays = (numDays: number): { greg: string; pers: string; relative: string }[] => {
  const mapping: { greg: string; pers: string; relative: string }[] = [];
  const now = new Date();
  
  const relativeLabels = [
    "امروز",
    "دیروز",
    "۲ روز پیش",
    "۳ روز پیش",
    "۴ روز پیش",
    "۵ روز پیش",
    "۶ روز پیش",
    "۷ روز پیش",
    "۸ روز پیش"
  ];

  for (let i = 0; i <= numDays; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const gregStr = d.toISOString().split('T')[0];
    const persStr = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    mapping.push({ 
      greg: gregStr, 
      pers: persStr,
      relative: relativeLabels[i] || `${i} روز پیش`
    });
  }
  return mapping;
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

export const analyzeNewsFromTopic = async (topicId: string, topicLabel: string, style: AnalysisStyle): Promise<AnalysisResult> => {
    const todayDate = getPersianDate();
    const todayGregorian = new Date().toISOString().split('T')[0];
    const daysMapping = getGregorianAndPersianDays(8);
    const mappingTableStr = daysMapping.map(d => `- میلادی: ${d.greg} -> شمسی: ${d.pers} (${d.relative})`).join('\n');

    const endGregorian = todayGregorian;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startGregorian = startDate.toISOString().split('T')[0];

    const styleInstruction = getStyleInstruction(style);
    
    // Determine Search & Source Constraints
    let searchInstructions = "";
    let sourceConstraint = "";

    if (topicId === 'custom_search') {
        searchInstructions = `در گوگل جستجو کن: "${topicLabel}" after:${startGregorian} before:${endGregorian}`;
        sourceConstraint = "منابع معتبر را بررسی کن تا تاریخ‌ها دقیق باشند.";
    } else if (topicId === 'cinema_iran' || topicId === 'music_iran') {
        sourceConstraint = "فقط از منابع خبری معتبر داخلی استفاده کن.";
        if (topicId === 'cinema_iran') {
             searchInstructions = `در گوگل جستجو کن: "اخبار سینمای ایران" after:${startGregorian} before:${endGregorian}`;
        } else if (topicId === 'music_iran') {
             searchInstructions = `در گوگل جستجو کن: "اخبار موسیقی ایران" after:${startGregorian} before:${endGregorian}`;
        }
    } else {
        sourceConstraint = "از منابع معتبر بین‌المللی استفاده کن و تاریخ میلادی را دقیق به شمسی تبدیل کن.";
        searchInstructions = `Search Google for: "${topicLabel} news" after:${startGregorian} before:${endGregorian}`;
    }

    const prompt = `
    ${BASE_SYSTEM_INSTRUCTION}

    ${styleInstruction}

    موضوع: **${topicLabel}**
    تاریخ امروز (شمسی): ${todayDate}
    تاریخ امروز (میلادی): ${todayGregorian}
    بازه زمانی دقیق هفتگی: از ${startGregorian} تا ${endGregorian} (۷ روز گذشته)

    جدول تطبیقی دقیق تاریخ میلادی به شمسی (از سیستم استخراج شده و کاملاً معتبر و دقیق است):
    ${mappingTableStr}
    
    دستورالعمل‌های حیاتی برای تب مرور اخبار هفتگی:
    1. ${searchInstructions} (علاوه بر این برای صحت یابی تاریخ امروز میتوانی ابتدا تاریخ روز جاری را از منابع آنلاین در وب استعلام کنی).
    2. ${sourceConstraint}
    3. فرمت خروجی بسیار مهم: در این خروجی ابتدا باید دقیقاً "تاریخ شمسی" روزی که اخبار در آن اتفاق افتاده است را با تکیه بر جدول تطبیق بنویسی. سپس تمامی اخبار مهمی که در آن تاریخ وجود داشته است را (به هر تعدادی که هست) با توضیحات کامل به شکل لیست یا بندهای جذاب بیان کنی.
    4. پس از اتمام اخبار یک روز، به سطر بعد بروید و تاریخ شمسی روز قبل تر را بنویسید و اخبار آن روز را ذکر کنید، و این کار را برای تمامی ۷ روز گذشته تکرار کنید.
    5. فقط و فقط از "تاریخ شمسی" استفاده شود و مطلقاً هیچ تاریخ میلادی در خروجی نهایی ظاهر نشود. در صورتی که تاریخ دریافت شده میلادی است سریعاً آن را با دقت بالا براساس جدول تطبیقِ قید شده بالا به تاریخ شمسی متناظر معادل‌سازی کنید.
    6. سعی کنید اخبار اصلی و مهم این ۷ روز را با دقت بالا جستجو کنید تا خبری از قلم نیفتد. حتی اگر در یک روز چندین خبر مهم بود، تمام آنها پوشش داده شود.
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return processAnalysisResponse(response);
    } catch (error) {
        console.error("Error analyzing topic:", error);
        throw error;
    }
};

export const analyzeDailyNews = async (topicId: string, topicLabel: string, style: AnalysisStyle): Promise<AnalysisResult> => {
    const todayDate = getPersianDate();
    const todayGregorian = new Date().toISOString().split('T')[0];
    const daysMapping = getGregorianAndPersianDays(2);
    const mappingTableStr = daysMapping.map(d => `- میلادی: ${d.greg} -> شمسی: ${d.pers} (${d.relative})`).join('\n');

    const now = new Date();
    const endGregorian = now.toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startGregorian = yesterday.toISOString();

    const styleInstruction = getStyleInstruction(style, true);
    
    // Determine Search & Source Constraints
    let searchInstructions = "";
    let sourceConstraint = "";

    if (topicId === 'custom_search') {
        searchInstructions = `در گوگل جستجو کن: "${topicLabel}" after:${startGregorian.split('T')[0]} "اخبار ${topicLabel} امروز"`;
        sourceConstraint = "فقط منابع آپدیت شده در امروز را بررسی کن.";
    } else if (topicId === 'cinema_iran' || topicId === 'music_iran') {
        sourceConstraint = "فقط اخبار منتشر شده در امروز از منابع خبری معتبر داخلی را بررسی کن.";
        if (topicId === 'cinema_iran') {
             searchInstructions = `در گوگل جستجو کن: "اخبار سینما ایران" after:${startGregorian.split('T')[0]}`;
        } else if (topicId === 'music_iran') {
             searchInstructions = `در گوگل جستجو کن: "اخبار موسیقی ایران" after:${startGregorian.split('T')[0]}`;
        }
    } else {
        sourceConstraint = "از منابع معتبر بین‌المللی استفاده کن، فقط اخبار امروز میلادی (the latest 24 hours) را استخراج کن.";
        searchInstructions = `Search Google for: "${topicLabel} news" after:${startGregorian.split('T')[0]}`;
    }

    const prompt = `
    ${BASE_SYSTEM_INSTRUCTION}

    ${styleInstruction}

    موضوع: **${topicLabel}**
    تاریخ امروز (شمسی): ${todayDate}
    تاریخ امروز (میلادی/ساعت): ${endGregorian}
    بازه زمانی دقیق ۲۴ ساعت گذشته: از ${startGregorian} تا ${endGregorian}
    
    جدول تطبیقی دقیق تاریخ میلادی به شمسی (از سیستم استخراج شده و کاملاً معتبر و دقیق است):
    ${mappingTableStr}

    دستورالعمل‌های حیاتی برای تب مرور اخبار روز:
    1. ${searchInstructions} دایره جستجو را فقط به ۲۴ ساعت اخیر محدود کنید. اگر می‌خواهید مبنا و درستی زمان امروز را تایید کنید، حتماً از منابع معتبر اعلام تاریخ زمان لایو وب استعلام بگیرید یا از تطابق جدول استفاده نمایید.
    2. ${sourceConstraint}
    3. مهمترین شرط: جستجوی اخبار باید با توجه به تاریخ میلادی امروز (${todayGregorian}) و حداکثر تا ۲۴ ساعت قبل آن انجام شود.
    4. در خروجی فقط و فقط اخبار یک روز اخیر تولید شود.
    5. نکته حیاتی: در خروجی به هیچ عنوان از تاریخ میلادی استفاده نکنید و به جای اعلام تاریخ میلادی، فقط از تاریخ شمسی بر اساس جدول بالا (${todayDate}) استفاده کنید.
    6. باید توجه کنید که تمامی اخبار آن موضوع در ۲۴ ساعت گذشته جستجو و اعلام شود، اخبار خروجی باید کامل باشند و خبری فراموش نشود.
    7. فقط اندازه متن، طولانی بودن توضیحات و لحن کلام بر اساس سبک انتخابی تغییر میکند، اما در تعداد اخبار تغییری ایجاد نشود.
    8. اکیداً اخبار دیروز، چند روز قبل یا هفته پیش را حذف کنید.
    9. قانون طلایی عدم تکرار تاریخ: از آنجا که کلیه اخبار مربوط به امروز (${todayDate}) است، تاریخ را فقط و فقط یک بار در ابتدای کل پاسخ بیاورید و اکیداً ممنوع است که قبل از شروع هر خبر جدید، پاراگراف جدید یا هر خط جدیدی تاریخ را تکرار یا تکرار مجدد کنید.
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return processAnalysisResponse(response);
    } catch (error) {
        console.error("Error analyzing daily topic:", error);
        throw error;
    }
};

export const analyzeNewsFromUrl = async (url: string, style: AnalysisStyle): Promise<AnalysisResult> => {
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
    مثال: "در تاریخ ۲ دی ماه، گزارش شد که..."
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return processAnalysisResponse(response);
  } catch (error: any) {
    if (error.status === 403 || error.toString().includes("403") || error.toString().includes("PERMISSION_DENIED")) {
        console.warn("Google Search permission denied (403). Falling back.");
        const fallbackPrompt = prompt + "\n\n(توجه: دسترسی به جستجو مقدور نیست. بر اساس متن و دامنه URL تحلیل کن.)";
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ parts: [{ text: fallbackPrompt }] }]
        });
        return processAnalysisResponse(response);
    }
    console.error("Error analyzing news:", error);
    throw error;
  }
};

function determineCredibility(score: number): CredibilityData {
    let level: CredibilityData['level'] = 'doubtful';
    let label = 'نیازمند بررسی';

    if (score <= 40) {
        level = 'low';
        label = 'کم‌اعتبار / شایعه';
    } else if (score <= 70) {
        level = 'doubtful';
        label = 'نیازمند بررسی';
    } else if (score <= 90) {
        level = 'trustworthy';
        label = 'موثق / معتبر';
    } else {
        level = 'verified';
        label = 'کاملاً معتبر';
    }

    return { score, level, label };
}

function processAnalysisResponse(response: any): AnalysisResult {
    const sources: SourceLink[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          if (!sources.some(s => s.url === chunk.web.uri)) {
            sources.push({
              title: chunk.web.title || new URL(chunk.web.uri).hostname,
              url: chunk.web.uri
            });
          }
        }
      });
    }

    let textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResponse) {
      textResponse = textResponse.trim();
      textResponse = textResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      const jsonStart = textResponse.indexOf('{');
      const jsonEnd = textResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        textResponse = textResponse.substring(jsonStart, jsonEnd + 1);
      }

      let parsedResult: AnalysisResult;

      try {
        const json = JSON.parse(textResponse);
        const score = typeof json.credibilityScore === 'number' ? json.credibilityScore : 80;
        
        parsedResult = {
          text: json.analysis,
          questions: json.questions || [],
          sources: sources,
          credibility: determineCredibility(score)
        };
      } catch (e) {
        // Fallback parsing regex
        let questions: string[] = [];
        const questionsMatch = textResponse.match(/"questions"\s*:\s*\[(.*?)\]/s);
        if (questionsMatch && questionsMatch[1]) {
            questions = questionsMatch[1]
                .split(',')
                .map(q => q.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'))
                .filter(q => q.length > 0);
        }

        const analysisMatch = textResponse.match(/"analysis"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        let analysisText = "";
        if (analysisMatch && analysisMatch[1]) {
             analysisText = analysisMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        } else {
             if (!textResponse.includes('"analysis":')) {
                 analysisText = textResponse;
             }
        }
        
        const scoreMatch = textResponse.match(/"credibilityScore"\s*:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 70;

        parsedResult = {
          text: analysisText || "خطا در تحلیل متن.",
          questions: questions,
          sources: sources,
          credibility: determineCredibility(score)
        };
      }

      // Cleanup logic
      const questionMarkers = [
        /\n\s*سوالات پیشنهادی:.*/s,
        /\n\s*سوالات:.*/s,
        /\n\s*Questions:.*/s
      ];

      for (const marker of questionMarkers) {
        const match = parsedResult.text.match(marker);
        if (match) {
            const embeddedSection = match[0];
            parsedResult.text = parsedResult.text.replace(marker, '').trim();
            if (!parsedResult.questions || parsedResult.questions.length === 0) {
                 const extractedQs = embeddedSection
                    .split('\n')
                    .map(line => line.replace(/^[\-\d\.\s]+/, '').trim())
                    .filter(line => line.includes('?') || line.length > 5);
                 if (extractedQs.length > 0) parsedResult.questions = extractedQs.slice(0, 3);
            }
        }
      }

      if (!parsedResult.questions || parsedResult.questions.length === 0) {
        if ((parsedResult.credibility?.score || 100) < 70) {
            parsedResult.questions = ["منبع دقیق این خبر چیست؟", "آیا تایید رسمی شده؟", "شواهد چیست؟"];
        } else {
            parsedResult.questions = ["بیشتر توضیح بده", "چرا این مهمه؟", "مثال بزن"];
        }
      }

      return parsedResult;

    } else {
      throw new Error("No text analysis received from the model.");
    }
}

export const askQuestionAboutContent = async (
  contextText: string, 
  question: string, 
  history: ChatMessage[]
): Promise<QAResponse> => {
  const historyText = history.map(msg => `${msg.role === 'user' ? 'کاربر' : 'دستیار'}: ${msg.text}`).join('\n');

  const prompt = `
    زمینه گفتگو (تحلیل قبلی): """${contextText}"""
    تاریخچه چت: """${historyText}"""
    سوال کاربر: "${question}"

    دستورالعمل:
    1. **جستجوی گوگل اجباری:** برای پاسخ به این سوال، در گوگل جستجو کن.
    2. **سنجش اعتبار پاسخ:** امتیاز 0 تا 100 بده.
    3. پاسخ کوتاه و مفید باشد.

    فرمت خروجی JSON:
    { 
      "answer": "...", 
      "nextQuestions": ["...", "...", "..."],
      "credibilityScore": 85
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { tools: [{ googleSearch: {} }] },
    });
    return processQAResponse(response);
  } catch (error: any) {
     if (error.status === 403 || error.toString().includes("403") || error.toString().includes("PERMISSION_DENIED")) {
        console.warn("Q&A Search 403. Fallback.");
        const fallbackPrompt = prompt + "\n(جستجو در دسترس نیست، تخمینی پاسخ بده)";
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ parts: [{ text: fallbackPrompt }] }]
        });
        return processQAResponse(response);
     }
     throw error;
  }
};

function processQAResponse(response: any): QAResponse {
    const sources: SourceLink[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          if (!sources.some(s => s.url === chunk.web.uri)) {
            sources.push({
              title: chunk.web.title || new URL(chunk.web.uri).hostname,
              url: chunk.web.uri
            });
          }
        }
      });
    }

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response received.");

    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);

    let answerText = "";
    let nextQs: string[] = [];
    let credibility: CredibilityData | undefined;

    try {
         const json = JSON.parse(text);
         answerText = json.answer;
         nextQs = Array.isArray(json.nextQuestions) && json.nextQuestions.length > 0 
            ? json.nextQuestions 
            : [];
         const score = typeof json.credibilityScore === 'number' ? json.credibilityScore : 60;
         credibility = determineCredibility(score);

    } catch (e) {
         console.warn("Failed to parse Q&A JSON fallback");
         const answerMatch = text.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
         answerText = answerMatch ? answerMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : text.replace(/[{}]/g, '').trim();
         
         const qMatch = text.match(/"(?:nextQuestions|questions)"\s*:\s*\[(.*?)\]/s);
         if (qMatch && qMatch[1]) {
            nextQs = qMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"')).filter(s => s.length > 0);
         }
         
         const scoreMatch = text.match(/"credibilityScore"\s*:\s*(\d+)/);
         const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
         credibility = determineCredibility(score);
    }

    // Cleanup embedded questions
    const questionMarkers = [/\n\s*سوالات بعدی:.*/s, /\n\s*Next Questions:.*/s];
    for (const marker of questionMarkers) {
        if (answerText.match(marker)) {
            answerText = answerText.replace(marker, '').trim();
        }
    }

    if (!nextQs.length) nextQs = ["ادامه بده", "توضیح بیشتر", "مرتبط با این موضوع"];

    return { 
        answer: answerText, 
        nextQuestions: nextQs,
        sources: sources,
        credibility: credibility
    };
}

export interface RadarEntity {
  name: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  mentions: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RadarReport {
  globalMood: number; // 0-100
  volatility: number; // 0-100
  topEntities: RadarEntity[];
  threats: string[];
  opportunities: string[];
  briefing: string;
}

export const generateRadarReport = async (): Promise<RadarReport> => {
  const prompt = `
    You are an advanced global intelligence AI.
    Your task is to scan the top news, geopolitical events, and tech advancements of the last 24 hours.
    
    Output a strictly formatted JSON object representing a "Radar Report". No markdown block.
    Ensure ALL text fields (names, threats, opportunities, and briefing) are in the Persian (Farsi) language.
    
    Format:
    {
      "globalMood": <number 0-100 representing overall optimism in news>,
      "volatility": <number 0-100 representing risk or chaos factor>,
      "topEntities": [
        {"name": "نام موجودیت به فارسی", "sentiment": "positive" | "neutral" | "negative", "mentions": <number 1-100 abstract magnitude>, "trend": "up" | "down" | "stable"}
      ],
      "threats": ["تهدید ۱ به فارسی", "تهدید ۲ به فارسی"],
      "opportunities": ["فرصت ۱ به فارسی", "فرصت ۲ به فارسی"],
      "briefing": "یک خلاصه دو جمله‌ای اجرایی به زبان فارسی."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { tools: [{ googleSearch: {} }] },
    });
    
    let text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response received.");

    text = text.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) text = text.substring(jsonStart, jsonEnd + 1);

    return JSON.parse(text) as RadarReport;
  } catch (error: any) {
    console.error("Radar generation error:", error);
    return {
      globalMood: 50,
      volatility: 50,
      topEntities: [
        {name: "هوش مصنوعی", sentiment: "positive", mentions: 90, trend: "up"},
        {name: "بازارهای مالی", sentiment: "neutral", mentions: 70, trend: "stable"},
        {name: "تغییرات اقلیمی", sentiment: "negative", mentions: 50, trend: "down"}
      ],
      threats: ["خطاهای موقتی شبکه در اتصال به هوش مصنوعی"],
      opportunities: ["تحلیل‌های داده‌محور زنده"],
      briefing: "در ارتباط با هسته هوش مصنوعی خطایی رخ داد. این داده‌ها دمو هستند."
    };
  }
};

export interface SupplementaryNewsResult {
  summary: string;
  sources: SourceLink[];
}

export const getDetailedSupplementaryNews = async (newsText: string): Promise<SupplementaryNewsResult> => {
  const prompt = `
    شما یک تحلیلگر اخبار و روزنامه‌نگار حرفه‌ای هستید.
    وظیفه شما: ارائه اطلاعات تکمیلی، جامع اما خلاصه‌تر از کل مرجع خبر، مفید و کامل درباره خبر یا جمله زیر است.
    
    جمله یا خبر مورد نظر: "${newsText}"
    
    دستورالعمل‌ها:
    1. متن تکمیلی باید تمامی نکات مربوط به این خبر را پوشش دهد، خبری کامل و به تمامی نکات ولی به صورت طول متن مستقل، مفید و غیرخسته‌کننده به زبان فارسی روان.
    2. جستجو در وب برای یافتن جدیدترین و مطلع‌ترین اطلاعات الزامی است.
    3. بسیار مهم: از خودتان هیچ لینکی نسازید و هیچ لینک فرضی یا فیک (مانند لینک ساختگی دیجیاتو یا زومیت که وجود خارجی ندارد) تولید نکنید. آرایه sources را در قالب JSON کاملاً خالی [] بگذارید. تمام منابع واقعی به طور خودکار از ابزار جستجوی زنده در پس‌زمینه استخراج خواهند شد.
    
    خروجی را صرفاً در قالب یک شیء JSON با ساختار زیر برگردانید (هیچ متن دیگری خارج از JSON اضافه نکنید):
    {
      "summary": "متن کامل اطلاعات تکمیلی به زبان فارسی بسیار ارزشمند و شیوا..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("پاسخی از مدل دریافت نشد.");

    textResponse = textResponse.trim();
    textResponse = textResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    const jsonStart = textResponse.indexOf('{');
    const jsonEnd = textResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      textResponse = textResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(textResponse);
    
    const finalSources: SourceLink[] = [];
    
    // Grab grounding metadata sources - these are 100% real and active!
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          const url = chunk.web.uri;
          if (url.startsWith('http://') || url.startsWith('https://')) {
            const title = chunk.web.title || new URL(url).hostname;
            if (!finalSources.some(s => s.url === url)) {
              finalSources.push({ title, url });
            }
          }
        }
      });
    }

    // Add search-query fallback links to reach exactly 3 sources if we don't have enough
    if (finalSources.length < 3) {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(newsText)}`;
      if (!finalSources.some(s => s.url === googleSearchUrl)) {
        finalSources.push({
          title: "جستجوی زنده گوگل درباره این خبر",
          url: googleSearchUrl
        });
      }
    }
    if (finalSources.length < 3) {
      const googleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(newsText)}`;
      if (!finalSources.some(s => s.url === googleNewsUrl)) {
        finalSources.push({
          title: "جستجوی زنده اخبار گوگل بخش فارسی",
          url: googleNewsUrl
        });
      }
    }
    // Also fallback to main homepages if still less than 3
    const majorHomepages = [
      { title: "خبرگزاری زومیت", url: "https://www.zoomit.ir" },
      { title: "دیجیاتو مرجع فناوری", url: "https://digiato.com" },
      { title: "خبرگزاری ایسنا", url: "https://www.isna.ir" }
    ];
    for (const hp of majorHomepages) {
      if (finalSources.length >= 3) break;
      if (!finalSources.some(s => s.url === hp.url)) {
        finalSources.push(hp);
      }
    }

    return {
      summary: parsed.summary || "اطلاعات تکمیلی در دسترس نیست.",
      sources: finalSources.slice(0, 5) // keep up to 5 sources
    };

  } catch (error: any) {
    console.error("Error in getDetailedSupplementaryNews:", error);
    // If permission or search denied, fallback
    if (error.status === 403 || error.toString().includes("403") || error.toString().includes("PERMISSION_DENIED")) {
        const responseFallback = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ parts: [{ text: prompt + "\n(توجه: جستجوی گوگل قطع است، پاسخ تفصیلی به این خبر بنویسید)" }] }]
        });
        let textR = responseFallback.candidates?.[0]?.content?.parts?.[0]?.text || "";
        textR = textR.trim();
        textR = textR.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
        const jsonStart = textR.indexOf('{');
        const jsonEnd = textR.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          textR = textR.substring(jsonStart, jsonEnd + 1);
        }
        const parsed = JSON.parse(textR);
        return {
          summary: parsed.summary || "پاسخ با موفقیت بازیابی نشد.",
          sources: [
            { title: "جستجوی وب گوگل", url: `https://www.google.com/search?q=${encodeURIComponent(newsText)}` },
            { title: "دیجیاتو مرجع فناوری", url: "https://digiato.com" },
            { title: "خبرگزاری زومیت", url: "https://www.zoomit.ir" }
          ]
        };
    }
    throw error;
  }
};

