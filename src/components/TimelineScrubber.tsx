import React, { useRef, useMemo, useCallback } from 'react';
import { calculateSolarTime } from '../lib/solarTime';

interface TimelineScrubberProps {
  simulationDate: number;
  setSimulationDate: (date: number) => void;
  language: 'pt' | 'en';
  latitude: number;
  longitude: number;
  seasonalPeriods: { id: string; startTime?: string; endTime?: string; }[];
  axialTilt?: number;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = React.memo(({ 
  simulationDate, 
  setSimulationDate, 
  language, 
  latitude, 
  longitude, 
  seasonalPeriods,
  axialTilt
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const year = new Date(simulationDate).getFullYear();
  const startOfYear = useMemo(() => new Date(year, 0, 1).getTime(), [year]);
  const endOfYear = useMemo(() => new Date(year, 11, 31, 23, 59, 59).getTime(), [year]);
  const yearDuration = Math.max(1, endOfYear - startOfYear);
  
  // Sample every 7 days instead of every single day to compute in < 1ms
  const heatmapColors = useMemo(() => {
    const colors = [];
    const step = 7;
    for (let i = 0; i < 365; i += step) {
      const date = new Date(startOfYear + i * 24 * 60 * 60 * 1000);
      const solar = calculateSolarTime(date, longitude, latitude, undefined, axialTilt);
      const duration = solar.sunlightDurationSeconds / (24 * 3600); // 0 to 1
      const hue = 40 + duration * 60;
      colors.push(`hsl(${hue}, 80%, ${30 + duration * 40}%)`);
    }
    return colors.join(', ');
  }, [startOfYear, latitude, longitude]);
  
  const percentage = Math.max(0, Math.min(100, ((simulationDate - startOfYear) / yearDuration) * 100));

  const handleDrag = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const p = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSimulationDate(startOfYear + (p / 100) * yearDuration);
  }, [startOfYear, yearDuration, setSimulationDate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDrag(e.clientX);
    const onMove = (moveEvt: MouseEvent) => handleDrag(moveEvt.clientX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDrag(e.touches[0].clientX);
    }
  };

  const transitions = useMemo(() => [
    { name: language === 'pt' ? 'Equinócio' : 'Equinox', date: new Date(year, 2, 20).getTime() },
    { name: language === 'pt' ? 'Solstício' : 'Solstice', date: new Date(year, 5, 21).getTime() },
    { name: language === 'pt' ? 'Equinócio' : 'Equinox', date: new Date(year, 8, 23).getTime() },
    { name: language === 'pt' ? 'Solstício' : 'Solstice', date: new Date(year, 11, 21).getTime() },
  ], [year, language]);

  return (
    <div className="bg-black/60 border border-white/10 rounded-lg p-3 my-2">
      <div className="flex justify-between text-[10px] text-white/60 mb-2 font-mono">
        <span>{new Date(startOfYear).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <span className="font-bold text-amber-400">{new Date(simulationDate).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <span>{new Date(endOfYear).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>
      <div 
        ref={containerRef}
        className="h-5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ background: `linear-gradient(to right, ${heatmapColors})` }}
      >
        <div 
          className="absolute top-0 bottom-0 bg-amber-400/50 border-r-2 border-amber-300 pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
        {transitions.map((t, i) => (
          <div 
            key={`transition-marker-${t.name}-${t.date}-${i}`}
            className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none"
            style={{ left: `${((t.date - startOfYear) / yearDuration) * 100}%` }}
          >
            <span className="absolute -top-3.5 -left-3 text-[7px] text-white/70 whitespace-nowrap">
              {t.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
