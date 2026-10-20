import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface ZenithDistanceReadoutProps {
  altitude: number;
  history: number[];
}

export const ZenithDistanceReadout: React.FC<ZenithDistanceReadoutProps> = ({ altitude, history }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const zenithDistance = Math.max(0, 90 - altitude);
  
  const data = history.map((alt, i) => ({ name: i, zenith: Math.max(0, 90 - alt) }));

  return (
    <div className="flex flex-col items-center relative">
      <div 
        className="flex flex-col w-full cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="opacity-40 uppercase truncate text-[9px]">Zenith Dist.</span>
        <span className="font-mono text-amber-500 text-lg">{zenithDistance.toFixed(1)}°</span>
      </div>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 p-3 bg-black/90 text-white text-[10px] rounded border border-white/20 w-48 shadow-xl">
          O ângulo zenital solar é o ângulo entre o zênite (ponto diretamente acima) e o centro do disco solar.
        </div>
      )}

      <div className="w-24 h-10 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="zenith" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <YAxis domain={[0, 180]} hide />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
