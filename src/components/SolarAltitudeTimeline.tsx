import React, { useState } from 'react';
import { Sun, Moon, Info, Calendar } from 'lucide-react';

export interface HourPoint {
  absoluteTimeMs: number;
  civilHour: number;
  civilMinutes: number;
  altitude: number;
  isDST: boolean;
  totalOffset: number;
  label: string;
}

interface SolarAltitudeTimelineProps {
  history: HourPoint[];
  currentAltitude: number;
  localCivilTime: Date;
  language: 'pt' | 'en' | string;
}

export const SolarAltitudeTimeline: React.FC<SolarAltitudeTimelineProps> = ({
  history,
  currentAltitude,
  localCivilTime,
  language
}) => {
  // Use index in history for hover state to correctly handle non-unique hours (e.g. DST fallback repeating an hour)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!history || history.length === 0) return null;

  // Layout dimensions
  const width = 500;
  const height = 110;
  const paddingX = 20;
  const paddingY = 15;

  const totalPoints = history.length;

  // Map point index to X coordinates
  const getX = (index: number) => {
    return paddingX + (index / (totalPoints - 1)) * (width - 2 * paddingX);
  };

  // Map -90 to +90 altitude to Y coordinates
  const getY = (alt: number) => {
    const normalized = (alt - (-90)) / 180; // 0 to 1
    return height - paddingY - normalized * (height - 2 * paddingY);
  };

  // Find where current absolute time fits in history for continuous positioning
  const currentUtcMs = localCivilTime.getTime();
  
  // Interpolate current index based on absoluteTimeMs
  let currentIndex = 0;
  if (history.length > 1) {
    const firstTime = history[0].absoluteTimeMs;
    const lastTime = history[history.length - 1].absoluteTimeMs;
    if (currentUtcMs <= firstTime) {
      currentIndex = 0;
    } else if (currentUtcMs >= lastTime) {
      currentIndex = history.length - 1;
    } else {
      // Find interval
      for (let i = 0; i < history.length - 1; i++) {
        if (currentUtcMs >= history[i].absoluteTimeMs && currentUtcMs < history[i+1].absoluteTimeMs) {
          const ratio = (currentUtcMs - history[i].absoluteTimeMs) / (history[i+1].absoluteTimeMs - history[i].absoluteTimeMs);
          currentIndex = i + ratio;
          break;
        }
      }
    }
  }

  // Construct coordinates for the daily path
  const coords = history.map((p, idx) => ({
    ...p,
    x: getX(idx),
    y: getY(p.altitude)
  }));

  // Generate smooth cubic bezier line path
  let linePath = '';
  let areaPath = '';

  if (coords.length > 0) {
    linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
      const cpY2 = next.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    // Close area at the bottom (-90 degrees / nadir Y-level)
    const bottomY = height - paddingY;
    areaPath = `${linePath} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
  }

  // Get localized strings
  const isPt = language === 'pt';
  const title = isPt ? 'Perfil de Altura Solar Diária' : 'Daily Solar Altitude Profile';
  const subTitle = isPt ? 'Trajetória das 00:00 às 23:59' : 'Trajectory from 00:00 to 23:59';
  const currentLabel = isPt ? 'Agora' : 'Now';
  const horizonLabel = isPt ? 'Horizonte (0°)' : 'Horizon (0°)';
  const dayLabel = isPt ? 'Dia' : 'Day';
  const nightLabel = isPt ? 'Noite' : 'Night';

  // Determine standard, shortened, or lengthened civil day
  // (Excluding the end of day point which makes the civil hourly points count as history.length - 1)
  const civilHoursCount = totalPoints - 1;
  const isShortDay = civilHoursCount < 24;
  const isLongDay = civilHoursCount > 24;

  const getDayTypeLabel = () => {
    if (isShortDay) {
      return isPt 
        ? `Mudança Sazonal (+1h adiantada / Dia de ${civilHoursCount}h)`
        : `Seasonal Change (+1h transition / ${civilHoursCount}h Day)`;
    }
    if (isLongDay) {
      return isPt
        ? `Mudança Sazonal (-1h atrasada / Dia de ${civilHoursCount}h)`
        : `Seasonal Change (-1h transition / ${civilHoursCount}h Day)`;
    }
    return null;
  };

  // Find active data based on hover or current time
  const activeIndex = hoveredIndex !== null ? hoveredIndex : Math.min(Math.floor(currentIndex), totalPoints - 1);
  const activePoint = history[activeIndex];
  const activeAltitude = activePoint ? activePoint.altitude : currentAltitude;
  const activeLabel = activePoint ? activePoint.label : (isPt ? 'Agora' : 'Now');

  return (
    <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
      {/* Header section with current position readout */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-amber-400 uppercase tracking-[0.2em]">
            {title}
          </span>
          <span className="text-[10px] text-white/40 font-medium">
            {subTitle}
          </span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[7px] opacity-40 uppercase font-mono tracking-widest">
            {hoveredIndex !== null ? activeLabel : currentLabel}
          </span>
          <span className="text-sm font-mono font-bold text-amber-300 mt-0.5 flex items-center gap-1">
            {activeAltitude >= 0 ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-300" />
            )}
            {activeAltitude.toFixed(4)}°
          </span>
        </div>
      </div>

      {/* DST / Seasonal transition alert badge if any */}
      {getDayTypeLabel() && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[8px] font-medium text-amber-400 animate-pulse">
          <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{getDayTypeLabel()}</span>
        </div>
      )}

      {/* The main chart visualization container */}
      <div className="relative w-full h-[110px] bg-black/45 rounded-xl border border-white/5 overflow-hidden">
        
        {/* Subtle background layers for Day vs Night */}
        <div className="absolute inset-x-0 top-0 pointer-events-none flex flex-col" style={{ height: '100%' }}>
          {/* Day Region (above 0° altitude) */}
          <div 
            className="w-full bg-gradient-to-b from-amber-500/[0.03] to-transparent border-b border-white/[0.08]" 
            style={{ height: '50%' }}
          >
            <span className="absolute left-2 top-1.5 text-[5px] font-mono uppercase tracking-widest text-amber-400/30">
              {dayLabel}
            </span>
          </div>
          {/* Night Region (below 0° altitude) */}
          <div 
            className="w-full bg-gradient-to-t from-indigo-950/[0.1] to-transparent" 
            style={{ height: '50%' }}
          >
            <span className="absolute left-2 bottom-1.5 text-[5px] font-mono uppercase tracking-widest text-indigo-300/30">
              {nightLabel}
            </span>
          </div>
        </div>

        {/* Horizon (0°) Center Line indicator */}
        <div 
          className="absolute inset-x-0 border-t border-dashed border-amber-500/15 pointer-events-none flex justify-end pr-2 text-[5px] font-mono text-amber-500/40"
          style={{ top: '50%' }}
        >
          <span className="bg-black/40 px-1 -translate-y-1/2 rounded">{horizonLabel}</span>
        </div>

        {/* Hourly vertical subtle guidelines */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-[20px]">
          {history.map((pt, idx) => {
            // Only draw ticks for normal hours (not the duplicated last 24:00 point)
            if (idx === totalPoints - 1) return null;
            const isTarget = idx === hoveredIndex || (hoveredIndex === null && idx === Math.floor(currentIndex));
            return (
              <div 
                key={`alt-guideline-${idx}-${pt.civilHour}`}
                className={`h-full w-[1px] transition-colors duration-150 ${
                  isTarget ? 'bg-amber-400/25' : pt.civilHour % 6 === 0 ? 'bg-white/10' : 'bg-white/[0.02]'
                }`}
                style={{
                  position: 'absolute',
                  left: `${(idx / (totalPoints - 1)) * 100}%`
                }}
              />
            );
          })}
        </div>

        {/* SVG Drawing of the altitude curve and current point */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="altitudeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#312e81" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="altitudeLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Area under the altitude line */}
          {areaPath && (
            <path d={areaPath} fill="url(#altitudeAreaGrad)" />
          )}

          {/* The altitude curve path */}
          {linePath && (
            <path d={linePath} fill="none" stroke="url(#altitudeLineGrad)" strokeWidth="2" strokeLinecap="round" />
          )}

          {/* Active Hover point line and indicator */}
          {hoveredIndex !== null && activePoint && (
            <g transform={`translate(${getX(hoveredIndex)}, ${getY(activeAltitude)})`}>
              <line 
                x1="0" 
                y1={-getY(activeAltitude) + paddingY} 
                x2="0" 
                y2={height - paddingY - getY(activeAltitude)} 
                stroke="rgba(251, 191, 36, 0.4)" 
                strokeWidth="1" 
                strokeDasharray="2,2" 
              />
              <circle r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
            </g>
          )}

          {/* Real-time pulsing marker for Current Moment (Only if not hovering) */}
          {hoveredIndex === null && (
            <g transform={`translate(${getX(currentIndex)}, ${getY(currentAltitude)})`}>
              <circle r="7" fill="#fbbf24" className="animate-ping opacity-60" />
              <circle r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* Row of each civil hour representing ticks */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[7px] font-mono text-white/30 px-1 border-t border-white/5 pt-2 select-none overflow-x-auto no-scrollbar">
          {history.map((pt, idx) => {
            // Do not render the duplicate midnight of next day
            if (idx === totalPoints - 1) return null;

            const isCurrent = idx === Math.floor(currentIndex);
            const isHovered = idx === hoveredIndex;
            const isImportantMarker = pt.civilHour % 3 === 0;

            return (
              <button
                key={`hour-btn-${idx}-${pt.civilHour}`}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex flex-col items-center transition-all duration-150 shrink-0 ${
                  isHovered || isCurrent 
                    ? 'text-amber-400 font-extrabold scale-110' 
                    : isImportantMarker 
                      ? 'text-white/60 font-semibold' 
                      : 'text-white/20 hover:text-white/40'
                }`}
                style={{ width: `${100 / civilHoursCount}%` }}
                title={`${pt.label} ${pt.isDST ? '(DST)' : ''}`}
              >
                <span>{String(pt.civilHour).padStart(2, '0')}</span>
                <span className={`w-1 h-1 rounded-full mt-0.5 ${
                  isHovered || isCurrent 
                    ? 'bg-amber-400' 
                    : isImportantMarker 
                      ? 'bg-white/20' 
                      : 'bg-transparent'
                }`} />
              </button>
            );
          })}
        </div>
        
        {/* Helper guide legend text */}
        <div className="flex items-center gap-1 px-1 text-[7px] text-white/30 leading-relaxed">
          <Info className="w-2.5 h-2.5 text-amber-500/40 shrink-0" />
          <p>
            {isPt 
              ? 'Passe o mouse (ou toque) em cada hora de fuso para simular a elevação do Sol na respectiva hora civil.'
              : 'Hover (or tap) over any specific hour to preview the Sun\'s altitude at that standard civil hour.'}
            {isShortDay && (
              <span className="text-amber-400 ml-1 font-semibold block sm:inline">
                {isPt 
                  ? '* Uma hora civil foi saltada devido ao início do Horário de Verão.'
                  : '* One civil hour was skipped due to Daylight Saving Time onset.'}
              </span>
            )}
            {isLongDay && (
              <span className="text-amber-400 ml-1 font-semibold block sm:inline">
                {isPt 
                  ? '* Uma hora civil foi repetida devido ao término do Horário de Verão.'
                  : '* One civil hour was repeated due to Daylight Saving Time ending.'}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
