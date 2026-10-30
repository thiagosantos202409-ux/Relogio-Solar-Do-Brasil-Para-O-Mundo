import React, { useState, useMemo } from 'react';
import { Globe, Sun, MapPin, Eye, Compass, Info, Sparkles, Navigation, RotateCcw, Maximize, Minimize, X } from 'lucide-react';
import { formatLatitude, formatLongitude, formatCoordinatePair } from '../lib/coordinateParser';

interface OrientacaoTerrestreWidgetProps {
  subsolarLat: number; // Solar declination
  subsolarLon: number; // Subsolar longitude
  userLat: number;
  userLon: number;
  locationName: string;
  solarAltitude: number;
  language?: string;
  axialTilt?: number;
  localCivilDate?: Date | null;
  localSolarDate?: Date | null;
  utcDate?: Date | null;
  equationOfTime?: number;
  timezoneOffset?: number;
}

// Interpolate points between coordinate pairs for smooth spherical projection (100 lines per curve)
function interpolatePath(coords: [number, number][], steps = 100): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[i + 1];
    result.push([lat1, lon1]);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const lat = lat1 + (lat2 - lat1) * t;
      // Handle longitude wrap
      let dLon = lon2 - lon1;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      const lon = lon1 + dLon * t;
      result.push([lat, lon]);
    }
  }
  result.push(coords[coords.length - 1]);
  return result;
}

// Format date to XX:XX:XX (HH:MM:SS) in UTC components
const safeFormatHHMMSS = (d: Date | null | undefined) => {
  if (!d || isNaN(d.getTime())) return '00:00:00';
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Format date to XX/XX/XXXX (DD/MM/YYYY) in UTC components
const safeFormatDDMMYYYY = (d: Date | null | undefined) => {
  if (!d || isNaN(d.getTime())) return '00/00/0000';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear());
  return `${day}/${month}/${year}`;
};


// ... detailed simplified Earth continent polygons kept unchanged below ...


// Detailed simplified Earth continent polygons
const CONTINENT_DATA_RAW: [number, number][][] = [
  // North America
  [
    [70, -165], [72, -140], [70, -110], [68, -85], [62, -75], [55, -60], [47, -52], [42, -70],
    [30, -80], [25, -80], [25, -97], [18, -94], [14, -90], [8, -78], [15, -92], [20, -105],
    [32, -117], [38, -123], [48, -125], [58, -137], [60, -148], [65, -168], [70, -165]
  ],
  // South America
  [
    [12, -73], [10, -62], [6, -52], [-3, -37], [-8, -35], [-18, -39], [-23, -42], [-34, -53],
    [-45, -65], [-55, -67], [-54, -72], [-46, -75], [-35, -73], [-18, -71], [-5, -81],
    [2, -79], [8, -77], [12, -73]
  ],
  // Africa
  [
    [37, -6], [37, 10], [33, 35], [30, 32], [22, 37], [12, 44], [11, 51], [2, 45],
    [-10, 40], [-25, 33], [-34, 26], [-34, 18], [-22, 14], [-12, 13], [5, 9],
    [4, -7], [10, -14], [15, -17], [21, -17], [32, -9], [35, -6], [37, -6]
  ],
  // Eurasia (Europe + Asia)
  [
    [36, -9], [43, -9], [48, -4], [52, 2], [58, 6], [62, 5], [70, 20], [71, 28],
    [70, 60], [73, 80], [76, 110], [72, 130], [70, 160], [66, 170], [60, 163],
    [55, 135], [43, 131], [38, 118], [30, 122], [22, 114], [21, 108], [10, 104],
    [1, 104], [6, 100], [16, 96], [22, 91], [20, 73], [25, 62], [12, 44],
    [22, 37], [30, 32], [31, 35], [36, 36], [41, 29], [46, 38], [42, 28],
    [38, 24], [40, 18], [45, 13], [44, 8], [43, 3], [36, -9]
  ],
  // Australia
  [
    [-12, 131], [-12, 142], [-15, 145], [-25, 153], [-37, 150], [-38, 140],
    [-35, 137], [-32, 115], [-22, 114], [-15, 124], [-12, 131]
  ],
  // Greenland
  [
    [78, -68], [82, -45], [83, -28], [76, -18], [70, -22], [60, -43], [65, -52], [78, -68]
  ],
  // Antarctica
  [
    [-65, -180], [-65, -120], [-68, -60], [-65, 0], [-65, 60], [-66, 120], [-65, 180]
  ],
  // Japan
  [
    [45, 142], [40, 140], [35, 135], [31, 130], [34, 136], [41, 141], [45, 142]
  ],
  // Madagascar
  [
    [-12, 49], [-16, 47], [-25, 47], [-25, 44], [-16, 44], [-12, 49]
  ],
  // UK / Ireland
  [
    [58, -5], [50, 1], [51, -5], [55, -6], [58, -5]
  ]
];

// Pre-interpolate continent lines for high fidelity on 3D orthographic projection (100 lines per curve)
const CONTINENTS = CONTINENT_DATA_RAW.map(poly => interpolatePath(poly, 100));

// Orthographic Projection math
function projectOrthographic(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radius: number
) {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const phi0 = (centerLat * Math.PI) / 180;
  const lambda0 = (centerLon * Math.PI) / 180;

  const cosC =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

  const isVisible = cosC >= 0;

  const x = radius * Math.cos(phi) * Math.sin(lambda - lambda0);
  const y =
    radius *
    (Math.cos(phi0) * Math.sin(phi) -
      Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

  return { x, y: -y, isVisible, cosC };
}

// Generate graticule lines (lat/lon grid)
function generateGraticules(centerLat: number, centerLon: number, radius: number, axialTilt: number = 23.44) {
  const lines: { path: string; key: string; color: string; dash?: string }[] = [];
  let gratIndex = 0;

  // Equator
  const eqPoints: string[] = [];
  for (let lon = -180; lon <= 180; lon += 5) {
    const proj = projectOrthographic(0, lon, centerLat, centerLon, radius);
    if (proj.isVisible) {
      eqPoints.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
    } else {
      if (eqPoints.length > 1) {
        lines.push({
          path: `M ${eqPoints.join(' L ')}`,
          key: `eq-seg-${gratIndex++}-${lon}`,
          color: 'rgba(251, 191, 36, 0.45)', // Amber Equator
        });
      }
      eqPoints.length = 0;
    }
  }
  if (eqPoints.length > 1) {
    lines.push({
      path: `M ${eqPoints.join(' L ')}`,
      key: `eq-end-${gratIndex++}`,
      color: 'rgba(251, 191, 36, 0.45)',
    });
  }

  const effectiveTilt = axialTilt !== undefined && !isNaN(axialTilt) ? Math.max(0, Math.min(90, axialTilt)) : 23.44;
  const polarLat = Math.max(0, Math.min(90, 90 - effectiveTilt));

  // Tropics (+effectiveTilt and -effectiveTilt)
  [-effectiveTilt, effectiveTilt].forEach((tropicLat) => {
    const points: string[] = [];
    for (let lon = -180; lon <= 180; lon += 5) {
      const proj = projectOrthographic(tropicLat, lon, centerLat, centerLon, radius);
      if (proj.isVisible) {
        points.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
      } else {
        if (points.length > 1) {
          lines.push({
            path: `M ${points.join(' L ')}`,
            key: `tropic-seg-${gratIndex++}-${tropicLat}-${lon}`,
            color: 'rgba(251, 191, 36, 0.5)', // Amber Tropics
            dash: '3,2',
          });
        }
        points.length = 0;
      }
    }
    if (points.length > 1) {
      lines.push({
        path: `M ${points.join(' L ')}`,
        key: `tropic-end-${gratIndex++}-${tropicLat}`,
        color: 'rgba(251, 191, 36, 0.5)',
        dash: '3,2',
      });
    }
  });

  // Polar Circles (+(90 - effectiveTilt) and -(90 - effectiveTilt))
  [-polarLat, polarLat].forEach((pLat) => {
    const points: string[] = [];
    for (let lon = -180; lon <= 180; lon += 5) {
      const proj = projectOrthographic(pLat, lon, centerLat, centerLon, radius);
      if (proj.isVisible) {
        points.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
      } else {
        if (points.length > 1) {
          lines.push({
            path: `M ${points.join(' L ')}`,
            key: `polar-seg-${gratIndex++}-${pLat}-${lon}`,
            color: 'rgba(56, 189, 248, 0.5)', // Sky blue Polar Circles
            dash: '2,2',
          });
        }
        points.length = 0;
      }
    }
    if (points.length > 1) {
      lines.push({
        path: `M ${points.join(' L ')}`,
        key: `polar-end-${gratIndex++}-${pLat}`,
        color: 'rgba(56, 189, 248, 0.5)',
        dash: '2,2',
      });
    }
  });

  // Meridians (every 45 deg)
  for (let lon = -180; lon < 180; lon += 45) {
    const mPoints: string[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const proj = projectOrthographic(lat, lon, centerLat, centerLon, radius);
      if (proj.isVisible) {
        mPoints.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
      } else {
        if (mPoints.length > 1) {
          lines.push({
            path: `M ${mPoints.join(' L ')}`,
            key: `merid-seg-${gratIndex++}-${lon}-${lat}`,
            color: lon === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            dash: lon === 0 ? undefined : '1,3',
          });
        }
        mPoints.length = 0;
      }
    }
    if (mPoints.length > 1) {
      lines.push({
        path: `M ${mPoints.join(' L ')}`,
        key: `merid-end-${gratIndex++}-${lon}`,
        color: lon === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)',
        dash: lon === 0 ? undefined : '1,3',
      });
    }
  }

  return lines;
}

export const OrientacaoTerrestreWidget: React.FC<OrientacaoTerrestreWidgetProps> = ({
  subsolarLat,
  subsolarLon,
  userLat,
  userLon,
  locationName,
  solarAltitude,
  language = 'pt',
  axialTilt = 23.44,
  localCivilDate,
  localSolarDate,
  utcDate,
  equationOfTime = 0,
}) => {
  const isPt = language === 'pt';
  const [viewMode, setViewMode] = useState<'sun' | 'user'>('sun');
  const [showGraticule, setShowGraticule] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fallback defaults for dates if omitted
  const nowFallback = useMemo(() => new Date(), []);
  const effectiveUtcDate = utcDate || nowFallback;
  const effectiveLocalCivilDate = localCivilDate || effectiveUtcDate;
  const effectiveLocalSolarDate = localSolarDate || effectiveUtcDate;

  // Format 4 clocks in XX:XX:XX (HH:MM:SS)
  const civilTimeStr = safeFormatHHMMSS(effectiveLocalCivilDate);
  const localSolarTimeStr = safeFormatHHMMSS(effectiveLocalSolarDate);
  const utcTimeStr = safeFormatHHMMSS(effectiveUtcDate);

  // Global Solar UTC date = UTC Date + Equation of Time (in ms)
  const globalSolarUtcDate = useMemo(() => {
    if (!effectiveUtcDate || isNaN(effectiveUtcDate.getTime())) return null;
    return new Date(effectiveUtcDate.getTime() + (equationOfTime || 0) * 60000);
  }, [effectiveUtcDate, equationOfTime]);

  const globalSolarUtcTimeStr = safeFormatHHMMSS(globalSolarUtcDate);

  // Format dates in XX/XX/XXXX (DD/MM/YYYY)
  const civilDateStr = safeFormatDDMMYYYY(effectiveLocalCivilDate);
  const localSolarDateStr = safeFormatDDMMYYYY(effectiveLocalSolarDate);
  const utcDateStr = safeFormatDDMMYYYY(effectiveUtcDate);
  const globalSolarUtcDateStr = safeFormatDDMMYYYY(globalSolarUtcDate);



  // Determine central latitude & longitude based on view mode
  const centerLat = viewMode === 'sun' ? subsolarLat : userLat;
  const centerLon = viewMode === 'sun' ? subsolarLon : userLon;

  // Normal mode radius & size
  const globeRadius = 100;
  const svgSize = 280;
  const centerSvg = svgSize / 2;

  // Fullscreen mode radius & size
  const fsGlobeRadius = 210;
  const fsSvgSize = 480;
  const fsCenterSvg = fsSvgSize / 2;

  // Helpers for smart label offsets based on point X position (prevents edge overflow)
  const getUserLabelOffset = (x: number, isFs: boolean = false) => {
    const width = isFs ? 90 : 62;
    if (x > 15) {
      return `translate(${-width - (isFs ? 10 : 6)}, ${isFs ? -10 : -7})`;
    }
    return `translate(${isFs ? 10 : 6}, ${isFs ? -10 : -7})`;
  };

  const getSubsolarLabelOffset = (x: number, isFs: boolean = false) => {
    const width = isFs ? 105 : 74;
    if (x > 30) {
      return `translate(${-width + (isFs ? 15 : 10)}, ${isFs ? 20 : 14})`;
    }
    if (x < -30) {
      return `translate(${isFs ? -10 : -5}, ${isFs ? 20 : 14})`;
    }
    return `translate(${-width / 2}, ${isFs ? 20 : 14})`;
  };

  // Project Continents onto 3D Orthographic sphere (Normal)
  const renderedContinents = useMemo(() => {
    return CONTINENTS.map((poly, pIdx) => {
      const paths: string[] = [];
      let currentSegment: string[] = [];

      poly.forEach(([lat, lon]) => {
        const proj = projectOrthographic(lat, lon, centerLat, centerLon, globeRadius);
        if (proj.isVisible) {
          currentSegment.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
        } else {
          if (currentSegment.length > 1) {
            paths.push(`M ${currentSegment.join(' L ')}`);
          }
          currentSegment = [];
        }
      });

      if (currentSegment.length > 1) {
        paths.push(`M ${currentSegment.join(' L ')}`);
      }

      return { key: `poly-${pIdx}`, path: paths.join(' ') };
    }).filter(item => item.path.trim().length > 0);
  }, [centerLat, centerLon, globeRadius]);

  // Project Continents onto 3D Orthographic sphere (Fullscreen)
  const fsRenderedContinents = useMemo(() => {
    return CONTINENTS.map((poly, pIdx) => {
      const paths: string[] = [];
      let currentSegment: string[] = [];

      poly.forEach(([lat, lon]) => {
        const proj = projectOrthographic(lat, lon, centerLat, centerLon, fsGlobeRadius);
        if (proj.isVisible) {
          currentSegment.push(`${proj.x.toFixed(1)},${proj.y.toFixed(1)}`);
        } else {
          if (currentSegment.length > 1) {
            paths.push(`M ${currentSegment.join(' L ')}`);
          }
          currentSegment = [];
        }
      });

      if (currentSegment.length > 1) {
        paths.push(`M ${currentSegment.join(' L ')}`);
      }

      return { key: `fspoly-${pIdx}`, path: paths.join(' ') };
    }).filter(item => item.path.trim().length > 0);
  }, [centerLat, centerLon, fsGlobeRadius]);

  // Project Graticules (Normal)
  const graticules = useMemo(() => {
    if (!showGraticule) return [];
    return generateGraticules(centerLat, centerLon, globeRadius, axialTilt);
  }, [centerLat, centerLon, globeRadius, showGraticule, axialTilt]);

  // Project Graticules (Fullscreen)
  const fsGraticules = useMemo(() => {
    if (!showGraticule) return [];
    return generateGraticules(centerLat, centerLon, fsGlobeRadius, axialTilt);
  }, [centerLat, centerLon, fsGlobeRadius, showGraticule, axialTilt]);

  // Project Subsolar Point (Sol no Zênite 90°)
  const subsolarProj = useMemo(() => {
    return projectOrthographic(subsolarLat, subsolarLon, centerLat, centerLon, globeRadius);
  }, [subsolarLat, subsolarLon, centerLat, centerLon, globeRadius]);

  const fsSubsolarProj = useMemo(() => {
    return projectOrthographic(subsolarLat, subsolarLon, centerLat, centerLon, fsGlobeRadius);
  }, [subsolarLat, subsolarLon, centerLat, centerLon, fsGlobeRadius]);

  // Project User Location
  const userProj = useMemo(() => {
    return projectOrthographic(userLat, userLon, centerLat, centerLon, globeRadius);
  }, [userLat, userLon, centerLat, centerLon, globeRadius]);

  const fsUserProj = useMemo(() => {
    return projectOrthographic(userLat, userLon, centerLat, centerLon, fsGlobeRadius);
  }, [userLat, userLon, centerLat, centerLon, fsGlobeRadius]);

  // Calculate angular distance between User and Subsolar point (in degrees and km)
  const angularDistanceDeg = useMemo(() => {
    const rad1 = (userLat * Math.PI) / 180;
    const rad2 = (subsolarLat * Math.PI) / 180;
    const dLon = ((subsolarLon - userLon) * Math.PI) / 180;
    const cosC = Math.sin(rad1) * Math.sin(rad2) + Math.cos(rad1) * Math.cos(rad2) * Math.cos(dLon);
    const clampedCos = Math.min(1, Math.max(-1, cosC));
    return (Math.acos(clampedCos) * 180) / Math.PI;
  }, [userLat, userLon, subsolarLat, subsolarLon]);

  const distanceKm = Math.round(angularDistanceDeg * 111.12);

  return (
    <>
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-amber-500/20 shadow-xl space-y-3.5 my-3 relative overflow-hidden">
        {/* Glow background accent */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2.5 gap-2">
          {/* Title & Badge */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300">
              <Globe className="w-4 h-4 animate-spin-slow" style={{ animationDuration: '25s' }} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span>{isPt ? 'Orientação Terrestre' : 'Earth Orientation'}</span>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.2 rounded border border-amber-400/30 font-bold">
                  {isPt ? 'Vista do Sol' : 'Sun View'}
                </span>
              </h3>
              <p className="text-[9px] text-white/50">
                {isPt
                  ? 'Globo em perspectiva direta do Sol (Ponto Subsolar no Zênite 90°)'
                  : 'Orthographic Earth view centered directly at the subsolar point'}
              </p>
            </div>
          </div>

          {/* Controls Header (Right Side with Fullscreen at the end) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('sun')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'sun'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>{isPt ? 'Sol' : 'Sun'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('user')}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'user'
                    ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{isPt ? 'Você' : 'You'}</span>
              </button>
            </div>

            {/* Fullscreen Trigger Button - Positioned at the END (Right) */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-2 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 hover:text-black hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-extrabold uppercase shadow-md shadow-amber-400/10 shrink-0 whitespace-nowrap"
              title={isPt ? "Expandir Tela Cheia" : "Expand Fullscreen"}
            >
              <Maximize className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">{isPt ? 'Tela Cheia' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Main Interactive Globe Area - Fully Centered Column Layout */}
        <div className="flex flex-col items-center justify-center gap-4 py-2 w-full text-center">
          
          {/* SVG Orthographic Globe Container - Centered in the middle */}
          <div className="relative flex flex-col items-center justify-center mx-auto shrink-0 w-full max-w-[280px]">
            {/* Space Outer Glow / Stars */}
            <div className="absolute inset-0 rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />

            <svg 
              width={svgSize} 
              height={svgSize} 
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="select-none max-w-full h-auto block mx-auto overflow-visible"
            >
              <defs>
                {/* Radial gradient for Earth Sphere 3D depth */}
                <radialGradient id="earthGlobeGrad" cx="45%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="85%" stopColor="#090d16" />
                  <stop offset="100%" stopColor="#030712" />
                </radialGradient>

                {/* Atmosphere Halo Glow */}
                <radialGradient id="atmosphereGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="80%" stopColor="rgba(56, 189, 248, 0)" />
                  <stop offset="96%" stopColor="rgba(56, 189, 248, 0.25)" />
                  <stop offset="100%" stopColor="rgba(251, 191, 36, 0.45)" />
                </radialGradient>

                {/* Subsolar Flare */}
                <radialGradient id="subsolarFlare" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fef08a" />
                  <stop offset="70%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
                </radialGradient>
              </defs>

              <g transform={`translate(${centerSvg}, ${centerSvg})`}>
                {/* Atmosphere Outer Ring */}
                <circle r={globeRadius + 3} fill="none" stroke="url(#atmosphereGlow)" strokeWidth="6" />

                {/* Earth Body Sphere */}
                <circle r={globeRadius} fill="url(#earthGlobeGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                {/* Graticule Lines (Equator, Tropics, Meridians) */}
                {graticules.map((g) => (
                  <path
                    key={g.key}
                    d={g.path}
                    fill="none"
                    stroke={g.color}
                    strokeWidth="0.8"
                    strokeDasharray={g.dash}
                  />
                ))}

                {/* Rendered Continents */}
                {renderedContinents.map((item) => (
                  <path
                    key={item.key}
                    d={item.path}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                  />
                ))}

                {/* Line connecting Subsolar Point and User Location if both visible */}
                {subsolarProj.isVisible && userProj.isVisible && (
                  <line
                    x1={subsolarProj.x}
                    y1={subsolarProj.y}
                    x2={userProj.x}
                    y2={userProj.y}
                    stroke="rgba(251, 191, 36, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                )}

                {/* User Location Marker */}
                {userProj.isVisible ? (
                  <g transform={`translate(${userProj.x}, ${userProj.y})`}>
                    {/* Ripple animation */}
                    <circle r="9" fill="none" stroke="#38bdf8" strokeWidth="1" className="animate-ping opacity-60" />
                    <circle r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Label with smart offset */}
                    <g transform={getUserLabelOffset(userProj.x, false)}>
                      <rect x="-2" y="-9" width="62" height="13" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.8" />
                      <text x="2" y="0" fill="#38bdf8" fontSize="7.5" fontWeight="bold">
                        {isPt ? 'Você' : 'You'} ({solarAltitude > 0 ? `+${solarAltitude.toFixed(0)}°` : `${solarAltitude.toFixed(0)}°`})
                      </text>
                    </g>
                  </g>
                ) : (
                  /* User on Hidden Night Side Indicator at Globe Edge */
                  <g transform={`translate(${userProj.x}, ${userProj.y})`}>
                    <circle r="4" fill="rgba(148, 163, 184, 0.4)" stroke="rgba(255, 255, 255, 0.3)" strokeDasharray="1,1" />
                  </g>
                )}

                {/* Subsolar Point Marker (Center in 'sun' mode) */}
                {subsolarProj.isVisible && (
                  <g transform={`translate(${subsolarProj.x}, ${subsolarProj.y})`}>
                    {/* Sun Flare */}
                    <circle r="16" fill="url(#subsolarFlare)" className="animate-pulse opacity-80" />
                    <circle r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />

                    {/* Label with smart offset */}
                    <g transform={getSubsolarLabelOffset(subsolarProj.x, false)}>
                      <rect x="-2" y="-8" width="74" height="13" rx="3" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(251, 191, 36, 0.6)" strokeWidth="0.8" />
                      <text x="2" y="1" fill="#fbbf24" fontSize="7.5" fontWeight="bold">
                        ☀️ {isPt ? 'Zênite 90°' : 'Zenith 90°'}
                      </text>
                    </g>
                  </g>
                )}

                {/* Globe Outer Rim Halo / Daylight Horizon */}
                <circle r={globeRadius} fill="none" stroke="rgba(251, 191, 36, 0.6)" strokeWidth="1" strokeDasharray="4,2" />
              </g>
            </svg>

            {/* Controls Overlay Button */}
            <button
              type="button"
              onClick={() => setShowGraticule(!showGraticule)}
              className="absolute bottom-1 right-2 px-2 py-0.5 rounded bg-black/70 border border-white/20 text-[8px] font-mono text-white/80 hover:text-white cursor-pointer shadow-md z-10"
            >
              {showGraticule ? (isPt ? 'Grade: ON' : 'Grid: ON') : (isPt ? 'Grade: OFF' : 'Grid: OFF')}
            </button>
          </div>

          {/* Info Metrics Grid - Stacked centered underneath globe */}
          <div className="w-full space-y-2.5 max-w-md mx-auto text-left">
            {/* Subsolar Point Info Box */}
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" />
                  {isPt ? 'Ponto Subsolar (Sol no Zênite)' : 'Subsolar Point (Overhead Sun)'}
                </span>
                <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  Alt: 90.0°
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div>
                  <span className="text-white/40 text-[8px] uppercase block">{isPt ? 'Lat. Subsolar' : 'Subsolar Lat'}</span>
                  <span className="text-white font-bold">
                    {formatLatitude(subsolarLat, 2, true)}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 text-[8px] uppercase block">{isPt ? 'Lon. Subsolar' : 'Subsolar Lon'}</span>
                  <span className="text-white font-bold">
                    {formatLongitude(subsolarLon, 2, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* User Location Metrics */}
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {locationName || (isPt ? 'Sua Posição' : 'Your Position')}
                </span>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  solarAltitude > 0 
                    ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' 
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}>
                  {solarAltitude > 0 ? (isPt ? 'Dia Visível' : 'Daylight') : (isPt ? 'Noite' : 'Night')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                <div>
                  <span className="text-white/40 text-[8px] uppercase block">{isPt ? 'Altitude Solar' : 'Solar Altitude'}</span>
                  <span className="text-cyan-300 font-bold">
                    {solarAltitude >= 0 ? `+${solarAltitude.toFixed(1)}°` : `${solarAltitude.toFixed(1)}°`}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 text-[8px] uppercase block">{isPt ? 'Distância do Zênite' : 'Zenith Distance'}</span>
                  <span className="text-amber-300 font-bold">
                    {angularDistanceDeg.toFixed(1)}° ({distanceKm.toLocaleString()} km)
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Explanation Note */}
            <div className="p-2 bg-amber-400/5 border border-amber-400/15 rounded-lg flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[8.5px] text-white/70 leading-relaxed italic">
                {isPt
                  ? `O centro do globo (${subsolarLat.toFixed(1)}°, ${subsolarLon.toFixed(1)}°) marca onde o Sol incide a 90° perpendiculares. O disco mostrado é todo o hemisfério iluminado.`
                  : `The globe center (${subsolarLat.toFixed(1)}°, ${subsolarLon.toFixed(1)}°) shows where the Sun strikes at 90° zenith. The disk represents the entire sunlit hemisphere.`}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* FULLSCREEN MODAL VIEW */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 md:p-8 overflow-y-auto animate-fade-in">
          {/* Glows */}
          <div className="absolute top-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 mb-6 gap-3">
            {/* Title, Icon & Digital Clocks to the right of the name */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shadow-lg shadow-amber-400/10 shrink-0">
                  <Globe className="w-6 h-6 animate-spin-slow" style={{ animationDuration: '30s' }} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2 flex-wrap">
                    <span>{isPt ? 'Orientação Terrestre sob a Vista do Sol' : 'Earth Orientation under Solar View'}</span>
                    <span className="text-xs bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-400/40 font-bold">
                      {isPt ? 'Globo 3D Ortográfico' : '3D Orthographic Globe'}
                    </span>
                  </h2>
                  <p className="text-xs text-white/60">
                    {isPt
                      ? 'Projeção ortográfica completa centralizada no Ponto Subsolar (Sol a 90° perpendiculares no Zênite)'
                      : 'Full orthographic projection centered directly at the subsolar zenith point'}
                  </p>
                </div>
              </div>

              {/* 4 Digital Clocks in XX:XX:XX directly to the right of the name */}
              <div className="flex items-center gap-2 flex-wrap bg-slate-900/90 p-2 rounded-2xl border border-amber-400/30 shadow-xl ml-0 xl:ml-3">
                {/* Relógio Civil */}
                <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 min-w-[90px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-300/80 truncate">
                    {isPt ? 'Relógio Civil' : 'Civil Clock'}
                  </span>
                  <span className="text-xs md:text-sm font-mono font-black text-amber-300 tracking-wider">
                    {civilTimeStr}
                  </span>
                  <span className="text-[8.5px] font-mono font-extrabold text-amber-300/70 tracking-tight mt-0.5">
                    {civilDateStr}
                  </span>
                </div>

                {/* Relógio Solar Local */}
                <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 min-w-[90px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-400 truncate">
                    {isPt ? 'Relógio Solar Local' : 'Local Solar Clock'}
                  </span>
                  <span className="text-xs md:text-sm font-mono font-black text-amber-400 tracking-wider">
                    {localSolarTimeStr}
                  </span>
                  <span className="text-[8.5px] font-mono font-extrabold text-amber-400/70 tracking-tight mt-0.5">
                    {localSolarDateStr}
                  </span>
                </div>

                {/* Relógio UTC Global */}
                <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/25 min-w-[90px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-cyan-300 truncate">
                    {isPt ? 'Relógio UTC Global' : 'Global UTC Clock'}
                  </span>
                  <span className="text-xs md:text-sm font-mono font-black text-cyan-300 tracking-wider">
                    {utcTimeStr}
                  </span>
                  <span className="text-[8.5px] font-mono font-extrabold text-cyan-300/70 tracking-tight mt-0.5">
                    {utcDateStr}
                  </span>
                </div>

                {/* Relógio Solar UTC Global */}
                <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/25 min-w-[90px]">
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-300 truncate">
                    {isPt ? 'Relógio Solar UTC Global' : 'Global Solar UTC'}
                  </span>
                  <span className="text-xs md:text-sm font-mono font-black text-indigo-300 tracking-wider">
                    {globalSolarUtcTimeStr}
                  </span>
                  <span className="text-[8.5px] font-mono font-extrabold text-indigo-300/70 tracking-tight mt-0.5">
                    {globalSolarUtcDateStr}
                  </span>
                </div>
              </div>
            </div>


            {/* Controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* View Switcher */}
              <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/10 gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('sun')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'sun'
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>{isPt ? 'Sol (Zênite 90°)' : 'Sun Zenith'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('user')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'user'
                      ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>{isPt ? 'Sua Posição' : 'Your Position'}</span>
                </button>
              </div>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGraticule(!showGraticule)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/80 hover:bg-white/10 cursor-pointer"
              >
                {showGraticule ? (isPt ? 'Grade: ON' : 'Grid: ON') : (isPt ? 'Grade: OFF' : 'Grid: OFF')}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2.5 rounded-2xl bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-black transition-all border border-amber-400/30 shadow-lg cursor-pointer"
                title={isPt ? "Fechar Tela Cheia" : "Close Fullscreen"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>


          {/* Main Fullscreen Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left/Main SVG Globe Canvas (Col 7) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 relative">
              <div className="relative flex items-center justify-center">
                {/* Dynamic Space Background Halo */}
                <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-3xl pointer-events-none animate-pulse" />

                <svg width={fsSvgSize} height={fsSvgSize} className="overflow-visible select-none max-w-full h-auto">
                  <defs>
                    <radialGradient id="fsEarthGrad" cx="45%" cy="40%" r="55%">
                      <stop offset="0%" stopColor="#1e40af" />
                      <stop offset="50%" stopColor="#0f172a" />
                      <stop offset="85%" stopColor="#090d16" />
                      <stop offset="100%" stopColor="#020617" />
                    </radialGradient>

                    <radialGradient id="fsAtmosphereGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="80%" stopColor="rgba(56, 189, 248, 0)" />
                      <stop offset="96%" stopColor="rgba(56, 189, 248, 0.3)" />
                      <stop offset="100%" stopColor="rgba(251, 191, 36, 0.6)" />
                    </radialGradient>

                    <radialGradient id="fsSubsolarFlare" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#fef08a" />
                      <stop offset="65%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
                    </radialGradient>
                  </defs>

                  <g transform={`translate(${fsCenterSvg}, ${fsCenterSvg})`}>
                    {/* Atmosphere Halo */}
                    <circle r={fsGlobeRadius + 6} fill="none" stroke="url(#fsAtmosphereGlow)" strokeWidth="10" />

                    {/* Earth Body Sphere */}
                    <circle r={fsGlobeRadius} fill="url(#fsEarthGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

                    {/* Graticule Lines */}
                    {fsGraticules.map((g) => (
                      <path
                        key={`fs-${g.key}`}
                        d={g.path}
                        fill="none"
                        stroke={g.color}
                        strokeWidth="1.2"
                        strokeDasharray={g.dash}
                      />
                    ))}

                    {/* Rendered Continents */}
                    {fsRenderedContinents.map((item) => (
                      <path
                        key={item.key}
                        d={item.path}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-90 hover:opacity-100"
                      />
                    ))}

                    {/* Connecting geodesic line */}
                    {fsSubsolarProj.isVisible && fsUserProj.isVisible && (
                      <line
                        x1={fsSubsolarProj.x}
                        y1={fsSubsolarProj.y}
                        x2={fsUserProj.x}
                        y2={fsUserProj.y}
                        stroke="rgba(251, 191, 36, 0.6)"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                    )}

                    {/* User Location Marker */}
                    {fsUserProj.isVisible ? (
                      <g transform={`translate(${fsUserProj.x}, ${fsUserProj.y})`}>
                        <circle r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="animate-ping opacity-75" />
                        <circle r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                        <g transform={getUserLabelOffset(fsUserProj.x, true)}>
                          <rect x="-3" y="-11" width="90" height="17" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="1" />
                          <text x="3" y="1" fill="#38bdf8" fontSize="10" fontWeight="bold">
                            {isPt ? 'Sua Posição' : 'Your Position'} ({solarAltitude > 0 ? `+${solarAltitude.toFixed(0)}°` : `${solarAltitude.toFixed(0)}°`})
                          </text>
                        </g>
                      </g>
                    ) : (
                      <g transform={`translate(${fsUserProj.x}, ${fsUserProj.y})`}>
                        <circle r="6" fill="rgba(148, 163, 184, 0.5)" stroke="#ffffff" strokeDasharray="2,2" />
                      </g>
                    )}

                    {/* Subsolar Point Marker */}
                    {fsSubsolarProj.isVisible && (
                      <g transform={`translate(${fsSubsolarProj.x}, ${fsSubsolarProj.y})`}>
                        <circle r="26" fill="url(#fsSubsolarFlare)" className="animate-pulse opacity-90" />
                        <circle r="7.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                        <g transform={getSubsolarLabelOffset(fsSubsolarProj.x, true)}>
                          <rect x="-3" y="-11" width="105" height="18" rx="4" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(251, 191, 36, 0.8)" strokeWidth="1" />
                          <text x="4" y="2" fill="#fbbf24" fontSize="10.5" fontWeight="bold">
                            ☀️ Sol no Zênite 90°
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Daylight Horizon Rim */}
                    <circle r={fsGlobeRadius} fill="none" stroke="rgba(251, 191, 36, 0.7)" strokeWidth="1.5" strokeDasharray="6,3" />
                  </g>
                </svg>
              </div>

              <div className="mt-4 text-center text-xs font-mono text-white/50">
                {isPt
                  ? 'Representação Ortográfica do Globo Terrestre 100% sob Iluminação Solar Plena'
                  : 'Orthographic Representation of Earth Hemisphere under Full Solar Illumination'}
              </div>
            </div>

            {/* Right Detailed Stats Panel (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: Ponto Subsolar */}
              <div className="p-4 bg-white/5 rounded-2xl border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    {isPt ? 'Ponto Subsolar (Sol Perpendicular)' : 'Subsolar Point (Perpendicular Sun)'}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                    Sol a 90°
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Latitude Subsolar' : 'Subsolar Latitude'}</span>
                    <span className="text-amber-300 font-extrabold text-sm">
                      {formatLatitude(subsolarLat, 4, true)}
                    </span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Longitude Subsolar' : 'Subsolar Longitude'}</span>
                    <span className="text-amber-300 font-extrabold text-sm">
                      {formatLongitude(subsolarLon, 4, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Posição do Usuário & Geometria */}
              <div className="p-4 bg-white/5 rounded-2xl border border-cyan-400/30 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    {locationName || (isPt ? 'Sua Posição Registrada' : 'Your Recorded Location')}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    solarAltitude > 0 
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}>
                    {solarAltitude > 0 ? (isPt ? 'Dia Visível' : 'Visible Day') : (isPt ? 'Noite' : 'Night')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Sua Latitude / Longitude' : 'Your Lat / Lon'}</span>
                    <span className="text-white font-extrabold text-xs block">
                      {formatCoordinatePair(userLat, userLon, 3, false)}
                    </span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Altitude Solar Local' : 'Local Solar Altitude'}</span>
                    <span className="text-cyan-300 font-extrabold text-xs block">
                      {solarAltitude >= 0 ? `+${solarAltitude.toFixed(2)}°` : `${solarAltitude.toFixed(2)}°`}
                    </span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Ângulo Zenital' : 'Zenith Distance Angle'}</span>
                    <span className="text-amber-300 font-extrabold text-xs block">
                      {angularDistanceDeg.toFixed(2)}°
                    </span>
                  </div>
                  <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                    <span className="text-white/40 text-[9px] uppercase block mb-1">{isPt ? 'Distância do Subsolar' : 'Distance to Subsolar'}</span>
                    <span className="text-amber-300 font-extrabold text-xs block">
                      {distanceKm.toLocaleString()} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Geometria Solar Explicativa */}
              <div className="p-3.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isPt ? 'Geometria de Orientação Solar Terrestre' : 'Earth Solar Geometry Explanation'}</span>
                </div>
                <p className="text-xs text-white/80 font-sans leading-relaxed">
                  {isPt
                    ? `Nesta perspectiva ortográfica 3D, o centro geométrico do disco representa o Ponto Subsolar exatamente a 90° do zênite. Qualquer local no limite circular externo está no terminador (nascer ou pôr do Sol a 0° de altitude).`
                    : `In this 3D orthographic view, the disk geometric center represents the Subsolar Point at 90° zenith altitude. Any location on the outer circular edge lies on the terminator (sunrise/sunset at 0° altitude).`}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
