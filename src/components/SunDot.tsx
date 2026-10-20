import React, { useEffect, useRef } from 'react';

interface SunDotProps {
  sun: { altitude: number; azimuth: number };
  viewMode: 'dome' | 'profile';
  centerX: number;
  centerY: number;
  radius: number;
  width: number;
  height: number;
  graphPadLeft: number;
  graphPadRight: number;
  graphPadTop: number;
  graphPadBottom: number;
  pulseMode: 'intensity' | 'static';
  currentDate: Date;
  solarNoon: Date;
}

export const SunDot: React.FC<SunDotProps> = ({ sun, viewMode, centerX, centerY, radius, width, height, graphPadLeft, graphPadRight, graphPadTop, graphPadBottom, pulseMode, currentDate, solarNoon }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedSunRef = useRef(sun);
  const historyRef = useRef<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;

    const getDomeCoords = (az: number, alt: number) => {
      const altRatio = (90 - alt) / 90;
      const d = radius * altRatio;
      const rad = (az - 90) * Math.PI / 180;
      return {
        x: centerX + d * Math.cos(rad),
        y: centerY + d * Math.sin(rad),
      };
    };

    const getProfileCoords = (az: number, alt: number) => {
      const graphW = width - graphPadLeft - graphPadRight;
      const graphH = height - graphPadTop - graphPadBottom;
      const x = graphPadLeft + (az / 360) * graphW;
      const y = graphPadTop + ((90 - alt) / 180) * graphH;
      return { x, y };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Interpolate
      animatedSunRef.current.altitude += (sun.altitude - animatedSunRef.current.altitude) * 0.1;
      animatedSunRef.current.azimuth += (sun.azimuth - animatedSunRef.current.azimuth) * 0.1;

      const { altitude, azimuth } = animatedSunRef.current;
      const coords = viewMode === 'dome' ? getDomeCoords(azimuth, altitude) : getProfileCoords(azimuth, altitude);

      // Update history
      historyRef.current.push(coords);
      if (historyRef.current.length > 100) historyRef.current.shift();
      
      // Draw shadow trail
      if (historyRef.current.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < historyRef.current.length; i++) {
            const p = historyRef.current[i];
            const opacity = i / historyRef.current.length;
            ctx.strokeStyle = `rgba(251, 191, 36, ${opacity * 0.3})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Sun glow
      const timeDiff = Math.abs(currentDate.getTime() - solarNoon.getTime());
      const intensity = Math.max(0, 1 - (timeDiff / (12 * 60 * 60 * 1000)));
      const speed = pulseMode === 'intensity' ? (intensity * 0.5 + 0.5) : 0.5;
      const pulse = Math.sin(performance.now() / (500 / speed)) * 4 + 10;
      
      // Atmospheric haze: color deepen as altitude decreases
      const hazeFactor = Math.max(0, Math.min(1, (10 - altitude) / 20));
      const r = 255;
      const g = Math.floor(191 + (64 * hazeFactor)); // Redden
      const b = Math.floor(36 + (64 * hazeFactor));
      const sunColor = `rgb(${r},${g},${b})`;

      ctx.beginPath();
      ctx.arc(coords.x, coords.y, pulse, 0, Math.PI * 2);
      const sunGlow = ctx.createRadialGradient(coords.x, coords.y, 2, coords.x, coords.y, pulse);
      sunGlow.addColorStop(0, sunColor.replace('rgb', 'rgba').replace(')', ', 0.6)'));
      sunGlow.addColorStop(1, sunColor.replace('rgb', 'rgba').replace(')', ', 0)'));
      ctx.fillStyle = sunGlow;
      ctx.fill();

      // Sun core
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = sunColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [sun, viewMode, centerX, centerY, radius, width, height, graphPadLeft, graphPadRight, graphPadTop, graphPadBottom, pulseMode, currentDate, solarNoon]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 w-full h-full" />;
};
