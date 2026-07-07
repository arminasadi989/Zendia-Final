import React, { useState, useEffect } from 'react';
import { Key, Settings, Zap, BrainCircuit, X, Save, AlertTriangle, Eye, EyeOff, Sparkles, Check, Volume2 } from 'lucide-react';
import { getAiSettings, setAiSettings } from '../services/geminiService';
import { AVAILABLE_MODELS, AVAILABLE_TTS_MODELS } from '../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotaReason?: string;
  quotaResetTime?: string;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ 
  isOpen, 
  onClose,
  quotaReason,
  quotaResetTime
}) => {
  const currentSettings = getAiSettings();
  
  const [apiKey, setApiKey] = useState<string>(currentSettings.customApiKey || '');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>(currentSettings.textModel);
  const [selectedTtsModelId, setSelectedTtsModelId] = useState<string>(currentSettings.ttsModel);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(currentSettings.enableThinking);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Sync state if modal opens
  useEffect(() => {
    if (isOpen) {
      const settings = getAiSettings();
      setApiKey(settings.customApiKey || '');
      setSelectedModelId(settings.textModel);
      setSelectedTtsModelId(settings.ttsModel);
      setIsThinkingEnabled(settings.enableThinking);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
  const canThink = selectedModelInfo?.supportsThinking ?? false;

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (modelInfo && !modelInfo.supportsThinking) {
      setIsThinkingEnabled(false);
    }
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim() || null;
    setAiSettings(trimmedKey, selectedModelId, isThinkingEnabled, selectedTtsModelId);
    
    setIsSavedSuccessfully(true);
    setTimeout(() => {
      setIsSavedSuccessfully(false);
      onClose();
    }, 1000);
  };

  const handleClearKey = () => {
    setApiKey('');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-5 overflow-hidden animate-in scale-in duration-200" dir="rtl">
        
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
          <h3 className="text-sm font-black text-primary-400 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary-400" />
            تنظیمات موتور هوش مصنوعی
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white hover:bg-slate-800 rounded-full p-1.5 transition-all focus:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quota Error Box (if any) */}
        {quotaReason && (
          <div className="bg-rose-950/20 border border-rose-500/25 rounded-2xl p-4 space-y-2 z-10">
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-extrabold">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
              <span>اخطار سهمیه سرور (Quota Limit):</span>
            </div>
            <p className="text-xs text-slate-200 text-justify leading-relaxed">
              {quotaReason}
            </p>
            {quotaResetTime && (
              <div className="pt-2 text-[10px] text-primary-400 flex flex-col gap-1 border-t border-rose-500/15">
                <span className="font-bold">زمان‌بندی تقریبی آزاد شدن مجدد:</span>
                <span className="font-mono text-slate-300 leading-relaxed text-right">{quotaResetTime}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-5 z-10">
          {/* Section 1: Custom API Key */}
          <div className="space-y-2">
            <label className="text-xs text-primary-400 font-extrabold flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              کلید API موقت (اختیاری)
            </label>
            <div className="relative">
              <input
                type={isKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... or AQ.dotted.key..."
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all text-left"
                dir="ltr"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsKeyVisible(!isKeyVisible)}
                  className="p-1.5 text-slate-500 hover:text-primary-400 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed text-justify">
              این برنامه به طور کامل از قالب کلیدهای کلاسیک (شروع با AIza) و فرمت نوین نقطه‌دار (شروع با .AQ) پشتیبانی می‌کند. کلید به صورت امن در بک‌اند موقت شما پردازش شده و پس از اتمام جلسه پاک خواهد شد.
            </p>
          </div>

          {/* Section 2: Model Selection */}
          <div className="space-y-2">
            <label className="text-xs text-primary-400 font-extrabold flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              مدل متنی هوش مصنوعی (رایگان)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${selectedModelId === model.id ? 'bg-primary-500/10 border-primary-500/30 text-primary-300' : 'bg-slate-950/50 border-slate-800/50 text-slate-400 hover:border-slate-700'}`}
                >
                  <span className="font-mono text-[10px] truncate" dir="ltr">{model.name}</span>
                  {selectedModelId === model.id && <Check className="w-3 h-3 text-primary-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: TTS Model Selection */}
          <div className="space-y-2">
            <label className="text-xs text-primary-400 font-extrabold flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              مدل صوتی هوش مصنوعی (TTS)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {AVAILABLE_TTS_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedTtsModelId(model.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${selectedTtsModelId === model.id ? 'bg-primary-500/10 border-primary-500/30 text-primary-300' : 'bg-slate-950/50 border-slate-800/50 text-slate-400 hover:border-slate-700'}`}
                >
                  <span className="font-mono text-[11px] truncate" dir="ltr">{model.name}</span>
                  {selectedTtsModelId === model.id && <Check className="w-3 h-3 text-primary-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Deep Thinking Toggle */}
          <div className={`space-y-2 p-3 rounded-xl border ${canThink ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-950/10 border-slate-900 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                <BrainCircuit className={`w-4 h-4 ${isThinkingEnabled ? 'text-primary-400' : 'text-slate-500'}`} />
                تفکر عمیق (Deep Thinking)
              </label>
              
              <button
                disabled={!canThink}
                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isThinkingEnabled ? 'bg-primary-500' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isThinkingEnabled ? '-translate-x-4' : '-translate-x-0.5'}`} />
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed text-justify mt-1">
              {canThink 
                ? "فعال‌سازی این حالت باعث می‌شود هوش مصنوعی قبل از پاسخ دادن، گام‌به‌گام استدلال کند که دقت را بسیار بالا می‌برد اما ممکن است پاسخ‌دهی کمی طولانی‌تر شود."
                : "مدل انتخاب شده از قابلیت تفکر عمیق پشتیبانی نمی‌کند."}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 z-10 flex gap-2">
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isSavedSuccessfully ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-primary-500 text-slate-950 hover:bg-primary-400'}`}
          >
            {isSavedSuccessfully ? (
              <>
                <Check className="w-4 h-4" />
                ذخیره شد
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                اعمال تنظیمات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
