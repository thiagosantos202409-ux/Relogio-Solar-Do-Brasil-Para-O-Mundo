import React, { useState } from 'react';

interface AstronomicalNightWidgetProps {
  astronomicalDusk: Date | null;
  astronomicalDawn: Date | null;
  sunset: Date | null;
  sunrise: Date | null;
  nauticalDusk: Date | null;
  nauticalDawn: Date | null;
}

export const AstronomicalNightWidget: React.FC<AstronomicalNightWidgetProps> = ({ 
  astronomicalDusk, 
  astronomicalDawn,
  sunset,
  sunrise,
  nauticalDusk,
  nauticalDawn
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'night'>('day');

  if (!astronomicalDusk || !astronomicalDawn || !sunset || !sunrise || !nauticalDusk || !nauticalDawn) return null;

  // Simple duration calculation.
  // The night starts at dusk and ends at dawn.
  let durationMs = astronomicalDawn.getTime() - astronomicalDusk.getTime();
  
  // If the dawn is before the dusk, it means the night spans midnight.
  if (durationMs < 0) durationMs += 24 * 60 * 60 * 1000; 

  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // Dia Visível Astronomicamente: Sun altitude > -18° (From Astronomical Dawn to Astronomical Dusk)
  let astroDayMs = astronomicalDusk.getTime() - astronomicalDawn.getTime();
  if (astroDayMs < 0) astroDayMs += 24 * 60 * 60 * 1000;
  const astroDayHours = Math.floor(astroDayMs / (1000 * 60 * 60));
  const astroDayMinutes = Math.floor((astroDayMs % (1000 * 60 * 60)) / (1000 * 60));

  // Twilight duration calculation
  let eveningTwilightMs = astronomicalDusk.getTime() - sunset.getTime();
  if (eveningTwilightMs < 0) eveningTwilightMs += 24 * 60 * 60 * 1000;

  let morningTwilightMs = sunrise.getTime() - astronomicalDawn.getTime();
  if (morningTwilightMs < 0) morningTwilightMs += 24 * 60 * 60 * 1000;

  const totalTwilightMs = eveningTwilightMs + morningTwilightMs;
  const twilightHours = Math.floor(totalTwilightMs / (1000 * 60 * 60));
  const twilightMinutes = Math.floor((totalTwilightMs % (1000 * 60 * 60)) / (1000 * 60));

  // Noite Visivel: From Nautical Dusk to Nautical Dawn
  let visibleNightMs = nauticalDawn.getTime() - nauticalDusk.getTime();
  if (visibleNightMs < 0) visibleNightMs += 24 * 60 * 60 * 1000;
  const visibleNightHours = Math.floor(visibleNightMs / (1000 * 60 * 60));
  const visibleNightMinutes = Math.floor((visibleNightMs % (1000 * 60 * 60)) / (1000 * 60));

  // Dia Visivel: From Nautical Dawn to Nautical Dusk
  let visibleDayMs = nauticalDusk.getTime() - nauticalDawn.getTime();
  if (visibleDayMs < 0) visibleDayMs += 24 * 60 * 60 * 1000;
  const visibleDayHours = Math.floor(visibleDayMs / (1000 * 60 * 60));
  const visibleDayMinutes = Math.floor((visibleDayMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="mt-2">
      <div className="flex bg-white/5 rounded-lg p-1 mb-2 border border-white/5">
        <button 
          onClick={() => setViewMode('day')}
          className={`flex-1 py-1 text-[9px] font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-white'}`}
        >
          Dia Visível
        </button>
        <button 
          onClick={() => setViewMode('night')}
          className={`flex-1 py-1 text-[9px] font-medium rounded-md transition-colors ${viewMode === 'night' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400 hover:text-white'}`}
        >
          Noite Visível
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5 flex flex-col justify-between">
          <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1 truncate leading-tight">
            Noite Astronômica
          </div>
          <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1 font-mono">
            {hours}h {minutes}m
          </div>
        </div>

        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5 flex flex-col justify-between">
          <div className="text-amber-300/80 text-[8px] flex items-center justify-center gap-1 mb-1 truncate leading-tight font-medium" title="Dia Visível Astronomicamente (Sol > -18°)">
            Dia Visível Astron.
          </div>
          <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1 font-mono">
            {astroDayHours}h {astroDayMinutes}m
          </div>
        </div>

        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5 flex flex-col justify-between">
          <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1 truncate leading-tight">
            Crepúsculo de Tempo
          </div>
          <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1 font-mono">
            {twilightHours}h {twilightMinutes}m
          </div>
        </div>

        {viewMode === 'night' ? (
          <div className="bg-indigo-500/10 p-2 rounded-lg text-center border border-indigo-500/20 col-span-3">
            <div className="text-indigo-300 text-[8px] flex items-center justify-center gap-1 mb-1 truncate">
              Tempo de Noite Visível
            </div>
            <div className="text-white font-medium text-[11px] flex items-center justify-center gap-1 font-mono">
              {visibleNightHours}h {visibleNightMinutes}m
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 p-2 rounded-lg text-center border border-amber-500/20 col-span-3">
            <div className="text-amber-300 text-[8px] flex items-center justify-center gap-1 mb-1 truncate">
              Tempo de Dia Visível
            </div>
            <div className="text-white font-medium text-[11px] flex items-center justify-center gap-1 font-mono">
              {visibleDayHours}h {visibleDayMinutes}m
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
