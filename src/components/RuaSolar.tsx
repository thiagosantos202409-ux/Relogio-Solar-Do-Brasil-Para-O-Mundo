import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, X, Clock, Eye, Sparkles, Info, Building, Trees, Cpu, Cloud, Lightbulb, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { getSolarGradient } from '../lib/solarTime';
import { calculateHistoricalClouds } from '../lib/cloudTrend';
import SunCalc from 'suncalc';

const isCoordinatesInGalicia = (lat?: number, lon?: number): boolean => {
  if (lat === undefined || lon === undefined) return false;
  // Bounding box for Galicia (Spain): Lat [41.8, 43.8], Lon [-9.3, -6.7]
  return lat >= 41.8 && lat <= 43.8 && lon >= -9.3 && lon <= -6.7;
};

const isCoordinatesInContinentalSpain = (lat?: number, lon?: number): boolean => {
  if (lat === undefined || lon === undefined) return false;
  // Bounding box for Continental Spain: Lat [36.0, 43.8], Lon [-9.3, 3.3]
  return lat >= 36.0 && lat <= 43.8 && lon >= -9.3 && lon <= 3.3;
};

const TRAFFIC_KEYPOINTS = [
  { t: 0.0, d: 0.05 },
  { t: 3.5, d: 0.03 },
  { t: 5.0, d: 0.08 },
  { t: 6.5, d: 0.35 },
  { t: 8.0, d: 0.95 },  // Morning Rush Peak
  { t: 9.5, d: 0.50 },
  { t: 11.5, d: 0.45 },
  { t: 12.5, d: 0.75 }, // Lunch Rush Peak
  { t: 14.0, d: 0.50 },
  { t: 16.0, d: 0.55 },
  { t: 18.0, d: 1.00 }, // Evening Rush Peak
  { t: 19.5, d: 0.65 },
  { t: 21.5, d: 0.35 },
  { t: 23.0, d: 0.15 },
  { t: 24.0, d: 0.05 }
];

const getContinuousTrafficDensity = (t: number): number => {
  const normT = (t + 24) % 24;
  let p1 = TRAFFIC_KEYPOINTS[0];
  let p2 = TRAFFIC_KEYPOINTS[TRAFFIC_KEYPOINTS.length - 1];
  for (let i = 0; i < TRAFFIC_KEYPOINTS.length - 1; i++) {
    if (normT >= TRAFFIC_KEYPOINTS[i].t && normT < TRAFFIC_KEYPOINTS[i+1].t) {
      p1 = TRAFFIC_KEYPOINTS[i];
      p2 = TRAFFIC_KEYPOINTS[i+1];
      break;
    }
  }
  const fraction = (normT - p1.t) / (p2.t - p1.t);
  const smoothFraction = fraction * fraction * (3 - 2 * fraction);
  return p1.d + (p2.d - p1.d) * smoothFraction;
};

const CLOUD_SHAPES = [
  "M 25,60 A 20,20 0 0,1 45,30 A 25,25 0 0,1 85,25 A 20,20 0 0,1 105,45 A 15,15 0 0,1 110,60 Z",
  "M 15,50 A 15,15 0 0,1 30,30 A 20,20 0 0,1 65,25 A 18,18 0 0,1 85,40 A 12,12 0 0,1 100,50 Z",
  "M 20,40 A 12,12 0 0,1 32,25 A 15,15 0 0,1 55,20 A 12,12 0 0,1 70,35 Z",
  "M 10,40 Q 25,30 45,35 T 80,35 Q 90,40 95,45 Q 85,50 65,48 T 25,48 Q 15,45 10,40 Z"
];

const STATIC_CLOUDS_DEF = [
  { id: 1, shapeIdx: 0, top: '8%', scale: 1.1, duration: '110s', delay: '-10s', zIndex: 1, baseAz: 30, baseAlt: 45 },
  { id: 2, shapeIdx: 1, top: '15%', scale: 0.85, duration: '140s', delay: '-45s', zIndex: 0, baseAz: 110, baseAlt: 30 },
  { id: 3, shapeIdx: 2, top: '6%', scale: 1.3, duration: '95s', delay: '-20s', zIndex: 2, baseAz: 210, baseAlt: 60 },
  { id: 4, shapeIdx: 3, top: '19%', scale: 0.7, duration: '180s', delay: '-80s', zIndex: 0, baseAz: 280, baseAlt: 15 },
  { id: 5, shapeIdx: 0, top: '12%', scale: 1.0, duration: '130s', delay: '-5s', zIndex: 1, baseAz: 65, baseAlt: 50 },
  { id: 6, shapeIdx: 1, top: '4%', scale: 1.2, duration: '150s', delay: '-60s', zIndex: 1, baseAz: 150, baseAlt: 75 },
  { id: 7, shapeIdx: 2, top: '22%', scale: 0.8, duration: '125s', delay: '-15s', zIndex: 0, baseAz: 340, baseAlt: 20 },
  { id: 8, shapeIdx: 3, top: '10%', scale: 0.95, duration: '115s', delay: '-50s', zIndex: 2, baseAz: 80, baseAlt: 40 },
  { id: 9, shapeIdx: 0, top: '25%', scale: 0.8, duration: '160s', delay: '-30s', zIndex: 0, baseAz: 170, baseAlt: 10 },
  { id: 10, shapeIdx: 1, top: '14%', scale: 1.15, duration: '105s', delay: '-70s', zIndex: 1, baseAz: 245, baseAlt: 55 },
  { id: 11, shapeIdx: 2, top: '5%', scale: 1.25, duration: '120s', delay: '-40s', zIndex: 2, baseAz: 315, baseAlt: 70 },
  { id: 12, shapeIdx: 3, top: '18%', scale: 0.9, duration: '135s', delay: '-90s', zIndex: 0, baseAz: 15, baseAlt: 25 },
  { id: 13, shapeIdx: 0, top: '9%', scale: 1.05, duration: '118s', delay: '-12s', zIndex: 1, baseAz: 135, baseAlt: 48 },
  { id: 14, shapeIdx: 1, top: '21%', scale: 0.75, duration: '190s', delay: '-110s', zIndex: 0, baseAz: 225, baseAlt: 18 },
  { id: 15, shapeIdx: 2, top: '11%', scale: 1.2, duration: '112s', delay: '-25s', zIndex: 2, baseAz: 95, baseAlt: 62 },
  { id: 16, shapeIdx: 3, top: '4%', scale: 1.0, duration: '145s', delay: '-75s', zIndex: 1, baseAz: 190, baseAlt: 80 },
  { id: 17, shapeIdx: 0, top: '17%', scale: 0.85, duration: '165s', delay: '-55s', zIndex: 0, baseAz: 295, baseAlt: 22 },
  { id: 18, shapeIdx: 1, top: '11%', scale: 1.1, duration: '108s', delay: '-35s', zIndex: 1, baseAz: 50, baseAlt: 35 },
  { id: 19, shapeIdx: 2, top: '7%', scale: 1.35, duration: '125s', delay: '-105s', zIndex: 2, baseAz: 160, baseAlt: 68 },
  { id: 20, shapeIdx: 3, top: '23%', scale: 0.75, duration: '155s', delay: '-48s', zIndex: 0, baseAz: 260, baseAlt: 12 },
  { id: 21, shapeIdx: 0, top: '14%', scale: 1.0, duration: '132s', delay: '-18s', zIndex: 1, baseAz: 355, baseAlt: 42 },
  { id: 22, shapeIdx: 1, top: '3%', scale: 1.2, duration: '142s', delay: '-62s', zIndex: 1, baseAz: 75, baseAlt: 85 },
  { id: 23, shapeIdx: 2, top: '20%', scale: 0.8, duration: '175s', delay: '-82s', zIndex: 0, baseAz: 125, baseAlt: 28 },
  { id: 24, shapeIdx: 3, top: '13%', scale: 0.9, duration: '122s', delay: '-22s', zIndex: 2, baseAz: 220, baseAlt: 50 }
];

const getCloudColorAndOpacity = (alt: number) => {
  let fill = "rgba(255, 255, 255, 0.85)";
  let opacity = 0.85;

  if (alt > 15) {
    fill = "#f8fafc";
    opacity = 0.8;
  } else if (alt > -6 && alt <= 15) {
    const t = (alt + 6) / 21;
    if (t < 0.4) {
      fill = "#f43f5e";
      opacity = 0.75;
    } else {
      fill = "#fb923c";
      opacity = 0.85;
    }
  } else {
    fill = "#475569";
    opacity = 0.3;
  }
  return { fill, opacity };
};

interface RuaSolarProps {
  altitude: number;
  azimuth: number;
  solarDate: Date;
  onClose: () => void;
  dateStr: string;
  civilTimeStr: string;
  solarTimeStr: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  moonPhase: number;
  localCivilTime: Date;
  onTimeChange?: (timeStr: string) => void;
  cloudMode?: 'trend' | 'heavy' | 'medium' | 'light' | 'off';
  onCloudModeChange?: (mode: 'trend' | 'heavy' | 'medium' | 'light' | 'off') => void;
  isOptimizationMode?: boolean;
  cloudOpacity?: number;
  onCloudOpacityChange?: (opacity: number) => void;
  ramLimit: '2GB' | '4GB' | '6GB' | '8GB' | '10GB' | '12GB' | 'Unlimited';
  setRamLimit: (limit: '2GB' | '4GB' | '6GB' | '8GB' | '10GB' | '12GB' | 'Unlimited') => void;
  streetlightOffAngle?: number;
  onStreetlightOffAngleChange?: (val: number) => void;
  streetlightOnAngle?: number;
  onStreetlightOnAngleChange?: (val: number) => void;
  isStreetlightTransitionEnabled?: boolean;
  onStreetlightTransitionToggle?: (enabled: boolean) => void;
}

// Stylized SVG Car Component
interface StylizedCarProps {
  color: string;
  direction: 'left-to-right' | 'right-to-left';
  type: 'sedan' | 'suv' | 'sports';
  isNight: boolean;
}

// Vehicle type for traffic simulation
interface Vehicle {
  id: number;
  direction: 'left-to-right' | 'right-to-left';
  type: 'sedan' | 'suv' | 'sports';
  color: string;
  speed: number;
  lane: 'far' | 'near';
  position: number; // 0 to 100
}

const StylizedCar: React.FC<StylizedCarProps> = ({ color, direction, type, isNight }) => {
  const isL2R = direction === 'left-to-right';
  
  // Custom SVG path and proportions based on car type
  const renderCarBody = () => {
    switch (type) {
      case 'suv':
        return (
          <path
            d={isL2R 
              ? "M 5,20 L 5,12 C 5,12 8,10 12,10 L 25,10 L 32,15 L 45,15 C 45,15 48,16 48,20 L 48,25 L 3,25 Z" 
              : "M 45,20 L 45,12 C 45,12 42,10 38,10 L 25,10 L 18,15 L 5,15 C 5,15 2,16 2,20 L 2,25 L 47,25 Z"
            }
            fill={color}
          />
        );
      case 'sports':
        return (
          <path
            d={isL2R 
              ? "M 3,22 L 8,16 C 10,14 15,13 20,13 L 34,13 L 42,18 L 47,20 C 47,20 49,21 49,23 L 49,25 L 1,25 Z" 
              : "M 47,22 L 42,16 C 40,14 35,13 30,13 L 16,13 L 8,18 L 3,20 C 3,20 1,21 1,23 L 1,25 L 49,25 Z"
            }
            fill={color}
          />
        );
      case 'sedan':
      default:
        return (
          <path
            d={isL2R 
              ? "M 4,21 L 10,14 C 12,12 16,12 18,12 L 32,12 C 34,12 36,13 38,15 L 44,18 C 45,19 47,20 47,21 L 47,25 L 3,25 Z" 
              : "M 46,21 L 40,14 C 38,12 34,12 32,12 L 18,12 C 16,12 14,13 12,15 L 6,18 C 5,19 3,20 3,21 L 3,25 L 47,25 Z"
            }
            fill={color}
          />
        );
    }
  };

  return (
    <div className="relative w-14 h-8 select-none">
      {/* Headlight beam glow (SVG behind the car) */}
      {isNight && (
        <svg 
          className={`absolute top-2 h-6 overflow-visible pointer-events-none z-0`}
          style={{
            width: '120px',
            left: isL2R ? '44px' : '-114px',
            transform: isL2R ? 'none' : 'scaleX(-1)'
          }}
        >
          <defs>
            <linearGradient id="headlight-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(254, 240, 138, 0.45)" />
              <stop offset="40%" stopColor="rgba(254, 240, 138, 0.2)" />
              <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
            </linearGradient>
          </defs>
          <polygon points="0,6 100,0 110,16 0,10" fill="url(#headlight-beam)" />
        </svg>
      )}

      {/* Main Car Body Svg */}
      <svg viewBox="0 0 50 30" className="w-full h-full drop-shadow-md relative z-10">
        {/* Wheels shadow */}
        <ellipse cx="13" cy="25" rx="5" ry="2" fill="rgba(0,0,0,0.4)" />
        <ellipse cx="37" cy="25" rx="5" ry="2" fill="rgba(0,0,0,0.4)" />

        {/* Base Car Body */}
        {renderCarBody()}

        {/* Wheels */}
        <circle cx="13" cy="24" r="4.5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <circle cx="13" cy="24" r="1.5" fill="#cbd5e1" />
        <circle cx="37" cy="24" r="4.5" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <circle cx="37" cy="24" r="1.5" fill="#cbd5e1" />

        {/* Windows (Translucent Slate) */}
        {type === 'suv' ? (
          <path
            d={isL2R 
              ? "M 13,12 L 23,12 L 23,15 L 13,15 Z M 25,12 L 31,12 L 33,15 L 25,15 Z" 
              : "M 37,12 L 27,12 L 27,15 L 37,15 Z M 25,12 L 19,12 L 17,15 L 25,15 Z"
            }
            fill="rgba(15, 23, 42, 0.7)"
          />
        ) : type === 'sports' ? (
          <path
            d={isL2R 
              ? "M 18,14 L 28,14 L 32,17 L 18,17 Z" 
              : "M 32,14 L 22,14 L 18,17 L 32,17 Z"
            }
            fill="rgba(15, 23, 42, 0.7)"
          />
        ) : (
          <path
            d={isL2R 
              ? "M 13,14 L 20,14 L 20,17 L 13,17 Z M 22,14 L 32,14 L 34,17 L 22,17 Z" 
              : "M 37,14 L 30,14 L 30,17 L 37,17 Z M 28,14 L 18,14 L 16,17 L 28,17 Z"
            }
            fill="rgba(15, 23, 42, 0.7)"
          />
        )}

        {/* Headlight and Taillight indicator dots */}
        {isNight && (
          <>
            {/* Headlight */}
            <circle cx={isL2R ? "46" : "4"} cy="21" r="1.2" fill="#fef08a" className="animate-pulse" />
            <circle cx={isL2R ? "46" : "4"} cy="21" r="3" fill="#fef08a" opacity="0.4" />
            
            {/* Taillight */}
            <circle cx={isL2R ? "4" : "46"} cy="21" r="1" fill="#ef4444" />
            <circle cx={isL2R ? "4" : "46"} cy="21" r="2.5" fill="#ef4444" opacity="0.5" />
          </>
        )}
      </svg>
    </div>
  );
};

interface BuildingDef {
  left: string;
  width: string;
  height: number;
  style: 'flat' | 'antenna' | 'stepped' | 'sloped';
  cols: number;
  rows: number;
}

const BUILDINGS_DEF: BuildingDef[] = [
  { left: '0%', width: '6%', height: 110, style: 'flat', cols: 3, rows: 5 },
  { left: '5%', width: '7%', height: 150, style: 'antenna', cols: 3, rows: 7 },
  { left: '11%', width: '8%', height: 130, style: 'stepped', cols: 4, rows: 6 },
  { left: '18%', width: '5%', height: 90, style: 'flat', cols: 2, rows: 4 },
  { left: '22%', width: '8%', height: 170, style: 'sloped', cols: 4, rows: 8 },
  { left: '29%', width: '9%', height: 120, style: 'flat', cols: 4, rows: 5 },
  { left: '37%', width: '6%', height: 210, style: 'antenna', cols: 3, rows: 10 },
  { left: '42%', width: '7%', height: 140, style: 'stepped', cols: 3, rows: 6 },
  { left: '48%', width: '8%', height: 160, style: 'flat', cols: 4, rows: 8 },
  { left: '55%', width: '5%', height: 100, style: 'sloped', cols: 2, rows: 5 },
  { left: '59%', width: '8%', height: 190, style: 'antenna', cols: 4, rows: 9 },
  { left: '66%', width: '6%', height: 130, style: 'flat', cols: 3, rows: 6 },
  { left: '71%', width: '8%', height: 150, style: 'stepped', cols: 4, rows: 7 },
  { left: '78%', width: '7%', height: 110, style: 'flat', cols: 3, rows: 5 },
  { left: '84%', width: '5%', height: 180, style: 'antenna', cols: 2, rows: 9 },
  { left: '88%', width: '7%', height: 125, style: 'flat', cols: 3, rows: 6 },
  { left: '94%', width: '7%', height: 145, style: 'sloped', cols: 3, rows: 7 },
];

interface RuralElementDef {
  left: string;
  width: string;
  height: number;
  style: 'farmhouse' | 'barn' | 'silo' | 'windmill' | 'tree' | 'haybale';
}

const RURAL_SCENERY_DEF: RuralElementDef[] = [
  { left: '2%', width: '7%', height: 130, style: 'windmill' },
  { left: '10%', width: '4%', height: 80, style: 'tree' },
  { left: '15%', width: '5%', height: 155, style: 'silo' },
  { left: '21%', width: '10%', height: 115, style: 'barn' },
  { left: '32%', width: '3%', height: 60, style: 'tree' },
  { left: '36%', width: '8%', height: 90, style: 'farmhouse' },
  { left: '46%', width: '4%', height: 75, style: 'tree' },
  { left: '52%', width: '6%', height: 45, style: 'haybale' },
  { left: '60%', width: '7%', height: 140, style: 'windmill' },
  { left: '68%', width: '9%', height: 95, style: 'farmhouse' },
  { left: '79%', width: '4%', height: 70, style: 'tree' },
  { left: '85%', width: '10%', height: 110, style: 'barn' },
  { left: '96%', width: '4%', height: 85, style: 'tree' },
];

export const RuaSolar: React.FC<RuaSolarProps> = ({
  altitude,
  azimuth,
  solarDate,
  onClose,
  dateStr,
  civilTimeStr,
  solarTimeStr,
  latitude,
  longitude,
  locationName,
  moonPhase,
  localCivilTime,
  onTimeChange,
  cloudMode = 'trend',
  onCloudModeChange,
  isOptimizationMode = false,
  cloudOpacity = 0.85,
  onCloudOpacityChange,
  ramLimit,
  setRamLimit,
  streetlightOffAngle = -0.8,
  onStreetlightOffAngleChange,
  streetlightOnAngle = -6.0,
  onStreetlightOnAngleChange,
  isStreetlightTransitionEnabled = true,
  onStreetlightTransitionToggle,
}) => {
  const lat = latitude ?? 0;
  const lon = longitude ?? 0;

  const getShadowTransform = useMemo(() => (alt: number, az: number) => {
    if (alt <= 0) return 'scale(0)';
    const skew = (az - 180) / 2;
    // Shadow length based on altitude
    const shadowLengthFactor = Math.max(0.1, Math.min(2, 1 / Math.tan(alt * Math.PI / 180)));
    return `skewX(${skew}) scale(1, ${shadowLengthFactor * 0.5})`;
  }, []);

  const getCloudShadowTransform = useMemo(() => (alt: number, az: number) => {
    if (alt <= 0) return 'scale(0)';
    // Cloud shadows are less sharp and more offset
    const skew = (az - 160) / 2; 
    const shadowLengthFactor = Math.max(0.2, Math.min(3, 1 / Math.tan(alt * Math.PI / 180)));
    return `skewX(${skew}) scale(1, ${shadowLengthFactor * 0.6})`;
  }, []);

  const effectiveCloudOpacity = useMemo(() => {
    if (cloudMode === 'off') return 0;
    const base = cloudOpacity ?? 0.85;
    const multiplier = cloudMode === 'heavy' ? 1.0 : cloudMode === 'medium' ? 0.6 : 0.3;
    return base * multiplier;
  }, [cloudMode, cloudOpacity]);

  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  const activeClouds = useMemo(() => {
    const getCount = () => {
      if (cloudMode === 'off') return 0;
      let count = 6;
      if (cloudMode === 'light') count = 5;
      else if (cloudMode === 'medium') count = 11;
      else if (cloudMode === 'heavy') count = 22;
      else {
        // 'trend' (Historical Trend) mode: use the timeanddate.com climate model
        const trend = calculateHistoricalClouds(solarDate, lat, lon);
        if (trend.mode === 'off') count = 0;
        else if (trend.mode === 'light') count = 5;
        else if (trend.mode === 'medium') count = 11;
        else if (trend.mode === 'heavy') count = 22;
      }

      // Cloud Pooling: reduce instances automatically in 'baixo consumo' / performance presets
      if (ramLimit === '2GB' || isOptimizationMode) {
        count = Math.min(count, 4);
      } else if (ramLimit === '4GB') {
        count = Math.min(count, 10);
      } else if (ramLimit === '6GB') {
        count = Math.min(count, 14);
      } else if (ramLimit === '8GB') {
        count = Math.min(count, 18);
      } else if (ramLimit === '10GB') {
        count = Math.min(count, 20);
      } else if (ramLimit === '12GB') {
        count = Math.min(count, 22);
      }
      return count;
    };
    return STATIC_CLOUDS_DEF.slice(0, getCount());
  }, [cloudMode, altitude, ramLimit, isOptimizationMode, solarDate, lat, lon]);

  const trendResult = useMemo(() => {
    return calculateHistoricalClouds(solarDate, lat, lon);
  }, [solarDate, lat, lon]);

  const currentHour = localCivilTime.getUTCHours();
  const currentMinute = localCivilTime.getUTCMinutes();
  const timeVal = currentHour + currentMinute / 60;

  const [trafficSelection, setTrafficSelection] = useState<'auto' | 'low' | 'medium' | 'high' | 'intense'>('auto');
  const [showLifecyclePanel, setShowLifecyclePanel] = useState(true);
  const [showCloudMenu, setShowCloudMenu] = useState(false);
  
  // Pedestrian and traffic light state
  const [lightState, setLightState] = useState<'vehicle' | 'pedestrian'>('vehicle');
  const [buildingLightThreshold, setBuildingLightThreshold] = useState(-6);

  // Detect whether the selected location is in Continental Spain or Galicia
  const isInSpain = useMemo(() => {
    return isCoordinatesInContinentalSpain(latitude, longitude) && !isCoordinatesInGalicia(latitude, longitude);
  }, [latitude, longitude]);

  const isInGalicia = useMemo(() => {
    return isCoordinatesInGalicia(latitude, longitude);
  }, [latitude, longitude]);

  // State to manage the Spain/Galicia-specific traffic schedule shift
  const [useSpainSchedule, setUseSpainSchedule] = useState(isInSpain);
  const [useGaliciaSchedule, setUseGaliciaSchedule] = useState(isInGalicia);

  // Real size mode and street sizing
  const [isRealSize, setIsRealSize] = useState(false);
  const [showBuildings, setShowBuildings] = useState(true);
  const [sceneryMode, setSceneryMode] = useState<'city' | 'rural'>('city');
  const [isLightingPanelMinimized, setIsLightingPanelMinimized] = useState(false);
  const streetRef = useRef<HTMLDivElement>(null);
  const streetWidthRef = useRef(800);
  const [streetWidth, setStreetWidth] = useState(800);

  useEffect(() => {
    if (!streetRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width || 800;
        if (Math.abs(newWidth - streetWidthRef.current) > 5) {
          streetWidthRef.current = newWidth;
          setStreetWidth(newWidth);
        }
      }
    });
    observer.observe(streetRef.current);
    return () => observer.disconnect();
  }, []);

  const pxPerMeter = isRealSize ? (streetWidth / 10) : 80;

  // Synchronize when the location changes
  useEffect(() => {
    setUseSpainSchedule(isInSpain);
    setUseGaliciaSchedule(isInGalicia);
  }, [isInSpain, isInGalicia]);

  // If Galicia is active, we shift by 2 hours. If Spain is active, we shift by 1 hour.
  const shift = useGaliciaSchedule ? 2.0 : (useSpainSchedule ? 1.0 : 0.0);

  const activeTrafficDensity = useMemo(() => {
    if (trafficSelection !== 'auto') {
      switch (trafficSelection) {
        case 'low': return 0.12;
        case 'medium': return 0.45;
        case 'high': return 0.75;
        case 'intense': return 0.98;
        default: return 0.45;
      }
    }
    const unshiftedTime = (timeVal - shift + 24) % 24;
    return getContinuousTrafficDensity(unshiftedTime);
  }, [trafficSelection, timeVal, shift]);

  const isRushHour = activeTrafficDensity >= 0.75;
  const isRushHourRef = useRef(isRushHour);
  useEffect(() => {
    isRushHourRef.current = isRushHour;
  }, [isRushHour]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const cycle = () => {
      setLightState('pedestrian');
      const pedestrianDuration = isRushHourRef.current ? 30000 : 60000;
      timer = setTimeout(() => {
        setLightState('vehicle');
        const vehicleDuration = isRushHourRef.current ? 450000 : 240000;
        timer = setTimeout(cycle, vehicleDuration);
      }, pedestrianDuration);
    };
    
    cycle();
    
    return () => clearTimeout(timer);
  }, []);

  // Format decimal hour back to a clean HH:mm string for setting the clock
  const formatDecimalTime = (decimal: number): string => {
    const h = Math.floor(decimal) % 24;
    const m = Math.round((decimal % 1) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // We define the 24-hour daily life-cycle schedule with multiple intervals per category (low, medium, high, intense)
  const lifecyclePeriods = useMemo(() => {
    const basePeriods = [
      // Low (Sono / Madrugada)
      { id: 'low-1', level: 'low' as const, name: 'Madrugada / Sono Profundo', start: 0, end: 5, emoji: '😴' },
      { id: 'low-2', level: 'low' as const, name: 'Repouso Noturno Tardio', start: 23, end: 24, emoji: '🌙' },
      
      // Medium (Atividades Normais / Transições)
      { id: 'med-1', level: 'medium' as const, name: 'Alvorecer / Despertar', start: 5, end: 7, emoji: '🌅' },
      { id: 'med-2', level: 'medium' as const, name: 'Atividades Comerciais', start: 9.5, end: 12, emoji: '💼' },
      { id: 'med-3', level: 'medium' as const, name: 'Movimento Geral da Tarde', start: 14, end: 17, emoji: '🚗' },
      { id: 'med-4', level: 'medium' as const, name: 'Desaceleração Noturna', start: 21, end: 23, emoji: '☕' },
      
      // High (Movimentação Elevada)
      { id: 'high-1', level: 'high' as const, name: 'Intervalo de Almoço', start: 12, end: 14, emoji: '🍲' },
      { id: 'high-2', level: 'high' as const, name: 'Retorno Lazer / Jantar', start: 19.5, end: 21, emoji: '🍕' },
      
      // Intense (Horários de Pico)
      { id: 'int-1', level: 'intense' as const, name: 'Pico da Manhã (Entrada)', start: 7, end: 9.5, emoji: '⚡' },
      { id: 'int-2', level: 'intense' as const, name: 'Pico da Tarde (Retorno)', start: 17, end: 19.5, emoji: '🚦' }
    ];

    return basePeriods.map(p => {
      const s = (p.start + shift) % 24;
      const e = (p.end + shift) % 24;
      return {
        ...p,
        shiftedStart: s,
        shiftedEnd: e,
        isWrapped: s > e
      };
    });
  }, [shift]);

  const activeLifecyclePeriod = useMemo(() => {
    return lifecyclePeriods.find(p => {
      const s = p.shiftedStart;
      const e = p.shiftedEnd;
      if (!p.isWrapped) {
        return timeVal >= s && timeVal < e;
      } else {
        return timeVal >= s || timeVal < e;
      }
    });
  }, [lifecyclePeriods, timeVal]);

  const trafficLevel = useMemo(() => {
    if (activeTrafficDensity < 0.25) return 'low';
    if (activeTrafficDensity < 0.60) return 'medium';
    if (activeTrafficDensity < 0.85) return 'high';
    return 'intense';
  }, [activeTrafficDensity]);

  const trafficLabel = useMemo(() => {
    const percentageStr = `${Math.round(activeTrafficDensity * 100)}%`;
    switch (trafficLevel) {
      case 'low':
        return { text: `Tráfego Baixo (${percentageStr})`, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20' };
      case 'medium':
        return { text: `Tráfego Moderado (${percentageStr})`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
      case 'high':
        return { text: `Tráfego Alto (${percentageStr})`, color: 'text-orange-400 bg-orange-400/10 border-orange-500/20' };
      case 'intense':
        return { text: `Tráfego Intenso (${percentageStr})`, color: 'text-red-400 bg-red-400/10 border-red-500/20' };
      default:
        return { text: `Tráfego Moderado (${percentageStr})`, color: 'text-amber-400 bg-amber-400/10 border-amber-500/20' };
    }
  }, [trafficLevel, activeTrafficDensity]);

  const solarPhase = useMemo(() => {
    if (altitude > 0) {
      return {
        text: 'Dia',
        range: 'Acima de 0°',
        color: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
        dotColor: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
      };
    } else if (altitude >= -6) {
      return {
        text: 'Crepúsculo Civil',
        range: '-6° a 0°',
        color: 'text-sky-400 bg-sky-400/10 border-sky-500/20',
        dotColor: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
      };
    } else if (altitude >= -12) {
      return {
        text: 'Crepúsculo Náutico (Dia Visível)',
        range: '-12° a -6°',
        color: 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20',
        dotColor: 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
      };
    } else if (altitude >= -18) {
      return {
        text: 'Crepúsculo Astronômico (Noite Visível)',
        range: '-18° a -12°',
        color: 'text-violet-400 bg-violet-400/10 border-violet-500/20',
        dotColor: 'bg-violet-400 shadow-[0_0_8px_#a78bfa]'
      };
    } else {
      return {
        text: 'Noite Astronômica (Noite Visível)',
        range: 'Abaixo de -18°',
        color: 'text-slate-400 bg-slate-400/10 border-slate-500/20',
        dotColor: 'bg-slate-400 shadow-[0_0_8px_#94a3b8]'
      };
    }
  }, [altitude]);

  const twilightInfo = useMemo(() => {
    const alt = altitude;
    if (alt < 0) {
      const isMorning = solarDate.getUTCHours() < 12;
      let type: 'civil' | 'nautical' | 'astronomical' | 'night' = 'night';
      let title = "";
      let desc = "";
      let colorClass = "";
      let iconColor = "";

      if (alt >= -6) {
        type = 'civil';
        title = "Crepúsculo Civil Ativo";
        desc = "O sol está abaixo do horizonte, mas ainda fornece luz ambiente considerável.";
        colorClass = "bg-sky-500/20 border-sky-500/40 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.15)]";
        iconColor = "text-sky-400";
      } else if (alt >= -12) {
        type = 'nautical';
        title = "Crepúsculo Náutico (Dia Visível) Ativo";
        desc = "Luz solar residual disponível. O horizonte do mar ainda é visível.";
        colorClass = "bg-indigo-500/20 border-indigo-400/40 text-indigo-200 shadow-[0_0_12px_rgba(129,140,248,0.15)]";
        iconColor = "text-indigo-400";
      } else if (alt >= -18) {
        type = 'astronomical';
        title = "Crepúsculo Astronômico (Noite Visível) Ativo";
        desc = "O céu está quase totalmente escuro; o sol fornece apenas um brilho residual mínimo.";
        colorClass = "bg-violet-500/20 border-violet-500/40 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.15)]";
        iconColor = "text-violet-400";
      } else {
        type = 'night';
        title = "Noite Astronômica (Noite Visível) Ativo";
        desc = "Céu totalmente escuro, visibilidade estelar máxima.";
        colorClass = "bg-slate-500/20 border-slate-500/40 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.15)]";
        iconColor = "text-slate-400";
      }

      return {
        active: true,
        type,
        title,
        desc,
        colorClass,
        iconColor,
        altitude: alt,
        isMorning
      };
    }
    return null;
  }, [altitude, solarDate]);

  // Calculate min and max solar altitude for the whole day (00:00:00 to 23:59:59 local civil time)
  const { minDailySolarAltitude, maxDailySolarAltitude } = useMemo(() => {
    const baseDate = localCivilTime || solarDate;
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);

    let maxAlt = -90;
    let minAlt = 90;

    // Sample altitude at 5-minute intervals (288 samples across the 24h civil day)
    for (let i = 0; i <= 288; i++) {
      const sampleTime = new Date(startOfDay.getTime() + i * 5 * 60 * 1000);
      const pos = SunCalc.getPosition(sampleTime, lat, lon);
      const altDeg = (pos.altitude * 180) / Math.PI;
      if (altDeg > maxAlt) maxAlt = altDeg;
      if (altDeg < minAlt) minAlt = altDeg;
    }

    return { minDailySolarAltitude: minAlt, maxDailySolarAltitude: maxAlt };
  }, [localCivilTime, solarDate, lat, lon]);

  // Regra específica para o "Estilo: Cidade":
  // 1. Se no dia civil (00:00:00 a 23:59:59) o Sol NÃO tiver ficado acima de 0° (maxDailySolarAltitude <= 0):
  //    Os postes ficam 100% ligados o dia todo (24h em 100% de intensidade, mesmo que o Sol fique acima de -6°).
  // 2. Se no dia civil o Sol NÃO ficar abaixo de -6° (minDailySolarAltitude >= -6):
  //    Os postes ficam desligados 24 horas no dia (0% de intensidade, mesmo se o Sol descer abaixo de 0°).
  // 3. Isso NÃO vale na Rodovia Rural (sceneryMode === 'rural'), onde os postes respondem instantaneamente
  //    à altitude solar em tempo real (0% se alt >= 0°, 100% se alt <= -6°, e progressivo entre 0° e -6°).
  const isCity24hStreetLightsOn = sceneryMode === 'city' && maxDailySolarAltitude <= 0;
  const isCity24hStreetLightsOff = sceneryMode === 'city' && !isCity24hStreetLightsOn && minDailySolarAltitude >= -6;

  // Progressive street lights:
  // - Estilo Cidade: obedece às travas de 24h se o Sol não ultrapassar os limites no dia civil.
  // - Rodovia Rural: transição suave proporcional à altitude instantânea, sem travas de 24h.
  const streetLightIntensity = useMemo(() => {
    if (sceneryMode === 'city') {
      if (isCity24hStreetLightsOn) return 1.0; // 24h 100% ligado no dia todo
      if (isCity24hStreetLightsOff) return 0.0; // 24h desligado no dia todo
    }

    const offA = streetlightOffAngle;
    const onA = streetlightOnAngle;

    if (isStreetlightTransitionEnabled) {
      if (altitude >= Math.max(offA, onA)) return 0.0;
      if (altitude <= Math.min(offA, onA)) return 1.0;
      const range = Math.abs(offA - onA);
      if (range === 0) return altitude <= offA ? 1.0 : 0.0;
      const val = (offA - altitude) / (offA - onA);
      return Math.max(0, Math.min(1, val));
    } else {
      return altitude <= offA ? 1.0 : 0.0;
    }
  }, [
    altitude, 
    sceneryMode, 
    isCity24hStreetLightsOn, 
    isCity24hStreetLightsOff,
    streetlightOffAngle,
    streetlightOnAngle,
    isStreetlightTransitionEnabled
  ]);

  const isNight = streetLightIntensity > 0;
  const carHeadlightsOn = altitude <= 0;

  const bgGradient = getSolarGradient(altitude);

  // Map altitude to visual sky position (0deg is the horizon, situated at 65% vertical height)
  // Map altitude to visual sky position (0deg is the horizon, situated at 65% vertical height)
  // Map altitude to vertical position
  const clampedAltitude = Math.max(-90, Math.min(90, altitude));
  const sunYPos = clampedAltitude >= 0 
    ? 65 - (clampedAltitude / 90) * 52 
    : 65 + (Math.abs(clampedAltitude) / 90) * 50; // goes below ground
  
  const getCenteredHorizontalPos = (azdeg: number) => {
    const normalized = ((azdeg + 180) % 360 + 360) % 360 - 180;
    return 50 + (normalized / 180) * 50;
  };
  const sunXPos = getCenteredHorizontalPos(azimuth);

  // Moon Position
  const moonPos = SunCalc.getMoonPosition(solarDate, lat * Math.PI / 180, lon * Math.PI / 180);
  const moonAltDeg = moonPos.altitude * 180 / Math.PI;
  const moonAzDeg = (moonPos.azimuth * 180 / Math.PI + 180) % 360;
  
  const clampedMoonAltitude = Math.max(-90, Math.min(90, moonAltDeg));
  const moonYPos = clampedMoonAltitude >= 0 
    ? 65 - (clampedMoonAltitude / 90) * 52 
    : 65 + (Math.abs(clampedMoonAltitude) / 90) * 50;
  const moonXPos = getCenteredHorizontalPos(moonAzDeg);

  const sunGlowOpacity = Math.max(0, Math.min(0.6, (altitude - buildingLightThreshold) / 15));
  const sunGlowSpread = Math.max(50, 110 - (altitude * 0.4));
  const sunIconOpacity = Math.max(0, Math.min(1, (altitude + 8) / 12));
  const moonIconOpacity = Math.max(0.1, Math.min(1, (moonAltDeg + 8) / 12));

  // Determine speed and delay multipliers based on chosen traffic density level
  // This changes how frequently the vehicles reappear on the road by adjusting their speed and timing factors
  const { speedMultiplier, delayMultiplier } = useMemo(() => {
    // Green-Shields traffic model: higher density = slower traffic, closer packing (shorter delay)
    const speed = 1.4 - (activeTrafficDensity * 0.95);
    const delay = 2.0 - (activeTrafficDensity * 1.85);
    return { 
      speedMultiplier: Math.max(0.35, speed), 
      delayMultiplier: Math.max(0.12, delay) 
    };
  }, [activeTrafficDensity]);

  // Defined pool of cars with staggered animation speeds and delays
  // By filtering or showing more/less of this pool, we simulate realistic traffic flow changes in real-time
  const [carPool, setCarPool] = useState<Array<{
    id: string | number;
    direction: 'left-to-right' | 'right-to-left';
    speed: number;
    delay: number;
    color: string;
    type: 'sedan' | 'suv' | 'sports';
    lane: 'far' | 'near';
    threshold: number;
  }>>(() => [
    { id: 'c1', direction: 'left-to-right' as const, speed: 9, delay: 0.1, color: '#dc2626', type: 'sedan' as const, lane: 'far' as const, threshold: 0.0 },
    { id: 'c2', direction: 'right-to-left' as const, speed: 11, delay: 1.2, color: '#2563eb', type: 'suv' as const, lane: 'near' as const, threshold: 0.05 },
    { id: 'c3', direction: 'left-to-right' as const, speed: 7.5, delay: 2.8, color: '#10b981', type: 'sports' as const, lane: 'far' as const, threshold: 0.12 },
    { id: 'c4', direction: 'right-to-left' as const, speed: 12, delay: 3.9, color: '#f59e0b', type: 'sedan' as const, lane: 'near' as const, threshold: 0.20 },
    { id: 'c5', direction: 'left-to-right' as const, speed: 10, delay: 5.2, color: '#8b5cf6', type: 'suv' as const, lane: 'far' as const, threshold: 0.28 },
    { id: 'c6', direction: 'right-to-left' as const, speed: 8.5, delay: 1.8, color: '#ec4899', type: 'sports' as const, lane: 'near' as const, threshold: 0.35 },
    { id: 'c7', direction: 'left-to-right' as const, speed: 6.5, delay: 0.8, color: '#3b82f6', type: 'sports' as const, lane: 'far' as const, threshold: 0.42 },
    { id: 'c8', direction: 'right-to-left' as const, speed: 13, delay: 4.5, color: '#64748b', type: 'sedan' as const, lane: 'near' as const, threshold: 0.48 },
    { id: 'c9', direction: 'left-to-right' as const, speed: 8.2, delay: 3.5, color: '#f43f5e', type: 'suv' as const, lane: 'far' as const, threshold: 0.54 },
    { id: 'c10', direction: 'right-to-left' as const, speed: 9.8, delay: 6.1, color: '#14b8a6', type: 'sedan' as const, lane: 'near' as const, threshold: 0.60 },
    { id: 'c11', direction: 'left-to-right' as const, speed: 11, delay: 2.0, color: '#a855f7', type: 'sedan' as const, lane: 'far' as const, threshold: 0.66 },
    { id: 'c12', direction: 'right-to-left' as const, speed: 7.0, delay: 7.5, color: '#e11d48', type: 'sports' as const, lane: 'near' as const, threshold: 0.72 },
    { id: 'c13', direction: 'left-to-right' as const, speed: 12, delay: 8.2, color: '#06b6d4', type: 'suv' as const, lane: 'far' as const, threshold: 0.78 },
    { id: 'c14', direction: 'right-to-left' as const, speed: 7.8, delay: 9.5, color: '#16a34a', type: 'suv' as const, lane: 'near' as const, threshold: 0.82 },
    { id: 'c15', direction: 'left-to-right' as const, speed: 9.0, delay: 4.1, color: '#e2e8f0', type: 'sedan' as const, lane: 'far' as const, threshold: 0.86 },
    { id: 'c16', direction: 'right-to-left' as const, speed: 10.5, delay: 5.6, color: '#f43f5e', type: 'suv' as const, lane: 'near' as const, threshold: 0.89 },
    { id: 'c17', direction: 'left-to-right' as const, speed: 8.0, delay: 10.2, color: '#fb7185', type: 'sports' as const, lane: 'far' as const, threshold: 0.92 },
    { id: 'c18', direction: 'right-to-left' as const, speed: 11.5, delay: 11.0, color: '#fbbf24', type: 'sedan' as const, lane: 'near' as const, threshold: 0.94 },
    { id: 'c19', direction: 'left-to-right' as const, speed: 9.5, delay: 12.5, color: '#38bdf8', type: 'suv' as const, lane: 'far' as const, threshold: 0.96 },
    { id: 'c20', direction: 'right-to-left' as const, speed: 6.2, delay: 13.1, color: '#a78bfa', type: 'sports' as const, lane: 'near' as const, threshold: 0.97 },
    { id: 'c21', direction: 'left-to-right' as const, speed: 10.2, delay: 14.2, color: '#f472b6', type: 'sedan' as const, lane: 'far' as const, threshold: 0.98 },
    { id: 'c22', direction: 'right-to-left' as const, speed: 8.8, delay: 15.0, color: '#2dd4bf', type: 'suv' as const, lane: 'near' as const, threshold: 0.99 }
  ]);

  // Periodically add more cars to reach 100 per side (only if RAM limit allows)
  useEffect(() => {
    if (ramLimit === '2GB') return;
    const interval = setInterval(() => {
      setCarPool(prev => {
        const farCars = prev.filter(c => c.lane === 'far');
        const nearCars = prev.filter(c => c.lane === 'near');
        
        let next = [...prev];
        if (farCars.length < 100) {
          next.push({ id: `far-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, direction: 'right-to-left', speed: 8 + Math.random() * 4, delay: Math.random() * 10, color: '#' + Math.floor(Math.random()*16777215).toString(16), type: 'sedan', lane: 'far', threshold: 0 });
        }
        if (nearCars.length < 100) {
          next.push({ id: `near-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, direction: 'left-to-right', speed: 8 + Math.random() * 4, delay: Math.random() * 10, color: '#' + Math.floor(Math.random()*16777215).toString(16), type: 'sedan', lane: 'near', threshold: 0 });
        }
        return next;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [ramLimit]);

  // Filter cars currently visible on the road and cap based on RAM Limit for maximum fluidity
  const visibleCars = useMemo(() => {
    const baseCars = carPool.filter(c => activeTrafficDensity >= c.threshold);
    if (ramLimit === '2GB') {
      return baseCars.slice(0, 10); // Eco smooth, max 10 cars on road
    }
    if (ramLimit === '4GB') {
      return baseCars.slice(0, 20); // Balanced, max 20 cars on road
    }
    if (ramLimit === '6GB') {
      return baseCars.slice(0, 35); // Max 35 cars
    }
    if (ramLimit === '8GB') {
      return baseCars.slice(0, 50); // Max 50 cars
    }
    if (ramLimit === '10GB') {
      return baseCars.slice(0, 75); // Max 75 cars
    }
    if (ramLimit === '12GB') {
      return baseCars.slice(0, 100); // Max 100 cars
    }
    return baseCars; // Unlimited / Max fidelity
  }, [activeTrafficDensity, carPool, ramLimit]);

  // Gnomon of 0.5 meters height (represented by 40px visually by default, or dynamic in Real Size mode)
  const gnomonHeightPx = 0.5 * pxPerMeter;

  // Calculate dynamic shadow properties on the ground plane
  const shadowInfo = useMemo(() => {
    const isSunUp = altitude > 0;
    const isMoonUp = moonAltDeg > 0;

    if (isSunUp) {
      // Solar shadow
      const maxShadowPx = isRealSize ? (8 * pxPerMeter) : 150;
      const shadowLength = Math.max(5, Math.min(maxShadowPx, gnomonHeightPx / Math.tan(Math.max(2, altitude) * Math.PI / 180)));
      const shadowX = shadowLength * -Math.sin(azimuth * Math.PI / 180);
      const shadowY = shadowLength * Math.cos(azimuth * Math.PI / 180);
      const angleRad = Math.atan2(shadowX, shadowY);
      const angleDeg = angleRad * 180 / Math.PI;

      return {
        type: 'solar' as const,
        length: shadowLength,
        x: shadowX,
        y: shadowY,
        angle: angleDeg,
        opacity: Math.max(0.2, Math.min(0.75, altitude / 30)),
      };
    } else if (isMoonUp) {
      // Moon shadow
      const maxShadowPx = isRealSize ? (6 * pxPerMeter) : 100;
      const shadowLength = Math.max(5, Math.min(maxShadowPx, gnomonHeightPx / Math.tan(Math.max(2, moonAltDeg) * Math.PI / 180)));
      const moonRad = moonAzDeg * Math.PI / 180;
      const shadowX = shadowLength * -Math.sin(moonRad);
      const shadowY = shadowLength * Math.cos(moonRad);
      const angleRad = Math.atan2(shadowX, shadowY);
      const angleDeg = angleRad * 180 / Math.PI;
      const phaseIntensity = 1 - Math.abs(moonPhase - 0.5) * 2;
      const opacity = Math.max(0.05, Math.min(0.25, (moonAltDeg / 40) * phaseIntensity));

      return {
        type: 'lunar' as const,
        length: shadowLength,
        x: shadowX,
        y: shadowY,
        angle: angleDeg,
        opacity: opacity,
      };
    }

    return null;
  }, [altitude, azimuth, moonAltDeg, moonAzDeg, moonPhase, isRealSize, pxPerMeter, gnomonHeightPx]);

  // Street Light Pole Coordinates
  // 5 poles on each side of the road (10 poles total)
  // Back side sidewalk (Y = 66%): spaced out
  const backPoles = [
    { id: 'b1', x: '6%' },
    { id: 'b2', x: '26%' },
    { id: 'b3', x: '46%' },
    { id: 'b4', x: '66%' },
    { id: 'b5', x: '86%' }
  ];

  // Front side sidewalk (Y = 92%): spaced out alternately
  const frontPoles = [
    { id: 'f1', x: '16%' },
    { id: 'f2', x: '36%' },
    { id: 'f3', x: '56%' },
    { id: 'f4', x: '76%' },
    { id: 'f5', x: '96%' }
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at ${sunXPos}% ${sunYPos}%, rgba(251, 191, 36, ${sunGlowOpacity}) 0%, rgba(251, 191, 36, ${sunGlowOpacity * 0.2}) 20%, rgba(251, 191, 36, 0) ${sunGlowSpread}%), ${bgGradient}`
      }}
    >
      {/* CSS Keyframes for smooth car transitions */}
      <style>
        {`
          @keyframes driveL2R {
            0% { left: -10%; }
            100% { left: 110%; }
          }
          @keyframes driveR2L {
            0% { left: 110%; }
            100% { left: -10%; }
          }
          .animate-drive-l2r {
            animation: driveL2R var(--drive-speed) linear infinite;
            animation-delay: var(--drive-delay);
          }
          .animate-drive-r2l {
            animation: driveR2L var(--drive-speed) linear infinite;
            animation-delay: var(--drive-delay);
          }
          @keyframes lightPulse {
            0%, 100% { opacity: 0.22; }
            50% { opacity: 0.28; }
          }
          .pole-glow-pulse {
            animation: lightPulse 4s ease-in-out infinite;
          }
          @keyframes driftClouds {
            0% { transform: translateX(-150px); }
            100% { transform: translateX(calc(100vw + 150px)); }
          }
          .animate-drift-cloud {
            animation: driftClouds var(--cloud-duration) linear infinite;
            animation-delay: var(--cloud-delay);
            will-change: transform;
          }
        `}
      </style>

      {/* Dynamic Clouds Layer */}
      {cloudMode !== 'off' && (
        <div className="absolute inset-x-0 top-0 bottom-[35%] overflow-hidden pointer-events-none z-0">
          {activeClouds.map((cloud) => {
            const { fill, opacity: baseOpacity } = getCloudColorAndOpacity(altitude);
            const finalOpacity = baseOpacity * cloudOpacity;
            const scaleFactor = isRealSize ? 1.6 : 1.0;
            return (
              <div
                key={`ruasolar-cloud-${cloud.id}`}
                className="absolute animate-drift-cloud"
                style={{
                  top: cloud.top,
                  '--cloud-duration': cloud.duration,
                  '--cloud-delay': cloud.delay,
                  zIndex: cloud.zIndex,
                  opacity: finalOpacity,
                } as any}
              >
                <svg 
                  width={110 * cloud.scale * scaleFactor} 
                  height={75 * cloud.scale * scaleFactor} 
                  viewBox="0 0 120 80"
                  className="opacity-95"
                >
                  <path d={CLOUD_SHAPES[cloud.shapeIdx]} fill={fill} className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]" />
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2.5 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 backdrop-blur-md z-[110]"
      >
        <X size={20} />
      </button>

      {/* Cloud Menu Toggle Button & Popover */}
      <div className="absolute top-16 right-4 z-[110] flex flex-col items-end gap-2">
        <button 
          onClick={() => setShowCloudMenu(!showCloudMenu)} 
          className={`text-white/70 hover:text-white transition-all p-2.5 rounded-full border backdrop-blur-md flex items-center justify-center shadow-lg ${
            showCloudMenu 
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/30' 
              : 'bg-black/40 border-white/10'
          }`}
          title="Opções de Nuvens"
        >
          <Cloud size={20} className={cloudMode !== 'off' ? 'animate-pulse' : ''} />
        </button>

        {/* Floating Cloud Selector Popover */}
        <AnimatePresence>
          {showCloudMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-black/85 border border-white/15 p-3 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 w-48 z-[110]"
            >
              <div className="text-[10px] font-sans font-black tracking-[0.15em] text-amber-400 uppercase border-b border-white/10 pb-1.5 text-center flex items-center justify-center gap-1.5">
                <Cloud size={12} className="text-amber-400" />
                <span>NUVENS DINÂMICAS</span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                {(['trend', 'heavy', 'medium', 'light', 'off'] as const).map((mode) => {
                  const isActive = cloudMode === mode;
                  const labels = {
                    trend: 'Tendência Histórica',
                    heavy: 'Modo Pesado',
                    medium: 'Modo Médio',
                    light: 'Modo Leve',
                    off: 'Sem Nuvens'
                  };
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        onCloudModeChange?.(mode);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold transition-all duration-200 border cursor-pointer text-left flex items-center justify-between ${
                        isActive 
                          ? 'bg-amber-400/20 text-amber-400 border-amber-400/30 shadow-md' 
                          : 'bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{labels[mode]}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                    </button>
                  );
                })}
              </div>

              <div className="w-full h-[1px] bg-white/10 my-0.5" />

              {/* Cloud Opacity Slider */}
              <div className="w-full flex flex-col gap-1.5 px-1">
                <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-wider text-white/40">
                  <span>Opacidade</span>
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

              <div className="w-full h-[1px] bg-white/10 my-0.5" />

              {/* Building Light Threshold Slider */}
              <div className="w-full flex flex-col gap-1.5 px-1">
                <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-wider text-white/40">
                  <span>Limiar Prédios</span>
                  <span className="text-amber-400 font-bold">{buildingLightThreshold}°</span>
                </div>
                <input
                  type="range"
                  min="-6"
                  max="0"
                  step="0.5"
                  value={buildingLightThreshold}
                  onChange={(e) => setBuildingLightThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                />
              </div>

              <div className="w-full h-[1px] bg-white/10 my-0.5" />

              {/* Streetlight Controls Section */}
              <div className="w-full flex flex-col gap-2 px-1">
                <div className="text-[8px] font-mono font-bold uppercase tracking-wider text-amber-400 flex justify-between items-center">
                  <span>Luzes da Rua Solar</span>
                  <span className="text-white font-black">{Math.round(streetLightIntensity * 100)}%</span>
                </div>

                {isStreetlightTransitionEnabled ? (
                  <>
                    {/* Off Angle (+90 to -90) */}
                    <div className="flex flex-col gap-1 bg-black/30 p-2 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[7.5px] font-mono uppercase text-white/60">
                        <span>Desligar 100% (Acima de)</span>
                        <span className={`px-1 py-0.5 rounded text-[7px] font-mono font-bold border ${
                          streetlightOffAngle > 0 
                            ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                            : streetlightOffAngle < 0 
                              ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                              : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                        }`}>
                          {streetlightOffAngle > 0 ? '+ Acima do Horizonte' : streetlightOffAngle < 0 ? '- Abaixo do Horizonte' : '0 No Horizonte (Sem Lado)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          step="0.1"
                          value={streetlightOffAngle}
                          onChange={(e) => onStreetlightOffAngleChange?.(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                        />
                        <div className="flex items-center gap-0.5 shrink-0 bg-black/60 border border-white/10 rounded px-1.5 py-0.5">
                          <input
                            type="number"
                            min="-90"
                            max="90"
                            step="0.1"
                            value={Number.isNaN(streetlightOffAngle) ? '' : streetlightOffAngle}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) onStreetlightOffAngleChange?.(Math.max(-90, Math.min(90, v)));
                            }}
                            className="w-11 text-right bg-transparent text-amber-300 font-mono font-extrabold text-[10px] focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-white/50">°</span>
                        </div>
                      </div>
                    </div>

                    {/* On Angle (+90 to -90) */}
                    <div className="flex flex-col gap-1 bg-black/30 p-2 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-[7.5px] font-mono uppercase text-white/60">
                        <span>Ligar 100% (Abaixo de)</span>
                        <span className={`px-1 py-0.5 rounded text-[7px] font-mono font-bold border ${
                          streetlightOnAngle > 0 
                            ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                            : streetlightOnAngle < 0 
                              ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                              : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                        }`}>
                          {streetlightOnAngle > 0 ? '+ Acima do Horizonte' : streetlightOnAngle < 0 ? '- Abaixo do Horizonte' : '0 No Horizonte (Sem Lado)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          step="0.1"
                          value={streetlightOnAngle}
                          onChange={(e) => onStreetlightOnAngleChange?.(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                        />
                        <div className="flex items-center gap-0.5 shrink-0 bg-black/60 border border-white/10 rounded px-1.5 py-0.5">
                          <input
                            type="number"
                            min="-90"
                            max="90"
                            step="0.1"
                            value={Number.isNaN(streetlightOnAngle) ? '' : streetlightOnAngle}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) onStreetlightOnAngleChange?.(Math.max(-90, Math.min(90, v)));
                            }}
                            className="w-11 text-right bg-transparent text-amber-300 font-mono font-extrabold text-[10px] focus:outline-none"
                          />
                          <span className="text-[9px] font-mono text-white/50">°</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Single Threshold Control for Direct Step Mode */
                  <div className="flex flex-col gap-1 bg-black/30 p-2 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center text-[7.5px] font-mono uppercase text-white/60">
                      <span>Corte Direto (&le; Ligado, &gt; Desligado)</span>
                      <span className={`px-1 py-0.5 rounded text-[7px] font-mono font-bold border ${
                        streetlightOffAngle > 0 
                          ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                          : streetlightOffAngle < 0 
                            ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                            : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                      }`}>
                        {streetlightOffAngle > 0 ? '+ Acima do Horizonte' : streetlightOffAngle < 0 ? '- Abaixo do Horizonte' : '0 No Horizonte (Sem Lado)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        step="0.1"
                        value={streetlightOffAngle}
                        onChange={(e) => onStreetlightOffAngleChange?.(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                      />
                      <div className="flex items-center gap-0.5 shrink-0 bg-black/60 border border-white/10 rounded px-1.5 py-0.5">
                        <input
                          type="number"
                          min="-90"
                          max="90"
                          step="0.1"
                          value={Number.isNaN(streetlightOffAngle) ? '' : streetlightOffAngle}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) onStreetlightOffAngleChange?.(Math.max(-90, Math.min(90, v)));
                          }}
                          className="w-11 text-right bg-transparent text-amber-300 font-mono font-extrabold text-[10px] focus:outline-none"
                        />
                        <span className="text-[9px] font-mono text-white/50">°</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode Toggle & Reset */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => onStreetlightTransitionToggle?.(!isStreetlightTransitionEnabled)}
                    className={`flex-1 py-1 rounded text-[7px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                      isStreetlightTransitionEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    }`}
                  >
                    {isStreetlightTransitionEnabled ? 'Transição: Proporcional' : 'Transição: Direta (Passo)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStreetlightOffAngleChange?.(-0.8);
                      onStreetlightOnAngleChange?.(-6.0);
                      onStreetlightTransitionToggle?.(true);
                    }}
                    className="px-1.5 py-1 rounded text-[7px] font-mono font-bold uppercase bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 cursor-pointer shrink-0"
                    title="Restaurar padrão astronômico (-0.8° e -6.0°)"
                  >
                    Reset (-0.8°/-6°)
                  </button>
                </div>
              </div>

              {/* Historical Trend Detailed Info */}
              <div className="w-full h-[1px] bg-white/10 my-0.5" />
              {cloudMode === 'trend' && (
                <div className="w-full border border-white/5 bg-white/5 rounded-xl p-2 flex flex-col gap-1">
                  <div className="text-[7px] font-bold text-white/30 uppercase tracking-widest leading-none">
                    Média Histórica
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
                    {trendResult.descriptionPt}
                  </div>
                  <div className="text-[6.5px] text-white/30 leading-snug font-sans">
                    Calculado com base nas coordenadas da localidade, época do ano e ciclo diurno de convecção.
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Date & Location Top Left */}
      <div className="absolute top-4 left-4 text-white/70 font-mono text-xs tracking-widest bg-black/40 backdrop-blur-md p-2.5 rounded-xl border border-white/10 z-[110] flex items-center gap-2 shadow-lg">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>{dateStr}</span>
      </div>

      {/* --- REAL-TIME LIGHTING STATUS INDICATOR PANEL --- */}
      <div className="absolute top-16 left-4 z-[110] w-64 sm:w-72 select-none">
        <div className="bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col gap-2.5">
          {/* Header with Title, Mode Badge, and Collapse/Expand */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-500 ${
                isNight 
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]' 
                  : 'bg-slate-800/50 border-white/10 text-slate-400'
              }`}>
                <Lightbulb className={`w-4 h-4 ${isNight ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold font-mono uppercase tracking-wider text-white">
                  Iluminação Pública
                </span>
                <span className="text-[8px] font-mono text-white/50 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />
                  <span className="truncate max-w-[110px]">{locationName || `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Visual tag for Selected Style: Cidade */}
              <button
                onClick={() => setSceneryMode(sceneryMode === 'city' ? 'rural' : 'city')}
                title="Alternar estilo do cenário (Cidade / Rodovia Rural)"
                className={`px-2 py-0.5 rounded-full border text-[8px] font-mono uppercase font-bold flex items-center gap-1 transition-all duration-300 cursor-pointer ${
                  sceneryMode === 'city'
                    ? 'text-pink-300 bg-pink-500/20 border-pink-400/40 shadow-[0_0_8px_rgba(244,114,182,0.3)]'
                    : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40'
                }`}
              >
                {sceneryMode === 'city' ? (
                  <>
                    <Building className="w-2.5 h-2.5 text-pink-400" />
                    <span>Cidade</span>
                  </>
                ) : (
                  <>
                    <Trees className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Rural</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsLightingPanelMinimized(!isLightingPanelMinimized)}
                title={isLightingPanelMinimized ? "Expandir detalhes" : "Minimizar"}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/5"
              >
                {isLightingPanelMinimized ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Real-time State: LIGADO vs DESLIGADO */}
          <div className={`p-2 rounded-xl border flex items-center justify-between transition-all duration-500 ${
            isNight
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300 shadow-[inset_0_0_15px_rgba(251,191,36,0.1)]'
              : 'bg-slate-900/60 border-white/5 text-slate-400'
          }`}>
            <div className="flex items-center gap-2">
              <span 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                  isNight 
                    ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-pulse' 
                    : 'bg-slate-600'
                }`}
                style={{ opacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 0.6 }}
              />
              <div className="flex flex-col">
                <span className="text-[7.5px] font-mono uppercase tracking-wider text-white/40">Estado Atual</span>
                <span className="text-xs font-bold font-mono tracking-wider">
                  {isNight ? 'LIGADO' : 'DESLIGADO'}
                </span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[7.5px] font-mono uppercase tracking-wider text-white/40">Intensidade</span>
              <span className="text-xs font-bold font-mono">
                {Math.round(streetLightIntensity * 100)}%
              </span>
            </div>
          </div>

          {/* Intensity Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(streetLightIntensity * 100)}%`,
                backgroundColor: streetLightIntensity > 0 ? '#fbbf24' : '#64748b',
                boxShadow: streetLightIntensity > 0 ? '0 0 8px #fbbf24' : 'none'
              }}
            />
          </div>

          {!isLightingPanelMinimized && (
            <>
              {/* Solar Altitude & Threshold Telemetry */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-white/80">
                <div className="bg-black/35 p-1.5 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7px] text-white/40 uppercase">Altitude Solar</span>
                  <span className={`text-[11px] font-bold ${altitude >= 0 ? 'text-amber-400' : altitude > -6 ? 'text-orange-300' : 'text-indigo-300'}`}>
                    {altitude > 0 ? `+${altitude.toFixed(2)}°` : `${altitude.toFixed(2)}°`}
                  </span>
                </div>
                <div className="bg-black/35 p-1.5 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7px] text-white/40 uppercase">Condição Solar</span>
                  <span className="text-[8px] font-semibold text-white/90 truncate">
                    {altitude >= 0 
                      ? 'Dia (> 0°)' 
                      : altitude > -6 
                        ? 'Crepúsculo (0° a -6°)' 
                        : 'Noite (≤ -6°)'
                    }
                  </span>
                </div>
              </div>

              {/* Active Rule Details for Cidade vs Rural */}
              {sceneryMode === 'city' ? (
                <div className="text-[7.5px] font-mono rounded-lg p-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-200/90 leading-tight">
                  <div className="flex items-center gap-1 font-bold text-pink-300 uppercase mb-0.5">
                    <Building className="w-2.5 h-2.5" />
                    <span>Estilo Cidade Aplicado</span>
                  </div>
                  {isCity24hStreetLightsOn ? (
                    <span className="text-amber-300 font-semibold">Trava 24h: Sol não sobe &gt; 0° no dia civil &rarr; Postes 100% ligados o dia todo</span>
                  ) : isCity24hStreetLightsOff ? (
                    <span className="text-emerald-300 font-semibold">Trava 24h: Sol não desce &lt; -6° no dia civil &rarr; Postes 0% desligados o dia todo</span>
                  ) : (
                    <span>Ciclo Normal: 0% dia (&gt;0°), 100% noite (&le;-6°) com transição entre 0° e -6°.</span>
                  )}
                </div>
              ) : (
                <div className="text-[7.5px] font-mono rounded-lg p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90 leading-tight">
                  <div className="flex items-center gap-1 font-bold text-emerald-300 uppercase mb-0.5">
                    <Trees className="w-2.5 h-2.5" />
                    <span>Estilo Rodovia Rural</span>
                  </div>
                  <span>Resposta instantânea contínua à altitude solar atual (sem travas de 24h).</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Traffic Info & Active Lights Alert - Center Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-[110] w-[92%] max-w-sm md:max-w-lg">
        {/* Dynamic Traffic Density Selector */}
        <div className="bg-black/60 border border-white/10 p-1 rounded-full backdrop-blur-md flex items-center justify-between gap-1 w-full shadow-lg">
          <div className="flex items-center gap-1 pl-3 text-white/50 text-[9px] font-mono uppercase tracking-widest font-bold select-none">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Tráfego:</span>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {(['auto', 'low', 'medium', 'high', 'intense'] as const).map((level) => {
              const isActive = trafficSelection === level;
              const labels = {
                auto: 'Auto',
                low: 'Baixo',
                medium: 'Médio',
                high: 'Alto',
                intense: 'Pico'
              };
              const activeColors = {
                auto: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
                intense: 'bg-red-500/20 text-red-300 border-red-500/30',
              };
              return (
                <button
                  key={level}
                  onClick={() => setTrafficSelection(level)}
                  className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-mono uppercase tracking-wider font-bold transition-all duration-200 border cursor-pointer ${
                    isActive 
                      ? `${activeColors[level]} shadow-sm` 
                      : 'bg-transparent text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {labels[level]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Traffic Schedule Region Selector */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-[8px] font-mono uppercase tracking-wider text-white/30">Fuso de Previsão de Tráfego</span>
          <div className="flex flex-wrap gap-1.5 bg-black/40 p-1 rounded-full border border-white/5 justify-center">
            {[
              { id: 'normal', label: 'Normal', emoji: '🌐', active: !useSpainSchedule && !useGaliciaSchedule },
              { id: 'spain', label: 'Espanha Continental (+1h)', emoji: '🇪🇸', active: useSpainSchedule },
              { id: 'galicia', label: 'Galiza (+2h)', emoji: '🐙', active: useGaliciaSchedule },
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => {
                  if (reg.id === 'normal') {
                    setUseSpainSchedule(false);
                    setUseGaliciaSchedule(false);
                  } else if (reg.id === 'spain') {
                    setUseSpainSchedule(true);
                    setUseGaliciaSchedule(false);
                  } else if (reg.id === 'galicia') {
                    setUseSpainSchedule(false);
                    setUseGaliciaSchedule(true);
                  }
                }}
                className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-mono uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-1 cursor-pointer border ${
                  reg.active
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_6px_rgba(245,158,11,0.15)]'
                    : 'bg-transparent text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <span>{reg.emoji}</span>
                <span>{reg.label}</span>
              </button>
            ))}
          </div>
          
          {trafficSelection === 'auto' && activeLifecyclePeriod && (
            <div className="text-[8px] font-mono text-white/50 bg-black/40 px-3 py-1 rounded-lg border border-white/5 text-center w-full uppercase tracking-wider backdrop-blur-sm flex flex-col sm:flex-row items-center justify-center gap-1">
              <span className="text-white/30">Fase do Ciclo de Vida do Trânsito:</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span>{activeLifecyclePeriod.emoji}</span>
                <span>{activeLifecyclePeriod.name}</span>
                <span className="text-white/40 font-normal">({formatDecimalTime(activeLifecyclePeriod.shiftedStart)} - {formatDecimalTime(activeLifecyclePeriod.shiftedEnd)})</span>
              </span>
            </div>
          )}
        </div>

        {/* Current Traffic Label & Street Lights Status badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          <div className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-semibold shadow-md backdrop-blur-md flex items-center gap-1.5 ${solarPhase.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${solarPhase.dotColor}`}></span>
            <span>Fase: {solarPhase.text} ({solarPhase.range} • Alt: {altitude.toFixed(1)}°)</span>
          </div>
          <div className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-semibold shadow-md backdrop-blur-md flex items-center gap-1 ${trafficLabel.color}`}>
            <span>{trafficLabel.text}</span>
          </div>
          <div className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-semibold shadow-md backdrop-blur-md flex items-center gap-1 transition-all duration-500 ${isNight ? 'text-amber-300 bg-amber-400/10 border-amber-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-500/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isNight ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-500'}`} style={{ opacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 1 }}></span>
            <span>
              Postes: {isCity24hStreetLightsOn 
                ? 'LIGADOS 24H (100% • Sol não sobe > 0° • Cidade)' 
                : isCity24hStreetLightsOff
                  ? 'DESLIGADOS 24H (0% • Sol não desce < -6° • Cidade)'
                  : isNight 
                    ? `LIGADOS (${Math.round(streetLightIntensity * 100)}%)` 
                    : 'DESLIGADOS'
              }
            </span>
          </div>
          <button 
            onClick={() => setShowLifecyclePanel(!showLifecyclePanel)}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              showLifecyclePanel 
                ? 'text-amber-300 bg-amber-400/20 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]' 
                : 'text-white/50 bg-black/45 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Ciclo de Vida: {showLifecyclePanel ? 'Aberto' : 'Fechado'}</span>
          </button>
          <button 
            onClick={() => setIsRealSize(!isRealSize)}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              isRealSize 
                ? 'text-emerald-300 bg-emerald-400/20 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]' 
                : 'text-white/50 bg-black/45 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Escala: {isRealSize ? 'Tamanho Real (10m)' : 'Escala Padrão'}</span>
          </button>
          <button 
            onClick={() => setShowBuildings(!showBuildings)}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              showBuildings 
                ? 'text-cyan-300 bg-cyan-400/20 border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.25)]' 
                : 'text-white/50 bg-black/45 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cenário: {showBuildings ? 'Mostrar' : 'Ocultar'}</span>
          </button>
          {showBuildings && (
            <button 
              onClick={() => setSceneryMode(sceneryMode === 'city' ? 'rural' : 'city')}
              className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer text-pink-300 bg-pink-400/20 border-pink-400/40 shadow-[0_0_8px_rgba(244,114,182,0.25)]`}
            >
              {sceneryMode === 'city' ? (
                <>
                  <Building className="w-3.5 h-3.5 text-pink-400" />
                  <span>Estilo: Cidade</span>
                </>
              ) : (
                <>
                  <Trees className="w-3.5 h-3.5 text-pink-400" />
                  <span>Estilo: Rodovia Rural</span>
                </>
              )}
            </button>
          )}
          <button 
            onClick={() => setShowCloudMenu(!showCloudMenu)}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              showCloudMenu 
                ? 'text-amber-300 bg-amber-400/20 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]' 
                : 'text-white/50 bg-black/45 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Nuvens: {
              cloudMode === 'trend' ? 'Seguir Dia' :
              cloudMode === 'heavy' ? 'Pesado' :
              cloudMode === 'medium' ? 'Médio' :
              cloudMode === 'light' ? 'Leve' : 'Sem'
            }</span>
          </button>
          <button 
            onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
            className={`px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              showPerformanceDashboard 
                ? 'text-violet-300 bg-violet-400/20 border-violet-400/40 shadow-[0_0_8px_rgba(139,92,246,0.25)]' 
                : 'text-white/50 bg-black/45 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>RAM & Desempenho: {ramLimit}</span>
          </button>
        </div>
      </div>

      {/* Times Display Bottom */}
      <div className="absolute bottom-4 left-4 text-white/80 font-mono text-base bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 z-[110] flex flex-col gap-0.5">
        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Hora Civil Local</span>
        <span className="font-bold">{civilTimeStr}</span>
      </div>

      <div className="absolute bottom-4 right-4 text-amber-300 font-mono text-base bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 z-[110] flex flex-col gap-0.5 text-right">
        <span className="text-[9px] uppercase tracking-wider text-amber-300/40 font-bold">Hora Solar Verdadeira</span>
        <span className="font-bold">{solarTimeStr}</span>
      </div>

      {/* --- SKY LAYER (Behind everything) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Dynamic Sun */}
        <motion.div 
          className="absolute"
          initial={false}
          animate={{
            top: `${Math.max(-50, Math.min(130, sunYPos))}%`,
            opacity: sunIconOpacity
          }}
          transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          style={{
            left: `${sunXPos}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Sun Rays Halo */}
            <div className="absolute w-44 h-44 rounded-full bg-amber-300/15 blur-2xl animate-pulse" />
            <Sun size={80} className="text-amber-300 drop-shadow-[0_0_35px_rgba(251,191,36,0.6)]" />
            <div className="absolute top-full mt-2 text-white/50 text-[9px] font-mono uppercase tracking-widest text-center whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded">
              Sol: {altitude.toFixed(1)}°
            </div>
          </div>
        </motion.div>

        {/* Dynamic Moon */}
        <motion.div 
          className="absolute"
          initial={false}
          animate={{
            top: `${Math.max(-50, Math.min(130, moonYPos))}%`,
            opacity: moonIconOpacity
          }}
          transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          style={{
            left: `${moonXPos}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-white/5 blur-xl" />
            <Moon size={56} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
            <div className="absolute top-full mt-2 text-white/40 text-[9px] font-mono uppercase tracking-widest text-center whitespace-nowrap bg-black/20 px-1.5 py-0.5 rounded">
              Lua: {moonAltDeg.toFixed(1)}°
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- BACKGROUND SCENERY LAYER (CITY BUILDINGS OR RURAL FARMS) --- */}
      {showBuildings && (
        sceneryMode === 'city' ? (
          <div 
            className="absolute inset-x-0 bottom-[35%] h-[250px] z-[5] pointer-events-none"
          >
            {BUILDINGS_DEF.map((building, idx) => {
              const nightIntensity = Math.max(0, Math.min(1, -altitude / 10));
              const showBuildingLights = altitude <= buildingLightThreshold;
              
               // Generate windows grid (optimized based on ramLimit to save DOM nodes and GPU memory)
              const windowItems = [];
              const rowsLimit = ramLimit === '2GB' ? Math.min(2, building.rows) : building.rows;
              const colsLimit = ramLimit === '2GB' ? Math.min(2, building.cols) : building.cols;
              for (let r = 0; r < rowsLimit; r++) {
                for (let c = 0; c < colsLimit; c++) {
                  windowItems.push(
                      <div
                        key={`${r}-${c}`}
                        className="w-1 h-1.5 rounded-sm transition-all duration-700"
                        style={{
                          backgroundColor: showBuildingLights ? "#fbbf24" : "#020617",
                          opacity: showBuildingLights ? Math.min(0.3 + nightIntensity * 0.7, 1) : 0.1,
                        }}
                      />
                  );
                }
              }

              // Path for building silhouette
              let path = `M 0,${building.height} L 0,0 L 100,0 L 100,${building.height} Z`; // flat
              if (building.style === 'stepped') {
                path = `M 0,${building.height} L 0,40 L 20,40 L 20,0 L 80,0 L 80,40 L 100,40 L 100,${building.height} Z`;
              } else if (building.style === 'sloped') {
                path = `M 0,${building.height} L 0,40 L 50,0 L 100,40 L 100,${building.height} Z`;
              }

              const topPadding = building.style === 'stepped' ? 'pt-12' : building.style === 'sloped' ? 'pt-10' : 'pt-4';

              return (
                <div
                  key={`bldg-${idx}-${building.left}`}
                  className="absolute"
                  style={{
                    left: building.left,
                    width: building.width,
                    bottom: '0px',
                    height: `${building.height}px`,
                  }}
                >
                  {/* SVG Silhouette */}
                  <svg viewBox={`0 0 100 ${building.height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                      {/* Shadow */}
                      {altitude > 0 && (
                        <path 
                          d={path} 
                          fill="rgba(0,0,0,0.3)" 
                          transform={getShadowTransform(altitude, azimuth)}
                          style={{ transformOrigin: 'bottom' }}
                        />
                      )}
                      {/* Cloud Shadow */}
                      {altitude > 0 && effectiveCloudOpacity > 0 && (
                        <path 
                          d={path} 
                          fill={`rgba(0,0,0,${effectiveCloudOpacity * 0.3})`} 
                          transform={getCloudShadowTransform(altitude, azimuth)}
                          style={{ transformOrigin: 'bottom' }}
                        />
                      )}
                    {/* Building */}
                    <path d={path} fill={
                      sceneryMode === 'city'
                        ? ['#d1d5db', '#a3a3a3', '#9ca3af', '#6b7280'][idx % 4]
                        : '#854d0e'
                    } />
                    {sceneryMode === 'city' && (
                      <path d={path} fill={['#1e293b', '#0f172a', '#020617', '#0f172a'][idx % 4]} style={{ opacity: nightIntensity }} />
                    )}
                    {building.style === 'antenna' && (
                      <>
                        <line x1="50" y1="0" x2="50" y2="-25" stroke={sceneryMode === 'city' ? (showBuildingLights ? '#334155' : '#d1d5db') : '#854d0e'} strokeWidth="2.5" />
                        <circle cx="50" cy="-25" r="3" fill="#ef4444" className={showBuildingLights ? "animate-pulse" : "opacity-0"} />
                        {showBuildingLights && <circle cx="50" cy="-25" r="7" fill="#ef4444" opacity="0.3" className="animate-ping" />}
                      </>
                    )}
                  </svg>

                  {/* Windows */}
                  <div className={`absolute inset-0 flex items-center justify-center ${topPadding} pb-4 px-2 pointer-events-none`}>
                    <div 
                      className="grid gap-x-2 gap-y-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${building.cols}, minmax(0, 1fr))`,
                      }}
                    >
                      {windowItems}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div 
            className="absolute inset-x-0 bottom-[35%] h-[250px] z-[5] pointer-events-none"
          >
            <style>{`
              @keyframes spin-windmill {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .animate-windmill {
                animation: spin-windmill 16s linear infinite;
              }
            `}</style>
            {RURAL_SCENERY_DEF.map((rural, idx) => {
              const ruralLightIntensity = Math.max(0, Math.min(1, (0 - altitude) / 6));
              const isGlowing = ruralLightIntensity > 0;

              return (
                <div
                  key={`rural-${idx}-${rural.left}`}
                  className="absolute"
                  style={{
                    left: rural.left,
                    width: rural.width,
                    bottom: '0px',
                    height: `${rural.height}px`,
                  }}
                >
                  {rural.style === 'windmill' && (
                    <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full overflow-visible">
                      {/* Shadow */}
                      {altitude > 0 && (
                        <path 
                          d="M 44,150 L 48,40 L 52,40 L 56,150 Z" 
                          fill="rgba(0,0,0,0.3)" 
                          transform={getShadowTransform(altitude, azimuth)}
                          style={{ transformOrigin: 'bottom' }}
                        />
                      )}
                      
                      {/* Building */}
                      <g fill="#854d0e">
                        <path d="M 44,150 L 48,40 L 52,40 L 56,150 Z" />
                        <g className="animate-windmill" style={{ transformOrigin: '50px 40px' }}>
                          <line x1="50" y1="40" x2="50" y2="5" stroke="#854d0e" strokeWidth="2.5" />
                          <line x1="50" y1="40" x2="80" y2="58" stroke="#854d0e" strokeWidth="2.5" />
                          <line x1="50" y1="40" x2="20" y2="58" stroke="#854d0e" strokeWidth="2.5" />
                          
                          <polygon points="50,5 53,22 47,22" fill="#854d0e" />
                          <polygon points="80,58 65,51 68,46" fill="#854d0e" />
                          <polygon points="20,58 35,51 32,46" fill="#854d0e" />
                        </g>
                        <circle cx="50" cy="40" r="2.5" fill="#ef4444" className={isGlowing ? "animate-pulse" : "opacity-0"} />
                        {isGlowing && <circle cx="50" cy="40" r="5" fill="#ef4444" opacity="0.4" className="animate-ping" />}
                      </g>
                    </svg>
                  )}

                  {rural.style === 'farmhouse' && (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full">
                      {/* Shadow */}
                      {altitude > 0 && (
                        <path 
                          d="M 10,40 L 50,10 L 90,40 Z M 15,40 H 85 V 100 H 15 Z"
                          fill="rgba(0,0,0,0.3)" 
                          transform={getShadowTransform(altitude, azimuth)}
                          style={{ transformOrigin: 'bottom' }}
                        />
                      )}
                      <g fill="#854d0e">
                        <rect x="72" y="12" width="7" height="25" fill="#a8a29e" />
                        <path d="M 10,40 L 50,10 L 90,40 Z" fill="#991b1b" />
                        <rect x="15" y="40" width="70" height="60" />
                      </g>
                      
                      {/* Cozy Windows glowing smoothly */}
                      <rect 
                        x="26" y="55" width="11" height="14" rx="1"
                        fill="#fbbf24" 
                        className="transition-all duration-700" 
                        style={{ fillOpacity: ruralLightIntensity, filter: isGlowing && ramLimit !== '2GB' ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.75))' : 'none' }} 
                      />
                      <rect 
                        x="63" y="55" width="11" height="14" rx="1"
                        fill="#fbbf24" 
                        className="transition-all duration-700" 
                        style={{ fillOpacity: ruralLightIntensity, filter: isGlowing && ramLimit !== '2GB' ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.75))' : 'none' }} 
                      />
                      <rect 
                        x="45" y="68" width="10" height="22" rx="0.5"
                        fill="#fbbf24" 
                        className="transition-all duration-700" 
                        style={{ fillOpacity: ruralLightIntensity * 0.4 }} 
                      />
                    </svg>
                  )}

                  {rural.style === 'barn' && (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full text-[#080c16] fill-current">
                      <path d="M 10,100 L 10,45 L 25,25 L 50,15 L 75,25 L 90,45 L 90,100 Z" />
                      <path d="M 35,62 L 65,62 L 65,100 L 35,100 Z" fill="#04060c" />
                      <line x1="35" y1="62" x2="65" y2="100" stroke="#080c16" strokeWidth="2" />
                      <line x1="65" y1="62" x2="35" y2="100" stroke="#080c16" strokeWidth="2" />
                      
                      {/* Loft Window */}
                      <polygon 
                        points="50,26 43,36 57,36" 
                        fill="#fcd34d" 
                        className="transition-all duration-700" 
                        style={{ fillOpacity: ruralLightIntensity * 0.85, filter: isGlowing && ramLimit !== '2GB' ? 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.6))' : 'none' }} 
                      />
                    </svg>
                  )}

                  {rural.style === 'silo' && (
                    <svg viewBox="0 0 50 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full text-[#080c16] fill-current">
                      <path d="M 10,30 A 15,15 0 0,1 40,30 Z" />
                      <rect x="10" y="30" width="30" height="70" />
                      <line x1="10" y1="46" x2="40" y2="46" stroke="#04060c" strokeWidth="1.5" />
                      <line x1="10" y1="62" x2="40" y2="62" stroke="#04060c" strokeWidth="1.5" />
                      <line x1="10" y1="78" x2="40" y2="78" stroke="#04060c" strokeWidth="1.5" />
                    </svg>
                  )}

                  {rural.style === 'tree' && (
                    <svg viewBox="0 0 60 100" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full text-[#05080f] fill-current">
                      <polygon points="30,8 14,35 46,35" />
                      <polygon points="30,24 9,55 51,55" />
                      <polygon points="30,44 4,80 56,80" />
                      <rect x="27" y="80" width="6" height="20" fill="#030408" />
                    </svg>
                  )}

                  {rural.style === 'haybale' && (
                    <svg viewBox="0 0 80 50" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full text-[#090e1a] fill-current">
                      <ellipse cx="40" cy="30" rx="35" ry="20" />
                      <ellipse cx="40" cy="30" rx="28" ry="14" fill="none" stroke="#04060b" strokeWidth="1.5" />
                      <ellipse cx="40" cy="30" rx="18" ry="9" fill="none" stroke="#04060b" strokeWidth="1.5" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* --- GROUND, STREET, AND LIGHTS LAYER (Front overlay) --- */}
      {/* The ground starts at exactly 65% vertical height, matching the 0-degrees altitude horizon */}
      <div 
        className={`absolute inset-x-0 bottom-0 top-[65%] border-t border-white/10 z-10 flex flex-col justify-between overflow-hidden shadow-[inset_0_20px_40px_rgba(0,0,0,0.8)] ${
          sceneryMode === 'city' ? 'bg-slate-950' : 'bg-gradient-to-b from-[#03140a] via-[#020b05] to-slate-950'
        }`}
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 20%',
          transformStyle: 'preserve-3d',
        }}
      >
        
        {/* Background horizon mountains/hills decoration */}
        <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-slate-950 to-transparent opacity-40 z-0 pointer-events-none" />

        {/* --- 3D PERSPECTIVE GROUND PLANE --- */}
        <div 
          className="relative w-full h-full flex flex-col justify-between"
          style={{
            transform: 'rotateX(22deg)',
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* --- BACK STREET LIGHT POLES (Row of 5, upper sidewalk at Y = 5%) --- */}
          <div className="absolute inset-x-0 top-0 h-0 z-20" style={{ transformStyle: 'preserve-3d' }}>
            {backPoles.map(pole => (
              <React.Fragment key={`back-pole-${pole.id}`}>
                <div 
                  className="absolute bottom-0"
                  style={{ 
                    left: pole.x, 
                    transform: 'translateY(16px) translateZ(-120px) rotateX(-22deg) scale(0.8)',
                    transformOrigin: 'bottom center',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {sceneryMode === 'city' ? (
                    /* Pole Lamp SVG Structure (City Style) */
                    <svg width="40" height="75" viewBox="0 0 40 75" className="overflow-visible">
                      {/* Steel Pole */}
                      <line x1="20" y1="75" x2="20" y2="15" stroke="#475569" strokeWidth="2" />
                      {/* Curved Arm */}
                      <path d="M 20,15 C 20,10 24,6 30,6 L 33,6" fill="none" stroke="#475569" strokeWidth="1.5" />
                      {/* Solar Panel */}
                      <line x1="17" y1="12" x2="23" y2="10" stroke="#1e293b" strokeWidth="1.5" />
                      {/* Lamp Fixture */}
                      <rect x="30" y="6" width="6" height="3" rx="1" fill="#334155" />
                      
                      {/* Light Beam Cone (Warm Yellow Glow Cone) */}
                      <polygon 
                        points="33,9 0,75 66,75" 
                        fill="url(#back-cone-grad)" 
                        className="transition-opacity duration-300"
                        style={{ 
                          opacity: streetLightIntensity, 
                          transformOrigin: '33px 9px',
                          pointerEvents: 'none'
                        }} 
                      />

                      {/* Glowing light emitter bulb */}
                      <circle 
                        cx="33" 
                        cy="9" 
                        r="2.5" 
                        fill={isNight ? '#fef08a' : '#64748b'} 
                        style={{ fillOpacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 1 }}
                        className="transition-all duration-300" 
                      />
                      {isNight && (
                        <circle 
                          cx="33" 
                          cy="9" 
                          r="6" 
                          fill="#fef08a" 
                          style={{ opacity: 0.4 * streetLightIntensity }} 
                          className="transition-opacity duration-300"
                        />
                      )}
                    </svg>
                  ) : (
                    /* Highway Pole SVG Structure (Rural/Highway Style) */
                    <svg width="40" height="75" viewBox="0 0 40 75" className="overflow-visible">
                      {/* Curved Highway Steel Pole */}
                      <path d="M 12,75 Q 12,10 32,6" fill="none" stroke="#475569" strokeWidth="2.5" />
                      {/* Lamp Fixture */}
                      <rect x="28" y="4" width="7" height="3" rx="1" fill="#334155" transform="rotate(10 28 4)" />
                      
                      {/* Light Beam Cone (Warm Yellow Glow Cone) */}
                      <polygon 
                        points="31,7 0,75 66,75" 
                        fill="url(#back-cone-grad)" 
                        className="transition-opacity duration-300"
                        style={{ 
                          opacity: streetLightIntensity, 
                          transformOrigin: '31px 7px',
                          pointerEvents: 'none'
                        }} 
                      />

                      {/* Glowing light emitter bulb */}
                      <circle 
                        cx="31" 
                        cy="7" 
                        r="2.5" 
                        fill={isNight ? '#fef08a' : '#64748b'} 
                        style={{ fillOpacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 1 }}
                        className="transition-all duration-300" 
                      />
                      {isNight && (
                        <circle 
                          cx="31" 
                          cy="7" 
                          r="6" 
                          fill="#fef08a" 
                          style={{ opacity: 0.4 * streetLightIntensity }} 
                          className="transition-opacity duration-300"
                        />
                      )}
                    </svg>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Light Beam Gradients Definition */}
          <svg className="absolute w-0 h-0">
            <defs>
              <linearGradient id="back-cone-grad" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="rgba(253, 224, 71, 0.42)" />
                <stop offset="60%" stopColor="rgba(253, 224, 71, 0.12)" />
                <stop offset="100%" stopColor="rgba(253, 224, 71, 0)" />
              </linearGradient>
              <linearGradient id="front-cone-grad" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="rgba(253, 224, 71, 0.48)" />
                <stop offset="60%" stopColor="rgba(253, 224, 71, 0.14)" />
                <stop offset="100%" stopColor="rgba(253, 224, 71, 0)" />
              </linearGradient>
            </defs>
          </svg>

          {/* --- ASPHALT STREET --- */}
          <div 
            ref={streetRef}
            className="w-full h-28 bg-slate-900 border-y-2 border-slate-800 relative z-10 my-auto shadow-2xl flex flex-col justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            
            {/* Side Curb markings or Green Highway Shoulders */}
            {sceneryMode === 'city' ? (
              <>
                <div className="absolute top-0 inset-x-0 h-1 bg-slate-800" />
                <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800" />
              </>
            ) : (
              <>
                {/* Green grass/gravel shoulder along the upper & lower edges of the highway */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-emerald-900 to-slate-900 border-b border-emerald-800/35 shadow-inner z-10" />
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-t from-emerald-900 to-slate-900 border-t border-emerald-800/35 shadow-inner z-10" />
                {/* Guardrails (defensas metálicas) */}
                <div className="absolute top-1.5 inset-x-0 h-1.5 border-y border-slate-600 bg-slate-500/40 shadow-sm opacity-90 z-20" />
                <div className="absolute bottom-1.5 inset-x-0 h-1.5 border-y border-slate-600 bg-slate-500/40 shadow-sm opacity-90 z-20" />
                {/* Solid white highway lane boundary lines */}
                <div className="absolute top-[8%] inset-x-0 h-0.5 bg-white/70 shadow-[0_0_2px_white] z-10" />
                <div className="absolute bottom-[8%] inset-x-0 h-0.5 bg-white/70 shadow-[0_0_2px_white] z-10" />
                {/* High-visibility green Highway direction sign */}
                <div 
                  className="absolute top-3 left-6 z-40 bg-emerald-800 border border-white px-2 py-0.5 rounded text-white font-bold font-mono text-[7px] uppercase tracking-wider shadow-md pointer-events-none" 
                  style={{ transform: 'rotateX(-12deg) translateZ(10px)' }}
                >
                  Rodovia Solaris
                  <span className="text-[6px] text-emerald-300 font-normal ml-1.5">KM 108</span>
                </div>
              </>
            )}

            {/* 10-Meter Street Scale Indicator (Real Size mode) */}
            {isRealSize && (
              <div 
                className="absolute inset-x-0 bottom-0 h-6 bg-slate-950/90 border-t border-emerald-500/30 flex justify-between items-center px-4 select-none z-30 pointer-events-none"
                style={{ transform: 'translateZ(1px)' }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                  <div key={`road-meter-${m}`} className="flex flex-col items-center h-full justify-between py-0.5">
                    <div className="w-[1.5px] h-2 bg-emerald-400" />
                    <span className="text-[7px] font-bold font-mono text-emerald-400 tracking-tighter leading-none">{m}m</span>
                  </div>
                ))}
              </div>
            )}

            {/* Yellow Dashed Divider (Lanes dividing line) */}
            <div className="w-full h-0 border-t-2 border-dashed border-amber-500/60 opacity-80" />
            
            {/* White Lane Markings */}
            <div className="absolute top-[25%] inset-x-0 h-0 border-t border-dashed border-white/20" />
            <div className="absolute bottom-[25%] inset-x-0 h-0 border-t border-dashed border-white/20" />

            {/* Traffic Lights - ONLY in city mode */}
            {sceneryMode === 'city' && (
              <div className={`absolute top-0 right-10 z-40 p-1 bg-slate-800 rounded flex flex-col gap-1 ${lightState === 'vehicle' ? 'border border-green-500' : 'border border-red-500'}`}>
                <div className={`w-3 h-3 rounded-full ${lightState === 'vehicle' ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                <div className={`w-3 h-3 rounded-full ${lightState === 'pedestrian' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
              </div>
            )}

            {/* --- GROUND SUNLIGHT GLOW (Appears directly on the asphalt ground) --- */}
            {altitude > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-500"
                style={{
                  background: `radial-gradient(ellipse 60% 40% at ${sunXPos}% 50%, rgba(251, 191, 36, ${Math.min(0.4, altitude / 45) * 0.45}) 0%, rgba(251, 191, 36, ${Math.min(0.4, altitude / 45) * 0.12}) 60%, rgba(251, 191, 36, 0) 100%)`,
                  transform: 'translateZ(0px)',
                }}
              />
            )}

            {/* --- STREET LIGHT POOLS ON THE ASPHALT --- */}
            {isNight && (
              <div className="absolute inset-0 pointer-events-none z-25" style={{ transformStyle: 'preserve-3d' }}>
                {/* Back poles light pools (directly on the far lane of the road) */}
                {backPoles.map(pole => (
                  <div 
                    key={`pool-back-${pole.id}`}
                    className="absolute w-36 h-10 bg-amber-400/12 blur-md rounded-full pointer-events-none transition-all duration-300"
                    style={{
                      left: `calc(${pole.x} - 62px)`, // lamp head offset aligned to center
                      top: '15%',
                      transform: 'translateZ(-50px)',
                      opacity: streetLightIntensity,
                    }}
                  />
                ))}

                {/* Front poles light pools (directly on the near lane of the road) */}
                {frontPoles.map(pole => (
                  <div 
                    key={`pool-front-${pole.id}`}
                    className="absolute w-48 h-14 bg-amber-400/20 blur-lg rounded-full pointer-events-none transition-all duration-300"
                    style={{
                      left: `calc(${pole.x} - 76px)`, // lamp head offset aligned to center
                      bottom: '15%',
                      transform: 'translateZ(50px)',
                      opacity: streetLightIntensity,
                    }}
                  />
                ))}
              </div>
            )}

            {/* --- ROAD CARS (Animate left-to-right & right-to-left based on traffic level) --- */}
            <div className="absolute inset-0 z-30 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
              {visibleCars.map((car, carIdx) => {
                const isL2R = car.direction === 'left-to-right';
                const verticalPositionClass = car.lane === 'far'
                  ? 'top-[12%]'
                  : 'bottom-[12%]';
                
                const styleAdjustment = isL2R && car.lane === 'far' ? { top: 'calc(12% - 20px)' } : {}; // 20px approx 0.5m
                const direction = car.direction;

                const activeSpeed = `${(car.speed * speedMultiplier).toFixed(2)}s`;
                const activeDelay = `${(car.delay * delayMultiplier).toFixed(2)}s`;

                // Use translateZ and rotateX to stand the cars up slightly in 3D perspective!
                const zTranslation = car.lane === 'far' ? -50 : 50;
                const customScale = car.lane === 'far' ? 0.82 : 1.18;

                return (
                  <div
                    key={`road-car-${car.id}-${carIdx}`}
                    className={`absolute ${verticalPositionClass} ${direction === 'left-to-right' ? 'animate-drive-l2r' : 'animate-drive-r2l'}`}
                    style={{
                      '--drive-speed': activeSpeed,
                      '--drive-delay': activeDelay,
                      transform: `translateZ(${zTranslation}px) rotateX(-12deg) scale(${customScale})`,
                      transformStyle: 'preserve-3d',
                      ...styleAdjustment,
                    } as React.CSSProperties}
                  >
                    <StylizedCar 
                      color={car.color} 
                      direction={direction} 
                      type={car.type} 
                      isNight={carHeadlightsOn} 
                    />
                  </div>
                );
              })}
            </div>

            {/* --- CENTRAL SAFETY PLAZA & SUNDIAL POINTER (GNOMON) --- */}
            {/* "o meio e o ponto pedido" - located exactly in the horizontal and vertical center of the road */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-35 flex items-center justify-center"
              style={{
                transform: 'translateZ(0px)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Flat circular base plate lying flat on the ground */}
              <div 
                className="relative w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 shadow-xl flex items-center justify-center"
                style={{
                  transform: 'rotateX(0deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Small decorative bronze circular plate */}
                <div className="absolute w-4 h-4 rounded-full bg-slate-750 border border-slate-600/50" />

                {/* Dynamic Gnomon Shadow cast flat on the asphalt and plate */}
                {shadowInfo && (
                  <div 
                    className="absolute left-1/2 top-1/2 origin-top-center bg-black/85 blur-[0.7px] pointer-events-none transition-all duration-300"
                    style={{
                      width: shadowInfo.type === 'solar' ? '3.5px' : '2px',
                      height: `${shadowInfo.length}px`,
                      // We map angleDeg to point in the computed shadow direction
                      transform: `translate(-50%, 0) rotate(${shadowInfo.angle}deg)`,
                      opacity: shadowInfo.opacity,
                      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangular wedge shadow
                    }}
                  />
                )}
              </div>

              {/* Upright physical 3D Gnomon (Ponteiro) standing perpendicular to the ground */}
              {/* Height: 0.5 meters (represented by gnomonHeightPx, with clear dimension markers) */}
              <div 
                className="absolute flex flex-col items-center pointer-events-none"
                style={{
                  transform: `translateY(${-gnomonHeightPx * 0.6}px) translateZ(5px) rotateX(-22deg)`, // Stand upright!
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Side dimension scale indicator for 0.5m height */}
                <div 
                  className="absolute -left-8 top-0 flex items-center gap-1"
                  style={{ height: `${gnomonHeightPx}px` }}
                >
                  {/* Tiny ruler lines */}
                  <div className="flex flex-col justify-between h-full border-r border-amber-400/40 pr-1 text-[5px] font-mono text-amber-300/60">
                    <span>0,5m</span>
                    <span>0,25m</span>
                    <span>0m</span>
                  </div>
                  <div className="w-1 h-full border-y border-dashed border-amber-400/40" />
                </div>

                {/* Gnomon triangle SVG */}
                <svg 
                  width={Math.max(10, 20 * (gnomonHeightPx / 40))} 
                  height={gnomonHeightPx} 
                  viewBox="0 0 20 40" 
                  className="overflow-visible drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
                >
                  {/* The triangular wedge aligned North-South */}
                  <polygon points="10,0 2,40 18,40" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                  {/* Highlight face */}
                  <polygon points="10,0 10,40 18,40" fill="#f1f5f9" />
                  {/* Center seam */}
                  <line x1="10" y1="0" x2="10" y2="40" stroke="#94a3b8" strokeWidth="0.8" />
                </svg>
                
                {/* Label banner */}
                <div className="bg-slate-950/90 text-[6px] text-amber-300 font-mono px-1 py-0.5 rounded border border-amber-500/30 whitespace-nowrap -mt-1 shadow-lg font-bold tracking-widest uppercase">
                  Ponteiro: 0.5m
                </div>
              </div>
            </div>
          </div>

          {/* --- FRONT STREET LIGHT POLES (Row of 5, lower sidewalk at Y = 95%) --- */}
          <div className="absolute inset-x-0 bottom-0 h-0 z-40" style={{ transformStyle: 'preserve-3d' }}>
            {frontPoles.map(pole => (
              <React.Fragment key={`front-pole-${pole.id}`}>
                <div 
                  className="absolute bottom-0"
                  style={{ 
                    left: pole.x, 
                    transform: 'translateY(-2px) translateZ(120px) rotateX(-22deg) scale(1.15)',
                    transformOrigin: 'bottom center',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {sceneryMode === 'city' ? (
                    /* Forefront taller Pole SVG Structure (City Style) */
                    <svg width="50" height="95" viewBox="0 0 50 95" className="overflow-visible">
                      {/* Dark Steel Pole */}
                      <line x1="25" y1="95" x2="25" y2="18" stroke="#334155" strokeWidth="3" />
                      {/* Curved Arm */}
                      <path d="M 25,18 C 25,12 30,8 38,8 L 42,8" fill="none" stroke="#334155" strokeWidth="2" />
                      {/* Solar Panel */}
                      <line x1="21" y1="14" x2="29" y2="12" stroke="#0f172a" strokeWidth="2" />
                      {/* Lamp Fixture */}
                      <rect x="38" y="8" width="8" height="4" rx="1.5" fill="#1e293b" />
                      
                      {/* Light Beam Cone (Closer, larger, brighter cone) */}
                      <polygon 
                        points="42,12 0,95 84,95" 
                        fill="url(#front-cone-grad)" 
                        className="transition-opacity duration-300"
                        style={{ 
                          opacity: streetLightIntensity, 
                          transformOrigin: '42px 12px',
                          pointerEvents: 'none'
                        }} 
                      />

                      {/* Glowing light bulb emitter */}
                      <circle 
                        cx="42" 
                        cy="12" 
                        r="3.5" 
                        fill={isNight ? '#fef08a' : '#475569'} 
                        style={{ fillOpacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 1 }}
                        className="transition-all duration-300" 
                      />
                      {isNight && (
                        <circle 
                          cx="42" 
                          cy="12" 
                          r="8" 
                          fill="#fef08a" 
                          style={{ opacity: 0.45 * streetLightIntensity }} 
                          className="transition-opacity duration-300"
                        />
                      )}
                    </svg>
                  ) : (
                    /* Forefront taller Pole SVG Structure (Rural/Highway Style) */
                    <svg width="50" height="95" viewBox="0 0 50 95" className="overflow-visible">
                      {/* Curved Highway Steel Pole */}
                      <path d="M 15,95 Q 15,12 40,8" fill="none" stroke="#475569" strokeWidth="3" />
                      {/* Lamp Fixture */}
                      <rect x="36" y="5" width="9" height="4" rx="1.5" fill="#334155" transform="rotate(8 36 5)" />
                      
                      {/* Light Beam Cone (Closer, larger, brighter cone) */}
                      <polygon 
                        points="40,10 0,95 84,95" 
                        fill="url(#front-cone-grad)" 
                        className="transition-opacity duration-300"
                        style={{ 
                          opacity: streetLightIntensity, 
                          transformOrigin: '40px 10px',
                          pointerEvents: 'none'
                        }} 
                      />

                      {/* Glowing light bulb emitter */}
                      <circle 
                        cx="40" 
                        cy="10" 
                        r="3.5" 
                        fill={isNight ? '#fef08a' : '#334155'} 
                        style={{ fillOpacity: isNight ? 0.3 + 0.7 * streetLightIntensity : 1 }}
                        className="transition-all duration-300" 
                      />
                      {isNight && (
                        <circle 
                          cx="40" 
                          cy="10" 
                          r="8" 
                          fill="#fef08a" 
                          style={{ opacity: 0.45 * streetLightIntensity }} 
                          className="transition-opacity duration-300"
                        />
                      )}
                    </svg>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Small horizon coordinate info footer overlay */}
          <div className="w-full py-1 text-center font-mono text-[8px] tracking-widest text-white/10 uppercase z-40 bg-slate-950 border-t border-white/5 select-none shrink-0">
            Rua Solar &bull; Plano de Projeção Geocêntrica de 0&deg; de Altitude (Horizonte)
          </div>
        </div>
      </div>

      {/* --- FLOATING LIFE CYCLE PANEL --- */}
      <AnimatePresence>
        {showLifecyclePanel && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 0, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, y: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="absolute top-28 right-4 bottom-28 w-80 max-w-[calc(100vw-2rem)] bg-slate-950/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-y-auto z-[110] flex flex-col gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.6)] scrollbar-thin scrollbar-thumb-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">Ciclo de Vida do Tráfego</span>
              </div>
              <button 
                onClick={() => setShowLifecyclePanel(false)}
                className="text-white/40 hover:text-white text-[10px] font-mono cursor-pointer bg-transparent border-0 outline-none"
              >
                [OCULTAR]
              </button>
            </div>
            
            <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider leading-relaxed">
              Clique em qualquer parte do ciclo diário para selecionar o horário e ver como fica na simulação:
            </p>

            {/* Real-time Continuous Traffic dashboard */}
            <div className="flex flex-col gap-2 border border-amber-500/10 bg-amber-500/5 rounded-xl p-3 shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-amber-400">
                <span>Indicadores de Tráfego</span>
                <span className="animate-pulse flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/25">
                  <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                  AO VIVO
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-white/80">
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7.5px] text-white/40 uppercase">Densidade</span>
                  <span className="text-sm font-extrabold text-white">{Math.round(activeTrafficDensity * 100)}%</span>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7.5px] text-white/40 uppercase">Velocidade</span>
                  <span className="text-sm font-extrabold text-white">{Math.round(speedMultiplier * 50)} km/h</span>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5 col-span-2">
                  <span className="text-[7.5px] text-white/40 uppercase">Veículos Ativos no Fluxo</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white">{visibleCars.length} / {carPool.length} carros</span>
                    <span className="text-[7.5px] px-1 rounded bg-white/10 text-white/70 uppercase">Nível: {trafficLevel}</span>
                  </div>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${activeTrafficDensity * 100}%`,
                    backgroundColor: activeTrafficDensity < 0.25 ? '#10b981' : activeTrafficDensity < 0.60 ? '#f59e0b' : activeTrafficDensity < 0.85 ? '#f97316' : '#ef4444',
                    boxShadow: `0 0 8px ${activeTrafficDensity < 0.25 ? '#10b981' : activeTrafficDensity < 0.60 ? '#f59e0b' : activeTrafficDensity < 0.85 ? '#f97316' : '#ef4444'}`
                  }}
                />
              </div>
            </div>

            {/* Groups by traffic level */}
            {[
              { level: 'low' as const, label: 'Tráfego Baixo (Sono / Repouso)', color: 'text-emerald-400 border-emerald-500/10' },
              { level: 'medium' as const, label: 'Tráfego Moderado (Rotina / Transição)', color: 'text-amber-400 border-amber-500/10' },
              { level: 'high' as const, label: 'Tráfego Alto (Almoço / Lazer)', color: 'text-orange-400 border-orange-500/10' },
              { level: 'intense' as const, label: 'Tráfego Intenso (Picos de Entrada/Saída)', color: 'text-red-400 border-red-500/10' },
            ].map((grp) => {
              const periods = lifecyclePeriods.filter(p => p.level === grp.level);
              return (
                <div key={grp.level} className="flex flex-col gap-1.5 border border-[var(--accent-color)]/20 bg-[var(--bg-color)]/40 rounded-xl p-2.5">
                  <span className={`text-[9px] font-bold font-mono uppercase tracking-wider ${grp.color}`}>
                    {grp.label}
                  </span>
                  <div className="flex flex-col gap-1">
                    {periods.map(p => {
                      const isActive = activeLifecyclePeriod?.id === p.id && trafficSelection === 'auto';
                      const startText = formatDecimalTime(p.shiftedStart);
                      const endText = formatDecimalTime(p.shiftedEnd);
                      
                      return (
                        <button
                          key={`lc-period-${grp.level}-${p.id}`}
                          onClick={() => {
                            if (onTimeChange) {
                              const mid = (p.start + p.end) / 2;
                              const shiftedMid = (mid + shift) % 24;
                              onTimeChange(formatDecimalTime(shiftedMid));
                              // Automatically return traffic mode to Auto so the user sees the preset traffic volume
                              setTrafficSelection('auto');
                            }
                          }}
                          className={`w-full text-left p-1.5 rounded-lg text-[9.5px] font-mono transition-all duration-300 flex items-center justify-between border cursor-pointer ${
                            isActive
                              ? 'bg-[var(--accent-color)]/30 text-[var(--text-color)] border-[var(--accent-color)]/50 shadow-[0_0_8px_var(--accent-color)]'
                              : 'bg-black/30 hover:bg-black/50 text-[var(--text-color)]/70 hover:text-[var(--text-color)] border-[var(--accent-color)]/10'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span>{p.emoji}</span>
                            <span className="truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold shrink-0">
                            <span className="opacity-60">{startText} - {endText}</span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            <div className="mt-auto border-t border-white/5 pt-2 text-[8px] font-mono text-white/30 text-center uppercase tracking-widest leading-normal">
              Ajuste o fuso acima para deslocar o ciclo conforme a região (Espanha/Galiza)
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FLOATING PERFORMANCE & RAM OPTIMIZER PANEL --- */}
      <AnimatePresence>
        {showPerformanceDashboard && (
          <motion.div
            initial={{ opacity: 0, x: -50, y: 0, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, y: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="absolute top-28 left-4 w-80 max-w-[calc(100vw-2rem)] bg-slate-950/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl max-h-[80vh] overflow-y-auto z-[110] flex flex-col gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.6)] scrollbar-thin scrollbar-thumb-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-violet-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">Otimizador de RAM e Fluidez</span>
              </div>
              <button 
                onClick={() => setShowPerformanceDashboard(false)}
                className="text-white/40 hover:text-white text-[10px] font-mono cursor-pointer bg-transparent border-0 outline-none"
              >
                [OCULTAR]
              </button>
            </div>

            <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider leading-relaxed">
              Configure o limite de RAM virtual para que o motor de renderização da simulação solar se adapte e entregue a máxima taxa de quadros (FPS):
            </p>

            {/* Simulated Live Stats Gauge */}
            <div className="flex flex-col gap-2 border border-violet-500/10 bg-violet-500/5 rounded-xl p-3 shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-violet-400">
                <span>Métricas de Recursos</span>
                <span className="animate-pulse flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-violet-400/10 border border-violet-400/25">
                  <span className="w-1 h-1 rounded-full bg-violet-400"></span>
                  MOTOR ATIVO
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-white/80">
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7.5px] text-white/40 uppercase">Uso de Heap JS (Est.)</span>
                  <span className="text-sm font-extrabold text-white">
                    {ramLimit === '2GB' ? '~68 MB' : 
                     ramLimit === '4GB' ? '~145 MB' : 
                     ramLimit === '6GB' ? '~210 MB' : 
                     ramLimit === '8GB' ? '~285 MB' : 
                     ramLimit === '10GB' ? '~340 MB' : 
                     ramLimit === '12GB' ? '~385 MB' : '~390+ MB'}
                  </span>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[7.5px] text-white/40 uppercase">Fluidez / FPS</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    {ramLimit === '2GB' ? '60 FPS (99%)' : 
                     ramLimit === '4GB' ? '60 FPS (98%)' : 
                     ramLimit === '6GB' ? '59 FPS (95%)' : 
                     ramLimit === '8GB' ? '58 FPS (92%)' : 
                     ramLimit === '10GB' ? '57 FPS (88%)' : 
                     ramLimit === '12GB' ? '56 FPS (85%)' : 'Variável'}
                  </span>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5 col-span-2">
                  <span className="text-[7.5px] text-white/40 uppercase">Elementos Ativos no DOM</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-white">
                      {ramLimit === '2GB' ? '~280 nós' : 
                       ramLimit === '4GB' ? '~650 nós' : 
                       ramLimit === '6GB' ? '~980 nós' : 
                       ramLimit === '8GB' ? '~1,250 nós' : 
                       ramLimit === '10GB' ? '~1,500 nós' : 
                       ramLimit === '12GB' ? '~1,800 nós' : '~1,800+ nós'}
                    </span>
                    <span className="text-[7.5px] px-1 rounded bg-white/10 text-white/70 uppercase">Filtros: {ramLimit === '2GB' ? 'OFF' : 'ON'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {[
                { 
                  id: '2GB' as const, 
                  name: '2GB RAM - Modo Eco', 
                  desc: 'Econômico: Max 10 carros, simplifica janelas 2x2, sem filtros de sombra pesados. Cloud Pooling reduzido (Max 4 nuvens).',
                  badge: 'Eco Otimizado', 
                  color: 'text-emerald-400 border-emerald-500/20' 
                },
                { 
                  id: '4GB' as const, 
                  name: '4GB RAM - Balanço', 
                  desc: 'Equilibrado: Max 20 carros, ativa sombras padrão, mantém detalhes finos. Cloud Pooling de até 10 nuvens.',
                  badge: 'Balanço Ideal', 
                  color: 'text-cyan-400 border-cyan-500/20' 
                },
                { 
                  id: '6GB' as const, 
                  name: '6GB RAM - Fluido', 
                  desc: 'Tráfego Fluido: Max 35 carros, sombras/brilhos padrão ativos. Cloud Pooling de até 14 nuvens.',
                  badge: 'Média Otimizada', 
                  color: 'text-blue-400 border-blue-500/20' 
                },
                { 
                  id: '8GB' as const, 
                  name: '8GB RAM - Performance', 
                  desc: 'Alta Performance: Max 50 carros, filtros visuais ricos ativados. Cloud Pooling de até 18 nuvens.',
                  badge: 'Rápido & Rico', 
                  color: 'text-amber-400 border-amber-500/20' 
                },
                { 
                  id: '10GB' as const, 
                  name: '10GB RAM - Avançado', 
                  desc: 'Desempenho Avançado: Max 75 carros, simulação de pedestres ativa, renderização de janelas completa. Cloud Pooling de até 20 nuvens.',
                  badge: 'Alto Nível', 
                  color: 'text-orange-400 border-orange-500/20' 
                },
                { 
                  id: '12GB' as const, 
                  name: '12GB RAM - Extremo', 
                  desc: 'Fidelidade Extrema: Max 100 carros, renderização total dos efeitos de luzes. Cloud Pooling completo (Max 22 nuvens).',
                  badge: 'Máximo Detalhe', 
                  color: 'text-red-400 border-red-500/20' 
                },
                { 
                  id: 'Unlimited' as const, 
                  name: 'Sem Limites RAM', 
                  desc: 'Fidelidade Absoluta: Tráfego até 100+ carros simultâneos, filtros de renderização e densidade de nuvens completa (Max 22 nuvens).',
                  badge: 'Poder Absoluto', 
                  color: 'text-violet-400 border-violet-500/20' 
                },
              ].map((preset) => {
                const isActive = ramLimit === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setRamLimit(preset.id)}
                    className={`w-full text-left p-2 rounded-xl font-mono transition-all duration-300 flex flex-col gap-1 border cursor-pointer ${
                      isActive
                        ? 'bg-violet-500/20 text-white border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'bg-black/30 hover:bg-black/50 text-white/70 hover:text-white border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider">{preset.name}</span>
                      <span className={`text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded ${isActive ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/50'}`}>
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/50 leading-normal normal-case">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* List of active optimizations */}
            <div className="border border-white/5 bg-black/40 rounded-xl p-2.5 flex flex-col gap-1">
              <span className="text-[8px] font-bold font-mono text-white/40 uppercase tracking-widest">Otimizações Aplicadas no Momento:</span>
              <ul className="text-[8px] font-mono text-white/60 list-disc list-inside space-y-0.5">
                {ramLimit === '2GB' && (
                  <>
                    <li className="text-cyan-400">Limitador de Veículos ativo (Max 10)</li>
                    <li className="text-cyan-400">Filtros pesados de sombreamento desativados</li>
                    <li className="text-cyan-400">Redução de 75% das janelas ativas (Grid 2x2)</li>
                    <li className="text-cyan-400">Adição automática de tráfego desativada</li>
                    <li className="text-cyan-400 font-extrabold">Cloud Pooling ativo (Max 4 nuvens)</li>
                  </>
                )}
                {ramLimit === '4GB' && (
                  <>
                    <li className="text-amber-400">Limitador de Veículos em 20 carros</li>
                    <li className="text-amber-400">Filtros e sombras padrão ativados</li>
                    <li className="text-amber-400 font-extrabold">Cloud Pooling ativo (Max 10 nuvens)</li>
                  </>
                )}
                {ramLimit === '6GB' && (
                  <>
                    <li className="text-blue-400">Limitador de Veículos em 35 carros</li>
                    <li className="text-blue-400">Sombras e efeitos de luz habilitados</li>
                    <li className="text-blue-400 font-extrabold">Cloud Pooling ativo (Max 14 nuvens)</li>
                  </>
                )}
                {ramLimit === '8GB' && (
                  <>
                    <li className="text-yellow-400">Limitador de Veículos em 50 carros</li>
                    <li className="text-yellow-400">Filtros de brilho e sombreados ricos ativados</li>
                    <li className="text-yellow-400 font-extrabold">Cloud Pooling ativo (Max 18 nuvens)</li>
                  </>
                )}
                {ramLimit === '10GB' && (
                  <>
                    <li className="text-orange-400">Limitador de Veículos em 75 carros</li>
                    <li className="text-orange-400">Renderização de janelas completa</li>
                    <li className="text-orange-400 font-extrabold">Cloud Pooling ativo (Max 20 nuvens)</li>
                  </>
                )}
                {ramLimit === '12GB' && (
                  <>
                    <li className="text-red-400">Limitador de Veículos em 100 carros</li>
                    <li className="text-red-400">Sombras dinâmicas de alta fidelidade</li>
                    <li className="text-red-400 font-extrabold">Cloud Pooling ativo (Max 22 nuvens)</li>
                  </>
                )}
                {ramLimit === 'Unlimited' && (
                  <>
                    <li className="text-violet-400">Expansão de tráfego livre (Até 100+ carros)</li>
                    <li className="text-violet-400">Fidelidade máxima com todas as sombras</li>
                    <li className="text-violet-400 font-extrabold">Sem limite de nuvens (Max 22 nuvens)</li>
                  </>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
