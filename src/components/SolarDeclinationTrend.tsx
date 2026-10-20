import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Globe, ArrowUpRight, ArrowDownRight, Compass, Sun, Info, Sparkles } from 'lucide-react';
import { calculateSolarTime } from '../lib/solarTime';

interface SolarDeclinationTrendProps {
  nowMs: number;
  latitude: number;
  longitude: number;
  language: 'pt' | 'en' | string;
  axialTilt?: number;
}

export const SolarDeclinationTrend: React.FC<SolarDeclinationTrendProps> = React.memo(({
  nowMs,
  latitude,
  longitude,
  language,
  axialTilt
}) => {
  const [viewMode, setViewMode] = useState<'season' | 'year'>('season');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Formatting helpers
  const formatDeclination = (lat: number): string => {
    const absLat = Math.abs(lat);
    if (absLat < 0.005 || Object.is(lat, 0) || Object.is(lat, -0)) return '0.00° (Equador / Equator)';
    const dir = lat > 0 ? 'N' : 'S';
    return `${absLat.toFixed(2)}° ${dir}`;
  };

  const trendData = useMemo(() => {
    const points = [];
    const oneDayMs = 24 * 60 * 60 * 1000;
    const isYearMode = viewMode === 'year';
    
    // We use 12 points to map a beautiful smooth curve
    // For 'season', we space them by 7 days (weeks) centered around today (today at index 6)
    // For 'year', we space them by 30 days (months) centered around today (today at index 6)
    const totalPoints = 12;
    const stepDays = isYearMode ? 30 : 7;

    for (let i = 0; i < totalPoints; i++) {
      const offsetDays = (i - 6) * stepDays;
      const targetTimeMs = nowMs + offsetDays * oneDayMs;
      const targetDate = new Date(targetTimeMs);
      
      // Calculate solar parameters at noon for stability
      const solarNoonDate = new Date(targetDate);
      solarNoonDate.setHours(12, 0, 0, 0);

      const solar = calculateSolarTime(solarNoonDate, longitude, latitude, undefined, axialTilt);
      
      // Localized labels with explicit UTC timezone
      const label = isYearMode
        ? targetDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', month: 'short', year: '2-digit' })
        : targetDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: 'numeric', month: 'short' });
      
      const labelShort = isYearMode
        ? targetDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', month: 'short' })
        : targetDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', weekday: 'short' });

      points.push({
        index: i,
        date: targetDate,
        declination: solar.declination,
        label,
        labelShort,
        isToday: i === 6
      });
    }

    const todayPoint = points[6];
    const firstPoint = points[0];
    const difference = todayPoint.declination - firstPoint.declination;
    const direction = difference >= 0 ? 'north' : 'south';

    return {
      points,
      difference,
      direction,
      first: firstPoint.declination,
      last: todayPoint.declination
    };
  }, [nowMs, latitude, longitude, language, viewMode]);

  const { points, difference, direction, last } = trendData;

  // Chart layout dimensions
  const width = 230;
  const height = 90;
  const paddingX = 16;
  const paddingY = 16;

  // Map declination values to Y coordinates
  // Range is dynamic representing current planetary axial tilt (default 23.44)
  const maxTilt = axialTilt !== undefined ? axialTilt : 23.44;
  const pointsWithCoords = useMemo(() => {
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;
    const stepX = chartW / (points.length - 1);

    return points.map((p, idx) => {
      const x = paddingX + idx * stepX;
      // y=0 in SVG is top. So +23.44 (North) is at top (paddingY), -23.44 (South) is at bottom (height - paddingY)
      // Normalize declination to [0, 1] range: 1 is +23.44, 0 is -23.44
      const normalized = (p.declination - (-maxTilt)) / (maxTilt * 2);
      // Clamp to ensure it stays in bounds
      const clamped = Math.max(0, Math.min(1, normalized));
      // Invert since y-axis points downwards in SVG
      const y = height - paddingY - clamped * chartH;

      return {
        ...p,
        x,
        y
      };
    });
  }, [points, width, height]);

  // SVG Path generator
  const linePath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    return pointsWithCoords.reduce((path, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');
  }, [pointsWithCoords]);

  // SVG Area Path generator (for filled gradient under the line)
  const areaPath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    const firstPoint = pointsWithCoords[0];
    const lastPoint = pointsWithCoords[pointsWithCoords.length - 1];
    const bottomY = height - paddingY; // bottom line of the chart bounding box

    return `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
  }, [pointsWithCoords, linePath, height]);

  // Y coordinate of the equator (0°)
  const equatorY = useMemo(() => {
    const chartH = height - paddingY * 2;
    const normalized = (0 - (-maxTilt)) / (maxTilt * 2);
    return height - paddingY - normalized * chartH;
  }, [height]);

  const activePoint = hoveredIndex !== null ? pointsWithCoords[hoveredIndex] : pointsWithCoords[6];

  return (
    <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col gap-2 mt-2 select-none shadow-lg">
      {/* Header with Visual Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
          <Compass className="w-2.5 h-2.5 animate-pulse text-amber-400" />
          {language === 'pt' ? 'Tendência de Declinação' : 'Declination Trend'}
        </span>
        
        {/* Visual Toggle between Season and Year */}
        <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-lg select-none">
          <button
            onClick={() => setViewMode('season')}
            className={`relative px-1.5 py-0.5 rounded-md text-[6px] font-bold uppercase transition-colors tracking-wider ${
              viewMode === 'season' ? 'text-black font-extrabold' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {viewMode === 'season' && (
              <motion.div
                layoutId="declinationActiveTab"
                className="absolute inset-0 bg-amber-400 rounded-md"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{ zIndex: 0 }}
              />
            )}
            <span className="relative z-10">{language === 'pt' ? 'Estação' : 'Season'}</span>
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`relative px-1.5 py-0.5 rounded-md text-[6px] font-bold uppercase transition-colors tracking-wider ${
              viewMode === 'year' ? 'text-black font-extrabold' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {viewMode === 'year' && (
              <motion.div
                layoutId="declinationActiveTab"
                className="absolute inset-0 bg-amber-400 rounded-md"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{ zIndex: 0 }}
              />
            )}
            <span className="relative z-10">{language === 'pt' ? 'Ano' : 'Year'}</span>
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="flex justify-between items-end mt-0.5">
        <div className="flex flex-col">
          <span className="text-[6px] opacity-40 uppercase tracking-wider">
            {language === 'pt' ? 'Declinação Atual' : 'Current Declination'}
          </span>
          <span className="text-sm font-semibold font-sans text-white tracking-tight flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" style={{ animationDuration: '30s' }} />
            {formatDeclination(last)}
          </span>
        </div>

        {/* Direction Badge */}
        <div className="flex flex-col items-end">
          <span className="text-[6px] opacity-40 uppercase tracking-wider mb-0.5">
            {viewMode === 'year' 
              ? (language === 'pt' ? 'Variação Semestral' : '6-Month Drift')
              : (language === 'pt' ? 'Variação Sazonal' : '6-Week Drift')}
          </span>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${
            direction === 'north' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {direction === 'north' ? (
              <>
                <ArrowUpRight className="w-2.5 h-2.5" />
                <span>{language === 'pt' ? 'Rumo ao Norte' : 'Drifting North'}</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-2.5 h-2.5" />
                <span>{language === 'pt' ? 'Rumo ao Sul' : 'Drifting South'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive SVG Sparkline */}
      <div className="relative mt-1 bg-black/30 rounded-xl border border-white/5 p-1 flex justify-center">
        <svg 
          width={width} 
          height={height}
          className="overflow-visible cursor-pointer"
          onMouseLeave={() => setHoveredIndex(null)}
          onTouchEnd={() => setHoveredIndex(null)}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Equator line (0°) */}
          <line 
            x1={paddingX} 
            y1={equatorY} 
            x2={width - paddingX} 
            y2={equatorY} 
            stroke="rgba(255,255,255,0.06)" 
            strokeDasharray="2,3" 
            strokeWidth={1}
          />
          {/* Equator label */}
          <text 
            x={paddingX + 4} 
            y={equatorY - 3} 
            fill="rgba(255,255,255,0.2)" 
            fontSize={5.5} 
            fontWeight="bold" 
            fontFamily="monospace"
            className="uppercase"
          >
            {language === 'pt' ? 'Equador (0°)' : 'Equator (0°)'}
          </text>

          {/* Tropics boundary lines */}
          <line 
            x1={paddingX} 
            y1={paddingY} 
            x2={width - paddingX} 
            y2={paddingY} 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth={0.5}
          />
          <line 
            x1={paddingX} 
            y1={height - paddingY} 
            x2={width - paddingX} 
            y2={height - paddingY} 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth={0.5}
          />

          {/* Sparkline Area Fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Sparkline Main Path */}
          <motion.path 
            key={viewMode} // Re-animate on toggle!
            d={linePath} 
            fill="none" 
            stroke="url(#lineGradient)" 
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Interactive vertical hover helper line */}
          {hoveredIndex !== null && (
            <line 
              x1={activePoint.x} 
              y1={paddingY} 
              x2={activePoint.x} 
              y2={height - paddingY} 
              stroke="rgba(251,191,36,0.3)" 
              strokeWidth={1} 
              strokeDasharray="1,1"
            />
          )}

          {/* Dots at data points */}
          {pointsWithCoords.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            const isToday = idx === 6;
            
            return (
              <g key={`decl-pt-${idx}-${p.x.toFixed(1)}-${p.y.toFixed(1)}`}>
                {/* Large transparent hover area */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={12}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseMove={() => setHoveredIndex(idx)}
                  onTouchStart={() => setHoveredIndex(idx)}
                  onTouchMove={() => setHoveredIndex(idx)}
                />
                
                {/* Ping ring for Today */}
                {isToday && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={0.5}
                    className="animate-ping"
                    style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDuration: '3s' }}
                  />
                )}

                {/* Main point indicator */}
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isHovered ? 3.5 : isToday ? 2.5 : 1.5} 
                  fill={isHovered ? '#fbbf24' : isToday ? '#fbbf24' : '#d97706'} 
                  stroke={isHovered ? 'rgba(0,0,0,0.8)' : 'none'}
                  strokeWidth={isHovered ? 1 : 0}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Small tooltip indicating hovered/active value */}
        <div className="absolute top-1 right-2 pointer-events-none flex flex-col items-end">
          <span className="text-[5.5px] font-mono text-white/30 uppercase tracking-wider">
            {hoveredIndex !== null 
              ? (language === 'pt' ? 'Ponto Selecionado' : 'Selected Point') 
              : (language === 'pt' ? 'Foco da Tendência' : 'Trend Focus')}
          </span>
          <span className="text-[7.5px] font-mono font-bold text-amber-400">
            {hoveredIndex !== null 
              ? `${activePoint.labelShort} (${activePoint.label})` 
              : (viewMode === 'year' 
                  ? (language === 'pt' ? 'Visão Anual' : 'Year Overview') 
                  : (language === 'pt' ? 'Visão Sazonal' : 'Season Overview'))
            }: {formatDeclination(activePoint.declination)}
          </span>
        </div>
      </div>

      {/* Dynamic Descriptive explanation of seasonal shift */}
      <div className="text-[7px] text-white/40 leading-relaxed bg-white/[0.01] rounded-lg p-1.5 border border-white/[0.03]">
        <div className="flex items-start gap-1">
          <Info className="w-3 h-3 text-amber-400/50 shrink-0 mt-0.5" />
          <p>
            {language === 'pt' ? (
              <>
                A declinação solar mudou <span className="text-amber-400 font-semibold">{Math.abs(difference).toFixed(3)}°</span> {viewMode === 'year' ? 'nos últimos 6 meses' : 'nas últimas 6 semanas'}. 
                {direction === 'north' 
                  ? ' O subponto solar está se movendo para o norte, aumentando a duração do dia no Hemisfério Norte e reduzindo no Sul.' 
                  : ' O subponto solar está se movendo para o sul, aumentando a duração do dia no Hemisfério Sul e reduzindo no Norte.'}
              </>
            ) : (
              <>
                Solar declination shifted <span className="text-amber-400 font-semibold">{Math.abs(difference).toFixed(3)}°</span> {viewMode === 'year' ? 'over the last 6 months' : 'over the last 6 weeks'}.
                {direction === 'north'
                  ? ' The solar subpoint is moving northwards, increasing day length in the Northern Hemisphere and decreasing it in the Southern.'
                  : ' The solar subpoint is moving southwards, increasing day length in the Southern Hemisphere and decreasing it in the Northern.'}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
});
