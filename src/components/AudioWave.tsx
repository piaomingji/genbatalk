import React from 'react';

interface AudioWaveProps {
  isActive: boolean;
  colorClass?: string;
}

export default function AudioWave({ isActive, colorClass = "bg-indigo-500" }: AudioWaveProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 py-3 px-4 rounded-full bg-slate-900/60 border border-slate-800 backdrop-blur-md">
      {[...Array(9)].map((_, i) => {
        const delay = `${i * 0.15}s`;
        const height = isActive ? "h-full" : "h-2";
        
        return (
          <div
            key={i}
            style={{
              animationDelay: delay,
              transformOrigin: 'center',
            }}
            className={`w-1 rounded-full transition-all duration-300 ${colorClass} ${height} ${
              isActive ? 'animate-bounce' : 'opacity-40'
            }`}
          />
        );
      })}
    </div>
  );
}
