import React, { useEffect, useRef } from 'react';

interface Analog12hClockProps {
  time: Date;
  useUTC?: boolean;
  label: string;
  isPaused?: boolean;
  isWarpActive?: boolean;
  warpSpeed?: number;
  warpUnit?: string;
  isOptimizationMode?: boolean;
  isBestPerformanceMode?: boolean;
}

export const Analog12hClock: React.FC<Analog12hClockProps> = ({ 
  time, 
  useUTC = true, 
  label,
  isPaused = false,
  isWarpActive = false,
  warpSpeed = 1,
  warpUnit = 's',
  isOptimizationMode = false,
  isBestPerformanceMode = false
}) => {
  const hourHandRef = useRef<HTMLDivElement>(null);
  const minuteHandRef = useRef<HTMLDivElement>(null);
  const secondHandRef = useRef<HTMLDivElement>(null);

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

      const totalSeconds = localMs / 1000;
      const totalMinutes = localMs / 60000;
      const totalHours = localMs / 3600000;

      const hourDegrees = ((totalHours % 12) / 12) * 360;
      const minuteDegrees = ((totalMinutes % 60) / 60) * 360;
      const secondDegrees = ((totalSeconds % 60) / 60) * 360;

      if (hourHandRef.current) {
        hourHandRef.current.style.transform = `rotate(${hourDegrees}deg)`;
      }
      if (minuteHandRef.current) {
        minuteHandRef.current.style.transform = `rotate(${minuteDegrees}deg)`;
      }
      if (secondHandRef.current) {
        secondHandRef.current.style.transform = `rotate(${secondDegrees}deg)`;
      }
      
      animId = requestAnimationFrame(update);
    };
    
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [useUTC, isPaused, isWarpActive, warpSpeed, warpUnit]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-black/40">
        
        {/* Ticks */}
        {[...Array(60)].map((_, i) => (
          <div
            key={`tick12h-${i}`}
            className="absolute w-full h-full flex justify-center items-start"
            style={{ transform: `rotate(${i * 6}deg)` }}
          >
            <div
              className={`${
                i % 5 === 0 
                  ? 'w-0.5 h-2 bg-white' 
                  : 'w-[1px] h-1 bg-white/50'
              }`}
            />
          </div>
        ))}

        {/* Hour Hand */}
        <div
          ref={hourHandRef}
          className="absolute w-1 h-[25%] bg-white rounded-full origin-bottom shadow-lg"
          style={{ bottom: '50%' }}
        />
        
        {/* Minute Hand */}
        <div
          ref={minuteHandRef}
          className="absolute w-0.5 h-[35%] bg-white rounded-full origin-bottom shadow-lg"
          style={{ bottom: '50%' }}
        />
        
        {/* Second Hand */}
        <div
          ref={secondHandRef}
          className="absolute w-0.5 h-[40%] bg-red-500 rounded-full origin-bottom shadow-lg"
          style={{ bottom: '50%' }}
        />

        {/* Center Dot */}
        <div className="w-2 h-2 bg-white rounded-full z-20" />
      </div>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">{label}</span>
    </div>
  );
};
