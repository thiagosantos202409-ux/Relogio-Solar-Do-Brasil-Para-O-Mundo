import React, { useState } from 'react';
import { Translations } from '../translations';
import { SolarTimeResult } from '../lib/solarTime';

interface SolarAnalyticsPanelProps {
  solarInfo: SolarTimeResult;
  t: Translations;
}

export const SolarAnalyticsPanel: React.FC<SolarAnalyticsPanelProps> = React.memo(({ solarInfo, t }) => {
  const [isUtc, setIsUtc] = useState(false);
  const { sunlightDurationSeconds } = solarInfo;
  
  const totalDaySeconds = 24 * 60 * 60;
  const progress = Math.min(100, Math.max(0, (sunlightDurationSeconds / totalDaySeconds) * 100));

  return (
    <div className="mt-4 pt-2 border-t border-white/5">
        <div className="flex justify-between items-center mb-1">
            <p className="text-[6px] opacity-40 uppercase tracking-[0.2em]">Solar Analytics</p>
            <button 
                onClick={() => setIsUtc(!isUtc)}
                className="text-[6px] opacity-60 hover:opacity-100 uppercase tracking-wider bg-white/5 px-1 py-0.5 rounded transition-opacity"
            >
                {isUtc ? 'UTC' : 'Local'}
            </button>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500/80" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[6px] opacity-20 mt-1 uppercase text-center">
            {t.sunlightDuration}: {(sunlightDurationSeconds / 3600).toFixed(1)}h / 24h ({isUtc ? 'UTC' : 'Local'})
        </p>
    </div>
  );
});
