import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useAnimation } from 'motion/react';
import { Gear } from './Gear';
import { getSeasonInfo } from '../lib/solarTime';

interface AnalogClockProps {
  time: Date;
  label: string;
  useUTC?: boolean;
  sizeClass?: string;
  is24hFormat?: boolean;
  themeName?: string;
  isSolarNoon?: boolean;
  isPaused?: boolean;
  isWarpActive?: boolean;
  warpSpeed?: number;
  warpUnit?: string;
  latitude?: number;
  language?: string;
  equationOfTime?: number;
  isOptimizationMode?: boolean;
  isBestPerformanceMode?: boolean;
  axialTilt?: number;
}

export const AnalogClock: React.FC<AnalogClockProps> = ({ 
  time, 
  label, 
  useUTC = false, 
  sizeClass, 
  is24hFormat = true, 
  themeName, 
  isSolarNoon = false,
  isPaused = false,
  isWarpActive = false,
  warpSpeed = 1,
  warpUnit = 's',
  latitude,
  language = 'pt',
  equationOfTime,
  isOptimizationMode = false,
  isBestPerformanceMode = false,
  axialTilt
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
  }, [time, isWarpActive, isPaused, warpSpeed, warpUnit]);

  const lastDegreesRef = useRef(0);
  const accumDegreesRef = useRef(0);
  const isFirstRun = useRef(true);
  const prevIs24hRef = useRef(is24hFormat);
  const prevMsRef = useRef<number | null>(null);

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
      
      const preciseDate = new Date(currentMs);
      const isInvalid = isNaN(preciseDate.getTime());
      
      const ms = isInvalid ? 0 : (useUTC ? preciseDate.getUTCMilliseconds() : preciseDate.getMilliseconds());
      const seconds = isInvalid ? 0 : ((useUTC ? preciseDate.getUTCSeconds() : preciseDate.getSeconds()) + ms / 1000);
      const minutes = isInvalid ? 0 : ((useUTC ? preciseDate.getUTCMinutes() : preciseDate.getMinutes()) + seconds / 60);
      const hours = isInvalid ? 0 : ((useUTC ? preciseDate.getUTCHours() : preciseDate.getHours()) + minutes / 60);

      const targetDegrees = is24hFormat ? (hours / 24) * 360 : ((hours % 12) / 12) * 360;
      
      const formatChanged = prevIs24hRef.current !== is24hFormat;
      const timeJumped = prevMsRef.current !== null && Math.abs(currentMs - prevMsRef.current) > 5000;

      if (isFirstRun.current || formatChanged || timeJumped) {
        lastDegreesRef.current = targetDegrees;
        accumDegreesRef.current = targetDegrees;
        isFirstRun.current = false;
        prevIs24hRef.current = is24hFormat;
      } else {
        let diff = targetDegrees - (lastDegreesRef.current % 360);
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        accumDegreesRef.current += diff;
        lastDegreesRef.current = targetDegrees;
      }
      
      prevMsRef.current = currentMs;

      if (hourHandRef.current) {
        hourHandRef.current.style.transform = `rotate(${accumDegreesRef.current}deg)`;
      }
      
      animId = requestAnimationFrame(update);
    };
    
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [useUTC, is24hFormat, isPaused, isWarpActive, warpSpeed, warpUnit]);

  const controls = useAnimation();
  const lastTimeRef = useRef(time);

  useEffect(() => {
    const diff = Math.abs(time.getTime() - lastTimeRef.current.getTime());
    // Check if the jump is roughly 1 hour (DST).
    // Using a range for tolerance.
    if (diff > 3500000 && diff < 3700000) {
      controls.start({
        scale: [1, 1.05, 1],
        opacity: [1, 0.5, 1],
        transition: { duration: 0.8, ease: "easeInOut" }
      });
    }
    lastTimeRef.current = time;
  }, [time, controls]);

  interface SeasonParticle {
    id: number;
    angle: number;
    color: string;
    size: number;
    speed: number;
  }

  const [particles, setParticles] = useState<SeasonParticle[]>([]);
  const lastSeasonRef = useRef<string | null>(null);

  const effectiveLat = latitude || 40.0;
  const seasonInfo = useMemo(() => {
    try {
      return getSeasonInfo(time, effectiveLat, 0, axialTilt);
    } catch (e) {
      return null;
    }
  }, [time, effectiveLat, axialTilt]);

  const currentSeason = seasonInfo?.season || null;

  const safeEquationOfTime = (typeof equationOfTime === 'number' && !isNaN(equationOfTime)) ? equationOfTime : 0;

  useEffect(() => {
    if (isOptimizationMode || isBestPerformanceMode) {
      if (particles.length > 0) setParticles([]);
      return;
    }
    if (currentSeason) {
      if (lastSeasonRef.current && lastSeasonRef.current !== currentSeason) {
        // Season transition occurred!
        const colors = {
          summer: ['#fbbf24', '#fb923c', '#f59e0b', '#facc15'],
          winter: ['#22d3ee', '#38bdf8', '#60a5fa', '#a5f3fc'],
          spring: ['#34d399', '#10b981', '#6ee7b7', '#059669'],
          autumn: ['#f97316', '#ea580c', '#fb923c', '#b45309'],
        };
        const activeColors = colors[currentSeason as keyof typeof colors] || ['#fbbf24', '#38bdf8', '#34d399', '#f97316'];
        
        const newParticles = Array.from({ length: 24 }).map((_, i) => ({
          id: Date.now() + i + Math.random(),
          angle: Math.random() * 360,
          color: activeColors[Math.floor(Math.random() * activeColors.length)],
          size: Math.random() * 4 + 3, // 3px to 7px
          speed: Math.random() * 30 + 15,
        }));
        setParticles(newParticles);

        const timer = setTimeout(() => {
          setParticles([]);
        }, 3000);
        return () => clearTimeout(timer);
      }
      lastSeasonRef.current = currentSeason;
    }
  }, [currentSeason, isOptimizationMode, isBestPerformanceMode]);

  return (
    <motion.div animate={controls} className="flex flex-col items-center gap-3 relative">
      {themeName === "Anos 1910" && (
        <>
          <Gear size={30} className="absolute -top-4 -left-4 text-amber-600" animated={!isOptimizationMode} />
          <Gear size={40} className="absolute -bottom-6 -right-6 text-amber-800" animated={!isOptimizationMode} />
        </>
      )}
      <motion.div 
        className={`relative ${sizeClass || 'w-56 h-56 md:w-80 lg:w-[320px] md:h-80 lg:h-[320px]'} rounded-full border border-white/15 shadow-2xl flex items-center justify-center overflow-hidden`} 
        style={{ background: is24hFormat ? 'linear-gradient(to bottom, #1e40af 50%, #facc15 50%)' : undefined }}
        animate={isSolarNoon && !isOptimizationMode ? { boxShadow: ["0 0 0px #fbbf24", "0 0 20px #fbbf24", "0 0 0px #fbbf24"] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {/* Seasonal Transition Particle Border Overlay */}
        <div className="absolute inset-[-12px] pointer-events-none rounded-full overflow-visible z-30">
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const xStart = 50 + 50 * Math.cos(rad);
            const yStart = 50 + 50 * Math.sin(rad);
            
            const travelDist = 50 + 12 + Math.random() * 8;
            const finalAngleRad = rad + (p.speed * 0.05 * (Math.PI / 180));
            const xEnd = 50 + travelDist * Math.cos(finalAngleRad);
            const yEnd = 50 + travelDist * Math.sin(finalAngleRad);

            return (
              <motion.div
                key={p.id}
                className="absolute rounded-full pointer-events-none shadow-[0_0_6px_currentColor]"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  color: p.color,
                }}
                initial={{
                  left: `${xStart}%`,
                  top: `${yStart}%`,
                  opacity: 0,
                  scale: 0.1,
                }}
                animate={{
                  left: `${xEnd}%`,
                  top: `${yEnd}%`,
                  opacity: [0, 1, 1, 0],
                  scale: [0.1, 1.4, 0.8, 0],
                }}
                transition={{
                  duration: Math.random() * 1.5 + 1.2,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </div>

        {/* PM/AM and DIA/NOITE Labels for 24h clock */}
        {is24hFormat && (
          <>
            <div className="absolute left-6 text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">PM</div>
            <div className="absolute right-6 text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">AM</div>
            {/* Top (0 deg) - NOITE */}
            <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 text-[9px] md:text-[10px] font-extrabold text-white tracking-widest font-sans bg-black/40 px-2 py-0.5 rounded shadow-sm backdrop-blur-[2px]">
              NOITE
            </div>
            {/* Bottom (180 deg) - DIA */}
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 text-[9px] md:text-[10px] font-extrabold text-blue-950 tracking-widest font-sans bg-white/70 px-2 py-0.5 rounded shadow-sm backdrop-blur-[2px]">
              DIA
            </div>
          </>
        )}
        {/* Inner Ring */}
        <div className="absolute inset-4 rounded-full border-2 border-white/5" />
        
        {/* Clock Face Ticks - 24-hour clock face with 30-min marks (48 total) */}
        {[...Array(48)].map((_, i) => (
          <div
            key={`clock-tick-${i}`}
            className="absolute bg-white/20"
            style={{
              transform: `rotate(${i * 7.5}deg) translateY(-44%)`,
              height: i % 2 === 0 ? '8%' : '3%',
              width: i % 2 === 0 ? '2px' : '1px',
              opacity: i % 2 === 0 ? 0.6 : 0.2
            }}
          />
        ))}

        {/* Equation of Time Sub-dial */}
        {equationOfTime !== undefined && (
          <div 
            className="absolute bottom-[24%] left-1/2 -translate-x-1/2 z-10 w-16 h-16 md:w-20 md:h-20 rounded-full border border-white/20 bg-black/20 backdrop-blur-[1px] flex items-center justify-center shadow-inner overflow-hidden"
          >
            {/* Ticks: -20 to +20, every 5 minutes */}
            {[-20, -15, -10, -5, 0, 5, 10, 15, 20].map((val) => {
              const angle = (val / 20) * 150;
              const isMajor = val % 10 === 0;
              return (
                <div
                  key={`eq-tick-${val}`}
                  className="absolute inset-0 flex justify-center items-start pointer-events-none"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className={`w-[1px] ${isMajor ? 'h-1.5 bg-white/50' : 'h-0.5 bg-white/35'}`} />
                </div>
              );
            })}

            {/* Labels */}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[6px] md:text-[7px] font-bold text-white/80 font-mono select-none">0</div>
            <div className="absolute bottom-1 left-1.5 text-[6px] md:text-[7px] font-bold text-white/70 font-mono select-none">-20</div>
            <div className="absolute bottom-1 right-1.5 text-[6px] md:text-[7px] font-bold text-white/70 font-mono select-none">+20</div>
            
            {/* Legend / Title */}
            <div className="absolute bottom-4.5 left-1/2 -translate-x-1/2 text-[5px] md:text-[6px] tracking-widest text-amber-300 font-mono font-bold uppercase select-none whitespace-nowrap">
              {language === 'pt' ? 'EQ. TEMPO' : 'EQ. TIME'}
            </div>

            {/* Slow/Fast indicators */}
            <div className="absolute top-[52%] left-1.5 text-[4px] md:text-[5px] text-white/45 font-bold uppercase tracking-wider font-sans whitespace-nowrap select-none">
              {language === 'pt' ? 'ATRASO' : 'SLOW'}
            </div>
            <div className="absolute top-[52%] right-1.5 text-[4px] md:text-[5px] text-white/45 font-bold uppercase tracking-wider font-sans whitespace-nowrap select-none">
              {language === 'pt' ? 'ADIANT.' : 'FAST'}
            </div>

            {/* Pointer (Hand) */}
            <div 
              className="absolute w-0.5 h-[34%] bg-amber-400 origin-bottom rounded-full shadow-md z-10"
              style={{ 
                bottom: '50%',
                transform: `rotate(${Math.max(-150, Math.min(150, (safeEquationOfTime / 20) * 150))}deg)`,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />

            {/* Center Pivot */}
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white border border-black/40 z-20 shadow-sm" />
          </div>
        )}

         {/* Hour Hand */}
        <div
           ref={hourHandRef}
           className="absolute w-1 h-[40%] bg-amber-400 rounded-full origin-bottom shadow-lg"
           style={{ 
             bottom: '50%'
           }}
         />
 
        {/* Center Dot */}
        <div className="w-3 h-3 bg-white rounded-full z-20 shadow-xl border-2 border-black" />
      </motion.div>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-black">{label}</span>
    </motion.div>
  );
};
