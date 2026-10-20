import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { feature, mesh } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import landData from 'world-atlas/land-110m.json';
import { 
  Sun, 
  Globe, 
  Compass, 
  Layers, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MapPin, 
  Info, 
  Sparkles,
  Eye,
  EyeOff,
  Navigation,
  Crosshair,
  Clock
} from 'lucide-react';
import { SolarTimeResult, calculateSolarTime } from '../lib/solarTime';
import { formatLatitude, formatLongitude, isEquatorLatitude } from '../lib/coordinateParser';

export type ProjectionType = 'naturalEarth' | 'orthographic' | 'equirectangular' | 'mercator';

interface SubsolarWorldMapProps {
  solarInfo: SolarTimeResult;
  currentDate: Date;
  userCoords?: { latitude: number; longitude: number };
  locationName?: string;
  language?: 'pt' | 'en' | string;
  className?: string;
  initialProjection?: ProjectionType;
  allowFullscreen?: boolean;
  localCivilTime?: Date;
  axialTilt?: number;
}

// Geographic region detector
function getSubsolarRegionName(lat: number, lon: number, language: string = 'en'): string {
  const isPt = language === 'pt';
  
  if (lon >= -85 && lon <= -34 && lat >= -56 && lat <= 13) {
    return isPt ? 'América do Sul' : 'South America';
  } else if (lon >= -170 && lon <= -50 && lat >= 10 && lat <= 75) {
    return isPt ? 'América do Norte / Central' : 'North / Central America';
  } else if (lon >= -20 && lon <= 52 && lat >= -35 && lat <= 38) {
    return isPt ? 'África' : 'Africa';
  } else if (lon >= -10 && lon <= 45 && lat >= 35 && lat <= 72) {
    return isPt ? 'Europa' : 'Europe';
  } else if (lon >= 45 && lon <= 150 && lat >= 5 && lat <= 75) {
    return isPt ? 'Ásia' : 'Asia';
  } else if (lon >= 110 && lon <= 180 && lat >= -50 && lat <= -10) {
    return isPt ? 'Oceania / Austrália' : 'Oceania / Australia';
  } else if (lon >= -65 && lon <= 20) {
    return isPt ? 'Oceano Atlântico' : 'Atlantic Ocean';
  } else if (lon >= 20 && lon <= 115) {
    return isPt ? 'Oceano Índico' : 'Indian Ocean';
  } else {
    return isPt ? 'Oceano Pacífico' : 'Pacific Ocean';
  }
}

export const SubsolarWorldMap: React.FC<SubsolarWorldMapProps> = ({
  solarInfo,
  currentDate,
  userCoords,
  locationName,
  language = 'pt',
  className = '',
  initialProjection = 'naturalEarth',
  allowFullscreen = true,
  localCivilTime,
  axialTilt = 23.44
}) => {
  const isPt = language === 'pt';
  const effectiveTilt = axialTilt !== undefined && !isNaN(axialTilt) ? Math.max(0, Math.min(90, axialTilt)) : 23.44;
  const polarLatitude = Math.max(0, Math.min(90, 90 - effectiveTilt));
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Effective Local Civil Time
  const effectiveCivilTime = useMemo(() => {
    if (localCivilTime && !isNaN(localCivilTime.getTime())) return localCivilTime;
    const offset = solarInfo.timezoneOffset ?? 0;
    return new Date(currentDate.getTime() + offset * 60000);
  }, [localCivilTime, currentDate, solarInfo.timezoneOffset]);

  // Format as Hours:Minutes:Seconds (HH:MM:SS)
  const civilTimeFormatted = useMemo(() => {
    const h = String(effectiveCivilTime.getUTCHours()).padStart(2, '0');
    const m = String(effectiveCivilTime.getUTCMinutes()).padStart(2, '0');
    const s = String(effectiveCivilTime.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [effectiveCivilTime]);

  // Component state
  const [projectionType, setProjectionType] = useState<ProjectionType>(initialProjection);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNightShadow, setShowNightShadow] = useState(true);
  const [showTwilight, setShowTwilight] = useState(true);
  const [showTropics, setShowTropics] = useState(true);
  const [showGraticule, setShowGraticule] = useState(true);
  const [showElevationRings, setShowElevationRings] = useState(true);
  const [showObserverArc, setShowObserverArc] = useState(true);
  const [showUserLatitude, setShowUserLatitude] = useState(true);
  const [showPolarLines, setShowPolarLines] = useState(false);
  const [showComparisonHud, setShowComparisonHud] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  
  // Zoom & Pan state (Mouse wheel, Touchpad pinch, Touch 2-finger pinch)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for tracking in native non-passive event listeners
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(12.0, Number((prev * 1.3).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const next = Math.max(0.5, Number((prev / 1.3).toFixed(2)));
      if (next <= 1.05 && next >= 0.95) {
        setPanOffset({ x: 0, y: 0 });
        return 1.0;
      }
      return next;
    });
  }, []);

  // Reset pan whenever projection type changes
  const handleProjectionChange = (proj: ProjectionType) => {
    setProjectionType(proj);
    setPanOffset({ x: 0, y: 0 });
  };
  
  // Globe 3D rotation state [yaw (lon), pitch (lat), roll]
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Inspector state on mouse hover/click
  const [inspectedPoint, setInspectedPoint] = useState<{
    lat: number;
    lon: number;
    altitude: number;
    status: string;
    solarTimeStr: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Dynamic real-time Local Solar Time for the inspected point (ticks smoothly with clock)
  const liveInspectedSolarTime = useMemo(() => {
    if (!inspectedPoint) return null;
    try {
      const pointSolar = calculateSolarTime(currentDate, inspectedPoint.lon, inspectedPoint.lat, undefined, effectiveTilt);
      if (!pointSolar.solarDate || isNaN(pointSolar.solarDate.getTime())) return inspectedPoint.solarTimeStr;
      const sh = pointSolar.solarDate.getUTCHours().toString().padStart(2, '0');
      const sm = pointSolar.solarDate.getUTCMinutes().toString().padStart(2, '0');
      const ss = pointSolar.solarDate.getUTCSeconds().toString().padStart(2, '0');
      return `${sh}:${sm}:${ss}`;
    } catch {
      return inspectedPoint.solarTimeStr;
    }
  }, [inspectedPoint?.lat, inspectedPoint?.lon, currentDate, effectiveTilt, inspectedPoint?.solarTimeStr]);

  // Subsolar Point coordinates
  const subsolarLat = solarInfo.declination; // Declination = Latitude where Sun is at zenith (-23.44° to +23.44°)
  const subsolarLon = solarInfo.subsolarLongitude; // Longitude where Solar Noon is currently occurring

  // Latitude comparison between observer and subsolar point
  const latitudeComparison = useMemo(() => {
    if (!userCoords) return null;
    const userLat = userCoords.latitude;
    const sunLat = subsolarLat;
    const diffLat = Math.abs(userLat - sunLat);
    const userIsNorth = userLat > sunLat;
    const sunRelativeDirection = userIsNorth
      ? (isPt ? 'ao Sul' : 'South')
      : (isPt ? 'ao Norte' : 'North');

    // Maximum solar elevation at local solar noon = 90° - |userLat - sunLat|
    const maxNoonElevation = Math.max(0, 90 - diffLat);

    return {
      userLat,
      sunLat,
      diffLat,
      userIsNorth,
      sunRelativeDirection,
      maxNoonElevation
    };
  }, [userCoords, subsolarLat, isPt]);

  // Geographic TopoJSON features
  const landFeatures = useMemo(() => {
    try {
      return feature(landData as any, (landData as any).objects.land);
    } catch (e) {
      console.warn('Failed to parse land topojson', e);
      return null;
    }
  }, []);

  const countryBorders = useMemo(() => {
    try {
      return mesh(worldData as any, (worldData as any).objects.countries, (a: any, b: any) => a !== b);
    } catch (e) {
      console.warn('Failed to parse country borders mesh', e);
      return null;
    }
  }, []);

  // Earth radius in km for geodesic distances
  const earthRadiusKm = 6371;

  // Great-circle distance from observer to subsolar point
  const observerGeodesic = useMemo(() => {
    if (!userCoords) return null;
    const lat1 = (userCoords.latitude * Math.PI) / 180;
    const lon1 = (userCoords.longitude * Math.PI) / 180;
    const lat2 = (subsolarLat * Math.PI) / 180;
    const lon2 = (subsolarLon * Math.PI) / 180;

    // Haversine formula
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const angularDistRad = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(earthRadiusKm * angularDistRad);
    const angularDistDeg = (angularDistRad * 180) / Math.PI;

    return {
      distanceKm,
      angularDistDeg,
      zenithAngleDeg: angularDistDeg, // Zenith distance is equal to angular distance from subsolar point
      solarAltitudeDeg: 90 - angularDistDeg
    };
  }, [userCoords, subsolarLat, subsolarLon]);

  // Center Globe on Subsolar Point
  const centerOnSun = useCallback(() => {
    setRotation([-subsolarLon, -subsolarLat, 0]);
  }, [subsolarLon, subsolarLat]);

  // Center Globe on Observer
  const centerOnObserver = useCallback(() => {
    if (userCoords) {
      setRotation([-userCoords.longitude, -userCoords.latitude, 0]);
    }
  }, [userCoords]);

  // Auto-rotation loop for 3D globe
  useEffect(() => {
    if (!autoRotate || projectionType !== 'orthographic') return;

    const interval = setInterval(() => {
      setRotation(prev => [(prev[0] + 0.4) % 360, prev[1], prev[2]]);
    }, 30);

    return () => clearInterval(interval);
  }, [autoRotate, projectionType]);

  // Set initial 3D globe rotation centered near the subsolar point
  useEffect(() => {
    if (projectionType === 'orthographic' && rotation[0] === 0 && rotation[1] === 0) {
      setRotation([-subsolarLon, -subsolarLat, 0]);
    }
  }, [projectionType, subsolarLon, subsolarLat]);

  // Map Rendering with D3
  const stageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 380 });

  useEffect(() => {
    const updateSize = () => {
      if (stageRef.current) {
        const w = stageRef.current.clientWidth;
        if (w > 0) {
          let targetHeight: number;
          if (isFullscreen) {
            targetHeight = Math.max(360, window.innerHeight - 200);
          } else if (projectionType === 'orthographic') {
            targetHeight = Math.max(260, Math.min(480, Math.round(w * 0.58)));
          } else {
            targetHeight = Math.max(230, Math.min(480, Math.round(w * 0.51)));
          }
          setDimensions({ width: Math.round(w), height: targetHeight });
        }
      }
    };

    updateSize();

    if (stageRef.current && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(stageRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [isFullscreen, projectionType]);

  // D3 Projection generator with adaptive zoom, pan & centering
  const { projection, pathGenerator, globeRadius } = useMemo(() => {
    const { width, height } = dimensions;
    const paddingX = 14;
    const paddingY = 14;
    let baseRadius = Math.max(60, Math.min(width - paddingX * 2, height - paddingY * 2) * 0.45);
    let gRadius = baseRadius * zoomLevel;
    let proj: d3.GeoProjection;

    switch (projectionType) {
      case 'orthographic':
        proj = d3
          .geoOrthographic()
          .scale(gRadius)
          .translate([width / 2 + panOffset.x, height / 2 + panOffset.y])
          .rotate(rotation)
          .clipAngle(90);
        break;
      case 'equirectangular':
        proj = d3.geoEquirectangular();
        proj.fitExtent(
          [
            [paddingX, paddingY],
            [width - paddingX, height - paddingY]
          ],
          { type: 'Sphere' } as any
        );
        proj.scale(proj.scale() * zoomLevel);
        const centerEq = proj.translate();
        proj.translate([centerEq[0] + panOffset.x, centerEq[1] + panOffset.y]);
        break;
      case 'mercator':
        proj = d3.geoMercator();
        proj.fitExtent(
          [
            [paddingX, paddingY],
            [width - paddingX, height - paddingY]
          ],
          { type: 'Sphere' } as any
        );
        proj.scale(proj.scale() * zoomLevel);
        const centerMerc = proj.translate();
        proj.translate([centerMerc[0] + panOffset.x, centerMerc[1] + panOffset.y]);
        break;
      case 'naturalEarth':
      default:
        proj = d3.geoNaturalEarth1();
        proj.fitExtent(
          [
            [paddingX, paddingY],
            [width - paddingX, height - paddingY]
          ],
          { type: 'Sphere' } as any
        );
        proj.scale(proj.scale() * zoomLevel);
        const centerNat = proj.translate();
        proj.translate([centerNat[0] + panOffset.x, centerNat[1] + panOffset.y]);
        break;
    }

    const path = d3.geoPath().projection(proj);
    return { projection: proj, pathGenerator: path, globeRadius: gRadius };
  }, [projectionType, dimensions, rotation, zoomLevel, panOffset]);

  // Solar Circles and Geometries
  const geoCircles = useMemo(() => {
    // 1. Day hemisphere (Sunlight zone: 90° radius centered at subsolar point)
    const dayCap = d3.geoCircle().center([subsolarLon, subsolarLat]).radius(90)();

    // 2. Night hemisphere (Antipodal 90° cap)
    const antiLon = ((subsolarLon + 180 + 180) % 360) - 180;
    const antiLat = -subsolarLat;
    const nightCap = d3.geoCircle().center([antiLon, antiLat]).radius(90)();

    // 3. Twilight bands around the subsolar point
    // Civil Twilight (90° - 96° from subsolar)
    const civilCap = d3.geoCircle().center([antiLon, antiLat]).radius(84)();
    // Nautical Twilight (96° - 102°)
    const nauticalCap = d3.geoCircle().center([antiLon, antiLat]).radius(78)();
    // Astronomical Twilight (102° - 108°)
    const astroCap = d3.geoCircle().center([antiLon, antiLat]).radius(72)();

    // 4. Solar Altitude Elevation Contours (75°, 60°, 45°, 30°, 15° solar elevation above horizon)
    const elevationRings = [75, 60, 45, 30, 15].map(alt => ({
      altitude: alt,
      geometry: d3.geoCircle().center([subsolarLon, subsolarLat]).radius(90 - alt)()
    }));

    // 5. Observer Geodesic Line
    let observerLine: any = null;
    if (userCoords) {
      observerLine = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [userCoords.longitude, userCoords.latitude],
            [subsolarLon, subsolarLat]
          ]
        }
      };
    }

    // 6. Tropics, Polar Circles & Equator Parallels
    const equatorLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, 0])
      }
    };
    const cancerLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, effectiveTilt])
      }
    };
    const capricornLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, -effectiveTilt])
      }
    };
    const arcticCircleLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, polarLatitude])
      }
    };
    const antarcticCircleLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, -polarLatitude])
      }
    };
    const primeMeridianLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-90, 91, 2).map(y => [0, y])
      }
    };

    // 7. User & Subsolar Latitude Parallels
    const userLatitudeLine: any = userCoords
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: d3.range(-180, 181, 2).map(x => [x, userCoords.latitude])
          }
        }
      : null;

    const subsolarLatitudeLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, subsolarLat])
      }
    };

    // 8. Polar Night & Polar Day lines
    const polarNightLatitude = subsolarLat > 0 ? -90 + subsolarLat : 90 + subsolarLat;
    const polarDayLatitude = subsolarLat > 0 ? 90 - subsolarLat : -90 - subsolarLat;

    const polarNightLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, polarNightLatitude])
      }
    };

    const polarDayLine: any = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: d3.range(-180, 181, 2).map(x => [x, polarDayLatitude])
      }
    };
    return {
      dayCap,
      nightCap,
      civilCap,
      nauticalCap,
      astroCap,
      elevationRings,
      observerLine,
      equatorLine,
      cancerLine,
      capricornLine,
      arcticCircleLine,
      antarcticCircleLine,
      primeMeridianLine,
      userLatitudeLine,
      subsolarLatitudeLine,
      polarNightLine,
      polarDayLine
    };
  }, [projection, subsolarLon, subsolarLat, userCoords, projectionType, effectiveTilt, polarLatitude]);

  // Projected Subsolar Point Screen Coordinates
  const subsolarScreen = useMemo(() => {
    const coords = projection([subsolarLon, subsolarLat]);
    if (!coords) return null;
    
    // For orthographic, check if point is on the visible front hemisphere
    if (projectionType === 'orthographic') {
      const center = projection.rotate();
      const p = d3.geoDistance([subsolarLon, subsolarLat], [-center[0], -center[1]]);
      if (p > Math.PI / 2) return null; // Behind the globe
    }
    return { x: coords[0], y: coords[1] };
  }, [projection, subsolarLon, subsolarLat, projectionType]);

  // Projected Observer Screen Coordinates
  const observerScreen = useMemo(() => {
    if (!userCoords) return null;
    const coords = projection([userCoords.longitude, userCoords.latitude]);
    if (!coords) return null;

    if (projectionType === 'orthographic') {
      const center = projection.rotate();
      const p = d3.geoDistance([userCoords.longitude, userCoords.latitude], [-center[0], -center[1]]);
      if (p > Math.PI / 2) return null;
    }
    return { x: coords[0], y: coords[1] };
  }, [projection, userCoords, projectionType]);

  const projectionTypeRef = useRef(projectionType);
  projectionTypeRef.current = projectionType;

  // Native non-passive listeners for Wheel / Touchpad Pinch and Multi-touch Pinch-to-Zoom
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    // 1. Mouse Wheel & Touchpad Pinch-to-Zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scrolling

      const rect = stageEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let zoomFactor = 1;
      if (e.ctrlKey) {
        // Trackpad / Touchpad pinch gesture (or Ctrl + Wheel)
        zoomFactor = Math.exp(-e.deltaY * 0.012);
      } else {
        // Traditional mouse wheel
        zoomFactor = e.deltaY < 0 ? 1.16 : 0.86;
      }

      setZoomLevel(prevZoom => {
        const nextZoom = Math.max(0.5, Math.min(12.0, Number((prevZoom * zoomFactor).toFixed(3))));
        const scaleRatio = nextZoom / prevZoom;

        // Smooth zoom centering on mouse cursor
        setPanOffset(prevPan => {
          const cx = dimensions.width / 2;
          const cy = dimensions.height / 2;
          const dx = mouseX - (cx + prevPan.x);
          const dy = mouseY - (cy + prevPan.y);

          return {
            x: prevPan.x - dx * (scaleRatio - 1),
            y: prevPan.y - dy * (scaleRatio - 1)
          };
        });

        return nextZoom;
      });
    };

    // 2. Multi-touch gestures (Pinch-to-zoom + 2-finger pan & 1-finger drag)
    let touchMode: 'none' | 'drag' | 'pinch' = 'none';
    let startDist = 0;
    let startZoom = 1;
    let startPan = { x: 0, y: 0 };
    let startMidpoint = { x: 0, y: 0 };
    let lastTouchPos = { x: 0, y: 0 };
    let lastTouchTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchMode = 'drag';
        const t = e.touches[0];
        const rect = stageEl.getBoundingClientRect();
        lastTouchPos = { x: t.clientX, y: t.clientY };
        lastMousePosRef.current = { x: t.clientX, y: t.clientY };
        isDraggingRef.current = true;

        // Double tap detection (within 300ms)
        const now = Date.now();
        if (now - lastTouchTime < 300) {
          const mouseX = t.clientX - rect.left;
          const mouseY = t.clientY - rect.top;
          setZoomLevel(prev => {
            if (prev > 2.5) {
              setPanOffset({ x: 0, y: 0 });
              return 1.0;
            } else {
              const nextZoom = Math.min(12.0, prev * 2.0);
              const cx = dimensions.width / 2;
              const cy = dimensions.height / 2;
              setPanOffset(p => ({
                x: p.x - (mouseX - (cx + p.x)),
                y: p.y - (mouseY - (cy + p.y))
              }));
              return nextZoom;
            }
          });
        }
        lastTouchTime = now;
      } else if (e.touches.length >= 2) {
        touchMode = 'pinch';
        isDraggingRef.current = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        startDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        startZoom = zoomLevelRef.current;
        startPan = { ...panOffsetRef.current };
        const rect = stageEl.getBoundingClientRect();
        startMidpoint = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Stop mobile browser default page zoom
      if (touchMode === 'pinch' && e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (startDist > 0) {
          const scale = curDist / startDist;
          const targetZoom = Math.max(0.5, Math.min(12.0, Number((startZoom * scale).toFixed(3))));
          setZoomLevel(targetZoom);

          const rect = stageEl.getBoundingClientRect();
          const curMidpoint = {
            x: (t1.clientX + t2.clientX) / 2 - rect.left,
            y: (t1.clientY + t2.clientY) / 2 - rect.top
          };
          const midDx = curMidpoint.x - startMidpoint.x;
          const midDy = curMidpoint.y - startMidpoint.y;
          setPanOffset({
            x: startPan.x + midDx,
            y: startPan.y + midDy
          });
        }
      } else if (touchMode === 'drag' && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - lastTouchPos.x;
        const dy = t.clientY - lastTouchPos.y;

        if (projectionTypeRef.current === 'orthographic') {
          const sensitivity = 0.35 / Math.max(0.5, zoomLevelRef.current);
          setRotation(prev => {
            const newLon = prev[0] + dx * sensitivity;
            const newLat = Math.max(-85, Math.min(85, prev[1] - dy * sensitivity));
            return [newLon, newLat, prev[2]];
          });
        } else {
          // 2D Pan
          setPanOffset(prev => ({
            x: prev.x + dx,
            y: prev.y + dy
          }));
        }

        lastTouchPos = { x: t.clientX, y: t.clientY };
      }
    };

    const onTouchEnd = () => {
      touchMode = 'none';
      isDraggingRef.current = false;
    };

    stageEl.addEventListener('wheel', onWheel, { passive: false });
    stageEl.addEventListener('touchstart', onTouchStart, { passive: false });
    stageEl.addEventListener('touchmove', onTouchMove, { passive: false });
    stageEl.addEventListener('touchend', onTouchEnd);
    stageEl.addEventListener('touchcancel', onTouchEnd);

    return () => {
      stageEl.removeEventListener('wheel', onWheel);
      stageEl.removeEventListener('touchstart', onTouchStart);
      stageEl.removeEventListener('touchmove', onTouchMove);
      stageEl.removeEventListener('touchend', onTouchEnd);
      stageEl.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [dimensions]);

  // Mouse drag handler for 3D Globe and 2D map panning
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Mouse Drag (3D Globe Rotation or 2D Map Pan)
    if (isDraggingRef.current && lastMousePosRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      if (projectionType === 'orthographic') {
        const sensitivity = 0.35 / Math.max(0.5, zoomLevel);
        setRotation(prev => {
          const newLon = prev[0] + dx * sensitivity;
          const newLat = Math.max(-85, Math.min(85, prev[1] - dy * sensitivity));
          return [newLon, newLat, prev[2]];
        });
      } else {
        // 2D Projection Panning
        setPanOffset(prev => ({
          x: prev.x + dx,
          y: prev.y + dy
        }));
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }

    // 2. Map Coordinate Inspector
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const geoCoords = projection.invert ? projection.invert([mouseX, mouseY]) : null;
      if (geoCoords && !isNaN(geoCoords[0]) && !isNaN(geoCoords[1])) {
        const [lon, lat] = geoCoords;
        // Compute solar altitude at this cursor position
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;
        const sLatRad = (subsolarLat * Math.PI) / 180;
        const sLonRad = (subsolarLon * Math.PI) / 180;

        const dLat = sLatRad - latRad;
        const dLon = sLonRad - lonRad;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latRad) * Math.cos(sLatRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const angularDistDeg = (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 180) / Math.PI;
        const altitude = 90 - angularDistDeg;

        let status = isPt ? 'Dia Pleno' : 'Daylight';
        if (altitude < -18) status = isPt ? 'Noite Astronômica' : 'Night';
        else if (altitude < -12) status = isPt ? 'Crepúsculo Astronômico' : 'Astronomical Twilight';
        else if (altitude < -6) status = isPt ? 'Crepúsculo Náutico' : 'Nautical Twilight';
        else if (altitude < 0) status = isPt ? 'Crepúsculo Civil' : 'Civil Twilight';

        const pointSolar = calculateSolarTime(currentDate, lon, lat, undefined, effectiveTilt);
        const sh = pointSolar.solarDate.getUTCHours().toString().padStart(2, '0');
        const sm = pointSolar.solarDate.getUTCMinutes().toString().padStart(2, '0');
        const ss = pointSolar.solarDate.getUTCSeconds().toString().padStart(2, '0');
        const solarTimeStr = `${sh}:${sm}:${ss}`;

        setInspectedPoint({
          lat,
          lon,
          altitude,
          status,
          solarTimeStr,
          screenX: mouseX,
          screenY: mouseY
        });
      } else {
        setInspectedPoint(null);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoomLevel(prev => {
      if (prev >= 3.5) {
        setPanOffset({ x: 0, y: 0 });
        return 1.0;
      }
      const nextZoom = Math.min(12.0, prev * 1.8);
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      setPanOffset(p => ({
        x: p.x - (mouseX - (cx + p.x)) * 0.6,
        y: p.y - (mouseY - (cy + p.y)) * 0.6
      }));
      return nextZoom;
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastMousePosRef.current = null;
  };

  const regionName = useMemo(() => {
    return getSubsolarRegionName(subsolarLat, subsolarLon, language);
  }, [subsolarLat, subsolarLon, language]);

  return (
    <div
      ref={containerRef}
      id="subsolar-world-map-container"
      className={`subsolar-map-container relative bg-[#0c1220] rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 p-6' : 'p-4'
      } ${className}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setInspectedPoint(null);
      }}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sun className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                {isPt ? 'Ponto Subsolar & Projeção Global' : 'Subsolar Point & Global Projection'}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {formatLatitude(subsolarLat, 2, true)}, {formatLongitude(subsolarLon, 2, true)}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1 shadow-sm">
                <Clock className="w-2.5 h-2.5" />
                <span>{isPt ? 'Hora Civil Local:' : 'Local Civil Time:'}</span>
                <span className="text-white font-black">{civilTimeFormatted}</span>
              </span>
            </div>
            <p className="text-[9px] text-white/50">
              {isPt ? 'Sol no Zênite sobre:' : 'Zenith Sun directly overhead:'}{' '}
              <span className="text-amber-300 font-semibold">{regionName}</span>
            </p>
          </div>
        </div>

        {/* Projection Controls & Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Projection Selector */}
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
            <button
              id="proj-btn-natural"
              onClick={() => handleProjectionChange('naturalEarth')}
              className={`px-2 py-1 rounded transition-all ${
                projectionType === 'naturalEarth'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title={isPt ? 'Projeção Natural Earth' : 'Natural Earth Projection'}
            >
              Natural
            </button>
            <button
              id="proj-btn-ortho"
              onClick={() => handleProjectionChange('orthographic')}
              className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                projectionType === 'orthographic'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title={isPt ? 'Globo 3D Interativo' : '3D Interactive Globe'}
            >
              <Globe className="w-3 h-3" />
              {isPt ? 'Globo 3D' : '3D Globe'}
            </button>
            <button
              id="proj-btn-cylindrical"
              onClick={() => handleProjectionChange('equirectangular')}
              className={`px-2 py-1 rounded transition-all ${
                projectionType === 'equirectangular'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title={isPt ? 'Projeção Cilíndrica Equirretangular' : 'Equirectangular Cylindrical'}
            >
              {isPt ? 'Cilíndrico' : 'Cylindrical'}
            </button>
            <button
              id="proj-btn-mercator"
              onClick={() => handleProjectionChange('mercator')}
              className={`px-2 py-1 rounded transition-all ${
                projectionType === 'mercator'
                  ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title={isPt ? 'Projeção Mercator' : 'Mercator Projection'}
            >
              Mercator
            </button>
          </div>

          {/* Quick 3D Globe actions */}
          {projectionType === 'orthographic' && (
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[9px]">
              <button
                onClick={centerOnSun}
                className="px-1.5 py-1 text-amber-300 hover:bg-white/10 rounded flex items-center gap-0.5"
                title={isPt ? 'Centralizar no Sol' : 'Center on Subsolar Point'}
              >
                <Sun className="w-3 h-3" />
                <span className="hidden sm:inline">{isPt ? 'Focar Sol' : 'Center Sun'}</span>
              </button>
              {userCoords && (
                <button
                  onClick={centerOnObserver}
                  className="px-1.5 py-1 text-cyan-300 hover:bg-white/10 rounded flex items-center gap-0.5"
                  title={isPt ? 'Centralizar no Observador' : 'Center on Observer'}
                >
                  <MapPin className="w-3 h-3" />
                  <span className="hidden sm:inline">{isPt ? 'Focar Local' : 'Center Me'}</span>
                </button>
              )}
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1 rounded ${autoRotate ? 'bg-amber-500/30 text-amber-300' : 'text-white/60 hover:text-white'}`}
                title={isPt ? 'Alternar Rotação Automática' : 'Toggle Auto-Rotation'}
              >
                <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          {allowFullscreen && (
            <button
              id="subsolar-fullscreen-toggle"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg border border-white/10 transition-colors"
              title={isFullscreen ? (isPt ? 'Fechar Tela Cheia' : 'Exit Fullscreen') : (isPt ? 'Expandir Mapa' : 'Expand Map')}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Map SVG Stage */}
      <div 
        ref={stageRef}
        className="relative flex-1 w-full min-h-[220px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing rounded-xl overflow-hidden border border-white/5 bg-[#080d1a]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full block mx-auto pointer-events-none"
          style={{ touchAction: 'none' }}
        >
          <defs>
            {/* Ocean radial gradient for globe */}
            <radialGradient id="globeOceanGrad" cx="40%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </radialGradient>

            {/* Glowing Sun Radial Gradient */}
            <radialGradient id="subsolarGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="65%" stopColor="#d97706" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Night Shadow Shading */}
            <radialGradient id="nightShadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#020617" stopOpacity="0.75" />
              <stop offset="90%" stopColor="#090d16" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.9" />
            </radialGradient>

            {/* Globe Atmosphere Edge Glow (Fresnel effect) */}
            <radialGradient id="atmosphereGlow" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="97%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6" />
            </radialGradient>

            {/* Drop shadow for markers */}
            <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Map Outline / Globe Sphere Background */}
          {projectionType === 'orthographic' ? (
            <>
              {/* Globe Background Sphere */}
              <circle
                cx={dimensions.width / 2 + panOffset.x}
                cy={dimensions.height / 2 + panOffset.y}
                r={globeRadius}
                fill="url(#globeOceanGrad)"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.3"
              />
            </>
          ) : (
            <>
              <rect
                width={dimensions.width}
                height={dimensions.height}
                fill="#080d1a"
              />
              <path
                d={pathGenerator({ type: 'Sphere' } as any) || ''}
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.3"
              />
            </>
          )}

          {/* 2. Graticule Lat/Lon Lines */}
          {showGraticule && (
            <path
              d={pathGenerator(d3.geoGraticule10()) || ''}
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.5"
              strokeOpacity="0.08"
            />
          )}

          {/* 3. Continents & Landmasses */}
          {landFeatures && (
            <path
              d={pathGenerator(landFeatures) || ''}
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="0.75"
              className="transition-colors duration-300"
            />
          )}

          {/* 4. Country Borders */}
          {countryBorders && (
            <path
              d={pathGenerator(countryBorders) || ''}
              fill="none"
              stroke="#475569"
              strokeWidth="0.4"
              strokeOpacity="0.4"
            />
          )}

          {/* 5. Special Parallels (Equator, Tropics, Polar Circles, Prime Meridian) */}
          {showTropics && (
            <>
              {/* Equator */}
              <path
                d={pathGenerator(geoCircles.equatorLine) || ''}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="4,3"
                strokeOpacity="0.45"
              />
              {/* Tropic of Cancer (+effectiveTilt°N) */}
              <path
                d={pathGenerator(geoCircles.cancerLine) || ''}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="0.95"
                strokeDasharray="4,3"
                strokeOpacity="0.6"
              />
              {/* Tropic of Capricorn (-effectiveTilt°S) */}
              <path
                d={pathGenerator(geoCircles.capricornLine) || ''}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="0.95"
                strokeDasharray="4,3"
                strokeOpacity="0.6"
              />
              {/* Arctic Circle (+(90 - effectiveTilt)°N) */}
              <path
                d={pathGenerator(geoCircles.arcticCircleLine) || ''}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.9"
                strokeDasharray="3,2"
                strokeOpacity="0.6"
              />
              {/* Antarctic Circle (-(90 - effectiveTilt)°S) */}
              <path
                d={pathGenerator(geoCircles.antarcticCircleLine) || ''}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.9"
                strokeDasharray="3,2"
                strokeOpacity="0.6"
              />
              {/* Prime Meridian (0°) */}
              <path
                d={pathGenerator(geoCircles.primeMeridianLine) || ''}
                fill="none"
                stroke="#a855f7"
                strokeWidth="0.75"
                strokeDasharray="2,4"
                strokeOpacity="0.3"
              />
            </>
          )}

          {/* 5.5 User Latitude Parallel & Subsolar Latitude Parallel */}
          {showUserLatitude && (
            <>
              {/* User Latitude Parallel Line */}
              {geoCircles.userLatitudeLine && (
                <path
                  d={pathGenerator(geoCircles.userLatitudeLine) || ''}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.3"
                  strokeDasharray="5,3"
                  strokeOpacity="0.85"
                  filter="url(#glowEffect)"
                />
              )}
              {/* Subsolar Latitude Parallel Line (Solar Declination Track) */}
              {geoCircles.subsolarLatitudeLine && (
                <path
                  d={pathGenerator(geoCircles.subsolarLatitudeLine) || ''}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.1"
                  strokeDasharray="4,3"
                  strokeOpacity="0.7"
                />
              )}
              {/* Polar Lines */}
              {showPolarLines && geoCircles.polarNightLine && (
                <path
                  d={pathGenerator(geoCircles.polarNightLine) || ''}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="6,2"
                  strokeOpacity="0.9"
                  filter="url(#glowEffect)"
                />
              )}
              {showPolarLines && geoCircles.polarDayLine && (
                <path
                  d={pathGenerator(geoCircles.polarDayLine) || ''}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.2"
                  strokeDasharray="6,2"
                  strokeOpacity="0.9"
                  filter="url(#glowEffect)"
                />
              )}
            </>
          )}

          {/* 6. Night Hemisphere Shadow & Twilight Zones */}
          {showTwilight && (
            <>
              {/* Astronomical Twilight Band */}
              <path
                d={pathGenerator(geoCircles.astroCap) || ''}
                fill="#020617"
                fillOpacity="0.25"
              />
              {/* Nautical Twilight Band */}
              <path
                d={pathGenerator(geoCircles.nauticalCap) || ''}
                fill="#020617"
                fillOpacity="0.2"
              />
              {/* Civil Twilight Band */}
              <path
                d={pathGenerator(geoCircles.civilCap) || ''}
                fill="#020617"
                fillOpacity="0.25"
              />
            </>
          )}

          {/* Night Shadow Core (where Sun altitude < 0) */}
          {showNightShadow && (
            <path
              d={pathGenerator(geoCircles.nightCap) || ''}
              fill="#030712"
              fillOpacity="0.55"
              className="pointer-events-none"
            />
          )}

          {/* 7. Solar Altitude / Elevation Contours around Subsolar Point */}
          {showElevationRings &&
            geoCircles.elevationRings.map((ring, i) => (
              <g key={`elevation-ring-${ring.altitude}`}>
                <path
                  d={pathGenerator(ring.geometry) || ''}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="0.7"
                  strokeDasharray="2,3"
                  strokeOpacity={0.15 + (i * 0.06)}
                />
              </g>
            ))}

          {/* 8. Observer Geodesic Line (Connecting Observer to Sun) */}
          {showObserverArc && geoCircles.observerLine && (
            <path
              d={pathGenerator(geoCircles.observerLine) || ''}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.6"
              strokeDasharray="4,4"
              strokeOpacity="0.75"
              filter="url(#glowEffect)"
            />
          )}

          {/* 9. 3D Globe Outer Atmosphere Ring */}
          {projectionType === 'orthographic' && (
            <circle
              cx={dimensions.width / 2 + panOffset.x}
              cy={dimensions.height / 2 + panOffset.y}
              r={globeRadius}
              fill="url(#atmosphereGlow)"
              pointerEvents="none"
            />
          )}

          {/* 10. Floating User Position & Latitude Marker */}
          {observerScreen && userCoords && (
            <g transform={`translate(${observerScreen.x}, ${observerScreen.y})`} className="pointer-events-none">
              {/* Radar pulse ripples */}
              <circle r="14" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" />
              <circle r="8" fill="#38bdf8" fillOpacity="0.35" className="animate-pulse" />
              <circle r="4.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
              <circle r="2" fill="#ffffff" />

              {/* Floating Tag Leader Line */}
              <line x1="0" y1="-4.5" x2="8" y2="-16" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8" />
              
              {/* Floating Info Pill */}
              <g transform="translate(10, -28)">
                <rect
                  x="-3"
                  y="-8"
                  width="130"
                  height="26"
                  rx="5"
                  fill="#030b18"
                  fillOpacity="0.9"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  filter="url(#glowEffect)"
                />
                <text
                  x="3"
                  y="2"
                  fill="#38bdf8"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none"
                >
                  📍 {formatLatitude(userCoords.latitude, 2)} • {locationName || (isPt ? 'Você' : 'You')}
                </text>
                <text
                  x="3"
                  y="12"
                  fill="#fbbf24"
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  className="select-none"
                >
                  {latitudeComparison
                    ? `ΔLat: ${latitudeComparison.diffLat.toFixed(1)}° (${latitudeComparison.sunRelativeDirection})`
                    : ''}
                </text>
              </g>
            </g>
          )}

          {/* 11. Subsolar Point Zenith Marker */}
          {subsolarScreen && (
            <g transform={`translate(${subsolarScreen.x}, ${subsolarScreen.y})`} className="pointer-events-none">
              {/* Corona Glow Circles */}
              <circle r="28" fill="url(#subsolarGlowGrad)" />
              <circle r="14" fill="#fbbf24" fillOpacity="0.3" className="animate-pulse" />
              <circle r="7" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" filter="url(#glowEffect)" />
              <circle r="3" fill="#ffffff" />

              {/* Radiant Cardinal Rays */}
              <line x1="-12" y1="0" x2="-8" y2="0" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="8" y1="0" x2="12" y2="0" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="0" y1="-12" x2="0" y2="-8" stroke="#fef08a" strokeWidth="1.5" />
              <line x1="0" y1="8" x2="0" y2="12" stroke="#fef08a" strokeWidth="1.5" />

              {/* Floating Tag to the Right of the Sun's Position */}
              <g transform="translate(14, -14)">
                {/* Background pill */}
                <rect
                  x="-2"
                  y="-1"
                  width="142"
                  height="28"
                  rx="6"
                  fill="#030b18"
                  fillOpacity="0.94"
                  stroke="#fbbf24"
                  strokeWidth="0.9"
                  filter="url(#glowEffect)"
                />
                
                {/* 1st Line: Sun Zenith coordinates */}
                <text
                  x="4"
                  y="10"
                  fill="#fef08a"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none"
                >
                  ☀️ {isPt ? 'Ponto Subsolar' : 'Subsolar Point'} ({formatLatitude(subsolarLat, 1)})
                </text>

                {/* 2nd Line: Local Civil Time (Hora Civil Local: HH:MM:SS) */}
                <text
                  x="4"
                  y="21"
                  fill="#38bdf8"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none"
                >
                  🕒 {isPt ? 'Hora Civil:' : 'Civil Time:'} <tspan fill="#ffffff" fontWeight="900">{civilTimeFormatted}</tspan>
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Latitude Comparator HUD Card */}
        {showComparisonHud && latitudeComparison && userCoords && (
          <div className="absolute top-2.5 right-2.5 pointer-events-auto bg-[#050b18]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2.5 text-white shadow-2xl font-mono text-[9px] max-w-[220px] flex flex-col gap-1 transition-all hover:border-cyan-400 z-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] font-bold text-cyan-300 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                {isPt ? 'Comparador de Latitude' : 'Latitude Comparator'}
              </span>
              <button
                onClick={() => setShowComparisonHud(false)}
                className="text-white/40 hover:text-white p-0.5"
                title={isPt ? 'Ocultar' : 'Hide'}
              >
                ✕
              </button>
            </div>
            
            <div className="flex items-center justify-between text-white/80">
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                {isPt ? 'Sua Latitude:' : 'Your Latitude:'}
              </span>
              <strong className="text-white">
                {formatLatitude(userCoords.latitude, 2)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-white/80">
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                {isPt ? 'Lat. Subsolar (Sol):' : 'Subsolar Lat:'}
              </span>
              <strong className="text-amber-300">
                {formatLatitude(subsolarLat, 2)}
              </strong>
            </div>

            <div className="mt-0.5 pt-1 border-t border-white/10 flex items-center justify-between text-[8px]">
              <span className="text-white/60">{isPt ? 'Diferença Angular:' : 'Angular Gap:'}</span>
              <span className="font-bold text-cyan-400">
                Δ {latitudeComparison.diffLat.toFixed(2)}° ({latitudeComparison.sunRelativeDirection})
              </span>
            </div>

            <div className="flex items-center justify-between text-[8px] text-white/60">
              <span>{isPt ? 'Alt. Máx no Meio-Dia:' : 'Max Noon Elevation:'}</span>
              <span className="font-bold text-amber-300">
                {latitudeComparison.maxNoonElevation.toFixed(1)}°
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Point Inspector Tooltip */}
        {inspectedPoint && (
          <div
            className="absolute pointer-events-none z-30 bg-black/85 backdrop-blur-md border border-amber-400/40 rounded-xl p-2.5 text-white shadow-2xl font-mono text-[9px] flex flex-col gap-1 min-w-[170px]"
            style={{
              left: Math.min(dimensions.width - 190, Math.max(10, inspectedPoint.screenX + 12)),
              top: Math.min(dimensions.height - 120, Math.max(10, inspectedPoint.screenY - 30))
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1 text-amber-400 font-bold uppercase tracking-wider text-[8px]">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-amber-300" />
                {isPt ? 'Ponto Inspecionado' : 'Inspected Point'}
              </span>
              <span className={`px-1 rounded text-[7px] ${
                inspectedPoint.altitude >= 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {inspectedPoint.status}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>{isPt ? 'Coordenadas:' : 'Coords:'}</span>
              <span className="font-bold text-white">
                {formatLatitude(inspectedPoint.lat, 1)}, {formatLongitude(inspectedPoint.lon, 1)}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>{isPt ? 'Altitude Solar:' : 'Solar Elevation:'}</span>
              <span className={`font-bold ${inspectedPoint.altitude >= 0 ? 'text-amber-300' : 'text-indigo-300'}`}>
                {inspectedPoint.altitude.toFixed(1)}°
              </span>
            </div>
            <div className="flex items-center justify-between text-white/70 border-t border-white/10 pt-1 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-400/70" />
                {isPt ? 'Hora Solar Local:' : 'Local Solar Time:'}
              </span>
              <span className="font-bold text-amber-400 tabular-nums">
                {liveInspectedSolarTime || inspectedPoint.solarTimeStr}
              </span>
            </div>
          </div>
        )}

        {/* 3D Globe Drag Hint */}
        {projectionType === 'orthographic' && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 text-[8px] text-white/70 font-mono pointer-events-none flex items-center gap-1.5 shadow-lg">
            <RotateCw className="w-2.5 h-2.5 text-amber-400 animate-spin-slow" />
            <span>{isPt ? 'Gire com clique/toque • Zoom com roda ou pinça' : 'Drag to rotate • Pinch/Wheel to zoom'}</span>
          </div>
        )}

        {/* 2D Projection Navigation Hint */}
        {projectionType !== 'orthographic' && (
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 text-[8px] text-white/70 font-mono pointer-events-none flex items-center gap-1.5 shadow-lg">
            <Compass className="w-2.5 h-2.5 text-cyan-400" />
            <span>{isPt ? 'Arraste para mover o mapa • Zoom com roda ou pinça' : 'Drag to pan • Pinch/Wheel to zoom'}</span>
          </div>
        )}

        {/* Floating Zoom & Pan Controls Toolbar */}
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center bg-[#050b18]/90 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl font-mono text-[9px] text-white/90 gap-1 select-none pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/15 active:scale-95 rounded-lg text-amber-300 transition-colors cursor-pointer"
            title={isPt ? 'Aproximar Zoom (+)' : 'Zoom In (+)'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className={`px-2 py-1 active:scale-95 rounded-lg text-white font-bold tracking-tight text-[9px] transition-colors border cursor-pointer ${
              zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'hover:bg-white/15 border-white/10'
            }`}
            title={isPt ? 'Clique para redefinir zoom e centralizar (100%)' : 'Click to reset zoom and center (100%)'}
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/15 active:scale-95 rounded-lg text-amber-300 transition-colors cursor-pointer"
            title={isPt ? 'Afastar Zoom (−)' : 'Zoom Out (−)'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {(zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0) && (
            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-white/15 active:scale-95 rounded-lg text-cyan-300 transition-colors border-l border-white/10 ml-0.5 cursor-pointer"
              title={isPt ? 'Redefinir Posição e Zoom' : 'Reset View and Zoom'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Control Layers Bar & Stats Footer */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[9px] font-mono">
        {/* Layer Visibility Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white/40 uppercase tracking-widest text-[8px] mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {isPt ? 'Camadas:' : 'Layers:'}
          </span>
          
          <button
            onClick={() => setShowNightShadow(!showNightShadow)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showNightShadow ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            {isPt ? 'Sombra Noturna' : 'Night Shadow'}
          </button>

          <button
            onClick={() => setShowTwilight(!showTwilight)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showTwilight ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            {isPt ? 'Crepúsculo' : 'Twilight'}
          </button>

          <button
            onClick={() => setShowElevationRings(!showElevationRings)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showElevationRings ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            {isPt ? 'Anéis de Altura Solar' : 'Solar Rings'}
          </button>

          <button
            onClick={() => setShowTropics(!showTropics)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showTropics ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-white/5 text-white/40 border-white/5'
            }`}
            title={isPt ? `Trópicos (±${effectiveTilt.toFixed(2)}°) e Círculos Polares [90° - inclinação] (±${polarLatitude.toFixed(2)}°)` : `Tropics (±${effectiveTilt.toFixed(2)}°) and Polar Circles [90° - tilt] (±${polarLatitude.toFixed(2)}°)`}
          >
            {isPt ? `Trópicos (±${effectiveTilt.toFixed(1)}°) & Polares (±${polarLatitude.toFixed(1)}°)` : `Tropics (±${effectiveTilt.toFixed(1)}°) & Polar (±${polarLatitude.toFixed(1)}°)`}
          </button>

          {userCoords && (
            <>
              <button
                onClick={() => setShowUserLatitude(!showUserLatitude)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  showUserLatitude ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-white/40 border-white/5'
                }`}
                title={isPt ? 'Linha do paralelo de latitude do usuário' : 'User latitude parallel line'}
              >
                {isPt ? 'Paralelo da Sua Latitude' : 'Your Latitude Parallel'}
              </button>
              
              <button
                onClick={() => setShowPolarLines(!showPolarLines)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  showPolarLines ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-white/5 text-white/40 border-white/5'
                }`}
                title={isPt ? 'Linhas de Dia/Noite Polar' : 'Polar Day/Night Lines'}
              >
                {isPt ? 'Polar (Dia/Noite)' : 'Polar (Day/Night)'}
              </button>

              <button
                onClick={() => setShowObserverArc(!showObserverArc)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  showObserverArc ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-white/40 border-white/5'
                }`}
              >
                {isPt ? 'Arco do Observador' : 'Observer Arc'}
              </button>

              <button
                onClick={() => setShowComparisonHud(!showComparisonHud)}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  showComparisonHud ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-white/40 border-white/5'
                }`}
                title={isPt ? 'Exibir/Ocultar painel comparador de latitude' : 'Toggle Latitude Comparator HUD'}
              >
                {isPt ? 'Comparador HUD' : 'Comparator HUD'}
              </button>
            </>
          )}
        </div>

        {/* Geodesic Summary Card */}
        {observerGeodesic && (
          <div className="flex items-center gap-3 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-white/80">
            <div className="flex items-center gap-1 text-cyan-400">
              <Navigation className="w-3 h-3" />
              <span>
                {isPt ? 'Distância ao Zênite Solar:' : 'Zenith Distance:'}{' '}
                <strong className="text-white">{observerGeodesic.distanceKm.toLocaleString()} km</strong> ({observerGeodesic.angularDistDeg.toFixed(1)}°)
              </span>
            </div>
            <div className="text-amber-400">
              {isPt ? 'Alt. Solar Local:' : 'Local Solar Alt:'}{' '}
              <strong className="text-white">{observerGeodesic.solarAltitudeDeg.toFixed(1)}°</strong>
            </div>
          </div>
        )}
      </div>

      {/* Educational Footer Legend */}
      <div className="mt-2 text-[8px] text-white/40 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            {isPt ? 'Ponto Subsolar (Sol a 90° no zênite)' : 'Subsolar Point (Sun at 90° Zenith)'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            {isPt ? 'Local Observador' : 'Observer Location'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
            {isPt ? `Trópicos (±${effectiveTilt.toFixed(2)}°)` : `Tropics (±${effectiveTilt.toFixed(2)}°)`}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block border-t border-dashed border-sky-400"></span>
            {isPt ? `Círculos Polares (±${polarLatitude.toFixed(2)}°)` : `Polar Circles (±${polarLatitude.toFixed(2)}°)`}
          </span>
        </div>
        <span>
          {isPt
            ? `Cálculo astronômico em tempo real • Inclinação Axial: ${effectiveTilt.toFixed(2)}° • Polares: ±${polarLatitude.toFixed(2)}°`
            : `Real-time astronomical calculation • Axial Tilt: ${effectiveTilt.toFixed(2)}° • Polar: ±${polarLatitude.toFixed(2)}°`}
        </span>
      </div>
    </div>
  );
};
