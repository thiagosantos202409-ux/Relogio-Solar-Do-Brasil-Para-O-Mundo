import React, { useEffect, useRef } from 'react';

interface CivilWallClockProps {
  time: Date;
  useUTC?: boolean;
  label: string;
  isPaused?: boolean;
  isWarpActive?: boolean;
  warpSpeed?: number;
  warpUnit?: string;
}

export const CivilWallClock: React.FC<CivilWallClockProps> = ({ 
  time, 
  useUTC = true, 
  label,
  isPaused = false,
  isWarpActive = false,
  warpSpeed = 1,
  warpUnit = 's'
}) => {
  const hourHandRef = useRef<HTMLDivElement>(null);

  const timeRef = useRef(time);
  const lastTimePropUpdateRef = useRef(performance.now());
  const warpStartMsRef = useRef(0);
  const warpStartRealTimeRef = useRef(0);

  useEffect(() => {
    timeRef.current = time;
    lastTimePropUpdateRef.current = performance.now();
    if (isWarpActive && !isPaused) {
      warpStartMsRef.current = timeRef.current.getTime();
      warpStartRealTimeRef.current = performance.now();
    }
  }, [time, isWarpActive, isPaused]);

  useEffect(() => {
    let animId: number;
    
    const update = () => {
      let currentMs = timeRef.current.getTime();
      
      if (isWarpActive && !isPaused) {
        const now = performance.now();
        const elapsed = now - warpStartRealTimeRef.current;
        let multiplier = 1;
        switch (warpUnit) {
          case 's': multiplier = 1000; break;
          case 'min': multiplier = 60000; break;
          case 'h': multiplier = 3600000; break;
          case 'ms': multiplier = 1; break;
          case 'us': multiplier = 0.001; break;
        }
        currentMs = warpStartMsRef.current + (elapsed * warpSpeed * multiplier);
      }
      
      const isInvalid = isNaN(currentMs);
      const totalMs = isInvalid ? 0 : currentMs;
      const localMs = totalMs;
      const totalHours = localMs / 3600000;

      // 24-hour dial: 00:00 at top
      const hourDegrees = (totalHours / 24) * 360;

      if (hourHandRef.current) {
        hourHandRef.current.style.transform = `rotate(${hourDegrees}deg)`;
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [useUTC, isPaused, isWarpActive, warpSpeed, warpUnit]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-black/40">
        {/* Cardinal Markers */}
        <div className="absolute top-1 text-[8px] font-mono text-white/60">00</div>
        <div className="absolute bottom-1 text-[8px] font-mono text-white/60">12</div>
        <div className="absolute left-1 text-[8px] font-mono text-white/60">18</div>
        <div className="absolute right-1 text-[8px] font-mono text-white/60">06</div>

        {/* Hour Hand */}
        <div
          ref={hourHandRef}
          className="absolute w-1 h-[40%] bg-white rounded-full origin-bottom shadow-lg"
          style={{ bottom: '50%' }}
        />
        
        {/* Center Dot */}
        <div className="w-2 h-2 bg-white rounded-full z-20" />
      </div>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">{label}</span>
    </div>
  );
};
