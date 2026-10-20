import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Watch, Sun, Moon, Sparkles, Activity, Shield, Zap,
  Compass, Eye, Volume2, VolumeX, Maximize2, Settings2, Sliders
} from 'lucide-react';

interface WristwatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  localCivilTime: Date;
  solarInfo: {
    altitude: number;
    azimuth: number;
    solarDate: Date;
    timezoneOffset: number;
    isDaylight: boolean;
    dayLength?: number;
    declination?: number;
    equationOfTime?: number;
    moonPhase?: number;
  } | null;
  effectiveCoords?: { latitude: number; longitude: number } | null;
  language: 'pt' | 'en';
  is24hFormat: boolean;
  onToggleFormat?: () => void;
}

export const WristwatchModal: React.FC<WristwatchModalProps> = ({
  isOpen,
  onClose,
  localCivilTime,
  solarInfo,
  effectiveCoords,
  language,
  is24hFormat,
  onToggleFormat,
}) => {
  // Customization state
  const [strapStyle, setStrapStyle] = useState<'leather' | 'steel' | 'sport' | 'gold'>('leather');
  const [caseFinish, setCaseFinish] = useState<'silver' | 'gold' | 'black' | 'titanium'>('silver');
  const [watchStyle, setWatchStyle] = useState<'hybrid' | 'chronograph' | 'solar'>('solar');
  const [showPulseAnimation, setShowPulseAnimation] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Time variables (localCivilTime encodes civil time in UTC components)
  const hours = localCivilTime.getUTCHours();
  const minutes = localCivilTime.getUTCMinutes();
  const seconds = localCivilTime.getUTCSeconds();
  const milliseconds = localCivilTime.getUTCMilliseconds();

  // Analog angles
  const secondDeg = ((seconds + milliseconds / 1000) / 60) * 360;
  const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = (((hours % 12) + minutes / 60) / 12) * 360;

  // Solar Light Intensity Calculations
  const alt = solarInfo ? solarInfo.altitude : 0;
  
  // Calculate Lux (Illuminance) approximation
  let lux = 0;
  let irradiance = 0; // W/m2
  let intensityPercent = 0; // 0 to 100%
  let skyPhaseLabel = '';
  let skyPhaseLabelEn = '';
  let uvIndex = 0;

  if (alt > 0) {
    const sinAlt = Math.sin((alt * Math.PI) / 180);
    irradiance = Math.round(1100 * Math.pow(sinAlt, 1.1));
    lux = Math.round(120000 * Math.pow(sinAlt, 1.25));
    intensityPercent = Math.min(100, Math.max(1, Math.round((sinAlt / Math.sin((85 * Math.PI) / 180)) * 100)));
    uvIndex = Math.min(12, Math.max(0, Math.round(11 * sinAlt)));

    if (alt > 50) {
      skyPhaseLabel = 'Pico Solar (Luz Máxima)';
      skyPhaseLabelEn = 'Solar Peak (Maximum Light)';
    } else if (alt > 20) {
      skyPhaseLabel = 'Luz Solar Plena (Dia)';
      skyPhaseLabelEn = 'Full Daylight';
    } else if (alt > 6) {
      skyPhaseLabel = 'Luz Solar Suave / Hora Dourada';
      skyPhaseLabelEn = 'Golden Hour / Soft Sun';
    } else {
      skyPhaseLabel = 'Alvorada / Crepúsculo Solar';
      skyPhaseLabelEn = 'Twilight Sun / Sunrise';
    }
  } else if (alt > -6) {
    // Civil Twilight
    const ratio = (alt + 6) / 6;
    lux = Math.round(3.4 + ratio * 350);
    irradiance = Math.round(ratio * 15);
    intensityPercent = Math.max(0.5, Math.round(ratio * 4));
    uvIndex = 0;
    skyPhaseLabel = 'Crepúsculo Civil (Luz Difusa)';
    skyPhaseLabelEn = 'Civil Twilight (Diffuse Light)';
  } else if (alt > -12) {
    // Nautical Twilight
    const ratio = (alt + 12) / 6;
    lux = Math.round(0.1 + ratio * 3.3);
    irradiance = Math.round(ratio * 2);
    intensityPercent = Math.max(0.1, Math.round(ratio * 1));
    uvIndex = 0;
    skyPhaseLabel = 'Crepúsculo Náutico (Luz Residual)';
    skyPhaseLabelEn = 'Nautical Twilight (Residual Light)';
  } else {
    // Night
    lux = 0.001;
    irradiance = 0;
    intensityPercent = 0;
    uvIndex = 0;
    skyPhaseLabel = 'Noite Estrelada (Sem Luz Solar Directa)';
    skyPhaseLabelEn = 'Starry Night (No Direct Sunlight)';
  }

  // Dynamic Background Sky Gradient based on Solar Altitude
  const getSkyBackground = () => {
    if (alt > 40) {
      return 'from-sky-500 via-blue-600 to-amber-950/80';
    } else if (alt > 15) {
      return 'from-sky-600 via-amber-600/70 to-slate-950';
    } else if (alt > 0) {
      return 'from-amber-500 via-rose-700 to-slate-950';
    } else if (alt > -6) {
      return 'from-indigo-800 via-purple-900 to-slate-950';
    } else if (alt > -12) {
      return 'from-blue-950 via-slate-900 to-black';
    } else {
      return 'from-slate-950 via-black to-slate-950';
    }
  };

  // Sound pulse effect on ticking seconds (if enabled)
  useEffect(() => {
    if (!soundEnabled || !isOpen) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(seconds % 2 === 0 ? 880 : 440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch {
      // AudioContext muted/unsupported
    }
  }, [seconds, soundEnabled, isOpen]);

  if (!isOpen) return null;

  // Format civil time string
  const formattedHours = is24hFormat 
    ? String(hours).padStart(2, '0') 
    : String(hours % 12 || 12).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  const dateStr = localCivilTime.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();

  // Strap classes
  const getStrapBg = () => {
    switch (strapStyle) {
      case 'leather':
        return 'bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950 border-amber-800/40';
      case 'steel':
        return 'bg-gradient-to-b from-slate-400 via-slate-200 to-slate-400 border-slate-300';
      case 'sport':
        return 'bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border-zinc-700';
      case 'gold':
        return 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 border-amber-300';
    }
  };

  // Case finish classes
  const getCaseBorder = () => {
    switch (caseFinish) {
      case 'silver':
        return 'border-slate-300/80 bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 shadow-[0_0_35px_rgba(255,255,255,0.15)]';
      case 'gold':
        return 'border-amber-400/90 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_35px_rgba(245,158,11,0.25)]';
      case 'black':
        return 'border-zinc-700 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-[0_0_35px_rgba(0,0,0,0.8)]';
      case 'titanium':
        return 'border-stone-400/80 bg-gradient-to-br from-stone-400 via-stone-600 to-zinc-800 shadow-[0_0_35px_rgba(168,162,158,0.2)]';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
      >
        {/* Dynamic Background Solar Sky Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${getSkyBackground()} opacity-60 transition-all duration-1000 pointer-events-none`} />

        {/* Sunlight Flare Visual FX when sun is above horizon */}
        {alt > 0 && (
          <div 
            className="absolute rounded-full pointer-events-none transition-all duration-1000 blur-3xl opacity-40"
            style={{
              top: `${Math.max(5, 50 - alt * 0.8)}%`,
              left: `${50 + Math.sin(((solarInfo?.azimuth || 180) * Math.PI) / 180) * 35}%`,
              width: `${Math.max(200, intensityPercent * 6)}px`,
              height: `${Math.max(200, intensityPercent * 6)}px`,
              background: alt > 30 
                ? 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(245,158,11,0.3) 50%, rgba(0,0,0,0) 80%)' 
                : 'radial-gradient(circle, rgba(249,115,22,0.8) 0%, rgba(225,29,72,0.3) 50%, rgba(0,0,0,0) 80%)'
            }}
          />
        )}

        {/* Main Modal Container */}
        <div className="relative w-full max-w-4xl bg-slate-950/90 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto backdrop-blur-2xl">
          
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-400">
                <Watch className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-extrabold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                  {language === 'pt' ? 'Relógio de Pulso Sazonal' : 'Seasonal Wristwatch'}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {language === 'pt' ? 'Hora Civil x Luz Solar' : 'Civil Time x Solar Light'}
                  </span>
                </h2>
                <p className="text-xs text-white/50">
                  {language === 'pt' 
                    ? 'Simulação visual de pulso com hora civil ativa e intensidade da radiação solar local' 
                    : 'Visual wrist simulation with active civil time & local solar irradiance level'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  soundEnabled 
                    ? 'bg-amber-400/20 border-amber-400/40 text-amber-300' 
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
                title={language === 'pt' ? 'Som do Tic-Tac' : 'Tick-Tock Sound'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Content Grid */}
          <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 items-center">

            {/* LEFT / TOP: Realistic Wrist & Watch Simulation Scene (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[380px] sm:min-h-[440px] p-4 bg-gradient-to-b from-black/50 via-slate-900/40 to-black/60 rounded-2xl border border-white/10 overflow-hidden">
              
              {/* Solar Light Intensity HUD Overlay inside Scene */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
                <div className="px-3 py-1.5 bg-black/70 border border-white/15 rounded-xl text-xs font-mono flex items-center gap-2 backdrop-blur-md">
                  <Sun className={`w-4 h-4 ${alt > 0 ? 'text-amber-400 animate-spin-slow' : 'text-indigo-400'}`} />
                  <div>
                    <span className="text-white/60 text-[9px] block uppercase font-sans font-semibold">
                      {language === 'pt' ? 'Luz Solar Local:' : 'Local Sunlight:'}
                    </span>
                    <span className="text-amber-300 font-extrabold text-xs">
                      {intensityPercent}% {language === 'pt' ? 'Intensidade' : 'Intensity'}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-black/70 border border-white/15 rounded-xl text-xs font-mono text-right backdrop-blur-md">
                  <span className="text-white/60 text-[9px] block uppercase font-sans font-semibold">
                    {language === 'pt' ? 'Iluminância / UV:' : 'Illuminance / UV:'}
                  </span>
                  <span className="text-white font-extrabold text-xs">
                    {lux >= 1000 ? `${(lux / 1000).toFixed(1)}k Lux` : `${lux.toFixed(1)} Lux`} • UV {uvIndex}
                  </span>
                </div>
              </div>

              {/* Biological Wrist Arm Background (Skin & Sleeve) */}
              <div className="relative w-full max-w-xs sm:max-w-sm flex flex-col items-center justify-center py-10">
                
                {/* Arm / Wrist Graphic (Vertical Arm Segment) */}
                <div className="absolute inset-y-0 w-32 sm:w-36 bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 rounded-full blur-sm opacity-60 pointer-events-none" />
                
                {/* Sleeve / Jacket Cuff (Top & Bottom) */}
                <div className="absolute -top-6 w-44 sm:w-48 h-16 bg-gradient-to-b from-slate-900 via-slate-800 to-zinc-900 rounded-b-2xl border-b border-white/10 shadow-lg z-0" />
                <div className="absolute -bottom-6 w-44 sm:w-48 h-16 bg-gradient-to-t from-slate-900 via-slate-800 to-zinc-900 rounded-t-2xl border-t border-white/10 shadow-lg z-0" />

                {/* Pulse Wave Animation radiating from Wrist */}
                {showPulseAnimation && (
                  <motion.div
                    animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-amber-400/30 pointer-events-none z-0"
                  />
                )}

                {/* WATCH STRAP (TOP) */}
                <div className={`w-24 sm:w-28 h-20 sm:h-24 rounded-t-xl border-x ${getStrapBg()} z-10 relative overflow-hidden shadow-inner`}>
                  <div className="absolute inset-0 bg-black/10" />
                  {/* Stitching lines for leather */}
                  {strapStyle === 'leather' && (
                    <div className="absolute inset-x-2 inset-y-0 border-x border-dashed border-amber-300/30" />
                  )}
                </div>

                {/* WATCH CASE (MAIN DIAL) */}
                <div className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full border-[8px] sm:border-[10px] ${getCaseBorder()} z-20 relative p-2 shadow-2xl flex items-center justify-center`}>
                  
                  {/* Outer Bezel Dial */}
                  <div className="w-full h-full rounded-full bg-slate-950 border border-white/20 p-2 relative flex items-center justify-center overflow-hidden shadow-inner">
                    
                    {/* Solar Sky Light Glow Inside Watch Face */}
                    <div 
                      className="absolute inset-0 transition-all duration-1000 opacity-25 pointer-events-none"
                      style={{
                        background: alt > 0 
                          ? `radial-gradient(circle at 50% 30%, rgba(245,158,11,${intensityPercent / 100}) 0%, rgba(0,0,0,0.9) 70%)`
                          : `radial-gradient(circle at 50% 30%, rgba(99,102,241,0.3) 0%, rgba(0,0,0,0.95) 70%)`
                      }}
                    />

                    {/* Dial Markers (12 hours) */}
                    {[...Array(12)].map((_, i) => {
                      const angle = i * 30;
                      return (
                        <div
                          key={`marker-${i}`}
                          className="absolute inset-0 flex items-start justify-center p-1.5"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          <div 
                            className={`rounded-full ${
                              i % 3 === 0 
                                ? 'w-1 h-3.5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                                : 'w-0.5 h-2 bg-white/40'
                            }`} 
                          />
                        </div>
                      );
                    })}

                    {/* Dial Numbers (12, 3, 6, 9) */}
                    <span className="absolute top-3 font-mono font-black text-[11px] text-amber-400">12</span>
                    <span className="absolute right-4 font-mono font-black text-[11px] text-amber-400">3</span>
                    <span className="absolute bottom-3 font-mono font-black text-[11px] text-amber-400">6</span>
                    <span className="absolute left-4 font-mono font-black text-[11px] text-amber-400">9</span>

                    {/* SUB-DIAL 1: Solar Altitude & Light % (Top Center) */}
                    <div className="absolute top-8 w-14 h-14 rounded-full border border-white/15 bg-black/60 flex flex-col items-center justify-center text-[8px] font-mono shadow-inner z-10">
                      <span className="text-white/50 text-[7px] leading-none">ALTITUDE</span>
                      <span className="text-amber-300 font-extrabold text-[9px]">
                        {alt > 0 ? `+${alt.toFixed(1)}°` : `${alt.toFixed(1)}°`}
                      </span>
                      <span className="text-white/40 text-[7px]">{intensityPercent}% LUX</span>
                    </div>

                    {/* SUB-DIAL 2: Digital Civil Time HUD (Center/Bottom) */}
                    <div className="absolute bottom-9 px-3 py-1 rounded-xl bg-black/80 border border-amber-400/30 flex flex-col items-center justify-center z-10 backdrop-blur-sm shadow-md">
                      <div className="flex items-baseline gap-1 font-mono font-black text-xs text-amber-300 tracking-wider">
                        <span>{formattedHours}:{formattedMinutes}</span>
                        <span className="text-[9px] text-amber-400/80">{formattedSeconds}</span>
                        {!is24hFormat && <span className="text-[7.5px] text-white/60">{ampm}</span>}
                      </div>
                      <span className="text-[7.5px] font-mono text-white/50 tracking-tight uppercase">
                        {dateStr}
                      </span>
                    </div>

                    {/* ANALOG HANDS */}
                    {/* Hour Hand */}
                    <div
                      className="absolute w-1.5 h-12 bg-white rounded-full origin-bottom z-20 shadow-md border border-black/40"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${hourDeg}deg)`
                      }}
                    />

                    {/* Minute Hand */}
                    <div
                      className="absolute w-1 h-18 bg-amber-300 rounded-full origin-bottom z-20 shadow-md border border-black/40"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${minuteDeg}deg)`
                      }}
                    />

                    {/* Second Hand (Ticking) */}
                    <div
                      className="absolute w-0.5 h-20 bg-rose-500 rounded-full origin-bottom z-30 shadow-lg"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${secondDeg}deg)`
                      }}
                    />

                    {/* Center Pin */}
                    <div className="absolute w-3.5 h-3.5 bg-amber-400 border-2 border-black rounded-full z-40 shadow-md" />

                  </div>
                </div>

                {/* WATCH STRAP (BOTTOM) */}
                <div className={`w-24 sm:w-28 h-20 sm:h-24 rounded-b-xl border-x ${getStrapBg()} z-10 relative overflow-hidden shadow-inner`}>
                  <div className="absolute inset-0 bg-black/10" />
                  {strapStyle === 'leather' && (
                    <div className="absolute inset-x-2 inset-y-0 border-x border-dashed border-amber-300/30" />
                  )}
                </div>

              </div>

              {/* Pulse & Solar Status Badge under Watch */}
              <div className="mt-2 flex items-center gap-2 z-20">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-[10px] font-mono text-amber-300">
                  <Activity className="w-3 h-3 text-rose-400 animate-pulse" />
                  <span>{language === 'pt' ? 'PULSO DE LUZ SOLAR:' : 'SOLAR PULSE:'}</span>
                  <span className="font-extrabold text-white">
                    {language === 'pt' ? skyPhaseLabel : skyPhaseLabelEn}
                  </span>
                </div>
              </div>

            </div>

            {/* RIGHT: Detailed Telemetry & Customization Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: Live Solar Irradiance Telemetry */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  {language === 'pt' ? 'Medição de Luz Solar no Local' : 'Local Solar Light Telemetry'}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-white/50 text-[9px] block uppercase">
                      {language === 'pt' ? 'Radiação Solar:' : 'Irradiance:'}
                    </span>
                    <span className="text-amber-300 font-extrabold text-sm">
                      {irradiance} W/m²
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-white/50 text-[9px] block uppercase">
                      {language === 'pt' ? 'Ângulo Elev. Sol:' : 'Solar Altitude:'}
                    </span>
                    <span className="text-amber-300 font-extrabold text-sm">
                      {alt.toFixed(2)}°
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-white/50 text-[9px] block uppercase">
                      {language === 'pt' ? 'Azimute Solar:' : 'Solar Azimuth:'}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {solarInfo?.azimuth ? `${solarInfo.azimuth.toFixed(1)}°` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10">
                    <span className="text-white/50 text-[9px] block uppercase">
                      {language === 'pt' ? 'Estado da Luz:' : 'Daylight Status:'}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {solarInfo?.isDaylight ? (language === 'pt' ? '☀️ Dia' : '☀️ Day') : (language === 'pt' ? '🌙 Noite' : '🌙 Night')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar for Light Intensity */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-white/60">
                    <span>{language === 'pt' ? 'Intensidade de Luz Solar:' : 'Sunlight Intensity:'}</span>
                    <span className="text-amber-400 font-bold">{intensityPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full border border-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-amber-400 to-amber-300 transition-all duration-500 rounded-full"
                      style={{ width: `${intensityPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Customization Options (Watch Strap & Case) */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Sliders className="w-3.5 h-3.5" />
                  {language === 'pt' ? 'Personalizar Relógio de Pulso' : 'Customize Wristwatch'}
                </h3>

                {/* Strap Selector */}
                <div className="space-y-1">
                  <span className="text-[9.5px] text-white/50 uppercase font-mono block">
                    {language === 'pt' ? 'Material da Pulseira:' : 'Strap Material:'}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'leather', namePt: 'Couro', nameEn: 'Leather' },
                      { id: 'steel', namePt: 'Aço', nameEn: 'Steel' },
                      { id: 'sport', namePt: 'Silicone', nameEn: 'Sport' },
                      { id: 'gold', namePt: 'Ouro', nameEn: 'Gold' },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setStrapStyle(st.id as typeof strapStyle)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                          strapStyle === st.id
                            ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                            : 'bg-black/30 text-white/70 border-white/10 hover:text-white'
                        }`}
                      >
                        {language === 'pt' ? st.namePt : st.nameEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Case Finish Selector */}
                <div className="space-y-1">
                  <span className="text-[9.5px] text-white/50 uppercase font-mono block">
                    {language === 'pt' ? 'Acabamento da Caixa:' : 'Case Finish:'}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'silver', namePt: 'Prata', nameEn: 'Silver' },
                      { id: 'gold', namePt: 'Dourado', nameEn: 'Gold' },
                      { id: 'black', namePt: 'Preto', nameEn: 'Black' },
                      { id: 'titanium', namePt: 'Titânio', nameEn: 'Titanium' },
                    ].map(cs => (
                      <button
                        key={cs.id}
                        onClick={() => setCaseFinish(cs.id as typeof caseFinish)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                          caseFinish === cs.id
                            ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                            : 'bg-black/30 text-white/70 border-white/10 hover:text-white'
                        }`}
                      >
                        {language === 'pt' ? cs.namePt : cs.nameEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-white/70">
                    {language === 'pt' ? 'Efeito Pulsar da Vida:' : 'Wrist Pulse Glow:'}
                  </span>
                  <button
                    onClick={() => setShowPulseAnimation(!showPulseAnimation)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      showPulseAnimation 
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                        : 'bg-black/30 text-white/40 border-white/10'
                    }`}
                  >
                    {showPulseAnimation ? (language === 'pt' ? 'ATIVADO' : 'ON') : (language === 'pt' ? 'DESATIVADO' : 'OFF')}
                  </button>
                </div>

                {onToggleFormat && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">
                      {language === 'pt' ? 'Formato do Display:' : 'Display Format:'}
                    </span>
                    <button
                      onClick={onToggleFormat}
                      className="px-3 py-1 rounded-xl text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition-all cursor-pointer"
                    >
                      {is24hFormat ? '24H' : '12H (AM/PM)'}
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between z-10 text-[10px] font-mono text-white/50">
            <span>
              {language === 'pt' ? 'Relógio de Pulso com Calibração Solar Ativa' : 'Wristwatch Calibrated with Active Solar Light'}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl transition-all cursor-pointer shadow-md uppercase"
            >
              {language === 'pt' ? 'Fechar' : 'Close'}
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
