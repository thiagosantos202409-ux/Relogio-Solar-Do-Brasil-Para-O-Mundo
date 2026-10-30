import React from 'react';

interface AstronomicalNightWidgetProps {
  astronomicalDusk: Date | null;
  astronomicalDawn: Date | null;
  sunset: Date | null;
  sunrise: Date | null;
  nauticalDusk: Date | null;
  nauticalDawn: Date | null;
  civilDusk?: Date | null;
  civilDawn?: Date | null;
  urbanDayDurationSeconds?: number;
  urbanNightDurationSeconds?: number;
}

const safeDiffHoursMins = (start: Date | null, end: Date | null, defaultMs: number = 0) => {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    const hours = Math.floor(defaultMs / (1000 * 60 * 60));
    const minutes = Math.floor((defaultMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, ms: defaultMs };
  }
  let durationMs = end.getTime() - start.getTime();
  if (durationMs < 0) durationMs += 24 * 60 * 60 * 1000;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, ms: durationMs };
};

export const AstronomicalNightWidget: React.FC<AstronomicalNightWidgetProps> = ({ 
  astronomicalDusk, 
  astronomicalDawn,
  sunset,
  sunrise,
  nauticalDusk,
  nauticalDawn,
  civilDusk,
  civilDawn,
  urbanDayDurationSeconds,
  urbanNightDurationSeconds
}) => {
  // Safe calculations for Astronomical Night
  const astroNight = safeDiffHoursMins(astronomicalDusk, astronomicalDawn, 0);

  // Dia Visível Astronomicamente: Sun altitude > -18°
  const astroDay = safeDiffHoursMins(astronomicalDawn, astronomicalDusk, 24 * 60 * 60 * 1000);

  // Twilight duration calculation
  let totalTwilightMs = 0;
  if (astronomicalDusk && sunset && !isNaN(astronomicalDusk.getTime()) && !isNaN(sunset.getTime())) {
    let eve = astronomicalDusk.getTime() - sunset.getTime();
    if (eve < 0) eve += 24 * 60 * 60 * 1000;
    totalTwilightMs += eve;
  }
  if (sunrise && astronomicalDawn && !isNaN(sunrise.getTime()) && !isNaN(astronomicalDawn.getTime())) {
    let morn = sunrise.getTime() - astronomicalDawn.getTime();
    if (morn < 0) morn += 24 * 60 * 60 * 1000;
    totalTwilightMs += morn;
  }
  const twilightHours = Math.floor(totalTwilightMs / (1000 * 60 * 60));
  const twilightMinutes = Math.floor((totalTwilightMs % (1000 * 60 * 60)) / (1000 * 60));

  // Noite Visivel: From Nautical Dusk to Nautical Dawn
  const visibleNight = safeDiffHoursMins(nauticalDusk, nauticalDawn, 0);

  // Dia Visivel: From Nautical Dawn to Nautical Dusk
  const visibleDay = safeDiffHoursMins(nauticalDawn, nauticalDusk, 24 * 60 * 60 * 1000);

  // Dia Urbano: Solar altitude > -6° (From Civil Dawn to Civil Dusk)
  let urbanDayMs = 0;
  if (civilDusk && civilDawn && !isNaN(civilDusk.getTime()) && !isNaN(civilDawn.getTime())) {
    urbanDayMs = civilDusk.getTime() - civilDawn.getTime();
    if (urbanDayMs < 0) urbanDayMs += 24 * 60 * 60 * 1000;
  } else if (urbanDayDurationSeconds !== undefined) {
    urbanDayMs = urbanDayDurationSeconds * 1000;
  }
  const urbanDayH = Math.floor(urbanDayMs / (1000 * 60 * 60));
  const urbanDayM = Math.floor((urbanDayMs % (1000 * 60 * 60)) / (1000 * 60));
  const urbanDayFormatted = `${String(urbanDayH).padStart(2, '0')}:${String(urbanDayM).padStart(2, '0')}`;

  // Noite Urbana: Solar altitude <= -6°
  let urbanNightMs = (urbanNightDurationSeconds !== undefined) 
    ? urbanNightDurationSeconds * 1000 
    : Math.max(0, 24 * 60 * 60 * 1000 - urbanDayMs);
  const urbanNightH = Math.floor(urbanNightMs / (1000 * 60 * 60));
  const urbanNightM = Math.floor((urbanNightMs % (1000 * 60 * 60)) / (1000 * 60));
  const urbanNightFormatted = `${String(urbanNightH).padStart(2, '0')}:${String(urbanNightM).padStart(2, '0')}`;

  return (
    <div className="mt-2 space-y-2">
      {/* Top 3 summary cards */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5 flex flex-col justify-between">
          <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1 truncate leading-tight">
            Noite Astronômica
          </div>
          <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1 font-mono">
            {astroNight.hours}h {astroNight.minutes}m
          </div>
        </div>

        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5 flex flex-col justify-between">
          <div className="text-amber-300/80 text-[8px] flex items-center justify-center gap-1 mb-1 truncate leading-tight font-medium" title="Dia Visível Astronomicamente (Sol > -18°)">
            Dia Visível Astron.
          </div>
          <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1 font-mono">
            {astroDay.hours}h {astroDay.minutes}m
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
      </div>

      {/* Grid containing BOTH Dia Visível & Noite Visível simultaneously */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Dia Visível Section */}
        <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/25 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-amber-300 font-semibold text-[9px] uppercase tracking-wider">
              Dia Visível
            </span>
            <span className="text-amber-200/70 text-[8px] font-mono">Sol &gt; -12°</span>
          </div>
          <div className="bg-black/20 p-1.5 rounded text-center border border-amber-500/10">
            <div className="text-amber-300/80 text-[8px] mb-0.5">Tempo de Dia Visível</div>
            <div className="text-white font-medium text-[11px] font-mono">
              {visibleDay.hours}h {visibleDay.minutes}m
            </div>
          </div>
          <div className="bg-amber-600/20 p-1.5 rounded text-center border border-amber-400/30">
            <div className="text-amber-200 text-[8px] flex items-center justify-center gap-1 mb-0.5 font-semibold" title="Tempo total com o Sol acima de -6° de altitude solar (Dia Urbano)">
              Dia Urbano (Sol &gt; -6°)
            </div>
            <div className="text-amber-300 font-bold text-[13px] flex items-center justify-center gap-1 font-mono tracking-wider">
              {urbanDayFormatted}
            </div>
          </div>
        </div>

        {/* Noite Visível Section */}
        <div className="bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/25 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-indigo-300 font-semibold text-[9px] uppercase tracking-wider">
              Noite Visível
            </span>
            <span className="text-indigo-200/70 text-[8px] font-mono">Sol ≤ -12°</span>
          </div>
          <div className="bg-black/20 p-1.5 rounded text-center border border-indigo-500/10">
            <div className="text-indigo-300/80 text-[8px] mb-0.5">Tempo de Noite Visível</div>
            <div className="text-white font-medium text-[11px] font-mono">
              {visibleNight.hours}h {visibleNight.minutes}m
            </div>
          </div>
          <div className="bg-indigo-600/20 p-1.5 rounded text-center border border-indigo-400/30">
            <div className="text-indigo-200 text-[8px] flex items-center justify-center gap-1 mb-0.5 font-semibold" title="Tempo total com o Sol abaixo de -6° de altitude solar (Noite Urbana)">
              Noite Urbana (Sol ≤ -6°)
            </div>
            <div className="text-indigo-300 font-bold text-[13px] flex items-center justify-center gap-1 font-mono tracking-wider">
              {urbanNightFormatted}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
