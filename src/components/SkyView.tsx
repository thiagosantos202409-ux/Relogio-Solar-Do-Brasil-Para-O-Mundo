import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, X, Compass, Smartphone, Cloud, Sunset, Sunrise, Eye, Sparkles, Navigation, RotateCw, Globe, Orbit, Star, Info } from 'lucide-react';
import { getSolarGradient } from '../lib/solarTime';
import { calculateHistoricalClouds } from '../lib/cloudTrend';
import { 
  MAJOR_STAR_CATALOG, 
  AMBIENT_CELESTIAL_STARS, 
  getLocalSiderealTime, 
  equatorialToHorizontal, 
  getStarOpacity, 
  getCelestialPoleInfo,
  CelestialPoleInfo 
} from '../lib/celestialStars';
import SunCalc from 'suncalc';

const CLOUD_SHAPES = [
  "M 25,60 A 20,20 0 0,1 45,30 A 25,25 0 0,1 85,25 A 20,20 0 0,1 105,45 A 15,15 0 0,1 110,60 Z",
  "M 15,50 A 15,15 0 0,1 30,30 A 20,20 0 0,1 65,25 A 18,18 0 0,1 85,40 A 12,12 0 0,1 100,50 Z",
  "M 20,40 A 12,12 0 0,1 32,25 A 15,15 0 0,1 55,20 A 12,12 0 0,1 70,35 Z",
  "M 10,40 Q 25,30 45,35 T 80,35 Q 90,40 95,45 Q 85,50 65,48 T 25,48 Q 15,45 10,40 Z"
];

const STATIC_CLOUDS_DEF = [
  { id: 1, shapeIdx: 0, top: '10%', scale: 1.2, duration: '90s', delay: '-10s', zIndex: 1, baseAz: 30, baseAlt: 45 },
  { id: 2, shapeIdx: 1, top: '18%', scale: 0.9, duration: '120s', delay: '-45s', zIndex: 0, baseAz: 110, baseAlt: 30 },
  { id: 3, shapeIdx: 2, top: '8%', scale: 1.5, duration: '75s', delay: '-20s', zIndex: 2, baseAz: 210, baseAlt: 60 },
  { id: 4, shapeIdx: 3, top: '22%', scale: 0.7, duration: '150s', delay: '-80s', zIndex: 0, baseAz: 280, baseAlt: 15 },
  { id: 5, shapeIdx: 0, top: '15%', scale: 1.1, duration: '110s', delay: '-5s', zIndex: 1, baseAz: 65, baseAlt: 50 },
  { id: 6, shapeIdx: 1, top: '5%', scale: 1.3, duration: '130s', delay: '-60s', zIndex: 1, baseAz: 150, baseAlt: 75 },
  { id: 7, shapeIdx: 2, top: '25%', scale: 0.8, duration: '105s', delay: '-15s', zIndex: 0, baseAz: 340, baseAlt: 20 },
  { id: 8, shapeIdx: 3, top: '12%', scale: 1.0, duration: '95s', delay: '-50s', zIndex: 2, baseAz: 80, baseAlt: 40 },
  { id: 9, shapeIdx: 0, top: '28%', scale: 0.85, duration: '140s', delay: '-30s', zIndex: 0, baseAz: 170, baseAlt: 10 },
  { id: 10, shapeIdx: 1, top: '16%', scale: 1.25, duration: '85s', delay: '-70s', zIndex: 1, baseAz: 245, baseAlt: 55 },
  { id: 11, shapeIdx: 2, top: '7%', scale: 1.4, duration: '100s', delay: '-40s', zIndex: 2, baseAz: 315, baseAlt: 70 },
  { id: 12, shapeIdx: 3, top: '20%', scale: 0.95, duration: '115s', delay: '-90s', zIndex: 0, baseAz: 15, baseAlt: 25 },
  { id: 13, shapeIdx: 0, top: '11%', scale: 1.15, duration: '98s', delay: '-12s', zIndex: 1, baseAz: 135, baseAlt: 48 },
  { id: 14, shapeIdx: 1, top: '24%', scale: 0.75, duration: '160s', delay: '-110s', zIndex: 0, baseAz: 225, baseAlt: 18 },
  { id: 15, shapeIdx: 2, top: '14%', scale: 1.35, duration: '92s', delay: '-25s', zIndex: 2, baseAz: 95, baseAlt: 62 },
  { id: 16, shapeIdx: 3, top: '6%', scale: 1.05, duration: '125s', delay: '-75s', zIndex: 1, baseAz: 190, baseAlt: 80 },
  { id: 17, shapeIdx: 0, top: '21%', scale: 0.9, duration: '145s', delay: '-55s', zIndex: 0, baseAz: 295, baseAlt: 22 },
  { id: 18, shapeIdx: 1, top: '13%', scale: 1.2, duration: '88s', delay: '-35s', zIndex: 1, baseAz: 50, baseAlt: 35 },
  { id: 19, shapeIdx: 2, top: '9%', scale: 1.45, duration: '105s', delay: '-105s', zIndex: 2, baseAz: 160, baseAlt: 68 },
  { id: 20, shapeIdx: 3, top: '26%', scale: 0.8, duration: '135s', delay: '-48s', zIndex: 0, baseAz: 260, baseAlt: 12 },
  { id: 21, shapeIdx: 0, top: '17%', scale: 1.1, duration: '112s', delay: '-18s', zIndex: 1, baseAz: 355, baseAlt: 42 },
  { id: 22, shapeIdx: 1, top: '4%', scale: 1.3, duration: '122s', delay: '-62s', zIndex: 1, baseAz: 75, baseAlt: 85 },
  { id: 23, shapeIdx: 2, top: '23%', scale: 0.85, duration: '155s', delay: '-82s', zIndex: 0, baseAz: 125, baseAlt: 28 },
  { id: 24, shapeIdx: 3, top: '15%', scale: 1.0, duration: '102s', delay: '-22s', zIndex: 2, baseAz: 220, baseAlt: 50 }
];

const getCloudColorAndOpacity = (alt: number, cloudMode: 'trend' | 'heavy' | 'medium' | 'light' | 'off') => {
  let fill = "rgba(255, 255, 255, 0.85)";
  let opacity = 0.85;

  let densityMultiplier = 1.0;
  if (cloudMode === 'heavy') densityMultiplier = 1.2;
  else if (cloudMode === 'medium') densityMultiplier = 1.0;
  else if (cloudMode === 'light') densityMultiplier = 0.4;

  if (alt > 15) {
    fill = "#f8fafc";
    opacity = 0.85 * densityMultiplier;
  } else if (alt > 3 && alt <= 15) {
    fill = "#fef08a"; // Warm sunlit yellow
    opacity = 0.88 * densityMultiplier;
  } else if (alt > -2 && alt <= 3) {
    fill = "#fb923c"; // Golden hour peach-orange
    opacity = 0.9 * densityMultiplier;
  } else if (alt > -6 && alt <= -2) {
    fill = "#f43f5e"; // Civil twilight fiery magenta-crimson
    opacity = 0.82 * densityMultiplier;
  } else if (alt > -12 && alt <= -6) {
    fill = "#6366f1"; // Nautical twilight indigo-purple
    opacity = 0.5 * densityMultiplier;
  } else {
    fill = "#1e293b"; // Night dark cloud silhouettes
    opacity = 0.35 * densityMultiplier;
  }
  return { fill, opacity: Math.min(1, Math.max(0.1, opacity)) };
};

interface SkyViewProps {
  altitude: number;
  azimuth: number;
  solarDate: Date;
  onClose: () => void;
  dateStr: string;
  civilTimeStr: string;
  solarTimeStr: string;
  latitude?: number;
  longitude?: number;
  moonPhase: number;
  scope?: 'all' | 'north' | 'south' | 'east' | 'west' | 'device';
  onScopeChange: (scope: 'all' | 'north' | 'south' | 'east' | 'west' | 'device') => void;
  language?: 'pt' | 'en';
  cloudMode?: 'trend' | 'heavy' | 'medium' | 'light' | 'off';
  onCloudModeChange?: (mode: 'trend' | 'heavy' | 'medium' | 'light' | 'off') => void;
  isOptimizationMode?: boolean;
  cloudOpacity?: number;
  onCloudOpacityChange?: (opacity: number) => void;
  elevation?: number;
}

export const SkyView: React.FC<SkyViewProps> = ({ 
  altitude, azimuth, solarDate, onClose, dateStr, civilTimeStr, solarTimeStr, latitude, longitude, moonPhase, scope = 'all', onScopeChange, language = 'pt',
  cloudMode = 'trend', onCloudModeChange, isOptimizationMode = false,
  cloudOpacity = 0.85, onCloudOpacityChange, elevation = 0
}) => {
  const lat = latitude ?? 0;
  const lon = longitude ?? 0;
  
  // Device orientation sensor states with smoothing filter
  const [sensorHeading, setSensorHeading] = useState<number>(180);
  const [sensorPitch, setSensorPitch] = useState<number>(15);
  const [manualOffsetHeading, setManualOffsetHeading] = useState<number>(0);
  const [manualOffsetPitch, setManualOffsetPitch] = useState<number>(0);
  const [deviceZoom, setDeviceZoom] = useState<number>(0); // zoom from -45 to +45, 0 being default

  // Realistic twilight details expansion state
  const [showTwilightInfo, setShowTwilightInfo] = useState<boolean>(false);
  const [showStarTrails, setShowStarTrails] = useState<boolean>(true);
  const [showPoleInfoModal, setShowPoleInfoModal] = useState<boolean>(false);

  // Clouds drift animation in celestial coordinates
  const [skyTimeOffset, setSkyTimeOffset] = useState<number>(0);
  useEffect(() => {
    let frameId: number;
    const update = () => {
      setSkyTimeOffset((prev) => (prev + 0.012) % 360);
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const activeClouds = useMemo(() => {
    const getCount = () => {
      if (cloudMode === 'off') return 0;
      let count = 6;
      if (cloudMode === 'light') count = 5;
      else if (cloudMode === 'medium') count = 11;
      else if (cloudMode === 'heavy') count = 22;
      else {
        const trend = calculateHistoricalClouds(solarDate, lat, lon);
        if (trend.mode === 'off') count = 0;
        else if (trend.mode === 'light') count = 5;
        else if (trend.mode === 'medium') count = 11;
        else if (trend.mode === 'heavy') count = 22;
      }
      if (isOptimizationMode) {
        count = Math.min(count, 5);
      }
      return count;
    };
    return STATIC_CLOUDS_DEF.slice(0, getCount());
  }, [cloudMode, altitude, isOptimizationMode, solarDate, lat, lon]);

  const trendResult = useMemo(() => {
    return calculateHistoricalClouds(solarDate, lat, lon);
  }, [solarDate, lat, lon]);

  const [viewportDimensions, setViewportDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const aspectRatio = useMemo(() => {
    return viewportDimensions.width / Math.max(1, viewportDimensions.height);
  }, [viewportDimensions]);

  const [showARGrid, setShowARGrid] = useState<boolean>(true);

  // Derived effective view angles (sum of sensor and manual dragging)
  const deviceHeading = (sensorHeading + manualOffsetHeading + 360) % 360;
  const devicePitch = Math.max(-90, Math.min(90, sensorPitch + manualOffsetPitch));
  const dip = 0.0353 * Math.sqrt(Math.max(0, elevation));

  const [permissionState, setPermissionState] = useState<'default' | 'prompt' | 'granted' | 'denied'>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Drag state refs for pointer dragging interaction
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetHeading: number; offsetPitch: number }>({ x: 0, y: 0, offsetHeading: 0, offsetPitch: 0 });

  // Scattered elements on the horizon grass plain
  const groundFeatures = useMemo(() => {
    const features = [];
    const types = ['grass', 'flower', 'tallGrass', 'tulip'] as const;
    for (let i = 0; i < 48; i++) {
      const az = (i * 7.5) + Math.sin(i * 1.7) * 3;
      const alt = -1.5 - (i % 4) * 3.5 - Math.cos(i * 2.3) * 1.5;
      const scale = 0.4 + (Math.abs(Math.sin(i * 3.1)) * 0.6);
      const type = types[i % types.length];
      features.push({ az, alt, scale, type });
    }
    return features;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scope !== 'device') return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetHeading: manualOffsetHeading,
      offsetPitch: manualOffsetPitch
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const headingSensitivity = horizontalFOV / Math.max(1, viewportDimensions.width);
    const pitchSensitivity = verticalFOV / Math.max(1, viewportDimensions.height);

    setManualOffsetHeading(dragStartRef.current.offsetHeading - deltaX * headingSensitivity);
    setManualOffsetPitch(dragStartRef.current.offsetPitch + deltaY * pitchSensitivity);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };
  
  // Check browser/device support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasOrientation = 'DeviceOrientationEvent' in window;
      setIsSupported(hasOrientation);
      if (hasOrientation && typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
        setPermissionState('granted');
      }
    }
  }, []);

  const requestOrientationPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissionState('granted');
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch (err) {
        console.error('Error requesting orientation permission:', err);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('granted');
      return true;
    }
  };

  // Orientation sensor event listener with low-pass smoothing
  useEffect(() => {
    if (scope !== 'device') return;

    let active = true;
    let lastHeading = 180;
    let lastPitch = 15;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!active) return;

      let heading = 180;
      if ('webkitCompassHeading' in event) {
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        heading = (360 - event.alpha) % 360;
      }

      let pitch = 15;
      if (event.beta !== null) {
        pitch = 90 - event.beta;
      }

      // Smooth heading across 0/360 boundary
      let diffH = ((heading - lastHeading + 180) % 360 + 360) % 360 - 180;
      const smoothHeading = (lastHeading + diffH * 0.35 + 360) % 360;
      const smoothPitch = lastPitch + (pitch - lastPitch) * 0.35;

      lastHeading = smoothHeading;
      lastPitch = smoothPitch;

      setSensorHeading(smoothHeading);
      setSensorPitch(smoothPitch);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      active = false;
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [scope]);

  const azOffset = useMemo(() => {
    switch (scope) {
      case 'north': return 0;
      case 'east': return 90;
      case 'south': return 180;
      case 'west': return -90;
      default: return 0;
    }
  }, [scope]);

  const getCenteredHorizontalPos = (azdeg: number) => {
    let centered = azdeg - azOffset;
    const normalized = ((centered + 180) % 360 + 360) % 360 - 180;
    return 50 + (normalized / 180) * 50;
  };
  
  const minAltitude = -90;
  const maxAltitude = 90;
  
  // Realistic Lens Focal Length & Field of View
  // Standard smartphone camera lens is 26mm equivalent at 1.0x (zoom = 0) with ~55° vertical FOV
  // deviceZoom slider (-30 to +30) maps to zoom factor: ~0.5x (13mm ultra-wide ~95° FOV) to 3.0x (78mm telephoto ~20° FOV)
  const zoomMultiplier = useMemo(() => Math.pow(2, deviceZoom / 20), [deviceZoom]);
  const baseVerticalFOV = 55; // 55° vertical FOV for 1x standard phone camera
  const verticalFOV = useMemo(() => scope === 'device' ? Math.max(12, Math.min(105, baseVerticalFOV / zoomMultiplier)) : 180, [scope, zoomMultiplier]);
  const horizontalFOV = useMemo(() => scope === 'device' ? Math.min(135, verticalFOV * aspectRatio) : 180, [scope, verticalFOV, aspectRatio]);
  const equivalentFocalLength = useMemo(() => Math.round(26 * zoomMultiplier), [zoomMultiplier]);

  // Sun & Moon real angular size is ~0.53 degrees (~32 arcminutes)
  const sunCoreSizePx = useMemo(() => {
    if (scope === 'device') {
      const vHeight = viewportDimensions.height;
      const realPx = (0.53 / verticalFOV) * vHeight;
      // Photosphere / atmospheric glare expands direct light perception on camera sensor
      return Math.max(16, Math.min(240, realPx * 2.8));
    }
    return 64; // default flat size
  }, [scope, verticalFOV, viewportDimensions.height]);

  const moonCoreSizePx = useMemo(() => {
    if (scope === 'device') {
      const vHeight = viewportDimensions.height;
      const realPx = (0.53 / verticalFOV) * vHeight;
      return Math.max(14, Math.min(200, realPx * 2.4));
    }
    return 48; // default flat size
  }, [scope, verticalFOV, viewportDimensions.height]);

  // Screen coordinate mapping function
  const getScreenCoords = (azdeg: number, altdeg: number) => {
    if (scope === 'device') {
      const diffAz = ((azdeg - deviceHeading + 180) % 360 + 360) % 360 - 180;
      const x = 50 + (diffAz / (horizontalFOV / 2)) * 50;
      
      const diffAlt = (altdeg + dip) - devicePitch;
      const y = 50 - (diffAlt / (verticalFOV / 2)) * 50;
      
      return { x, y };
    } else {
      const x = getCenteredHorizontalPos(azdeg);
      const ratio = (Math.max(minAltitude, Math.min(maxAltitude, altdeg + dip)) - minAltitude) / (maxAltitude - minAltitude);
      const y = 90 - (ratio * 80);
      return { x, y };
    }
  };

  // Astronomical Sunset & Sunrise calculations for real-world direction
  const solarEventsData = useMemo(() => {
    try {
      const times = SunCalc.getTimes(solarDate, lat, lon);
      const sunrise = times.sunrise;
      const sunset = times.sunset;
      const goldenHour = times.goldenHour;
      const dusk = times.dusk;
      const nauticalDusk = times.nauticalDusk;
      const night = times.night;

      let sunriseAz = 90;
      let sunsetAz = 270;

      if (sunrise && !isNaN(sunrise.getTime())) {
        const sPos = SunCalc.getPosition(sunrise, lat * Math.PI / 180, lon * Math.PI / 180);
        sunriseAz = (sPos.azimuth * 180 / Math.PI + 180) % 360;
      }
      if (sunset && !isNaN(sunset.getTime())) {
        const sPos = SunCalc.getPosition(sunset, lat * Math.PI / 180, lon * Math.PI / 180);
        sunsetAz = (sPos.azimuth * 180 / Math.PI + 180) % 360;
      }

      return {
        sunrise,
        sunset,
        goldenHour,
        dusk,
        nauticalDusk,
        night,
        sunriseAz,
        sunsetAz
      };
    } catch {
      return {
        sunrise: null,
        sunset: null,
        goldenHour: null,
        dusk: null,
        nauticalDusk: null,
        night: null,
        sunriseAz: 90,
        sunsetAz: 270
      };
    }
  }, [solarDate, lat, lon]);

  // Twilight Stage Identification
  const twilightPhase = useMemo(() => {
    if (altitude > 6) {
      return {
        id: 'day',
        namePt: 'Dia Pleno',
        nameEn: 'Full Daylight',
        color: '#38bdf8',
        descPt: 'Céu iluminado por espalhamento Rayleigh intenso. Sol direto brilhante.',
        descEn: 'Bright blue sky with direct sunlight and intense Rayleigh scattering.'
      };
    } else if (altitude > 0) {
      return {
        id: 'golden',
        namePt: 'Hora de Ouro (Pôr/Nascer)',
        nameEn: 'Golden Hour (Sunset/Sunrise)',
        color: '#fbbf24',
        descPt: 'Luz dourada rasante. Raio solar atravessa camada espessa da atmosfera.',
        descEn: 'Warm grazing sunlight passing through thick atmospheric airmass.'
      };
    } else if (altitude > -6) {
      return {
        id: 'civil',
        namePt: 'Crepúsculo Civil (Hora Azul)',
        nameEn: 'Civil Twilight (Blue Hour)',
        color: '#f43f5e',
        descPt: 'Céu alaranjado no horizonte do pôr do sol e azul profundo no zênite. Objetos visíveis.',
        descEn: 'Fiery horizon towards sunset, deep blue zenith. High terrestrial visibility.'
      };
    } else if (altitude > -12) {
      return {
        id: 'nautical',
        namePt: 'Crepúsculo Náutico',
        nameEn: 'Nautical Twilight',
        color: '#818cf8',
        descPt: 'Linha do horizonte ainda perceptível no mar. Primeiras estrelas de navegação surgem.',
        descEn: 'Horizon still visible against sea. Major navigational stars become clear.'
      };
    } else if (altitude > -18) {
      return {
        id: 'astronomical',
        namePt: 'Crepúsculo Astronômico',
        nameEn: 'Astronomical Twilight',
        color: '#6366f1',
        descPt: 'Luz solar residual quase imperceptível. Constelações completas emergem.',
        descEn: 'Faint sky glow fading away. Full star constellations become visible.'
      };
    } else {
      return {
        id: 'night',
        namePt: 'Noite Astronômica Fechada',
        nameEn: 'Astronomical Night',
        color: '#94a3b8',
        descPt: 'Escuridão total. Campo estelar pleno, Via Láctea e luz lunar.',
        descEn: 'Total darkness. Deep starry void, Milky Way glow, and moonlight.'
      };
    }
  }, [altitude]);

  // Sun and Moon path points
  const pathPointsData = useMemo(() => {
    const sunPoints: { azimuth: number; altitude: number }[] = [];
    const moonPoints: { azimuth: number; altitude: number }[] = [];
    
    const date = new Date(solarDate);
    date.setUTCHours(0, 0, 0, 0);

    for (let h = 0; h <= 24; h += 0.5) {
      date.setUTCHours(h, (h % 1) * 60);
      
      const sunPos = SunCalc.getPosition(date, lat * Math.PI / 180, lon * Math.PI / 180);
      const sunAltDeg = sunPos.altitude * 180 / Math.PI;
      const sunAzDeg = (sunPos.azimuth * 180 / Math.PI + 180) % 360;
      
      const moonPos = SunCalc.getMoonPosition(date, lat * Math.PI / 180, lon * Math.PI / 180);
      const moonAltDeg = moonPos.altitude * 180 / Math.PI;
      const moonAzDeg = (moonPos.azimuth * 180 / Math.PI + 180) % 360;
      
      sunPoints.push({ azimuth: sunAzDeg, altitude: sunAltDeg });
      moonPoints.push({ azimuth: moonAzDeg, altitude: moonAltDeg });
    }
    
    return { sunPoints, moonPoints };
  }, [lat, lon, solarDate]);

  const pathData = useMemo(() => {
    const mapped = pathPointsData.sunPoints.map(p => {
      const coords = getScreenCoords(p.azimuth, p.altitude);
      return `${coords.x.toFixed(2)},${coords.y.toFixed(2)}`;
    });
    return `M ${mapped.join(' L ')}`;
  }, [pathPointsData.sunPoints, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  const moonPathData = useMemo(() => {
    const mapped = pathPointsData.moonPoints.map(p => {
      const coords = getScreenCoords(p.azimuth, p.altitude);
      return `${coords.x.toFixed(2)},${coords.y.toFixed(2)}`;
    });
    return `M ${mapped.join(' L ')}`;
  }, [pathPointsData.moonPoints, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  // Real-time coordinates of Sun and Moon
  const sunCoords = useMemo(() => {
    return getScreenCoords(azimuth, altitude);
  }, [azimuth, altitude, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  const moonData = useMemo(() => {
    const moonPos = SunCalc.getMoonPosition(solarDate, lat * Math.PI / 180, lon * Math.PI / 180);
    const moonAltDeg = moonPos.altitude * 180 / Math.PI;
    const moonAzDeg = (moonPos.azimuth * 180 / Math.PI + 180) % 360;
    return { moonAltDeg, moonAzDeg };
  }, [solarDate, lat, lon]);

  const { moonAltDeg, moonAzDeg } = moonData;

  const moonCoords = useMemo(() => {
    return getScreenCoords(moonAzDeg, moonAltDeg);
  }, [moonAzDeg, moonAltDeg, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  // Sunset & Sunrise screen positions
  const sunsetCoords = useMemo(() => {
    return getScreenCoords(solarEventsData.sunsetAz, 0);
  }, [solarEventsData.sunsetAz, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  const sunriseCoords = useMemo(() => {
    return getScreenCoords(solarEventsData.sunriseAz, 0);
  }, [solarEventsData.sunriseAz, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  // Visibilities and Opacities
  const isSunVisible = scope !== 'device' || (sunCoords.x >= -15 && sunCoords.x <= 115 && sunCoords.y >= -15 && sunCoords.y <= 115);
  const isMoonVisible = scope !== 'device' || (moonCoords.x >= -15 && moonCoords.x <= 115 && moonCoords.y >= -15 && moonCoords.y <= 115);

  // Local Sidereal Time and Earth's Celestial Diurnal Rotation
  const lst = useMemo(() => getLocalSiderealTime(solarDate, lon), [solarDate, lon]);
  const celestialPole = useMemo(() => getCelestialPoleInfo(lat), [lat]);
  const poleCoords = useMemo(() => {
    return getScreenCoords(celestialPole.az, celestialPole.alt);
  }, [celestialPole, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  const isPoleVisible = useMemo(() => {
    if (scope === 'device') {
      return poleCoords.x >= -35 && poleCoords.x <= 135 && poleCoords.y >= -35 && poleCoords.y <= 135;
    }
    return celestialPole.alt >= 0;
  }, [scope, poleCoords, celestialPole]);

  // Dynamically calculate horizontal coordinates (Az/Alt) and optical extinction for Major Constellation Stars
  const computedMajorStars = useMemo(() => {
    return MAJOR_STAR_CATALOG.map((star) => {
      const { az, alt } = equatorialToHorizontal(star.ra, star.dec, lat, lst);
      const opacity = getStarOpacity(star.mag, altitude);
      const coords = getScreenCoords(az, alt);
      const isVisibleOnScreen = scope === 'device' 
        ? (coords.x >= -10 && coords.x <= 110 && coords.y >= -10 && coords.y <= 110)
        : (alt > 0);
      return {
        ...star,
        az,
        alt,
        opacity,
        coords,
        isVisibleOnScreen
      };
    });
  }, [lat, lst, altitude, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  // Dynamically calculate horizontal coordinates and optical extinction for Ambient Celestial Stars
  const computedAmbientStars = useMemo(() => {
    return AMBIENT_CELESTIAL_STARS.map((star) => {
      const { az, alt } = equatorialToHorizontal(star.ra, star.dec, lat, lst);
      const opacity = getStarOpacity(star.mag, altitude);
      const coords = getScreenCoords(az, alt);
      const isVisibleOnScreen = scope === 'device' 
        ? (coords.x >= -10 && coords.x <= 110 && coords.y >= -10 && coords.y <= 110)
        : (alt > 0);
      return {
        ...star,
        az,
        alt,
        opacity,
        coords,
        isVisibleOnScreen
      };
    });
  }, [lat, lst, altitude, scope, deviceHeading, devicePitch, azOffset, deviceZoom, dip]);

  // Master starfield visibility flag
  const isStarfieldActive = altitude <= -5;

  // Dynamic Sun Disc & Sunlight Flare Styling
  const sunVisuals = useMemo(() => {
    // Air mass attenuation shifts color from bright white-yellow to deep fiery crimson
    let coreColor = "#ffffff";
    let coronaColor = "rgba(254, 240, 138, 0.9)";
    let outerGlow = "rgba(251, 191, 36, 0.4)";
    let discScale = 1.0;
    let flareIntensity = 1.0;

    if (altitude > 20) {
      coreColor = "#ffffff";
      coronaColor = "rgba(254, 249, 195, 0.95)";
      outerGlow = "rgba(250, 204, 21, 0.45)";
      flareIntensity = 1.0;
    } else if (altitude > 6) {
      coreColor = "#fffbeb";
      coronaColor = "rgba(253, 224, 71, 0.9)";
      outerGlow = "rgba(245, 158, 11, 0.5)";
      flareIntensity = 0.85;
    } else if (altitude > 0) {
      // Golden Hour / Sunset
      coreColor = "#fef08a";
      coronaColor = "rgba(251, 146, 60, 0.95)";
      outerGlow = "rgba(239, 68, 68, 0.6)";
      discScale = 1.15; // Optical atmospheric magnification
      flareIntensity = 0.7;
    } else if (altitude > -6) {
      // Civil Twilight
      coreColor = "#fb923c";
      coronaColor = "rgba(244, 63, 94, 0.85)";
      outerGlow = "rgba(217, 70, 239, 0.4)";
      discScale = 1.25;
      flareIntensity = 0.3;
    } else {
      coreColor = "#f87171";
      coronaColor = "rgba(168, 85, 247, 0.3)";
      outerGlow = "rgba(79, 70, 229, 0.1)";
      flareIntensity = 0.0;
    }

    return { coreColor, coronaColor, outerGlow, discScale, flareIntensity };
  }, [altitude]);

  // 3D Directional Sunlight & Twilight Sky Gradient calculation
  const { bgGradient, twilightLayer, horizonSunGlow, groundLighting } = useMemo(() => {
    const baseGradient = getSolarGradient(altitude);
    
    // Directional difference in azimuth (how directly the user is looking towards the sun)
    const diffAz = Math.abs(((azimuth - deviceHeading + 180) % 360 + 360) % 360 - 180);
    const facingSunFactor = Math.max(0, 1 - (diffAz / 90)); // 1 when facing sun, 0 when 90+ deg away

    // Twilight layer
    const twilightAlpha = altitude > -18 && altitude < 6 ? (1 - Math.abs(altitude) / 18) * 0.45 : 0;
    const twilight = twilightAlpha > 0 
      ? `linear-gradient(180deg, rgba(76, 29, 149, ${twilightAlpha * 0.8}) 0%, rgba(192, 38, 211, ${twilightAlpha * 0.3}) 40%, rgba(244, 63, 94, 0) 100%), ` 
      : '';

    // Realistic Sunset/Sunrise Horizon Arc Glow (bloom on horizon around sun's direction)
    let horizonGlow = '';
    if (scope === 'device' && altitude >= -12 && altitude <= 15) {
      const glowOpacity = Math.max(0, Math.min(0.9, (1 - Math.abs(altitude - 1) / 12) * facingSunFactor));
      if (glowOpacity > 0.02) {
        horizonGlow = `radial-gradient(ellipse 90% 45% at ${sunCoords.x}% ${Math.max(40, sunCoords.y)}%, rgba(251, 146, 60, ${glowOpacity * 0.75}) 0%, rgba(244, 63, 94, ${glowOpacity * 0.45}) 35%, rgba(147, 51, 234, ${glowOpacity * 0.2}) 65%, rgba(0,0,0,0) 100%), `;
      }
    }

    // Dynamic Ground Plane Lighting
    let groundBg = 'linear-gradient(to bottom, #15803d 0%, #166534 20%, #14532d 100%)';
    let groundBorder = 'rgba(34, 197, 94, 0.4)';
    if (altitude > 15) {
      groundBg = 'linear-gradient(to bottom, #15803d 0%, #166534 25%, #14532d 100%)';
      groundBorder = 'rgba(74, 222, 128, 0.5)';
    } else if (altitude > 0) {
      // Golden hour ground illumination
      groundBg = 'linear-gradient(to bottom, #a16207 0%, #4d3800 20%, #1c1917 100%)';
      groundBorder = 'rgba(250, 204, 21, 0.6)';
    } else if (altitude > -6) {
      // Civil twilight (Blue hour & dusk silhouette)
      groundBg = 'linear-gradient(to bottom, #1e1b4b 0%, #0f172a 30%, #020617 100%)';
      groundBorder = 'rgba(244, 63, 94, 0.4)';
    } else if (altitude > -12) {
      // Nautical twilight
      groundBg = 'linear-gradient(to bottom, #090d16 0%, #030712 40%, #000000 100%)';
      groundBorder = 'rgba(99, 102, 241, 0.25)';
    } else {
      // Full night
      groundBg = 'linear-gradient(to bottom, #020617 0%, #000000 100%)';
      groundBorder = 'rgba(255, 255, 255, 0.1)';
    }

    return { 
      bgGradient: baseGradient, 
      twilightLayer: twilight, 
      horizonSunGlow: horizonGlow, 
      groundLighting: { groundBg, groundBorder } 
    };
  }, [altitude, azimuth, deviceHeading, scope, sunCoords]);

  // Horizon y-coord for device mode (precisely aligned with 0° altitude)
  const horizonY = scope === 'device' ? getScreenCoords(deviceHeading, 0).y : 50;

  // Zenith (+90° Altitude - Highest celestial point / Top of visible hemisphere)
  const zenithCoords = useMemo(() => {
    return getScreenCoords(deviceHeading, 90);
  }, [deviceHeading, devicePitch, deviceZoom, dip, scope]);

  // Nadir (-90° Altitude - Lowest subterranean point / Bottom of non-visible hemisphere)
  const nadirCoords = useMemo(() => {
    return getScreenCoords(deviceHeading, -90);
  }, [deviceHeading, devicePitch, deviceZoom, dip, scope]);

  // Altitude Guide Rings / Lines (+60°, +30°, -30°, -60°)
  const altitudeGuideLines = useMemo(() => {
    if (scope !== 'device') return [];
    const levels = [
      { alt: 60, labelPt: '+60° Céu Visível', labelEn: '+60° Visible Sky', isVisibleZone: true, color: 'rgba(56, 189, 248, 0.5)' },
      { alt: 30, labelPt: '+30° Céu Visível', labelEn: '+30° Visible Sky', isVisibleZone: true, color: 'rgba(251, 191, 36, 0.5)' },
      { alt: -30, labelPt: '-30° Horizonte Não Visível (Subterrâneo)', labelEn: '-30° Subterranean', isVisibleZone: false, color: 'rgba(129, 140, 248, 0.45)' },
      { alt: -60, labelPt: '-60° Horizonte Não Visível (Subterrâneo)', labelEn: '-60° Subterranean', isVisibleZone: false, color: 'rgba(168, 85, 247, 0.45)' }
    ];
    return levels.map(l => {
      const coords = getScreenCoords(deviceHeading, l.alt);
      return {
        ...l,
        y: coords.y,
        visible: coords.y >= -15 && coords.y <= 115
      };
    });
  }, [scope, deviceHeading, devicePitch, deviceZoom, dip]);

  // Cardinal & Intercardinal compass markers
  const compassMarkers = useMemo(() => {
    if (scope !== 'device') return [];
    const directions = [
      { label: 'N', az: 0, isMajor: true },
      { label: 'NE', az: 45, isMajor: false },
      { label: 'E', az: 90, isMajor: true },
      { label: 'SE', az: 135, isMajor: false },
      { label: 'S', az: 180, isMajor: true },
      { label: 'SW', az: 225, isMajor: false },
      { label: 'W', az: 270, isMajor: true },
      { label: 'NW', az: 315, isMajor: false }
    ];
    return directions.map(d => {
      const coords = getScreenCoords(d.az, 0);
      return {
        ...d,
        x: coords.x,
        y: coords.y,
        visible: coords.x >= -10 && coords.x <= 110 && coords.y >= -10 && coords.y <= 110
      };
    });
  }, [scope, deviceHeading, devicePitch, deviceZoom, dip]);

  // Sun offscreen guiding arrow
  const sunHeadingGuide = useMemo(() => {
    if (scope !== 'device' || isSunVisible) return null;
    const diffAz = ((azimuth - deviceHeading + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(diffAz) > 15) {
      return {
        direction: diffAz > 0 ? 'right' : 'left',
        degrees: Math.abs(diffAz)
      };
    }
    return null;
  }, [scope, azimuth, deviceHeading, isSunVisible]);

  // Quick snap to point camera directly at Solar Direction or Zenith/Horizon/Nadir
  const snapToAzimuth = (targetAz: number, targetPitch: number = 0) => {
    setManualOffsetHeading(targetAz - sensorHeading);
    setManualOffsetPitch(targetPitch - sensorPitch);
  };

  const snapToPitch = (targetPitch: number) => {
    setManualOffsetPitch(targetPitch - sensorPitch);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scope !== 'device') return;
    const delta = e.ctrlKey ? -e.deltaY * 0.1 : (e.deltaY < 0 ? 3 : -3);
    setDeviceZoom(prev => Math.max(-45, Math.min(45, Math.round(prev + delta))));
  };

  const handleScopeSelect = async (selectedScope: 'all' | 'north' | 'east' | 'south' | 'west' | 'device') => {
    if (selectedScope === 'device') {
      const granted = await requestOrientationPermission();
      if (granted) {
        onScopeChange('device');
      } else {
        setPermissionState('denied');
        onScopeChange('device');
      }
    } else {
      onScopeChange(selectedScope);
    }
  };

  return (
    <div 
      onPointerDown={scope === 'device' ? handlePointerDown : undefined}
      onPointerMove={scope === 'device' ? handlePointerMove : undefined}
      onPointerUp={scope === 'device' ? handlePointerUp : undefined}
      onPointerCancel={scope === 'device' ? handlePointerUp : undefined}
      onWheel={scope === 'device' ? handleWheel : undefined}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 transition-colors duration-500 overflow-hidden select-none ${
        scope === 'device' ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ 
        background: horizonSunGlow + twilightLayer + `radial-gradient(circle at ${sunCoords.x}% ${sunCoords.y}%, rgba(251, 191, 36, ${Math.max(0, Math.min(0.7, (altitude + 12) / 20))}) 0%, rgba(251, 191, 36, 0.15) 25%, rgba(251, 191, 36, 0) 65%), ${bgGradient}`
      }}
    >
      {/* AR Viewfinder Overlay Grid & Scale Ruler in Device Mode */}
      {scope === 'device' && showARGrid && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
          {/* Rule of Thirds Grid Lines */}
          <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/10 border-l border-dashed border-white/20" />
          <div className="absolute right-1/3 top-0 bottom-0 w-[1px] bg-white/10 border-l border-dashed border-white/20" />
          <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/10 border-t border-dashed border-white/20" />
          <div className="absolute bottom-1/3 left-0 right-0 h-[1px] bg-white/10 border-t border-dashed border-white/20" />

          {/* Viewfinder Corner Frame Accents */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-400/50 rounded-tl-lg" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-amber-400/50 rounded-tr-lg" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-amber-400/50 rounded-bl-lg" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-amber-400/50 rounded-br-lg" />

          {/* Center Precision Target Crosshair Reticle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full border border-amber-400/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-ping" />
            </div>
            <div className="absolute w-16 h-[1px] bg-amber-400/30" />
            <div className="absolute h-16 w-[1px] bg-amber-400/30" />
            
            {/* Live Horizon Pitch Roll Angle readout */}
            <span className="absolute -bottom-6 font-mono text-[8px] font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded-full border border-amber-400/20 whitespace-nowrap">
              PITCH: {devicePitch > 0 ? `+${devicePitch.toFixed(1)}°` : `${devicePitch.toFixed(1)}°`} • HEADING: {deviceHeading.toFixed(0)}°
            </span>
          </div>

          {/* Lens Spec & FOV HUD Badge Top Center */}
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-amber-400/30 text-[9px] font-mono text-amber-300 shadow-xl flex items-center gap-2">
            <span className="font-bold">📷 LENTE {equivalentFocalLength}mm ({zoomMultiplier.toFixed(1)}x)</span>
            <span className="text-white/40">•</span>
            <span className="text-white/70">CAMPO VISUAL: {verticalFOV.toFixed(0)}° V × {horizontalFOV.toFixed(0)}° H</span>
          </div>

          {/* 10° Physical Angular Distance Scale Ruler Bar Bottom Right */}
          <div className="absolute bottom-16 right-6 bg-slate-950/80 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-[8px] font-mono text-white/80 flex flex-col items-center gap-1 shadow-2xl">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[7.5px]">ESCALA ANGULAR REAL (10°)</span>
            <div className="relative h-2 flex items-center justify-center" style={{ width: `${Math.max(40, Math.min(180, (10 / horizontalFOV) * viewportDimensions.width))}px` }}>
              <div className="w-full h-[2px] bg-amber-400 rounded-full" />
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-400" />
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-amber-400" />
            </div>
            <span className="text-[7px] text-white/50 font-mono">Sol = ~0.53° (1/20 desta escala)</span>
          </div>
        </div>
      )}

      {/* Dynamic Starfield Layer (Scintillating night stars and constellations based on real astronomical coordinates & Earth's diurnal rotation) */}
      {isStarfieldActive && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Diurnal Rotation Star Trails (Concentric circles centered at the Celestial Pole) */}
          {showStarTrails && isPoleVisible && (
            <div 
              className="absolute pointer-events-none z-0"
              style={{
                left: `${poleCoords.x}%`,
                top: `${poleCoords.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: altitude <= -12 ? 0.35 : 0.18
              }}
            >
              {[120, 260, 420, 600, 820].map((diameter, idx) => (
                <div
                  key={`trail-ring-${idx}`}
                  className={`absolute rounded-full border border-dashed border-indigo-400/40 ${
                    celestialPole.hemisphere === 'south' ? 'animate-spin-slow' : 'animate-spin-slow-reverse'
                  }`}
                  style={{
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    left: `-${diameter / 2}px`,
                    top: `-${diameter / 2}px`,
                    animationDuration: `${40 + idx * 25}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Ambient Star Catalog (faint background stars) */}
          {computedAmbientStars.map((star, sIdx) => {
            if (star.opacity <= 0.02 || !star.isVisibleOnScreen) return null;
            const size = Math.max(1.2, 3.4 - star.mag * 0.45);

            return (
              <div
                key={`ambient-star-${star.id}-${sIdx}`}
                className="absolute rounded-full pointer-events-none transition-opacity duration-300"
                style={{
                  left: `${star.coords.x}%`,
                  top: `${star.coords.y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: star.color,
                  opacity: star.opacity * (0.7 + Math.sin(star.id) * 0.3),
                  boxShadow: size > 2 ? `0 0 3px ${star.color}` : 'none',
                  transform: 'translate(-50%, -50%)'
                }}
              />
            );
          })}

          {/* Major Star Catalog with RA/Dec J2000 precision and proper spectral colors */}
          {computedMajorStars.map((star, sIdx) => {
            if (star.opacity <= 0.02 || !star.isVisibleOnScreen) return null;
            const size = Math.max(2.5, 6.0 - star.mag * 1.05);

            return (
              <div
                key={`named-star-${star.name}-${sIdx}`}
                className="absolute rounded-full transition-transform duration-100 ease-linear animate-pulse"
                style={{
                  left: `${star.coords.x}%`,
                  top: `${star.coords.y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: star.color,
                  boxShadow: `0 0 ${size * 2.5}px ${star.color}`,
                  transform: 'translate(-50%, -50%)',
                  opacity: star.opacity
                }}
              >
                {/* Major Star label with constellation */}
                {star.opacity > 0.4 && (
                  <span className="absolute left-3.5 -top-1.5 text-[8px] font-mono text-cyan-200/60 tracking-wider whitespace-nowrap drop-shadow-md pointer-events-none flex items-center gap-1">
                    <span className="text-white/80 font-bold">{star.name}</span>
                    <span className="text-[6.5px] text-white/40">({star.constellation})</span>
                  </span>
                )}
              </div>
            );
          })}

          {/* Celestial Pole Pivot Point (The single stationary point around which all stars rotate) */}
          {isPoleVisible && (
            <div
              className="absolute z-20 pointer-events-auto"
              style={{
                left: `${poleCoords.x}%`,
                top: `${poleCoords.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Pulsing Concentric Reticle Rings */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full border border-cyan-400/40 animate-ping" />
                <div className="absolute w-8 h-8 rounded-full border border-dashed border-indigo-400/80 animate-spin-slow" />
                <div className="absolute w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-300" />
                
                {/* Axis Crosshair */}
                <div className="absolute w-7 h-[1px] bg-cyan-300/60" />
                <div className="absolute h-7 w-[1px] bg-cyan-300/60" />
                
                {/* Center Pivot Glowing Dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8]" />

                {/* Clickable Educational Badge */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPoleInfoModal(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-950/85 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 px-2.5 py-1.5 rounded-xl backdrop-blur-md text-left transition-all hover:scale-105 shadow-xl flex items-center gap-2 cursor-pointer group"
                >
                  <Orbit size={14} className="text-cyan-400 shrink-0 group-hover:rotate-180 transition-transform duration-500" />
                  <div className="flex flex-col whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-sans font-bold text-cyan-300">
                        {language === 'pt' ? celestialPole.namePt : celestialPole.nameEn}
                      </span>
                      <span className="text-[7.5px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded font-mono">
                        Pivô Fixo
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono text-white/60">
                      {celestialPole.rotationDirectionPt} • Alt: {celestialPole.alt.toFixed(1)}°
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sun and Moon Celestial Paths */}
      <svg className="absolute inset-0 z-0 w-full h-full pointer-events-none">
        <path d={pathData} stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
        <path d={moonPathData} stroke="rgba(200, 200, 255, 0.2)" strokeWidth="1.2" strokeDasharray="5 5" fill="none" />
      </svg>
      
      {/* Top Close Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 bg-black/60 border border-white/20 hover:bg-black/80 p-2.5 rounded-full text-white/90 hover:text-white active:scale-95 transition-all z-50 shadow-2xl cursor-pointer flex items-center justify-center backdrop-blur-md"
        id="sky-view-close"
        title="Fechar visualizador"
      >
        <X size={24} />
      </button>

      {/* Date Top Left */}
      <div className="absolute top-4 left-4 text-white/80 font-mono text-sm tracking-widest z-40 max-sm:hidden bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>{dateStr}</span>
      </div>

      {/* Segmented Controller (Centered at the top) */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center bg-black/50 border border-white/15 rounded-full p-1 text-[10px] font-mono backdrop-blur-lg max-sm:scale-90 max-sm:top-14 max-sm:left-1/2 max-sm:-translate-x-1/2 z-40 shadow-2xl"
      >
        {(['all', 'north', 'east', 'south', 'west', 'device'] as const).map(s => (
          <button
            key={`sky-scope-${s}`}
            onClick={(e) => {
              e.stopPropagation();
              handleScopeSelect(s);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`px-3.5 py-1.5 rounded-full uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              scope === s 
                ? 'bg-white text-slate-950 font-bold shadow-lg scale-105' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {s === 'device' ? '🧭 Device (Real 3D)' : s}
          </button>
        ))}
      </div>

      {/* Twilight & Atmospheric Phase Badge Top-Right */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setShowTwilightInfo(!showTwilightInfo)}
        className="absolute top-16 right-4 flex items-center gap-2 bg-black/60 border border-white/15 hover:border-white/30 rounded-2xl px-3.5 py-2 backdrop-blur-md z-40 cursor-pointer shadow-xl transition-all active:scale-95"
      >
        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: twilightPhase.color, boxShadow: `0 0 10px ${twilightPhase.color}` }} />
        <div className="flex flex-col text-left">
          <span className="text-[7.5px] uppercase tracking-widest text-white/50 font-mono">Fase Atmosférica</span>
          <span className="text-xs font-bold text-white font-sans">{language === 'pt' ? twilightPhase.namePt : twilightPhase.nameEn}</span>
        </div>
      </div>

      {/* Twilight Info Modal Popover */}
      <AnimatePresence>
        {showTwilightInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-28 right-4 w-80 bg-slate-900/95 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-50 text-white font-sans text-xs flex flex-col gap-3"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="font-bold text-sm text-white">Atmosphere & Crepúsculo</span>
              </div>
              <button 
                onClick={() => setShowTwilightInfo(false)}
                className="text-white/50 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-white/80 text-[11px] leading-relaxed">
              {language === 'pt' ? twilightPhase.descPt : twilightPhase.descEn}
            </p>

            <div className="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-[10px]">
              <div>
                <span className="text-white/40 block">Elevação Solar:</span>
                <span className="font-bold text-amber-300">{altitude.toFixed(2)}°</span>
              </div>
              <div>
                <span className="text-white/40 block">Azimute Solar:</span>
                <span className="font-bold text-amber-300">{azimuth.toFixed(1)}°</span>
              </div>
              <div>
                <span className="text-white/40 block">Pôr do Sol (Sunset):</span>
                <span className="font-bold text-rose-400">{solarEventsData.sunsetAz.toFixed(0)}° Az</span>
              </div>
              <div>
                <span className="text-white/40 block">Nascer do Sol (Sunrise):</span>
                <span className="font-bold text-emerald-400">{solarEventsData.sunriseAz.toFixed(0)}° Az</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[9.5px] text-white/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Hora de Ouro: +6° a 0° (Luz dourada rasante)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Crepúsculo Civil: 0° a -6° (Hora Azul & Pôr do sol)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Crepúsculo Náutico (-6° a -12°): Apenas estrelas mais brilhantes (mag ≤ 1.5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Crepúsculo Astronômico (-12° a -18°): Todas as estrelas visíveis & girando</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Noite Astronômica (&lt; -18°): 100% de visibilidade estelar plena</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celestial Pole Educational Modal Popover */}
      <AnimatePresence>
        {showPoleInfoModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="max-w-md w-full bg-slate-900/95 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white font-sans">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                    <Orbit size={20} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {language === 'pt' ? celestialPole.namePt : celestialPole.nameEn}
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-300">
                      Ponto Fixo de Rotação Celeste da Terra
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPoleInfoModal(false)}
                  className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-white/80 leading-relaxed">
                {language === 'pt' ? celestialPole.descriptionPt : celestialPole.descriptionEn}
              </p>

              <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/10 font-mono text-[11px]">
                <div>
                  <span className="text-white/40 block text-[9px]">Azimute Real:</span>
                  <span className="font-bold text-cyan-300">{celestialPole.az}° ({celestialPole.az === 180 ? 'Sul Verdadeiro' : (celestialPole.az === 0 ? 'Norte Verdadeiro' : 'Horizonte')})</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px]">Altitude (Elevação):</span>
                  <span className="font-bold text-cyan-300">{celestialPole.alt.toFixed(2)}° (Latitude)</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px]">Sentido de Giro:</span>
                  <span className="font-bold text-amber-300">{celestialPole.rotationDirectionPt}</span>
                </div>
                <div>
                  <span className="text-white/40 block text-[9px]">Estrela / Guia:</span>
                  <span className="font-bold text-emerald-300">{celestialPole.anchorStar}</span>
                </div>
              </div>

              <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-xl p-3 text-[10px] text-cyan-200/90 leading-relaxed flex flex-col gap-1">
                <span className="font-bold text-cyan-300">💡 Como funciona a rotação:</span>
                <span>
                  À medida que a Terra gira em seu eixo a cada 23h56m (dia sideral), todas as estrelas descrevem círculos concêntricos perfeitos ao redor deste ponto. Quanto mais perto do pólo, menor o raio do círculo diurno!
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    snapToAzimuth(celestialPole.az, Math.max(0, celestialPole.alt));
                    setShowPoleInfoModal(false);
                  }}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Orbit size={14} />
                  <span>Centralizar Câmera no Pólo</span>
                </button>
                <button
                  onClick={() => setShowPoleInfoModal(false)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Altitude Reference Guide Lines in Device Mode (+60°, +30°, -30°, -60°) */}
      {scope === 'device' && altitudeGuideLines.map((line, idx) => {
        if (!line.visible) return null;
        return (
          <div 
            key={`alt-line-${line.alt}-${idx}`}
            className="absolute left-0 right-0 h-[1px] pointer-events-none z-10 flex items-center justify-between px-8"
            style={{ 
              top: `${line.y}%`,
              background: `linear-gradient(90deg, transparent 0%, ${line.color} 15%, ${line.color} 85%, transparent 100%)`,
              borderTop: `1px dashed ${line.color}`
            }}
          >
            <span 
              className={`text-[8px] font-mono tracking-widest uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${
                line.isVisibleZone 
                  ? 'text-cyan-300 bg-sky-950/70 border border-cyan-500/30' 
                  : 'text-purple-300 bg-purple-950/70 border border-purple-500/30'
              }`}
            >
              {language === 'pt' ? line.labelPt : line.labelEn}
            </span>
            <span 
              className={`text-[8px] font-mono tracking-widest uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${
                line.isVisibleZone 
                  ? 'text-cyan-300 bg-sky-950/70 border border-cyan-500/30' 
                  : 'text-purple-300 bg-purple-950/70 border border-purple-500/30'
              }`}
            >
              {line.alt > 0 ? `+${line.alt}°` : `${line.alt}°`}
            </span>
          </div>
        );
      })}

      {/* ZENITH (+90° Altitude - Highest Point / Top of Visible Sky) */}
      {scope === 'device' && zenithCoords.y >= -20 && zenithCoords.y <= 120 && (
        <div 
          className="absolute z-20 pointer-events-none flex flex-col items-center select-none"
          style={{
            left: `${zenithCoords.x}%`,
            top: `${zenithCoords.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Glowing concentric reticle rings */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/60 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full border border-cyan-300/80 animate-spin-slow" />
            <div className="absolute inset-4 rounded-full bg-amber-400/20 backdrop-blur-xs border border-amber-400/80" />
            {/* Crosshair ticks */}
            <div className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
            <div className="absolute h-20 w-0.5 bg-gradient-to-b from-transparent via-cyan-300 to-transparent" />
            <span className="text-[10px] font-bold text-amber-200 z-10">✦</span>
          </div>

          {/* Zenith Badge */}
          <div className="mt-2 text-center bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/40 shadow-2xl flex flex-col items-center">
            <span className="text-[9px] font-mono font-black text-amber-300 tracking-wider">
              ✦ {language === 'pt' ? 'ZÊNITE (+90° ALTITUDE - TOPO)' : 'ZENITH (+90° ALTITUDE - TOP)'}
            </span>
            <span className="text-[7.5px] font-mono text-cyan-300/80 tracking-widest uppercase">
              {language === 'pt' ? 'HORIZONTE VISÍVEL: 0° A +90°' : 'VISIBLE HORIZON: 0° TO +90°'}
            </span>
          </div>
        </div>
      )}

      {/* NADIR (-90° Altitude - Lowest Point / Bottom of Non-Visible Subterranean Sphere) */}
      {scope === 'device' && nadirCoords.y >= -20 && nadirCoords.y <= 120 && (
        <div 
          className="absolute z-20 pointer-events-none flex flex-col items-center select-none"
          style={{
            left: `${nadirCoords.x}%`,
            top: `${nadirCoords.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Subterranean concentric reticle rings */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/60 animate-ping opacity-30" />
            <div className="absolute inset-2 rounded-full border border-indigo-400/80 animate-spin-slow" />
            <div className="absolute inset-4 rounded-full bg-purple-900/30 backdrop-blur-xs border border-purple-400/80" />
            {/* Crosshair ticks */}
            <div className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
            <div className="absolute h-20 w-0.5 bg-gradient-to-b from-transparent via-purple-400 to-transparent" />
            <span className="text-[10px] font-bold text-purple-200 z-10">▼</span>
          </div>

          {/* Nadir Badge */}
          <div className="mt-2 text-center bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/40 shadow-2xl flex flex-col items-center">
            <span className="text-[9px] font-mono font-black text-purple-300 tracking-wider">
              ▼ {language === 'pt' ? 'NADIR (-90° ALTITUDE - FUNDO)' : 'NADIR (-90° ALTITUDE - BOTTOM)'}
            </span>
            <span className="text-[7.5px] font-mono text-indigo-300/80 tracking-widest uppercase">
              {language === 'pt' ? 'HORIZONTE NÃO VISÍVEL: 0° A -90°' : 'NON-VISIBLE HORIZON: 0° TO -90°'}
            </span>
          </div>
        </div>
      )}

      {/* Horizon dividing line in Device mode (0° Altitude) */}
      {scope === 'device' && horizonY >= -15 && horizonY <= 115 && (
        <div 
          className="absolute left-0 right-0 h-[2px] pointer-events-none z-20 flex items-center justify-between px-6"
          style={{ 
            top: `${horizonY}%`,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.1) 100%)',
            boxShadow: '0 0 12px 2px rgba(255, 255, 255, 0.4)'
          }}
        >
          <div className="flex items-center gap-2 -top-5 absolute left-6 bg-slate-950/80 px-2.5 py-0.5 rounded-t-md border-t border-x border-cyan-400/40">
            <span className="text-[8px] font-mono text-cyan-300 tracking-[0.15em] uppercase font-bold flex items-center gap-1">
              <span>▲</span> {language === 'pt' ? 'HORIZONTE VISÍVEL (0° a +90°)' : 'VISIBLE HORIZON (0° to +90°)'}
            </span>
          </div>

          <div className="flex items-center gap-2 top-1 absolute left-6 bg-slate-950/90 px-2.5 py-0.5 rounded-b-md border-b border-x border-purple-500/40">
            <span className="text-[8px] font-mono text-purple-300 tracking-[0.15em] uppercase font-bold flex items-center gap-1">
              <span>▼</span> {language === 'pt' ? 'HORIZONTE NÃO VISÍVEL (0° a -90°)' : 'NON-VISIBLE HORIZON (0° to -90°)'}
            </span>
          </div>

          <div className="absolute right-6 -top-3 text-[8.5px] font-mono text-white/90 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-white/20 tracking-wider font-bold">
            0° LINHA DO HORIZONTE
          </div>
        </div>
      )}

      {/* Dynamic Subterranean Hemisphere Surface below horizon (0° to -90° Non-Visible Zone) */}
      {scope === 'device' && horizonY < 115 && (
        <div 
          className="absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-300 ease-out border-t-2 overflow-hidden"
          style={{ 
            top: `${Math.max(0, horizonY)}%`,
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 30, 0.94) 40%, rgba(2, 6, 23, 0.98) 100%)',
            borderTopColor: 'rgba(255, 255, 255, 0.35)',
            zIndex: 10
          }}
        >
          {/* Subterranean grid wireframe */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.3) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 40px 40px, 40px 40px'
            }}
          />

          {/* Subterranean Region Badge */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-950/80 border border-purple-500/30 px-3 py-1 rounded-full backdrop-blur-md text-[8px] font-mono text-purple-300 uppercase tracking-widest shadow-xl flex items-center gap-1.5">
            <span>🟣</span>
            <span>{language === 'pt' ? 'ESPAÇO SUBTERRÂNEO • 0° A -90° ALTITUDE' : 'SUBTERRANEAN SPACE • 0° TO -90° ALTITUDE'}</span>
          </div>
        </div>
      )}

      {/* Scattered grass clumps and wildflower features on the horizon grass plain */}
      {scope === 'device' && groundFeatures.map((feat, idx) => {
        const coords = getScreenCoords(feat.az, feat.alt);
        if (coords.x < -10 || coords.x > 110 || coords.y < horizonY || coords.y > 110) return null;
        
        return (
          <div
            key={`ground-feat-${idx}`}
            className="absolute pointer-events-none select-none transition-transform duration-75"
            style={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: 15
            }}
          >
            {feat.type === 'grass' && (
              <svg className="text-emerald-500/80 fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 28 * feat.scale, height: 28 * feat.scale }}>
                <path d="M2,22 C4,14 8,8 12,22 M12,22 C13,12 16,6 20,22 M7,22 C9,16 11,12 13,22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            )}
            {feat.type === 'flower' && (
              <svg className="text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 22 * feat.scale, height: 22 * feat.scale }}>
                <line x1="12" y1="24" x2="12" y2="10" stroke="#15803d" strokeWidth="2.5" />
                <circle cx="12" cy="10" r="4.5" fill="currentColor" />
                <circle cx="12" cy="10" r="1.5" fill="white" />
              </svg>
            )}
            {feat.type === 'tallGrass' && (
              <svg className="text-green-400/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 34 * feat.scale, height: 34 * feat.scale }}>
                <path d="M3,22 C5,10 7,4 10,22 M10,22 C12,8 14,3 17,22 M14,22 C16,12 18,7 21,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            )}
            {feat.type === 'tulip' && (
              <svg className="text-rose-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 24 24" style={{ width: 20 * feat.scale, height: 20 * feat.scale }}>
                <line x1="12" y1="24" x2="12" y2="12" stroke="#15803d" strokeWidth="2" />
                <path d="M8,12 C8,8 10,6 12,12 C14,6 16,8 16,12 C16,15 14,16 12,16 C10,16 8,15 8,12 Z" fill="currentColor" />
              </svg>
            )}
          </div>
        );
      })}

      {/* Compass markers on Horizon */}
      {scope === 'device' && compassMarkers.filter(m => m.visible).map((marker, idx) => (
        <div 
          key={`cardinal-${marker.label}-${marker.az}-${idx}`}
          className={`absolute font-mono rounded-full backdrop-blur-md pointer-events-none flex items-center gap-1 shadow-lg z-25 transition-all ${
            marker.isMajor 
              ? 'text-white border border-white/20 px-2.5 py-1 bg-slate-900/80 font-bold text-xs tracking-widest' 
              : 'text-white/40 border border-white/10 px-1.5 py-0.5 bg-slate-950/60 text-[9px]'
          }`}
          style={{
            left: `${marker.x}%`,
            top: `${marker.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span>{marker.label}</span>
          <span className="text-[8px] opacity-50 font-normal">{marker.az}°</span>
        </div>
      ))}

      {/* REALISTIC SUNSET DIRECTION HORIZON MARKER (Pôr do Sol) */}
      {scope === 'device' && sunsetCoords.x >= -10 && sunsetCoords.x <= 110 && sunsetCoords.y >= -10 && sunsetCoords.y <= 110 && (
        <div 
          className="absolute z-30 pointer-events-none flex flex-col items-center animate-pulse"
          style={{
            left: `${sunsetCoords.x}%`,
            top: `${sunsetCoords.y}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white font-mono text-[10px] px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 border border-amber-300/40 font-bold tracking-wider mb-1">
            <Sunset size={14} className="text-amber-200" />
            <span>PÔR DO SOL: {solarEventsData.sunsetAz.toFixed(0)}°</span>
          </div>
          <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-transparent" />
        </div>
      )}

      {/* REALISTIC SUNRISE DIRECTION HORIZON MARKER (Nascer do Sol) */}
      {scope === 'device' && sunriseCoords.x >= -10 && sunriseCoords.x <= 110 && sunriseCoords.y >= -10 && sunriseCoords.y <= 110 && (
        <div 
          className="absolute z-30 pointer-events-none flex flex-col items-center animate-pulse"
          style={{
            left: `${sunriseCoords.x}%`,
            top: `${sunriseCoords.y}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gradient-to-r from-emerald-600 to-amber-500 text-white font-mono text-[10px] px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 border border-emerald-300/40 font-bold tracking-wider mb-1">
            <Sunrise size={14} className="text-emerald-200" />
            <span>NASCER DO SOL: {solarEventsData.sunriseAz.toFixed(0)}°</span>
          </div>
          <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-transparent" />
        </div>
      )}

      {/* REALISTIC SUN DISC, ATMOSPHERIC HALO & SUBTERRANEAN ORBIT TRACKING */}
      {isSunVisible && (
        <div 
          className={`absolute pointer-events-none ${altitude >= 0 ? 'z-25' : 'z-15'}`}
          style={{
            left: `${sunCoords.x}%`,
            top: `${sunCoords.y}%`,
            transform: `translate(-50%, -50%) scale(${altitude >= 0 ? sunVisuals.discScale : 0.85})`
          }}
        >
          {altitude >= 0 ? (
            /* Visible Open-Sky Sun (0° to +90° Altitude) */
            <>
              {/* Intense Outer Atmospheric Corona Bloom */}
              <div 
                className="absolute rounded-full -inset-24 animate-pulse pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${sunVisuals.outerGlow} 0%, rgba(251, 191, 36, 0.15) 45%, rgba(0,0,0,0) 75%)`
                }}
              />

              {/* Inner Solar Corona Glow */}
              <div 
                className="absolute rounded-full -inset-10 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${sunVisuals.coronaColor} 0%, rgba(255, 255, 255, 0.4) 50%, rgba(0,0,0,0) 80%)`,
                  filter: 'blur(4px)'
                }}
              />

              {/* Actual Sun Core Disc */}
              <div 
                className="rounded-full relative flex items-center justify-center shadow-2xl transition-all duration-300"
                style={{
                  width: `${sunCoreSizePx}px`,
                  height: `${sunCoreSizePx}px`,
                  backgroundColor: sunVisuals.coreColor,
                  boxShadow: `0 0 50px 15px ${sunVisuals.coronaColor}, 0 0 100px 30px ${sunVisuals.outerGlow}`
                }}
              >
                {/* Solar Flare Spikes */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <div className="w-28 h-0.5 bg-amber-200 rounded-full blur-[1px]" />
                  <div className="h-28 w-0.5 bg-amber-200 rounded-full blur-[1px] absolute" />
                </div>

                {/* Sun Icon Vector inside core */}
                <Sun size={Math.max(16, Math.min(48, sunCoreSizePx * 0.45))} className="text-amber-500 opacity-75 animate-spin-slow" />
              </div>

              {/* Elevation tag below Visible Sun */}
              <div className="text-center mt-3 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-amber-400/30 font-mono text-[9px] text-amber-300 tracking-wider shadow-lg">
                ☀️ {altitude.toFixed(1)}° Alt • {azimuth.toFixed(0)}° Az [Céu Visível]
              </div>

              {/* Anamorphic Lens Flare Line (When facing Sun in Device Mode) */}
              {scope === 'device' && sunVisuals.flareIntensity > 0.3 && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[3px] pointer-events-none opacity-40 blur-[1px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.8) 50%, transparent 100%)'
                  }}
                />
              )}
            </>
          ) : (
            /* Subterranean Sun (0° to -90° Non-Visible Subterranean Zone) */
            <div className="flex flex-col items-center select-none">
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/50 animate-spin-slow" />
                <div className="absolute inset-2 rounded-full bg-amber-950/60 border border-amber-400/40 backdrop-blur-xs flex items-center justify-center">
                  <Sun size={20} className="text-amber-400/80" />
                </div>
              </div>

              <div className="text-center mt-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-purple-500/40 font-mono text-[8.5px] text-amber-300 tracking-wider shadow-lg flex flex-col items-center">
                <span>☀️ Sol (Subterrâneo): {altitude.toFixed(1)}° Alt</span>
                <span className="text-[7px] text-purple-300/70 uppercase">{language === 'pt' ? '[Não Visível no Céu]' : '[Below Horizon / Hidden]'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REALISTIC MOON DISC & SUBTERRANEAN TRACKING */}
      {isMoonVisible && (
        <div 
          className={`absolute pointer-events-none ${moonAltDeg >= 0 ? 'z-25' : 'z-15'}`}
          style={{
            left: `${moonCoords.x}%`,
            top: `${moonCoords.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {moonAltDeg >= 0 ? (
            /* Visible Moon in Sky (0° to +90°) */
            <>
              {/* Lunar Moonlight Halo */}
              <div 
                className="absolute rounded-full -inset-12 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(224, 242, 254, 0.35) 0%, rgba(186, 230, 253, 0.1) 40%, rgba(0,0,0,0) 75%)'
                }}
              />

              {/* Moon Disc */}
              <div 
                className="rounded-full bg-slate-100 relative shadow-2xl flex items-center justify-center border border-white/40 overflow-hidden transition-all duration-300"
                style={{
                  width: `${moonCoreSizePx}px`,
                  height: `${moonCoreSizePx}px`
                }}
              >
                {/* Realistic Phase Shadow Mask */}
                <div 
                  className="absolute inset-0 bg-slate-950/85 transition-all"
                  style={{
                    clipPath: moonPhase < 0.5 
                      ? `polygon(0 0, ${Math.round((1 - moonPhase * 2) * 100)}% 0, ${Math.round((1 - moonPhase * 2) * 100)}% 100%, 0 100%)`
                      : `polygon(${Math.round((moonPhase - 0.5) * 200)}% 0, 100% 0, 100% 100%, ${Math.round((moonPhase - 0.5) * 200)}% 100%)`
                  }}
                />
                <Moon size={Math.max(12, Math.min(40, moonCoreSizePx * 0.5))} className="text-slate-300 drop-shadow-md z-10" />
              </div>

              <div className="text-center mt-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 font-mono text-[9px] text-sky-200 tracking-wider shadow-lg">
                🌕 {moonAltDeg.toFixed(1)}° Alt • {Math.round(moonPhase * 100)}% Ilum.
              </div>
            </>
          ) : (
            /* Subterranean Moon (0° to -90° Non-Visible) */
            <div className="flex flex-col items-center select-none">
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-sky-400/40 animate-spin-slow" />
                <div className="absolute inset-1 rounded-full bg-slate-900/80 border border-sky-300/30 flex items-center justify-center">
                  <Moon size={16} className="text-sky-300/70" />
                </div>
              </div>

              <div className="text-center mt-1.5 bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-500/40 font-mono text-[8px] text-sky-200 tracking-wider shadow-lg flex flex-col items-center">
                <span>🌕 Lua (Subterrânea): {moonAltDeg.toFixed(1)}° Alt</span>
                <span className="text-[7px] text-purple-300/70 uppercase">{language === 'pt' ? '[Não Visível no Céu]' : '[Below Horizon]'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Clouds Layer */}
      {cloudMode !== 'off' && activeClouds.map((cloud, cIdx) => {
        const currentAz = (cloud.baseAz + skyTimeOffset) % 360;
        const coords = getScreenCoords(currentAz, cloud.baseAlt);
        
        if (scope === 'device' && (coords.x < -30 || coords.x > 130 || coords.y < -30 || coords.y > 130)) {
          return null;
        }
        if (scope !== 'device' && cloud.baseAlt <= 0) {
          return null;
        }
        
        const { fill, opacity: baseOpacity } = getCloudColorAndOpacity(altitude, cloudMode as 'trend' | 'heavy' | 'medium' | 'light' | 'off');
        const finalOpacity = baseOpacity * cloudOpacity;
        const zoomScale = scope === 'device' ? 180 / (180 - deviceZoom * 2) : 1;
        const finalScale = cloud.scale * zoomScale;
        
        return (
          <div
            key={`skyview-cloud-${cloud.id}-${cIdx}`}
            className="absolute pointer-events-none select-none z-10 transition-all duration-100 ease-linear"
            style={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: finalOpacity,
            }}
          >
            <svg 
              width={90 * finalScale} 
              height={60 * finalScale} 
              viewBox="0 0 120 80"
              className="opacity-90"
            >
              <path d={CLOUD_SHAPES[cloud.shapeIdx]} fill={fill} className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]" />
            </svg>
          </div>
        );
      })}

      {/* Cloud Control Panel */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 bg-black/60 border border-white/15 rounded-2xl p-3.5 backdrop-blur-md z-40 max-sm:left-2 w-44 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
      >
        <div className="flex flex-col items-center gap-1">
          <Cloud className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-[9px] font-sans font-black tracking-[0.15em] text-amber-400 uppercase">
            {language === 'pt' ? 'Nuvens' : 'Clouds'}
          </span>
          {isOptimizationMode && (
            <div className="text-[7.5px] text-emerald-400 font-mono uppercase font-black text-center mt-1 animate-pulse border border-emerald-400/20 bg-emerald-400/5 px-1.5 py-0.5 rounded leading-tight max-w-[120px]">
              {language === 'pt' ? 'POOLING ATIVO' : 'POOL ACTIVE'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 w-full">
          {(['trend', 'heavy', 'medium', 'light', 'off'] as const).map((mode) => {
            const isActive = cloudMode === mode;
            const labels = {
              trend: language === 'pt' ? 'Tendência' : 'Trend',
              heavy: language === 'pt' ? 'Pesado' : 'Heavy',
              medium: language === 'pt' ? 'Médio' : 'Medium',
              light: language === 'pt' ? 'Leve' : 'Light',
              off: language === 'pt' ? 'Desativar' : 'Off'
            };
            return (
              <button
                key={mode}
                onClick={() => onCloudModeChange?.(mode)}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all duration-200 border cursor-pointer text-center ${
                  isActive 
                    ? 'bg-amber-400/20 text-amber-400 border-amber-400/30 shadow-md' 
                    : 'bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        <div className="w-full h-[1px] bg-white/10 my-0.5" />

        {/* Cloud Opacity Slider */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-wider text-white/40">
            <span>{language === 'pt' ? 'Opacidade' : 'Opacity'}</span>
            <span className="text-amber-400 font-bold">{Math.round(cloudOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={cloudOpacity}
            onChange={(e) => onCloudOpacityChange?.(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
        </div>

        {/* Historical Trend Detailed Info */}
        {cloudMode === 'trend' && (
          <div className="w-full border border-white/5 bg-white/5 rounded-xl p-2 flex flex-col gap-1">
            <div className="text-[7px] font-bold text-white/30 uppercase tracking-widest leading-none">
              {language === 'pt' ? 'Média Histórica' : 'Historical Mean'}
            </div>
            <div className="text-[7.5px] font-sans font-black text-amber-300 leading-tight">
              timeanddate.com
            </div>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-[11px] font-mono font-black text-white leading-none">
                {trendResult.percentage}%
              </span>
              <span className="text-[7px] text-white/40 font-mono">
                Lat: {Math.round(lat)}°
              </span>
            </div>
            <div className="text-[7.5px] text-white/85 leading-tight font-sans tracking-wide">
              {language === 'pt' ? trendResult.descriptionPt : trendResult.descriptionEn}
            </div>
          </div>
        )}
      </div>
      
      {/* Sun direction guidance when off-screen */}
      {sunHeadingGuide && (
        <div 
          onClick={() => snapToAzimuth(azimuth, Math.max(0, altitude))}
          className={`absolute bottom-24 ${sunHeadingGuide.direction === 'left' ? 'left-6 animate-bounce' : 'right-6 animate-bounce'} bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl backdrop-blur-md z-40 cursor-pointer hover:bg-amber-500/30 transition-all`}
        >
          {sunHeadingGuide.direction === 'left' ? (
            <>
              <span>←</span>
              <span>SOL À ESQUERDA ({sunHeadingGuide.degrees.toFixed(0)}°) - CLIQUE PARA OLHAR</span>
            </>
          ) : (
            <>
              <span>SOL À DIREITA ({sunHeadingGuide.degrees.toFixed(0)}°) - CLIQUE PARA OLHAR</span>
              <span>→</span>
            </>
          )}
        </div>
      )}

      {/* Zoom Control Panel & Fast Celestial Navigation Snaps */}
      {scope === 'device' && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 bg-black/60 border border-white/15 rounded-2xl p-3.5 backdrop-blur-md z-40 max-sm:right-2 shadow-2xl"
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-sans font-black tracking-[0.15em] text-amber-400 uppercase">
              {language === 'pt' ? 'Zoom do Céu' : 'Sky Zoom'}
            </span>
          </div>

          <div className="h-28 flex items-center justify-center relative my-1">
            <input 
              type="range"
              min="-45"
              max="45"
              value={deviceZoom}
              onChange={(e) => setDeviceZoom(parseInt(e.target.value, 10))}
              className="accent-amber-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none -rotate-90 origin-center w-24 text-amber-400"
              style={{
                WebkitAppearance: 'none',
              }}
            />
          </div>

          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              {equivalentFocalLength}mm ({zoomMultiplier.toFixed(1)}x)
            </span>
            <div className="flex gap-1 w-full mt-1">
              <button
                onClick={() => setDeviceZoom(0)}
                className="flex-1 text-[8px] font-mono font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white py-1 rounded-lg border border-white/10 transition-all uppercase"
                title="Redefinir para Lente Padrão 26mm (1.0x)"
              >
                1.0x
              </button>
              <button
                onClick={() => setShowARGrid(!showARGrid)}
                className={`px-2 text-[8px] font-mono font-bold py-1 rounded-lg border transition-all uppercase cursor-pointer ${
                  showARGrid ? 'bg-amber-500/30 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-white/40'
                }`}
                title="Alternar Grade AR, Retículo e Escala Angular Real"
              >
                Grade
              </button>
            </div>
          </div>

          <div className="w-full h-[1px] bg-white/10 my-1" />

          {/* Quick Astronomical Look Snaps */}
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[7.5px] uppercase font-mono text-white/40 text-center tracking-wider">
              {language === 'pt' ? 'Altitudes & Pontos' : 'Altitudes & Points'}
            </span>

            {/* +90° Zenith Snap */}
            <button
              onClick={() => snapToPitch(90)}
              className="flex items-center gap-1 text-[8px] font-mono bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30 transition-all font-bold cursor-pointer"
              title="Olhar direto para o Zênite (+90° Altitude - Topo do Céu Visível)"
            >
              <span>✦</span>
              <span>{language === 'pt' ? 'Zênite (+90°)' : 'Zenith (+90°)'}</span>
            </button>

            {/* 0° Horizon Snap */}
            <button
              onClick={() => snapToPitch(0)}
              className="flex items-center gap-1 text-[8px] font-mono bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/30 transition-all font-bold cursor-pointer"
              title="Olhar nivelado no Horizonte (0° Altitude - Divisória)"
            >
              <Compass size={10} />
              <span>{language === 'pt' ? 'Horizonte (0°)' : 'Horizon (0°)'}</span>
            </button>

            {/* -90° Nadir Snap */}
            <button
              onClick={() => snapToPitch(-90)}
              className="flex items-center gap-1 text-[8px] font-mono bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-2 py-1 rounded-lg border border-purple-500/30 transition-all font-bold cursor-pointer"
              title="Olhar direto para o Nadir (-90° Altitude - Fundo do Horizonte Não Visível)"
            >
              <span>▼</span>
              <span>{language === 'pt' ? 'Nadir (-90°)' : 'Nadir (-90°)'}</span>
            </button>

            <div className="w-full h-[1px] bg-white/10 my-0.5" />
            <span className="text-[7.5px] uppercase font-mono text-white/40 text-center tracking-wider">
              {language === 'pt' ? 'Astros & Direção' : 'Astro & Direction'}
            </span>
            
            <button
              onClick={() => snapToAzimuth(celestialPole.az, Math.max(0, celestialPole.alt))}
              className="flex items-center gap-1 text-[8px] font-mono bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/30 transition-all font-bold cursor-pointer"
              title={`Olhar na direção do ${celestialPole.namePt} (Ponto fixo de rotação celeste)`}
            >
              <Orbit size={10} className="animate-spin-slow" />
              <span>{celestialPole.hemisphere === 'south' ? 'Pólo Sul' : 'Pólo Norte'}</span>
            </button>

            <button
              onClick={() => snapToAzimuth(solarEventsData.sunsetAz, 0)}
              className="flex items-center gap-1 text-[8px] font-mono bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-2 py-1 rounded-lg border border-rose-500/30 transition-all font-bold cursor-pointer"
              title="Olhar na direção do Pôr do Sol no Horizonte"
            >
              <Sunset size={10} />
              <span>Pôr do Sol</span>
            </button>

            <button
              onClick={() => snapToAzimuth(solarEventsData.sunriseAz, 0)}
              className="flex items-center gap-1 text-[8px] font-mono bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/30 transition-all font-bold cursor-pointer"
              title="Olhar na direção do Nascer do Sol no Horizonte"
            >
              <Sunrise size={10} />
              <span>Nascer Sol</span>
            </button>

            <button
              onClick={() => snapToAzimuth(azimuth, altitude)}
              className="flex items-center gap-1 text-[8px] font-mono bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30 transition-all font-bold cursor-pointer"
              title={`Olhar na direção do Sol (${altitude >= 0 ? 'Visível' : 'Subterrâneo'})`}
            >
              <Sun size={10} />
              <span>Ver Sol</span>
            </button>

            <button
              onClick={() => setShowStarTrails(!showStarTrails)}
              className={`flex items-center gap-1 text-[8px] font-mono px-2 py-1 rounded-lg border transition-all font-bold mt-1 cursor-pointer ${
                showStarTrails 
                  ? 'bg-indigo-500/30 text-indigo-200 border-indigo-500/50' 
                  : 'bg-white/5 text-white/40 border-white/10'
              }`}
              title="Alternar anéis de rotação estelar ao redor do pólo"
            >
              <RotateCw size={10} className={showStarTrails ? 'animate-spin-slow' : ''} />
              <span>{showStarTrails ? 'Órbitas ON' : 'Órbitas OFF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Vertical Altitude Ruler Scale (Gauge) in Device Mode */}
      {scope === 'device' && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-1 bg-black/60 border border-white/15 rounded-2xl py-3 px-2 backdrop-blur-md z-40 shadow-2xl text-[8px] font-mono"
        >
          <span className="text-[7px] text-amber-400 font-bold uppercase tracking-wider mb-1">
            ALT
          </span>
          <div className="flex flex-col items-center justify-between h-56 w-8 relative">
            {/* Altitude markers */}
            {[
              { val: 90, label: '+90°', tip: 'Zênite (Topo)' },
              { val: 60, label: '+60°', tip: 'Céu Visível' },
              { val: 30, label: '+30°', tip: 'Céu Visível' },
              { val: 0, label: '0°', tip: 'Horizonte' },
              { val: -30, label: '-30°', tip: 'Não Visível' },
              { val: -60, label: '-60°', tip: 'Não Visível' },
              { val: -90, label: '-90°', tip: 'Nadir (Fundo)' }
            ].map(mark => (
              <button
                key={`alt-gauge-${mark.val}`}
                onClick={() => snapToPitch(mark.val)}
                className={`flex items-center gap-1 transition-all cursor-pointer ${
                  Math.abs(devicePitch - mark.val) < 15 
                    ? 'text-amber-300 font-bold scale-110' 
                    : (mark.val >= 0 ? 'text-white/60 hover:text-white' : 'text-purple-300/60 hover:text-purple-300')
                }`}
                title={`Clique para olhar em ${mark.label} (${mark.tip})`}
              >
                <span>{mark.label}</span>
              </button>
            ))}

            {/* Real-time sight line needle */}
            <div 
              className="absolute right-0 w-2 h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] rounded-full transition-all duration-75"
              style={{
                top: `${((90 - devicePitch) / 180) * 100}%`
              }}
            />
          </div>
          <span className="text-[7.5px] text-amber-300 font-bold mt-1 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20">
            {devicePitch > 0 ? `+${devicePitch.toFixed(0)}°` : `${devicePitch.toFixed(0)}°`}
          </span>
        </div>
      )}

      {/* Interaction Help Tip & Exit Controls */}
      {scope === 'device' && (
        <>
          <div 
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-20 flex flex-wrap justify-center gap-3 z-30 px-4"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleScopeSelect('all');
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-bold text-xs px-5 py-2.5 rounded-full shadow-2xl hover:shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-amber-400/40"
            >
              <span>↩️ Vista Plana do Hemisfério</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-red-600/90 hover:bg-red-500 text-white font-sans font-bold text-xs px-5 py-2.5 rounded-full shadow-2xl hover:shadow-red-600/25 transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-red-500/40"
            >
              <X size={14} />
              <span>Fechar Mapa do Céu</span>
            </button>
          </div>

          <div className="absolute bottom-10 bg-black/70 border border-white/15 text-white/90 font-mono text-[10px] px-5 py-2 rounded-full backdrop-blur-lg shadow-2xl tracking-widest uppercase flex items-center gap-2 z-30">
            <Navigation size={12} className="text-amber-400 animate-spin-slow" />
            <span>🖱️ Arraste para girar 360° • 📱 Incline o celular na direção real</span>
          </div>
        </>
      )}

      {/* Civil Time Bottom Left */}
      <div className="absolute bottom-4 left-4 text-white/80 font-mono text-base z-40 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
        🕒 {civilTimeStr}
      </div>

      {/* Solar Time Bottom Right */}
      <div className="absolute bottom-4 right-4 text-amber-300 font-mono text-base z-40 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
        ☀️ {solarTimeStr}
      </div>

      {/* Orientation Permission Guidance Modal */}
      {scope === 'device' && permissionState !== 'granted' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
          <div className="max-w-md w-full bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="p-4 bg-amber-500/10 rounded-full text-amber-400">
              <Compass size={48} className="animate-spin-slow" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-sans font-bold text-white">Rastreamento 3D do Céu Real</h3>
              <p className="text-sm text-slate-300 font-sans leading-relaxed">
                Aponte seu celular para o horizonte ou para o alto para ver o Sol, a Lua, o Pôr do Sol e as estrelas exatamente onde eles estão no céu físico da sua localização.
              </p>
            </div>

            {permissionState === 'denied' ? (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-xs text-red-200 flex flex-col gap-2 text-left w-full">
                <span className="font-semibold text-red-300">Permissão de Sensores Bloqueada:</span>
                <p>
                  Ative o giroscópio e a bússola nas configurações do seu navegador móvel para tracking automático por movimento, ou use o controle de mouse e toque abaixo.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={requestOrientationPermission}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer"
              >
                <Smartphone size={18} />
                <span>Ativar Sensores do Aparelho</span>
              </button>

              <button 
                onClick={() => setPermissionState('granted')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold py-3 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 cursor-pointer"
              >
                <Eye size={16} />
                <span>Navegar com Toque / Mouse (360°)</span>
              </button>
              
              <button 
                onClick={() => onScopeChange('all')}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-sans py-2.5 rounded-2xl transition-colors cursor-pointer"
              >
                Voltar para Vista Plana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
