import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MiniMap } from './components/MiniMap';
import { Sun, Moon, MapPin, Loader2, Info, Search, X, Navigation, Sparkles, Play, Pause, Languages as LanguageIcon, Clock, Globe, RotateCcw, Star, Share2, MessageSquare, Cpu, Settings, Cloud, AlertTriangle, SlidersHorizontal, CalendarRange, Maximize, Minimize, Watch, Tv } from 'lucide-react';
import { WristwatchModal } from './components/WristwatchModal';
import { TimeComparisonModal } from './components/TimeComparisonModal';
import { Compass } from './components/Compass';
import { calculateSolarTime, getSolarGradient, getSeasonInfo, getTrafficIntensity, formatEquationOfTime, formatSolarCivilDifference } from './lib/solarTime';
import { auth } from './lib/firebase';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { saveHistoryEntry } from './services/historyService';
import { AnalogClock } from './components/AnalogClock';
import { Pendulum } from './components/Pendulum';
import { Analog24hClock } from './components/Analog24hClock';
import { Analog12hClock } from './components/Analog12hClock';
import { DaylightChart } from './components/DaylightChart';
import { SolarWidgets } from './components/SolarWidgets';
import { SolarAngleVisualizer } from './components/SolarAngleVisualizer';
import { SeasonalTimeline } from './components/SeasonalTimeline';
import { TimelineScrubber } from './components/TimelineScrubber';
import { SeasonalSummaryCard } from './components/SeasonalSummaryCard';
import { SeasonalTable } from './components/SeasonalTable';
import { SeasonalWidget } from './components/SeasonalWidget';
import SeasonalDayLengthChart from './components/SeasonalDayLengthChart';
import { AstronomicalNightWidget } from './components/AstronomicalNightWidget';
import { OrientacaoTerrestreWidget } from './components/OrientacaoTerrestreWidget';
import { ClockWidgets } from './components/ClockWidgets';
import { SolarDeVista } from './components/SolarDeVista';
import { SkyView } from './components/SkyView';
import { RuaSolar } from './components/RuaSolar';
import { ThemeSelector, Theme } from './components/ThemeSelector';
import { Gear } from './components/Gear';
import Fireworks from './components/Fireworks';
import { searchLocations, LocationSuggestion } from './services/geminiService';
import { FEATURED_LOCATIONS, MAJOR_SOLAR_OBSERVATORIES, EXTREME_LATITUDE_LOCATIONS, GENERIC_TIMEZONES, isGenericTimezone } from './constants';
import { TRANSLATIONS, LANGUAGES, Language, Translations } from './translations';
import { SolarAnalyticsPanel } from './components/SolarAnalyticsPanel';
import { SolarDeclinationTrend } from './components/SolarDeclinationTrend';
import { RefractionChart } from './components/RefractionChart';
import { SunPathCanvas } from './components/SunPathCanvas';
import { SubsolarWorldMap } from './components/SubsolarWorldMap';
import { ZenithDistanceReadout } from './components/ZenithDistanceReadout';
import { SolarAltitudeTimeline } from './components/SolarAltitudeTimeline';
import { SavedLocationsSwitcher } from './components/SavedLocationsSwitcher';
import { LocationHistoryChat } from './components/LocationHistoryChat';
import { CustomLocationCreatorChat } from './components/CustomLocationCreatorChat';
import { LocationSearchModal } from './components/LocationSearchModal';
import { SeasonManagerModal } from './components/SeasonManagerModal';
import { 
  getSeasonalAccent, 
  SEASONAL_ACCENTS, 
  SeasonalAccentConfig, 
  SeasonType,
  SeasonManagerConfig,
  DEFAULT_SEASON_MANAGER_CONFIG,
  resolveManagedSeason,
  getSeasonCycleStatus,
  resolveManagedTimeShift,
  playSeasonalSoundAlert,
  checkSingleVigencia,
  isVigenciaActive
} from './lib/seasonalTheme';
import { 
  isMoroccoLocation, 
  getMoroccoTimezoneOffset, 
  getMoroccoDstInfo, 
  isMoroccoRamadanActive, 
  resolveLocationTimezoneOffset, 
  evaluateSeasonalPeriodShift,
  MOROCCO_TRANSITION_UTC_MS, 
  getMoroccoPolicyHistory 
} from './lib/moroccoTimezone';
import SunCalc from 'suncalc';
import { formatLatitude, formatLongitude, formatCoordinatePair, isEquatorLatitude } from './lib/coordinateParser';

interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
  loading: boolean;
}

const MONTHS_MAP: { [key: string]: number } = {
  janeiro: 0, january: 0, jan: 0,
  fevereiro: 1, february: 1, feb: 1,
  março: 2, marco: 2, march: 2, mar: 2,
  abril: 3, april: 3, apr: 3,
  maio: 4, may: 4,
  junho: 5, june: 5, jun: 5,
  julho: 6, july: 6, jul: 6,
  agosto: 7, august: 7, aug: 7,
  setembro: 8, september: 8, sep: 8, set: 8,
  outubro: 9, october: 9, oct: 9, out: 9,
  novembro: 10, november: 10, nov: 10,
  dezembro: 11, december: 11, dec: 11, dez: 11
};

const MONTHS_MAP_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_MAP_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAYS_MAP: { [key: string]: number } = {
  domingo: 0, sunday: 0, dom: 0, sun: 0,
  segunda: 1, 'segunda-feira': 1, monday: 1, seg: 1, mon: 1,
  terça: 2, 'terça-feira': 2, terca: 2, 'terca-feira': 2, tuesday: 2, ter: 2, tue: 2,
  quarta: 3, 'quarta-feira': 3, wednesday: 3, qua: 3, wed: 3,
  quinta: 4, 'quinta-feira': 4, thursday: 4, qui: 4, thu: 4,
  sexta: 5, 'sexta-feira': 5, friday: 5, sex: 5, fri: 5,
  sábado: 6, sabado: 6, saturday: 6, sab: 6, sat: 6
};

const OCCURRENCE_MAP: { [key: string]: string } = {
  primeiro: '1', '1º': '1', '1o': '1', first: '1', '1st': '1',
  segundo: '2', '2º': '2', '2o': '2', second: '2', '2nd': '2',
  terceiro: '3', '3º': '3', '3o': '3', third: '3', '3rd': '3',
  quarto: '4', '4º': '4', '4o': '4', fourth: '4', '4th': '4',
  ultimo: 'last', último: 'last', last: 'last'
};

function cleanString(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Astronomical Easter calculation using the Meeus/Jones/Butcher Computus algorithm.
 * Applies to ALL years (past, current, and all future years).
 * Based on the astronomical definition: Sunday following the ecclesiastical full moon on or after March 21.
 */
export function calculateAstronomicalEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

/**
 * Calculates movable feasts derived from Easter for any year.
 */
export function calculateMovableFeast(feastName: string, year: number): Date | null {
  const clean = cleanString(feastName);
  const easter = calculateAstronomicalEaster(year);

  const daysDiff: Record<string, number> = {
    'pascoa': 0,
    'easter': 0,
    'domingo de ramos': -7,
    'palm sunday': -7,
    'quinta-feira santa': -3,
    'quinta feira santa': -3,
    'maundy thursday': -3,
    'sexta-feira santa': -2,
    'sexta feira santa': -2,
    'good friday': -2,
    'sabado de aleluia': -1,
    'holy saturday': -1,
    'quarta de cinzas': -46,
    'quarta-feira de cinzas': -46,
    'ash wednesday': -46,
    'terca de carnaval': -47,
    'terça de carnaval': -47,
    'terca-feira de carnaval': -47,
    'terça-feira de carnaval': -47,
    'terça feira de carnaval': -47,
    'terca feira de carnaval': -47,
    'tercaf-feira de carnaval': -47,
    'carnaval terça': -47,
    'carnaval terca': -47,
    'carnaval': -47,
    'mardi gras': -47,
    'fat tuesday': -47,
    'segunda de carnaval': -48,
    'segunda-feira de carnaval': -48,
    'domingo de carnaval': -49,
    'carnival sunday': -49,
    'sabado de carnaval': -50,
    'sábado de carnaval': -50,
    'sexta de carnaval': -51,
    'sexta-feira de carnaval': -51,
    'corpus christi': 60,
    'pentecostes': 49,
    'pentecost': 49,
    'ascensao': 39,
    'ascensao do senhor': 39,
    'ascension': 39
  };

  if (daysDiff[clean] !== undefined) {
    return new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() + daysDiff[clean], 0, 0, 0));
  }

  // Check prefix match or feast + offset, e.g. "domingo de carnaval + 7" or "pascoa - 49"
  for (const [key, diff] of Object.entries(daysDiff)) {
    if (clean.startsWith(key)) {
      const rest = clean.slice(key.length).trim();
      const offsetMatch = rest.match(/^([+-])\s*(\d+)$/);
      let additionalDays = 0;
      if (offsetMatch) {
        const sign = offsetMatch[1] === '-' ? -1 : 1;
        additionalDays = sign * parseInt(offsetMatch[2], 10);
      }
      return new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() + diff + additionalDays, 0, 0, 0));
    }
  }

  return null;
}

/**
 * Calculates Terça-feira de Carnaval (Carnaval Tuesday / Mardi Gras) for any year: Easter - 47 days.
 */
export function calculateCarnavalTuesday(year: number): Date {
  const easter = calculateAstronomicalEaster(year);
  return new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() - 47, 0, 0, 0));
}

/**
 * Calculates the third Sunday of February for any given year.
 * Standard statutory scheduled date ("Data Prevista") under Brazilian daylight saving decrees.
 */
export function calculateThirdSundayOfFebruary(year: number): Date {
  let count = 0;
  for (let d = 1; d <= 29; d++) {
    const dt = new Date(Date.UTC(year, 1, d, 0, 0, 0));
    if (dt.getUTCMonth() !== 1) break;
    if (dt.getUTCDay() === 0) {
      count++;
      if (count === 3) return dt;
    }
  }
  return new Date(Date.UTC(year, 1, 15, 0, 0, 0));
}

/**
 * Calculates Domingo de Carnaval (Carnival Sunday) for any year: Easter - 49 days.
 */
export function calculateCarnavalSunday(year: number): Date {
  const easter = calculateAstronomicalEaster(year);
  return new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() - 49, 0, 0, 0));
}

export interface SeasonalRuleExceptionResult {
  ruleIdentified: boolean;
  exceptionType: 'carnaval_plus_7' | 'other' | 'none';
  year: number;
  baseDate: Date | null;
  carnavalDate: Date | null;
  postponedDate: Date | null;
  isCoincident: boolean;
  effectiveDate: Date | null;
  labelPt: string;
  labelEn: string;
}

/**
 * Comprehensive processor for seasonal rules with exceptions, specifically treating:
 * 'Exceto Domingo De Carnaval +7'
 * and '(Data Prevista) (Exceto Domingo De Carnaval +7)'
 * 
 * Logic & Astronomical Background (Brazilian Decrees 6.558/2008 and 9.242/2017):
 * 1. The scheduled transition date ("Data Prevista") is the 3rd Sunday of February.
 * 2. Domingo de Carnaval is calculated astronomically as (Easter - 49 days) for that year.
 * 3. If the scheduled 3rd Sunday of February coincides with Domingo de Carnaval:
 *    The exception triggers! The transition is postponed by +7 days to the following Sunday ("Domingo De Carnaval +7").
 * 4. If they do not coincide, the scheduled date is used.
 * 5. If the rule explicitly targets 'Exceto Domingo De Carnaval +7' as an absolute date,
 *    it yields Domingo de Carnaval + 7 days.
 */
export function processSeasonalRuleWithException(
  rule: string,
  year: number,
  baseScheduledRule?: string
): SeasonalRuleExceptionResult {
  const clean = cleanString(rule);
  
  const isCarnavalPlus7Exception = 
    clean.includes("exceto domingo de carnaval +7") ||
    clean.includes("exceto domingo de carnaval + 7") ||
    clean.includes("exceto carnaval +7") ||
    clean.includes("exceto carnaval + 7") ||
    clean.includes("except carnival sunday +7") ||
    clean.includes("except carnival +7");

  if (!isCarnavalPlus7Exception) {
    return {
      ruleIdentified: false,
      exceptionType: 'none',
      year,
      baseDate: null,
      carnavalDate: null,
      postponedDate: null,
      isCoincident: false,
      effectiveDate: null,
      labelPt: rule,
      labelEn: rule
    };
  }

  // 1. Calculate astronomical Domingo de Carnaval for target year
  const carnavalSunday = calculateCarnavalSunday(year);
  const carnavalPlus7 = new Date(Date.UTC(year, carnavalSunday.getUTCMonth(), carnavalSunday.getUTCDate() + 7, 0, 0, 0));

  // 2. Determine base scheduled date ("Data Prevista")
  let baseDate: Date | null = null;
  if (baseScheduledRule) {
    baseDate = resolveSeasonalRuleToDate(baseScheduledRule, year);
  }
  if (!baseDate) {
    // Check if the rule string contains an embedded base rule, e.g. "3º domingo de fevereiro (Exceto Domingo De Carnaval +7)"
    const cleanWithoutException = clean
      .replace(/[\(\[\{]?exceto\s+domingo\s+de\s+carnaval\s*\+?\s*7[\)\]\}]?/gi, '')
      .replace(/[\(\[\{]?data\s+prevista[\)\]\}]?/gi, '')
      .trim();
    if (cleanWithoutException) {
      baseDate = resolveSeasonalRuleToDate(cleanWithoutException, year);
    }
  }
  // Standard statutory fallback for "(Data Prevista)" under Brazilian seasonal variation law:
  if (!baseDate) {
    baseDate = calculateThirdSundayOfFebruary(year);
  }

  // 3. Test astronomical coincidence
  const isCoincident = 
    baseDate.getUTCMonth() === carnavalSunday.getUTCMonth() &&
    baseDate.getUTCDate() === carnavalSunday.getUTCDate();

  // 4. Effective date:
  // If the user specified '(Data Prevista) (Exceto Domingo De Carnaval +7)', evaluate conditional exception.
  // In a year where they coincide (e.g. 2012, 2015, 2023, 2026, 2037, 2042), effectiveDate is carnavalPlus7.
  // If the rule is strictly 'Exceto Domingo De Carnaval +7', if coincident or standalone, resolves appropriately.
  const hasDataPrevista = clean.includes("data prevista") || clean.includes("prevista") || !!baseScheduledRule;
  
  let effectiveDate: Date;
  let labelPt: string;
  let labelEn: string;

  if (hasDataPrevista) {
    effectiveDate = isCoincident ? carnavalPlus7 : baseDate;
    labelPt = `(Data Prevista) (Exceto Domingo De Carnaval +7)`;
    labelEn = `(Scheduled Date) (Except Carnival Sunday +7)`;
  } else {
    effectiveDate = isCoincident ? carnavalPlus7 : carnavalPlus7;
    labelPt = `(Exceto Domingo De Carnaval +7)`;
    labelEn = `(Except Carnival Sunday +7)`;
  }

  return {
    ruleIdentified: true,
    exceptionType: 'carnaval_plus_7',
    year,
    baseDate,
    carnavalDate: carnavalSunday,
    postponedDate: carnavalPlus7,
    isCoincident,
    effectiveDate,
    labelPt,
    labelEn
  };
}

/**
 * Calculates future seasonal transitions over multiple years with exact astronomical rules and exceptions.
 * Specifically honors 'Exceto Domingo De Carnaval +7'.
 */
export function calculateFutureSeasonalTransitions(
  startYear: number,
  yearsCount: number = 5,
  options?: {
    location?: any;
    baseOffsetMinutes?: number;
  }
): {
  year: number;
  scheduledDate: Date;
  effectiveDate: Date;
  isCarnavalCoincident: boolean;
  carnavalDate: Date;
  carnavalPlus7Date: Date;
  exceptionTriggered: boolean;
  exceptionLabel: string;
}[] {
  const results = [];
  for (let i = 0; i < yearsCount; i++) {
    const yr = startYear + i;
    const exc = processSeasonalRuleWithException("(Data Prevista) (Exceto Domingo De Carnaval +7)", yr);
    results.push({
      year: yr,
      scheduledDate: exc.baseDate || calculateThirdSundayOfFebruary(yr),
      effectiveDate: exc.effectiveDate || calculateThirdSundayOfFebruary(yr),
      isCarnavalCoincident: exc.isCoincident,
      carnavalDate: exc.carnavalDate || calculateCarnavalSunday(yr),
      carnavalPlus7Date: exc.postponedDate || new Date(calculateCarnavalSunday(yr).getTime() + 7 * 86400000),
      exceptionTriggered: exc.isCoincident,
      exceptionLabel: exc.labelPt
    });
  }
  return results;
}

export function resolveSeasonalRuleToDate(rule: string, year: number): Date | null {
  const clean = cleanString(rule);
  if (!clean) return null;

  // 0a. Check specific exception: 'Exceto Domingo De Carnaval +7' or '(Data Prevista) (Exceto Domingo De Carnaval +7)'
  if (
    clean.includes("exceto domingo de carnaval +7") ||
    clean.includes("exceto domingo de carnaval + 7") ||
    clean.includes("exceto carnaval +7") ||
    clean.includes("exceto carnaval + 7")
  ) {
    const res = processSeasonalRuleWithException(rule, year);
    if (res.effectiveDate) {
      return res.effectiveDate;
    }
  }

  // 0b. Movable feasts (Carnaval, Páscoa, Domingo de Carnaval, etc.) with or without +/- offset
  const movableDate = calculateMovableFeast(rule, year);
  if (movableDate) {
    return movableDate;
  }

  // 0c. Special case: Friday before the last Sunday of March (Israel)
  if (clean.includes("sexta") && clean.includes("ultimo domingo") && (clean.includes("marco") || clean.includes("marzo") || clean.includes("march"))) {
    const lastDay = new Date(Date.UTC(year, 2 + 1, 0));
    const maxDay = lastDay.getUTCDate();
    for (let d = maxDay; d >= 1; d--) {
      const checkDate = new Date(Date.UTC(year, 2, d, 0, 0));
      if (checkDate.getUTCDay() === 0) { // Last Sunday of March
        return new Date(Date.UTC(year, 2, d - 2, 0, 0)); // Friday before
      }
    }
  }

  // 1. Matches "15/10" or "15-10" or "15-10-2024"
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const ruleYear = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : year;
    const actualYear = ruleYear < 100 ? ruleYear + 2000 : ruleYear;
    
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(Date.UTC(actualYear, month, day, 0, 0));
    }
  }

  // 2. Matches "dia 15 de outubro", "15 de outubro", "15 out", "15 de out"
  const numberMatch = clean.match(/(?:dia\s+)?(\d{1,2})\s*(?:de|do)?\s*([a-zç]+)/);
  if (numberMatch) {
    const day = parseInt(numberMatch[1], 10);
    const monthStr = numberMatch[2];
    if (day >= 1 && day <= 31 && MONTHS_MAP[monthStr] !== undefined) {
      const month = MONTHS_MAP[monthStr];
      return new Date(Date.UTC(year, month, day, 0, 0));
    }
  }

  // 3. Matches relative days of week
  let occurrence: string | null = null;
  for (const [key, val] of Object.entries(OCCURRENCE_MAP)) {
    if (clean.includes(key)) {
      occurrence = val;
      break;
    }
  }

  let dayOfWeek: number | null = null;
  for (const [key, val] of Object.entries(DAYS_MAP)) {
    if (clean.includes(key)) {
      dayOfWeek = val;
      break;
    }
  }

  let month: number | null = null;
  // Sort months by key length descending to avoid partial matches
  const sortedMonths = Object.entries(MONTHS_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of sortedMonths) {
    if (clean.includes(key)) {
      month = val;
      break;
    }
  }

  if (month !== null && dayOfWeek !== null && occurrence !== null) {
    // Check if there is an offset in days, e.g. "+ 7" or "+7"
    const offsetMatch = clean.match(/([+-])\s*(\d+)\s*(?:dias?|d)?$/);
    const dayOffset = offsetMatch ? (offsetMatch[1] === '-' ? -1 : 1) * parseInt(offsetMatch[2], 10) : 0;

    if (occurrence === 'last') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      const maxDay = lastDay.getUTCDate();
      for (let d = maxDay; d >= 1; d--) {
        const checkDate = new Date(Date.UTC(year, month, d, 0, 0));
        if (checkDate.getUTCDay() === dayOfWeek) {
          if (dayOffset !== 0) {
            return new Date(Date.UTC(year, month, d + dayOffset, 0, 0));
          }
          return checkDate;
        }
      }
    } else {
      const occNum = parseInt(occurrence, 10);
      let count = 0;
      for (let d = 1; d <= 31; d++) {
        const checkDate = new Date(Date.UTC(year, month, d, 0, 0));
        if (checkDate.getUTCMonth() !== month) break;
        if (checkDate.getUTCDay() === dayOfWeek) {
          count++;
          if (count === occNum) {
            if (dayOffset !== 0) {
              return new Date(Date.UTC(year, month, d + dayOffset, 0, 0));
            }
            return checkDate;
          }
        }
      }
    }
  }

  const parsed = Date.parse(rule);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(Date.UTC(year, d.getMonth(), d.getDate(), 0, 0));
  }

  return null;
}

const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// checkSingleVigencia and isVigenciaActive are imported from ./lib/seasonalTheme


const formatLocalDate = (date: Date) => {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalTime = (date: Date) => {
  if (!date || isNaN(date.getTime())) return "";
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const PREDEFINED_THEMES = [
  { name: "Original", bgColor: "#020617", textColor: "#ffffff", accentColor: "#fbbf24", style: { background: "transparent" }, className: "" },
  { 
    name: "Anos 1910", 
    bgColor: "#1a100a", 
    textColor: "#dcc194", 
    accentColor: "#d4af37", 
    style: { 
      background: "radial-gradient(circle at center, #5d4037 0%, #3e2723 100%)"
    },
    frameStyle: { 
      border: "30px ridge #3d2417", 
      borderRadius: "8px", 
      boxShadow: "inset 0 0 100px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.9)" 
    },
    panelStyle: {
      border: "8px ridge #3d2417",
      background: "linear-gradient(135deg, #4a2c1d 0%, #2d1b13 100%)",
      boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
      borderRadius: "4px"
    },
    fontStyle: { fontFamily: "serif", textTransform: "uppercase", letterSpacing: "1px" },
    className: "animate-clockwork"
  },
  { name: "Vida Real", bgColor: "#f0f0f0", textColor: "#333333", accentColor: "#0070f3", style: { backgroundImage: "linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)" }, className: "" },
  { name: "Futuro", bgColor: "#000000", textColor: "#00ff00", accentColor: "#00ffff", style: { backgroundImage: "linear-gradient(rgba(0,255,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }, className: "" }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isWarpActive, setIsWarpActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [warpSpeed, setWarpSpeed] = useState(1);
  const [warpUnit, setWarpUnit] = useState<"us" | "ms" | "s" | "min" | "h">("s");
  
  const [currentTheme, setCurrentTheme] = useState(PREDEFINED_THEMES[0]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [solarNoonNotification, setSolarNoonNotification] = useState(() => localStorage.getItem('solarNoonNotification') === 'true');
  const [customThemePrompt, setCustomThemePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSeasonalColorEnabled, setIsSeasonalColorEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('solaris_seasonal_color_enabled');
      return saved === null ? false : saved === 'true';
    } catch {
      return false;
    }
  });

  const [showSeasonManagerModal, setShowSeasonManagerModal] = useState(false);
  const [seasonManagerConfig, setSeasonManagerConfig] = useState<SeasonManagerConfig>(() => {
    try {
      const saved = localStorage.getItem('solaris_season_manager_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      ...DEFAULT_SEASON_MANAGER_CONFIG,
      targetYear: new Date().getFullYear()
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('solaris_season_manager_config', JSON.stringify(seasonManagerConfig));
    } catch (e) {
      console.error(e);
    }
  }, [seasonManagerConfig]);

  useEffect(() => {
    localStorage.setItem('solaris_seasonal_color_enabled', String(isSeasonalColorEnabled));
  }, [isSeasonalColorEnabled]);

  useEffect(() => {
    localStorage.setItem('solarNoonNotification', String(solarNoonNotification));
  }, [solarNoonNotification]);

  const generateTheme = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: customThemePrompt }),
      });
      const theme = await response.json();
      setCurrentTheme(theme);
      setShowThemeModal(false);
    } catch (error) {
      console.error("Error generating theme:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const [showSkyView, setShowSkyView] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isOptimizationMode, setIsOptimizationMode] = useState(() => localStorage.getItem('isOptimizationMode') === 'true');
  const [isBestPerformanceMode, setIsBestPerformanceMode] = useState(() => localStorage.getItem('isBestPerformanceMode') === 'true');

  const [ramLimit, setRamLimit] = useState<'2GB' | '4GB' | '6GB' | '8GB' | '10GB' | '12GB' | 'Unlimited'>(() => {
    return (localStorage.getItem('solaris_ram_limit') as any) || 'Unlimited';
  });

  useEffect(() => {
    localStorage.setItem('isOptimizationMode', String(isOptimizationMode));
  }, [isOptimizationMode]);

  useEffect(() => {
    localStorage.setItem('isBestPerformanceMode', String(isBestPerformanceMode));
  }, [isBestPerformanceMode]);

  useEffect(() => {
    localStorage.setItem('solaris_ram_limit', ramLimit);
  }, [ramLimit]);

  const [cloudMode, setCloudMode] = useState<'trend' | 'heavy' | 'medium' | 'light' | 'off'>(() => {
    return (localStorage.getItem('solaris_cloud_mode') as any) || 'trend';
  });

  useEffect(() => {
    localStorage.setItem('solaris_cloud_mode', cloudMode);
  }, [cloudMode]);

  const [cloudOpacity, setCloudOpacity] = useState<number>(() => {
    return Number(localStorage.getItem('solaris_cloud_opacity') || '0.85');
  });

  useEffect(() => {
    localStorage.setItem('solaris_cloud_opacity', String(cloudOpacity));
  }, [cloudOpacity]);

  const [streetlightOffAngle, setStreetlightOffAngle] = useState<number>(() => {
    const saved = localStorage.getItem('solaris_streetlight_off_angle');
    return saved !== null ? Number(saved) : -0.8;
  });

  const [streetlightOnAngle, setStreetlightOnAngle] = useState<number>(() => {
    const saved = localStorage.getItem('solaris_streetlight_on_angle');
    return saved !== null ? Number(saved) : -6.0;
  });

  const [isStreetlightTransitionEnabled, setIsStreetlightTransitionEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('solaris_streetlight_transition_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('solaris_streetlight_off_angle', String(streetlightOffAngle));
  }, [streetlightOffAngle]);

  useEffect(() => {
    localStorage.setItem('solaris_streetlight_on_angle', String(streetlightOnAngle));
  }, [streetlightOnAngle]);

  useEffect(() => {
    localStorage.setItem('solaris_streetlight_transition_enabled', String(isStreetlightTransitionEnabled));
  }, [isStreetlightTransitionEnabled]);

  const [axialTilt, setAxialTilt] = useState<number>(() => {
    const saved = localStorage.getItem('solaris_axial_tilt');
    if (saved) {
      const num = parseFloat(saved);
      if (!isNaN(num) && num >= 0 && num <= 90) return num;
    }
    return 23.44;
  });

  useEffect(() => {
    localStorage.setItem('solaris_axial_tilt', String(axialTilt));
  }, [axialTilt]);

  const [historyMode, setHistoryMode] = useState(false);
  const [historyOffsetYears, setHistoryOffsetYears] = useState(0);
  const [showRuaSolar, setShowRuaSolar] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [skyViewScope, setSkyViewScope] = useState<'all' | 'north' | 'south' | 'east' | 'west' | 'device'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWristwatchModal, setShowWristwatchModal] = useState(false);
  const [showSubsolarModal, setShowSubsolarModal] = useState(false);
  const [showTimeComparisonModal, setShowTimeComparisonModal] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
  };

  const [location, setLocation] = useState<LocationState>({
    coords: null,
    error: null,
    loading: true,
  });
  
  const [showInfo, setShowInfo] = useState(false);
  const [showRefractionChart, setShowRefractionChart] = useState(false);
  
  const [globalTimezoneMode, setGlobalTimezoneMode] = useState<'local' | 'utc' | 'geographic' | 'full-hour' | 'custom'>(() => {
    const saved = localStorage.getItem('globalTimezoneMode');
    return (saved as 'local' | 'utc' | 'geographic' | 'full-hour' | 'custom') || 'geographic';
  });

  const [globalCustomTimezoneOffset, setGlobalCustomTimezoneOffset] = useState<number>(() => {
    const saved = localStorage.getItem('globalCustomTimezoneOffset');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return -new Date().getTimezoneOffset();
  });

  useEffect(() => {
    localStorage.setItem('globalTimezoneMode', globalTimezoneMode);
  }, [globalTimezoneMode]);

  useEffect(() => {
    localStorage.setItem('globalCustomTimezoneOffset', globalCustomTimezoneOffset.toString());
  }, [globalCustomTimezoneOffset]);

  const [enableSeasonalVariation, setEnableSeasonalVariation] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableSeasonalVariation');
    if (saved !== null) return saved === 'true';
    return true; // Default to accepting predicted seasonal variation without stubbornness
  });

  useEffect(() => {
    localStorage.setItem('enableSeasonalVariation', enableSeasonalVariation.toString());
  }, [enableSeasonalVariation]);
  const [isSimulation, setIsSimulation] = useState(false);
  const [isSimulationPlaying, setIsSimulationPlaying] = useState(false);
  const [simulationDate, setSimulationDate] = useState(Date.now());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulationPlaying) {
      interval = setInterval(() => {
        setSimulationDate(prev => prev + (warpSpeed * 1000)); // Advance by warpSpeed seconds
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSimulationPlaying, warpSpeed]);
  const [seasonalPeriods, setSeasonalPeriods] = useState<{ id: string; startRule: string; endRule: string; shift: string; vigencia: string; validityType: 'single' | 'range'; startTime?: string; endTime?: string; duration?: string; enabled: boolean }[]>([]);
  const [flashState, setFlashState] = useState<{ color: string, active: boolean }>({ color: '', active: false });
  const lastActiveRuleId = useRef<string | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<{ name: string; periods: typeof seasonalPeriods }[]>(() => {
    const saved = localStorage.getItem('seasonalSnapshots');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSeasonalModified, setIsSeasonalModified] = useState(false);
  const [initialSeasonalPeriods, setInitialSeasonalPeriods] = useState<any[] | null>(null);

  useEffect(() => {
    localStorage.setItem('seasonalSnapshots', JSON.stringify(savedSnapshots));
  }, [savedSnapshots]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState<LocationSuggestion[]>(() => {
    const saved = localStorage.getItem('favoriteObservatories');
    return saved ? JSON.parse(saved) : [];
  });
  const [manualLocation, setManualLocation] = useState<LocationSuggestion | null>(null);
  const [isHistoryChatOpen, setIsHistoryChatOpen] = useState(false);
  const [isCreatorChatOpen, setIsCreatorChatOpen] = useState(false);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);
  const [selectedAlternativeShift, setSelectedAlternativeShift] = useState(0);
  const [manualDstOverride, setManualDstOverride] = useState<boolean | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [fireworksList, setFireworksList] = useState<{ id: number, color: string, intensity: 'low' | 'high' }[]>([]);
  const [selectedUtcOffset, setSelectedUtcOffset] = useState<number | null>(null);
  const [transitionNotification, setTransitionNotification] = useState<{
    type: 'season' | 'rule' | 'dst';
    title: string;
    description: string;
    colors: string[];
  } | null>(null);

  const prevSeasonRef = useRef<string | null>(null);
  const prevIsDSTRef = useRef<boolean | null>(null);
  const prevShiftRef = useRef<number | null>(null);
  const prevManualLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (transitionNotification) {
      const timer = setTimeout(() => {
        setTransitionNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [transitionNotification]);
  
  useEffect(() => {
    localStorage.setItem('favoriteObservatories', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (location: LocationSuggestion) => {
    setFavorites(prev => {
      const isFavorite = prev.some(f => f.latitude === location.latitude && f.longitude === location.longitude);
      if (isFavorite) {
        return prev.filter(f => !(f.latitude === location.latitude && f.longitude === location.longitude));
      } else {
        return [...prev, location];
      }
    });
  };

  const deleteFavoriteItem = (location: LocationSuggestion) => {
    setFavorites(prev => {
      const updated = prev.filter(f => !(f.name === location.name && Math.abs(f.latitude - location.latitude) < 0.001 && Math.abs(f.longitude - location.longitude) < 0.001));
      try {
        localStorage.setItem('favoriteObservatories', JSON.stringify(updated));
      } catch (e) {
        console.error("Error updating favorites", e);
      }
      return updated;
    });
  };

  const deleteHistoryItem = (location: LocationSuggestion) => {
    setLocationHistory(prev => {
      const updated = prev.filter(l => !(l.name === location.name && Math.abs(l.latitude - location.latitude) < 0.001 && Math.abs(l.longitude - location.longitude) < 0.001));
      try {
        localStorage.setItem('helios_history', JSON.stringify(updated));
      } catch (e) {
        console.error("Error updating history", e);
      }
      return updated;
    });
  };

  const isFavorite = (location: LocationSuggestion) => favorites.some(f => f.latitude === location.latitude && f.longitude === location.longitude);

  const nowMsRef = React.useRef(nowMs);
  useEffect(() => { nowMsRef.current = nowMs; }, [nowMs]);

  const isAutoSyncEnabledRef = React.useRef(isAutoSyncEnabled);
  const prevWarpActiveRef = React.useRef(isWarpActive);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    // Handle redirect result
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login error:", error);
    });
    
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    isAutoSyncEnabledRef.current = isAutoSyncEnabled;
  }, [isAutoSyncEnabled]);

  // Reset alt time toggle if location changes
  // useEffect(() => {
  //   if (selectedAlternativeShift !== 0) {
  //     setSelectedAlternativeShift(0);
  //   }
  // }, [manualLocation?.name]);

  const [locationHistory, setLocationHistory] = useState<LocationSuggestion[]>(() => {
    try {
      const saved = localStorage.getItem('helios_history');
      if (!saved) return [];
      const parsed: LocationSuggestion[] = JSON.parse(saved);
      return parsed.filter(l => !isGenericTimezone(l));
    } catch {
      return [];
    }
  });
  const [useAutoDst, setUseAutoDst] = useState(true);
  const [is24hFormat, setIs24hFormat] = useState(true);
  const [isSolarDeVistaOpen, setIsSolarDeVistaOpen] = useState(false);
  const [civilShift, setCivilShift] = useState(0); 
  const [isAutoSolarSync, setIsAutoSolarSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('helios_auto_solar_sync') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('helios_auto_solar_sync', String(isAutoSolarSync));
  }, [isAutoSolarSync]);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('helios_language');
    return (saved as Language) || 'en';
  });

  const t = TRANSLATIONS[language];
  const isPt = language === 'pt';
  const currentLanguageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  useEffect(() => {
    localStorage.setItem('helios_language', language);
  }, [language]);

  const [localDateInput, setLocalDateInput] = useState("");
  const [localTimeInput, setLocalTimeInput] = useState("");
  const isTemporalFocusedRef = React.useRef(false);

  const isPausedRef = React.useRef(isPaused);
  const isWarpActiveRef = React.useRef(isWarpActive);
  const warpSpeedRef = React.useRef(warpSpeed);
  const warpUnitRef = React.useRef(warpUnit);
  const lastTickRef = React.useRef(Date.now());
  const manualLocationRef = React.useRef(manualLocation);

  useEffect(() => { manualLocationRef.current = manualLocation; }, [manualLocation]);
  const requestRef = React.useRef<number>();
  const accumulatedTimeRef = React.useRef(0);
  const lastStateUpdateRef = React.useRef(Date.now());

  useEffect(() => {
    isPausedRef.current = isPaused;
    isWarpActiveRef.current = isWarpActive;
    warpSpeedRef.current = warpSpeed;
    warpUnitRef.current = warpUnit;
    if (!isPaused) {
      lastStateUpdateRef.current = Date.now();
    }
  }, [isPaused, isWarpActive, warpSpeed, warpUnit]);

  const animate = React.useCallback((time: number) => {
    const now = Date.now();
    if (!isPausedRef.current) {
      if (!isWarpActiveRef.current) {
        // Only update nowMs if more than 50ms have passed (Clock resolution)
        if (now - lastStateUpdateRef.current > 50) {
          setNowMs(() => now);
          lastStateUpdateRef.current = now;
        }
      } else {
        const dt = Math.min(now - lastStateUpdateRef.current, 1000);
        if (dt > 0) {
          let unitMultiplier = 1000;
          switch (warpUnitRef.current) {
            case 's': unitMultiplier = 1000; break;
            case 'min': unitMultiplier = 60000; break;
            case 'h': unitMultiplier = 3600000; break;
            case 'ms': unitMultiplier = 1; break;
            case 'us': unitMultiplier = 0.001; break;
          }
          
          const rawSpeed = warpSpeedRef.current;
          const speed = (typeof rawSpeed === 'number' && !isNaN(rawSpeed) && isFinite(rawSpeed)) ? rawSpeed : 1;
          const increment = (speed * unitMultiplier) * (dt / 1000);
          if (!isNaN(increment) && isFinite(increment)) {
            accumulatedTimeRef.current += increment;
            lastStateUpdateRef.current = now;

            const wholeIncrement = Math.trunc(accumulatedTimeRef.current);
            if (wholeIncrement !== 0) {
              setNowMs(prev => {
                const next = prev + wholeIncrement;
                return (!isNaN(next) && isFinite(next)) ? next : prev;
              });
              accumulatedTimeRef.current -= wholeIncrement;
            }
          } else {
            lastStateUpdateRef.current = now;
          }
        }
      }
    } else {
      lastStateUpdateRef.current = now;
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);


  // Stabilize coords to prevent unnecessary recalculations
  const effectiveCoords = useMemo(() => {
    if (manualLocation) return { latitude: manualLocation.latitude, longitude: manualLocation.longitude };
    if (!location.coords) return null;
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  }, [manualLocation, location.coords?.latitude, location.coords?.longitude]);

  // TZ base offset stabilization - Only updates when minutes change or manual location changes
  const baseOffset = useMemo(() => {
    if (selectedUtcOffset !== null) return selectedUtcOffset + civilShift;
    let offset = 0;
    const currentMs = isSimulation ? simulationDate : nowMs;

    if (globalTimezoneMode === 'utc') {
      offset = 0;
    } else if (globalTimezoneMode === 'local') {
      const d = new Date(currentMs);
      const o = -d.getTimezoneOffset();
      offset = isNaN(o) ? 0 : o;
    } else if (globalTimezoneMode === 'geographic') {
      offset = effectiveCoords ? effectiveCoords.longitude * 4 : 0;
    } else if (globalTimezoneMode === 'full-hour') {
      offset = effectiveCoords ? Math.round((effectiveCoords.longitude * 4) / 60) * 60 : 0;
    } else if (globalTimezoneMode === 'custom') {
      offset = globalCustomTimezoneOffset;
    } else if (manualLocation) {
      if (isMoroccoLocation(manualLocation)) {
        offset = getMoroccoTimezoneOffset(currentMs);
      } else {
        offset = resolveLocationTimezoneOffset(manualLocation, currentMs);
      }
    } else if (effectiveCoords && isMoroccoLocation({ latitude: effectiveCoords.latitude, longitude: effectiveCoords.longitude })) {
      offset = getMoroccoTimezoneOffset(currentMs);
    } else {
      const d = new Date(currentMs);
      const o = -d.getTimezoneOffset();
      offset = isNaN(o) ? 0 : o;
    }
    return offset + civilShift;
  }, [manualLocation, civilShift, Math.floor((isSimulation ? simulationDate : nowMs) / 60000), globalTimezoneMode, globalCustomTimezoneOffset, effectiveCoords, selectedUtcOffset, isSimulation, simulationDate, nowMs]);

  const activeRuleId = useMemo(() => {
    if (!manualLocation?.seasonalPeriods) return null;
    const currentMs = isSimulation ? simulationDate : nowMs;
    const year = new Date(currentMs + baseOffset * 60000).getUTCFullYear();
    const stableTimeMs = Math.floor(currentMs / 1000) * 1000;
    const currentStandardLocalEpoch = stableTimeMs + baseOffset * 60000;
    
    for (const period of manualLocation.seasonalPeriods) {
       if (period.enabled === false) continue;
       if (period.periodMode === 'selection') {
         const evalRes = evaluateSeasonalPeriodShift(period, currentMs);
         if (evalRes.active) return period.id || 'selection-rule';
         continue;
       }
       const startUpper = period.startRule?.toUpperCase() || "";
       if (startUpper === 'PERMANENTE' || startUpper === 'PERMANENT') {
         if (!isVigenciaActive(period.vigencia, period.validityType, currentMs, year)) continue;
         return period.id || 'permanent-rule';
       }
       if (!period.startRule || !period.endRule) continue;
       const startD = resolveSeasonalRuleToDate(period.startRule, year);
       const endD = resolveSeasonalRuleToDate(period.endRule, year);
       if (!startD || !endD) continue;

       const startOffsetMs = parseTimeToMinutes(period.startTime) * 60000;
       const endOffsetMs = parseTimeToMinutes(period.endTime) * 60000;

       const startLocalEpoch = startD.getTime() + startOffsetMs;
       const endLocalEpoch = endD.getTime() + endOffsetMs;
       
       let isActive = false;
       if (startLocalEpoch < endLocalEpoch) {
         isActive = currentStandardLocalEpoch >= startLocalEpoch && currentStandardLocalEpoch < endLocalEpoch;
       } else {
         isActive = currentStandardLocalEpoch >= startLocalEpoch || currentStandardLocalEpoch < endLocalEpoch;
       }
       
       if (isActive) {
         const vigYear = (startLocalEpoch > endLocalEpoch && currentStandardLocalEpoch < endLocalEpoch) ? year - 1 : year;
         if (!isVigenciaActive(period.vigencia, period.validityType, currentMs, year) &&
             !isVigenciaActive(period.vigencia, period.validityType, currentMs, vigYear)) continue;
         return period.id || `${period.startRule}-${period.endRule}`;
       }
    }
    return null;
  }, [manualLocation?.seasonalPeriods, isSimulation, simulationDate, nowMs, baseOffset]);

  useEffect(() => {
    if (lastActiveRuleId.current !== null && activeRuleId !== lastActiveRuleId.current && activeRuleId !== null) {
      setFlashState({ color: 'rgba(251, 191, 36, 0.3)', active: true });
      setTimeout(() => setFlashState({ color: '', active: false }), 1000);
    }
    lastActiveRuleId.current = activeRuleId;
  }, [activeRuleId]);

  // Automatic Solar Sync - periodically correct the civilShift to align civil with solar time
  useEffect(() => {
    if (!isAutoSolarSync || !effectiveCoords) return;

    let standardOffset = 0;
    if (globalTimezoneMode === 'geographic') {
      standardOffset = effectiveCoords.longitude * 4;
    } else {
      standardOffset = globalCustomTimezoneOffset;
    }

    const currentMs = isSimulation ? simulationDate : nowMs;
    const targetDate = new Date(currentMs);
    const solarCalc = calculateSolarTime(targetDate, effectiveCoords.longitude, effectiveCoords.latitude, standardOffset, axialTilt);
    
    if (solarCalc && solarCalc.solarDate && !isNaN(solarCalc.solarDate.getTime())) {
      const standardCivilMs = targetDate.getTime() + standardOffset * 60000;
      const solarMs = solarCalc.solarDate.getTime();
      const driftMinutes = (solarMs - standardCivilMs) / 60000;
      
      // Precise shift with high-resolution minutes
      const targetShift = parseFloat(driftMinutes.toFixed(4));
      
      if (Math.abs(civilShift - targetShift) > 0.0001) {
        setCivilShift(targetShift);
      }
    }
  }, [
    isAutoSolarSync, 
    isSimulation, 
    simulationDate, 
    nowMs, 
    effectiveCoords?.latitude, 
    effectiveCoords?.longitude, 
    globalTimezoneMode, 
    globalCustomTimezoneOffset, 
    civilShift,
    axialTilt
  ]);

  useEffect(() => {
    setManualDstOverride(null);
  }, [manualLocation?.name]);
  
  const checkDSTForTime = (timeMs: number, location: any, offset: number): boolean => {
     if (!location) return false;
     if (isGenericTimezone(location)) {
       return false; // Generic timezones have NO DST
     }

     if (isMoroccoLocation(location)) {
       if (timeMs >= MOROCCO_TRANSITION_UTC_MS) {
         return false; // Permanent UTC+0, no DST
       }
       return isMoroccoRamadanActive(timeMs, offset);
     }

     if (location?.seasonalPeriods && location.seasonalPeriods.length > 0) {
       const year = new Date(timeMs + offset * 60000).getUTCFullYear();
       const stableTimeMs = Math.floor(timeMs / 1000) * 1000;
       const currentStandardLocalEpoch = stableTimeMs + offset * 60000;

       for (const period of location.seasonalPeriods) {
         if (period.enabled === false) continue;
         if (period.periodMode === 'selection') {
           const evalRes = evaluateSeasonalPeriodShift(period, timeMs);
           if (evalRes.active) return true;
           continue;
         }
         const startUpper = period.startRule?.toUpperCase() || "";
         if (startUpper === 'PERMANENTE' || startUpper === 'PERMANENT') {
           if (!isVigenciaActive(period.vigencia, period.validityType, timeMs, year)) continue;
           return true;
         }
         if (!period.startRule || !period.endRule) continue;
         const startDate = resolveSeasonalRuleToDate(period.startRule, year);
         const endDate = resolveSeasonalRuleToDate(period.endRule, year);
         if (!startDate || !endDate) continue;

         const startOffsetMs = parseTimeToMinutes(period.startTime) * 60000;
         const endOffsetMs = parseTimeToMinutes(period.endTime) * 60000;

         const startLocalEpoch = startDate.getTime() + startOffsetMs;
         const endLocalEpoch = endDate.getTime() + endOffsetMs;

         let active = false;
         let seasonBaseYear = year;
         if (startLocalEpoch < endLocalEpoch) {
           active = currentStandardLocalEpoch >= startLocalEpoch && currentStandardLocalEpoch < endLocalEpoch;
           seasonBaseYear = year;
         } else {
           if (currentStandardLocalEpoch >= startLocalEpoch) {
             active = true;
             seasonBaseYear = year;
           } else if (currentStandardLocalEpoch < endLocalEpoch) {
             active = true;
             seasonBaseYear = year - 1;
           } else {
             active = false;
           }
         }

         if (active) {
           if (!isVigenciaActive(period.vigencia, period.validityType, timeMs, seasonBaseYear)) continue;
           return true;
         }
       }
       return false;
     }

     if (!location?.dstInfo?.hasDst || !location.dstInfo.start || !location.dstInfo.end) return false;
     
     const parseLocalToEpochMs = (s: string) => {
       const match = s.match(/(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{1,2})/);
       if (!match) return NaN;
       const [_, day, month, year, hour, min] = match.map(Number);
       return Date.UTC(year, month - 1, day, hour, min);
     };

     const startLocalEpoch = parseLocalToEpochMs(location.dstInfo.start);
     const endLocalEpoch = parseLocalToEpochMs(location.dstInfo.end);
     
     if (isNaN(startLocalEpoch) || isNaN(endLocalEpoch)) return false;

     const stableTimeMs = Math.floor(timeMs / 1000) * 1000;
     const currentStandardLocalEpoch = stableTimeMs + offset * 60000;
     
     if (startLocalEpoch < endLocalEpoch) {
       return currentStandardLocalEpoch >= startLocalEpoch && currentStandardLocalEpoch < endLocalEpoch;
     } else {
       return currentStandardLocalEpoch >= startLocalEpoch || currentStandardLocalEpoch < endLocalEpoch;
     }
  };

  const getActiveSeasonalShift = (timeMs: number, location: any, offset: number): number => {
    if (!location || isGenericTimezone(location)) return 0;
    if (isMoroccoLocation(location)) {
      if (timeMs >= MOROCCO_TRANSITION_UTC_MS) {
        return 0; // Permanent UTC+0, no seasonal shift
      }
      if (isMoroccoRamadanActive(timeMs, offset)) {
        return -60;
      }
      return 0;
    }
    if (location.seasonalPeriods && location.seasonalPeriods.length > 0) {
       const year = new Date(timeMs + offset * 60000).getUTCFullYear();
       const stableTimeMs = Math.floor(timeMs / 1000) * 1000;
       const currentStandardLocalEpoch = stableTimeMs + offset * 60000;
       let totalShift = 0;

       for (const period of location.seasonalPeriods) {
         if (period.enabled === false) continue;
         if (period.periodMode === 'selection') {
           const evalRes = evaluateSeasonalPeriodShift(period, timeMs);
           if (evalRes.active || evalRes.shift !== 0) {
             totalShift += evalRes.shift;
           }
           continue;
         }
         const startUpper = period.startRule?.toUpperCase() || "";
         if (startUpper === 'PERMANENTE' || startUpper === 'PERMANENT') {
           if (!isVigenciaActive(period.vigencia, period.validityType, timeMs, year)) continue;
           totalShift += (parseInt(period.shift, 10) || 0);
           continue;
         }
         if (!period.startRule || !period.endRule) continue;
         const startDate = resolveSeasonalRuleToDate(period.startRule, year);
         const endDate = resolveSeasonalRuleToDate(period.endRule, year);
         if (!startDate || !endDate) continue;

         const startOffsetMs = parseTimeToMinutes(period.startTime) * 60000;
         const endOffsetMs = parseTimeToMinutes(period.endTime) * 60000;

         const startLocalEpoch = startDate.getTime() + startOffsetMs;
         const endLocalEpoch = endDate.getTime() + endOffsetMs;

         let active = false;
         let seasonBaseYear = year;
         if (startLocalEpoch < endLocalEpoch) {
           active = currentStandardLocalEpoch >= startLocalEpoch && currentStandardLocalEpoch < endLocalEpoch;
           seasonBaseYear = year;
         } else {
           if (currentStandardLocalEpoch >= startLocalEpoch) {
             active = true;
             seasonBaseYear = year;
           } else if (currentStandardLocalEpoch < endLocalEpoch) {
             active = true;
             seasonBaseYear = year - 1;
           } else {
             active = false;
           }
         }

         if (active) {
           if (!isVigenciaActive(period.vigencia, period.validityType, timeMs, seasonBaseYear)) continue;
           totalShift += (parseInt(period.shift, 10) || 0);
         }
       }
       return totalShift;
    }

    // Only apply location DST shift if DST is actually active at timeMs
    if (location.dstInfo?.hasDst && checkDSTForTime(timeMs, location, offset)) {
      return location.dstInfo.shift ?? 60;
    }
    return 0;
  };

  const isCurrentlyDST = useMemo(() => {
    const loc = manualLocation || location;
    // Generic Time Zones and LID don't have DST
    if (isGenericTimezone(loc) || loc?.name === "LID") return false;
    
    // If user explicitly set DST
    if (manualDstOverride === true) return true;
    if (manualDstOverride === false) return false;
    
    const currentMs = isSimulation ? simulationDate : nowMs;
    return checkDSTForTime(currentMs, loc, baseOffset);
  }, [manualLocation, location, isSimulation, simulationDate, nowMs, baseOffset, manualDstOverride]);

  const isCurrentlyAmbiguous = useMemo(() => {
    const loc = manualLocation || location;
    if (!loc) return false;
    const currentMs = isSimulation ? simulationDate : nowMs;
    const stableTimeMs = Math.floor(currentMs / 1000) * 1000;
    const currentStandardLocalEpoch = stableTimeMs + baseOffset * 60000;
    const year = new Date(currentMs + baseOffset * 60000).getUTCFullYear();

    if (loc.seasonalPeriods && loc.seasonalPeriods.length > 0) {
      for (const period of loc.seasonalPeriods) {
        if (period.enabled === false) continue;
        if (!period.startRule || !period.endRule) continue;
        const endDate = resolveSeasonalRuleToDate(period.endRule, year);
        if (!endDate) continue;

        const endOffsetMs = parseTimeToMinutes(period.endTime) * 60000;
        const endLocalEpoch = endDate.getTime() + endOffsetMs;
        const shift = (parseInt(period.shift, 10) || 60) * 60000;
        
        if (currentStandardLocalEpoch >= endLocalEpoch - shift && currentStandardLocalEpoch < endLocalEpoch) {
          return true;
        }
      }
    }

    if (loc.dstInfo?.hasDst && loc.dstInfo.end) {
      const parseLocalToEpochMs = (s: string) => {
        const match = s.match(/(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{1,2})/);
        if (!match) return NaN;
        const [_, d, m, y, h, min] = match.map(Number);
        return Date.UTC(y, m - 1, d, h, min);
      };

      const endLocalEpoch = parseLocalToEpochMs(loc.dstInfo.end);
      if (!isNaN(endLocalEpoch)) {
        const shift = (loc.dstInfo.shift ?? 60) * 60000;
        if (currentStandardLocalEpoch >= endLocalEpoch - shift && currentStandardLocalEpoch < endLocalEpoch) {
          return true;
        }
      }
    }

    return false;
  }, [isSimulation, simulationDate, nowMs, manualLocation, location, baseOffset]);

  const handleFallbackPeriodChange = (period: 'first' | 'second') => {
    if (!manualLocation) return;
    
    const currentMs = isSimulation ? simulationDate : nowMs;
    const shift = getActiveSeasonalShift(currentMs, manualLocation, baseOffset);
    const shiftMs = shift * 60000;
    
    if (period === 'first') {
      if (!isCurrentlyDST) {
        setNowMs(prev => prev - shiftMs);
      }
      setManualDstOverride(true);
    } else {
      if (isCurrentlyDST) {
        setNowMs(prev => prev + shiftMs);
      }
      setManualDstOverride(false);
    }
  };

  const managedTimeShift = useMemo(() => {
    const currentMs = isSimulation ? simulationDate : nowMs;
    return resolveManagedTimeShift(seasonManagerConfig, currentMs, baseOffset);
  }, [seasonManagerConfig, isSimulation, simulationDate, nowMs, baseOffset]);

  const alternativeShift = selectedAlternativeShift;

  const effectiveShift = useMemo(() => {
    const currentMs = isSimulation ? simulationDate : nowMs;
    if (enableSeasonalVariation) {
      // Se "Aceitar Variação Sazonal Prevista" estiver LIGADA:
      let seasonalShift = 0;
      const loc = manualLocation || location;

      let locShift = 0;
      let managerShift = 0;

      if (loc) {
        locShift = getActiveSeasonalShift(currentMs, loc, baseOffset);
      }

      if (managedTimeShift.active) {
        managerShift = managedTimeShift.shiftMinutes;
      }

      // Aplica estritamente apenas o desvio sazonal ativo pedido sem sobrepor/duplicar desvios de 2h+
      if (managerShift !== 0) {
        seasonalShift = managerShift;
      } else {
        seasonalShift = locShift;
      }

      return seasonalShift + alternativeShift;
    } else {
      // Se estiver DESLIGADA: Horário padrão fixo sem variação sazonal
      return alternativeShift;
    }
  }, [enableSeasonalVariation, manualLocation, location, isSimulation, simulationDate, nowMs, baseOffset, alternativeShift, managedTimeShift]);



  // Dynamic Policy Engine: Refresh rules when simulation year changes
  const simulatedYear = useMemo(() => {
    const currentMs = isSimulation ? simulationDate : nowMs;
    const targetMs = historyMode ? currentMs + historyOffsetYears * 365.25 * 86400000 : currentMs;
    return new Date(targetMs).getUTCFullYear();
  }, [isSimulation, simulationDate, nowMs, historyMode, historyOffsetYears]);

  useEffect(() => {
    if (!manualLocation || !simulatedYear) return;
    
    const refreshYearlyRules = async () => {
      // Don't refresh if we're warping really fast
      if (isWarpActive && Math.abs(warpSpeed) > 100000) return;
      const currentManualLocation = manualLocationRef.current;
      if (!currentManualLocation) return;

      try {
        const results = await searchLocations(currentManualLocation.name, simulatedYear, currentLanguageName);
        if (results.length > 0) {
          const matched = results.find(r => r.name === currentManualLocation.name) || results[0];
          
          setManualLocation(prev => {
            if (!prev || prev.name !== matched.name || prev.name === "Custom") return prev;
            
            // Only update if data actually changed
            const isDataChanged = prev.dstInfo?.hasDst !== matched.dstInfo?.hasDst ||
                                 (prev.dstInfo?.start ?? null) !== (matched.dstInfo?.start ?? null) ||
                                 (prev.dstInfo?.end ?? null) !== (matched.dstInfo?.end ?? null) ||
                                 (prev.dstInfo?.shift ?? null) !== (matched.dstInfo?.shift ?? null) ||
                                 prev.timezoneOffset !== matched.timezoneOffset ||
                                 prev.description !== matched.description ||
                                 prev.policyHistory !== matched.policyHistory ||
                                 JSON.stringify((prev.alternativeTimes ?? []).sort()) !== JSON.stringify((matched.alternativeTimes ?? []).sort());
            
            if (!isDataChanged) return prev;

            // Update everything that might be translated or changed by year
            return { 
              ...prev, 
              dstInfo: matched.dstInfo, 
              timezoneOffset: matched.timezoneOffset,
              description: matched.description,
              policyHistory: matched.policyHistory
            };
          });
        }
      } catch (e) {
        console.error("Policy refresh failed:", e);
      }
    };

    const debounce = setTimeout(refreshYearlyRules, 10000);
    return () => clearTimeout(debounce);
  }, [simulatedYear, manualLocation?.name, currentLanguageName]);

  const displayDate = useMemo(() => {
    if (!historyMode) return new Date(nowMs);
    const d = new Date(nowMs);
    d.setFullYear(d.getFullYear() + historyOffsetYears);
    return d;
  }, [nowMs, historyMode, historyOffsetYears]);

  const activePeriod = useMemo(() => {
    const currentMs = isSimulation ? simulationDate : nowMs;
    const loc = manualLocation || location;

    if (loc?.seasonalPeriods && loc.seasonalPeriods.length > 0) {
      const year = new Date(currentMs + baseOffset * 60000).getUTCFullYear();
      const stableTimeMs = Math.floor(currentMs / 1000) * 1000;
      const currentStandardLocalEpoch = stableTimeMs + baseOffset * 60000;

      for (const period of loc.seasonalPeriods) {
        if (period.enabled === false) continue;
        const startUpper = period.startRule?.toUpperCase() || "";
        if (startUpper === 'PERMANENTE' || startUpper === 'PERMANENT') {
          if (!isVigenciaActive(period.vigencia, period.validityType, currentMs, year)) continue;
          return period;
        }
        if (!period.startRule || !period.endRule) continue;
        const startDate = resolveSeasonalRuleToDate(period.startRule, year);
        const endDate = resolveSeasonalRuleToDate(period.endRule, year);
        if (!startDate || !endDate) continue;

        const startOffsetMs = parseTimeToMinutes(period.startTime) * 60000;
        const endOffsetMs = parseTimeToMinutes(period.endTime) * 60000;

        const startLocalEpoch = startDate.getTime() + startOffsetMs;
        const endLocalEpoch = endDate.getTime() + endOffsetMs;

        let active = false;
        let seasonBaseYear = year;
        if (startLocalEpoch < endLocalEpoch) {
          active = currentStandardLocalEpoch >= startLocalEpoch && currentStandardLocalEpoch < endLocalEpoch;
        } else {
          active = currentStandardLocalEpoch >= startLocalEpoch || currentStandardLocalEpoch < endLocalEpoch;
        }

        if (active) {
          if (!isVigenciaActive(period.vigencia, period.validityType, currentMs, seasonBaseYear)) continue;
          return period;
        }
      }
    }

    // Fallback: If Season Manager has an active period from its time change schedule
    if (managedTimeShift?.active && managedTimeShift.activePeriod) {
      return {
        id: managedTimeShift.activePeriod.id,
        startRule: managedTimeShift.activePeriod.startRuleText,
        endRule: managedTimeShift.activePeriod.endRuleText,
        shift: String(managedTimeShift.activePeriod.shiftMinutes),
        vigencia: managedTimeShift.activePeriod.seasonLabel,
        enabled: true
      } as any;
    }
    return null;
  }, [isSimulation, simulationDate, nowMs, manualLocation, location, baseOffset, managedTimeShift]);

  const solarInfo = useMemo(() => {
    if (!effectiveCoords) return null;
    const currentMs = isSimulation ? simulationDate : nowMs;
    // Stabilize solar calculation frequency to once per second
    const stableNowMs = Math.floor(currentMs / 1000) * 1000;
    
    let targetDate = new Date(stableNowMs);
    if (historyMode) {
      targetDate.setFullYear(targetDate.getFullYear() + historyOffsetYears);
    }
    
    const result = calculateSolarTime(targetDate, effectiveCoords.longitude, effectiveCoords.latitude, baseOffset + effectiveShift, axialTilt);
    return (result.solarDate && !isNaN(result.solarDate.getTime())) ? result : null;
  }, [isNaN(isSimulation ? simulationDate : nowMs) ? 0 : Math.floor((isSimulation ? simulationDate : nowMs) / 1000), effectiveCoords?.latitude, effectiveCoords?.longitude, baseOffset, effectiveShift, historyMode, historyOffsetYears, isSimulation, nowMs, axialTilt]);

  const solarCivilDiff = useMemo(() => {
    if (!effectiveCoords || !solarInfo) {
      return formatSolarCivilDifference(0);
    }
    // Difference between Local Solar Time and Local Civil Time
    // Local Solar = UTC + longitude * 4 min + EoT
    // Local Civil = UTC + timezoneOffset min
    // Delta (Solar - Civil) = (longitude * 4 + EoT) - timezoneOffset
    const deltaMinutes = (effectiveCoords.longitude * 4) + solarInfo.equationOfTime - solarInfo.timezoneOffset;
    return formatSolarCivilDifference(deltaMinutes);
  }, [effectiveCoords?.longitude, solarInfo?.equationOfTime, solarInfo?.timezoneOffset]);

  const zenithHistory = useMemo(() => {
    if (!effectiveCoords) return [];
    const history = [];
    const now = new Date(isSimulation ? simulationDate : nowMs);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(startOfDay.getTime() + i * 60 * 60 * 1000);
      const result = calculateSolarTime(time, effectiveCoords.longitude, effectiveCoords.latitude, baseOffset + effectiveShift, axialTilt);
      history.push(result.altitude);
    }
    return history;
  }, [Math.floor((isSimulation ? simulationDate : nowMs) / 3600000), effectiveCoords?.latitude, effectiveCoords?.longitude, baseOffset, effectiveShift, isSimulation, axialTilt]);



  const isZeroLatitude = useMemo(() => {
    if (!effectiveCoords) return false;
    return isEquatorLatitude(effectiveCoords.latitude);
  }, [effectiveCoords?.latitude]);

  const rawAstronomicalSeasonInfo = useMemo(() => {
    if (!effectiveCoords) return null;
    if (isGenericTimezone(manualLocation) || isZeroLatitude) return null; // Latitude 0 & Generic timezones have NO seasons
    return getSeasonInfo(new Date(nowMs), effectiveCoords.latitude, baseOffset, axialTilt, manualLocation, baseOffset, effectiveCoords.longitude);
  }, [nowMs, effectiveCoords?.latitude, effectiveCoords?.longitude, baseOffset, axialTilt, manualLocation, isZeroLatitude]);

  const managedSeasonResult = useMemo(() => {
    if (isGenericTimezone(manualLocation) || isZeroLatitude) return { season: undefined, nextTransition: undefined };
    return resolveManagedSeason(
      rawAstronomicalSeasonInfo?.season,
      rawAstronomicalSeasonInfo?.nextTransition,
      seasonManagerConfig,
      nowMs,
      effectiveCoords ? (d: Date) => getSeasonInfo(d, effectiveCoords.latitude, baseOffset, axialTilt, manualLocation, baseOffset, effectiveCoords.longitude) : undefined,
      enableSeasonalVariation
    );
  }, [rawAstronomicalSeasonInfo, seasonManagerConfig, nowMs, effectiveCoords, baseOffset, axialTilt, manualLocation, isZeroLatitude, enableSeasonalVariation]);

  const seasonInfo = useMemo(() => {
    if (isGenericTimezone(manualLocation) || isZeroLatitude || !managedSeasonResult.season) return null; // Latitude 0 & Generic timezones have NO seasons
    return {
      season: managedSeasonResult.season,
      nextTransition: managedSeasonResult.nextTransition,
      isManual: managedSeasonResult.isManual,
      isPermanent: managedSeasonResult.isPermanent,
      durationMode: managedSeasonResult.durationMode,
      durationDaysOffset: managedSeasonResult.durationDaysOffset,
      cycleStatus: managedSeasonResult.cycleStatus
    };
  }, [managedSeasonResult, manualLocation, isZeroLatitude]);

  const activeSeasonalAccent = useMemo(() => {
    return getSeasonalAccent(seasonInfo?.season, seasonManagerConfig?.customSeasonOverrides);
  }, [seasonInfo?.season, seasonManagerConfig?.customSeasonOverrides]);

  const effectiveAccentColor = useMemo(() => {
    return isSeasonalColorEnabled ? activeSeasonalAccent.color : currentTheme.accentColor;
  }, [isSeasonalColorEnabled, activeSeasonalAccent.color, currentTheme.accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', currentTheme.bgColor);
    root.style.setProperty('--text-color', currentTheme.textColor);
    root.style.setProperty('--accent-color', effectiveAccentColor);
    root.style.setProperty('--accent-glow', isSeasonalColorEnabled ? activeSeasonalAccent.glow : 'rgba(251, 191, 36, 0.4)');
    root.style.setProperty('--frame-border', currentTheme.frameStyle?.border || 'none');
    
    document.body.style.backgroundColor = currentTheme.bgColor;
    document.body.style.color = currentTheme.textColor;
  }, [currentTheme, effectiveAccentColor, activeSeasonalAccent.glow, isSeasonalColorEnabled]);

  const upcomingTransition = useMemo(() => {
    if (!seasonInfo) return null;
    const diff = seasonInfo.nextTransition.date.getTime() - nowMs;
    // Approaching within 7 days
    if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
      return {
        name: seasonInfo.nextTransition.name.replace(/([A-Z])/g, ' $1').trim(),
        daysLeft: Math.ceil(diff / (24 * 60 * 60 * 1000))
      };
    }
    return null;
  }, [seasonInfo, nowMs]);

  // Derived primitives for stable effects
  const localCivilTimeMs = useMemo(() => {
    const currentMs = isSimulation ? simulationDate : nowMs;
    if (!solarInfo) return currentMs + baseOffset * 60000;
    return currentMs + solarInfo.timezoneOffset * 60000;
  }, [isSimulation, simulationDate, nowMs, solarInfo?.timezoneOffset, baseOffset]);

  const localCivilTime = useMemo(() => new Date(localCivilTimeMs), [localCivilTimeMs]);

  const localCivilDateStr = useMemo(() => {
    return `${localCivilTime.getUTCFullYear()}-${localCivilTime.getUTCMonth()}-${localCivilTime.getUTCDate()}`;
  }, [localCivilTime]);

  const dailySolarAltitudeHistory = useMemo(() => {
    if (!effectiveCoords) return [];
    
    const year = localCivilTime.getUTCFullYear();
    const month = localCivilTime.getUTCMonth();
    const day = localCivilTime.getUTCDate();
    const offset = solarInfo?.timezoneOffset ?? baseOffset;
    const altShift = alternativeShift;

    // We scan absolute UTC time starting slightly before midnight to slightly after the end of the day.
    // Timezones range from UTC-12 to UTC+14.
    const localMidnightStandardUtcMs = Date.UTC(year, month, day, 0, 0, 0) - (offset + altShift) * 60000;
    const searchStartUtcMs = localMidnightStandardUtcMs - 4 * 3600000;
    const searchEndUtcMs = localMidnightStandardUtcMs + 28 * 3600000;

    const points: any[] = [];
    
    // Scan by 1 physical hour steps
    for (let t = searchStartUtcMs; t <= searchEndUtcMs; t += 3600000) {
      // 1. Determine DST status at UTC time t
      const isDST = checkDSTForTime(t, manualLocation, offset);
      const dstShift = isDST ? getActiveSeasonalShift(t, manualLocation, offset) : 0;
      const totalOffset = offset + dstShift + altShift + 180;
      
      // 2. Compute civil time at absolute UTC time t
      const civilMs = t + totalOffset * 60000;
      const civilDate = new Date(civilMs);
      
      // 3. Keep point only if it falls on our target civil day
      if (
        civilDate.getUTCFullYear() === year &&
        civilDate.getUTCMonth() === month &&
        civilDate.getUTCDate() === day
      ) {
        const result = calculateSolarTime(new Date(t), effectiveCoords.longitude, effectiveCoords.latitude, totalOffset, axialTilt);
        points.push({
          absoluteTimeMs: t,
          civilHour: civilDate.getUTCHours(),
          civilMinutes: civilDate.getUTCMinutes(),
          altitude: result.altitude,
          isDST,
          totalOffset,
          label: `${String(civilDate.getUTCHours()).padStart(2, '0')}:${String(civilDate.getUTCMinutes()).padStart(2, '0')}`,
        });
      }
    }

    // Sort points chronologically
    points.sort((a, b) => a.absoluteTimeMs - b.absoluteTimeMs);

    // Add final end-of-day boundary point to draw the curve fully to the right edge (23:59:59.999 / 24:00)
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const endOfCivilDayLocalMs = Date.UTC(year, month, day, 23, 59, 59, 999);
      const endAbsoluteMs = endOfCivilDayLocalMs - lastPoint.totalOffset * 60000;
      const endResult = calculateSolarTime(new Date(endAbsoluteMs), effectiveCoords.longitude, effectiveCoords.latitude, lastPoint.totalOffset, axialTilt);
      
      points.push({
        absoluteTimeMs: endAbsoluteMs,
        civilHour: 24,
        civilMinutes: 0,
        altitude: endResult.altitude,
        isDST: lastPoint.isDST,
        totalOffset: lastPoint.totalOffset,
        label: "24:00",
      });
    }

    // Fallback if empty
    if (points.length === 0) {
      for (let h = 0; h <= 24; h++) {
        let timeMs;
        if (h === 24) {
          timeMs = Date.UTC(year, month, day, 23, 59, 59, 999);
        } else {
          timeMs = Date.UTC(year, month, day, h, 0, 0, 0);
        }
        const totalOffset = offset + altShift;
        const absoluteUtcMs = timeMs - (totalOffset * 60000);
        const result = calculateSolarTime(new Date(absoluteUtcMs), effectiveCoords.longitude, effectiveCoords.latitude, totalOffset, axialTilt);
        points.push({
          absoluteTimeMs: absoluteUtcMs,
          civilHour: h,
          civilMinutes: 0,
          altitude: result.altitude,
          isDST: false,
          totalOffset,
          label: `${String(h).padStart(2, '0')}:00`,
        });
      }
    }

    return points;
  }, [
    localCivilDateStr,
    effectiveCoords?.latitude,
    effectiveCoords?.longitude,
    baseOffset,
    alternativeShift,
    manualLocation,
    solarInfo,
    axialTilt,
  ]);

  // Sync inputs at a stable 1-second resolution using a separate memoized trigger
  const syncTrigger = Math.floor(nowMs / 1000);
  
  // Monitor seasonal and rule (vigência) changes
  useEffect(() => {
    if (!effectiveCoords) return;

    const currentSeason = seasonInfo?.season || null;
    const currentIsDST = isCurrentlyDST;
    const currentShift = effectiveShift;
    const currentLocName = manualLocation?.name || (isPt ? "Local" : "Local");

    // Initialize refs on first load to prevent flash on mount
    if (prevSeasonRef.current === null) {
      prevSeasonRef.current = currentSeason;
      prevIsDSTRef.current = currentIsDST;
      prevShiftRef.current = currentShift;
      prevManualLocationRef.current = currentLocName;
      return;
    }

    // Update location track
    prevManualLocationRef.current = currentLocName;

    // 1. Season transition
    if (currentSeason !== prevSeasonRef.current && currentSeason !== null && prevSeasonRef.current !== null) {
      const oldSeason = prevSeasonRef.current;
      
      let title = "";
      let description = "";
      let colors: string[] = [];

      if (isPt) {
        if (currentSeason === 'summer') {
          title = "☀️ Entrada no Período de Verão";
          description = `O ciclo solar mudou de ${oldSeason === 'spring' ? 'Primavera' : oldSeason === 'autumn' ? 'Outono' : oldSeason} para Verão em ${currentLocName}.`;
          colors = ['rgba(245, 158, 11, 0.45)', 'rgba(239, 68, 68, 0.1)'];
        } else if (currentSeason === 'winter') {
          title = "❄️ Entrada no Período de Inverno";
          description = `O ciclo solar mudou de ${oldSeason === 'autumn' ? 'Outono' : oldSeason === 'spring' ? 'Primavera' : oldSeason} para Inverno em ${currentLocName}.`;
          colors = ['rgba(14, 165, 233, 0.45)', 'rgba(99, 102, 241, 0.1)'];
        } else {
          title = "🍂 Transição de Estação";
          description = `O ciclo solar transitou de ${oldSeason === 'summer' ? 'Verão' : oldSeason === 'winter' ? 'Inverno' : oldSeason} para ${currentSeason === 'spring' ? 'Primavera' : 'Outono'} em ${currentLocName}.`;
          colors = ['rgba(168, 85, 247, 0.45)', 'rgba(236, 72, 153, 0.1)'];
        }
      } else {
        if (currentSeason === 'summer') {
          title = "☀️ Summer Period Commenced";
          description = `Solar cycle changed from ${oldSeason} to Summer in ${currentLocName}.`;
          colors = ['rgba(245, 158, 11, 0.45)', 'rgba(239, 68, 68, 0.1)'];
        } else if (currentSeason === 'winter') {
          title = "❄️ Winter Period Commenced";
          description = `Solar cycle changed from ${oldSeason} to Winter in ${currentLocName}.`;
          colors = ['rgba(14, 165, 233, 0.45)', 'rgba(99, 102, 241, 0.1)'];
        } else {
          title = "🍂 Seasonal Transition";
          description = `Solar cycle transitioned from ${oldSeason} to ${currentSeason} in ${currentLocName}.`;
          colors = ['rgba(168, 85, 247, 0.45)', 'rgba(236, 72, 153, 0.1)'];
        }
      }

      setTransitionNotification({
        type: 'season',
        title,
        description,
        colors
      });

      // Play short sound alert if enabled in Season Manager
      if (seasonManagerConfig?.soundAlertsEnabled && seasonManagerConfig?.soundAlertOnSeasonChange !== false) {
        playSeasonalSoundAlert(
          seasonManagerConfig.soundAlertType || 'chime',
          seasonManagerConfig.soundVolume ?? 0.65,
          currentSeason as SeasonType
        );
      }
    }
    // 2. DST change
    else if (currentIsDST !== prevIsDSTRef.current && prevIsDSTRef.current !== null) {
      let title = "";
      let description = "";
      let colors: string[] = [];

      if (currentIsDST) {
        if (isPt) {
          title = "☀️ Vigência de Regras: Horário de Verão";
          description = `Regra sazonal de adiantamento ativada em ${currentLocName} (+${currentShift} min).`;
        } else {
          title = "☀️ Daylight Saving Time Active";
          description = `Seasonal advancement rule enabled in ${currentLocName} (+${currentShift} min).`;
        }
        colors = ['rgba(251, 191, 36, 0.45)', 'rgba(217, 119, 6, 0.1)'];
      } else {
        if (isPt) {
          title = "❄️ Retorno ao Horário de Inverno / Padrão";
          description = `Regra sazonal finalizada em ${currentLocName}. Retorno ao horário padrão.`;
        } else {
          title = "❄️ Return to Standard Time";
          description = `Seasonal rule deactivated in ${currentLocName}. Returned to standard time.`;
        }
        colors = ['rgba(56, 189, 248, 0.45)', 'rgba(30, 64, 175, 0.1)'];
      }

      setTransitionNotification({
        type: 'dst',
        title,
        description,
        colors
      });

      // Play short sound alert if enabled in Season Manager
      if (seasonManagerConfig?.soundAlertsEnabled && seasonManagerConfig?.soundAlertOnTimeChange !== false) {
        playSeasonalSoundAlert(
          seasonManagerConfig.soundAlertType || 'bell',
          seasonManagerConfig.soundVolume ?? 0.65
        );
      }
    }
    // 3. Shift value changed directly (rule change)
    else if (currentShift !== prevShiftRef.current && prevShiftRef.current !== null) {
      let title = "";
      let description = "";
      let colors: string[] = [];

      if (isPt) {
        title = "⏳ Nova Vigência de Regras Sazonais";
        description = `O deslocamento de tempo sazonal alterou de ${prevShiftRef.current} min para ${currentShift} min em ${currentLocName}.`;
      } else {
        title = "⏳ Seasonal Rule Enforcement Changed";
        description = `Seasonal time shift changed from ${prevShiftRef.current} min to ${currentShift} min in ${currentLocName}.`;
      }
      colors = ['rgba(139, 92, 246, 0.45)', 'rgba(236, 72, 153, 0.1)'];

      setTransitionNotification({
        type: 'rule',
        title,
        description,
        colors
      });

      // Play short sound alert if enabled in Season Manager
      if (seasonManagerConfig?.soundAlertsEnabled && seasonManagerConfig?.soundAlertOnTimeChange !== false) {
        playSeasonalSoundAlert(
          seasonManagerConfig.soundAlertType || 'bell',
          seasonManagerConfig.soundVolume ?? 0.65
        );
      }
    }

    // Update refs to track current values
    prevSeasonRef.current = currentSeason;
    prevIsDSTRef.current = currentIsDST;
    prevShiftRef.current = currentShift;
  }, [seasonInfo?.season, isCurrentlyDST, effectiveShift, manualLocation, effectiveCoords, isPt]);

  const triggerFirework = React.useCallback((color: string, intensity: 'low' | 'high') => {
      const id = Date.now() + Math.random();
      setFireworksList(prev => [...prev, { id, color, intensity }]);
      setTimeout(() => {
          setFireworksList(prev => prev.filter(f => f.id !== id));
      }, intensity === 'high' ? 6000 : 3000);
  }, []);
  
  const fireworksRef = React.useRef(0);
  const lastVibrationDateRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!solarInfo?.eventTimes?.solarNoon) return;
    const noonTime = solarInfo.eventTimes.solarNoon.getTime();
    const nowTime = nowMs;
    
    // Notifications
    if (solarNoonNotification && Math.abs(noonTime - nowTime) < 10000) {
      const today = formatLocalDate(new Date(nowMs));
      if (localStorage.getItem('lastNoonNotified') !== today) {
          if (Notification.permission === 'granted') {
              new Notification('Solar Noon', { body: 'Solar noon has occurred!' });
          } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
          }
          localStorage.setItem('lastNoonNotified', today);
      }
    }

    // Vibration
    const dateStr = new Date(noonTime).toDateString();
    if (Math.abs(nowTime - noonTime) < 1000 && lastVibrationDateRef.current !== dateStr) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200); // Subtle pulse
      }
      lastVibrationDateRef.current = dateStr;
    }
  }, [solarInfo?.eventTimes?.solarNoon, solarNoonNotification, nowMs]);

  const solarInfoRef = React.useRef(solarInfo);
  const triggerFireworkRef = React.useRef(triggerFirework);

  useEffect(() => {
    solarInfoRef.current = solarInfo;
    triggerFireworkRef.current = triggerFirework;
  }, [solarInfo, triggerFirework]);
  
  // Civil New Year (00:00:00 01/01 to 00:12:00 01/01)
  /*
  useEffect(() => {
    // ...
  }, [Math.floor(localCivilTimeMs / 1000)]);
  */
  
  const lastTriggeredMsRef = React.useRef(0);
  // Removed conflicting useEffect here
  const handleManualDateChange = (dateStr: string) => {
    setLocalDateInput(dateStr);
    if (!dateStr || dateStr.trim() === '') return;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [year, month, day] = parts;
    if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return;
    
    // Extract time from current localTimeInput or fallback to localCivilTime
    let hours = localCivilTime.getUTCHours();
    let minutes = localCivilTime.getUTCMinutes();
    let seconds = localCivilTime.getUTCSeconds();
    if (localTimeInput) {
      const tParts = localTimeInput.split(':').map(Number);
      if (tParts.length >= 2 && !isNaN(tParts[0]) && !isNaN(tParts[1])) {
        hours = Math.min(23, Math.max(0, tParts[0]));
        minutes = Math.min(59, Math.max(0, tParts[1]));
        seconds = (!isNaN(tParts[2])) ? Math.min(59, Math.max(0, tParts[2])) : 0;
      }
    }

    // Calculate target civil local time represented as a UTC timestamp
    const targetCivilMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(targetCivilMs)) return;

    // Approximate UTC using standard offset
    const estBaseUtcMs = targetCivilMs - ((baseOffset + selectedAlternativeShift) * 60000);
    
    // Check DST status for the approximate timestamp
    let isTargetDST = false;
    if (manualDstOverride === true) {
      isTargetDST = true;
    } else if (manualDstOverride === false) {
      isTargetDST = false;
    } else {
      isTargetDST = checkDSTForTime(estBaseUtcMs, manualLocation, baseOffset);
    }
    
    const dstShift = isTargetDST ? (getActiveSeasonalShift(estBaseUtcMs, manualLocation, baseOffset) || (manualLocation?.dstInfo?.shift ?? 60)) : 0;
    const targetEffectiveShift = dstShift + selectedAlternativeShift;
    let finalUtcMs = targetCivilMs - ((baseOffset + targetEffectiveShift) * 60000);

    // Second pass verification to eliminate edge boundary jumps
    if (manualDstOverride === null) {
      const verifiedDST = checkDSTForTime(finalUtcMs, manualLocation, baseOffset);
      if (verifiedDST !== isTargetDST) {
        const verifiedShift = verifiedDST ? (getActiveSeasonalShift(finalUtcMs, manualLocation, baseOffset) || (manualLocation?.dstInfo?.shift ?? 60)) : 0;
        finalUtcMs = targetCivilMs - ((baseOffset + verifiedShift + selectedAlternativeShift) * 60000);
      }
    }

    if (!isNaN(finalUtcMs) && isFinite(finalUtcMs)) {
      setNowMs(finalUtcMs);
      handleWarpToggle(true);
    }
  };

  const handleManualTimeChange = (timeStr: string) => {
    setLocalTimeInput(timeStr);
    if (!timeStr || timeStr.trim() === '') return;
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return;
    const [h, m, s] = parts;
    if (h < 0 || h > 23 || m < 0 || m > 59) return;
    const safeSeconds = (s !== undefined && !isNaN(s)) ? Math.min(59, Math.max(0, s)) : 0;

    // Extract year, month, day from current localDateInput or fallback to localCivilTime
    let year = localCivilTime.getUTCFullYear();
    let month = localCivilTime.getUTCMonth();
    let day = localCivilTime.getUTCDate();
    if (localDateInput) {
      const dParts = localDateInput.split('-').map(Number);
      if (dParts.length === 3 && !dParts.some(isNaN) && dParts[0] >= 1000 && dParts[1] >= 1 && dParts[1] <= 12 && dParts[2] >= 1 && dParts[2] <= 31) {
        year = dParts[0];
        month = dParts[1] - 1;
        day = dParts[2];
      }
    }

    // Calculate target civil local time represented as a UTC timestamp
    const targetCivilMs = Date.UTC(year, month, day, h, m, safeSeconds);
    if (isNaN(targetCivilMs)) return;

    // Approximate UTC using standard offset
    const estBaseUtcMs = targetCivilMs - ((baseOffset + selectedAlternativeShift) * 60000);
    
    // Check DST status for the approximate timestamp
    let isTargetDST = false;
    if (manualDstOverride === true) {
      isTargetDST = true;
    } else if (manualDstOverride === false) {
      isTargetDST = false;
    } else {
      isTargetDST = checkDSTForTime(estBaseUtcMs, manualLocation, baseOffset);
    }
    
    const dstShift = isTargetDST ? (getActiveSeasonalShift(estBaseUtcMs, manualLocation, baseOffset) || (manualLocation?.dstInfo?.shift ?? 60)) : 0;
    const targetEffectiveShift = dstShift + selectedAlternativeShift;
    let finalUtcMs = targetCivilMs - ((baseOffset + targetEffectiveShift) * 60000);

    // Second pass verification to eliminate edge boundary jumps
    if (manualDstOverride === null) {
      const verifiedDST = checkDSTForTime(finalUtcMs, manualLocation, baseOffset);
      if (verifiedDST !== isTargetDST) {
        const verifiedShift = verifiedDST ? (getActiveSeasonalShift(finalUtcMs, manualLocation, baseOffset) || (manualLocation?.dstInfo?.shift ?? 60)) : 0;
        finalUtcMs = targetCivilMs - ((baseOffset + verifiedShift + selectedAlternativeShift) * 60000);
      }
    }

    if (!isNaN(finalUtcMs) && isFinite(finalUtcMs)) {
      setNowMs(finalUtcMs);
      handleWarpToggle(true);
    }
  };

  const goToSolarNoon = () => {
    if (solarInfo?.eventTimes?.solarNoon) {
      setNowMs(solarInfo.eventTimes.solarNoon.getTime());
      handleWarpToggle(true);
    }
  };

  // GPS Tracking with optimized updates
  const fetchCurrentLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation(prev => {
          if (prev.coords && 
              Math.abs(prev.coords.latitude - lat) < 0.001 && 
              Math.abs(prev.coords.longitude - lng) < 0.001) {
            return { ...prev, loading: false, error: null };
          }
          
          return {
            coords: { latitude: lat, longitude: lng },
            loading: false,
            error: null
          };
        });
      },
      (error) => {
        setLocation(prev => ({ ...prev, loading: false, error: error.message }));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 } // 10 min cache
    );
  }, []);

  useEffect(() => {
    // Parse deep-link URL parameters on startup
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get('lat');
    const urlLng = params.get('lng');
    const urlName = params.get('name');
    const urlTz = params.get('tz');

    if (urlLat && urlLng) {
      const lat = parseFloat(urlLat);
      const lng = parseFloat(urlLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const name = urlName || `Coordenadas (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
        const tz = urlTz ? parseFloat(urlTz) : (lng * 4); // default to geographic offset
        
        selectLocation({
          name,
          latitude: lat,
          longitude: lng,
          description: `Compartilhado: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          timezoneOffset: tz,
          alternativeTimes: []
        });
      }
    } else {
      fetchCurrentLocation();
    }
    
    // Refresh every 10 minutes to balance battery vs accuracy
    const interval = setInterval(fetchCurrentLocation, 600000);
    return () => clearInterval(interval);
  }, []);

  const handleShareLocation = () => {
    if (!effectiveCoords) {
      alert(language === 'pt' ? 'Coordenadas não disponíveis para compartilhamento.' : 'Coordinates not available for sharing.');
      return;
    }

    const lat = effectiveCoords.latitude;
    const lng = effectiveCoords.longitude;
    const name = manualLocation ? manualLocation.name : (language === 'pt' ? 'Minha Localização' : 'My Location');
    const tz = manualLocation ? (isMoroccoLocation(manualLocation) ? getMoroccoTimezoneOffset(isSimulation ? simulationDate : nowMs) : manualLocation.timezoneOffset) : (new Date().getTimezoneOffset() * -1);

    // Generate deep link
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lng', lng.toString());
    url.searchParams.set('name', name);
    url.searchParams.set('tz', tz.toString());

    // Copy to clipboard
    navigator.clipboard.writeText(url.toString())
      .then(() => {
        setShareToastMessage(language === 'pt' ? 'Link copiado para a área de transferência!' : 'Link copied to clipboard!');
        setTimeout(() => setShareToastMessage(null), 3000);
      })
      .catch((err) => {
        console.error('Could not copy link: ', err);
        alert(language === 'pt' ? `Aqui está o seu link: ${url.toString()}` : `Here is your link: ${url.toString()}`);
      });
  };

  // Stabilize background gradient updates (every ~10 solar seconds)
  const bgGradient = useMemo(() => {
    if (!solarInfo) return "linear-gradient(180deg, #020617 0%, #000000 100%)";
    return getSolarGradient(solarInfo.altitude);
  }, [solarInfo?.altitude]);

  const solarProgress = useMemo(() => {
    if (!solarInfo) return 50;
    const date = solarInfo.solarDate;
    const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const progress = (minutes / 1440) * 100;
    return isNaN(progress) ? 50 : progress;
  }, [solarInfo]);

  // Stabilize clock time object
  const clockTime = useMemo(() => {
    if (solarInfo) return solarInfo.solarDate;
    // Stabilize to 250ms for normal clock display when solar info is missing
    const stableNow = Math.floor(nowMs / 250) * 250;
    return new Date(stableNow);
  }, [solarInfo, Math.floor(nowMs / 250)]);

  const formatTime = (date: Date, useUTC: boolean = false, offsetMinutes?: number) => {
    if (!date || isNaN(date.getTime())) return "--:--";
    
    let d = date;
    if (offsetMinutes !== undefined && !useUTC) {
      // Create a virtual date that matches the target offset when viewed through UTC methods
      // but here we just want to format it. Browser offset is date.getTimezoneOffset() (negative of UTC offset)
      const browserOffset = -date.getTimezoneOffset();
      d = new Date((date?.getTime() || 0) + (offsetMinutes - browserOffset) * 60000);
    }

    return d.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: useUTC ? 'UTC' : undefined 
    });
  };

  const formatFullTime = (date: Date, useUTC: boolean = false, offsetMinutes?: number) => {
    if (!date || isNaN(date.getTime())) return "--:--:--";
    
    let d = date;
    if (offsetMinutes !== undefined && !useUTC) {
      const browserOffset = -date.getTimezoneOffset();
      d = new Date((date?.getTime() || 0) + (offsetMinutes - browserOffset) * 60000);
    }

    return d.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false,
      timeZone: useUTC ? 'UTC' : undefined
    });
  };

  const twilightInfo = useMemo(() => {
    if (!solarInfo || !solarInfo.eventTimes) return null;
    const alt = solarInfo.altitude;
    
    // Check if we are between -18 and 0 (sun is below horizon but still providing ambient light)
    if (alt < 0 && alt >= -18) {
      const times = solarInfo.eventTimes;
      const timezoneOffset = solarInfo.timezoneOffset;
      const date = solarInfo.solarDate;
      const isMorning = date.getUTCHours() < 12; // Simple morning/evening check based on solar time

      let type: 'civil' | 'nautical' | 'astronomical' = 'civil';
      let start: Date | null = null;
      let end: Date | null = null;

      if (alt >= -6) {
        type = 'civil';
        if (isMorning) {
          start = times.civilDawn;
          end = times.sunrise;
        } else {
          start = times.sunset;
          end = times.civilDusk;
        }
      } else if (alt >= -12) {
        type = 'nautical';
        if (isMorning) {
          start = times.nauticalDawn;
          end = times.civilDawn;
        } else {
          start = times.civilDusk;
          end = times.nauticalDusk;
        }
      } else {
        type = 'astronomical';
        if (isMorning) {
          start = times.astronomicalDawn;
          end = times.nauticalDawn;
        } else {
          start = times.nauticalDusk;
          end = times.astronomicalDusk;
        }
      }

      // Format times
      const formatEvent = (d: Date | null) => {
        if (!d) return '--:--';
        const shifted = new Date(d.getTime() + timezoneOffset * 60000);
        return formatTime(shifted, true);
      };

      let title = "";
      let desc = "";
      let colorClass = "";
      let iconColor = "";

      if (type === 'civil') {
        title = isPt ? "Crepúsculo Civil" : "Civil Twilight";
        desc = isPt 
          ? "O sol está abaixo do horizonte, mas ainda fornece luz ambiente considerável."
          : "The sun is below the horizon, but still provides substantial ambient light.";
        colorClass = "bg-sky-500/10 border-sky-500/30 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.1)]";
        iconColor = "text-sky-400";
      } else if (type === 'nautical') {
        title = isPt ? "Crepúsculo Náutico (Dia Visível)" : "Nautical Twilight (Visible Day)";
        desc = isPt
          ? "Luz solar residual disponível. O horizonte marítimo ainda é identificável."
          : "Residual sunlight available. The marine horizon is still identifiable.";
        colorClass = "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(129,140,248,0.1)]";
        iconColor = "text-indigo-400";
      } else {
        title = isPt ? "Crepúsculo Astronômico (-18° a -12°)" : "Astronomical Twilight (-18° to -12°)";
        desc = isPt
          ? "O céu está quase totalmente escuro; o sol fornece apenas um brilho residual mínimo."
          : "The sky is nearly completely dark; the sun provides only minimal residual glow.";
        colorClass = "bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-[0_0_15px_rgba(167,139,250,0.1)]";
        iconColor = "text-violet-400";
      }

      const periodStr = isPt 
        ? `Período: das ${formatEvent(start)} às ${formatEvent(end)}`
        : `Period: from ${formatEvent(start)} to ${formatEvent(end)}`;

      return {
        active: true,
        type,
        title,
        desc,
        periodStr,
        colorClass,
        iconColor,
        altitude: alt,
        isMorning,
        startTimeStr: formatEvent(start),
        endTimeStr: formatEvent(end)
      };
    }
    
    return null;
  }, [solarInfo, language]);

  const lastUpdateRef = React.useRef(0);

  useEffect(() => {
    if (isTemporalFocusedRef.current) return;

    const second = Math.floor(localCivilTimeMs / 1000);
    if (second === lastUpdateRef.current) return;
    lastUpdateRef.current = second;

    const newTime = formatFullTime(localCivilTime, true);
    const newDate = formatLocalDate(localCivilTime);
    setLocalTimeInput(newTime);
    setLocalDateInput(newDate);
  }, [syncTrigger]);

  const utcOffsetLabel = useMemo(() => {
    if (!solarInfo) return "UTC--";
    const totalMinutes = solarInfo.timezoneOffset;
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const minutes = Math.abs(totalMinutes) % 60;
    const sign = totalMinutes >= 0 ? "+" : "-";
    return `UTC${sign}${hours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ""}`;
  }, [solarInfo]);

  function selectLocation(loc: LocationSuggestion) {
    let finalLoc = loc;
    if (isMoroccoLocation(loc)) {
      const currentMs = isSimulation ? simulationDate : nowMs;
      finalLoc = {
        ...loc,
        timezoneOffset: getMoroccoTimezoneOffset(currentMs),
        policyHistory: loc.policyHistory || getMoroccoPolicyHistory(language === 'pt'),
        dstInfo: getMoroccoDstInfo(currentMs)
      };
    }
    setManualLocation(finalLoc);
    if (finalLoc.seasonalPeriods && finalLoc.seasonalPeriods.length > 0) {
      setEnableSeasonalVariation(true);
    }
    setSelectedUtcOffset(null); // Clear manual forced dropdown override so location timezone takes effect
    setGlobalCustomTimezoneOffset(finalLoc.timezoneOffset ?? 0);
    setGlobalTimezoneMode('custom');
    setIsSearchOpen(false);
    
    // Save to history only if not a generic timezone
    if (!isGenericTimezone(loc)) {
      if (user) {
        saveHistoryEntry(user.uid, loc);
      }
      setLocationHistory(prev => {
        const filtered = prev.filter(p => p.name !== loc.name);
        const next = [loc, ...filtered];
        setTimeout(() => localStorage.setItem('helios_history', JSON.stringify(next)), 0);
        return next;
      });
    }
  }

  const resetToGPS = () => {
    setManualLocation(null);
    setSelectedUtcOffset(null);
    setGlobalTimezoneMode('local');
    setIsSearchOpen(false);
  };

  const formatSubsolarLat = (lat: number | undefined): string => {
    if (lat === undefined || lat === null || isNaN(lat)) return "--";
    const absLat = Math.abs(lat);
    
    if (absLat < 0.1) return "0° (Equador)";
    
    const dir = lat >= 0 ? "N" : "S";
    const base = `${absLat.toFixed(2)}° ${dir}`;
    
    const currentTilt = axialTilt !== undefined && !isNaN(axialTilt) ? axialTilt : 23.44;
    if (absLat >= currentTilt - 0.05) {
        const tropico = lat >= 0 ? " (Trópico de Câncer)" : " (Trópico de Capricórnio)";
        return `${base}${tropico}`;
    }
    
    return base;
  };

  const formatSubsolarLon = (lon: number | undefined): string => {
    if (lon === undefined || lon === null || isNaN(lon)) return "--";
    
    if (Math.abs(lon) < 0.1) return "Meridiano de Greenwich";
    if (Math.abs(lon) >= 179.9) return "Linha Internacional de Data";
    
    const dir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lon).toFixed(1)}° ${dir}`;
  };

  const formatNumericLon = (lon: number | undefined): string => {
    if (lon === undefined || lon === null || isNaN(lon)) return "--";
    const norm = ((lon + 180) % 360 + 360) % 360 - 180;
    const dir = norm >= 0 ? "E" : "W";
    return `${Math.abs(norm).toFixed(4)}° ${dir}`;
  };

  const formatDigit = (num: number) => {
    if (isNaN(num)) return "00";
    return num.toString().padStart(2, '0');
  };

  const starsOpacity = useMemo(() => {
    if (currentTheme.name === "Anos 1910") return 0;
    if (!solarInfo) return 0.05;
    const alt = solarInfo.altitude;
    // Stars invisible above 0 alt, fully visible below -18 alt
    if (alt > 0) return 0;
    if (alt < -18) return 0.35;
    // Lerp between 0 and -18
    return (Math.abs(alt) / 18) * 0.35;
  }, [solarInfo?.altitude, currentTheme.name]);

  const solarEvents = useMemo(() => {
     if (!solarInfo || !effectiveCoords) return [];
     const events = [


      { label: 'Astronomical Dawn', key: 'astronomicalDawn' },
      { label: 'Nautical Dawn', key: 'nauticalDawn' },
      { label: 'Civil Dawn', key: 'civilDawn' },
      { label: 'Sunrise', key: 'sunrise' },
      { label: 'Full Sun Above Horizon (Rising)', key: 'fullSunAboveHorizonRise' },
      { label: 'Solar Noon', key: 'solarNoon' },
      { label: 'Full Sun Above Horizon (Descending)', key: 'fullSunAboveHorizonSet' },
      { label: 'Sunset', key: 'sunset' },
      { label: 'Civil Dusk', key: 'civilDusk' },
      { label: 'Nautical Dusk', key: 'nauticalDusk' },
      { label: 'Astronomical Dusk', key: 'astronomicalDusk' },
      { label: 'Solar Midnight', key: 'solarMidnight' }
    ];

    return events.map(event => {
      const eventDate = solarInfo.eventTimes[event.key as keyof typeof solarInfo.eventTimes];
      const eventState = solarInfo.eventStates?.[event.key as keyof typeof solarInfo.eventTimes] || (eventDate ? 'normal' : 'never_occurs');
      let eventSolar: Date | null = null;
      if (eventDate && effectiveCoords) {
        if (event.key === 'solarNoon') {
          eventSolar = new Date(0);
          eventSolar.setUTCFullYear(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
          eventSolar.setUTCHours(12, 0, 0, 0);
        } else if (event.key === 'solarMidnight') {
          eventSolar = new Date(0);
          eventSolar.setUTCFullYear(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
          eventSolar.setUTCHours(0, 0, 0, 0);
        } else {
          eventSolar = calculateSolarTime(eventDate, effectiveCoords.longitude, effectiveCoords.latitude, solarInfo.timezoneOffset, axialTilt).solarDate;
        }
      }
      return { ...event, eventDate, eventSolar, eventState };
    });
  }, [solarInfo, effectiveCoords, axialTilt]);

  const sanitizeDateString = (s: string | undefined) => {
    if (!s) return "";
    // Keep only the first 16 characters if it matches DD-MM-YYYY HH:mm roughly
    // Or just truncate to a reasonable length
    const matched = s.match(/^\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{2}/);
    return matched ? matched[0] : s.substring(0, 20);
  };


  const handleWarpToggle = (active: boolean) => {
    setIsWarpActive(active);
  };

  const civilDawnTimeStr = useMemo(() => {
    if (!solarInfo?.eventTimes?.civilDawn) return "--:--";
    const localMs = solarInfo.eventTimes.civilDawn.getTime() + (solarInfo.timezoneOffset || 0) * 60000;
    return formatFullTime(new Date(localMs), true);
  }, [solarInfo?.eventTimes?.civilDawn, solarInfo?.timezoneOffset]);

  const civilDuskTimeStr = useMemo(() => {
    if (!solarInfo?.eventTimes?.civilDusk) return "--:--";
    const localMs = solarInfo.eventTimes.civilDusk.getTime() + (solarInfo.timezoneOffset || 0) * 60000;
    return formatFullTime(new Date(localMs), true);
  }, [solarInfo?.eventTimes?.civilDusk, solarInfo?.timezoneOffset]);

  const jumpToCivilTwilight = (type: 'start' | 'end') => {
    if (!effectiveCoords) return;
    try {
      let target: Date | null = null;
      if (solarInfo?.eventTimes) {
        target = type === 'start' ? solarInfo.eventTimes.civilDawn : solarInfo.eventTimes.civilDusk;
      }
      
      if (!target || isNaN(target.getTime())) {
        const times = SunCalc.getTimes(new Date(nowMs), effectiveCoords.latitude, effectiveCoords.longitude);
        target = type === 'start' ? times.dawn : times.dusk;
      }
      
      if (target && target instanceof Date && !isNaN(target.getTime())) {
        setNowMs(target.getTime());
        handleWarpToggle(true);
      }
    } catch (err) {
      console.warn("Could not calculate twilight jump:", err);
    }
  };

  return (
    <motion.div 
      className={`h-screen w-full flex flex-col transition-colors duration-500 text-white overflow-hidden relative ${currentTheme.className || ''}`}
      initial={{ background: bgGradient }}
      animate={{ background: bgGradient }}
      transition={{ duration: 1, ease: "easeInOut" }}
      style={{ ...currentTheme.frameStyle, ...currentTheme.fontStyle }}
    >
      <AnimatePresence>
        {flashState.active && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ backgroundColor: flashState.color }}
          />
        )}
      </AnimatePresence>
      {showThemeModal && (
        <ThemeSelector
          isOpen={showThemeModal}
          onClose={() => setShowThemeModal(false)}
          onSelect={(theme) => { setCurrentTheme(theme); setShowThemeModal(false); }}
          onGenerate={generateTheme}
          predefinedThemes={PREDEFINED_THEMES}
          currentTheme={currentTheme}
          isGenerating={isGenerating}
          prompt={customThemePrompt}
          setPrompt={setCustomThemePrompt}
          isSeasonalColorEnabled={isSeasonalColorEnabled}
          onToggleSeasonalColor={setIsSeasonalColorEnabled}
          currentSeason={seasonInfo?.season}
          language={language}
          onOpenSeasonManager={() => setShowSeasonManagerModal(true)}
        />
      )}


      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={currentTheme.style} />

      {/* Background Mesh Overlay (Stars) */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:40px_40px] pointer-events-none transition-opacity duration-1000"
        style={{ opacity: starsOpacity }}
      />

      <header className="h-10 px-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/20 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center">
            <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
          </div>
          <span className="font-bold tracking-tight text-sm uppercase">
            Helios <span className="font-light opacity-60 text-[9px] italic ml-1">Solar Chronometer</span>
          </span>
        </div>
        
        <div className="flex gap-4 items-center text-xs font-mono">
          <SavedLocationsSwitcher user={user} onSelect={selectLocation} />
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setShowSubsolarModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full hover:bg-amber-400/20 transition-all text-amber-300 group shadow-sm cursor-pointer"
              title={language === 'pt' ? 'Mapa Projeção D3 do Ponto Subsolar' : 'D3 Subsolar Point World Map Projection'}
            >
              <Globe className="w-3 h-3 text-amber-400 animate-spin-slow" />
              <span className="uppercase tracking-widest text-[8px] font-bold">
                {language === 'pt' ? 'Ponto Subsolar' : 'Subsolar Map'}
              </span>
            </button>
            <button 
              onClick={() => setShowTimeComparisonModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/15 border border-amber-400/40 rounded-full hover:bg-amber-400/25 transition-all text-amber-300 group shadow-sm cursor-pointer shadow-amber-500/10"
              title={language === 'pt' ? 'Comparação De Tempo (5 Telas Simultâneas)' : 'Time Comparison (5 Simultaneous Screens)'}
            >
              <Tv className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="uppercase tracking-widest text-[8px] font-bold">
                {language === 'pt' ? 'Comparação De Tempo' : 'Time Comparison'}
              </span>
            </button>
            <button 
              onClick={() => setShowWristwatchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full hover:bg-amber-400/20 transition-all text-amber-300 group shadow-sm cursor-pointer"
              title={language === 'pt' ? 'Relógio de Pulso (Hora Civil x Luz Solar)' : 'Wristwatch (Civil Time x Sunlight)'}
            >
              <Watch className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="uppercase tracking-widest text-[8px] font-bold">
                {language === 'pt' ? 'Relógio de Pulso' : 'Wristwatch'}
              </span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/70 group"
              title={isFullscreen ? (language === 'pt' ? 'Sair da Tela Cheia (Display Normal)' : 'Exit Fullscreen') : (language === 'pt' ? 'Modo 100% Tela Cheia' : 'Enter 100% Fullscreen')}
            >
              {isFullscreen ? (
                <Minimize className="w-3 h-3 text-amber-400" />
              ) : (
                <Maximize className="w-3 h-3 text-amber-400" />
              )}
              <span className="uppercase tracking-widest text-[8px] font-bold">
                {isFullscreen 
                  ? (language === 'pt' ? 'Display Normal' : 'Normal Display')
                  : (language === 'pt' ? 'Tela Cheia' : 'Fullscreen')}
              </span>
            </button>
            {(!isGenericTimezone(manualLocation) && !isZeroLatitude) ? (
              <button 
                onClick={() => setShowSeasonManagerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/70 group"
                title={language === 'pt' ? 'Gerenciador de Temporadas' : 'Season Manager'}
              >
                <CalendarRange className="w-3 h-3 text-amber-400" />
                <span className="uppercase tracking-widest text-[8px] font-bold">
                  {language === 'pt' ? 'Temporadas' : 'Seasons'}
                </span>
                <span className="text-[8px] font-mono text-amber-300 font-bold px-1 py-0.2 bg-amber-400/10 rounded border border-amber-400/20">
                  {seasonInfo?.cycleStatus?.cycleLabel || ''}
                </span>
                <span className="text-[9px] leading-none">
                  {activeSeasonalAccent.icon}
                </span>
              </button>
            ) : (
              <div 
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full text-amber-300 shadow-sm"
                title={language === 'pt' ? 'Latitude 0° (Linha do Equador): Sem Estações do Ano & Sem DST' : 'Latitude 0° (Equator): No Seasons & No DST'}
              >
                <Globe className="w-3 h-3 text-amber-400" />
                <span className="uppercase tracking-widest text-[8px] font-bold">
                  {language === 'pt' ? 'Sem Estação • Sem DST' : 'No Season • No DST'}
                </span>
              </div>
            )}
            <button 
                onClick={() => setShowThemeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/70 group"
                title={language === 'pt' ? (isSeasonalColorEnabled ? `Temas (Cor Sazonal Ativa: ${activeSeasonalAccent.namePt})` : 'Escolha um Tema') : (isSeasonalColorEnabled ? `Themes (Seasonal Color Active: ${activeSeasonalAccent.name})` : 'Choose a Theme')}
              >
                <div 
                  className="w-2 h-2 rounded-full transition-all shadow-[0_0_8px_currentColor]"
                  style={{ 
                    backgroundColor: effectiveAccentColor,
                    color: effectiveAccentColor
                  }}
                />
                <span className="uppercase tracking-widest text-[8px] font-bold">
                  {language === 'pt' ? 'Temas' : 'Themes'}
                </span>
              </button>
            <button 
                onClick={async () => {
                  if (!solarNoonNotification) {
                      await Notification.requestPermission();
                  }
                  setSolarNoonNotification(!solarNoonNotification);
                }}
                className={`p-1 rounded-full transition-colors ${solarNoonNotification ? 'bg-amber-400/20 text-amber-400' : 'hover:bg-white/10'}`}
                title="Solar Noon Notification"
            >
              <Clock size={16} />
            </button>
            <button 
              onClick={() => setShowRuaSolar(true)}
              className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/60"
            >
              <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h16M4 14h16" />
                <path d="M12 2v20" strokeDasharray="3 3" />
              </svg>
              <span className="uppercase tracking-widest text-[8px] font-bold">Rua Solar</span>
            </button>
            <button 
              onClick={() => { setSkyViewScope('all'); setShowSkyView(true); }}
              className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/60"
            >
              <Sun className="w-3 h-3" />
              <span className="uppercase tracking-widest text-[8px] font-bold">Ver o Sol</span>
            </button>
            <button 
              onClick={() => setIsHighContrast(!isHighContrast)}
              className={`flex items-center gap-2 px-3 py-1 border rounded-full transition-all ${isHighContrast ? 'bg-amber-400 text-black' : 'bg-white/5 border-white/10 text-white/60'}`}
            >
              <span className="uppercase tracking-widest text-[8px] font-bold">HC</span>
            </button>
            <button 
                onClick={() => setHistoryMode(!historyMode)}
                className={`flex items-center gap-2 px-3 py-1 border rounded-full transition-all ${historyMode ? 'bg-amber-400 text-black' : 'bg-white/5 border-white/10 text-white/60'}`}
              >
                <span className="uppercase tracking-widest text-[8px] font-bold">History</span>
              </button>
              {historyMode && (
                <input 
                  type="range"
                  min="-100"
                  max="100"
                  value={historyOffsetYears}
                  onChange={(e) => setHistoryOffsetYears(parseInt(e.target.value))}
                  className="w-20"
                />
              )}
          </div>
          <div className="relative group flex items-center gap-1">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-full hover:bg-amber-400/20 transition-all group cursor-pointer"
              title={language === 'pt' ? 'Trava de Localização IA - Clique para alterar posição' : 'AI Location Lock - Click to change position'}
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-amber-400 uppercase tracking-widest text-[8px] font-bold truncate max-w-[260px]">
                {manualLocation 
                  ? `${manualLocation.name} (${formatCoordinatePair(manualLocation.latitude, manualLocation.longitude, 2, true)})`
                  : (effectiveCoords 
                      ? `${t.aiLocationLock}: GPS (${formatCoordinatePair(effectiveCoords.latitude, effectiveCoords.longitude, 2, true)})`
                      : t.aiLocationLock
                    )
                }
              </span>
            </button>
            {manualLocation && (
              <button
                onClick={resetToGPS}
                title={language === 'pt' ? 'Excluir local manual e voltar para GPS' : 'Clear manual location and reset to GPS'}
                className="p-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5">
            <button 
              onClick={() => {
                if (isAutoSolarSync) {
                  const confirmOff = confirm(language === 'pt' ? 'Desativar sincronização solar automática para ajustar manualmente?' : 'Disable automatic solar synchronization to adjust manually?');
                  if (!confirmOff) return;
                  setIsAutoSolarSync(false);
                }
                const input = prompt(t.timeCorrection + " (min):", String(civilShift));
                if (input !== null) {
                  const val = Number(input);
                  if (!isNaN(val)) setCivilShift(val);
                }
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full hover:bg-white/5 transition-all text-white/60"
              title={language === 'pt' ? 'Correção manual de horário' : 'Manual time correction'}
            >
              <Clock className="w-3.5 h-3.5 text-white/60" />
              <span className="uppercase tracking-widest text-[8px] font-bold">
                {t.timeCorrection} ({civilShift}m)
              </span>
            </button>
            <div className="w-[1px] h-3 bg-white/10" />
            <button
              onClick={() => setIsAutoSolarSync(!isAutoSolarSync)}
              className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase transition-all tracking-wider ${isAutoSolarSync ? 'bg-amber-400 text-black font-black' : 'text-white/40 hover:text-white'}`}
              title={language === 'pt' ? 'Sincronização Solar Automática' : 'Automatic Solar Sync'}
            >
              AUTO
            </button>
          </div>

          <div className="relative group">
            <button className="p-1 px-2 rounded-full hover:bg-white/10 transition-colors text-white/40 flex items-center gap-1.5 border border-transparent hover:border-white/10">
              <LanguageIcon className="w-3 h-3" />
              <span className="text-[8px] font-bold">{LANGUAGES.find(l => l.code === language)?.flag}</span>
            </button>
            <div className="absolute top-full right-0 mt-1 hidden group-hover:block glass-dark rounded-xl border border-white/10 p-1 min-w-[120px] shadow-2xl z-[100]">
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] hover:bg-white/10 transition-colors ${language === lang.code ? 'bg-amber-400/20 text-amber-400 font-bold' : 'text-white/60'}`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-px h-5 bg-white/10" />
          <div className="flex flex-col items-end leading-tight">
            <span className="opacity-30 text-[7px]">{t.status}</span>
            <span className={location.error ? "text-rose-500 text-[8px]" : "text-emerald-400 text-[8px]"}>
              {location.loading ? t.busy : location.error ? t.error : t.locked}
            </span>
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 px-2 rounded-full hover:bg-white/10 transition-colors text-white/40"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-2 p-2 relative overflow-hidden min-h-0 items-start">
        {/* Left Panel: Official Navigation & GPS */}
        <div className="hidden lg:flex w-72 flex-col gap-2 overflow-y-auto max-h-full no-scrollbar pb-20">
          <div className="glass-dark rounded-2xl p-2.5 border-l-2 border-l-white/20 flex flex-col gap-2 min-h-0 overflow-y-auto max-h-full">
            <h2 className="text-[6px] font-bold tracking-[0.2em] opacity-40 uppercase">{t.shipNavigation}</h2>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-[7px] opacity-40 uppercase tracking-widest">Auto Sync GPS</span>
              <button 
                onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                className={`p-1 px-2 rounded-full text-[6px] font-bold uppercase border ${isAutoSyncEnabled ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-white/40 border-white/10'}`}
              >
                {isAutoSyncEnabled ? 'On' : 'Off'}
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto no-scrollbar pr-1">
              <div className="flex flex-col gap-0 border-b border-white/5 pb-1">
                <div className="flex justify-between items-center">
                  <span className="text-[6px] opacity-40 uppercase tracking-widest">{t.localCivil}</span>
                  <span className="text-[6px] font-bold text-emerald-400/80 bg-emerald-500/10 px-1 rounded-full border border-emerald-500/20">{utcOffsetLabel}</span>
                </div>
                <span className="text-lg font-mono text-white/90 tabular-nums leading-none">
                  {formatFullTime(localCivilTime, true)}
                </span>
                <div className="flex flex-col gap-0.5 mt-1 opacity-20 group-hover:opacity-60 transition-opacity">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[5px] font-bold uppercase tracking-tighter">{t.ianaSource}</span>
                  </div>
                  <div className="flex items-center gap-1 pl-2">
                    <div className="w-0.5 h-0.5 bg-amber-400 rounded-full" />
                    <span className="text-[4px] font-mono opacity-50">{t.msPrecision}</span>
                  </div>
                </div>
              </div>

              {/* Alternative Time Selection */}
              {manualLocation?.alternativeTimes && manualLocation.alternativeTimes.length > 0 && (
                <div className="flex flex-col border-b border-white/5 py-1.5 gap-1">
                  <span className="text-[6px] opacity-40 uppercase tracking-widest">Timezone Options</span>
                  <div className="flex gap-1 flex-wrap">
                    <button 
                      onClick={() => setSelectedAlternativeShift(0)}
                      className={`text-[7px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${selectedAlternativeShift === 0 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-white/40 bg-white/5 border-white/10'}`}
                    >
                      Std
                    </button>
                    {manualLocation.alternativeTimes.map((alt, idx) => (
                      <button 
                        key={`alt-time-${alt.name}-${alt.shift}-${idx}`}
                        onClick={() => setSelectedAlternativeShift(alt.shift)}
                        className={`text-[7px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${selectedAlternativeShift === alt.shift ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-white/40 bg-white/5 border-white/10'}`}
                      >
                        {alt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Local Civil Time Primary Display */}
              <div className="flex flex-col gap-0.5 border-b border-white/10 pb-1.5 bg-amber-400/[0.04] p-2 rounded-xl border border-amber-400/20">
                <div className="flex justify-between items-center">
                  <span className="text-[7px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {isPt ? 'HORA CIVIL LOCAL' : 'LOCAL CIVIL TIME'}
                  </span>
                  <span className="text-[6px] font-mono px-1 py-0.5 bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded font-semibold">
                    {utcOffsetLabel}
                    {isCurrentlyDST ? ' (DST)' : ''}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-base font-mono font-bold text-white tabular-nums leading-none tracking-tight">
                    {formatFullTime(localCivilTime, true)}
                  </span>
                  <span className="text-[8px] font-mono text-white/60 tabular-nums">
                    {localCivilTime.toLocaleDateString(language === 'pt' ? 'pt-BR' : language, {
                      timeZone: 'UTC',
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {isMoroccoLocation(manualLocation) && (
                  <div className="mt-1 pt-1 border-t border-emerald-500/20 flex items-center justify-between text-[7px] text-emerald-400 font-mono">
                    <span className="flex items-center gap-1 font-bold">
                      🇲🇦 {isPt ? 'Marrocos' : 'Morocco'}
                    </span>
                    <span className="text-right font-medium">
                      {(isSimulation ? simulationDate : nowMs) >= MOROCCO_TRANSITION_UTC_MS
                        ? (isPt ? 'UTC+0 Permanente' : 'Permanent UTC+0')
                        : (isPt ? 'UTC+1 (➔ UTC+0 a partir de 20/09/2026 01:00 UTC)' : 'UTC+1 (➔ UTC+0 from 20/09/2026 01:00 UTC)')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-0 border-b border-white/5 pb-1">
                <span className="text-[6px] opacity-40 uppercase tracking-widest">{t.worldTimeUtc}</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-mono text-white/30 tabular-nums leading-none">
                    {new Date(nowMs).getUTCHours().toString().padStart(2, '0')}:
                    {new Date(nowMs).getUTCMinutes().toString().padStart(2, '0')}:
                    {new Date(nowMs).getUTCSeconds().toString().padStart(2, '0')}
                  </span>
                  <span className="text-[7px] font-mono text-white/20 tabular-nums">
                    {new Date(nowMs).toLocaleDateString(language === 'pt' ? 'pt-BR' : language, {
                      timeZone: 'UTC',
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-0 border-b border-white/5 pb-1">
                <span className="text-[6px] opacity-40 uppercase tracking-widest">SOLAR UTC GLOBAL</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-mono text-white/30 tabular-nums leading-none">
                    {(() => {
                      const solarDate = calculateSolarTime(new Date(nowMs), 0, 0, undefined, axialTilt).solarDate;
                      return `${solarDate.getUTCHours().toString().padStart(2, '0')}:${solarDate.getUTCMinutes().toString().padStart(2, '0')}:${solarDate.getUTCSeconds().toString().padStart(2, '0')}`;
                    })()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 pb-1 border-b border-white/5">
                <div>
                  <p className="text-[5px] opacity-40 uppercase tracking-widest leading-none">{t.lat}</p>
                  <p className="font-mono text-[9px] leading-tight">{effectiveCoords ? formatLatitude(effectiveCoords.latitude, 3, true) : "---"}</p>
                </div>
                <div>
                  <p className="text-[5px] opacity-40 uppercase tracking-widest leading-none">{t.lon}</p>
                  <p className="font-mono text-[9px] leading-tight">{effectiveCoords ? formatLongitude(effectiveCoords.longitude, 3, true) : "---"}</p>
                </div>
              </div>

              {/* Solar Noon Offset Option */}
              {manualLocation?.dstInfo?.hasDst && (
                <div className="space-y-1.5 pb-1.5 border-b border-white/5">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[6px] opacity-40 uppercase tracking-widest text-amber-400/80">{t.dstSystem}</p>
                    <button 
                      onClick={() => setUseAutoDst(!useAutoDst)}
                      className={`text-[5px] font-bold px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${useAutoDst ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/40'}`}
                    >
                      {useAutoDst ? t.auto : t.manual}
                    </button>
                  </div>
                  {!useAutoDst && (
                    <button 
                      onClick={() => {
                        const defaultShift = getActiveSeasonalShift(nowMs, manualLocation, baseOffset) || 60;
                        setCivilShift(prev => prev === 0 ? defaultShift : 0);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left ${civilShift !== 0 ? 'bg-amber-400/10 border-amber-400/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                      <span className="text-[8px] font-bold uppercase">{civilShift !== 0 ? t.standardReset : t.applyPolicy}</span>
                      <Sun className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Temporal Control Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[7px] opacity-50 uppercase tracking-widest font-bold">{t.warpControl}</p>
                    <p className="text-[5px] text-amber-400/80 uppercase font-mono tracking-wider">{isPt ? 'Modo: Hora Civil Local' : 'Mode: Local Civil Time'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setNowMs(Date.now());
                        setWarpSpeed(1);
                        setIsWarpActive(false);
                        setIsPaused(false);
                      }}
                      title={isPt ? "Voltar para Hora Civil Real Agora" : "Reset to Real Civil Time"}
                      className="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/40 hover:text-amber-400"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={() => setManualDstOverride(prev => prev === null ? true : (prev === true ? false : null))}
                      className={`px-1 rounded bg-white/5 border border-white/10 transition-colors text-[7px] ${manualDstOverride !== null ? 'text-amber-400 border-amber-400/30' : 'text-white/40'}`}
                    >
                      {manualDstOverride === null ? 'DST Auto' : (manualDstOverride ? 'DST On' : 'DST Off')}
                    </button>
                    <button 
                      onClick={() => {
                        if (!isPaused && !isWarpActive) {
                          // Transition to custom time mode so paused time is preserved without snapping
                          setIsWarpActive(true);
                          setWarpSpeed(1);
                        }
                        setIsPaused(!isPaused);
                      }}
                      className={`p-1 rounded bg-white/5 border border-white/10 transition-colors ${isPaused ? 'text-rose-500 border-rose-500/30' : 'text-white/40'}`}
                    >
                      {isPaused ? <Play className="w-2.5 h-2.5 fill-rose-500" /> : <Pause className="w-2.5 h-2.5 fill-white/40" />}
                    </button>
                    <button 
                      onClick={() => handleWarpToggle(!isWarpActive)}
                      className={`px-2 py-0.5 rounded-full text-[6px] font-bold uppercase border ${isWarpActive ? 'bg-amber-400 text-black border-amber-400' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                      {isWarpActive ? t.warp : t.real}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1.5 text-[6px] opacity-60 font-semibold uppercase tracking-wider px-0.5">
                    <span>{isPt ? 'Data Civil' : 'Civil Date'}</span>
                    <span className="flex justify-between items-center">
                      <span>{isPt ? 'Hora Civil' : 'Civil Time'}</span>
                      <span className="text-[5px] text-amber-400 font-mono font-normal">
                        ({utcOffsetLabel})
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="date" 
                      value={localDateInput} 
                      onFocus={() => { isTemporalFocusedRef.current = true; }} 
                      onBlur={() => { 
                        isTemporalFocusedRef.current = false; 
                        setLocalDateInput(formatLocalDate(localCivilTime));
                      }} 
                      onChange={(e) => handleManualDateChange(e.target.value)} 
                      className="bg-white/5 border border-white/10 rounded-lg p-1 text-[8px] font-mono outline-none focus:border-amber-400/50" 
                    />
                    <input 
                      type="time" 
                      step="1" 
                      value={localTimeInput} 
                      onFocus={() => { isTemporalFocusedRef.current = true; }} 
                      onBlur={() => { 
                        isTemporalFocusedRef.current = false; 
                        setLocalTimeInput(formatFullTime(localCivilTime, true));
                      }} 
                      onChange={(e) => handleManualTimeChange(e.target.value)} 
                      className="bg-white/5 border border-white/10 rounded-lg p-1 text-[8px] font-mono outline-none focus:border-amber-400/50" 
                    />
                  </div>
                </div>

                {manualLocation && (manualLocation.dstInfo?.hasDst || (manualLocation.seasonalPeriods && manualLocation.seasonalPeriods.length > 0)) && (
                  <div className={`p-1.5 rounded-xl border space-y-1 transition-all duration-300 ${
                    isCurrentlyAmbiguous 
                    ? 'bg-amber-400/[0.04] border-amber-400/30 shadow-[0_0_8px_rgba(251,191,36,0.1)]' 
                    : 'bg-white/5 border-white/5'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="text-[6px] opacity-40 font-bold uppercase tracking-wider">
                        {isPt ? 'Período Sazonal (Atraso)' : 'Seasonal Period (Fallback)'}
                      </div>
                      {isCurrentlyAmbiguous && (
                        <span className="text-[5px] px-1 py-0.5 bg-amber-400 text-black font-extrabold rounded uppercase tracking-widest animate-pulse leading-none">
                          {isPt ? 'Conflito / Ambíguo' : 'Ambiguous / Overlap'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      <button 
                        onClick={() => handleFallbackPeriodChange('first')} 
                        className={`flex-1 text-[5px] py-1 rounded border transition-all font-semibold uppercase ${
                          (manualDstOverride === true || (manualDstOverride === null && isCurrentlyDST)) 
                            ? 'bg-amber-400 text-black border-amber-400 font-bold' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                        }`}
                      >
                        {isPt ? '1º Período (Antes)' : '1st Period (Before)'}
                      </button>
                      <button 
                        onClick={() => handleFallbackPeriodChange('second')} 
                        className={`flex-1 text-[5px] py-1 rounded border transition-all font-semibold uppercase ${
                          (manualDstOverride === false || (manualDstOverride === null && !isCurrentlyDST)) 
                            ? 'bg-amber-400 text-black border-amber-400 font-bold' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
                        }`}
                      >
                        {isPt ? '2º Período (Depois)' : '2nd Period (After)'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-[6px] opacity-60 font-semibold uppercase tracking-wider px-0.5">
                    <span>{isPt ? 'Salto Civil (Hora Civil)' : 'Civil Jump (Civil Time)'}</span>
                    <span className="text-[5px] text-amber-400 font-mono">
                      {isPt ? 'Crepúsculo' : 'Twilight'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => jumpToCivilTwilight('start')} 
                      className="flex flex-col items-center justify-center p-1 rounded border border-white/10 bg-white/5 hover:bg-amber-400/15 hover:border-amber-400/40 text-white/70 hover:text-amber-300 transition-all cursor-pointer group"
                      title={isPt ? `Pular para o Início do Crepúsculo Civil (${civilDawnTimeStr} Hora Civil)` : `Jump to Civil Dawn (${civilDawnTimeStr} Civil Time)`}
                    >
                      <span className="text-[6px] font-bold uppercase group-hover:text-amber-300">
                        {isPt ? '🌅 Crep. Início' : '🌅 Dawn'}
                      </span>
                      <span className="text-[7px] font-mono font-extrabold text-amber-400">
                        {civilDawnTimeStr}
                      </span>
                    </button>
                    <button 
                      onClick={() => jumpToCivilTwilight('end')} 
                      className="flex flex-col items-center justify-center p-1 rounded border border-white/10 bg-white/5 hover:bg-amber-400/15 hover:border-amber-400/40 text-white/70 hover:text-amber-300 transition-all cursor-pointer group"
                      title={isPt ? `Pular para o Fim do Crepúsculo Civil (${civilDuskTimeStr} Hora Civil)` : `Jump to Civil Dusk (${civilDuskTimeStr} Civil Time)`}
                    >
                      <span className="text-[6px] font-bold uppercase group-hover:text-amber-300">
                        {isPt ? '🌇 Crep. Fim' : '🌇 Dusk'}
                      </span>
                      <span className="text-[7px] font-mono font-extrabold text-amber-400">
                        {civilDuskTimeStr}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-[6px] opacity-30">
                    <span>{t.warpSpeed} ({warpUnit.toUpperCase()}/s)</span>
                    <button 
                      onClick={() => {
                        setWarpSpeed(1);
                        setIsWarpActive(false);
                      }} 
                      className="hover:text-amber-400 transition-colors uppercase"
                    >
                      Reset
                    </button>
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    value={isNaN(warpSpeed) ? 1 : warpSpeed} 
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setWarpSpeed(1);
                        return;
                      }
                      const num = Number(raw);
                      if (!isNaN(num) && isFinite(num) && num >= 0) {
                        setWarpSpeed(num);
                      }
                    }} 
                    onBlur={() => {
                      if (isNaN(warpSpeed) || !isFinite(warpSpeed) || warpSpeed < 0) {
                        setWarpSpeed(1);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-1 text-[8px] font-mono outline-none focus:border-amber-400/50" 
                  />
                  <div className="flex gap-0.5">
                    {(['us', 'ms', 's', 'min', 'h'] as const).map(u => (
                      <button key={u} onClick={() => setWarpUnit(u)} className={`flex-1 text-[5px] py-1 rounded border ${warpUnit === u ? 'bg-amber-400/20 border-amber-400/40 text-amber-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                        {u === 'us' ? 'µS' : u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>


          {solarInfo && (
            <div className="glass-dark rounded-2xl p-3 border-l-2 border-l-amber-400/20 shrink-0 flex flex-col items-center gap-4">
              <Compass azimuth={solarInfo.azimuth} altitude={solarInfo.altitude} moonAltitude={solarInfo.moonAltitude} moonAzimuth={solarInfo.moonAzimuth} />
              <div className="mt-4">
                <Analog24hClock 
                  time={new Date(nowMs)} 
                  eot={solarInfo.equationOfTime} 
                  sizeClass="w-[120px] h-[120px]" 
                  isPaused={isPaused}
                  isWarpActive={isWarpActive}
                  warpSpeed={warpSpeed}
                  warpUnit={warpUnit}
                  latitude={effectiveCoords?.latitude}
                  language={language}
                />
              </div>
            </div>
          )}

          <div className="glass-dark rounded-2xl p-2 flex items-center justify-between gap-2 shrink-0 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${manualLocation ? 'bg-amber-400' : 'bg-emerald-500'}`} />
              <span className={`text-[8px] font-mono font-bold tracking-widest truncate ${manualLocation ? 'text-amber-400/80' : 'text-emerald-400'}`}>
                {manualLocation 
                  ? `${t.neuralLockOk}: ${manualLocation.name} (${manualLocation.latitude >= 0 ? '+' : ''}${manualLocation.latitude.toFixed(2)}°, ${manualLocation.longitude >= 0 ? '+' : ''}${manualLocation.longitude.toFixed(2)}°)`
                  : (effectiveCoords 
                      ? `${t.gpsActive}: (${effectiveCoords.latitude >= 0 ? '+' : ''}${effectiveCoords.latitude.toFixed(2)}°, ${effectiveCoords.longitude >= 0 ? '+' : ''}${effectiveCoords.longitude.toFixed(2)}°)`
                      : t.gpsActive
                    )
                }
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="text-[7px] bg-white/10 hover:bg-white/20 px-1 py-0.5 rounded uppercase tracking-wider text-white"
              >
                {t.travelMode || "Viagem"}
              </button>
              {manualLocation && (
                <button 
                  onClick={() => setManualLocation(null)}
                  className="text-[7px] bg-amber-500/20 hover:bg-amber-500/30 px-1 py-0.5 rounded uppercase tracking-wider text-amber-500"
                >
                  {t.localTime || "Local"}
                </button>
              )}
            </div>
          </div>

          {manualLocation && (
            <div className="glass-dark rounded-xl p-2 border border-amber-400/10 flex flex-col gap-1 shrink-0 bg-amber-400/[0.01] shadow-lg">
              <div className="flex items-center gap-1 justify-between">
                <span className="text-[6.5px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2 h-2" />
                  {language === 'pt' ? 'Histórico AI' : 'AI History'}
                </span>
                <span className="text-[5px] font-mono text-amber-400/30">Gemini</span>
              </div>
              <button
                onClick={() => setIsHistoryChatOpen(true)}
                className="w-full py-1 px-2 rounded-lg bg-amber-400 text-black hover:bg-amber-300 transition-all font-mono text-[7px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                {language === 'pt' ? 'Abrir Chat AI' : 'Open AI Chat'}
              </button>
            </div>
          )}
        </div>

        {/* Center Panel: Primary Solar Chronometer */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden py-2 lg:py-0">
          {activePeriod && activePeriod.vigencia && (
            <div className="absolute bottom-2 right-2 text-[8px] font-mono text-amber-500/50 bg-black/20 px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-20">
              {activePeriod.vigencia}
            </div>
          )}
          {location.loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              <p className="text-white/40 animate-pulse font-mono text-sm uppercase tracking-widest">{t.calculating}</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full max-h-full relative"
            >
              {isSeasonalModified && (
                <button
                  onClick={() => { setSeasonalPeriods([]); setIsSeasonalModified(false); setInitialSeasonalPeriods([]); }}
                  className="absolute top-4 right-4 flex items-center gap-1 bg-amber-400/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase animate-pulse border border-amber-400/50 hover:bg-amber-400/40 z-10"
                >
                  <RotateCcw className="w-3 h-3" />
                  {language === 'pt' ? 'Resetar Sazonal' : 'Reset Seasonal'}
                </button>
              )}
              <div className="scale-[0.55] sm:scale-[0.65] md:scale-90 lg:scale-[0.8] xl:scale-90 flex justify-center w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${is24hFormat}-${effectiveCoords?.latitude}-${effectiveCoords?.longitude}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnalogClock 
                      time={clockTime} 
                      label={solarInfo ? t.localSolar : t.calculating} 
                      useUTC={!!solarInfo} 
                      is24hFormat={is24hFormat} 
                      themeName={currentTheme.name} 
                      isSolarNoon={solarInfo ? Math.abs(solarInfo.altitude - 90) < 1 : false}
                      isPaused={isPaused}
                      isWarpActive={isWarpActive}
                      warpSpeed={warpSpeed}
                      warpUnit={warpUnit}
                      latitude={effectiveCoords?.latitude}
                      language={language}
                      equationOfTime={solarInfo?.equationOfTime}
                      isOptimizationMode={isOptimizationMode}
                      isBestPerformanceMode={isBestPerformanceMode}
                      axialTilt={axialTilt}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              {currentTheme.name === "Anos 1910" && <Pendulum animated={!isOptimizationMode} />}

              <div className="mt-1 flex flex-col items-center">
                <span className="text-[7px] font-mono tracking-[0.5em] text-amber-400/50 uppercase mb-0.5">{t.solarChronometer}</span>
                <div className="relative inline-flex flex-col items-end">
                  <div className="relative inline-flex items-center justify-center">
                    <span className={`text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-mono tracking-tighter tabular-nums ${isHighContrast ? 'text-black font-bold drop-shadow-[0_0_2px_rgba(255,255,255,1)] bg-white/70 px-2 rounded' : 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.2)]'}`}>
                      {solarInfo?.solarDate && !isNaN(solarInfo.solarDate.getTime()) ? (
                        <>
                          {is24hFormat 
                            ? `${formatDigit(solarInfo.solarDate.getUTCHours())}:${formatDigit(solarInfo.solarDate.getUTCMinutes())}:${formatDigit(solarInfo.solarDate.getUTCSeconds())}`
                            : `${formatDigit(solarInfo.solarDate.getUTCHours() % 12)}:${formatDigit(solarInfo.solarDate.getUTCMinutes())}:${formatDigit(solarInfo.solarDate.getUTCSeconds())} ${solarInfo.solarDate.getUTCHours() >= 12 ? 'PM' : 'AM'}`
                          }
                        </>
                      ) : (
                        "00:00:00"
                      )}
                    </span>
                  </div>

                  {/* Diferença Solar vs Civil: Em baixo pra direita da Hora Solar Local XX:XX:XX */}
                  <div className="w-full flex justify-end items-center mt-1 sm:mt-1.5">
                    <div 
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border backdrop-blur-md transition-all duration-300 font-mono shadow-sm cursor-help ${
                        solarCivilDiff.isEquilibrium
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : solarCivilDiff.isAhead
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      }`}
                      title={
                        language === 'pt'
                          ? `Diferença entre Horário Solar Local e Hora Civil Local: ${solarCivilDiff.formatted} [${solarCivilDiff.sign}XX(Minuto):XX(Segundo):XXXX] (${
                              solarCivilDiff.isEquilibrium 
                                ? 'Equilíbrio Mesmo Absoluto: 00(Minuto):00(Segundo):0000' 
                                : solarCivilDiff.isAhead 
                                  ? `Solar mais adiantado em relação ao Civil: +${solarCivilDiff.minutes}min : ${solarCivilDiff.seconds}seg : ${solarCivilDiff.fourDigitsFraction}` 
                                  : `Solar mais atrasado em relação ao Civil: -${solarCivilDiff.minutes}min : ${solarCivilDiff.seconds}seg : ${solarCivilDiff.fourDigitsFraction}`
                            })`
                          : `Difference between Local Solar Time and Local Civil Time: ${solarCivilDiff.formatted} [${solarCivilDiff.sign}XX(Minute):XX(Second):XXXX] (${
                              solarCivilDiff.isEquilibrium 
                                ? 'Absolute Equilibrium: 00(Minute):00(Second):0000' 
                                : solarCivilDiff.isAhead 
                                  ? `Solar ahead of Civil: +${solarCivilDiff.minutes}min : ${solarCivilDiff.seconds}sec : ${solarCivilDiff.fourDigitsFraction}` 
                                  : `Solar behind Civil: -${solarCivilDiff.minutes}min : ${solarCivilDiff.seconds}sec : ${solarCivilDiff.fourDigitsFraction}`
                            })`
                      }
                    >
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-white/50 font-sans select-none">
                        {language === 'pt' ? 'Δ Solar/Civil' : 'Δ Solar/Civil'}
                      </span>
                      <span className="font-bold text-xs sm:text-sm tracking-widest tabular-nums">
                        {solarCivilDiff.formatted}
                      </span>
                      <span className="text-[7px] sm:text-[8px] font-mono text-white/40 tracking-tight select-none">
                        (min:seg:xxxx)
                      </span>
                      {solarCivilDiff.isEquilibrium ? (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {language === 'pt' ? 'Equilíbrio' : 'Equilibrium'}
                        </span>
                      ) : (
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                          solarCivilDiff.isAhead ? 'text-amber-400/80 bg-amber-400/10' : 'text-cyan-400/80 bg-cyan-400/10'
                        }`}>
                          {solarCivilDiff.isAhead ? (language === 'pt' ? 'Adiantado' : 'Ahead') : (language === 'pt' ? 'Atrasado' : 'Behind')}
                        </span>
                      )}
                    </div>
                  </div>

                  {upcomingTransition && (
                    <div className="w-full flex justify-center items-center gap-1.5 text-[10px] font-mono text-amber-400/70 animate-pulse whitespace-nowrap mt-2">
                      <Sparkles className="w-3 h-3" />
                      <span>{upcomingTransition.daysLeft}d to {upcomingTransition.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1.5 mt-3">
                  <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-sm sm:text-base md:text-lg font-mono tracking-[0.3em] text-white/30 tabular-nums">
                    {localCivilTime.getUTCDate().toString().padStart(2, '0')}/{ (localCivilTime.getUTCMonth() + 1).toString().padStart(2, '0') }/{localCivilTime.getUTCFullYear()}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    {localCivilTime.toLocaleDateString(language === 'pt' ? 'pt-BR' : (language === 'en' ? 'en-US' : language), { timeZone: 'UTC', weekday: 'long' })}
                  </span>
                  <span className="text-[8px] font-mono text-white/20 tabular-nums">
                    {formatFullTime(localCivilTime, true)}
                  </span>

                  <motion.div className="flex gap-4 mt-4" layout>
                    <Analog12hClock 
                      time={localCivilTime} 
                      useUTC={true} 
                      label={t.localCivil} 
                      isPaused={isPaused}
                      isWarpActive={isWarpActive}
                      warpSpeed={warpSpeed}
                      warpUnit={warpUnit}
                    />
                    <Analog12hClock 
                      time={new Date(nowMs)} 
                      useUTC={true} 
                      label={t.worldTimeUtc} 
                      isPaused={isPaused}
                      isWarpActive={isWarpActive}
                      warpSpeed={warpSpeed}
                      warpUnit={warpUnit}
                    />
                    {solarInfo && (
                      <Analog12hClock 
                        time={solarInfo.solarDate} 
                        label={t.localSolar} 
                        isPaused={isPaused}
                        isWarpActive={isWarpActive}
                        warpSpeed={warpSpeed}
                        warpUnit={warpUnit}
                      />
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel: Solar Telemetry & Schedule */}
        <div className="hidden lg:flex w-72 flex-col gap-2 overflow-y-auto max-h-full no-scrollbar pb-20">
          <div className="glass-dark rounded-2xl p-2 border-r-2 border-r-amber-400/20 shrink-0">
            <div className="grid grid-cols-3 gap-2 p-1 text-[10px]">
              <div className="flex flex-col" title={language === 'pt' ? 'Diferença entre UTC Global (Referência) e UTC Solar (Longitude 0°)' : 'Difference between Global UTC (Reference) and Solar UTC (0° Longitude)'}>
                <span className="opacity-40 uppercase truncate">{t.equationOfTime}</span>
                <span className="font-mono text-amber-400 font-bold truncate">
                  {solarInfo ? formatEquationOfTime(solarInfo.equationOfTime) : "--"}
                </span>
                <span className="text-[7px] text-white/30 font-mono tracking-tight">
                  {language === 'pt' ? 'Δ UTC Ref. (0°)' : 'Δ UTC Ref (0°)'}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="opacity-40 uppercase truncate">{t.altitude} / {t.azimuth}</span>
                  {solarInfo && solarInfo.altitude > -0.575 && solarInfo.altitude < 5 && (
                    <div className="relative group cursor-help">
                        <Info size={10} className="text-amber-400" />
                        <div className="absolute top-full right-0 w-32 p-1 bg-gray-800 text-[8px] text-white rounded shadow-lg hidden group-hover:block z-50">
                            A refração atmosférica pode alterar a posição aparente do sol perto do horizonte.
                        </div>
                    </div>
                  )}
                </div>
                <span className="font-mono text-amber-500 truncate">
                  {solarInfo ? `${solarInfo.altitude.toFixed(1)}° / ${solarInfo.azimuth.toFixed(1)}°` : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">Tráfego</span>
                <span className={`font-mono truncate ${getTrafficIntensity(localCivilTime) === 'high' ? 'text-red-500' : getTrafficIntensity(localCivilTime) === 'medium' ? 'text-amber-500' : 'text-green-500'}`}>
                   {getTrafficIntensity(localCivilTime).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">{t.subsolarLat}</span>
                <span className="font-mono text-amber-500 truncate">
                  {solarInfo ? formatSubsolarLat(solarInfo.declination) : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">{t.lon}</span>
                <span className="font-mono text-amber-500 truncate">
                  {solarInfo ? formatSubsolarLon(solarInfo.subsolarLongitude) : "--"}
                </span>
              </div>
              {solarInfo ? <ZenithDistanceReadout altitude={solarInfo.altitude} history={zenithHistory} /> : (
                  <div className="flex flex-col">
                    <span className="opacity-40 uppercase truncate">Zenith Dist.</span>
                    <span className="font-mono text-amber-500 truncate">--</span>
                  </div>
              )}
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">{language === 'pt' ? 'Lon. Referência' : 'Ref. Longitude'}</span>
                <span className="font-mono text-amber-500 truncate">
                  {solarInfo ? formatNumericLon(((selectedUtcOffset !== null ? selectedUtcOffset * 60 : 0) / 4) - ((solarInfo.equationOfTime ?? 0) / 4)) : "--"}
                </span>
                <span className="text-[7px] text-white/30 font-mono tracking-tight">
                  {language === 'pt' ? 'UTC+0 + Eq. do Tempo' : 'UTC+0 + Eq. of Time'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">{language === 'pt' ? 'Lon. Ref. Local' : 'Local Ref. Lon'}</span>
                <span className="font-mono text-amber-500 truncate">
                  {solarInfo ? formatNumericLon(((solarInfo.timezoneOffset ?? baseOffset) / 4) - ((solarInfo.equationOfTime ?? 0) / 4)) : "--"}
                </span>
                <span className="text-[7px] text-white/30 font-mono tracking-tight">
                  {language === 'pt' ? 'Meridiano + Eq. do Tempo' : 'Meridian + Eq. of Time'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="opacity-40 uppercase truncate">Solar Noon</span>
                <span className="font-mono text-amber-400/80 truncate">
                  {solarInfo ? `${String(solarInfo.solarDate.getUTCHours()).padStart(2, '0')}:${String(solarInfo.solarDate.getUTCMinutes()).padStart(2, '0')}` : "--"}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2 justify-center">
                <div className="flex justify-center gap-2">
                     <span className="text-[8px] uppercase tracking-wider opacity-50">Time Ref:</span>
                     <select
                        value={selectedUtcOffset ?? 'local'}
                        onChange={(e) => setSelectedUtcOffset(e.target.value === 'local' ? null : parseInt(e.target.value, 10))}
                        className="bg-transparent text-[9px] uppercase tracking-wider text-amber-400 cursor-pointer"
                      >
                        <option value="local">Local Time</option>
                        <option value="0">UTC +0</option>
                        <option value="60">UTC +1</option>
                        <option value="120">UTC +2</option>
                        <option value="180">UTC +3</option>
                        <option value="-180">UTC -3</option>
                        <option value="-240">UTC -4</option>
                        <option value="-300">UTC -5</option>
                        <option value="-360">UTC -6</option>
                      </select>
                </div>
                <div className="flex justify-center">
                    <button
                        onClick={() => setShowRefractionChart(!showRefractionChart)}
                        className="text-[9px] uppercase tracking-wider text-emerald-400/80 hover:text-emerald-300 transition-colors"
                    >
                        {showRefractionChart ? 'Hide Refraction Chart' : 'Show Refraction Chart'}
                    </button>
                </div>
            </div>
            {showRefractionChart && (
                <div className="mt-2">
                    <RefractionChart timestamp={nowMs} latitude={location.coords?.latitude ?? 0} longitude={location.coords?.longitude ?? 0} />
                </div>
            )}
          </div>

          <div 
            className="glass-dark rounded-2xl p-3 flex-1 flex flex-col min-h-0"
            style={currentTheme.panelStyle}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[7px] font-bold tracking-[0.2em] opacity-40 uppercase">{t.solarEvents}</h2>
              <button
                onClick={handleShareLocation}
                title={language === 'pt' ? 'Compartilhar localização' : 'Share location'}
                className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-amber-400 transition-colors flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider border border-white/5"
              >
                <Share2 className="w-2.5 h-2.5" />
                <span>{language === 'pt' ? 'Compartilhar' : 'Share'}</span>
              </button>
            </div>
            <div className="flex justify-between items-center px-4 py-2">
              <div className="flex items-center gap-2">
                {currentTheme.name === "Anos 1910" && <Gear size={20} className="text-amber-500" />}
                <h1 className="text-xl font-bold">Solaris</h1>
              </div>
              {user ? (
                <button onClick={handleLogout} className="text-[10px] bg-white/10 px-2 py-1 rounded">Logout</button>
              ) : (
                <button onClick={handleLogin} className="text-[10px] bg-indigo-600 px-2 py-1 rounded">Login</button>
              )}
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar pr-1 overflow-x-hidden">
                {/* Seasonal Widget */}
                {effectiveCoords && !isGenericTimezone(manualLocation) && (
                  <SeasonalWidget 
                    date={new Date(nowMs)} 
                    latitude={effectiveCoords.latitude} 
                    longitude={effectiveCoords.longitude}
                    offsetMinutes={solarInfo?.timezoneOffset ?? baseOffset} 
                    baseOffset={baseOffset}
                    location={manualLocation}
                    seasonManagerConfig={seasonManagerConfig}
                    enableSeasonalVariation={enableSeasonalVariation}
                    onToggleSeasonalVariation={setEnableSeasonalVariation}
                    customAxialTilt={axialTilt}
                    t={t} 
                    language={language}
                    onOpenSeasonManager={() => setShowSeasonManagerModal(true)}
                  />
                )}
               {/* Events List */}
              {(seasonInfo || (manualLocation?.dstInfo?.hasDst && !isGenericTimezone(manualLocation))) && (
                <div className="flex flex-col gap-1 p-2 bg-white/5 rounded-xl border border-white/5 mb-2">
                  <div className="flex justify-between items-center text-[7px] opacity-40 uppercase tracking-widest">
                    <span>{t.dstSystem}</span>
                    <span>{isCurrentlyDST ? t.dstActive : t.standardPeriod}</span>
                  </div>
                  {seasonInfo && (
                    <>
                      <div className="flex justify-between items-center text-[7px] opacity-40 uppercase tracking-widest">
                        <span>Estação</span>
                        <span>{t[seasonInfo.season as keyof Translations]}</span>
                      </div>
                      <div className="flex justify-between items-center text-[7px] opacity-40 uppercase tracking-widest">
                        <span>{t.nextTransition}</span>
                        <span>{t[seasonInfo.nextTransition.name as keyof Translations]}</span>
                      </div>
                      <div className="text-[7px] text-amber-400/80 text-right font-mono">
                        {seasonInfo.nextTransition.date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })} {seasonInfo.nextTransition.date.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {solarEvents.map((event, eventIdx) => (
                <div key={`solar-evt-${event.key}-${eventIdx}`} className="flex flex-col gap-0.5 p-1.5 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                  <div className="flex justify-between items-center">
                    <span 
                      className="text-[7px] opacity-40 font-bold uppercase tracking-wider group-hover:text-amber-400/60 transition-colors flex items-center gap-1"
                      title={
                        event.key === 'fullSunAboveHorizonRise' ? (language === 'pt' ? 'O Sol atinge 0° de altitude e fica totalmente acima do horizonte (subindo rumo ao Meio-Dia Solar).' : 'Sun reaches 0° altitude and is fully above the horizon (rising toward Solar Noon).') :
                        event.key === 'fullSunAboveHorizonSet' ? (language === 'pt' ? 'O Sol atinge 0° de altitude ao descer do Meio-Dia Solar em direção ao Pôr do Sol.' : 'Sun reaches 0° altitude descending from Solar Noon toward Sunset.') : undefined
                      }
                    >
                      {event.key === 'astronomicalDawn' ? t.astronomicalDawn :
                       event.key === 'nauticalDawn' ? t.nauticalDawn :
                       event.key === 'civilDawn' ? t.civilDawn :
                       event.key === 'sunrise' ? t.sunrise :
                       event.key === 'fullSunAboveHorizonRise' ? t.fullSunAboveHorizonRise :
                       event.key === 'solarNoon' ? t.solarNoon :
                       event.key === 'fullSunAboveHorizonSet' ? t.fullSunAboveHorizonSet :
                       event.key === 'sunset' ? t.sunset :
                       event.key === 'civilDusk' ? t.civilDusk :
                       event.key === 'nauticalDusk' ? t.nauticalDusk :
                       event.key === 'astronomicalDusk' ? t.astronomicalDusk :
                       event.key === 'solarMidnight' ? t.solarMidnight : event.label}
                      {(event.key === 'fullSunAboveHorizonRise' || event.key === 'fullSunAboveHorizonSet') && (
                        <span className="text-[6px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-normal">
                          0°
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2 font-mono">
                      <div className="flex flex-col items-end relative group">
                        <span className="text-[5px] opacity-20 uppercase cursor-help">{t.civil}</span>
                        <span className="absolute left-0 bottom-full mb-1 w-48 bg-black/90 border border-white/20 p-2 text-[9px] text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {language === 'pt' ? 'Horário civil ajustado pelo fuso horário e correção (Civil Shift) para alinhar o relógio ao meridiano local.' : 'Civil time adjusted by timezone and correction (Civil Shift) to align the clock to the local meridian.'}
                        </span>
                        <span className={`text-[10px] ${event.eventDate instanceof Date ? 'text-white/90' : event.eventState === 'perpetual' ? 'text-amber-300 font-semibold text-[8px]' : 'text-white/40 italic text-[8px]'}`}>
                          {event.eventDate instanceof Date 
                            ? formatTime(new Date(event.eventDate.getTime() + (solarInfo?.timezoneOffset || 0) * 60000), true) 
                            : (event.eventState === 'perpetual' ? t.perpetual : t.neverOccurs)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end relative group">
                        <span className="text-[5px] opacity-20 uppercase text-amber-400/40 cursor-help">{t.solar}</span>
                        <span className="absolute right-0 bottom-full mb-1 w-48 bg-black/90 border border-white/20 p-2 text-[9px] text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {language === 'pt' ? 'O tempo solar reflete a posição exata do sol, ignorando fusos horários e convenções humanas.' : 'Solar time reflects the exact position of the sun, ignoring timezones and human conventions.'}
                        </span>
                        <span className={`text-[10px] ${event.eventSolar instanceof Date ? 'text-amber-400/80' : event.eventState === 'perpetual' ? 'text-amber-400 font-semibold text-[8px]' : 'text-amber-400/30 italic text-[8px]'}`}>
                          {event.eventSolar instanceof Date 
                            ? formatTime(event.eventSolar, true) 
                            : (event.eventState === 'perpetual' ? t.perpetual : t.neverOccurs)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Globo de Orientação Terrestre no Centro dos Eventos Solares */}
              {solarInfo && effectiveCoords && (
                <OrientacaoTerrestreWidget
                  subsolarLat={solarInfo.declination}
                  subsolarLon={solarInfo.subsolarLongitude}
                  userLat={effectiveCoords.latitude}
                  userLon={effectiveCoords.longitude}
                  locationName={manualLocation?.name || ''}
                  solarAltitude={solarInfo.altitude}
                  language={language}
                  axialTilt={axialTilt}
                  localCivilDate={localCivilTime}
                  localSolarDate={solarInfo.solarDate}
                  utcDate={new Date(nowMs)}
                  equationOfTime={solarInfo.equationOfTime}
                  timezoneOffset={solarInfo.timezoneOffset}
                />
              )}

              {/* Gerenciador de Temporadas Widget */}
              {(!isGenericTimezone(manualLocation) && !isZeroLatitude) ? (
                <div className="mt-3 p-2.5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-2xl border border-white/10 flex flex-col gap-2 shadow-lg">
                  <div className="flex items-center gap-1.5 justify-between pb-1.5 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="p-1 rounded-lg border"
                        style={{
                          backgroundColor: `${activeSeasonalAccent.color}20`,
                          borderColor: `${activeSeasonalAccent.color}40`,
                          color: activeSeasonalAccent.color
                        }}
                      >
                        <CalendarRange className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-white uppercase tracking-wider block">
                          {language === 'pt' ? 'Gerenciador de Temporadas' : 'Season Manager'}
                        </span>
                        <span className="text-[6.5px] font-mono text-white/40 block">
                          {seasonInfo?.cycleStatus?.format === 'single' ? (language === 'pt' ? 'Ciclo Civil (01/01 a 31/12)' : 'Civil Cycle (01/01 to 31/12)') : (language === 'pt' ? 'Ciclo Bi-anual (01/07 a 30/06)' : 'Bi-annual Cycle (01/07 to 30/06)')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSeasonManagerModal(true)}
                      className="text-[7px] font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-colors py-1 px-2 rounded-lg bg-amber-400/15 border border-amber-400/30 cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-2.5 h-2.5" />
                      <span>{language === 'pt' ? 'Gerenciar' : 'Manage'}</span>
                    </button>
                  </div>

                  {/* Active Cycle Info Card */}
                  {seasonInfo?.cycleStatus && (
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black font-mono text-amber-300">
                            {seasonInfo.cycleStatus.cycleLabel}
                          </span>
                          <span className="text-[6.5px] font-mono text-white/50">
                            ({seasonInfo.cycleStatus.startDateFormatted} {'\u2192'} {seasonInfo.cycleStatus.endDateFormatted})
                          </span>
                        </div>
                        <span className={`text-[6px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          seasonInfo.cycleStatus.isValidNow 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {seasonInfo.cycleStatus.isValidNow ? (language === 'pt' ? 'EM VIGOR' : 'ACTIVE') : (language === 'pt' ? 'FORA DO CICLO' : 'INACTIVE')}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${seasonInfo.cycleStatus.progressPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[6.5px] font-mono text-white/50">
                        <span>{seasonInfo.cycleStatus.daysElapsed}d {language === 'pt' ? 'decorridos' : 'elapsed'} ({seasonInfo.cycleStatus.progressPercent.toFixed(0)}%)</span>
                        <span>{seasonInfo.cycleStatus.daysRemaining}d {language === 'pt' ? 'restantes' : 'left'}</span>
                      </div>
                    </div>
                  )}

                  {/* Active Season & Duration Modifier Display */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Current Season Badge */}
                    <div className="p-1.5 bg-black/30 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[6px] text-white/40 uppercase font-mono">{language === 'pt' ? 'Estação em Vigor' : 'Active Season'}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm">{activeSeasonalAccent.icon}</span>
                        <div>
                          <span className="text-[8px] font-bold block" style={{ color: activeSeasonalAccent.color }}>
                            {language === 'pt' ? activeSeasonalAccent.namePt : activeSeasonalAccent.name}
                          </span>
                          <span className="text-[6px] text-white/40 font-mono uppercase">
                            {seasonManagerConfig.seasonMode === 'manual' ? (language === 'pt' ? 'Manual' : 'Manual') : (language === 'pt' ? 'Astronômica' : 'Astronomical')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Duration Mode Badge */}
                    <div className="p-1.5 bg-black/30 rounded-xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[6px] text-white/40 uppercase font-mono">{language === 'pt' ? 'Duração / Ajuste' : 'Duration Mode'}</span>
                      <div className="mt-1">
                        <span className="text-[8px] font-bold text-white block">
                          {seasonManagerConfig.durationMode === 'natural' && (language === 'pt' ? 'Natural (Padrão)' : 'Natural')}
                          {seasonManagerConfig.durationMode === 'advance' && (language === 'pt' ? `Adiantamento (+${seasonManagerConfig.durationDaysOffset}d)` : `Advance (+${seasonManagerConfig.durationDaysOffset}d)`)}
                          {seasonManagerConfig.durationMode === 'delay' && (language === 'pt' ? `Atraso (+${seasonManagerConfig.durationDaysOffset}d)` : `Delay (+${seasonManagerConfig.durationDaysOffset}d)`)}
                          {seasonManagerConfig.durationMode === 'permanent' && (language === 'pt' ? 'Permanente (Fixo)' : 'Permanent Lock')}
                        </span>
                        <span className="text-[6px] text-amber-400/80 font-mono">
                          {seasonManagerConfig.durationMode === 'permanent' 
                            ? (language === 'pt' ? 'Sem expiração' : 'No expiry') 
                            : (seasonInfo?.nextTransition ? `${new Date(seasonInfo.nextTransition.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}` : '')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location specific seasonal shift rules if configured */}
                  {manualLocation?.seasonalPeriods && manualLocation.seasonalPeriods.length > 0 && (
                    <div className="mt-1 pt-1.5 border-t border-white/5 space-y-1">
                      <span className="text-[6px] text-white/40 uppercase tracking-widest font-mono block">
                        {language === 'pt' ? 'Regras Sazonais do Local' : 'Location Shift Rules'}
                      </span>
                      {manualLocation.seasonalPeriods.map((period, index) => (
                        <div key={`loc-rule-${index}`} className="p-1 bg-white/5 rounded border border-white/5 flex justify-between items-center text-[6.5px]">
                          <span className="text-white/70">{period.startRule} {'\u2192'} {period.endRule}</span>
                          <span className="text-amber-400 font-mono font-bold">+{period.shift}m</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-3 bg-amber-400/5 rounded-2xl border border-amber-400/20 flex flex-col gap-1.5 shadow-lg text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-300">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="text-[8.5px] font-bold uppercase tracking-widest">
                      {language === 'pt' ? 'Latitude 0°: Sem Estações do Ano & Sem DST' : 'Latitude 0°: No Seasons & No DST'}
                    </span>
                  </div>
                  <p className="text-[7.5px] text-white/60 leading-tight">
                    {language === 'pt' 
                      ? 'Localizado na Linha do Equador (Latitude 0°, com + ou -) em regime solar direto constante, sem ocorrência de estações do ano e sem horário de verão (DST).'
                      : 'Located on the Equator (Latitude 0°, with + or -) with constant direct solar regime, observing no seasonal transitions and no daylight saving time (DST).'}
                  </p>
                </div>
              )}

              {effectiveCoords && (<>
                         <DaylightChart coords={effectiveCoords} manualOffset={solarInfo?.timezoneOffset || 0} axialTilt={axialTilt} />
                         <div className="mt-2 mb-3">
                           <SunPathCanvas 
                             latitude={effectiveCoords.latitude} 
                             longitude={effectiveCoords.longitude} 
                             date={displayDate} 
                             timezoneOffset={solarInfo?.timezoneOffset} 
                             language={language} 
                           />
                         </div>
                         {solarInfo && (
                           <div className="mt-2 mb-3">
                             <SubsolarWorldMap 
                               solarInfo={solarInfo}
                               currentDate={displayDate}
                               userCoords={effectiveCoords}
                               locationName={manualLocation?.name || (language === 'pt' ? 'Sua Posição' : 'Your Location')}
                               language={language}
                               axialTilt={axialTilt}
                             />
                           </div>
                         )}
                   <div className="flex flex-col items-center gap-1 text-[6px] opacity-40 uppercase tracking-[0.2em] px-1 mb-2">
                     <span>Luz Solar</span>
                     <span>{t.astronightDuration || 'Astr. Night'}: {(() => {
                       const dusk = solarInfo?.eventTimes?.astronomicalDusk;
                       const dawn = solarInfo?.eventTimes?.astronomicalDawn;
                       if (!dusk || !dawn) return '---';
                       let diff = (dawn.getTime() - dusk.getTime()) / (1000 * 60 * 60);
                       if (diff < 0) diff += 24;
                       return diff.toFixed(1) + 'h';
                     })()}</span>
                   </div>
                   <SolarWidgets solarInfo={solarInfo!} t={t} activePeriod={activePeriod} />
                   {solarInfo && (
                     <div className="mt-2 px-2">
                       <SolarAngleVisualizer solarInfo={solarInfo} t={t} language={language} />
                     </div>
                   )}
                    {solarInfo && (
                      <AstronomicalNightWidget 
                        astronomicalDusk={solarInfo.eventTimes.astronomicalDusk}
                        astronomicalDawn={solarInfo.eventTimes.astronomicalDawn}
                        sunset={solarInfo.eventTimes.sunset}
                        sunrise={solarInfo.eventTimes.sunrise}
                        nauticalDusk={solarInfo.eventTimes.nauticalDusk}
                        nauticalDawn={solarInfo.eventTimes.nauticalDawn}
                        civilDusk={solarInfo.eventTimes.civilDusk}
                        civilDawn={solarInfo.eventTimes.civilDawn}
                        urbanDayDurationSeconds={solarInfo.urbanDayDurationSeconds}
                        urbanNightDurationSeconds={solarInfo.urbanNightDurationSeconds}
                      />
                    )}
                   <SolarAnalyticsPanel solarInfo={solarInfo!} t={t} />
                   {solarInfo && effectiveCoords && (
                     <SolarDeclinationTrend 
                       nowMs={nowMs} 
                       latitude={effectiveCoords.latitude} 
                       longitude={effectiveCoords.longitude} 
                       language={language} 
                       axialTilt={axialTilt}
                     />
                   )}
                   <ClockWidgets 
                     date={localCivilTime} 
                     latitude={effectiveCoords?.latitude || 0} 
                     longitude={effectiveCoords?.longitude || 0}
                     onCalendarClick={() => console.log('Calendar clicked')}
                     onSettingsClick={() => setShowSettingsModal(true)}
                     is24hFormat={is24hFormat}
                     onToggleFormat={() => setIs24hFormat(!is24hFormat)}
                     onSolarDeVistaClick={() => setIsSolarDeVistaOpen(true)}
                   />
                 </>
              )}
            </div>
            {isSolarDeVistaOpen && (
              <SolarDeVista 
                onClose={() => setIsSolarDeVistaOpen(false)} 
                solarPosition={{ azimuth: solarInfo?.azimuth || 0, altitude: solarInfo?.altitude || 0 }} 
              />
            )}
            
            <div className="mt-2 pt-2 border-t border-white/5 shrink-0">
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5 p-[1.5px]">
                <div className="h-full w-full bg-indigo-950/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60" style={{ width: '100%' }} />
                  <motion.div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_white] z-10"
                    style={{ left: `${solarProgress}%` }}
                    animate={{ left: `${solarProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-[6px] opacity-20 text-center uppercase tracking-[0.2em] mt-1.5">
                {t.axialPhaseLock}
              </p>
            </div>
          </div>
        </div>
        {fireworksList.map((f, idx) => (
          <Fireworks key={`firework-${f.id}-${idx}`} color={f.color} intensity={f.intensity} onComplete={() => setFireworksList(prev => prev.filter(fl => fl.id !== f.id))} />
        ))}

      </main>

      <footer className="h-8 border-t border-white/10 flex items-center justify-between px-6 bg-black/30 backdrop-blur-md text-[8px] font-mono text-white/30 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-emerald-400/60">
            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
            {t.coreSync}
          </span>
          <span className="opacity-40 uppercase">{location.coords ? t.geodeticLock : t.awaitingLoc}</span>
        </div>
        <div className="flex gap-4 uppercase font-bold opacity-20">
          <span>{manualLocation ? manualLocation.name : t.autoGeo}</span>
          <span>{t.heliocentricRef} • AXIAL_REGISTRY_v4.2</span>
        </div>
      </footer>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass max-w-lg w-full p-10 rounded-[40px] relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowInfo(false)} 
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
              >
                <Loader2 className="w-6 h-6 rotate-45" />
              </button>
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-br from-white to-white/30 bg-clip-text text-transparent">
                {t.simulationInfo}
              </h2>
              <div className="space-y-6 text-white/60 leading-relaxed text-sm">
                <p>
                  Helios {t.modalCalculates} <strong>{t.localSolar}</strong> {t.modalByApplying} 
                  {t.equationShift} {t.modalAdjustedFor}
                </p>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-white font-bold mb-3 text-[10px] uppercase tracking-[0.2em]">{t.ianaSource}</h3>
                  <p className="text-xs text-white/50 leading-relaxed italic border-l border-amber-400/30 pl-3">
                    {t.modalIanaDescription}
                  </p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-white font-bold mb-3 text-[10px] uppercase tracking-[0.2em]">{t.kinematicCorrection}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {t.modalKinematicDescription}
                  </p>
                </div>
                {solarInfo && (
                  <div className="flex flex-col gap-2 bg-amber-400/5 p-4 rounded-xl border border-amber-400/10">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400/80">
                          {t.equationShift} (Atrasado / Adiantado)
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">
                          {language === 'pt' ? 'Atrasado: (-) | Zero: 00:00:000 | Adiantado: (+)' : 'Slow: (-) | Zero: 00:00:000 | Fast: (+)'}
                        </span>
                      </div>
                      <span className="font-mono text-amber-400 font-extrabold text-sm bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/20">
                        {formatEquationOfTime(solarInfo.equationOfTime)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass max-w-lg w-full p-8 rounded-[40px] relative border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                  <Settings className="w-6 h-6 animate-spin-slow" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                    {language === 'pt' ? 'Configurações Globais' : 'Global Settings'}
                  </h2>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">
                    {language === 'pt' ? 'Ajustes de Sistema e Performance' : 'System and Performance Settings'}
                  </p>
                </div>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                {/* Automated Seasonal Color Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 font-sans" style={{ color: effectiveAccentColor }}>
                          <Sparkles className="w-3.5 h-3.5" />
                          {language === 'pt' ? 'Cor Sazonal Automática' : 'Automated Seasonal Color'}
                        </h3>
                        <span 
                          className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${activeSeasonalAccent.badgeBg} ${activeSeasonalAccent.badgeBorder}`}
                        >
                          <span>{activeSeasonalAccent.icon}</span>
                          <span>{language === 'pt' ? activeSeasonalAccent.namePt : activeSeasonalAccent.name}</span>
                        </span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Altera dinamicamente o tom de destaque do tema de acordo com a estação astronômica calculada em tempo real (ex: Ouro no Verão, Âmbar no Outono, Azul no Inverno, Esmeralda na Primavera).' 
                          : 'Dynamically shifts the theme accent color according to the real-time astronomical season (e.g. Warm Gold in Summer, Amber in Autumn, Frost Blue in Winter, Emerald in Spring).'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none mt-1 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isSeasonalColorEnabled}
                        onChange={(e) => setIsSeasonalColorEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          isSeasonalColorEnabled ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : ''
                        }`}
                      />
                    </label>
                  </div>
                </div>

                {/* Otimização Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 text-amber-400 font-sans">
                        <Cpu className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Otimização de Performance' : 'Performance Optimization'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Ativa renderização otimizada. Desativa partículas de transição de estação e o movimento contínuo das engrenagens mecânicas para economizar CPU com os mesmos elementos visuais ativos.' 
                          : 'Enables optimized rendering. Disables seasonal transition particles and continuous mechanical gear rotation to save CPU while keeping the same visual components active.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none mt-1 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isOptimizationMode}
                        onChange={(e) => setIsOptimizationMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    </label>
                  </div>
                </div>

                {/* Melhor Desempenho Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 text-red-400 font-sans">
                        <Sparkles className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Melhor Desempenho' : 'Best Performance'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Modo agressivo para velocidade máxima. Reduz drasticamente a frequência de atualizações da interface e simplifica efeitos visuais.' 
                          : 'Aggressive mode for maximum speed. Drastically reduces UI update frequency and simplifies visual effects.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none mt-1 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isBestPerformanceMode}
                        onChange={(e) => setIsBestPerformanceMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                </div>

                {/* Notificações Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans">
                        <Clock className="w-3.5 h-3.5 text-white/70" />
                        {language === 'pt' ? 'Notificação do Meio-Dia' : 'Noon Notification'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Receba alertas sonoros/visuais no momento exato em que o sol atinge o ponto mais alto do céu (Meio-Dia Solar Real).' 
                          : 'Receive audio/visual alerts at the exact moment the sun reaches its highest point in the sky (True Solar Noon).'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none mt-1 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={solarNoonNotification}
                        onChange={async (e) => {
                          if (e.target.checked) {
                            await Notification.requestPermission();
                          }
                          setSolarNoonNotification(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    </label>
                  </div>
                </div>

                {/* Formato de Hora Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans">
                        <Clock className="w-3.5 h-3.5 text-white/70" />
                        {language === 'pt' ? 'Formato de Exibição' : 'Display Format'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Altera a base dos mostradores digitais e analógicos entre o ciclo clássico de 12 horas e o formato militar de 24 horas.' 
                          : 'Changes the digital and analog clock display base between the classic 12-hour cycle and the 24-hour military format.'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 mt-1">
                      <button 
                        onClick={() => setIs24hFormat(false)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-colors ${!is24hFormat ? 'bg-amber-400 text-black border-amber-400' : 'bg-black/20 text-white/50 border-white/10'}`}
                      >
                        12H
                      </button>
                      <button 
                        onClick={() => setIs24hFormat(true)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-colors ${is24hFormat ? 'bg-amber-400 text-black border-amber-400' : 'bg-black/20 text-white/50 border-white/10'}`}
                      >
                        24H
                      </button>
                    </div>
                  </div>
                </div>

                {/* Configuração de Nuvens Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans text-amber-400">
                          <Cloud className="w-3.5 h-3.5" />
                          {language === 'pt' ? 'Nuvens Dinâmicas' : 'Dynamic Clouds'}
                        </h3>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {language === 'pt' 
                            ? 'Configure o sistema de nuvens dinâmicas na simulação solar do Solaris Clock (Ver o Sol e Rua Solar).' 
                            : 'Configure the dynamic clouds system in Solaris Clock solar simulation (Ver o Sol and Rua Solar).'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {(['trend', 'heavy', 'medium', 'light', 'off'] as const).map((mode) => {
                        const isActive = cloudMode === mode;
                        const labels = language === 'pt' ? {
                          trend: 'Seguir Dia',
                          heavy: 'Pesado',
                          medium: 'Médio',
                          light: 'Leve',
                          off: 'Sem Nuvens'
                        } : {
                          trend: 'Trend',
                          heavy: 'Heavy',
                          medium: 'Medium',
                          light: 'Light',
                          off: 'No Clouds'
                        };
                        return (
                          <button
                            key={mode}
                            onClick={() => setCloudMode(mode)}
                            className={`px-1 py-2 rounded-xl text-[8px] font-mono uppercase tracking-wider font-extrabold transition-all duration-200 border cursor-pointer text-center ${
                              isActive 
                                ? 'bg-amber-400 text-black border-amber-400 font-black shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                                : 'bg-black/20 text-white/50 border-white/10 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {labels[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Configuração de Iluminação da Rua Solar */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans text-amber-400">
                        <Sun className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Luzes da Rua Solar (Iluminação Urbana)' : 'Street Lights (Solar Street)'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt'
                          ? 'Configure a altitude solar (+90° a -90°) em que as luzes acendem/apagam e a transição gradual ou direta.'
                          : 'Configure solar altitude (+90° to -90°) for lights ON/OFF and smooth or direct transition.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setStreetlightOffAngle(-0.8);
                        setStreetlightOnAngle(-6.0);
                        setIsStreetlightTransitionEnabled(true);
                      }}
                      className="px-2 py-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded cursor-pointer transition-colors shrink-0"
                    >
                      {language === 'pt' ? 'Redefinir Padrão' : 'Reset Default'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <span className="text-xs text-white/80 font-medium">
                      {language === 'pt' ? 'Modo de Transição' : 'Transition Mode'}
                    </span>
                    <button
                      onClick={() => setIsStreetlightTransitionEnabled(!isStreetlightTransitionEnabled)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        isStreetlightTransitionEnabled
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-white/10 text-white/60 border-white/10 hover:text-white'
                      }`}
                    >
                      {isStreetlightTransitionEnabled 
                        ? (language === 'pt' ? 'Transição Gradual' : 'Proportional Fade')
                        : (language === 'pt' ? 'Sem Transição (Direto)' : 'Direct Step')}
                    </button>
                  </div>

                  {isStreetlightTransitionEnabled ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/70">{language === 'pt' ? '100% Desligado em (Acima de)' : '100% OFF at (Above)'}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            streetlightOffAngle > 0 
                              ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                              : streetlightOffAngle < 0 
                                ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                                : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                          }`}>
                            {streetlightOffAngle > 0 
                              ? (language === 'pt' ? '+ Acima do Horizonte' : '+ Above Horizon') 
                              : streetlightOffAngle < 0 
                                ? (language === 'pt' ? '- Abaixo do Horizonte' : '- Below Horizon') 
                                : (language === 'pt' ? '0 No Horizonte (Sem Lado)' : '0 On Horizon (No Side)')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="0.1"
                            value={streetlightOffAngle}
                            onChange={(e) => setStreetlightOffAngle(parseFloat(e.target.value))}
                            className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                          />
                          <div className="flex items-center gap-0.5 shrink-0 bg-black/50 border border-white/10 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="-90"
                              max="90"
                              step="0.1"
                              value={Number.isNaN(streetlightOffAngle) ? '' : streetlightOffAngle}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) setStreetlightOffAngle(Math.max(-90, Math.min(90, v)));
                              }}
                              className="w-14 text-right bg-transparent text-amber-300 font-mono font-extrabold text-xs focus:outline-none"
                            />
                            <span className="text-xs font-mono text-white/50">°</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/70">{language === 'pt' ? '100% Ligado em (Abaixo de)' : '100% ON at (Below)'}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            streetlightOnAngle > 0 
                              ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                              : streetlightOnAngle < 0 
                                ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                                : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                          }`}>
                            {streetlightOnAngle > 0 
                              ? (language === 'pt' ? '+ Acima do Horizonte' : '+ Above Horizon') 
                              : streetlightOnAngle < 0 
                                ? (language === 'pt' ? '- Abaixo do Horizonte' : '- Below Horizon') 
                                : (language === 'pt' ? '0 No Horizonte (Sem Lado)' : '0 On Horizon (No Side)')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            step="0.1"
                            value={streetlightOnAngle}
                            onChange={(e) => setStreetlightOnAngle(parseFloat(e.target.value))}
                            className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                          />
                          <div className="flex items-center gap-0.5 shrink-0 bg-black/50 border border-white/10 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="-90"
                              max="90"
                              step="0.1"
                              value={Number.isNaN(streetlightOnAngle) ? '' : streetlightOnAngle}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) setStreetlightOnAngle(Math.max(-90, Math.min(90, v)));
                              }}
                              className="w-14 text-right bg-transparent text-amber-300 font-mono font-extrabold text-xs focus:outline-none"
                            />
                            <span className="text-xs font-mono text-white/50">°</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col gap-2 mt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/70">
                          {language === 'pt' ? 'Corte Direto (≤ 100% Ligado, > 100% Desligado)' : 'Direct Step Bound (≤ 100% ON, > 100% OFF)'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          streetlightOffAngle > 0 
                            ? 'text-amber-300 bg-amber-400/15 border-amber-400/30' 
                            : streetlightOffAngle < 0 
                              ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30' 
                              : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                        }`}>
                          {streetlightOffAngle > 0 
                            ? (language === 'pt' ? '+ Acima do Horizonte' : '+ Above Horizon') 
                            : streetlightOffAngle < 0 
                              ? (language === 'pt' ? '- Abaixo do Horizonte' : '- Below Horizon') 
                              : (language === 'pt' ? '0 No Horizonte (Sem Lado)' : '0 On Horizon (No Side)')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          step="0.1"
                          value={streetlightOffAngle}
                          onChange={(e) => setStreetlightOffAngle(parseFloat(e.target.value))}
                          className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                        />
                        <div className="flex items-center gap-0.5 shrink-0 bg-black/50 border border-white/10 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            min="-90"
                            max="90"
                            step="0.1"
                            value={Number.isNaN(streetlightOffAngle) ? '' : streetlightOffAngle}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) setStreetlightOffAngle(Math.max(-90, Math.min(90, v)));
                            }}
                            className="w-14 text-right bg-transparent text-amber-300 font-mono font-extrabold text-xs focus:outline-none"
                          />
                          <span className="text-xs font-mono text-white/50">°</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RAM Limit Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 text-amber-400 font-sans">
                      <Cpu className="w-3.5 h-3.5" />
                      {language === 'pt' ? 'Limite de Memória (RAM)' : 'Memory Limit (RAM)'}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {(['2GB', '4GB', '6GB', '8GB', '10GB', '12GB', 'Unlimited'] as const).map((limit) => (
                        <button
                          key={limit}
                          onClick={() => setRamLimit(limit)}
                          className={`px-2 py-2 rounded-xl text-[9px] font-mono font-bold transition-all border ${
                            ramLimit === limit
                              ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                              : 'bg-black/20 text-white/50 border-white/10 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {limit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sincronização Solar Automática (Auto Solar Sync) Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 text-amber-400 font-sans">
                        <Sparkles className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Sincronização Solar Automática' : 'Automatic Solar Sync'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Ajusta dinamicamente a correção civil (civil shift) para eliminar qualquer desvio entre o fuso horário oficial e o Horário Solar Aparente Local, mantendo o relógio em perfeita sintonia astronômica.' 
                          : 'Dynamically adjusts the civil shift to eliminate any drift between standard official time and the Local Apparent Solar Time, keeping the clock in perfect astronomical alignment.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none mt-1 shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isAutoSolarSync}
                        onChange={(e) => setIsAutoSolarSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                    </label>
                  </div>
                </div>

                {/* Painel de Ajustes Rápidos de Fuso Horário Section */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans text-amber-400">
                          <Globe className="w-3.5 h-3.5 animate-spin-slow" style={{ animationDuration: '10s' }} />
                          {language === 'pt' ? 'Painel de Fuso Horário' : 'Timezone Quick Config'}
                        </h3>
                        <p className="text-xs text-white/50 leading-relaxed">
                          {language === 'pt' 
                            ? 'Alterne rapidamente entre o Horário Local do sistema, UTC (GMT), Fuso Geográfico ou Deslocamento Personalizado com botões +/- 15 min.' 
                            : 'Quickly toggle between Local device time, UTC, Geographic longitude offset, or Custom shift with +/- 15 min controls.'}
                        </p>
                      </div>
                    </div>

                    {/* Fast Mode Toggle Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                      {[
                        { id: 'local', labelPt: 'Local (Navegador)', labelEn: 'Local Time' },
                        { id: 'utc', labelPt: 'UTC (GMT±0)', labelEn: 'UTC (GMT±0)' },
                        { id: 'geographic', labelPt: 'Geográfico', labelEn: 'Geographic' },
                        { id: 'full-hour', labelPt: 'Hora Cheia', labelEn: 'Full Hour' },
                        { id: 'custom', labelPt: 'Personalizado', labelEn: 'Custom Shift' }
                      ].map(modeOpt => (
                        <button 
                          key={modeOpt.id}
                          type="button"
                          onClick={() => setGlobalTimezoneMode(modeOpt.id as any)}
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer font-mono text-center ${
                            globalTimezoneMode === modeOpt.id 
                              ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)] font-extrabold' 
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                          }`}
                        >
                          {language === 'pt' ? modeOpt.labelPt : modeOpt.labelEn}
                        </button>
                      ))}
                    </div>

                    {/* Controls for Custom / Fine-tune Offset (+/- 15min) */}
                    <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-3 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-mono font-bold uppercase text-white/60">
                          {language === 'pt' ? 'Ajuste Fino de Deslocamento (+/- 15m):' : 'Fine Offset Controls (+/- 15m):'}
                        </span>
                        <span className="text-xs font-mono font-extrabold text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                          {baseOffset >= 0 ? '+' : ''}{Math.floor(baseOffset / 60)}h {Math.abs(Math.round(baseOffset % 60))}m ({baseOffset}m)
                        </span>
                      </div>

                      {/* +/- 15 min & +/- 1h Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(prev => Math.max(-720, prev - 60));
                          }}
                          className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-mono font-bold text-white transition-all text-center cursor-pointer active:scale-95"
                          title="-1 hora"
                        >
                          -1h
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(prev => Math.max(-720, prev - 15));
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 rounded-lg text-[10px] font-mono font-extrabold text-amber-300 transition-all text-center cursor-pointer active:scale-95"
                          title="-15 minutos"
                        >
                          -15m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(0);
                          }}
                          className="py-1.5 px-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-[9px] font-mono font-bold text-white/80 transition-all text-center cursor-pointer"
                          title="Zerar para UTC 0"
                        >
                          UTC 0
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(prev => Math.min(840, prev + 15));
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 rounded-lg text-[10px] font-mono font-extrabold text-amber-300 transition-all text-center cursor-pointer active:scale-95"
                          title="+15 minutos"
                        >
                          +15m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(prev => Math.min(840, prev + 60));
                          }}
                          className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-mono font-bold text-white transition-all text-center cursor-pointer active:scale-95"
                          title="+1 hora"
                        >
                          +1h
                        </button>
                      </div>

                      {/* Dropdown & Quick Presets */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <select
                          value={globalCustomTimezoneOffset}
                          onChange={(e) => {
                            setGlobalTimezoneMode('custom');
                            setGlobalCustomTimezoneOffset(parseInt(e.target.value, 10));
                          }}
                          className="w-full bg-black/60 border border-white/15 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:border-amber-400 text-amber-300 font-bold select-none cursor-pointer"
                        >
                          {[
                            { label: "UTC-12:00 (Linha de Data Ocidental)", value: -720 },
                            { label: "UTC-11:00 (Samoa Americana)", value: -660 },
                            { label: "UTC-10:00 (Havaí / HST)", value: -600 },
                            { label: "UTC-09:30 (Ilhas Marquesas)", value: -570 },
                            { label: "UTC-09:00 (Alasca / AKST)", value: -540 },
                            { label: "UTC-08:00 (Pacífico EUA / PST / LA)", value: -480 },
                            { label: "UTC-07:00 (Montanhas EUA / MST / Denver)", value: -420 },
                            { label: "UTC-06:00 (Central EUA / CST / México)", value: -360 },
                            { label: "UTC-05:00 (Leste EUA / EST / Nova York / Lima)", value: -300 },
                            { label: "UTC-04:00 (Caracas / Manaus / La Paz / AST)", value: -240 },
                            { label: "UTC-03:30 (Terranova / Newfoundland)", value: -210 },
                            { label: "UTC-03:00 (Brasília / Buenos Aires / Montevidéu)", value: -180 },
                            { label: "UTC-02:00 (Fernando de Noronha)", value: -120 },
                            { label: "UTC-01:00 (Cabo Verde / Açores)", value: -60 },
                            { label: "UTC±00:00 (GMT / UTC / Londres / Lisboa)", value: 0 },
                            { label: "UTC+01:00 (Europa Central / CET / Paris / Madri)", value: 60 },
                            { label: "UTC+02:00 (Europa Oriental / EET / Atenas / Cairo)", value: 120 },
                            { label: "UTC+03:00 (Moscou / Istambul / Riad)", value: 180 },
                            { label: "UTC+03:30 (Teerã)", value: 210 },
                            { label: "UTC+04:00 (Dubai / Abu Dhabi / GST)", value: 240 },
                            { label: "UTC+04:30 (Cabul)", value: 270 },
                            { label: "UTC+05:00 (Carachi / Tasquente)", value: 300 },
                            { label: "UTC+05:30 (Índia / IST / Nova Delhi)", value: 330 },
                            { label: "UTC+05:45 (Katmandu / Nepal)", value: 345 },
                            { label: "UTC+06:00 (Daca / Almaty)", value: 360 },
                            { label: "UTC+06:30 (Mianmar / Yangon)", value: 390 },
                            { label: "UTC+07:00 (Bancoc / Jacarta / Hanói)", value: 420 },
                            { label: "UTC+08:00 (Pequim / Singapura / Hong Kong / Perth)", value: 480 },
                            { label: "UTC+08:45 (Eucla)", value: 525 },
                            { label: "UTC+09:00 (Tóquio / Seul / JST)", value: 540 },
                            { label: "UTC+09:30 (Adelaide / Darwin / ACST)", value: 570 },
                            { label: "UTC+10:00 (Sua / Sydney / AEST / Guam)", value: 600 },
                            { label: "UTC+10:30 (Ilha Lord Howe)", value: 630 },
                            { label: "UTC+11:00 (Ilhas Salomão / Nova Caledônia)", value: 660 },
                            { label: "UTC+12:00 (Auckland / Fiji / NZST)", value: 720 },
                            { label: "UTC+12:45 (Ilhas Chatham)", value: 765 },
                            { label: "UTC+13:00 (Samoa / Tonga)", value: 780 },
                            { label: "UTC+14:00 (Kiritimati / Ilhas Linha)", value: 840 }
                          ].map((offset, idx) => (
                            <option key={`tz-opt-${offset.value}-${idx}`} value={offset.value} className="bg-slate-900 text-white font-mono">
                              {offset.label}
                            </option>
                          ))}
                        </select>

                        {/* Quick Presets Pills */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[8px] font-mono text-white/40 uppercase mr-1">
                            {language === 'pt' ? 'Atalhos:' : 'Shortcuts:'}
                          </span>
                          {[
                            { label: 'EST (-5h)', val: -300 },
                            { label: 'BRT (-3h)', val: -180 },
                            { label: 'UTC (0h)', val: 0 },
                            { label: 'CET (+1h)', val: 60 },
                            { label: 'IST (+5:30)', val: 330 },
                            { label: 'SGT (+8h)', val: 480 },
                            { label: 'JST (+9h)', val: 540 }
                          ].map(preset => (
                            <button
                              key={`tz-preset-${preset.val}`}
                              type="button"
                              onClick={() => {
                                setGlobalTimezoneMode('custom');
                                setGlobalCustomTimezoneOffset(preset.val);
                              }}
                              className={`text-[8px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                globalCustomTimezoneOffset === preset.val && globalTimezoneMode === 'custom'
                                  ? 'bg-amber-400 text-black border-amber-400 font-extrabold'
                                  : 'bg-white/5 hover:bg-white/15 text-white/70 border-white/10'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Seção Aceitar Variação Sazonal Prevista Sem Teimosia */}
                    <div className="p-3 bg-amber-400/5 rounded-xl border border-amber-400/20 space-y-2 mt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-amber-300 font-mono">
                            <span>☀️</span>
                            {language === 'pt' ? 'Aceitar Variação Sazonal Prevista' : 'Accept Predicted Seasonal Variation'}
                          </h4>
                          <p className="text-[10px] text-white/60 leading-relaxed mt-0.5">
                            {language === 'pt' 
                              ? 'Quando ligada, aceita e aplica as variações sazonais previstas (da Posição Personalizada ou do Gerenciador de Temporadas). Quando desligada, mantém o horário padrão fixo sem adiantamento sazonal.' 
                              : 'When enabled, accepts and applies predicted seasonal variations (from Custom Position or Season Manager). When disabled, maintains fixed standard time with no seasonal shift.'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={enableSeasonalVariation}
                            onChange={(e) => setEnableSeasonalVariation(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div 
                            className={`w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                              enableSeasonalVariation ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : ''
                            }`}
                          />
                        </label>
                      </div>

                      {/* Real-time Seasonal Status Indicator */}
                      <div className="flex items-center justify-between text-[9.5px] font-mono pt-1 border-t border-amber-400/10">
                        <span className="text-white/50">{language === 'pt' ? 'Modo de Variação:' : 'Variation Mode:'}</span>
                        {enableSeasonalVariation ? (
                          <span className="text-amber-300 font-bold bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/40 flex items-center gap-1">
                            <span>☀️</span>
                            <span>{language === 'pt' ? `Variação Sazonal Prevista Ativa (${effectiveShift >= 0 ? '+' : ''}${effectiveShift} min)` : `Predicted Seasonal Variation Active (${effectiveShift >= 0 ? '+' : ''}${effectiveShift} min)`}</span>
                          </span>
                        ) : (
                          <span className="text-white/60 font-bold bg-white/10 px-2 py-0.5 rounded border border-white/20 flex items-center gap-1">
                            <span>🚫</span>
                            <span>{language === 'pt' ? 'Horário Padrão Fixo (Sem Variação Sazonal)' : 'Fixed Standard Time (No Seasonal Shift)'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inclinação Axial (Axial Tilt) */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1 font-sans text-amber-400">
                        <Globe className="w-3.5 h-3.5" />
                        {language === 'pt' ? 'Inclinação Axial do Planeta' : 'Planetary Axial Tilt'}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {language === 'pt' 
                          ? 'Ajuste o ângulo de inclinação do eixo de rotação planetária (0° a 90°). Altera a amplitude das estações e a variação da declinação solar.' 
                          : 'Adjust the planetary axial tilt angle (0° to 90°). Alters seasonal amplitude and solar declination range.'}
                      </p>
                    </div>
                    <span className="font-mono text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 text-xs font-black shrink-0">
                      {axialTilt.toFixed(2)}°
                    </span>
                  </div>

                  {/* Presets Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setAxialTilt(23.44)}
                      className={`px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        Math.abs(axialTilt - 23.44) < 0.05
                          ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black'
                          : 'bg-black/30 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {language === 'pt' ? '23.44° (Normal/Original)' : '23.44° (Normal/Original)'}
                    </button>

                    <button
                      onClick={() => setAxialTilt(45.00)}
                      className={`px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        Math.abs(axialTilt - 45.00) < 0.05
                          ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black'
                          : 'bg-black/30 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {language === 'pt' ? '45.00° (Meio a Meio)' : '45.00° (Half & Half)'}
                    </button>

                    <button
                      onClick={() => setAxialTilt(0.00)}
                      className={`px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        Math.abs(axialTilt - 0.00) < 0.05
                          ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black'
                          : 'bg-black/30 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {language === 'pt' ? '0.00° (Perpendicular)' : '0.00° (No Tilt)'}
                    </button>

                    <button
                      onClick={() => setAxialTilt(90.00)}
                      className={`px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                        Math.abs(axialTilt - 90.00) < 0.05
                          ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black'
                          : 'bg-black/30 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {language === 'pt' ? '90.00° (Extrema)' : '90.00° (Extreme)'}
                    </button>
                  </div>

                  {/* Slider & Manual Input */}
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                    <span className="text-xs font-mono text-white/40">0°</span>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="0.01"
                      value={axialTilt}
                      onChange={(e) => setAxialTilt(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-400 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-mono text-white/40">90°</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2 border-l border-white/10 pl-3">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="0.01"
                        value={axialTilt}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setAxialTilt(Math.max(0, Math.min(90, val)));
                          }
                        }}
                        className="w-20 bg-black/60 border border-white/15 rounded-lg py-1 px-2 text-xs font-mono font-bold text-amber-400 text-center focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-white/50 font-bold">°</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  {language === 'pt' ? 'Fechar' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* SkyView component */}
        {showSkyView && solarInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <SkyView 
             altitude={solarInfo.altitude} 
             azimuth={solarInfo.azimuth}
             solarDate={solarInfo.solarDate}
             onClose={() => setShowSkyView(false)} 
             dateStr={formatLocalDate(localCivilTime)}
             civilTimeStr={formatLocalTime(localCivilTime)}
             solarTimeStr={formatFullTime(solarInfo.solarDate, true)}
             moonPhase={solarInfo.moonPhase}
             latitude={effectiveCoords?.latitude}
             longitude={effectiveCoords?.longitude}
             scope={skyViewScope}
             onScopeChange={setSkyViewScope}
             language={language}
             cloudMode={cloudMode}
             onCloudModeChange={setCloudMode}
             isOptimizationMode={isOptimizationMode}
             cloudOpacity={cloudOpacity}
             onCloudOpacityChange={setCloudOpacity}
           />
          </motion.div>
        )}
        {showRuaSolar && solarInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
           <RuaSolar 
             altitude={solarInfo.altitude} 
             azimuth={solarInfo.azimuth}
             solarDate={solarInfo.solarDate}
             onClose={() => setShowRuaSolar(false)} 
             ramLimit={ramLimit}
             setRamLimit={setRamLimit}
             dateStr={formatLocalDate(localCivilTime)}
             civilTimeStr={formatLocalTime(localCivilTime)}
             solarTimeStr={formatFullTime(solarInfo.solarDate, true)}
             moonPhase={solarInfo.moonPhase}
             latitude={effectiveCoords?.latitude}
             longitude={effectiveCoords?.longitude}
             locationName={manualLocation?.name || 'Localização Atual'}
             localCivilTime={localCivilTime}
             onTimeChange={handleManualTimeChange}
             cloudMode={cloudMode}
             onCloudModeChange={setCloudMode}
             isOptimizationMode={isOptimizationMode}
             cloudOpacity={cloudOpacity}
             onCloudOpacityChange={setCloudOpacity}
             streetlightOffAngle={streetlightOffAngle}
             onStreetlightOffAngleChange={setStreetlightOffAngle}
             streetlightOnAngle={streetlightOnAngle}
             onStreetlightOnAngleChange={setStreetlightOnAngle}
             isStreetlightTransitionEnabled={isStreetlightTransitionEnabled}
             onStreetlightTransitionToggle={(val) => setIsStreetlightTransitionEnabled(val)}
           />
          </motion.div>
        )}
        <LocationSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectLocation={selectLocation}
          onResetToGPS={resetToGPS}
          hasManualLocation={!!manualLocation}
          manualLocation={manualLocation}
          language={language}
          t={t}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onDeleteFavorite={deleteFavoriteItem}
          isFavorite={isFavorite}
          locationHistory={locationHistory}
          onClearHistory={() => {
            setLocationHistory([]);
            localStorage.removeItem("helios_history");
          }}
          onDeleteHistoryItem={deleteHistoryItem}
          onOpenCreatorChat={() => setIsCreatorChatOpen(true)}
          effectiveCoords={effectiveCoords}
          baseNowMs={nowMs}
          axialTilt={axialTilt}
        />
        <WristwatchModal
          isOpen={showWristwatchModal}
          onClose={() => setShowWristwatchModal(false)}
          localCivilTime={localCivilTime}
          solarInfo={solarInfo}
          effectiveCoords={effectiveCoords}
          language={language}
          is24hFormat={is24hFormat}
          onToggleFormat={() => setIs24hFormat(!is24hFormat)}
        />
        {showSubsolarModal && solarInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setShowSubsolarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSubsolarModal(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
              <SubsolarWorldMap
                solarInfo={solarInfo}
                currentDate={displayDate}
                localCivilTime={localCivilTime}
                userCoords={effectiveCoords}
                locationName={manualLocation?.name || (language === 'pt' ? 'Sua Posição' : 'Your Location')}
                language={language}
                allowFullscreen={false}
                axialTilt={axialTilt}
              />
            </motion.div>
          </motion.div>
        )}
        <ThemeSelector
          isOpen={showThemeModal}
          onClose={() => setShowThemeModal(false)}
          onSelect={(theme) => {
            setCurrentTheme(theme);
          }}
          onGenerate={generateTheme}
          predefinedThemes={PREDEFINED_THEMES}
          currentTheme={currentTheme}
          isGenerating={isGenerating}
          prompt={customThemePrompt}
          setPrompt={setCustomThemePrompt}
          isSeasonalColorEnabled={isSeasonalColorEnabled}
          onToggleSeasonalColor={setIsSeasonalColorEnabled}
          currentSeason={seasonInfo?.season}
          language={language}
        />
        <SeasonManagerModal
          isOpen={showSeasonManagerModal}
          onClose={() => setShowSeasonManagerModal(false)}
          config={seasonManagerConfig}
          onChangeConfig={(newCfg) => setSeasonManagerConfig(newCfg)}
          currentAstronomicalSeason={rawAstronomicalSeasonInfo?.season}
          effectiveSeason={seasonInfo?.season}
          latitude={effectiveCoords?.latitude}
          longitude={effectiveCoords?.longitude}
          offsetMinutes={solarInfo?.timezoneOffset ?? baseOffset}
          baseOffset={baseOffset}
          location={manualLocation}
          nowMs={isSimulation ? simulationDate : nowMs}
          language={language}
          enableSeasonalVariation={enableSeasonalVariation}
          onToggleSeasonalVariation={setEnableSeasonalVariation}
          customAxialTilt={axialTilt}
        />
        <TimeComparisonModal
          isOpen={showTimeComparisonModal}
          onClose={() => setShowTimeComparisonModal(false)}
          language={language}
          currentDate={displayDate}
          userCoords={effectiveCoords || { latitude: 0, longitude: 0 }}
          locationName={manualLocation?.name || (language === 'pt' ? 'Sua Posição' : 'Your Location')}
          timezoneOffset={baseOffset}
        />
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {shareToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-emerald-600/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500/30 font-sans text-xs font-semibold uppercase tracking-wider"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            {shareToastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {manualLocation && (
        <LocationHistoryChat
          isOpen={isHistoryChatOpen}
          onClose={() => setIsHistoryChatOpen(false)}
          locationName={manualLocation.name}
          latitude={manualLocation.latitude}
          longitude={manualLocation.longitude}
          timezoneOffset={isMoroccoLocation(manualLocation) ? getMoroccoTimezoneOffset(isSimulation ? simulationDate : nowMs) : manualLocation.timezoneOffset}
          language={language}
          ramLimit={ramLimit}
        />
      )}

      <CustomLocationCreatorChat
        isOpen={isCreatorChatOpen}
        onClose={() => setIsCreatorChatOpen(false)}
        onSelectLocation={(loc) => {
          selectLocation(loc);
        }}
        currentCoords={effectiveCoords ? { latitude: effectiveCoords.latitude, longitude: effectiveCoords.longitude } : undefined}
        language={language}
      />

      {/* Subtle Seasonal & Rule Transition Gradient Overlay */}
      <AnimatePresence>
        {transitionNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0.45, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[80] pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${transitionNotification.colors[0]} 0%, ${transitionNotification.colors[1]} 100%)`
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Transition Notification Card */}
      <AnimatePresence>
        {transitionNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-16 left-1/2 z-[90] flex items-center gap-4 bg-slate-950/90 border border-white/15 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl max-w-md w-[92%] pointer-events-auto"
          >
            <div className="flex-1">
              <h4 className="text-sm font-sans font-bold text-white tracking-wide uppercase flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: transitionNotification.colors[0].replace(/0\.\d+/, '1.0') }} />
                {transitionNotification.title}
              </h4>
              <p className="text-xs font-mono text-white/70 mt-1.5 leading-relaxed">
                {transitionNotification.description}
              </p>
            </div>
            <button
              onClick={() => setTransitionNotification(null)}
              className="text-white/40 hover:text-white/80 p-1 rounded-full hover:bg-white/5 transition-all cursor-pointer self-start"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
