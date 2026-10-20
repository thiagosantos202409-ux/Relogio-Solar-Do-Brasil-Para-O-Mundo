import React, { useState, useRef, useMemo } from 'react';
import { X, Compass } from 'lucide-react';
import { getSolarGradient } from '../lib/solarTime';

interface SolarDeVistaProps {
  onClose: () => void;
  solarPosition: { azimuth: number; altitude: number };
}

export const SolarDeVista: React.FC<SolarDeVistaProps> = ({ onClose, solarPosition }) => {
  // Initialize view pointing towards the sun to easily find it!
  const [rotationY, setRotationY] = useState(() => -solarPosition.azimuth);
  const [rotationX, setRotationX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      // movementX adjusts azimuth rotation
      setRotationY(prev => (prev + e.movementX * 0.4 + 360) % 360);
      // movementY adjusts elevation rotation, clamped between -45 and +45
      setRotationX(prev => Math.max(-45, Math.min(45, prev - e.movementY * 0.4)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Generate 120 twinkling stars for night scene
  const stars = useMemo(() => {
    const starList = [];
    for (let i = 0; i < 120; i++) {
      const az = Math.random() * 360;
      const alt = 2 + Math.random() * 85; // only above the horizon
      const size = 1 + Math.random() * 2;
      const pulseDelay = Math.random() * 3;
      starList.push({ az, alt, size, pulseDelay });
    }
    return starList;
  }, []);

  // Generate 45 grass clumps, wildflowers, and stones scattered on the ground plane
  const groundFeatures = useMemo(() => {
    const features = [];
    const types = ['grass', 'tall-grass', 'flower-yellow', 'flower-red', 'stone'] as const;
    for (let i = 0; i < 45; i++) {
      // Generate an organic spiral distribution
      const angle = (i * 137.5 * Math.PI) / 180;
      const dist = 120 + Math.sqrt(i) * 90 + Math.sin(i * 2.3) * 30; // spread from center
      const type = types[i % types.length];
      const scale = 0.5 + Math.abs(Math.sin(i)) * 0.7;
      features.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        type,
        scale,
      });
    }
    return features;
  }, []);

  // Sun 3D calculations
  const rSun = 550; // distance from center of the world
  const azRad = (solarPosition.azimuth * Math.PI) / 180;
  const altRad = (solarPosition.altitude * Math.PI) / 180;
  const sunX = rSun * Math.cos(altRad) * Math.sin(azRad);
  const sunY = -rSun * Math.sin(altRad);
  const sunZ = -rSun * Math.cos(altRad) * Math.cos(azRad);

  // Sundial Gnomon and shadow calculations
  const gnomonHeight = 100;
  // Shadow length: S = H / tan(altitude)
  const shadowLength = solarPosition.altitude > 0 
    ? Math.min(700, gnomonHeight / Math.tan(Math.max(0.01, altRad))) 
    : 0;
  // Shadow points in opposite direction of the sun
  const shadowAngle = solarPosition.azimuth + 180;

  // Background sky gradient
  const bgGradient = useMemo(() => getSolarGradient(solarPosition.altitude), [solarPosition.altitude]);

  // Helper for star coordinates on sky dome
  const getStarCoords = (az: number, alt: number) => {
    const rStar = 570;
    const sAzRad = (az * Math.PI) / 180;
    const sAltRad = (alt * Math.PI) / 180;
    return {
      x: rStar * Math.cos(sAltRad) * Math.sin(sAzRad),
      y: -rStar * Math.sin(sAltRad),
      z: -rStar * Math.cos(sAltRad) * Math.cos(sAzRad),
    };
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ 
        perspective: '1000px',
        background: bgGradient,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      ref={containerRef}
    >
      {/* Immersive 3D Space Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `translateZ(0) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
        }}
      >
        {/* Stars (visible during evening twilight & astronomical night) */}
        {solarPosition.altitude < 12 && stars.map((star, idx) => {
          const coords = getStarCoords(star.az, star.alt);
          // Stars fade in as the sun sinks below 12 degrees
          const starOpacity = Math.max(0, Math.min(1, (12 - solarPosition.altitude) / 20)) * (0.3 + Math.abs(Math.sin(idx)));
          if (starOpacity <= 0) return null;
          return (
            <div 
              key={`star-${idx}`}
              className="absolute bg-white rounded-full animate-pulse pointer-events-none"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                transform: `translate3d(-50%, -50%, 0) translate3d(${coords.x}px, ${coords.y}px, ${coords.z}px)`,
                opacity: starOpacity,
                animationDelay: `${star.pulseDelay}s`,
              }}
            />
          );
        })}

        {/* 3D Sun Sphere */}
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '64px',
            height: '64px',
            background: 'radial-gradient(circle, #fffbeb 20%, #fef08a 60%, #eab308 100%)',
            boxShadow: '0 0 60px rgba(251, 191, 36, 0.9), 0 0 120px rgba(251, 191, 36, 0.4)',
            transform: `translate3d(-50%, -50%, 0) translate3d(${sunX}px, ${sunY}px, ${sunZ}px) rotateY(${-solarPosition.azimuth}deg) rotateX(${solarPosition.altitude}deg)`,
            transformStyle: 'preserve-3d',
            opacity: solarPosition.altitude < -12 ? 0 : 1,
            transition: 'opacity 0.5s ease',
          }}
        />

        {/* 3D Horizon Cardinal Letters */}
        {[
          { label: 'N', az: 0 },
          { label: 'E', az: 90 },
          { label: 'S', az: 180 },
          { label: 'W', az: 270 }
        ].map((dir, idx) => {
          const rDir = 540;
          const azR = (dir.az * Math.PI) / 180;
          const dx = rDir * Math.sin(azR);
          const dz = -rDir * Math.cos(azR);
          return (
            <div
              key={`dir-3d-${idx}`}
              className="absolute font-mono font-black text-2xl text-white/40 tracking-wider pointer-events-none select-none"
              style={{
                transform: `translate3d(-50%, -50%, 0) translate3d(${dx}px, 0px, ${dz}px) rotateY(${-dir.az}deg)`,
                textShadow: '0 4px 10px rgba(0,0,0,0.8), 0 0 4px rgba(255,255,255,0.2)',
              }}
            >
              {dir.label}
            </div>
          );
        })}

        {/* 3D Textured Grass Ground Plane (altitude = 0 degrees, positioned 150px below eye level) */}
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '4000px',
            height: '4000px',
            left: 'calc(50% - 2000px)',
            top: 'calc(50% - 2000px)',
            transform: 'translateY(150px) rotateX(90deg)',
            transformStyle: 'preserve-3d',
            // High-fidelity Repeating Green Grass Pattern
            backgroundColor: '#166534',
            backgroundImage: `
              radial-gradient(circle at 30% 20%, #15803d 8%, transparent 20%),
              radial-gradient(circle at 80% 70%, #14532d 12%, transparent 25%),
              radial-gradient(circle at 10% 80%, #166534 10%, transparent 20%),
              radial-gradient(circle at 90% 10%, #15803d 8%, transparent 18%),
              linear-gradient(45deg, rgba(34, 197, 94, 0.08) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(34, 197, 94, 0.08) 25%, transparent 25%)
            `,
            backgroundSize: '40px 40px',
            boxShadow: 'inset 0 0 200px rgba(0,0,0,0.8)',
          }}
        >
          {/* Ambient center shadow (under viewer/sundial) */}
          <div 
            className="absolute rounded-full"
            style={{
              width: '400px',
              height: '400px',
              left: 'calc(50% - 2000px + 1800px)',
              top: 'calc(50% - 2000px + 1800px)',
              background: 'radial-gradient(circle, rgba(10,30,15,0.7) 0%, rgba(10,30,15,0) 70%)',
              transform: 'translate3d(0, 0, 0.5px)',
            }}
          />

          {/* Central Sundial Plate (Lay Flat) */}
          <div 
            className="absolute rounded-full border-[3px] border-amber-600/60 bg-amber-950/40 backdrop-blur-[2px] flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]"
            style={{
              width: '180px',
              height: '180px',
              left: 'calc(50% - 90px)',
              top: 'calc(50% - 90px)',
              transform: 'translateZ(1px)',
            }}
          >
            {/* Clock ticks & detail rings */}
            <div className="absolute inset-1.5 rounded-full border border-amber-500/20 flex items-center justify-center">
              <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/10" />
              
              {/* Compass Direction Labels on dial */}
              <span className="absolute top-2.5 text-[11px] text-amber-300 font-mono font-black select-none tracking-tight">N</span>
              <span className="absolute right-2.5 text-[11px] text-amber-300 font-mono font-black select-none tracking-tight">E</span>
              <span className="absolute bottom-2.5 text-[11px] text-amber-300 font-mono font-black select-none tracking-tight">S</span>
              <span className="absolute left-2.5 text-[11px] text-amber-300 font-mono font-black select-none tracking-tight">W</span>

              {/* Decorative Aztec/Solar circle */}
              <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 opacity-40 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border border-amber-500/40" />
              </div>
            </div>
          </div>

          {/* Sundial Gnomon's Shadow (Dynamic length & angle cast flat on the lawn) */}
          {solarPosition.altitude > 0 && (
            <div 
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: '6px',
                height: `${shadowLength}px`,
                background: 'linear-gradient(to bottom, rgba(5, 15, 8, 0.8) 0%, rgba(5, 15, 8, 0.4) 50%, rgba(5, 15, 8, 0) 100%)',
                transformOrigin: 'top center',
                transform: `translate(-50%, 0) rotate(${shadowAngle}deg) translateZ(2px)`,
                filter: `blur(${Math.max(1, shadowLength * 0.04)}px)`,
                opacity: Math.min(1, solarPosition.altitude / 5),
              }}
            />
          )}

          {/* Central Vertical Sundial Gnomon (Pillar) standing in the middle */}
          <div 
            className="absolute origin-bottom"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -100%) translateZ(3px) rotateX(-90deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Plane A */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-[100px] bg-gradient-to-t from-amber-800 via-amber-600 to-amber-300" 
              style={{ transform: 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
            />
            {/* Plane B */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-[100px] bg-gradient-to-t from-amber-800 via-amber-600 to-amber-300" 
              style={{ transform: 'rotateY(90deg)', transformStyle: 'preserve-3d' }}
            />
            {/* Golden ball tip */}
            <div 
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
              style={{ transform: 'translateY(-100%) rotateY(45deg)' }}
            />
          </div>

          {/* Scattered Grass Clumps, Wildflowers, and Rocks (with individual dynamic shadows!) */}
          {groundFeatures.map((feat, idx) => {
            // Individual shadow length for each element
            const elementHeight = 24 * feat.scale;
            const elementShadowLength = solarPosition.altitude > 0
              ? Math.min(250, elementHeight / Math.tan(Math.max(0.01, altRad)))
              : 0;

            return (
              <React.Fragment key={`feat-group-${idx}`}>
                {/* Flat Shadow cast by this feature */}
                {solarPosition.altitude > 0 && (
                  <div 
                    className="absolute pointer-events-none select-none"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${14 * feat.scale}px`,
                      height: `${elementShadowLength}px`,
                      background: 'linear-gradient(to bottom, rgba(5, 15, 8, 0.7) 0%, rgba(5, 15, 8, 0.35) 60%, rgba(5, 15, 8, 0) 100%)',
                      transformOrigin: 'top center',
                      transform: `translate(-50%, 0) translate3d(${feat.x}px, ${feat.y}px, 1.5px) rotate(${shadowAngle}deg)`,
                      filter: `blur(${Math.max(1, elementShadowLength * 0.05)}px)`,
                      opacity: Math.min(1, solarPosition.altitude / 6),
                    }}
                  />
                )}

                {/* Vertical 3D Billboard Sprite (faces the camera automatically) */}
                <div 
                  className="absolute origin-bottom select-none pointer-events-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -100%) translate3d(${feat.x}px, ${feat.y}px, 2px) rotateX(-90deg) rotateY(${-rotationY}deg)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {feat.type === 'grass' && (
                    <svg className="text-emerald-500/80 fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" style={{ width: 28 * feat.scale, height: 28 * feat.scale }}>
                      <path d="M2,22 C4,14 8,8 12,22 M12,22 C13,12 16,6 20,22 M7,22 C9,16 11,12 13,22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  )}
                  {feat.type === 'tall-grass' && (
                    <svg className="text-emerald-400/90 fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" style={{ width: 34 * feat.scale, height: 34 * feat.scale }}>
                      <path d="M3,22 C5,10 7,4 10,22 M10,22 C12,8 14,3 17,22 M14,22 C16,12 18,7 21,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                    </svg>
                  )}
                  {feat.type === 'flower-yellow' && (
                    <div style={{ transform: 'scale(1.1)', transformStyle: 'preserve-3d' }}>
                      <svg className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 20 * feat.scale, height: 24 * feat.scale }}>
                        <line x1="12" y1="24" x2="12" y2="10" stroke="#15803d" strokeWidth="3" />
                        <circle cx="12" cy="10" r="5" fill="#fbbf24" />
                        <circle cx="12" cy="10" r="1.8" fill="white" />
                      </svg>
                    </div>
                  )}
                  {feat.type === 'flower-red' && (
                    <div style={{ transform: 'scale(1.1)', transformStyle: 'preserve-3d' }}>
                      <svg className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 18 * feat.scale, height: 22 * feat.scale }}>
                        <line x1="12" y1="24" x2="12" y2="12" stroke="#15803d" strokeWidth="2.5" />
                        <path d="M8,12 C8,8 10,6 12,12 C14,6 16,8 16,12 C16,15 14,16 12,16 C10,16 8,15 8,12 Z" fill="#f43f5e" />
                      </svg>
                    </div>
                  )}
                  {feat.type === 'stone' && (
                    <svg viewBox="0 0 24 24" style={{ width: 24 * feat.scale, height: 18 * feat.scale }} className="text-zinc-600/95 fill-current drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                      <path d="M2,18 C3,10 6,6 12,6 C18,6 21,10 22,18 C22,19 21,20 20,20 L4,20 C3,20 2,19 2,18 Z" />
                    </svg>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Floating UI Elements */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 bg-black/45 border border-white/10 hover:bg-black/60 p-2.5 rounded-full text-white/90 active:scale-95 transition-all z-50 shadow-lg cursor-pointer"
        id="solar-vista-close"
        title="Fechar visualizador"
      >
        <X size={22} />
      </button>

      {/* Dynamic Status / Readouts in the corner */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 font-mono text-[11px] text-white/90 bg-black/45 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl pointer-events-none z-50">
        <div className="flex items-center gap-1.5">
          <Compass size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-bold tracking-wider text-xs uppercase text-amber-300">Vista Solar 3D</span>
        </div>
        <div className="mt-1 border-t border-white/10 pt-1.5 flex flex-col gap-1 text-white/70">
          <div>Azimute: <span className="text-white font-semibold">{solarPosition.azimuth.toFixed(1)}°</span></div>
          <div>Altitude: <span className="text-white font-semibold">{solarPosition.altitude.toFixed(1)}°</span></div>
          <div>Direção: <span className="text-amber-400 font-semibold">
            {solarPosition.azimuth >= 337.5 || solarPosition.azimuth < 22.5 ? 'Norte (N)' :
             solarPosition.azimuth >= 22.5 && solarPosition.azimuth < 67.5 ? 'Nordeste (NE)' :
             solarPosition.azimuth >= 67.5 && solarPosition.azimuth < 112.5 ? 'Leste (E)' :
             solarPosition.azimuth >= 112.5 && solarPosition.azimuth < 157.5 ? 'Sudeste (SE)' :
             solarPosition.azimuth >= 157.5 && solarPosition.azimuth < 202.5 ? 'Sul (S)' :
             solarPosition.azimuth >= 202.5 && solarPosition.azimuth < 247.5 ? 'Sudoeste (SO)' :
             solarPosition.azimuth >= 247.5 && solarPosition.azimuth < 292.5 ? 'Oeste (W)' : 'Noroeste (NO)'}
          </span></div>
        </div>
      </div>

      {/* Floating Tips Help Card */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 w-full px-4 max-w-sm">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-mono py-2.5 px-4 rounded-full shadow-2xl tracking-widest uppercase">
          🖱️ Arraste para orbitar o espaço 3D
        </div>
      </div>
    </div>
  );
};
