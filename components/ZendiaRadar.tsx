import React, { useState, useEffect } from 'react';
import { generateRadarReport, RadarReport, RadarEntity } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface ZendiaRadarProps {
  isActive?: boolean;
}

export const ZendiaRadar: React.FC<ZendiaRadarProps> = ({ isActive }) => {
  const [report, setReport] = useState<RadarReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await generateRadarReport();
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasFetched) {
      setHasFetched(true);
      fetchReport();
    }
  }, [isActive, hasFetched]);

  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case 'stable': return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'neutral': return 'text-slate-300 bg-slate-400/10 border-slate-400/20';
      case 'negative': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    }
  };

  // Mock stable but organic-looking data relative to report using useMemo
  const volatilityData = React.useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const variation = Math.sin(i * 1.2) * 12; // stable wave variation
      const baseValue = report ? report.volatility : 50;
      return {
        time: i,
        value: Math.max(10, Math.min(95, Math.round(baseValue + variation)))
      };
    });
  }, [report]);

  const globalMoodData = React.useMemo(() => {
    if (!report) return [];
    return [
      { subject: 'امیدواری', A: report.globalMood, fullMark: 100 },
      { subject: 'نوآوری', A: Math.round((report.globalMood + 20) % 100), fullMark: 100 },
      { subject: 'ثبات', A: Math.round(100 - report.volatility), fullMark: 100 },
      { subject: 'تنش', A: Math.round(report.volatility), fullMark: 100 },
      { subject: 'ریسک', A: Math.round((report.volatility * 1.2) % 100), fullMark: 100 },
    ];
  }, [report]);

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto no-scrollbar pb-20 pt-4 px-4 relative">
      {loading || (!report && !hasFetched) ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
            <Activity className="absolute inset-0 m-auto w-8 h-8 text-primary-400 animate-pulse" />
          </div>
          <p className="text-primary-400 font-bold text-sm animate-pulse tracking-widest">در حال پویش شبکه جهانی...</p>
        </div>
      ) : report ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center px-1">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary-400" />
                رادار زنده زِندیا
              </h2>
              <p className="text-xs text-slate-400 mt-1">نمای کلی از وضعیت سیگنال‌های خبری امروز</p>
            </div>
            <button onClick={fetchReport} className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold rounded-full bg-slate-800 hover:bg-primary-500/20 text-slate-300 hover:text-primary-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>بروزرسانی</span>
            </button>
          </div>

          {/* Briefing Card */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-purple-500/5 pointer-events-none"></div>
            <p className="text-sm font-medium text-slate-200 leading-relaxed text-justify relative z-10">
              {report.briefing}
            </p>
          </div>

          {/* Gauges & Charts Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center">
               <h3 className="text-xs text-slate-400 font-bold mb-2">روحیه جهانی (Global Mood)</h3>
               <div className="text-4xl font-black text-primary-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                 {report.globalMood}
               </div>
               <div className="text-[10px] text-slate-500 mt-1">نسبت به دیروز</div>
            </div>

            <div className="col-span-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center">
               <h3 className="text-xs text-slate-400 font-bold mb-2">شاخص نوسان (Volatility)</h3>
               <div className="text-4xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.4)]">
                 {report.volatility}
               </div>
               <div className="text-[10px] text-slate-500 mt-1">سطح ریسک اخبار</div>
            </div>

            {/* Radar Chart */}
            <div className="col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-2 h-64">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={globalMoodData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Today"
                      dataKey="A"
                      stroke="#22d3ee"
                      fill="#22d3ee"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Top Entities */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-300 px-1 border-b border-slate-800 pb-2">موجودیت‌های ترند شده</h3>
             <div className="flex justify-start items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {report.topEntities.map((entity, idx) => (
                   <div key={idx} className={`flex-none min-w-[140px] p-3 rounded-xl border ${getSentimentColor(entity.sentiment)} bg-opacity-20 backdrop-blur-sm flex flex-col gap-2`}>
                      <div className="flex justify-between items-start">
                         <span className="font-bold text-xs truncate max-w-[80px]" title={entity.name}>{entity.name}</span>
                         {renderTrendIcon(entity.trend)}
                      </div>
                      <div className="text-[10px] opacity-80 flex items-center justify-between">
                         صداها: {entity.mentions}
                         <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Threats & Opportunities */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-3">
                 <AlertTriangle className="w-4 h-4" />
                 تهدیدها
              </h3>
              <ul className="space-y-2">
                {report.threats.map((t, i) => (
                  <li key={i} className="text-[11px] text-slate-300 leading-relaxed pr-2 relative before:content-[''] before:absolute before:right-0 before:top-1.5 before:w-1 before:h-1 before:bg-rose-500 before:rounded-full">
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-3">
                 <Lightbulb className="w-4 h-4" />
                 فرصت‌ها
              </h3>
              <ul className="space-y-2">
                {report.opportunities.map((o, i) => (
                  <li key={i} className="text-[11px] text-slate-300 leading-relaxed pr-2 relative before:content-[''] before:absolute before:right-0 before:top-1.5 before:w-1 before:h-1 before:bg-emerald-500 before:rounded-full">
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
};
