




export const APP_VERSION = 'v2';

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  ANALYZING = 'ANALYZING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR',
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export type AnalysisStyle = 'news' | 'podcast' | 'deep' | 'quick';

export type RewriteStyle = 'normal' | 'podcast' | 'simple' | 'intimate' | 'romantic';

export interface SourceLink {
  title: string;
  url: string;
}

export interface CredibilityData {
  score: number; // 0-100
  level: 'low' | 'doubtful' | 'trustworthy' | 'verified';
  label: string;
}

export interface AIModelOption {
  id: string;
  name: string;
  supportsThinking: boolean;
}

export const AVAILABLE_MODELS: AIModelOption[] = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (پیشرفته‌ترین)', supportsThinking: true },
  { id: 'gemini-3.5-pro-preview', name: 'Gemini 3.5 Pro Preview', supportsThinking: true },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash (سریع و جدید)', supportsThinking: true },
  { id: 'gemini-3.0-pro-preview', name: 'Gemini 3.0 Pro Preview', supportsThinking: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (پایدار پیش‌فرض)', supportsThinking: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (پیشرفته)', supportsThinking: true },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (بسیار سریع)', supportsThinking: false },
  { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking', supportsThinking: true }
];

export const AVAILABLE_TTS_MODELS: AIModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (پیش‌فرض)', supportsThinking: false },
  { id: 'gemini-3.0-flash', name: 'Gemini 3.0 Flash (جدید)', supportsThinking: false },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (پیشرفته)', supportsThinking: false }
];

export interface UsedModelInfo {
  modelId: string;
  thinkingEnabled: boolean;
}

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  sourceType: 'url' | 'text' | 'topic';
  meta?: {
    url?: string;
    topicId?: string;
    topicLabel?: string;
    analysisStyle?: AnalysisStyle;
    sources?: SourceLink[];
    credibility?: CredibilityData;
    questions?: string[];
    title?: string;
    chatMessages?: ChatMessage[];
    usedModel?: UsedModelInfo;
  };
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isPlaying?: boolean;
  sources?: SourceLink[];
  credibility?: CredibilityData;
  usedModel?: UsedModelInfo;
}

export interface AnalysisResult {
  text: string;
  questions: string[];
  sources: SourceLink[];
  credibility?: CredibilityData;
  usedModel?: UsedModelInfo;
}

export interface QAResponse {
  answer: string;
  nextQuestions: string[];
  sources: SourceLink[];
  credibility?: CredibilityData;
  usedModel?: UsedModelInfo;
}
