import React, { useState, useEffect, useRef } from 'react';
import { Sun, Gauge, Timer, ArrowUp, ArrowDown, Sunrise, Sunset, Moon } from 'lucide-react';
import { SolarTimeResult } from '../lib/solarTime';
import { Translations } from '../translations';
import { getMoonPhaseInfo } from '../lib/moon';

import { SeasonalPeriod } from '../types';

interface SolarWidgetsProps {
  solarInfo: SolarTimeResult;
  t: Translations;
  activePeriod: SeasonalPeriod | null;
}

const Widget = ({ title, value, icon, trendIcon: TrendIcon, trend, isUvIndex }: { title: string, value: string, icon: React.ReactNode, trendIcon?: React.ElementType | null, trend?: 'up' | 'down' | null, isUvIndex?: boolean }) => (
  <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
    <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1">
      {icon} {title}
    </div>
    <div className="text-white font-medium text-[11px] flex items-center justify-center gap-1">
      {value}
      {TrendIcon && <TrendIcon size={10} className={isUvIndex ? (trend === 'up' ? 'text-amber-500' : 'text-blue-500') : ''} />}
    </div>
  </div>
);

const SolarElevationBar = ({ altitude }: { altitude: number }) => {
  // Map -18 to 90 into 0 to 100
  const minAlt = -18;
  const maxAlt = 90; // User said up to 90 degrees
  const percentage = Math.max(0, Math.min(100, (altitude - minAlt) / (maxAlt - minAlt) * 100));

  return (
    <div className="relative h-2 w-full bg-slate-800 rounded-full my-2 px-2">
      <div 
        className="absolute h-full rounded-full bg-gradient-to-r from-indigo-900 via-sky-800 to-amber-500"
        style={{ width: `${percentage}%` }}
      />
      <div 
        className="absolute top-1/2 -translate-y-1/2 -ml-1"
        style={{ left: `${percentage}%` }}
      >
        {altitude >= 0 ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-300" />}
      </div>
    </div>
  );
};

export const SolarWidgets: React.FC<SolarWidgetsProps> = ({ solarInfo, t, activePeriod }) => {
  const { altitude, eventTimes, sunlightDurationSeconds, moonPhase } = solarInfo;

  // Derived values
  const uvIndex = Math.max(0, altitude / 90 * 10).toFixed(1);
  const intensity = Math.max(0, Math.sin(altitude * Math.PI / 180) * 100).toFixed(0);
  
  // Seasonal shift label if active (removed per user request)
  const seasonalLabel = '';

  const durationHours = Math.floor(sunlightDurationSeconds / 3600);
  const durationMinutes = Math.floor((sunlightDurationSeconds % 3600) / 60);
  const sunlightDuration = `${durationHours}h ${durationMinutes}m${seasonalLabel}`;
  
  const moonInfo = getMoonPhaseInfo(moonPhase);

  // Altitude Trend
  const prevAltitude = useRef(altitude);
  const [trend, setTrend] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (altitude > prevAltitude.current) {
      setTrend(prev => prev !== 'up' ? 'up' : prev);
    } else if (altitude < prevAltitude.current) {
      setTrend(prev => prev !== 'down' ? 'down' : prev);
    }
    prevAltitude.current = altitude;
  }, [altitude]);

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-4 px-2">
        <Widget title={t.intensity} value={`${intensity}%`} icon={<Sun size={12} />} trendIcon={TrendIcon} trend={trend} />
        <Widget title={t.uvIndex} value={uvIndex} icon={<Gauge size={12} />} trendIcon={TrendIcon} trend={trend} isUvIndex />
        <Widget title="Lua" value={moonInfo.name} icon={moonInfo.icon} />
      </div>
      <div className="grid grid-cols-1 gap-2 mt-2 px-2">
         <div 
           className="bg-white/5 p-2 rounded-lg text-center border border-white/5"
           title="Tempo total com o Sol acima de -0,8° do horizonte (altitude ≥ -0.8°)"
         >
            <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1">
               {t.sunlightDuration}
            </div>
            <div className="text-white font-medium text-[11px] flex items-center justify-center gap-1">
               {sunlightDuration}
            </div>
         </div>
         <SolarElevationBar altitude={altitude} />
       </div>
     </>
   );
 };
