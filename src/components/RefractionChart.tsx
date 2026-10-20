import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SunCalc from 'suncalc';
import { getRefractionCorrection } from '../lib/solarTime';

interface RefractionChartProps {
  timestamp: number;
  latitude: number;
  longitude: number;
}

const LightRaySimulation = ({ altitude, correction }: { altitude: number; correction: number }) => {
  // Exaggerate correction for visual purposes if it's too small, but keep it proportional
  const visualCorrection = correction > 0 ? Math.min(Math.max(correction * 15, 2), 20) : 0;
  
  // Clamp true altitude between -20 and 90 for the visualization
  const clampedAltitude = Math.max(-20, Math.min(90, altitude));
  const apparentAltitude = clampedAltitude + visualCorrection;
  
  const obsX = 30;
  const obsY = 130;
  
  const appAngle = apparentAltitude * Math.PI / 180;
  const length = 400;
  const appX = obsX + Math.cos(appAngle) * length;
  const appY = obsY - Math.sin(appAngle) * length;
  
  const trueAngle = clampedAltitude * Math.PI / 180;
  
  // Control points for cubic bezier
  // Start heading towards apparent position
  const cp1X = obsX + Math.cos(appAngle) * 60;
  const cp1Y = obsY - Math.sin(appAngle) * 60;
  
  // End coming from true position
  const endX = obsX + Math.cos(trueAngle) * length;
  const endY = obsY - Math.sin(trueAngle) * length;
  const cp2X = endX - Math.cos(trueAngle) * (length - 100);
  const cp2Y = endY + Math.sin(trueAngle) * (length - 100);

  return (
    <div className="w-full h-full relative bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#1e293b] rounded-lg overflow-hidden border border-white/5">
      <div className="absolute inset-x-0 bottom-0 h-[20%] bg-white/5 border-t border-white/10 flex items-start pt-1 pl-2 text-[7px] uppercase tracking-wider text-white/30 font-mono">Troposphere</div>
      <div className="absolute inset-x-0 bottom-[20%] h-[30%] bg-white/[0.02] border-t border-white/5 flex items-start pt-1 pl-2 text-[7px] uppercase tracking-wider text-white/30 font-mono">Stratosphere</div>
      <div className="absolute inset-x-0 bottom-[50%] h-[30%] bg-transparent border-t border-white/[0.02] flex items-start pt-1 pl-2 text-[7px] uppercase tracking-wider text-white/30 font-mono">Mesosphere</div>

      <svg viewBox="0 0 300 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMinYMax slice">
        <defs>
            <linearGradient id="rayGradient" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
            </linearGradient>
            <style>
                {`
                @keyframes dash-ray {
                    to {
                        stroke-dashoffset: -20;
                    }
                }
                @keyframes fluctuate {
                    0%, 100% { opacity: 1; filter: drop-shadow(0 0 2px rgba(251,191,36,0.6)); }
                    50% { opacity: 0.7; filter: drop-shadow(0 0 1px rgba(251,191,36,0.2)); }
                }
                .ray-path {
                    stroke-dasharray: 4 6;
                    animation: dash-ray 1s linear infinite, fluctuate 3s ease-in-out infinite;
                }
                `}
            </style>
        </defs>

        {/* Horizon Line */}
        <line x1={0} y1={obsY} x2={300} y2={obsY} stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />

        {/* Apparent line (dashed, straight) */}
        {correction > 0 && (
            <line x1={obsX} y1={obsY} x2={appX} y2={appY} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        )}
        
        {/* True line (bending) */}
        {correction > 0 ? (
            <path d={`M ${obsX} ${obsY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`} fill="none" stroke="url(#rayGradient)" strokeWidth="2" className="ray-path" />
        ) : (
            <line x1={obsX} y1={obsY} x2={endX} y2={endY} stroke="url(#rayGradient)" strokeWidth="2" className="ray-path" />
        )}
        
        {/* Observer */}
        <circle cx={obsX} cy={obsY} r="3" fill="#38bdf8" />
        <circle cx={obsX} cy={obsY} r="6" fill="#38bdf8" opacity="0.2" />
        
        {/* Labels */}
        <text x={10} y={obsY + 12} fill="#94a3b8" fontSize="7" fontFamily="monospace">OBSERVER</text>
        <text x={250} y={obsY + 12} fill="#94a3b8" fontSize="7" fontFamily="monospace">HORIZON</text>
        
        {correction > 0 && (
            <>
                <text x={appX > 300 ? 250 : appX - 40} y={appY < 0 ? 10 : appY + 10} fill="#10b981" fontSize="7" fontFamily="monospace" opacity="0.8">APPARENT ({apparentAltitude.toFixed(1)}°)</text>
                <text x={endX > 300 ? 250 : endX - 40} y={endY < 0 ? 20 : endY + 20} fill="#fbbf24" fontSize="7" fontFamily="monospace" opacity="0.8">TRUE ({clampedAltitude.toFixed(1)}°)</text>
            </>
        )}
      </svg>
    </div>
  );
};

export const RefractionChart = React.memo(({ timestamp, latitude, longitude }: RefractionChartProps) => {
  const [viewMode, setViewMode] = useState<'chart' | 'simulation'>('simulation');
  const [pressure, setPressure] = useState<number>(1010);
  const [temperature, setTemperature] = useState<number>(10);

  const data = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => {
      const d = new Date(timestamp);
      d.setUTCHours(hour, 0, 0, 0);
      const position = SunCalc.getPosition(d, latitude, longitude);
      const altitudeDegrees = position.altitude * 180 / Math.PI;
      const correction = getRefractionCorrection(altitudeDegrees, pressure, temperature);
      return { hour: `${hour}:00`, correction: isNaN(correction) ? 0 : correction };
    });
  }, [timestamp, latitude, longitude, pressure, temperature]);

  const { currentCorrection, currentAltitude } = useMemo(() => {
      const d = new Date(timestamp);
      const position = SunCalc.getPosition(d, latitude, longitude);
      const altitudeDegrees = position.altitude * 180 / Math.PI;
      return {
          currentCorrection: getRefractionCorrection(altitudeDegrees, pressure, temperature),
          currentAltitude: altitudeDegrees
      };
  }, [timestamp, latitude, longitude, pressure, temperature]);

  const pastCorrection = useMemo(() => {
      // 5 minutes ago
      const d = new Date(timestamp - 5 * 60000);
      const position = SunCalc.getPosition(d, latitude, longitude);
      const altitudeDegrees = position.altitude * 180 / Math.PI;
      return getRefractionCorrection(altitudeDegrees, pressure, temperature);
  }, [timestamp, latitude, longitude, pressure, temperature]);

  const trend = currentCorrection > pastCorrection + 0.001 ? 'Increasing' : currentCorrection < pastCorrection - 0.001 ? 'Decreasing' : 'Stable';
  const TrendIcon = trend === 'Increasing' ? '↑' : trend === 'Decreasing' ? '↓' : '→';

  const severityColor = useMemo(() => {
    if (currentCorrection > 0.4) return 'bg-red-500';
    if (currentCorrection > 0.2) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [currentCorrection]);

  return (
    <div className="h-[22rem] w-full bg-white/5 rounded-xl border border-white/5 p-4 mt-8 flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-white text-xs font-bold uppercase tracking-widest text-emerald-400/80">Refraction Simulation</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${severityColor}`}></span>
            <span className="text-[10px] text-white/50 font-mono flex items-center gap-1">
              {currentCorrection > 0.4 ? 'High' : currentCorrection > 0.2 ? 'Med' : 'Low'}
              <span className={trend === 'Increasing' ? 'text-red-400' : trend === 'Decreasing' ? 'text-emerald-400' : 'text-gray-400'} title={`Trend: ${trend}`}>
                {TrendIcon}
              </span>
            </span>
          </div>
          
          <div className="flex bg-white/5 p-0.5 rounded-md border border-white/10">
            <button 
                onClick={() => setViewMode('simulation')}
                className={`text-[8px] font-mono px-2 py-1 rounded transition-colors ${viewMode === 'simulation' ? 'bg-emerald-400/20 text-emerald-400' : 'text-white/30 hover:text-white/60'}`}
            >
                RAY PATH
            </button>
            <button 
                onClick={() => setViewMode('chart')}
                className={`text-[8px] font-mono px-2 py-1 rounded transition-colors ${viewMode === 'chart' ? 'bg-emerald-400/20 text-emerald-400' : 'text-white/30 hover:text-white/60'}`}
            >
                24H CHART
            </button>
          </div>
          
          <div className="text-[10px] text-white/50 font-mono">
             +{currentCorrection.toFixed(3)}°
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-20 p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10">
            <div className="flex justify-between items-center gap-4 text-[9px] text-white/70 font-mono">
              <label>Pressure (mb):</label>
              <input type="number" value={pressure} onChange={e => setPressure(Number(e.target.value))} className="w-14 bg-white/10 p-1 rounded border border-white/20 outline-none text-right" />
            </div>
            <div className="flex justify-between items-center gap-4 text-[9px] text-white/70 font-mono">
              <label>Temp (°C):</label>
              <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-14 bg-white/10 p-1 rounded border border-white/20 outline-none text-right" />
            </div>
          </div>
          <div className="absolute inset-0">
            {viewMode === 'chart' ? (
                <ResponsiveContainer width="99%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="hour" stroke="#555" fontSize={9} />
                  <YAxis stroke="#555" fontSize={9} domain={[0, 0.6]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                    itemStyle={{ color: '#10b981', fontSize: '10px' }}
                  />
                  <Line type="monotone" dataKey="correction" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
          ) : (
              <LightRaySimulation altitude={currentAltitude} correction={currentCorrection} />
          )}
          </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/50 font-mono shrink-0">
        <span className="flex items-center gap-2">
            <span className="opacity-70 uppercase tracking-wider">Current Total Correction:</span> 
            <strong className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">
                {(currentCorrection * 60).toFixed(2)} arcminutes
            </strong>
        </span>
        <span className="opacity-50">({currentCorrection.toFixed(3)}°)</span>
      </div>
    </div>
  );
});
