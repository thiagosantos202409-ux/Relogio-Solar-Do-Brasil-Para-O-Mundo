// Moroccan Timezone Engine & Permanent UTC+0 Transition Law
// Official Transition: 20/09/2026 at 01:00 UTC+0 (Transition from 02:00 to 01:00 local)
// At this exact moment, all clocks in Morocco are readjusted from UTC+1 to UTC+0 Permanente (GMT+0).

export const MOROCCO_TRANSITION_UTC_MS = Date.UTC(2026, 8, 20, 1, 0, 0); // 20/09/2026 01:00:00 UTC

export const MOROCCO_MAJOR_CITIES = [
  { name: "Casablanca, Morocco", latitude: 33.5731, longitude: -7.5898 },
  { name: "Rabat, Morocco", latitude: 34.0209, longitude: -6.8416 },
  { name: "Marrakech, Morocco", latitude: 31.6295, longitude: -7.9811 },
  { name: "Fez, Morocco", latitude: 34.0331, longitude: -5.0003 },
  { name: "Tangier, Morocco", latitude: 35.7595, longitude: -5.8340 },
  { name: "Agadir, Morocco", latitude: 30.4278, longitude: -9.5981 },
  { name: "Meknes, Morocco", latitude: 33.8731, longitude: -5.5407 },
  { name: "Oujda, Morocco", latitude: 34.6867, longitude: -1.9114 },
  { name: "Kenitra, Morocco", latitude: 34.2610, longitude: -6.5802 },
  { name: "Tetouan, Morocco", latitude: 35.5889, longitude: -5.3626 },
  { name: "Essaouira, Morocco", latitude: 31.5085, longitude: -9.7595 },
  { name: "Dakhla, Morocco", latitude: 23.7136, longitude: -15.9348 },
  { name: "Laayoune, Morocco", latitude: 27.1536, longitude: -13.2033 }
];

export function isMoroccoLocation(
  locOrCoords: { name?: string; description?: string; policyHistory?: string; latitude?: number; longitude?: number } | null | undefined
): boolean {
  if (!locOrCoords) return false;

  const text = `${locOrCoords.name || ''} ${locOrCoords.description || ''} ${locOrCoords.policyHistory || ''}`.toLowerCase();
  
  const keywords = [
    'morocco',
    'marrocos',
    'maroc',
    'casablanca',
    'rabat',
    'marrakech',
    'marraquexe',
    'tangier',
    'tanger',
    'tânger',
    'agadir',
    'meknes',
    'meknès',
    'oujda',
    'kenitra',
    'kénitra',
    'tetouan',
    'tétouan',
    'essaouira',
    'nador',
    'safi',
    'el jadida',
    'beni mellal',
    'laayoune',
    'el aaiún',
    'dakhla',
    'ouarzazate',
    'al hoceima',
    'taza',
    'mohammedia'
  ];

  for (const kw of keywords) {
    if (text.includes(kw)) return true;
  }

  // Check coordinates bounding box for the Kingdom of Morocco
  if (locOrCoords.latitude !== undefined && locOrCoords.longitude !== undefined) {
    const lat = locOrCoords.latitude;
    const lon = locOrCoords.longitude;
    // Bounding box from 21°N (southern border) to 36°N (Strait of Gibraltar)
    // and -17.5°W (Atlantic coast) to -1.0°W (eastern Algerian border)
    if (lat >= 21.0 && lat <= 36.0 && lon >= -17.5 && lon <= -1.0) {
      // Exclude Canary Islands archipelago (approx 27.5-29.5N, -18.2 to -13.3W) unless explicitly labeled Morocco
      const isCanary = lat >= 27.5 && lat <= 29.5 && lon >= -18.2 && lon <= -13.3 && !text.includes('morocco') && !text.includes('marrocos');
      if (!isCanary) return true;
    }
  }

  return false;
}

export function getMoroccoTimezoneOffset(timeMs: number): number {
  if (timeMs >= MOROCCO_TRANSITION_UTC_MS) {
    // Permanent UTC+0 (0 minutes) from 20/09/2026 01:00 UTC (02:00 -> 01:00 local) onwards
    return 0;
  }
  // Standard UTC+1 (+60 minutes) prior to transition
  return 60;
}

export function getMoroccoDstInfo(timeMs: number) {
  if (timeMs >= MOROCCO_TRANSITION_UTC_MS) {
    return {
      hasDst: false,
      start: undefined,
      end: undefined,
      shift: 0
    };
  }
  
  // Before transition: Ramadan 2026 temporary suspension (-60m)
  return {
    hasDst: true,
    start: "15-03-2026 03:00",
    end: "19-04-2026 02:00",
    shift: -60
  };
}

export function isMoroccoRamadanActive(timeMs: number, offset: number = 60): boolean {
  if (timeMs >= MOROCCO_TRANSITION_UTC_MS) {
    return false;
  }

  // Ramadan 2026: 15-03-2026 03:00 to 19-04-2026 02:00 local time
  const startMs = Date.UTC(2026, 2, 15, 3, 0); // approx local epoch
  const endMs = Date.UTC(2026, 3, 19, 2, 0);
  const currentStandardLocalEpoch = timeMs + offset * 60000;

  return currentStandardLocalEpoch >= startMs && currentStandardLocalEpoch < endMs;
}

export function parseOffsetStringToMinutes(input: string): number {
  if (!input) return 0;
  const raw = input.trim().toUpperCase();
  
  // Strip UTC or GMT prefix if present
  const clean = raw.replace(/^(UTC|GMT)/, '').trim();
  
  const isNegative = clean.startsWith('-');
  const unsigned = clean.replace(/^[+-]/, '').trim();
  
  if (!unsigned) return 0;

  // Check if formatted as HH:MM:SS or HH:MM or numeric
  const parts = unsigned.split(':');
  if (parts.length >= 1 && unsigned.includes(':')) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parts.length >= 2 ? (parseInt(parts[1], 10) || 0) : 0;
    const seconds = parts.length >= 3 ? (parseInt(parts[2], 10) || 0) : 0;

    const totalMinutes = hours * 60 + minutes + seconds / 60;
    return isNegative ? -totalMinutes : totalMinutes;
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  // If user entered e.g. -3 or +5.5, convert hours to minutes if magnitude <= 16
  if (Math.abs(num) <= 16) {
    return Math.round(num * 60);
  }
  return Math.round(num);
}

export function formatOffsetMinutesToString(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absMin = Math.abs(offsetMinutes);
  const h = Math.floor(absMin / 60);
  const m = Math.floor(absMin % 60);
  const s = Math.floor((absMin * 60) % 60);
  
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  
  return `UTC${sign}${hh}:${mm}:${ss}`;
}

export function parseTransitionDateToUtcMs(
  dateStr: string,
  timeStr?: string,
  source: 'local' | 'utc' = 'local'
): number {
  if (!dateStr) return NaN;
  const trimmedDate = dateStr.trim();
  const trimmedTime = (timeStr || '00:00:00').trim();
  
  let year = NaN, month = NaN, day = NaN;

  // 1. DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmedDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10) - 1;
    year = parseInt(dmyMatch[3], 10);
  } else {
    // 2. YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = trimmedDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10) - 1;
      day = parseInt(ymdMatch[3], 10);
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const parsed = Date.parse(trimmedDate + ' ' + trimmedTime);
    return isNaN(parsed) ? NaN : parsed;
  }

  let hours = 0, minutes = 0, seconds = 0;
  const timeParts = trimmedTime.split(':');
  if (timeParts.length >= 1) hours = parseInt(timeParts[0], 10) || 0;
  if (timeParts.length >= 2) minutes = parseInt(timeParts[1], 10) || 0;
  if (timeParts.length >= 3) seconds = parseInt(timeParts[2], 10) || 0;

  return Date.UTC(year, month, day, hours, minutes, seconds);
}

export function resolveLocationTimezoneOffset(
  loc: {
    name?: string;
    description?: string;
    policyHistory?: string;
    latitude?: number;
    longitude?: number;
    timezoneOffset?: number;
    baseOffsetTransitions?: {
      date: string;
      time?: string;
      source?: 'local' | 'utc';
      offset?: string;
      newOffset: number;
      validityType?: 'from' | 'single' | 'until' | 'permanent';
    }[];
  } | null | undefined,
  timeMs: number
): number {
  if (!loc) return 0;

  if (isMoroccoLocation(loc)) {
    return getMoroccoTimezoneOffset(timeMs);
  }

  if (loc.baseOffsetTransitions && loc.baseOffsetTransitions.length > 0) {
    // Sort transitions in reverse chronological order to find the latest applicable transition
    const sorted = [...loc.baseOffsetTransitions].sort((a, b) => {
      const msA = parseTransitionDateToUtcMs(a.date, a.time, a.source);
      const msB = parseTransitionDateToUtcMs(b.date, b.time, b.source);
      return msB - msA;
    });

    for (const transition of sorted) {
      const transUtcMs = parseTransitionDateToUtcMs(transition.date, transition.time, transition.source);
      const vType = transition.validityType || 'from';

      if (!isNaN(transUtcMs)) {
        if (vType === 'from' || vType === 'permanent') {
          if (timeMs >= transUtcMs) return transition.newOffset;
        } else if (vType === 'until') {
          if (timeMs <= transUtcMs) return transition.newOffset;
        } else if (vType === 'single') {
          const endOfDayMs = transUtcMs + 86400000;
          if (timeMs >= transUtcMs && timeMs < endOfDayMs) return transition.newOffset;
        }
      }
    }
  }

  return loc.timezoneOffset ?? 0;
}

export function getMoroccoPolicyHistory(isPt: boolean = true): string {
  if (isPt) {
    return "No caso do país Marrocos, até 20/09/2026 às 01:00 UTC operava em UTC+1 (GMT+1 / WEST). A partir de 20/09/2026 às 01:00 UTC (com a transição das 02:00 para as 01:00 no horário local), o Marrocos passa de UTC+1 para UTC+0 permanente, extinguindo o horário de verão e unificando todo o país no meridiano de Greenwich.";
  }
  return "In the case of Morocco, until September 20, 2026 at 01:00 UTC it operated on UTC+1 (GMT+1 / WEST). Starting from September 20, 2026 at 01:00 UTC (transitioning from 02:00 to 01:00 local time), Morocco transitions from UTC+1 to permanent UTC+0, abolishing seasonal shifts and unifying the country on the Greenwich meridian.";
}

export function evaluateSeasonalPeriodShift(
  period: any,
  timeMs: number
): { active: boolean; shift: number } {
  if (!period || period.enabled === false) return { active: false, shift: 0 };

  // Mode "Seleção"
  if (period.periodMode === 'selection') {
    if (!period.startDate) return { active: false, shift: 0 };

    const startUtcMs = parseTransitionDateToUtcMs(period.startDate, period.startTimeSelection || '00:00:00', period.startClockSource || 'local');
    if (isNaN(startUtcMs)) return { active: false, shift: 0 };

    const isPermanent = period.isEndPermanent || period.endDate?.toUpperCase() === 'PERMANENTE' || period.endDate?.toUpperCase() === 'PERMANENT';

    if (isPermanent) {
      if (timeMs >= startUtcMs) {
        const initShift = parseInt(period.initialShift ?? period.shift ?? "60", 10);
        return { active: true, shift: isNaN(initShift) ? 60 : initShift };
      }
      return { active: false, shift: 0 };
    }

    if (!period.endDate) return { active: false, shift: 0 };
    const endUtcMs = parseTransitionDateToUtcMs(period.endDate, period.endTimeSelection || '00:00:00', period.endClockSource || 'local');

    if (isNaN(endUtcMs)) return { active: false, shift: 0 };

    if (timeMs >= startUtcMs && timeMs < endUtcMs) {
      const initShift = parseInt(period.initialShift ?? period.shift ?? "60", 10);
      return { active: true, shift: isNaN(initShift) ? 60 : initShift };
    } else if (timeMs >= endUtcMs) {
      const finShift = parseInt(period.finalShift ?? "0", 10);
      return { active: finShift !== 0, shift: isNaN(finShift) ? 0 : finShift };
    }
    return { active: false, shift: 0 };
  }

  return { active: false, shift: 0 };
}
