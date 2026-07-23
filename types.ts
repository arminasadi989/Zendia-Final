




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
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (جدید، پیش‌فرض)', supportsThinking: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', supportsThinking: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (جدید)', supportsThinking: true },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', supportsThinking: false }
];

export const AVAILABLE_TTS_MODELS: AIModelOption[] = [
  { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 Flash TTS (Default)', supportsThinking: false }
];

export interface UsedModelInfo {
  modelId: string;
  thinkingEnabled: boolean;
  thinkingLevel?: 'low' | 'normal' | 'high';
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
