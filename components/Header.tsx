
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_VERSION, AppStatus } from '../types';

interface HeaderProps {
  appStatus: AppStatus;
  onOpenGuide: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  isCustomKeyActive: boolean;
  settingsCheckTrigger?: number;
}

export const Header: React.FC<HeaderProps> = ({ appStatus, onOpenGuide, onToggleHistory, onOpenSettings, isCustomKeyActive, settingsCheckTrigger }) => {
  const [isOsyanActive, setIsOsyanActive] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerOsyan = () => {
    setIsOsyanActive(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOsyanActive(false);
    }, 5000);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Generate deterministic heights and delays for the stable bars using useMemo
  const bars = React.useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => {
      // Create beautifully staggered heights and delays deterministically using trigonometric functions
      const angle = (i / 40) * Math.PI * 2;
      const factor = (Math.sin(angle) + 1.2) / 2.2; // 0.09 to 1.0 range
      const height = Math.round(20 + factor * 60); // 20% to 80% range
      const delay = parseFloat((i * 0.03).toFixed(3));
      const duration = parseFloat((0.8 + Math.abs(Math.cos(angle)) * 0.6).toFixed(3));
      return {
        id: i,
        delay,
        height,
        duration,
      };
    });
  }, []);

  const isLoading = appStatus === AppStatus.GENERATING || appStatus === AppStatus.ANALYZING;
  const isPlaying = appStatus === AppStatus.PLAYING;

  // Visual Config
  const barColor = isOsyanActive
    ? 'bg-rose-500'
    : isLoading 
      ? 'bg-amber-400' 
      : 'bg-cyan-400';

  const shadowColor = isOsyanActive
    ? 'shadow-[0_0_12px_#f43f5e,0_0_20px_#f43f5e]'
    : isLoading 
      ? 'shadow-[0_0_8px_#fbbf24,0_0_15px_#fbbf24]' 
      : 'shadow-[0_0_8px_#22d3ee,0_0_15px_#22d3ee]';

  const animationSpeedMultiplier = isOsyanActive
    ? 0.15 // Super speed visualizer overdrive!
    : isLoading 
      ? 0.3 
      : 1;

  return (
    <header className="w-full h-[80px] relative z-50 overflow-hidden border-b border-primary-500/20 shadow-[0_5px_20px_rgba(0,0,0,0.5)] flex-none">
      
      {/* 1. ANIMATED TECHNO BACKGROUND */}
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center gap-[3px] opacity-60 pointer-events-none">
        {bars.map((bar) => (
          <div
            key={bar.id}
            className={`w-1 rounded-full animate-equalizer transition-all duration-500 ${barColor} ${shadowColor}`}
            style={{
              height: `${bar.height}%`,
              animationDelay: `${bar.delay}s`,
              animationDuration: `${bar.duration * animationSpeedMultiplier}s`
            }}
          />
        ))}
      </div>
      
      {/* Scan Line Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-scan-line pointer-events-none z-0 mix-blend-overlay"></div>

      {/* Glass Overlay */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] z-0"></div>

      {/* 2. CONTENT CONTAINER - SYMMETRICAL LAYOUT */}
      <div className="relative z-10 w-full h-full max-w-lg mx-auto px-7 md:px-8 flex items-center justify-between">
        
        {/* LEFT HUD (Version & Actions) - Physical Left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-7 md:left-8 flex flex-col gap-1 select-none items-start transition-all duration-300" dir="ltr">
           
           {/* ACTION BUTTONS */}
           <div className="flex items-center gap-3 mb-1 pl-1">
              <button 
                  onClick={onOpenGuide}
                  className="group flex items-center justify-center w-6 h-6 rounded bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all"
                  title="راهنما"
              >
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <button 
                  onClick={onToggleHistory}
                  className="group flex items-center justify-center w-6 h-6 rounded bg-slate-800/50 border border-slate-700 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all"
                  title="تاریخچه"
                  id="history-toggle-btn"
              >
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
           </div>

            {/* Top bracket */}
            <div className="flex items-center text-cyan-500/50 text-[8px] leading-none font-mono">
               <span>┌</span>
               <span className="w-4 md:w-8 h-[1px] bg-cyan-500/30 mx-1"></span>
            </div>

            {/* Clickable Version Area for OSYAN Activator */}
            <div 
              onClick={triggerOsyan}
              className="px-1.5 flex flex-col gap-0.5 cursor-pointer group/ver hover:text-cyan-300 transition-colors select-none"
              title="فعال‌سازی سیستم OSYAN"
            >
               <div className="flex items-center gap-1.5 h-[10px]">
                  <div className={`w-1 h-1 rounded-sm animate-pulse shadow-[0_0_8px] transition-colors duration-300 ${
                    isOsyanActive 
                      ? 'bg-rose-500 shadow-rose-500' 
                      : isLoading 
                        ? 'bg-amber-400 shadow-amber-400' 
                        : 'bg-emerald-400 shadow-emerald-400'
                  }`}></div>
                  {isPlaying && (
                      <div className="flex gap-0.5 items-end h-full">
                          <div className="w-0.5 h-1.5 bg-cyan-400 animate-pulse"></div>
                          <div className="w-0.5 h-2.5 bg-cyan-400 animate-pulse delay-75"></div>
                          <div className="w-0.5 h-1 bg-cyan-400 animate-pulse delay-150"></div>
                      </div>
                  )}
               </div>
               <div className="flex items-center gap-1 text-[7px] font-mono text-slate-400 group-hover/ver:text-cyan-300 transition-colors">
                  <span className="opacity-70">VER</span>
                  <span className={`font-bold transition-colors duration-300 ${isOsyanActive ? 'text-rose-400 drop-shadow-[0_0_4px_#f43f5e]' : 'text-cyan-300'}`}>{APP_VERSION}</span>
               </div>
            </div>

            {/* Bottom bracket */}
            <div className="flex items-center text-cyan-500/50 text-[8px] leading-none font-mono">
               <span className="w-4 md:w-8 h-[1px] bg-cyan-500/30 mx-1"></span>
               <span>┘</span>
            </div>
         </div>

         {/* CENTER LOGO - Absolute Centered with Smooth Motion Transitions */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center min-w-[280px]">
           <AnimatePresence mode="wait">
             {!isOsyanActive ? (
               <motion.div
                 key="zendia"
                 initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                 animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                 exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                 transition={{ duration: 0.35, ease: 'easeOut' }}
                 className="flex flex-col items-center justify-center"
               >
                 <div className="flex items-center gap-1" dir="ltr">
                    <span className={`font-broken font-black text-2xl md:text-3xl tracking-wider transition-colors duration-500 drop-shadow-md ${isLoading ? 'text-amber-100' : 'text-slate-100'}`}>
                     Zen
                   </span>
                    <span className={`font-broken font-black text-2xl md:text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-br drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all duration-500 ${isLoading ? 'from-amber-300 to-amber-500' : 'from-cyan-300 to-cyan-500'}`}>
                     dia
                   </span>
                 </div>
                 
                 <div className="flex items-center gap-2 mt-0.5 opacity-90" dir="ltr">
                   <div className={`h-[1px] w-1.5 md:w-3 transition-colors duration-500 ${isLoading ? 'bg-amber-500/70 shadow-[0_0_5px_#fbbf24]' : 'bg-cyan-500/70 shadow-[0_0_5px_#22d3ee]'}`}></div>
                   <span className={`text-[7px] md:text-[8px] font-mono tracking-[0.2em] uppercase font-bold text-shadow-sm transition-colors duration-500 ${isLoading ? 'text-amber-100' : 'text-cyan-100'}`}>
                     {isLoading ? 'PREPARING...' : 'ZEN + DIAGNOSIS'}
                   </span>
                   <div className={`h-[1px] w-1.5 md:w-3 transition-colors duration-500 ${isLoading ? 'bg-amber-500/70 shadow-[0_0_5px_#fbbf24]' : 'bg-cyan-500/70 shadow-[0_0_5px_#22d3ee]'}`}></div>
                 </div>

                 {/* OSYAN NEURAL INTELLIGENCE BADGE */}
                 <div className="mt-1 md:mt-1.5 flex items-center justify-center opacity-85 hover:opacity-100 transition-opacity" dir="ltr">
                   <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-0.5 rounded border border-cyan-500/20 shadow-[0_0_8px_rgba(34,211,238,0.15)] backdrop-blur-sm relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full animate-[scanLine_4s_linear_infinite] pointer-events-none mix-blend-screen"></div>
                     <span className="text-[5px] md:text-[6px] font-mono tracking-[0.1em] text-slate-400 uppercase leading-none whitespace-nowrap">
                       POWERED BY
                     </span>
                     <span className="text-[6px] md:text-[6.5px] font-broken font-bold tracking-[0.15em] text-cyan-400 uppercase leading-none whitespace-nowrap drop-shadow-[0_0_4px_rgba(34,211,238,0.7)] group-hover:text-cyan-300 transition-colors">
                       OSYAN NEURAL INTELLIGENCE
                     </span>
                   </div>
                 </div>
               </motion.div>
             ) : (
               <motion.div
                 key="osyan"
                 initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                 animate={{ opacity: 1, scale: 1.05, filter: 'blur(0px)' }}
                 exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                 transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                 className="flex flex-col items-center justify-center relative"
               >
                 {/* Glow Background Layer */}
                 <div className="absolute inset-0 -m-4 bg-gradient-to-r from-rose-500/10 via-fuchsia-500/10 to-cyan-500/10 blur-xl rounded-full animate-pulse pointer-events-none"></div>
                 
                 <div className="flex flex-col items-center gap-0.5 relative z-10" dir="ltr">
                   <span className="text-[5.5px] md:text-[6.5px] font-mono tracking-[0.3em] text-rose-400 font-bold uppercase animate-pulse">
                     COGNITIVE OVERDRIVE ACTIVE
                   </span>
                   
                   {/* OSYAN .NEURAL:INTELLIGENCE with stunning metallic/gradient style & large font */}
                   <h1 className="text-[11.5px] md:text-sm font-black tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-400 to-cyan-400 font-sans text-center filter drop-shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-[pulse_1.5s_infinite_alternate] leading-tight select-none">
                     OSYAN .NEURAL:INTELLIGENCE
                   </h1>
                   
                   <div className="flex items-center gap-1.5 mt-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-ping"></span>
                     <span className="text-[5px] md:text-[5.5px] font-mono tracking-widest text-slate-300 uppercase opacity-90">
                       SYSTEM COMPILING IN PROGRESS
                     </span>
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* RIGHT HUD (Physical Right) */}
         <div className="absolute top-1/2 -translate-y-1/2 right-7 md:right-8 flex flex-col gap-0.5 select-none items-end transition-all duration-300" dir="ltr">
            
            {/* Clickable AI Settings Widget */}
            <button 
              onClick={onOpenSettings}
              className="group flex flex-col items-end gap-0.5 px-2 py-1 mb-1.5 mr-0.5 rounded bg-slate-800/60 border border-slate-700/60 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all select-none cursor-pointer"
              title="تنظیمات موتور هوش مصنوعی"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCustomKeyActive ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`}></span>
                <span className="text-[7.5px] font-black text-slate-400 group-hover:text-cyan-300 transition-colors uppercase font-sans tracking-wide">
                  {isCustomKeyActive ? 'API: CUSTOM' : 'API: FREE'}
                </span>
              </div>
            </button>

            {/* Top bracket */}
            <div className="flex items-center text-cyan-500/50 text-[8px] leading-none font-mono">
               <span className="w-4 md:w-8 h-[1px] bg-cyan-500/30 mx-1"></span>
               <span>┐</span>
            </div>

            {/* Clickable Eruda Area (SYS RDY) */}
            <div 
              onClick={() => {
                try {
                  if (typeof window !== 'undefined' && (window as any).eruda) {
                    (window as any).eruda.show();
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
              className="px-1.5 flex flex-col gap-0.5 items-end cursor-pointer group/sys hover:text-cyan-300 transition-colors select-none"
              title="اجرای کنسول توسعه‌دهنده"
              id="eruda-toggle-btn"
            >
                <div className="flex items-center gap-1.5 h-[10px]">
                    <div className="flex items-end gap-0.5 h-1.5">
                        <div className="w-0.5 h-1 bg-cyan-500/40"></div>
                        <div className="w-0.5 h-1 bg-cyan-500/60"></div>
                        <div className="w-0.5 h-1.5 bg-cyan-500/80"></div>
                    </div>
                    <div className={`w-1 h-1 rounded-full ${appStatus === AppStatus.IDLE ? 'bg-slate-600' : 'bg-cyan-400 animate-pulse'}`}></div>
                </div>
                <div className="flex items-center gap-1.5 text-[7px] font-mono text-slate-400 group-hover/sys:text-cyan-300 transition-colors">
                     <span className="text-cyan-300 font-bold opacity-80">SYS</span>
                     <span className="opacity-70">RDY</span>
                </div>
            </div>

            {/* Bottom bracket */}
            <div className="flex items-center text-cyan-500/50 text-[8px] leading-none font-mono">
               <span>└</span>
               <span className="w-4 md:w-8 h-[1px] bg-cyan-500/30 mx-1"></span>
            </div>
         </div>

      </div>
    </header>
  );
};
