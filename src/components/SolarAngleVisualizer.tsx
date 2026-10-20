import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Sun, Navigation, Maximize2, Moon } from 'lucide-react';
import { SolarTimeResult } from '../lib/solarTime';
import { Translations } from '../translations';

interface SolarAngleVisualizerProps {
  solarInfo: SolarTimeResult;
  t: Translations;
  language: string;
}

export const SolarAngleVisualizer: React.FC<SolarAngleVisualizerProps> = ({ solarInfo, t, language }) => {
  const { altitude, azimuth } = solarInfo;

  const isDay = altitude > 0;

  // 3D Projection Configuration
  // phi: pitch angle (tilt of the camera down from the zenith)
  // psi: yaw angle (rotation around the vertical axis)
  const phi = 25 * (Math.PI / 180); // 25 degrees tilt
  const psi = 45 * (Math.PI / 180); // 45 degrees rotation

  // Helper to project 3D coordinate (x, y, z) to 2D screen coordinate (X, Y)
  // x: East-West axis (East is +)
  // y: vertical/up axis (Zenith is +)
  // z: North-South axis (North is +)
  const project = useMemo(() => {
    return (x: number, y: number, z: number, scale = 65) => {
      // Rotate around vertical Y axis (yaw)
      const xRot = x * Math.cos(psi) - z * Math.sin(psi);
      const zRot = x * Math.sin(psi) + z * Math.cos(psi);

      // Rotate around horizontal X axis (pitch)
      const screenX = xRot;
      const screenY = -y * Math.cos(phi) + zRot * Math.sin(phi);

      // Center at (100, 100)
      return {
        x: 100 + screenX * scale,
        y: 90 + screenY * scale,
      };
    };
  }, [phi, psi]);

  // Compute sun's 3D position
  const sunPosition = useMemo(() => {
    const altRad = altitude * (Math.PI / 180);
    const azRad = azimuth * (Math.PI / 180);

    // Convert altitude and azimuth to 3D Cartesian coordinates
    // In our coordinate system:
    // z is North (azimuth 0)
    // x is East (azimuth 90)
    // y is Up (altitude 90)
    const y = Math.sin(altRad);
    const horizontalScale = Math.cos(altRad);
    const x = Math.sin(azRad) * horizontalScale;
    const z = Math.cos(azRad) * horizontalScale;

    return project(x, y, z, 65);
  }, [altitude, azimuth, project]);

  // Compute shadow end position
  const shadowInfo = useMemo(() => {
    if (altitude <= 0) {
      return { castShadow: false, x: 100, y: 90, lengthFactor: 0 };
    }

    const altRad = altitude * (Math.PI / 180);
    const azRad = azimuth * (Math.PI / 180);

    // Shadow direction is opposite to sun's azimuth (azimuth + 180 degrees)
    // Shadow length = gnomonHeight / tan(altitude)
    const gnomonHeight = 0.22; // Height of our vertical pin
    const rawLength = gnomonHeight / Math.tan(altRad);
    const lengthFactor = rawLength;

    // Cap the physical shadow length for visual representation so it doesn't extend off-screen
    const maxVisualLength = 0.85;
    const visualLength = Math.min(rawLength, maxVisualLength);

    const shadowAzRad = azRad + Math.PI; // Opposite direction
    const xSh = Math.sin(shadowAzRad) * visualLength;
    const zSh = Math.cos(shadowAzRad) * visualLength;

    const projectedEnd = project(xSh, 0, zSh, 65);

    return {
      castShadow: true,
      x: projectedEnd.x,
      y: projectedEnd.y,
      lengthFactor: lengthFactor,
    };
  }, [altitude, azimuth, project]);

  // Project Cardinal direction labels (N, E, S, W)
  const cardinalLabels = useMemo(() => {
    const scale = 74;
    return [
      { label: 'N', ...project(0, 0, 1, scale) },
      { label: 'E', ...project(1, 0, 0, scale) },
      { label: 'S', ...project(0, 0, -1, scale) },
      { label: 'W', ...project(-1, 0, 0, scale) },
    ];
  }, [project]);

  // Generate 3D grid line paths for sky dome representation
  const skyDomePaths = useMemo(() => {
    const paths: string[] = [];

    // Draw Parallels (lines of constant altitude: 30, 60 degrees)
    [30, 60].forEach((alt) => {
      const altRad = alt * (Math.PI / 180);
      const y = Math.sin(altRad);
      const r = Math.cos(altRad);

      let pathStr = '';
      for (let azDeg = 0; azDeg <= 360; azDeg += 10) {
        const azRad = azDeg * (Math.PI / 180);
        const px = Math.sin(azRad) * r;
        const pz = Math.cos(azRad) * r;
        const pt = project(px, y, pz, 65);
        if (azDeg === 0) {
          pathStr += `M ${pt.x} ${pt.y}`;
        } else {
          pathStr += ` L ${pt.x} ${pt.y}`;
        }
      }
      paths.push(pathStr);
    });

    // Draw Meridians (lines of constant azimuth: N-S, E-W, NE-SW, NW-SE)
    [0, 45, 90, 135].forEach((az) => {
      const azRad = az * (Math.PI / 180);
      const oppAzRad = azRad + Math.PI;

      let pathStr = '';
      // Meridian curve going from az through zenith (alt=90) to opposite azimuth
      for (let alt = 0; alt <= 180; alt += 10) {
        let currentAlt = alt;
        let currentAz = azRad;

        if (alt > 90) {
          currentAlt = 180 - alt;
          currentAz = oppAzRad;
        }

        const altRad = currentAlt * (Math.PI / 180);
        const y = Math.sin(altRad);
        const r = Math.cos(altRad);
        const px = Math.sin(currentAz) * r;
        const pz = Math.cos(currentAz) * r;
        const pt = project(px, y, pz, 65);

        if (alt === 0) {
          pathStr += `M ${pt.x} ${pt.y}`;
        } else {
          pathStr += ` L ${pt.x} ${pt.y}`;
        }
      }
      paths.push(pathStr);
    });

    return paths;
  }, [project]);

  // Project ground circle ellipse
  const groundCirclePath = useMemo(() => {
    let pathStr = '';
    for (let azDeg = 0; azDeg <= 360; azDeg += 5) {
      const azRad = azDeg * (Math.PI / 180);
      const pt = project(Math.sin(azRad), 0, Math.cos(azRad), 65);
      if (azDeg === 0) {
        pathStr += `M ${pt.x} ${pt.y}`;
      } else {
        pathStr += ` L ${pt.x} ${pt.y}`;
      }
    }
    return pathStr;
  }, [project]);

  // Get cardinal direction text for azimuth
  const getCardinalDirection = (deg: number) => {
    const directions = language === 'pt' 
      ? ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] 
      : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return directions[idx];
  };

  // Describe shadow length visually
  const getShadowText = () => {
    if (altitude <= 0) {
      return language === 'pt' ? 'Sem Sombra (Noite)' : 'No Shadow (Night)';
    }
    if (shadowInfo.lengthFactor > 3.5) {
      return language === 'pt' ? 'Extremamente Longa' : 'Extremely Long';
    }
    if (shadowInfo.lengthFactor > 1.8) {
      return language === 'pt' ? 'Longa' : 'Long';
    }
    if (shadowInfo.lengthFactor > 0.8) {
      return language === 'pt' ? 'Média' : 'Medium';
    }
    if (shadowInfo.lengthFactor > 0.3) {
      return language === 'pt' ? 'Curta' : 'Short';
    }
    return language === 'pt' ? 'Mínima (Sol a Pino)' : 'Minimal (Zenith)';
  };

  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <h3 className="text-[10px] font-semibold text-white uppercase tracking-wider">
            {language === 'pt' ? 'Visualizador de Ângulo Solar' : 'Solar Angle Visualizer'}
          </h3>
        </div>
        <span className="text-[7px] bg-amber-400/10 text-amber-400 font-bold px-1.5 py-0.5 rounded-full uppercase">
          {isDay ? (language === 'pt' ? 'Dia' : 'Day') : (language === 'pt' ? 'Noite' : 'Night')}
        </span>
      </div>

      {/* Main 3D Stage */}
      <div className="relative w-full h-[180px] bg-slate-950/40 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
        
        {/* Background Atmosphere Glow */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000"
          style={{
            background: isDay 
              ? `radial-gradient(circle at ${sunPosition.x}px ${sunPosition.y}px, rgba(245, 158, 11, 0.4) 0%, transparent 60%)`
              : `radial-gradient(circle at 100px 90px, rgba(59, 130, 246, 0.2) 0%, transparent 70%)`
          }}
        />

        {/* 3D SVG Render */}
        <svg className="w-full h-full max-w-[220px]" viewBox="0 0 200 180" fill="none">
          {/* Ground Grid Circles/Plane */}
          <path 
            d={groundCirclePath} 
            stroke="rgba(255, 255, 255, 0.08)" 
            strokeWidth="1" 
            fill="rgba(255, 255, 255, 0.01)"
          />
          <path 
            d={groundCirclePath} 
            stroke="rgba(255, 255, 255, 0.03)" 
            strokeWidth="4" 
            className="blur-[2px]"
          />

          {/* Compass Axis Lines */}
          {/* North-South line */}
          <line 
            x1={project(0, 0, 1).x} y1={project(0, 0, 1).y}
            x2={project(0, 0, -1).x} y2={project(0, 0, -1).y}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />
          {/* East-West line */}
          <line 
            x1={project(1, 0, 0).x} y1={project(1, 0, 0).y}
            x2={project(-1, 0, 0).x} y2={project(-1, 0, 0).y}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />

          {/* Sky Dome Wireframe */}
          {skyDomePaths.map((path, i) => (
            <path 
              key={`skydome-path-${i}`} 
              d={path} 
              stroke="rgba(255, 255, 255, 0.04)" 
              strokeWidth="0.5" 
            />
          ))}

          {/* Cardinal Direction Text Labels */}
          {cardinalLabels.map((c, i) => (
            <text
              key={`cardinal-label-${c.label}-${i}`}
              x={c.x}
              y={c.y + 2.5}
              fill={c.label === 'N' ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'}
              fontSize="7"
              fontWeight={c.label === 'N' ? 'bold' : 'normal'}
              textAnchor="middle"
              className="font-mono"
            >
              {c.label}
            </text>
          ))}

          {/* Projected Solar Path (Approximate Arc) */}
          {isDay && (
            <path
              d={(() => {
                let pathStr = '';
                const altRad = altitude * (Math.PI / 180);
                const currentAzRad = azimuth * (Math.PI / 180);
                // Draw a beautiful arc representing current altitude trajectory
                for (let angle = 0; angle <= Math.PI; angle += 0.1) {
                  const az = currentAzRad - Math.PI / 2 + angle;
                  const x = Math.sin(az) * Math.cos(altRad);
                  const y = Math.sin(altRad);
                  const z = Math.cos(az) * Math.cos(altRad);
                  const pt = project(x, y, z, 65);
                  if (angle === 0) pathStr += `M ${pt.x} ${pt.y}`;
                  else pathStr += ` L ${pt.x} ${pt.y}`;
                }
                return pathStr;
              })()}
              stroke="rgba(245, 158, 11, 0.15)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* --- SHADOW CASTING --- */}
          {shadowInfo.castShadow && (
            <>
              {/* Direct shadow line on ground plane */}
              <motion.line
                x1={100}
                y1={90}
                x2={shadowInfo.x}
                y2={shadowInfo.y}
                stroke="rgba(0, 0, 0, 0.65)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="blur-[0.5px]"
                animate={{ x2: shadowInfo.x, y2: shadowInfo.y }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              />
              {/* Diffuse shadow glow */}
              <motion.line
                x1={100}
                y1={90}
                x2={shadowInfo.x}
                y2={shadowInfo.y}
                stroke="rgba(245, 158, 11, 0.12)"
                strokeWidth="5"
                strokeLinecap="round"
                className="blur-[2px]"
                animate={{ x2: shadowInfo.x, y2: shadowInfo.y }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              />
            </>
          )}

          {/* Gnomon (Vertical Center Pin) */}
          {/* Bottom base plate */}
          <ellipse cx="100" cy="90" rx="3.5" ry="1.5" fill="rgba(255, 255, 255, 0.15)" />
          {/* Vertical Pin body */}
          <line 
            x1={100} 
            y1={90} 
            x2={project(0, 0.22, 0).x} 
            y2={project(0, 0.22, 0).y} 
            stroke="url(#gnomonGrad)" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          {/* Gnomon tip ball */}
          <circle 
            cx={project(0, 0.22, 0).x} 
            cy={project(0, 0.22, 0).y} 
            r="1.2" 
            fill="#eab308" 
          />

          {/* Sun Ray Projection Line (from sun tip to gnomon tip to show logic of shadow) */}
          {isDay && (
            <motion.line
              x1={sunPosition.x}
              y1={sunPosition.y}
              x2={project(0, 0.22, 0).x}
              y2={project(0, 0.22, 0).y}
              stroke="rgba(245, 158, 11, 0.1)"
              strokeWidth="0.5"
              strokeDasharray="1.5 1.5"
              animate={{ x1: sunPosition.x, y1: sunPosition.y }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            />
          )}

          {/* --- SUN / MOON ICON ON THE DOME --- */}
          <motion.g
            animate={{ x: sunPosition.x, y: sunPosition.y }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          >
            {isDay ? (
              <>
                {/* Sun Glow */}
                <circle cx="0" cy="0" r="10" fill="rgba(245, 158, 11, 0.25)" />
                <circle cx="0" cy="0" r="6" fill="rgba(245, 158, 11, 0.5)" />
                {/* Sun Core */}
                <circle cx="0" cy="0" r="3.5" fill="#f59e0b" />
                <circle cx="0" cy="0" r="2" fill="#fff" />
              </>
            ) : (
              <>
                {/* Moon Glow */}
                <circle cx="0" cy="0" r="8" fill="rgba(147, 197, 253, 0.15)" />
                {/* Moon Core */}
                <circle cx="0" cy="0" r="2.5" fill="#93c5fd" />
              </>
            )}
          </motion.g>

          {/* Define beautiful gradient for the gnomon */}
          <defs>
            <linearGradient id="gnomonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating Degrees Overlay */}
        <div className="absolute bottom-2 left-2 flex flex-col font-mono text-[7px] text-white/50 bg-slate-950/80 px-1.5 py-1 rounded border border-white/5 gap-0.5 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full" /> N = 0° / 360°
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-amber-500 rounded-full" /> {language === 'pt' ? 'Alt: Elevação' : 'Alt: Elevation'}
          </span>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        {/* Altitude Gauge */}
        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-gray-400 text-[7px] uppercase tracking-wider mb-0.5">
            {language === 'pt' ? 'Altitude' : 'Altitude'}
          </div>
          <div className="text-white font-mono font-semibold text-[11px] flex items-center justify-center gap-0.5">
            {altitude.toFixed(1)}°
          </div>
          <div className="text-[6px] text-gray-500 truncate">
            {altitude > 0 
              ? (language === 'pt' ? 'Acima do horizonte' : 'Above horizon') 
              : (language === 'pt' ? 'Abaixo do horizonte' : 'Below horizon')}
          </div>
        </div>

        {/* Azimuth Gauge */}
        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-gray-400 text-[7px] uppercase tracking-wider mb-0.5">
            {language === 'pt' ? 'Azimute' : 'Azimuth'}
          </div>
          <div className="text-white font-mono font-semibold text-[11px] flex items-center justify-center gap-1">
            <Navigation className="w-2.5 h-2.5 text-blue-400 transform" style={{ transform: `rotate(${azimuth}deg)` }} />
            {azimuth.toFixed(0)}° {getCardinalDirection(azimuth)}
          </div>
          <div className="text-[6px] text-gray-500 truncate">
            {language === 'pt' ? 'Rumo bússola' : 'Compass bearing'}
          </div>
        </div>

        {/* Shadow Length */}
        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
          <div className="text-gray-400 text-[7px] uppercase tracking-wider mb-0.5">
            {language === 'pt' ? 'Comprimento Sombra' : 'Shadow Length'}
          </div>
          <div className="text-amber-400 font-mono font-semibold text-[10px] truncate">
            {shadowInfo.castShadow ? `${shadowInfo.lengthFactor.toFixed(2)}x` : '--'}
          </div>
          <div className="text-[6px] text-gray-500 truncate">
            {getShadowText()}
          </div>
        </div>
      </div>
    </div>
  );
};
