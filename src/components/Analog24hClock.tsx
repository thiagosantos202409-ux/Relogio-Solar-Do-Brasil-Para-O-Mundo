import React, { useEffect, useRef } from 'react';
import utcDial from '../assets/images/utc_map_dial_1782269932091.jpg';

interface Analog24hClockProps {
  time: Date;
  sizeClass?: string;
  eot?: number; // Equation of time in minutes
  isPaused?: boolean;
  isWarpActive?: boolean;
  warpSpeed?: number;
  warpUnit?: string;
  latitude?: number;
  language?: string;
}

export const Analog24hClock: React.FC<Analog24hClockProps> = ({ 
  time, 
  sizeClass, 
  eot = 0,
  isPaused = false,
  isWarpActive = false,
  warpSpeed = 1,
  warpUnit = 's',
  latitude,
  language = 'pt'
}) => {
  const hand1Ref = useRef<HTMLDivElement>(null);
  const hand2Ref = useRef<HTMLDivElement>(null);
  const hand3Ref = useRef<HTMLDivElement>(null);
  const hand4Ref = useRef<HTMLDivElement>(null);

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
      
      const preciseDate = new Date(currentMs);
      const isInvalid = isNaN(currentMs);
      const hours = isInvalid ? 0 : (preciseDate.getUTCHours() + preciseDate.getUTCMinutes() / 60 + preciseDate.getUTCSeconds() / 3600);
      
      const days = Math.floor(currentMs / (24 * 3600000));
      const eotRotation = (eot / 1440) * 360;
      const currentRotation = ((hours / 24) * 360) + (days * 360) + eotRotation;

      if (hand1Ref.current) {
        hand1Ref.current.style.transform = `rotate(${currentRotation}deg)`;
      }
      if (hand2Ref.current) {
        hand2Ref.current.style.transform = `rotate(${currentRotation + 180}deg)`;
      }
      if (hand3Ref.current) {
        hand3Ref.current.style.transform = `rotate(${currentRotation + 90}deg)`;
      }
      if (hand4Ref.current) {
        hand4Ref.current.style.transform = `rotate(${currentRotation - 90}deg)`;
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [eot, isPaused, isWarpActive, warpSpeed, warpUnit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${sizeClass || 'w-56 h-56 md:w-80 lg:w-[320px] md:h-80 lg:h-[320px]'} rounded-full overflow-hidden flex items-center justify-center`}>
        {/* Map Background */}
        <img src={utcDial} alt="UTC Map Dial" className="absolute inset-0 w-full h-full object-cover" />

        {/* Yellow Hour Hand */}
        <div
           ref={hand1Ref}
           className="absolute w-1 h-[45%] bg-amber-400 rounded-t-full origin-bottom shadow-lg z-10"
           style={{ bottom: '50%' }}
         />

        {/* Blue Opposite Hand */}
        <div
           ref={hand2Ref}
           className="absolute w-1 h-[45%] bg-blue-900 rounded-t-full origin-bottom shadow-lg z-10"
           style={{ bottom: '50%' }}
         />

        {/* Third Hand (90 deg right: Left Yellow, Right Blue) */}
        <div
           ref={hand3Ref}
           className="absolute w-1 h-[45%] rounded-t-full origin-bottom shadow-lg z-10"
           style={{ 
             bottom: '50%',
             background: 'linear-gradient(to right, #eab308 50%, #1e3a8a 50%)'
           }}
         />
          
        {/* Fourth Hand (90 deg left: Left Blue, Right Yellow) */}
        <div
           ref={hand4Ref}
           className="absolute w-1 h-[45%] rounded-t-full origin-bottom shadow-lg z-10"
           style={{ 
             bottom: '50%',
             background: 'linear-gradient(to right, #1e3a8a 50%, #eab308 50%)'
           }}
         />
   
        {/* Center Dot */}
        <div className="w-3 h-3 bg-yellow-600 rounded-full z-20 shadow-xl border-2 border-white" style={{ transform: 'scale(0.1)' }} />
      </div>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-black">GASP Norte</span>
    </div>
  );
};
