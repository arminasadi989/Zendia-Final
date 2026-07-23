import {
  ChatMessage,
  AnalysisResult,
  AnalysisStyle,
  QAResponse,
  SourceLink,
  RewriteStyle,
  AVAILABLE_MODELS,
  AVAILABLE_TTS_MODELS,
} from "../types";

// ============================================================================
// This file no longer talks to Google directly and no longer holds any API
// key material at build time. It only stores the user's UI *preferences*
// (which model to use, thinking level, and an optional personal key override)
// in memory for the current tab, then sends those preferences along with
// each request to OUR OWN backend (server.ts), which is the only place that
// ever touches the real Gemini API key. This mirrors Zencraft's architecture.
// ============================================================================

let customApiKey: string | null = null;
let selectedTextModel: string = "gemini-3.6-flash";
let selectedTtsModel: string = "gemini-3.1-flash-tts-preview";
let thinkingLevel: "low" | "normal" | "high" = "low";

const VALID_MODEL_ORDER = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const VALID_TTS_MODEL_ORDER = ["gemini-3.1-flash-tts-preview"];

export const getValidModelId = (model: string): string =>
  VALID_MODEL_ORDER.includes(model) ? model : "gemini-3.6-flash";

export const getValidTtsModelId = (model: string): string =>
  VALID_TTS_MODEL_ORDER.includes(model) ? model : "gemini-3.1-flash-tts-preview";

export const setAiSettings = (
  apiKey: string | null,
  model: string,
  thinking: boolean | "low" | "normal" | "high",
  ttsModel: string = "gemini-3.1-flash-tts-preview"
) => {
  customApiKey = apiKey;
  selectedTextModel = getValidModelId(model);

  const modelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedTextModel);
  const supportsThinking = modelInfo?.supportsThinking ?? false;

  if (supportsThinking) {
    if (typeof thinking === "boolean") {
      thinkingLevel = thinking ? "normal" : "low";
    } else if (thinking === "low" || thinking === "normal" || thinking === "high") {
      thinkingLevel = thinking;
    } else {
      thinkingLevel = "low";
    }
  } else {
    thinkingLevel = "low";
  }

  selectedTtsModel = getValidTtsModelId(ttsModel);

  // Push these settings to the backend, which is the only place that now
  // holds the real API key / does the actual generation. Fire-and-forget,
  // same as the rest of this function — callers never awaited setAiSettings
  // before either.
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: customApiKey, model: selectedTextModel, thinking: thinkingLevel, ttsModel: selectedTtsModel }),
  }).catch((err) => console.error("Failed to sync AI settings to server:", err));
};

export const getAiSettings = () => ({
  customApiKey,
  textModel: selectedTextModel,
  enableThinking: thinkingLevel !== "low",
  thinkingLevel,
  ttsModel: selectedTtsModel,
});

export const setCustomApiKey = (key: string | null) => {
  customApiKey = key;
};

export const getCustomApiKey = () => customApiKey;

// ----------------------------------------------------------------------------
// Internal fetch helper. Throws an Error shaped with `.status` so the
// existing quota-detection logic in TextToSpeech.tsx (checkAndShowQuotaError)
// keeps working completely unchanged.
// ----------------------------------------------------------------------------
async function callApi<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body, fall through
  }

  if (!res.ok) {
    const err: any = new Error((data && data.error) || res.statusText || "Request failed");
    err.status = (data && data.status) || res.status;
    throw err;
  }

  return data as T;
}

export const generatePersianSpeech = async (text: string, voiceName: string = "Kore"): Promise<string> => {
  const data = await callApi<{ audio: string }>("tts", { text, voiceName });
  return data.audio;
};

export const rewriteText = async (text: string, style: RewriteStyle): Promise<string> => {
  if (style === "normal") return text;
  try {
    const data = await callApi<{ text: string }>("rewrite", { text, style });
    return data.text || text;
  } catch (error) {
    console.error("Rewrite error:", error);
    return text; // Fallback to original if error, same as before
  }
};

export const analyzeNewsFromTopic = async (topicId: string, topicLabel: string, style: AnalysisStyle): Promise<AnalysisResult> =>
  callApi<AnalysisResult>("analyze-topic", { topicId, topicLabel, style });

export const analyzeDailyNews = async (topicId: string, topicLabel: string, style: AnalysisStyle): Promise<AnalysisResult> =>
  callApi<AnalysisResult>("analyze-daily", { topicId, topicLabel, style });

export const analyzeNewsFromUrl = async (url: string, style: AnalysisStyle): Promise<AnalysisResult> =>
  callApi<AnalysisResult>("analyze-url", { url, style });

export const askQuestionAboutContent = async (
  contextText: string,
  question: string,
  history: ChatMessage[]
): Promise<QAResponse> => callApi<QAResponse>("ask-question", { contextText, question, history });

export interface RadarEntity {
  name: string;
  sentiment: "positive" | "neutral" | "negative";
  mentions: number;
  trend: "up" | "down" | "stable";
}

export interface RadarReport {
  globalMood: number;
  volatility: number;
  topEntities: RadarEntity[];
  threats: string[];
  opportunities: string[];
  briefing: string;
}

export const generateRadarReport = async (): Promise<RadarReport> => callApi<RadarReport>("radar-report", {});

export interface SupplementaryNewsResult {
  summary: string;
  sources: SourceLink[];
}

export const getDetailedSupplementaryNews = async (newsText: string): Promise<SupplementaryNewsResult> =>
  callApi<SupplementaryNewsResult>("supplementary-news", { newsText });
