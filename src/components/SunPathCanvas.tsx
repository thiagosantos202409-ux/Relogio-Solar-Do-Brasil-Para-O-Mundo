import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Sun, Compass, ToggleLeft, ToggleRight, Eye, RefreshCw, Layers } from 'lucide-react';
import SunCalc from 'suncalc';
import { SunDot } from './SunDot';

interface SunPathCanvasProps {
  latitude: number;
  longitude: number;
  date: Date;
  timezoneOffset?: number; // in minutes
  language?: 'pt' | 'en' | string;
}

export const SunPathCanvas: React.FC<SunPathCanvasProps> = ({
  latitude,
  longitude,
  date,
  timezoneOffset = 0,
  language = 'en',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    centerX: 0, centerY: 0, radius: 0,
    graphPadLeft: 40, graphPadRight: 20, graphPadTop: 20, graphPadBottom: 30,
    width: 0, height: 0
  });
  const [viewMode, setViewMode] = useState<'dome' | 'profile'>('dome');
  const [pulseMode, setPulseMode] = useState<'intensity' | 'static'>('intensity');
  const [hoveredPoint, setHoveredPoint] = useState<{
    time: Date;
    altitude: number;
    azimuth: number;
    x: number;
    y: number;
  } | null>(null);
  const [manualTimeOffsetMinutes, setManualTimeOffsetMinutes] = useState(0);

  const solarNoon = useMemo(() => {
    return SunCalc.getTimes(date, latitude, longitude).solarNoon;
  }, [date, latitude, longitude]);

  const isPt = language === 'pt';

  // Calculate sun positions for every 10 minutes of the day
  const pathPoints = useMemo(() => {
    const points: Array<{ time: Date; altitude: number; azimuth: number }> = [];
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    // Add manual offset to the calculation basis
    const offsetMs = manualTimeOffsetMinutes * 60 * 1000;

    const latRad = latitude * Math.PI / 180;
    const lonRad = longitude * Math.PI / 180;

    for (let minutes = 0; minutes <= 24 * 60; minutes += 10) {
      const pointTime = new Date(baseDate.getTime() + minutes * 60 * 1000 + offsetMs);
      const pos = SunCalc.getPosition(pointTime, latRad, lonRad);

      const altDeg = pos.altitude * 180 / Math.PI;
      const azDeg = (pos.azimuth * 180 / Math.PI + 180) % 360;

      points.push({
        time: pointTime,
        altitude: altDeg,
        azimuth: azDeg,
      });
    }
    return points;
  }, [latitude, longitude, date, manualTimeOffsetMinutes]);

  // Current sun position
  const currentSun = useMemo(() => {
    const latRad = latitude * Math.PI / 180;
    const lonRad = longitude * Math.PI / 180;
    const pos = SunCalc.getPosition(date, latRad, lonRad);
    const altDeg = pos.altitude * 180 / Math.PI;
    const azDeg = (pos.azimuth * 180 / Math.PI + 180) % 360;
    return { altitude: altDeg, azimuth: azDeg };
  }, [latitude, longitude, date]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Update layout for SunDot
    const centerX = width / 2;
    const centerY = height / 2;
    const padding = 24;
    const radius = Math.min(centerX, centerY) - padding;
    
    setLayout(prev => {
      if (prev.centerX === centerX && 
          prev.centerY === centerY && 
          prev.radius === radius && 
          prev.width === width && 
          prev.height === height) {
        return prev;
      }
      return {
        centerX, centerY, radius,
        graphPadLeft: 40, graphPadRight: 20, graphPadTop: 20, graphPadBottom: 30,
        width, height
      };
    });

    // Clear background
    ctx.clearRect(0, 0, width, height);

    if (viewMode === 'dome') {
      // Draw Sky Dome (Polar Projection)
      // concentric circles representing altitudes (0, 30, 60 deg)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      // Horizon (0 deg)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '8px monospace';
      ctx.fillText('0°', centerX + radius + 5, centerY);

      // 30 deg altitude
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (60 / 90), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('30°', centerX + radius * (60 / 90) + 5, centerY);

      // 60 deg altitude
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (30 / 90), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('60°', centerX + radius * (30 / 90) + 5, centerY);

      // Center zenith crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY);
      ctx.lineTo(centerX + 8, centerY);
      ctx.moveTo(centerX, centerY - 8);
      ctx.lineTo(centerX, centerY + 8);
      ctx.stroke();

      // Compass Grid Lines (N-S, E-W)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.stroke();

      // Draw Compass Labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', centerX, centerY - radius - 10);
      ctx.fillText('S', centerX, centerY + radius + 10);
      ctx.fillText('E', centerX + radius + 10, centerY);
      ctx.fillText('W', centerX - radius - 10, centerY);

      // Shading Night/Day regions
      // Let's draw the sun's path
      // Orthographic projection: distance from center = radius * cos(altitude)
      // Actually, polar projection: distance from center = radius * (90 - altitude) / 90
      const getDomeCoords = (az: number, alt: number) => {
        const altRatio = (90 - alt) / 90; // alt of 90 is center (0 ratio), alt of 0 is radius (1 ratio)
        const d = radius * altRatio;
        // Azimuth from compass: 0 is North (-Y), 90 is East (+X), 180 is South (+Y), 270 is West (-X)
        const rad = (az - 90) * Math.PI / 180;
        return {
          x: centerX + d * Math.cos(rad),
          y: centerY + d * Math.sin(rad),
        };
      };

      // Draw Twilight regions (Sun under horizon but above -18 degrees)
      // Draw background sky gradient under the dome
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      const skyGrad = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius);
      skyGrad.addColorStop(0, '#0a0d1a'); // Dark space at zenith
      skyGrad.addColorStop(1, '#05070e'); // Horizon
      ctx.fillStyle = skyGrad;
      ctx.fill();
      ctx.restore();

      // Draw Path Line
      ctx.lineWidth = 2;
      let isFirst = true;

      // Draw complete path
      ctx.beginPath();
      pathPoints.forEach(p => {
        const { x, y } = getDomeCoords(p.azimuth, p.altitude);
        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Gradient stroke for daylight / night portions of the path
      const pathGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
      pathGrad.addColorStop(0, 'rgba(251, 191, 36, 0.8)'); // golden/yellow at high altitudes
      pathGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.6)'); // orange near horizon
      pathGrad.addColorStop(0.85, 'rgba(99, 102, 241, 0.3)'); // indigo at dawn/dusk
      pathGrad.addColorStop(1, 'rgba(30, 41, 59, 0.15)'); // faded in night
      ctx.strokeStyle = pathGrad;
      ctx.stroke();

      // Hover point drawing and calculation
      if (hoveredPoint) {
        const { x, y } = getDomeCoords(hoveredPoint.azimuth, hoveredPoint.altitude);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

    } else {
      // Draw Horizon Elevation Profile (Azimuth vs. Altitude)
      const graphPadLeft = 40;
      const graphPadRight = 20;
      const graphPadTop = 20;
      const graphPadBottom = 30;

      const graphW = width - graphPadLeft - graphPadRight;
      const graphH = height - graphPadTop - graphPadBottom;

      const getProfileCoords = (az: number, alt: number) => {
        // X-axis: Azimuth 0 to 360 deg
        const x = graphPadLeft + (az / 360) * graphW;
        // Y-axis: Altitude -90 to 90 deg (reversed in canvas coords)
        const y = graphPadTop + ((90 - alt) / 180) * graphH;
        return { x, y };
      };

      // Draw background grid lines for altitude
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      [-60, -30, 0, 30, 60, 90].forEach(alt => {
        const y = graphPadTop + ((90 - alt) / 180) * graphH;
        ctx.beginPath();
        ctx.moveTo(graphPadLeft, y);
        ctx.lineTo(width - graphPadRight, y);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        let label = `${alt}°`;
        if (alt === 0) label = '0° Horizon';
        if (alt === 90) label = '90° Zenith';
        ctx.fillText(label, graphPadLeft - 5, y);
      });

      // Draw Azimuth labels (N, NE, E, SE, S, SW, W, NW)
      const directions = [
        { label: 'N', az: 0 },
        { label: 'E', az: 90 },
        { label: 'S', az: 180 },
        { label: 'W', az: 270 },
        { label: 'N', az: 360 }
      ];
      directions.forEach(d => {
        const x = graphPadLeft + (d.az / 360) * graphW;
        ctx.beginPath();
        ctx.moveTo(x, graphPadTop);
        ctx.lineTo(x, height - graphPadBottom);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.label, x, height - graphPadBottom + 5);
      });

      // Shading above/below horizon
      const horizonY = graphPadTop + (90 / 180) * graphH;

      // Sky/Day light fill
      ctx.fillStyle = 'rgba(14, 165, 233, 0.04)';
      ctx.fillRect(graphPadLeft, graphPadTop, graphW, horizonY - graphPadTop);

      // Earth/Horizon plane fill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(graphPadLeft, horizonY, graphW, height - graphPadBottom - horizonY);

      // Strong Horizon Line (0 deg)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(graphPadLeft, horizonY);
      ctx.lineTo(width - graphPadRight, horizonY);
      ctx.stroke();

      // Draw Path curve sorted by time/azimuth sequence
      ctx.lineWidth = 2;
      ctx.beginPath();
      let isFirst = true;

      // Filter or sort points for smoother drawing (azimuth wraps around so simple line might split awkwardly. Let's just draw chronologically!)
      const chronologicalPoints = [...pathPoints].sort((a, b) => a.time.getTime() - b.time.getTime());

      // If azimuth jumps 360, let's lift pen or handle it gracefully
      for (let i = 0; i < chronologicalPoints.length; i++) {
        const p = chronologicalPoints[i];
        const { x, y } = getProfileCoords(p.azimuth, p.altitude);

        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          // If azimuth difference is too large, it wrapped around. Avoid drawing horizontal line across.
          const prevP = chronologicalPoints[i - 1];
          if (Math.abs(p.azimuth - prevP.azimuth) > 180) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      // Curve color style
      const pathGrad = ctx.createLinearGradient(graphPadLeft, 0, width - graphPadRight, 0);
      pathGrad.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // Dawn transition
      pathGrad.addColorStop(0.25, 'rgba(251, 191, 36, 0.8)'); // East sunrise
      pathGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.9)'); // Noon highest
      pathGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.8)'); // West sunset
      pathGrad.addColorStop(1, 'rgba(99, 102, 241, 0.4)'); // Twilight/night
      ctx.strokeStyle = pathGrad;
      ctx.stroke();

      // Hover point drawing and calculation
      if (hoveredPoint) {
        const { x, y } = getProfileCoords(hoveredPoint.azimuth, hoveredPoint.altitude);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crosshairs to axes
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.beginPath();
        ctx.moveTo(graphPadLeft, y);
        ctx.lineTo(x, y);
        ctx.moveTo(x, y);
        ctx.lineTo(x, height - graphPadBottom);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [viewMode, pathPoints, hoveredPoint]);


  // Handle interaction with mouse hovering the canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const padding = 24;
    const radius = Math.min(centerX, centerY) - padding;

    let closestPoint: typeof pathPoints[0] | null = null;
    let minDistance = Infinity;
    let projectedX = 0;
    let projectedY = 0;

    if (viewMode === 'dome') {
      const getDomeCoords = (az: number, alt: number) => {
        const altRatio = (90 - alt) / 90;
        const d = radius * altRatio;
        const rad = (az - 90) * Math.PI / 180;
        return {
          x: centerX + d * Math.cos(rad),
          y: centerY + d * Math.sin(rad),
        };
      };

      pathPoints.forEach(p => {
        const { x, y } = getDomeCoords(p.azimuth, p.altitude);
        const dist = Math.hypot(mouseX - x, mouseY - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = p;
          projectedX = x;
          projectedY = y;
        }
      });
    } else {
      const graphPadLeft = 40;
      const graphPadRight = 20;
      const graphPadTop = 20;
      const graphPadBottom = 30;

      const graphW = width - graphPadLeft - graphPadRight;
      const graphH = height - graphPadTop - graphPadBottom;

      const getProfileCoords = (az: number, alt: number) => {
        const x = graphPadLeft + (az / 360) * graphW;
        const y = graphPadTop + ((90 - alt) / 180) * graphH;
        return { x, y };
      };

      pathPoints.forEach(p => {
        const { x, y } = getProfileCoords(p.azimuth, p.altitude);
        const dist = Math.hypot(mouseX - x, mouseY - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = p;
          projectedX = x;
          projectedY = y;
        }
      });
    }

    // Only set hover if mouse is close enough to any point on path
    if (minDistance < 25 && closestPoint) {
      setHoveredPoint({
        time: closestPoint.time,
        altitude: closestPoint.altitude,
        azimuth: closestPoint.azimuth,
        x: projectedX,
        y: projectedY,
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full flex flex-col glass-dark rounded-2xl border border-white/10 p-3 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/80">
            {isPt ? 'Trajetória Solar (Canvas)' : 'Solar Path (Canvas)'}
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-0.5">
          <button
            onClick={() => setViewMode('dome')}
            className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all ${
              viewMode === 'dome' ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {isPt ? 'Cúpula' : 'Dome'}
          </button>
          <button
            onClick={() => setViewMode('profile')}
            className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all ${
              viewMode === 'profile' ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {isPt ? 'Perfil' : 'Profile'}
          </button>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-0.5">
          <button
            onClick={() => setPulseMode(pulseMode === 'intensity' ? 'static' : 'intensity')}
            className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase transition-all ${
              pulseMode === 'intensity' ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {pulseMode === 'intensity' ? (isPt ? 'Intensidade' : 'Intensity') : (isPt ? 'Estático' : 'Static')}
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] bg-black/40 rounded-xl overflow-hidden border border-white/5">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />
        <SunDot 
          sun={currentSun} 
          viewMode={viewMode}
          centerX={layout.centerX}
          centerY={layout.centerY}
          radius={layout.radius}
          width={layout.width}
          height={layout.height}
          graphPadLeft={layout.graphPadLeft}
          graphPadRight={layout.graphPadRight}
          graphPadTop={layout.graphPadTop}
          graphPadBottom={layout.graphPadBottom}
          pulseMode={pulseMode}
          currentDate={date}
          solarNoon={solarNoon}
        />

        {/* Dynamic Hover coordinates tooltip HUD */}
        {hoveredPoint && (
          <div className="absolute top-2 left-2 pointer-events-none bg-black/80 border border-amber-400/30 rounded-lg p-2 font-mono text-[9px] text-white/90 shadow-2xl backdrop-blur-md flex flex-col gap-0.5">
            <span className="text-[7px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">
              {isPt ? 'INSPEÇÃO SOLAR' : 'SOLAR INSPECTION'}
            </span>
            <div className="flex justify-between gap-4">
              <span className="opacity-60">{isPt ? 'Hora:' : 'Time:'}</span>
              <span className="font-bold text-amber-300">
                {hoveredPoint.time.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="opacity-60">{isPt ? 'Altitude:' : 'Altitude:'}</span>
              <span className="font-bold">{hoveredPoint.altitude.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="opacity-60">{isPt ? 'Azimute:' : 'Azimuth:'}</span>
              <span className="font-bold">{hoveredPoint.azimuth.toFixed(1)}°</span>
            </div>
          </div>
        )}

        {/* Current Info Panel */}
        <div className="absolute bottom-2 right-2 pointer-events-none bg-white/5 border border-white/10 rounded-lg p-1.5 font-mono text-[8px] text-white/70 backdrop-blur-sm flex flex-col gap-0.5">
          <div className="flex items-center gap-1 mb-0.5 text-amber-400 font-bold">
            <Sun className="w-2.5 h-2.5 animate-pulse" />
            <span>{isPt ? 'SOL ATUAL' : 'CURRENT SUN'}</span>
          </div>
          <div>Alt: {currentSun.altitude.toFixed(1)}°</div>
          <div>Az: {currentSun.azimuth.toFixed(1)}°</div>
        </div>

        {/* Quick legend helper */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-white/5 border border-white/10 rounded-lg p-1 text-[8px] text-white/50 backdrop-blur-sm">
          {isPt ? 'Mova o mouse para inspecionar' : 'Hover path to inspect'}
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 text-[7px] font-mono text-white/30 uppercase tracking-widest">
        <span>Lat: {latitude.toFixed(4)}°</span>
        <span>Lon: {longitude.toFixed(4)}°</span>
      </div>

      <div className="mt-2 flex flex-col gap-1 p-2 bg-white/5 rounded-lg border border-white/10">
        <label className="text-[8px] uppercase tracking-wider text-white/60">
          {isPt ? 'Ajustar Trajetória Solar' : 'Adjust Solar Path'} ({manualTimeOffsetMinutes} min)
        </label>
        <input 
          type="range" 
          min="-720" 
          max="720" 
          step="10" 
          value={manualTimeOffsetMinutes} 
          onChange={(e) => setManualTimeOffsetMinutes(parseInt(e.target.value, 10))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>
    </div>
  );
};
