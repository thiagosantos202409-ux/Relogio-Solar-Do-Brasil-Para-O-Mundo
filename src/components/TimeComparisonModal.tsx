import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Sun, 
  Moon, 
  MapPin, 
  Clock, 
  Calendar, 
  Layers, 
  Eye, 
  Compass, 
  Sparkles, 
  Search, 
  Send, 
  MessageSquare, 
  Maximize2, 
  Minimize2, 
  X, 
  RotateCcw, 
  RefreshCw, 
  ArrowRight, 
  Sliders, 
  Share2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Tv, 
  ExternalLink,
  Navigation,
  Crosshair,
  Volume2
} from 'lucide-react';
import { calculateSolarTime, SolarTimeResult } from '../lib/solarTime';
import { sendTimeComparisonQuery, ComparisonScreenState } from '../services/timeComparisonService';
import { FEATURED_LOCATIONS } from '../constants';
import { formatLatitude, formatLongitude, formatSignedLatitude, formatSignedLongitude, formatCoordinatePair } from '../lib/coordinateParser';

interface TimeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'pt' | 'en' | string;
  currentDate: Date;
  userCoords: { latitude: number; longitude: number };
  locationName: string;
  timezoneOffset?: number;
}

// Continent vector paths for high performance 3D orthographic sphere projection
const CONTINENTS_COORDS: [number, number][][] = [
  // North America
  [[70, -165], [72, -140], [70, -110], [68, -85], [62, -75], [55, -60], [47, -52], [42, -70], [30, -80], [25, -80], [25, -97], [18, -94], [14, -90], [8, -78], [15, -92], [20, -105], [32, -117], [38, -123], [48, -125], [58, -137], [60, -148], [65, -168], [70, -165]],
  // South America
  [[12, -73], [10, -62], [6, -52], [-3, -37], [-8, -35], [-18, -39], [-23, -42], [-34, -53], [-45, -65], [-55, -67], [-54, -72], [-46, -75], [-35, -73], [-18, -71], [-5, -81], [2, -79], [8, -77], [12, -73]],
  // Africa
  [[37, -6], [37, 10], [33, 35], [30, 32], [22, 37], [12, 44], [11, 51], [2, 45], [-10, 40], [-25, 33], [-34, 26], [-34, 18], [-22, 14], [-12, 13], [5, 9], [4, -7], [10, -14], [15, -17], [21, -17], [32, -9], [35, -6], [37, -6]],
  // Eurasia
  [[36, -9], [43, -9], [48, -4], [52, 2], [58, 6], [62, 5], [70, 20], [71, 28], [70, 60], [73, 80], [76, 110], [72, 130], [70, 160], [66, 170], [60, 163], [55, 135], [43, 131], [38, 118], [30, 122], [22, 114], [21, 108], [10, 104], [1, 104], [6, 100], [16, 96], [22, 91], [20, 73], [25, 62], [12, 44], [22, 37], [30, 32], [31, 35], [36, 36], [41, 29], [46, 38], [42, 28], [38, 24], [40, 18], [45, 13], [44, 8], [43, 3], [36, -9]],
  // Australia
  [[-12, 131], [-12, 142], [-15, 145], [-25, 153], [-37, 150], [-38, 140], [-35, 137], [-32, 115], [-22, 114], [-15, 124], [-12, 131]],
  // Antarctica
  [[-65, -180], [-65, -120], [-68, -60], [-65, 0], [-65, 60], [-66, 120], [-65, 180]]
];

// Orthographic 3D projection math
function projectTo3D(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; visible: boolean; depth: number } {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const phi0 = (centerLat * Math.PI) / 180;
  const lambda0 = (centerLon * Math.PI) / 180;

  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);
  const visible = cosC >= 0;

  const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
  const y = cy - radius * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

  return { x, y, visible, depth: cosC };
}

// Great circle angular distance in degrees
function angularDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLon1 = (lon1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const rLon2 = (lon2 * Math.PI) / 180;
  const dLat = rLat2 - rLat1;
  const dLon = rLon2 - rLon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))) * (180 / Math.PI);
}

export const TimeComparisonModal: React.FC<TimeComparisonModalProps> = ({
  isOpen,
  onClose,
  language = 'pt',
  currentDate,
  userCoords,
  locationName,
  timezoneOffset = 0
}) => {
  const isPt = language === 'pt';

  // 5 Screens State
  // 1: Top-Left (Canto Superior Esquerdo)
  // 2: Top-Right (Canto Superior Direito)
  // 3: Bottom-Left (Canto Inferior Esquerdo)
  // 4: Bottom-Right (Canto Inferior Direito)
  // 5: Center (Centro / Meio)
  const [centerMode, setCenterMode] = useState<'subsolar' | 'device'>('subsolar');
  const [expandedScreen, setExpandedScreen] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: any[] }>>([
    {
      role: 'assistant',
      text: isPt
        ? "👋 **Olá! Bem-vindo ao Comparador de Tempo (5 Telas).**\n\n- **Tela 1 (Sup. Esquerdo), Tela 2 (Sup. Direito), Tela 3 (Inf. Esquerdo), Tela 4 (Inf. Direito):** Podem comparar qualquer data, hora ou local.\n- **Tela 5 (Centro):** Permite alternar entre o **Ponto Subsolar (Globo 3D)** ou o **Modo Device (Rua Solar)**, escolher a data comparativa e ajustar a câmera (Focar Sol, Focar Local ou Órbita Livre).\n- Pergunte-me qualquer comparação solar ou use a busca na web (ex: *Que horas são em Tóquio segundo o site timeanddate?*)."
        : "👋 **Hello! Welcome to the 5-Screen Time Comparison Workspace.**\n\n- **Screen 1 (Top-Left), Screen 2 (Top-Right), Screen 3 (Bottom-Left), Screen 4 (Bottom-Right):** Compare any date, time, or location.\n- **Screen 5 (Center Hub):** Toggle between **Subsolar Point (3D Globe)** or **Device Mode (Solar Street)**, pick comparative dates, and control the camera (Focus Sun, Focus Location, or Free Orbit).\n- Ask any solar comparison question or search live facts!"
    }
  ]);

  // Initializing the 5 Screen configs
  const [screensConfig, setScreensConfig] = useState<Array<{
    id: number;
    labelPt: string;
    labelEn: string;
    date: Date;
    locationName: string;
    lat: number;
    lon: number;
    focusTarget: 'sun' | 'location' | 'free';
    cameraCenterLat: number;
    cameraCenterLon: number;
  }>>(() => {
    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();
    const curDay = currentDate.getDate();
    const curHour = currentDate.getHours();
    const curMin = currentDate.getMinutes();

    return [
      // Tela 1: Top-Left (Equinócio de Outono / Março)
      {
        id: 1,
        labelPt: "Tela 1 • Canto Superior Esquerdo",
        labelEn: "Screen 1 • Top-Left",
        date: new Date(Date.UTC(curYear, 2, 20, 12, 0, 0)), // 20 Mar 12:00 UTC
        locationName: locationName || "São Paulo, Brasil",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
        focusTarget: 'sun',
        cameraCenterLat: 0,
        cameraCenterLon: 0
      },
      // Tela 2: Top-Right (Solstício de Inverno / Junho)
      {
        id: 2,
        labelPt: "Tela 2 • Canto Superior Direito",
        labelEn: "Screen 2 • Top-Right",
        date: new Date(Date.UTC(curYear, 5, 21, 12, 0, 0)), // 21 Jun 12:00 UTC
        locationName: locationName || "São Paulo, Brasil",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
        focusTarget: 'sun',
        cameraCenterLat: 23.4,
        cameraCenterLon: 0
      },
      // Tela 3: Bottom-Left (Equinócio de Primavera / Setembro)
      {
        id: 3,
        labelPt: "Tela 3 • Canto Inferior Esquerdo",
        labelEn: "Screen 3 • Bottom-Left",
        date: new Date(Date.UTC(curYear, 8, 22, 12, 0, 0)), // 22 Set 12:00 UTC
        locationName: locationName || "São Paulo, Brasil",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
        focusTarget: 'sun',
        cameraCenterLat: 0,
        cameraCenterLon: 0
      },
      // Tela 4: Bottom-Right (Solstício de Verão / Dezembro)
      {
        id: 4,
        labelPt: "Tela 4 • Canto Inferior Direito",
        labelEn: "Screen 4 • Bottom-Right",
        date: new Date(Date.UTC(curYear, 11, 21, 12, 0, 0)), // 21 Dez 12:00 UTC
        locationName: locationName || "São Paulo, Brasil",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
        focusTarget: 'sun',
        cameraCenterLat: -23.4,
        cameraCenterLon: 0
      },
      // Tela 5: Center (Centro / Meio - Data Atual / Ponto de Referência)
      {
        id: 5,
        labelPt: "Tela 5 • Centro (Referência & Modos)",
        labelEn: "Screen 5 • Center Hub (Modes & Reference)",
        date: new Date(currentDate),
        locationName: locationName || "São Paulo, Brasil",
        lat: userCoords.latitude,
        lon: userCoords.longitude,
        focusTarget: 'location',
        cameraCenterLat: userCoords.latitude,
        cameraCenterLon: userCoords.longitude
      }
    ];
  });

  // Calculate dynamic solar state for all 5 screens
  const calculatedScreens: ComparisonScreenState[] = useMemo(() => {
    return screensConfig.map((s) => {
      const solarInfo = calculateSolarTime(s.date, s.lon, s.lat, timezoneOffset);
      const subsolarLat = solarInfo.declination;
      const subsolarLon = solarInfo.subsolarLongitude;
      const d = s.date;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');

      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timeStr = `${hh}:${min}:${ss}`;

      const solarHours = solarInfo.solarDate.getUTCHours();
      const solarMinutes = solarInfo.solarDate.getUTCMinutes();
      const solarSeconds = solarInfo.solarDate.getUTCSeconds();
      const solarTimeStr = `${String(solarHours).padStart(2, '0')}:${String(solarMinutes).padStart(2, '0')}:${String(solarSeconds).padStart(2, '0')}`;

      const solarNoonDate = solarInfo.eventTimes.solarNoon;
      const solarNoonStr = solarNoonDate
        ? `${String(solarNoonDate.getHours()).padStart(2, '0')}:${String(solarNoonDate.getMinutes()).padStart(2, '0')}`
        : "--:--";

      return {
        id: s.id,
        label: isPt ? s.labelPt : s.labelEn,
        name: s.locationName,
        date: s.date,
        dateStr,
        timeStr,
        latitude: s.lat,
        longitude: s.lon,
        locationName: s.locationName,
        subsolarLat,
        subsolarLon,
        solarAltitude: solarInfo.altitude,
        solarAzimuth: solarInfo.azimuth,
        solarNoonStr,
        dayLengthMinutes: Math.round(solarInfo.sunlightDurationSeconds / 60),
        solarTimeStr,
        civilTimeStr: timeStr,
        focusTarget: s.focusTarget,
        cameraAngle: {
          lat: s.cameraCenterLat,
          lon: s.cameraCenterLon,
          zoom: 1
        }
      };
    });
  }, [screensConfig, timezoneOffset, isPt]);

  // Update a single screen config
  const updateScreenConfig = useCallback((id: number, updater: Partial<(typeof screensConfig)[0]>) => {
    setScreensConfig(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updater };
      
      // If focus target changed to 'sun', automatically point camera center to subsolar point
      if (updater.focusTarget === 'sun') {
        const sol = calculateSolarTime(updated.date, updated.lon, updated.lat, timezoneOffset);
        updated.cameraCenterLat = sol.declination;
        updated.cameraCenterLon = sol.subsolarLongitude;
      } else if (updater.focusTarget === 'location') {
        updated.cameraCenterLat = updated.lat;
        updated.cameraCenterLon = updated.lon;
      }
      return updated;
    }));
  }, [timezoneOffset]);

  // Apply Presets to screens 1, 2, 3, 4
  const applyPreset = useCallback((presetType: 'seasons' | 'hours24' | 'years' | 'cities') => {
    const curYear = screensConfig[4].date.getFullYear();
    const curLat = screensConfig[4].lat;
    const curLon = screensConfig[4].lon;
    const curLoc = screensConfig[4].locationName;

    if (presetType === 'seasons') {
      // 4 Solstices & Equinoxes
      updateScreenConfig(1, { date: new Date(Date.UTC(curYear, 2, 20, 12, 0)), focusTarget: 'sun' });
      updateScreenConfig(2, { date: new Date(Date.UTC(curYear, 5, 21, 12, 0)), focusTarget: 'sun' });
      updateScreenConfig(3, { date: new Date(Date.UTC(curYear, 8, 22, 12, 0)), focusTarget: 'sun' });
      updateScreenConfig(4, { date: new Date(Date.UTC(curYear, 11, 21, 12, 0)), focusTarget: 'sun' });
    } else if (presetType === 'hours24') {
      // 4 Times of day (Dawn 06:00, Noon 12:00, Sunset 18:00, Midnight 00:00)
      const baseDate = screensConfig[4].date;
      updateScreenConfig(1, { date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 6, 0) });
      updateScreenConfig(2, { date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0) });
      updateScreenConfig(3, { date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 18, 0) });
      updateScreenConfig(4, { date: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0) });
    } else if (presetType === 'years') {
      // Historical & Future Years (1900, 2000, 2026, 2050)
      const d = screensConfig[4].date;
      updateScreenConfig(1, { date: new Date(1900, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) });
      updateScreenConfig(2, { date: new Date(2000, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) });
      updateScreenConfig(3, { date: new Date(2026, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) });
      updateScreenConfig(4, { date: new Date(2050, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) });
    } else if (presetType === 'cities') {
      // 4 Global Capitals: Tokyo, London, New York, Brasília
      const now = new Date();
      updateScreenConfig(1, { locationName: "Tóquio, Japão", lat: 35.6762, lon: 139.6503, date: now, focusTarget: 'location' });
      updateScreenConfig(2, { locationName: "Londres, Reino Unido", lat: 51.5074, lon: -0.1278, date: now, focusTarget: 'location' });
      updateScreenConfig(3, { locationName: "Nova York, EUA", lat: 40.7128, lon: -74.0060, date: now, focusTarget: 'location' });
      updateScreenConfig(4, { locationName: "Brasília, Brasil", lat: -15.7975, lon: -47.8919, date: now, focusTarget: 'location' });
    }
  }, [screensConfig, updateScreenConfig]);

  // Handle AI Chat Query
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const newMsgs = [...chatMessages, { role: 'user' as const, text: textToSend }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await sendTimeComparisonQuery(
        newMsgs.map(m => ({ role: m.role, text: m.text })),
        calculatedScreens,
        centerMode,
        language
      );

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          sources: res.sources
        }
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: isPt ? "Erro ao processar sua pergunta. Verifique a conexão com o servidor." : "Error processing query. Please check connection."
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-[98vw] max-h-[96vh] bg-[#0c1017] border border-amber-400/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        
        {/* TOP BAR / HEADER */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-white/[0.03] to-amber-500/10 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-400/20 border border-amber-400/40 rounded-xl text-amber-300 shadow-md shadow-amber-500/20">
              <Tv className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                  {isPt ? 'Comparação De Tempo (5 Telas)' : 'Time Comparison (5 Screens)'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  {centerMode === 'subsolar' 
                    ? (isPt ? 'Modo Ponto Subsolar' : 'Subsolar Point Mode') 
                    : (isPt ? 'Modo Device Rua Solar' : 'Device Solar Street Mode')}
                </span>
              </div>
              <p className="text-[11px] text-white/50 hidden md:block">
                {isPt 
                  ? 'Simulador comparativo simultâneo de iluminação planetária, declinação solar e ângulos de zênite.' 
                  : 'Simultaneous comparative simulator of planetary daylight, solar declination, and zenith angles.'}
              </p>
            </div>
          </div>

          {/* QUICK PRESETS & TOOLBAR */}
          <div className="flex items-center gap-2">
            {/* Presets dropdown */}
            <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => applyPreset('seasons')}
                className="px-2 py-1 rounded hover:bg-amber-400/20 text-white/80 hover:text-amber-300 transition-colors"
                title={isPt ? 'Equinócios & Solstícios' : 'Equinoxes & Solstices'}
              >
                🌱❄️ {isPt ? 'Estações' : 'Seasons'}
              </button>
              <button
                onClick={() => applyPreset('hours24')}
                className="px-2 py-1 rounded hover:bg-amber-400/20 text-white/80 hover:text-amber-300 transition-colors"
                title={isPt ? 'Ciclo de 24h (06h, 12h, 18h, 00h)' : '24h Cycle (06h, 12h, 18h, 00h)'}
              >
                🕒 24h
              </button>
              <button
                onClick={() => applyPreset('cities')}
                className="px-2 py-1 rounded hover:bg-amber-400/20 text-white/80 hover:text-amber-300 transition-colors"
                title={isPt ? '4 Capitais (Tóquio, Londres, NY, Brasília)' : '4 Global Capitals'}
              >
                🏙️ {isPt ? 'Cidades' : 'Cities'}
              </button>
              <button
                onClick={() => applyPreset('years')}
                className="px-2 py-1 rounded hover:bg-amber-400/20 text-white/80 hover:text-amber-300 transition-colors"
                title={isPt ? 'Comparações de Anos' : 'Multi-Year Comparison'}
              >
                ⏳ {isPt ? 'Anos' : 'Years'}
              </button>
            </div>

            {/* Chat Toggle Button */}
            <button
              onClick={() => setChatOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                chatOpen 
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300 shadow-sm' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isPt ? 'Chat Solar IA' : 'AI Solar Chat'}</span>
              {chatOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP COLLAPSIBLE AI CHAT PANEL WITH GOOGLE SEARCH GROUNDING */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/10 bg-gradient-to-b from-[#111827] to-[#0d131f] overflow-hidden shrink-0"
            >
              <div className="p-3 max-w-7xl mx-auto flex flex-col gap-2">
                {/* Chat suggestions chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  <span className="text-white/40 flex items-center gap-1 text-[10px] uppercase font-bold shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" /> {isPt ? 'Perguntas Rápidas:' : 'Quick Questions:'}
                  </span>
                  <button
                    onClick={() => handleSendMessage("Que horas são em Tóquio segundo o site timeanddate?")}
                    className="px-2.5 py-0.5 rounded-full bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 shrink-0 transition-colors"
                  >
                    🔍 {isPt ? 'Que horas são em Tóquio segundo o timeanddate?' : 'What time in Tokyo per timeanddate?'}
                  </button>
                  <button
                    onClick={() => handleSendMessage(isPt ? "Compare a altitude do sol e iluminação entre as 4 telas periféricas." : "Compare solar altitude and lighting among the 4 peripheral screens.")}
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 shrink-0 transition-colors"
                  >
                    ☀️ {isPt ? 'Comparar altitude solar nas 4 telas' : 'Compare solar altitude in 4 screens'}
                  </button>
                  <button
                    onClick={() => handleSendMessage(isPt ? "Onde incide o Ponto Subsolar (90°) na data da Tela Central?" : "Where does the Subsolar Point strike at 90° on the center date?")}
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 shrink-0 transition-colors"
                  >
                    🪐 {isPt ? 'Explicar o Ponto Subsolar central' : 'Explain Center Subsolar Point'}
                  </button>
                  <button
                    onClick={() => handleSendMessage(isPt ? "Como a rotação de 15° por hora altera a hora solar em relação à civil?" : "How does 15°/hr rotation change solar time vs civil time?")}
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 shrink-0 transition-colors"
                  >
                    📐 {isPt ? 'Hora Solar vs Hora Civil' : 'Solar vs Civil Time'}
                  </button>
                </div>

                {/* Last chat message bubble */}
                <div className="max-h-28 overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white/90 space-y-2">
                  {chatMessages.slice(-3).map((msg, idx) => (
                    <div key={`tc-msg-${idx}-${msg.role}`} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-1.5 rounded-xl max-w-[90%] whitespace-pre-line ${
                        msg.role === 'user' 
                          ? 'bg-amber-400/20 border border-amber-400/30 text-amber-200' 
                          : 'bg-white/5 border border-white/10 text-white/90'
                      }`}>
                        {msg.text}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-1 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] text-white/40">Fontes Web:</span>
                            {msg.sources.map((s: any, sIdx: number) => (
                              <a
                                key={`tc-src-${idx}-${sIdx}-${s.uri || ''}`}
                                href={s.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-white/10 hover:bg-amber-400/20 text-amber-300 rounded underline"
                              >
                                {s.title || s.uri} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-amber-300 text-xs animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>{isPt ? 'Consultando inteligência solar & fontes web...' : 'Querying solar AI & web sources...'}</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={isPt ? "Converse sobre a comparação solar, datas, fusos ou pesquise na web..." : "Ask about solar comparison, dates, or search live web..."}
                      className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPt ? 'Perguntar' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5-SCREENS WORKSPACE GRID */}
        <div className="flex-1 p-2 md:p-3 overflow-y-auto grid grid-cols-1 md:grid-cols-3 grid-rows-auto md:grid-rows-2 gap-2.5">
          
          {/* TELA 1: Canto Superior Esquerdo (Top-Left) */}
          <ScreenCard
            screen={calculatedScreens[0]}
            isCenter={false}
            isExpanded={expandedScreen === 1}
            onToggleExpand={() => setExpandedScreen(prev => prev === 1 ? null : 1)}
            onUpdateDate={(newDate) => updateScreenConfig(1, { date: newDate })}
            onUpdateFocus={(focus) => updateScreenConfig(1, { focusTarget: focus })}
            onUpdateLocation={(loc) => updateScreenConfig(1, { locationName: loc.name, lat: loc.latitude, lon: loc.longitude })}
            onUpdateCameraCenter={(lat, lon) => updateScreenConfig(1, { cameraCenterLat: lat, cameraCenterLon: lon })}
            isPt={isPt}
            centerScreen={calculatedScreens[4]}
          />

          {/* TELA 5: CENTRO / MEIO (Hero Center Hub with Mode Selector, Date picker & Focus Controls) */}
          <div className="md:col-start-2 md:row-start-1 md:row-span-2 flex flex-col bg-gradient-to-b from-amber-500/[0.08] via-white/[0.02] to-amber-500/[0.05] border-2 border-amber-400/40 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Center Header with Mode Switcher */}
            <div className="p-2.5 bg-amber-400/10 border-b border-amber-400/20 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    {isPt ? 'Tela 5 • Centro (Hub Comparativo)' : 'Screen 5 • Center Hub'}
                  </span>
                </div>

                {/* Mode Selector: Ponto Subsolar vs Device Rua Solar */}
                <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setCenterMode('subsolar')}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                      centerMode === 'subsolar' 
                        ? 'bg-amber-400 text-black shadow-md' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{isPt ? 'Ponto Subsolar' : 'Subsolar Point'}</span>
                  </button>
                  <button
                    onClick={() => setCenterMode('device')}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                      centerMode === 'device' 
                        ? 'bg-amber-400 text-black shadow-md' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{isPt ? 'Device (Rua Solar)' : 'Device Mode'}</span>
                  </button>
                </div>
              </div>

              {/* Date & Time Selector for Center Hub */}
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-xl border border-white/10 text-xs">
                <div>
                  <label className="text-[10px] text-white/50 block font-semibold mb-0.5">
                    📅 {isPt ? 'Data Comparativa (DD/MM/AAAA):' : 'Comparative Date (DD/MM/YYYY):'}
                  </label>
                  <input
                    type="date"
                    value={calculatedScreens[4].dateStr}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      const cur = screensConfig[4].date;
                      const newD = new Date(cur);
                      newD.setFullYear(y, m - 1, d);
                      updateScreenConfig(5, { date: newD });
                    }}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block font-semibold mb-0.5">
                    ⏰ {isPt ? 'Hora Comparativa (HH:MM:SS):' : 'Comparative Time (HH:MM:SS):'}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={calculatedScreens[4].timeStr}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [h, m, s] = e.target.value.split(':').map(Number);
                      const cur = screensConfig[4].date;
                      const newD = new Date(cur);
                      newD.setHours(h || 0, m || 0, s || 0);
                      updateScreenConfig(5, { date: newD });
                    }}
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Camera / Focus Mode Buttons for Center Hub */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-white/50 font-bold uppercase">
                  🎥 {isPt ? 'Controle de Câmera:' : 'Camera Controls:'}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateScreenConfig(5, { focusTarget: 'sun' })}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                      screensConfig[4].focusTarget === 'sun'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>{isPt ? 'Focar o Sol' : 'Focus Sun'}</span>
                  </button>
                  <button
                    onClick={() => updateScreenConfig(5, { focusTarget: 'location' })}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                      screensConfig[4].focusTarget === 'location'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{isPt ? 'Focar Local' : 'Focus Location'}</span>
                  </button>
                  <button
                    onClick={() => updateScreenConfig(5, { focusTarget: 'free' })}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                      screensConfig[4].focusTarget === 'free'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Compass className="w-3 h-3 text-sky-400" />
                    <span>{isPt ? 'Órbita Livre' : 'Free Orbit'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Center Canvas / Render View */}
            <div className="flex-1 relative flex items-center justify-center p-2 min-h-[220px]">
              {centerMode === 'subsolar' ? (
                <Interactive3DGlobe
                  screen={calculatedScreens[4]}
                  onRotate={(dLat, dLon) => {
                    const cur = screensConfig[4];
                    updateScreenConfig(5, {
                      cameraCenterLat: Math.max(-85, Math.min(85, cur.cameraCenterLat + dLat)),
                      cameraCenterLon: (cur.cameraCenterLon + dLon + 360) % 360,
                      focusTarget: 'free'
                    });
                  }}
                  isPt={isPt}
                />
              ) : (
                <DeviceRuaSolarView
                  screen={calculatedScreens[4]}
                  isPt={isPt}
                />
              )}
            </div>

            {/* Center Solar Telemetry HUD */}
            <div className="p-2.5 bg-black/60 border-t border-amber-400/20 text-xs grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/40 block">{isPt ? 'Ponto Subsolar (90°)' : 'Subsolar Point (90°)'}</span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {formatCoordinatePair(calculatedScreens[4].subsolarLat, calculatedScreens[4].subsolarLon, 2, true)}
                </span>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/40 block">{isPt ? 'Altitude Solar' : 'Solar Altitude'}</span>
                <span className={`font-mono font-bold text-xs ${calculatedScreens[4].solarAltitude > 0 ? 'text-amber-300' : 'text-indigo-400'}`}>
                  {calculatedScreens[4].solarAltitude.toFixed(1)}°
                </span>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/40 block">{isPt ? 'Horário Solar' : 'True Solar Time'}</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {calculatedScreens[4].solarTimeStr}
                </span>
              </div>
            </div>
          </div>

          {/* TELA 2: Canto Superior Direito (Top-Right) */}
          <ScreenCard
            screen={calculatedScreens[1]}
            isCenter={false}
            isExpanded={expandedScreen === 2}
            onToggleExpand={() => setExpandedScreen(prev => prev === 2 ? null : 2)}
            onUpdateDate={(newDate) => updateScreenConfig(2, { date: newDate })}
            onUpdateFocus={(focus) => updateScreenConfig(2, { focusTarget: focus })}
            onUpdateLocation={(loc) => updateScreenConfig(2, { locationName: loc.name, lat: loc.latitude, lon: loc.longitude })}
            onUpdateCameraCenter={(lat, lon) => updateScreenConfig(2, { cameraCenterLat: lat, cameraCenterLon: lon })}
            isPt={isPt}
            centerScreen={calculatedScreens[4]}
          />

          {/* TELA 3: Canto Inferior Esquerdo (Bottom-Left) */}
          <ScreenCard
            screen={calculatedScreens[2]}
            isCenter={false}
            isExpanded={expandedScreen === 3}
            onToggleExpand={() => setExpandedScreen(prev => prev === 3 ? null : 3)}
            onUpdateDate={(newDate) => updateScreenConfig(3, { date: newDate })}
            onUpdateFocus={(focus) => updateScreenConfig(3, { focusTarget: focus })}
            onUpdateLocation={(loc) => updateScreenConfig(3, { locationName: loc.name, lat: loc.latitude, lon: loc.longitude })}
            onUpdateCameraCenter={(lat, lon) => updateScreenConfig(3, { cameraCenterLat: lat, cameraCenterLon: lon })}
            isPt={isPt}
            centerScreen={calculatedScreens[4]}
          />

          {/* TELA 4: Canto Inferior Direito (Bottom-Right) */}
          <ScreenCard
            screen={calculatedScreens[3]}
            isCenter={false}
            isExpanded={expandedScreen === 4}
            onToggleExpand={() => setExpandedScreen(prev => prev === 4 ? null : 4)}
            onUpdateDate={(newDate) => updateScreenConfig(4, { date: newDate })}
            onUpdateFocus={(focus) => updateScreenConfig(4, { focusTarget: focus })}
            onUpdateLocation={(loc) => updateScreenConfig(4, { locationName: loc.name, lat: loc.latitude, lon: loc.longitude })}
            onUpdateCameraCenter={(lat, lon) => updateScreenConfig(4, { cameraCenterLat: lat, cameraCenterLon: lon })}
            isPt={isPt}
            centerScreen={calculatedScreens[4]}
          />

        </div>

        {/* BOTTOM FOOTER STATUS */}
        <div className="px-4 py-2 bg-[#090d14] border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              ⭐ {isPt ? 'Ponto Subsolar (Sol a 90° no Zênite)' : 'Subsolar Point (Sun at 90° Zenith)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              📍 {isPt ? 'Local Observado' : 'Observer Location'}
            </span>
          </div>
          <div>
            <span>Solaris Clock Ultra • {isPt ? 'Mecânica Orbital Terrestre 5 Telas' : '5-Screen Earth Orbital Engine'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: PERIPHERAL SCREEN CARD
// ==========================================
interface ScreenCardProps {
  screen: ComparisonScreenState;
  isCenter: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateDate: (date: Date) => void;
  onUpdateFocus: (focus: 'sun' | 'location' | 'free') => void;
  onUpdateLocation: (loc: { name: string; latitude: number; longitude: number }) => void;
  onUpdateCameraCenter: (lat: number, lon: number) => void;
  isPt: boolean;
  centerScreen: ComparisonScreenState;
}

const ScreenCard: React.FC<ScreenCardProps> = ({
  screen,
  isExpanded,
  onToggleExpand,
  onUpdateDate,
  onUpdateFocus,
  onUpdateLocation,
  onUpdateCameraCenter,
  isPt,
  centerScreen
}) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Difference vs Center Screen
  const altDiff = screen.solarAltitude - centerScreen.solarAltitude;
  const dayLengthDiffHours = (screen.dayLengthMinutes - centerScreen.dayLengthMinutes) / 60;

  return (
    <div className={`flex flex-col bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden relative shadow-lg transition-all ${
      isExpanded ? 'fixed inset-4 z-50 bg-[#0c1017] border-amber-400/50' : ''
    }`}>
      {/* Screen Header */}
      <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white tracking-wide">
            {screen.label}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
            {screen.dateStr}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Focus Toggle */}
          <button
            onClick={() => onUpdateFocus(screen.focusTarget === 'sun' ? 'location' : 'sun')}
            className="p-1 rounded hover:bg-white/10 text-amber-300 text-[10px] font-semibold flex items-center gap-1"
            title={screen.focusTarget === 'sun' ? (isPt ? 'Focando no Sol' : 'Focusing Sun') : (isPt ? 'Focando no Local' : 'Focusing Location')}
          >
            {screen.focusTarget === 'sun' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <MapPin className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          {/* Expand Screen Button */}
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Screen Controls & Location Bar */}
      <div className="px-3 py-1.5 bg-black/30 border-b border-white/5 flex items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <button
            onClick={() => setShowLocationPicker(prev => !prev)}
            className="text-white/80 hover:text-amber-300 truncate font-semibold underline decoration-dotted"
          >
            {screen.locationName}
          </button>
        </div>

        {/* Date & Time Inputs */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="date"
            value={screen.dateStr}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split('-').map(Number);
              const cur = screen.date;
              const newD = new Date(cur);
              newD.setFullYear(y, m - 1, d);
              onUpdateDate(newD);
            }}
            className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white font-mono focus:outline-none focus:border-amber-400"
          />
          <input
            type="time"
            value={screen.timeStr.slice(0, 5)}
            onChange={(e) => {
              if (!e.target.value) return;
              const [h, m] = e.target.value.split(':').map(Number);
              const cur = screen.date;
              const newD = new Date(cur);
              newD.setHours(h || 0, m || 0);
              onUpdateDate(newD);
            }}
            className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white font-mono focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Location Picker Popover */}
      {showLocationPicker && (
        <div className="absolute top-16 left-3 right-3 z-30 bg-[#161f2e] border border-amber-400/40 rounded-xl p-2 shadow-2xl max-h-48 overflow-y-auto">
          <div className="text-[10px] text-white/50 mb-1 font-bold uppercase">{isPt ? 'Escolher Local:' : 'Pick Location:'}</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {FEATURED_LOCATIONS.slice(0, 10).map((loc, idx) => (
              <button
                key={`tc-loc-${loc.name}-${idx}`}
                onClick={() => {
                  onUpdateLocation({ name: loc.name, latitude: loc.latitude, longitude: loc.longitude });
                  setShowLocationPicker(false);
                }}
                className="px-2 py-1 text-left rounded hover:bg-amber-400/20 hover:text-amber-300 text-white/80 truncate"
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3D Earth / Subsolar Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-2 min-h-[140px]">
        <Interactive3DGlobe
          screen={screen}
          onRotate={(dLat, dLon) => {
            onUpdateCameraCenter(
              Math.max(-85, Math.min(85, screen.cameraAngle.lat + dLat)),
              (screen.cameraAngle.lon + dLon + 360) % 360
            );
          }}
          isPt={isPt}
        />
      </div>

      {/* Telemetry Comparison Readout */}
      <div className="p-2 bg-black/40 border-t border-white/5 text-[11px] grid grid-cols-2 gap-1.5 shrink-0">
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40">{isPt ? 'Alt. Solar / Zênite' : 'Solar Alt / Zenith'}</span>
          <span className="font-mono font-bold text-amber-300">
            {screen.solarAltitude.toFixed(1)}° 
            <span className={`text-[9px] ml-1 ${altDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({altDiff >= 0 ? '+' : ''}{altDiff.toFixed(1)}°)
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-white/40">{isPt ? 'Horário Solar Verdadeiro' : 'True Solar Time'}</span>
          <span className="font-mono font-bold text-white/90">{screen.solarTimeStr}</span>
        </div>
        <div className="flex flex-col col-span-2 pt-1 border-t border-white/5 flex-row justify-between items-center">
          <span className="text-[9px] text-white/40">
            {isPt ? 'Ponto Subsolar:' : 'Subsolar Point:'}
          </span>
          <span className="font-mono text-[10px] text-amber-400">
            {formatLatitude(screen.subsolarLat, 1, true)} Lat, {formatLongitude(screen.subsolarLon, 1, true)} Lon
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: INTERACTIVE 3D GLOBE
// ==========================================
interface Interactive3DGlobeProps {
  screen: ComparisonScreenState;
  onRotate?: (dLat: number, dLon: number) => void;
  isPt: boolean;
}

const Interactive3DGlobe: React.FC<Interactive3DGlobeProps> = ({ screen, onRotate, isPt }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const radius = 64;
  const cx = 80;
  const cy = 80;

  // Determine active camera center
  let cameraLat = screen.cameraAngle.lat;
  let cameraLon = screen.cameraAngle.lon;

  if (screen.focusTarget === 'sun') {
    cameraLat = screen.subsolarLat;
    cameraLon = screen.subsolarLon;
  } else if (screen.focusTarget === 'location') {
    cameraLat = screen.latitude;
    cameraLon = screen.longitude;
  }

  // Handle Drag / Rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onRotate) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    onRotate(-dy * 0.5, -dx * 0.5);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Project Continents
  const projectedContinents = useMemo(() => {
    return CONTINENTS_COORDS.map((poly) => {
      let pathStr = "";
      poly.forEach((pt, idx) => {
        const p = projectTo3D(pt[0], pt[1], cameraLat, cameraLon, radius, cx, cy);
        if (idx === 0) {
          pathStr += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        } else {
          pathStr += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }
      });
      return pathStr;
    });
  }, [cameraLat, cameraLon, radius, cx, cy]);

  // Project Subsolar Point (⭐ 90° Zenith)
  const subsolarProj = useMemo(() => {
    return projectTo3D(screen.subsolarLat, screen.subsolarLon, cameraLat, cameraLon, radius, cx, cy);
  }, [screen.subsolarLat, screen.subsolarLon, cameraLat, cameraLon, radius, cx, cy]);

  // Project Observer Location (📍)
  const observerProj = useMemo(() => {
    return projectTo3D(screen.latitude, screen.longitude, cameraLat, cameraLon, radius, cx, cy);
  }, [screen.latitude, screen.longitude, cameraLat, cameraLon, radius, cx, cy]);

  // Angular distance between Location and Subsolar point
  const zenithDistanceDeg = useMemo(() => {
    return angularDistance(screen.latitude, screen.longitude, screen.subsolarLat, screen.subsolarLon);
  }, [screen.latitude, screen.longitude, screen.subsolarLat, screen.subsolarLon]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 160 160"
        className="w-36 h-36 md:w-44 md:h-44 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.15)]"
      >
        <defs>
          <radialGradient id={`globeGrad-${screen.id}`} cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="60%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <radialGradient id={`sunGlow-${screen.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`globeClip-${screen.id}`}>
            <circle cx={cx} cy={cy} r={radius} />
          </clipPath>
        </defs>

        {/* Outer Glow Halo */}
        <circle cx={cx} cy={cy} r={radius + 3} fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
        
        {/* Ocean Sphere */}
        <circle cx={cx} cy={cy} r={radius} fill={`url(#globeGrad-${screen.id})`} />

        {/* Globe Content with ClipPath */}
        <g clipPath={`url(#globeClip-${screen.id})`}>
          {/* Graticule Latitude lines (Equator & Tropics) */}
          <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="#ffffff" strokeWidth="0.6" strokeDasharray="2 2" strokeOpacity="0.25" />
          
          {/* Continents */}
          {projectedContinents.map((dStr, idx) => (
            <path
              key={`tc-cont-${screen.id}-${idx}`}
              d={dStr}
              fill="#10b981"
              fillOpacity="0.3"
              stroke="#34d399"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          ))}

          {/* Subsolar Day/Night Terminator Illumination Arc */}
          {subsolarProj.visible && (
            <circle
              cx={subsolarProj.x}
              cy={subsolarProj.y}
              r={radius * 1.05}
              fill="#fbbf24"
              fillOpacity="0.08"
            />
          )}

          {/* Connector Ray between Subsolar Point and Observer Location */}
          {subsolarProj.visible && observerProj.visible && (
            <line
              x1={subsolarProj.x}
              y1={subsolarProj.y}
              x2={observerProj.x}
              y2={observerProj.y}
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeDasharray="2 1.5"
              strokeOpacity="0.8"
            />
          )}

          {/* Observer Location Marker 📍 */}
          {observerProj.visible && (
            <g transform={`translate(${observerProj.x}, ${observerProj.y})`}>
              <circle r="4" fill="#10b981" fillOpacity="0.8" stroke="#ffffff" strokeWidth="1" />
              <circle r="7" fill="none" stroke="#10b981" strokeWidth="0.8" strokeDasharray="1.5 1.5" className="animate-ping" />
            </g>
          )}

          {/* Subsolar Point Marker ⭐ */}
          {subsolarProj.visible && (
            <g transform={`translate(${subsolarProj.x}, ${subsolarProj.y})`}>
              <circle r="8" fill={`url(#sunGlow-${screen.id})`} />
              <circle r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1" />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Solar Zenith Distance Pill */}
      <div className="absolute bottom-1 bg-black/70 px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-mono text-white/80">
        {isPt ? 'Dist. Zênite:' : 'Zenith Dist:'} <span className="text-amber-300 font-bold">{zenithDistanceDeg.toFixed(1)}°</span>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: DEVICE RUA SOLAR SIMULATOR VIEW
// ==========================================
interface DeviceRuaSolarViewProps {
  screen: ComparisonScreenState;
  isPt: boolean;
}

const DeviceRuaSolarView: React.FC<DeviceRuaSolarViewProps> = ({ screen, isPt }) => {
  const alt = screen.solarAltitude;
  const isDay = alt > 0;

  // Sky Gradient calculation based on Solar Altitude
  const skyBackground = useMemo(() => {
    if (alt > 30) {
      return "linear-gradient(to bottom, #0284c7 0%, #38bdf8 60%, #bae6fd 100%)";
    } else if (alt > 5) {
      return "linear-gradient(to bottom, #1e40af 0%, #60a5fa 50%, #fde047 100%)";
    } else if (alt > -6) {
      return "linear-gradient(to bottom, #4c1d95 0%, #db2777 40%, #f97316 75%, #fde047 100%)";
    } else if (alt > -18) {
      return "linear-gradient(to bottom, #0f172a 0%, #1e1b4b 60%, #312e81 100%)";
    } else {
      return "linear-gradient(to bottom, #020617 0%, #0b0f19 70%, #111827 100%)";
    }
  }, [alt]);

  // Sun / Moon trajectory position in viewBox (0 to 100%)
  const sunX = 50 + (screen.solarAzimuth - 180) * 0.4;
  const sunY = Math.max(10, Math.min(85, 90 - (alt * 0.8)));

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 flex flex-col justify-between" style={{ background: skyBackground }}>
      {/* Sky Canvas / Sun / Stars */}
      <div className="relative flex-1">
        {/* Sun Object */}
        {isDay && (
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ left: `${sunX}%`, top: `${sunY}%` }}
          >
            <div className="w-8 h-8 rounded-full bg-amber-200 border-2 border-amber-300 shadow-[0_0_25px_#fde047] flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
            </div>
          </div>
        )}

        {/* Moon Object if Night */}
        {!isDay && (
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{ left: `45%`, top: `30%` }}
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 shadow-[0_0_15px_rgba(255,255,255,0.4)] flex items-center justify-center">
              <Moon className="w-4 h-4 text-slate-700" />
            </div>
          </div>
        )}
      </div>

      {/* Stylized Architectural Street Horizon with Shadows */}
      <div className="relative h-20 bg-gradient-to-t from-[#0f172a] to-transparent flex items-end">
        <svg viewBox="0 0 400 80" className="w-full h-20 fill-[#1e293b] stroke-[#334155] stroke-width-1">
          {/* Buildings */}
          <rect x="20" y="25" width="45" height="55" fill="#1e293b" />
          <rect x="70" y="10" width="60" height="70" fill="#0f172a" />
          <rect x="135" y="35" width="40" height="45" fill="#1e293b" />
          <rect x="180" y="20" width="55" height="60" fill="#334155" />
          <rect x="240" y="5" width="70" height="75" fill="#0f172a" />
          <rect x="315" y="30" width="50" height="50" fill="#1e293b" />

          {/* Windows illumination */}
          <circle cx="90" cy="25" r="2" fill={isDay ? "#475569" : "#fbbf24"} />
          <circle cx="110" cy="35" r="2" fill={isDay ? "#475569" : "#fbbf24"} />
          <circle cx="260" cy="20" r="2" fill={isDay ? "#475569" : "#f59e0b"} />
          <circle cx="280" cy="40" r="2" fill={isDay ? "#475569" : "#fbbf24"} />

          {/* Ground / Street */}
          <rect x="0" y="70" width="400" height="10" fill="#020617" />
          <line x1="0" y1="75" x2="400" y2="75" stroke="#fbbf24" strokeWidth="1" strokeDasharray="10 10" strokeOpacity="0.6" />
        </svg>

        {/* Live Device Status Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
          <span className="font-semibold text-white/90">
            🏙️ {screen.locationName}
          </span>
          <span className="font-mono text-amber-300 font-bold">
            {isDay ? `☀️ ${isPt ? 'Dia' : 'Day'} (+${alt.toFixed(1)}°)` : `🌙 ${isPt ? 'Noite' : 'Night'} (${alt.toFixed(1)}°)`}
          </span>
        </div>
      </div>
    </div>
  );
};
