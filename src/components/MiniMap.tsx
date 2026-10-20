import React, { useEffect, useRef } from 'react';

interface MiniMapProps {
  lat: number;
  lng: number;
}

export const MiniMap: React.FC<MiniMapProps> = ({ lat, lng }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (simple rectangle)
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw "map" - just a simple projection for now
    // Lat: -90 to 90, Lng: -180 to 180
    const x = ((lng + 180) / 360) * canvas.width;
    const y = ((90 - lat) / 180) * canvas.height;

    // Draw marker
    ctx.fillStyle = '#fbbf24'; // amber-400
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw crosshair
    ctx.strokeStyle = '#fbbf2450';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }, [lat, lng]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={100} 
      className="w-full rounded-xl border border-white/10" 
    />
  );
};
