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

export function parseTransitionDateToUtcMs(dateStr: string): number {
  if (!dateStr) return NaN;
  const trimmed = dateStr.trim();
  
  // 1. DD-MM-YYYY or DD/MM/YYYY with optional HH:mm
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):?(\d{1,2})?)?/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const h = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    return Date.UTC(y, m, d, h, min);
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD with optional HH:mm
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):?(\d{1,2})?)?/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const h = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    return Date.UTC(y, m, d, h, min);
  }

  // 3. Fallback standard parse
  const parsed = Date.parse(trimmed);
  return isNaN(parsed) ? NaN : parsed;
}

export function resolveLocationTimezoneOffset(
  loc: { name?: string; description?: string; policyHistory?: string; latitude?: number; longitude?: number; timezoneOffset?: number; baseOffsetTransitions?: { date: string; newOffset: number }[] } | null | undefined,
  timeMs: number
): number {
  if (!loc) return 0;

  if (isMoroccoLocation(loc)) {
    return getMoroccoTimezoneOffset(timeMs);
  }

  if (loc.baseOffsetTransitions && loc.baseOffsetTransitions.length > 0) {
    // Sort transitions in reverse chronological order to find the latest applicable transition
    const sorted = [...loc.baseOffsetTransitions].sort((a, b) => {
      const msA = parseTransitionDateToUtcMs(a.date);
      const msB = parseTransitionDateToUtcMs(b.date);
      return msB - msA;
    });

    for (const transition of sorted) {
      const transUtcMs = parseTransitionDateToUtcMs(transition.date);
      if (!isNaN(transUtcMs) && timeMs >= transUtcMs) {
        return transition.newOffset;
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
