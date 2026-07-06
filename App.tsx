import React, { useState } from 'react';
import { Header } from './components/Header';
import { TextToSpeech } from './components/TextToSpeech';
import { UserGuide } from './components/UserGuide';
import { ZendiaRadar } from './components/ZendiaRadar';
import { AppStatus } from './types';
import { Activity, Mic2, Key, Eye, EyeOff, Check, Trash2, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { setCustomApiKey, getCustomApiKey } from './services/geminiService';

type ModuleType = 'analyzer' | 'radar';

const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [guideTrigger, setGuideTrigger] = useState<number>(0);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ModuleType>('analyzer');
  const [analyzerViewMode, setAnalyzerViewMode] = useState<'INPUT' | 'CHAT'>('INPUT');

  // --- API QUOTA & CUSTOM API KEY STATE ---
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);
  const [quotaReason, setQuotaReason] = useState<string>('');
  const [quotaResetTime, setQuotaResetTime] = useState<string>('');
  const [apiKeyValue, setApiKeyValue] = useState<string>(getCustomApiKey() || '');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState<boolean>(false);
  const [isKeySavedSuccessfully, setIsKeySavedSuccessfully] = useState<boolean>(false);
  const [isCustomKeyActive, setIsCustomKeyActive] = useState<boolean>(!!getCustomApiKey());

  const handleApplyApiKey = (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      setCustomApiKey(trimmed);
      setApiKeyValue(trimmed);
      setIsCustomKeyActive(true);
      setIsKeySavedSuccessfully(true);
      setTimeout(() => setIsKeySavedSuccessfully(false), 2000);
    } else {
      setCustomApiKey(null);
      setApiKeyValue('');
      setIsCustomKeyActive(false);
    }
  };

  const handleRemoveApiKey = () => {
    setCustomApiKey(null);
    setApiKeyValue('');
    setIsCustomKeyActive(false);
  };

  const handleOpenGuide = () => {
    setGuideTrigger(prev => prev + 1);
  };

  const handleToggleHistory = () => {
    setShowHistory(prev => !prev);
  };

  return (
    <div className="h-full flex flex-col font-sans text-slate-200 relative overflow-hidden bg-slate-950" dir="rtl">
      {/* Background decoration: Sharp Audio Spectrum Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322d3ee' fill-opacity='1'%3E%3Cpath d='M36 34v-4h2v4h-2zm0-30V0h2v4h-2zM6 34v-4h2v4H6zM6 4V0h2v4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             backgroundSize: '30px 30px'
           }}>
           {/* Additional Random Bars for spectrum feel */}
           <div className="absolute top-1/4 left-10 w-1 h-20 bg-primary-500/10 rounded-full"></div>
           <div className="absolute top-1/3 right-20 w-1 h-32 bg-primary-500/10 rounded-full"></div>
           <div className="absolute bottom-20 left-1/3 w-1 h-16 bg-primary-500/10 rounded-full"></div>
      </div>
      
      {/* Radial Gradient for depth */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.1),transparent_80%)]"></div>
      
      <Header 
        appStatus={appStatus} 
        onOpenGuide={handleOpenGuide} 
        onToggleHistory={handleToggleHistory} 
        onOpenQuotaModal={() => {
          setQuotaReason("طرح فعال کاربری: نسخه آزمایشی و کوتای رایگان سرور جیمینی (Free Tier API). سیستم به صورت مداوم سلامت اتصالات جیمینی را مانیتور کرده و در صورت مواجهه با لیمیت‌ها یا خستگی سرور، این دیالوگ آگاه‌سازی را فعال می‌کند.");
          setQuotaResetTime("");
          setIsQuotaModalOpen(true);
        }}
        isCustomKeyActive={isCustomKeyActive}
      />
      
      {/* User Guide Modal */}
      <UserGuide manualTrigger={guideTrigger} />

      <main className="flex-1 w-full max-w-lg mx-auto relative z-10 flex flex-col h-[calc(100%-120px)]">
        <div className={`w-full h-full ${activeModule === 'analyzer' ? 'block' : 'hidden'}`}>
          <TextToSpeech 
            onStatusChange={setAppStatus} 
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            onViewModeChange={setAnalyzerViewMode}
            onShowQuotaError={(reason, resetTime) => {
              setQuotaReason(reason);
              setQuotaResetTime(resetTime);
              setIsQuotaModalOpen(true);
            }}
          />
        </div>
        <div className={`w-full h-full ${activeModule === 'radar' ? 'block' : 'hidden'}`}>
          <ZendiaRadar isActive={activeModule === 'radar'} />
        </div>
      </main>

      {/* Bottom Navigation */}
      {!(activeModule === 'analyzer' && analyzerViewMode === 'CHAT') && (
        <div className="w-full max-w-lg mx-auto fixed bottom-0 left-1/2 -translate-x-1/2 z-50 p-1.5 sm:p-3">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex p-1 shadow-2xl relative overflow-hidden">
            {/* Active indicator background */}
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary-500/20 rounded-xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
              style={{ transform: activeModule === 'analyzer' ? 'translateX(0)' : 'translateX(-100%)' }}
            />
            
            <button 
              onClick={() => setActiveModule('analyzer')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 relative z-10 transition-colors duration-300 ${activeModule === 'analyzer' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold tracking-wider">تحلیلگر اخبار</span>
            </button>
            
            <button 
              onClick={() => setActiveModule('radar')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 relative z-10 transition-colors duration-300 ${activeModule === 'radar' ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold tracking-wider">رادار زنده</span>
            </button>
          </div>
        </div>
      )}

      {/* API Quota Alert Warning & Custom Key Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 overflow-hidden animate-in scale-in duration-200" dir="rtl">
            
            {/* Decorative cyan/neon accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
              <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                وضعیت سهمیه و کلید هوش مصنوعی اختصاصی
              </h3>
              <button 
                onClick={() => setIsQuotaModalOpen(false)} 
                className="text-slate-500 hover:text-white hover:bg-slate-800 rounded-full p-1.5 transition-all focus:outline-none cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Status Indicator */}
            <div className="z-10 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500">وضعیت اتصال فعلی به هسته جیمینی:</span>
                <span className="text-xs font-black text-slate-200">
                  {isCustomKeyActive ? "استفاده از کلید اختصاصی کاربر (Custom)" : "سهمیه رایگان اشتراکی جیمینی (Free Tier)"}
                </span>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${isCustomKeyActive ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCustomKeyActive ? 'bg-cyan-400' : 'bg-emerald-400'}`}></span>
                {isCustomKeyActive ? "اختصاصی فعال" : "اشتراکی فعال"}
              </div>
            </div>

            {/* Error Reason Info Box (Only displays if quota limit occurs) */}
            {quotaReason && (
              <div className="bg-rose-950/20 border border-rose-500/25 rounded-2xl p-4 space-y-2 z-10">
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-extrabold">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                  <span>علت دقیق آخرین خطای سرور جیمینی:</span>
                </div>
                <p className="text-xs text-slate-200 text-justify leading-relaxed">
                  {quotaReason}
                </p>
                {quotaResetTime && (
                  <div className="pt-2 text-[10px] text-cyan-400 flex flex-col gap-1 border-t border-rose-500/15">
                    <span className="font-bold">زمان‌بندی تقریبی آزاد شدن مجدد:</span>
                    <span className="font-mono text-slate-300 leading-relaxed text-right">{quotaResetTime}</span>
                  </div>
                )}
              </div>
            )}

            {/* Key Input Field */}
            <div className="z-10 space-y-2">
              <label className="text-[10px] text-cyan-400 font-extrabold flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                وارد کردن کلید موقت جدید (Gemini API Key)
              </label>
              <div className="relative">
                <input
                  type={isApiKeyVisible ? "text" : "password"}
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder="AIzaSy..."
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs font-mono text-cyan-300 focus:outline-none transition-all pl-10 pt-2.5 pb-2"
                />
                <button
                  type="button"
                  onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer"
                >
                  {isApiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between px-1.5 text-[9px] md:text-[9.5px]">
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-bold"
                >
                  دریافت کلید رایگان از AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-amber-400/80 font-medium">ذخیره موقت در حافظه گفتگوی جاری</span>
              </div>
            </div>

            {/* Action Key Control Buttons */}
            <div className="z-10 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyApiKey(apiKeyValue)}
                disabled={!apiKeyValue.trim()}
                className={`py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md border focus:outline-none cursor-pointer ${
                  !apiKeyValue.trim() 
                    ? 'bg-slate-800/40 text-slate-600 border-slate-800/50 cursor-not-allowed' 
                    : isKeySavedSuccessfully 
                      ? 'bg-emerald-600 border-emerald-500 text-white' 
                      : 'bg-cyan-500 border-cyan-400 hover:bg-cyan-400 text-slate-950 hover:text-white'
                }`}
              >
                {isKeySavedSuccessfully ? (
                  <>
                    <Check className="w-4 h-4" />
                    ثبت شد!
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    ثبت کلید موقت
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleRemoveApiKey}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 hover:text-rose-400 border border-slate-700/60 text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                حذف کلید (بازگشت به پیش‌فرض)
              </button>
            </div>

            {/* Reset Info */}
            <p className="z-10 text-[10px] text-slate-400 text-center leading-relaxed font-medium bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/40">
              کلید ثبت شده صرفاً به صورت موقت در حافظه گفتگوی جاری برنامه جریان دارد. در صورت ریفرش کردن صفحه یا ریست کردن کامل اپ، کلید اختصاصی غیرفعال شده و دسترسی برنامه مجدداً به سهمیه رایگان اشتراکی جیمینی باز خواهد گشت.
            </p>

            {/* Actions Footer */}
            <div className="z-10 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <button 
                onClick={() => {
                  setQuotaReason("تست آزمایشی: شرایط اتمام کل ظرفیت ارتباطی سرور جیمینی با موفقیت شبیه‌سازی شد (خطای ۴۲۹ - اتمام فواصل درخواست).");
                  setQuotaResetTime("به طور متوسط ۶۰ ثانیه دیگر (RPM) | ساعت ۰۳:۳۰ بامداد فردا (RPD)");
                }}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-500 hover:text-rose-300 border border-slate-800/80 rounded-xl text-[9px] font-bold transition-all focus:outline-none cursor-pointer"
              >
                شبیه‌سازی خطای ۴۲۹
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsQuotaModalOpen(false);
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-xl text-[10px] font-bold transition-all focus:outline-none cursor-pointer"
                >
                  لود مجدد صفحه
                </button>
                <button 
                  onClick={() => setIsQuotaModalOpen(false)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-primary-600 text-slate-950 font-black rounded-xl text-[10px] transition-all focus:outline-none cursor-pointer"
                >
                  بستن و بازگشت
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default App;
