
import React, { useState, useEffect } from 'react';

// --- Types for Guide Steps ---
interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface UserGuideProps {
  manualTrigger?: number;
}

export const UserGuide: React.FC<UserGuideProps> = ({ manualTrigger = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mode, setMode] = useState<'ASK' | 'GUIDE'>('ASK');
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // --- Step Definitions ---
  const STEPS: GuideStep[] = [
    {
      title: "انتخاب ورودی",
      description: "سه راه برای شروع دارید: لینک خبر را وارد کنید (تحلیل عمیق)، موضوعی را انتخاب کنید (مرور هفته)، یا متن خودتان را بنویسید (سریع).",
      icon: (
        <div className="flex gap-4 items-center justify-center">
           <div className="flex flex-col items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-primary-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <span className="text-[10px] text-slate-300">لینک</span>
           </div>
           <div className="flex flex-col items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              <span className="text-[10px] text-slate-300">موضوع</span>
           </div>
           <div className="flex flex-col items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span className="text-[10px] text-slate-300">متن</span>
           </div>
        </div>
      )
    },
    {
      title: "تنظیمات هوشمند",
      description: "قبل از شروع، گوینده (زن/مرد) و سبک خروجی (خبری، پادکست، تحلیل عمیق) را متناسب با سلیقه خود انتخاب کنید.",
      icon: (
        <div className="w-full max-w-[200px] space-y-3">
           <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-slate-600">
              <span className="text-xs text-slate-400">گوینده:</span>
              <span className="text-xs font-bold text-primary-300">سارا (شفاف)</span>
           </div>
           <div className="flex items-center justify-between bg-slate-800/80 p-2 rounded-lg border border-slate-600">
              <span className="text-xs text-slate-400">سبک:</span>
              <span className="text-xs font-bold text-primary-300">پادکست</span>
           </div>
        </div>
      )
    },
    {
      title: "اعتبار سنجی و منابع",
      description: "هوش مصنوعی اخبار را تحلیل کرده و به آن امتیاز اعتبار (۰ تا ۱۰۰) می‌دهد. منابع خبری استفاده شده نیز برای شفافیت نمایش داده می‌شوند.",
      icon: (
        <div className="relative flex items-center justify-center py-2">
            <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                <span className="text-2xl font-bold text-emerald-400">85%</span>
                <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full rotate-45"></div>
            </div>
            <div className="absolute -bottom-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600 text-[10px] text-slate-300">
                منابع معتبر ✓
            </div>
        </div>
      )
    },
    {
      title: "پخش و تعامل",
      description: "به نسخه صوتی گوش دهید، سرعت را تغییر دهید، یا اگر سوالی دارید در قسمت چت از هوش مصنوعی بپرسید.",
      icon: (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                   <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div className="h-1 w-20 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-primary-400"></div>
                </div>
            </div>
            <div className="bg-slate-800 px-4 py-2 rounded-tl-xl rounded-tr-xl rounded-br-xl text-xs text-slate-300 border border-slate-700 mt-2">
                "منبع دقیق این خبر کجاست؟"
            </div>
        </div>
      )
    }
  ];

  // Auto-show logic
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('zendia_intro_seen');
    if (!hasSeenGuide) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Manual trigger logic
  useEffect(() => {
    if (manualTrigger > 0) {
        setIsVisible(true);
        setMode('ASK');
        setCurrentStep(0);
    }
  }, [manualTrigger]);

  const handleClose = () => {
    setIsVisible(false);
    
    if (dontShowAgain) {
        localStorage.setItem('zendia_intro_seen', 'true');
    } else {
        localStorage.removeItem('zendia_intro_seen');
    }

    // Reset state for next time
    setTimeout(() => {
        setMode('ASK');
        setCurrentStep(0);
    }, 500);
  };

  const handleStartGuide = () => {
    setMode('GUIDE');
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
    } else {
        handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
        setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm transition-opacity duration-500 animate-in fade-in" 
        onClick={handleClose} 
      />

      {/* Main Container */}
      <div className="relative w-full max-w-sm md:max-w-md bg-slate-900 border border-primary-500/30 rounded-3xl shadow-[0_0_50px_rgba(8,145,178,0.25)] overflow-hidden flex flex-col transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5">
        
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-80 shadow-[0_0_10px_#22d3ee]"></div>

        {mode === 'ASK' ? (
          // --- ASK MODE ---
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="relative">
                 <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
                 <div className="w-20 h-20 relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center mb-2 shadow-xl">
                    <span className="font-broken text-3xl text-primary-400">Z</span>
                </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2 font-broken tracking-wide">خوش آمدید</h2>
              <p className="text-slate-400 text-sm leading-6 px-2">
                آیا مایل هستید یک تور کوتاه تصویری از قابلیت‌های <span className="text-primary-300 font-bold">Zendia</span> داشته باشید؟
              </p>
            </div>

            <div className="flex flex-col w-full gap-3 mt-4">
              <button 
                onClick={handleStartGuide}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span>بله، نمایش بده</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              
              <button 
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl border border-slate-700 bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                خیر، رد کن
              </button>
            </div>

            {/* Checkbox for Don't Show Again */}
            <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-primary-500 border-primary-500' : 'bg-transparent border-slate-500'}`}>
                    {dontShowAgain && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                </div>
                <span className="text-[10px] text-slate-400 select-none">دیگر این پنجره را نشان نده</span>
            </div>

          </div>
        ) : (
          // --- GUIDE STEPPER MODE ---
          <div className="flex flex-col h-[480px]"> {/* Fixed height for consistency */}
            
            {/* Header / Close */}
            <div className="flex justify-between items-center p-5 pb-0">
                <div className="flex gap-1.5">
                   {STEPS.map((_, idx) => (
                       <div 
                         key={idx} 
                         className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-primary-400 shadow-[0_0_8px_#22d3ee]' : 'w-2 bg-slate-700'}`}
                       />
                   ))}
                </div>
                <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                    <span className="text-xs font-bold">بستن</span>
                </button>
            </div>

            {/* Visual Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                
                {/* Animated Icon Container */}
                <div 
                  key={currentStep} // Triggers animation on change
                  className="w-full flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-8 duration-300"
                >
                    <div className="w-full h-40 flex items-center justify-center mb-6 relative">
                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 to-transparent rounded-full blur-2xl opacity-50 transform scale-75"></div>
                        
                        {/* The Icon */}
                        <div className="relative z-10 transform scale-110">
                            {STEPS[currentStep].icon}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                        {STEPS[currentStep].title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed px-2">
                        {STEPS[currentStep].description}
                    </p>
                </div>

            </div>

            {/* Footer Navigation */}
            <div className="p-5 border-t border-slate-800/50 bg-slate-900/50 flex justify-between items-center backdrop-blur-sm">
                <button 
                    onClick={prevStep}
                    className={`px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1 ${currentStep === 0 ? 'invisible' : ''}`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    قبلی
                </button>

                <button 
                    onClick={nextStep}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all flex items-center gap-2"
                >
                    {currentStep === STEPS.length - 1 ? 'شروع کنید' : 'بعدی'}
                    {currentStep !== STEPS.length - 1 && (
                        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    )}
                </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
