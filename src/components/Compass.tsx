import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useAnimation } from 'motion/react';

export const Compass: React.FC<{ azimuth: number; altitude: number; moonAltitude: number; moonAzimuth: number }> = ({ azimuth, altitude, moonAltitude, moonAzimuth }) => {
  const isBelowHorizon = altitude < 0;
  
  const sunRotation = useMotionValue(azimuth);
  const smoothSunRotation = useSpring(sunRotation, { stiffness: 50, damping: 20 });
  const lastSunAzimuth = useRef(azimuth);
  const sunPulseControls = useAnimation();

  const moonRotation = useMotionValue(moonAzimuth);
  const smoothMoonRotation = useSpring(moonRotation, { stiffness: 50, damping: 20 });
  const lastMoonAzimuth = useRef(moonAzimuth);

  useEffect(() => {
    let diff = azimuth - lastSunAzimuth.current;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;
    
    if (Math.abs(diff) > 0.05) {
        sunPulseControls.start({ scale: [1, 2], opacity: [0.6, 0] });
    }
    
    sunRotation.set(sunRotation.get() + diff);
    lastSunAzimuth.current = azimuth;
  }, [azimuth, sunRotation, sunPulseControls]);

  useEffect(() => {
    let diff = moonAzimuth - lastMoonAzimuth.current;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;
    
    moonRotation.set(moonRotation.get() + diff);
    lastMoonAzimuth.current = moonAzimuth;
  }, [moonAzimuth, moonRotation]);

  return (
    <motion.div 
      className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center relative bg-black/20 mx-auto shadow-inner"
    >
      {/* Directions */}
      <span className="absolute top-1 text-[8px] font-bold opacity-60">N</span>
      <span className="absolute bottom-1 text-[8px] font-bold opacity-60">S</span>
      <span className="absolute left-1 text-[8px] font-bold opacity-60">W</span>
      <span className="absolute right-1 text-[8px] font-bold opacity-60">E</span>
      
      {/* Azimuth indicator (Sun) */}
      <motion.div 
        className="absolute inset-2"
        style={{ rotate: smoothSunRotation }}
      >
        <div className={`w-0.5 h-10 ${isBelowHorizon ? 'bg-amber-400/20' : 'bg-amber-400/50'} absolute top-0 left-1/2 -ml-0.25`} />
        <div className={`w-3 h-3 rounded-full ${isBelowHorizon ? 'bg-amber-400/30' : 'bg-amber-400'} absolute -top-1.5 left-1/2 -ml-1.5 shadow-[0_0_10px_rgba(251,191,36,0.8)]`}>
            <motion.div 
                className="absolute inset-0 rounded-full bg-amber-400"
                initial={{ scale: 1, opacity: 0 }}
                animate={sunPulseControls}
            />
        </div>
      </motion.div>

      {/* Moon indicator */}
      {moonAltitude > 0 && (
        <motion.div 
          className="absolute inset-2"
          style={{ rotate: smoothMoonRotation }}
        >
          <div className="w-0.5 h-10 bg-white/30 absolute top-0 left-1/2 -ml-0.25" />
          <div className="w-2.5 h-2.5 rounded-full bg-white absolute -top-1.5 left-1/2 -ml-1.25 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        </motion.div>
      )}
      
      <div className="text-[6px] font-mono text-amber-400/70">
        {Math.round(azimuth)}°
      </div>
    </motion.div>
  );
};
