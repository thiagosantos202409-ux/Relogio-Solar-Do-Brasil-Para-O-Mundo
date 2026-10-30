import { FEATURED_LOCATIONS, MAJOR_SOLAR_OBSERVATORIES, EXTREME_LATITUDE_LOCATIONS } from "../constants";
import { getMoroccoTimezoneOffset } from "../lib/moroccoTimezone";
import { parseCoordinates } from "../lib/coordinateParser";

export interface BaseOffsetTransition {
  id?: string;
  date: string; // XX/XX/XXXX (DD/MM/YYYY)
  time?: string; // XX:XX:XX (HH:MM:SS)
  source?: 'local' | 'utc';
  offset?: string; // UTC+/- XX:XX:XX
  newOffset: number; // in minutes relative to UTC
  validityType?: 'from' | 'single' | 'until' | 'permanent'; // Tipo de vigência
}

export interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  policyHistory?: string; // Short summary of historical timezone/DST changes
  timezoneOffset: number; // in minutes relative to UTC
  dstInfo?: {
    hasDst: boolean;
    start?: string; // DD-MM-YYYY HH:mm
    end?: string;   // DD-MM-YYYY HH:mm
    shift?: number; // shift in minutes (defaults to 60 if not present)
  };
  seasonalPeriods?: {
    id?: string;
    periodMode?: 'standard' | 'selection';
    startRule: string;
    endRule: string;
    shift?: number;
    startTime?: string;
    endTime?: string;
    vigencia?: string;
    validityType?: 'single' | 'range';
    enabled?: boolean;
    isPermanent?: boolean;

    // "Seleção" mode fields
    startDate?: string;
    startTimeSelection?: string;
    startClockSource?: 'local' | 'utc';
    initialShift?: string;
    endDate?: string;
    endTimeSelection?: string;
    endClockSource?: 'local' | 'utc';
    finalShift?: string;
    isEndPermanent?: boolean;
  }[];
  alternativeTimes?: {
    name: string; // e.g., "Urumqi Time"
    shift: number; // shift in minutes (e.g., -120)
  }[];
  baseOffsetTransitions?: BaseOffsetTransition[];
}

// Simple cache to avoid repeated calls for the same query/year/language
const cache = new Map<string, LocationSuggestion[]>();
// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<LocationSuggestion[]>>();

let quotaLimitHitUntil: number = 0;
let rateLimitHitUntil: number = 0;

export const ALL_FALLBACKS: LocationSuggestion[] = [
  ...FEATURED_LOCATIONS,
  ...(typeof MAJOR_SOLAR_OBSERVATORIES !== 'undefined' ? MAJOR_SOLAR_OBSERVATORIES : []),
  ...(typeof EXTREME_LATITUDE_LOCATIONS !== 'undefined' ? EXTREME_LATITUDE_LOCATIONS : [])
];

function getFallbackFeaturedLocations(queryOrCoords: string | { lat: number; lng: number }): LocationSuggestion[] {
  if (typeof queryOrCoords === 'string') {
    const q = queryOrCoords.toLowerCase().trim();
    if (!q) return ALL_FALLBACKS;
    
    // Substring matching on name or description
    const matches = ALL_FALLBACKS.filter(loc => 
      loc.name.toLowerCase().includes(q) || 
      loc.description.toLowerCase().includes(q)
    );
    if (matches.length > 0) return matches.slice(0, 5);
    
    // Word matching
    const words = q.split(/\s+/).filter(Boolean);
    const wordMatches = ALL_FALLBACKS.filter(loc => 
      words.some(word => loc.name.toLowerCase().includes(word) || loc.description.toLowerCase().includes(word))
    );
    if (wordMatches.length > 0) return wordMatches.slice(0, 5);

    // Dynamically generate a fallback matching the requested name to fulfill user intent
    const queryCapitalized = q.charAt(0).toUpperCase() + q.slice(1);
    
    let lat = 0;
    let lng = 0;
    let tzOffset = 0;
    let desc = "Localização estimada";
    let polHistory = "Fuso horário estimado a partir da longitude geográfica.";

    const cityLower = q.toLowerCase();
    if (cityLower.includes("tokyo") || cityLower.includes("toquio")) {
      lat = 35.6762; lng = 139.6503; tzOffset = 9 * 60; desc = "Tóquio, Japão - Estimado offline";
    } else if (cityLower.includes("paris")) {
      lat = 48.8566; lng = 2.3522; tzOffset = 1 * 60; desc = "Paris, França - Estimado offline";
    } else if (cityLower.includes("london") || cityLower.includes("londres")) {
      lat = 51.5074; lng = -0.1278; tzOffset = 0; desc = "Londres, Reino Unido - Estimado offline";
    } else if (cityLower.includes("new york") || cityLower.includes("nova york") || cityLower.includes("nova iorque")) {
      lat = 40.7128; lng = -74.0060; tzOffset = -5 * 60; desc = "Nova York, EUA - Estimado offline";
    } else if (cityLower.includes("sao paulo") || cityLower.includes("são paulo") || cityLower.includes("sp")) {
      lat = -23.5505; lng = -46.6333; tzOffset = -3 * 60; desc = "São Paulo, Brasil - Estimado offline";
    } else if (cityLower.includes("rio de janeiro") || cityLower.includes("rio")) {
      lat = -22.9068; lng = -43.1729; tzOffset = -3 * 60; desc = "Rio de Janeiro, Brasil - Estimado offline";
    } else if (cityLower.includes("lisboa") || cityLower.includes("lisbon")) {
      lat = 38.7223; lng = -9.1393; tzOffset = 0; desc = "Lisboa, Portugal - Estimado offline";
    } else if (cityLower.includes("roma") || cityLower.includes("rome")) {
      lat = 41.9028; lng = 12.4964; tzOffset = 1 * 60; desc = "Roma, Itália - Estimado offline";
    } else if (cityLower.includes("berlim") || cityLower.includes("berlin")) {
      lat = 52.5200; lng = 13.4050; tzOffset = 1 * 60; desc = "Berlim, Alemanha - Estimado offline";
    } else if (cityLower.includes("moscou") || cityLower.includes("moscow")) {
      lat = 55.7558; lng = 37.6173; tzOffset = 3 * 60; desc = "Moscou, Rússia - Estimado offline";
    } else if (cityLower.includes("marrocos") || cityLower.includes("morocco") || cityLower.includes("casablanca") || cityLower.includes("rabat") || cityLower.includes("marrakech") || cityLower.includes("tanger") || cityLower.includes("tangier") || cityLower.includes("fez") || cityLower.includes("fes")) {
      lat = 33.5731; lng = -7.5898; 
      tzOffset = getMoroccoTimezoneOffset(Date.now()); 
      desc = "Marrocos - Até 20/09/2026 01:00 UTC é UTC+1; a partir de 20/09/2026 01:00 UTC (02:00 para 01:00 local) passa para UTC+0 permanente";
      polHistory = "No caso do país Marrocos, até 20/09/2026 às 01:00 UTC o país opera em UTC+1 (Decreto nº 2.18.855 de 2018). A partir de 20/09/2026 às 01:00 UTC (com a transição das 02:00 para as 01:00 no horário local), todos os relógios passam de UTC+1 para UTC+0 permanente.";
    } else if (cityLower.includes("salvador") || cityLower.includes("bahia")) {
      lat = -12.9714; lng = -38.5014; tzOffset = -3 * 60; 
      desc = "Salvador, Bahia, Brasil - Capital da Bahia (Nordeste) • UTC-3 Permanente";
      polHistory = "Salvador e o estado da Bahia operam em UTC-3 permanente. Devido à sua latitude tropical (12°S), não há variação solar apreciável ao longo do ano. O estado foi excluído do horário de verão brasileiro em definitivo.";
    } else if (cityLower.includes("palmas") || cityLower.includes("tocantins")) {
      lat = -10.1844; lng = -48.3336; tzOffset = -3 * 60; 
      desc = "Palmas, Tocantins, Brasil - Capital do Tocantins (Norte) • UTC-3 Permanente";
      polHistory = "Palmas e o estado do Tocantins operam em UTC-3 permanente. Participou excepcionalmente em 2012 (Decreto 7.826), mas foi excluído definitivamente pelo Decreto Federal 8.112/2013 após maciça rejeição da população.";
    } else if (cityLower.includes("cuiaba") || cityLower.includes("cuiabá") || cityLower.includes("mato grosso")) {
      lat = -15.6014; lng = -56.0979; tzOffset = -4 * 60;
      desc = "Cuiabá, Mato Grosso, Brasil - AMT (UTC-4)";
      polHistory = "Mato Grosso e MS operam em AMT (UTC-4). Participavam do horário de verão brasileiro passando para UTC-3 até 2019.";
    } else if (cityLower.includes("rio branco") || cityLower.includes("acre")) {
      lat = -9.9753; lng = -67.8249; tzOffset = -5 * 60;
      desc = "Rio Branco, Acre, Brasil - Fuso do Acre (ACT UTC-5)";
      polHistory = "Acre e extremo oeste do Amazonas operam em UTC-5. O fuso foi restaurado pela Lei Federal nº 12.876/2013 após referendo popular de 2010.";
    } else if (cityLower.includes("brasilia") || cityLower.includes("brasília")) {
      lat = -15.7938; lng = -47.8828; tzOffset = -3 * 60; desc = "Brasília, Brasil - Estimado offline";
    } else {
      let hash = 0;
      for (let i = 0; i < q.length; i++) {
        hash = q.charCodeAt(i) + ((hash << 5) - hash);
      }
      lng = (hash % 180);
      lat = ((hash >> 8) % 65);
      lng = Math.round(lng * 10000) / 10000;
      lat = Math.round(lat * 10000) / 10000;
      tzOffset = Math.round(lng / 15) * 60;
    }

    const dynamicLoc: LocationSuggestion = {
      name: queryCapitalized,
      latitude: lat,
      longitude: lng,
      description: desc,
      policyHistory: polHistory,
      timezoneOffset: tzOffset,
      alternativeTimes: []
    };

    return [dynamicLoc, ...ALL_FALLBACKS.slice(0, 4)];
  } else {
    // Coordinate proximity
    const sorted = [...ALL_FALLBACKS].sort((a, b) => {
      const distA = Math.pow(a.latitude - queryOrCoords.lat, 2) + Math.pow(a.longitude - queryOrCoords.lng, 2);
      const distB = Math.pow(b.latitude - queryOrCoords.lat, 2) + Math.pow(b.longitude - queryOrCoords.lng, 2);
      return distA - distB;
    });
    return [sorted[0]];
  }
}

export async function searchLocations(queryOrCoords: string | { lat: number; lng: number }, year: number = 2026, language: string = "English"): Promise<LocationSuggestion[]> {
  // If a string of raw/formatted coordinates is passed, immediately return 100% original position
  if (typeof queryOrCoords === 'string') {
    const parsed = parseCoordinates(queryOrCoords);
    if (parsed) {
      const lat = parsed.latitude;
      const lon = parsed.longitude;
      const offset = Math.abs(lat) >= 89.9 ? 0 : lon * 4;
      const isPt = language.toLowerCase().includes('portug') || language === 'pt';
      return [{
        name: isPt ? 'Posição 100% Original' : '100% Original Position',
        latitude: lat,
        longitude: lon,
        description: isPt ? `Coordenadas Originais (${parsed.latStr}°, ${parsed.lonStr}°)` : `Original Coordinates (${parsed.latStr}°, ${parsed.lonStr}°)`,
        timezoneOffset: offset,
        alternativeTimes: []
      }];
    }
  }

  const isCoords = typeof queryOrCoords !== 'string';
  const normalizedQueryOrCoords = isCoords 
    ? { lat: Math.round(queryOrCoords.lat * 100) / 100, lng: Math.round(queryOrCoords.lng * 100) / 100 }
    : queryOrCoords;

  const cacheKey = `${JSON.stringify(normalizedQueryOrCoords)}-${year}-${language}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      return await executeSearchLocations(queryOrCoords, year, language, normalizedQueryOrCoords, cacheKey);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

async function executeSearchLocations(
  queryOrCoords: string | { lat: number; lng: number }, 
  year: number, 
  language: string,
  normalizedQueryOrCoords: any,
  cacheKey: string
): Promise<LocationSuggestion[]> {
  if (Date.now() < quotaLimitHitUntil) {
    console.warn("Skipping Gemini call due to quota limit. Using fallbacks.");
    return getFallbackFeaturedLocations(queryOrCoords);
  }
  
  if (Date.now() < rateLimitHitUntil) {
    console.warn("Skipping Gemini call due to temporary rate limit. Using fallbacks.");
    return getFallbackFeaturedLocations(queryOrCoords);
  }
  
  try {
    const response = await fetch("/api/search-locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        queryOrCoords,
        year,
        language
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data)) return getFallbackFeaturedLocations(queryOrCoords);
    
    const transformed = data.map((item: any) => ({
      ...item,
      timezoneOffset: item.timezoneOffset ?? 0,
      alternativeTimes: item.alternativeTimes ?? [],
      dstInfo: item.dstInfo ? {
        ...item.dstInfo,
        start: item.dstInfo.start?.split('\n')[0].trim(),
        end: item.dstInfo.end?.split('\n')[0].trim()
      } : undefined
    }));
    
    cache.set(cacheKey, transformed);
    return transformed;
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    
    const errorString = String(error.message || error);
    const isQuotaExceeded = errorString.toLowerCase().includes('quota');
    const isRateLimit = errorString.includes('429') && !isQuotaExceeded;
    
    if (isQuotaExceeded) {
      console.error("Gemini API quota exceeded. Locking calls for 1 hour.");
      quotaLimitHitUntil = Date.now() + 60 * 60 * 1000;
    } else if (isRateLimit) {
      console.warn("Gemini API temporary rate limit hit. Locking calls for 30 seconds.");
      rateLimitHitUntil = Date.now() + 30 * 1000;
    }

    return getFallbackFeaturedLocations(queryOrCoords);
  }
}
