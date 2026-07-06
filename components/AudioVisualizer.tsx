import React from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  // Generate deterministic heights and animation properties to avoid Math.random during render
  const bars = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const baseHeight = Math.round(20 + ((Math.sin(angle) + 1) / 2) * 50); // 20% to 70% range
      const delay = parseFloat((i * 0.04).toFixed(3));
      const duration = parseFloat((0.4 + Math.abs(Math.cos(angle)) * 0.5).toFixed(3));
      return {
        id: i,
        baseHeight,
        delay,
        duration,
      };
    });
  }, []);

  return (
    <div className="flex items-end justify-between gap-[2px] h-full w-full overflow-hidden px-1">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`flex-1 rounded-full transition-all duration-150 ease-in-out ${
            isPlaying 
              ? 'bg-primary-400 shadow-[0_0_5px_#22d3ee] animate-equalizer' 
              : 'bg-slate-700/50'
          }`}
          style={{
            height: isPlaying ? undefined : '20%', // The keyframe handles height dynamically if playing
            opacity: isPlaying ? 0.8 : 0.3,
            animationDelay: `${bar.delay}s`,
            animationDuration: isPlaying ? `${bar.duration}s` : undefined,
          }}
        />
      ))}
    </div>
  );
};