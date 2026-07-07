import React, { useState } from 'react';
import { Header } from './components/Header';
import { TextToSpeech } from './components/TextToSpeech';
import { UserGuide } from './components/UserGuide';
import { ZendiaRadar } from './components/ZendiaRadar';
import { AISettingsModal } from './components/AISettingsModal';
import { AppStatus } from './types';
import { Activity, Mic2 } from 'lucide-react';
import { getAiSettings } from './services/geminiService';

type ModuleType = 'analyzer' | 'radar';

const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [guideTrigger, setGuideTrigger] = useState<number>(0);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<ModuleType>('analyzer');
  const [analyzerViewMode, setAnalyzerViewMode] = useState<'INPUT' | 'CHAT'>('INPUT');

  // --- AI Settings Modal ---
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [quotaReason, setQuotaReason] = useState<string>('');
  const [quotaResetTime, setQuotaResetTime] = useState<string>('');
  
  // Re-check settings state when modal closes
  const [settingsCheckTrigger, setSettingsCheckTrigger] = useState<number>(0);
  const isCustomKeyActive = !!getAiSettings().customApiKey;

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
        onOpenSettings={() => {
          setQuotaReason("");
          setQuotaResetTime("");
          setIsSettingsModalOpen(true);
        }}
        isCustomKeyActive={isCustomKeyActive}
        settingsCheckTrigger={settingsCheckTrigger}
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
              setIsSettingsModalOpen(true);
            }}
          />
        </div>
        <div className={`w-full h-full ${activeModule === 'radar' ? 'block' : 'hidden'}`}>
          <ZendiaRadar 
            isActive={activeModule === 'radar'} 
            onShowQuotaError={(reason, resetTime) => {
              setQuotaReason(reason);
              setQuotaResetTime(resetTime);
              setIsSettingsModalOpen(true);
            }}
          />
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

      {/* AI Settings Modal */}
      <AISettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setSettingsCheckTrigger(prev => prev + 1);
        }}
        quotaReason={quotaReason}
        quotaResetTime={quotaResetTime}
      />
    </div>
  );
};

export default App;
