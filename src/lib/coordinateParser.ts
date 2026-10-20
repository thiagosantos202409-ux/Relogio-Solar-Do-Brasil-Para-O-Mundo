/**
 * High-precision coordinate parser for 100% original coordinates pasted from any format:
 * - Google Maps URLs, Apple Maps, OpenStreetMap URLs
 * - Decimal Degrees: "-23.5505, -46.6333", "-23.5505 -46.6333"
 * - Directional Decimals: "23.5505 S, 46.6333 W", "S 23.5505, W 46.6333"
 * - Degrees Minutes Seconds (DMS): "23°33'01.8\"S 46°38'02.2\"W"
 * - JSON / Key-Value: "lat: -23.5505, lng: -46.6333", '{"latitude": -23.5505, "longitude": -46.6333}'
 * - Geo URIs: "geo:-23.5505,-46.6333"
 */

export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
  latStr: string;
  lonStr: string;
  label?: string;
  is100PercentOriginal: boolean;
}

export function parseCoordinates(input: string): ParsedCoordinates | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  // 1. Google Maps / URL pattern (e.g. /@(-?\d+\.\d+),(-?\d+\.\d+) or ?q=(-?\d+\.\d+),(-?\d+\.\d+) or loc:(-?\d+\.\d+),(-?\d+\.\d+))
  const urlMatch = raw.match(/(?:@|q=|loc:|ll=|query=|\/place\/)(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lon = parseFloat(urlMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return {
        latitude: lat,
        longitude: lon,
        latStr: urlMatch[1],
        lonStr: urlMatch[2],
        label: `Coordenadas URL (${urlMatch[1]}, ${urlMatch[2]})`,
        is100PercentOriginal: true
      };
    }
  }

  // 2. JSON or key-value object (e.g. {"lat": -23.5505, "lng": -46.6333} or lat: -23.5505, lon: -46.6333)
  const jsonLatMatch = raw.match(/(?:latitude|lat)["']?\s*[:=]\s*["']?(-?\d+(?:\.\d+)?)/i);
  const jsonLonMatch = raw.match(/(?:longitude|lng|lon|long)["']?\s*[:=]\s*["']?(-?\d+(?:\.\d+)?)/i);
  if (jsonLatMatch && jsonLonMatch) {
    const lat = parseFloat(jsonLatMatch[1]);
    const lon = parseFloat(jsonLonMatch[1]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return {
        latitude: lat,
        longitude: lon,
        latStr: jsonLatMatch[1],
        lonStr: jsonLonMatch[1],
        label: `Coordenadas Estruturadas (${jsonLatMatch[1]}, ${jsonLonMatch[1]})`,
        is100PercentOriginal: true
      };
    }
  }

  // 3. DMS (Degrees Minutes Seconds, e.g. 23°33'01.8"S 46°38'02.2"W or 23° 33' S, 46° 38' W)
  const dmsRegex = /(\d+(?:\.\d+)?)\s*°?\s*(\d+(?:\.\d+)?)?\s*['′]?\s*(\d+(?:\.\d+)?)?\s*["″]?\s*([NSEW])/gi;
  const dmsMatches = [...raw.matchAll(dmsRegex)];
  if (dmsMatches.length >= 2) {
    let latVal: number | null = null;
    let lonVal: number | null = null;
    let latStr = '';
    let lonStr = '';

    for (const m of dmsMatches) {
      const deg = parseFloat(m[1]) || 0;
      const min = parseFloat(m[2]) || 0;
      const sec = parseFloat(m[3]) || 0;
      const dir = m[4].toUpperCase();
      const dec = deg + min / 60 + sec / 3600;
      if (dir === 'N' || dir === 'S') {
        latVal = dir === 'S' ? -dec : dec;
        latStr = latVal.toFixed(6);
      } else if (dir === 'E' || dir === 'W') {
        lonVal = dir === 'W' ? -dec : dec;
        lonStr = lonVal.toFixed(6);
      }
    }

    if (latVal !== null && lonVal !== null && Math.abs(latVal) <= 90 && Math.abs(lonVal) <= 180) {
      return {
        latitude: latVal,
        longitude: lonVal,
        latStr: latStr || latVal.toString(),
        lonStr: lonStr || lonVal.toString(),
        label: `Coordenadas DMS (${latVal.toFixed(4)}°, ${lonVal.toFixed(4)}°)`,
        is100PercentOriginal: true
      };
    }
  }

  // 4. Directional Decimals (e.g. "23.5505 S, 46.6333 W" or "S 23.5505, W 46.6333" or "23.5505°S, 46.6333°W")
  const dirDecMatch = raw.match(/([NS])?\s*(\d+(?:\.\d+)?)\s*°?\s*([NS])?[,\s/|;]+([EW])?\s*(\d+(?:\.\d+)?)\s*°?\s*([EW])?/i);
  if (dirDecMatch) {
    const ns = (dirDecMatch[1] || dirDecMatch[3] || '').toUpperCase();
    const ew = (dirDecMatch[4] || dirDecMatch[6] || '').toUpperCase();
    if (ns && ew) {
      let lat = parseFloat(dirDecMatch[2]);
      let lon = parseFloat(dirDecMatch[5]);
      if (ns === 'S') lat = -lat;
      if (ew === 'W') lon = -lon;
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return {
          latitude: lat,
          longitude: lon,
          latStr: lat.toString(),
          lonStr: lon.toString(),
          label: `Coordenadas Geográficas (${lat}, ${lon})`,
          is100PercentOriginal: true
        };
      }
    }
  }

  // 5. Standard Decimal Degrees separated by comma, semicolon, space, pipe or slash:
  // e.g. "-23.550500, -46.633300", "-23.550500 -46.633300", "40.7128; -74.0060"
  const standardMatch = raw.match(/^(-?\d+(?:\.\d+)?)\s*°?\s*[,;\s/|]+\s*(-?\d+(?:\.\d+)?)\s*°?$/);
  if (standardMatch) {
    const lat = parseFloat(standardMatch[1]);
    const lon = parseFloat(standardMatch[2]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return {
        latitude: lat,
        longitude: lon,
        latStr: standardMatch[1],
        lonStr: standardMatch[2],
        label: `Coordenadas Exatas (${standardMatch[1]}, ${standardMatch[2]})`,
        is100PercentOriginal: true
      };
    }
  }

  return null;
}

/**
 * Checks if a latitude is located on the Earth's Equator (latitude 0°):
 * Handles 0, -0, +0, and floating point rounding epsilons.
 */
export function isEquatorLatitude(lat: number | string | null | undefined, epsilon: number = 1e-6): boolean {
  if (lat === null || lat === undefined) return false;
  if (typeof lat === 'string') {
    const clean = lat.trim().replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return false;
    return Object.is(num, 0) || Object.is(num, -0) || Math.abs(num) < epsilon;
  }
  if (typeof lat !== 'number' || isNaN(lat)) return false;
  return Object.is(lat, 0) || Object.is(lat, -0) || Math.abs(lat) < epsilon;
}

/**
 * Formats a latitude value:
 * - On the Equator (0.000...° / 00,0000000), it NEVER displays 'N' nor 'S', nor does it display '-' or '+' signs.
 * - For positive latitudes (> 0): displays "X.XX° N" (or "+X.XX°")
 * - For negative latitudes (< 0): displays "X.XX° S" (or "-X.XX°")
 */
export function formatLatitude(lat: number | null | undefined, decimals: number = 3, showDir: boolean = true): string {
  if (lat === null || lat === undefined || isNaN(lat)) return "---";
  const threshold = Math.pow(10, -decimals) / 2;
  if (isEquatorLatitude(lat, Math.max(threshold, 1e-7))) {
    return `${(0).toFixed(decimals)}°`;
  }
  const absVal = Math.abs(lat).toFixed(decimals);
  if (parseFloat(absVal) === 0) {
    return `${(0).toFixed(decimals)}°`;
  }
  if (!showDir) {
    return `${lat > 0 ? '+' : '-'}${absVal}°`;
  }
  return `${absVal}° ${lat > 0 ? 'N' : 'S'}`;
}

/**
 * Formats a signed latitude value:
 * - If on Equator: "0.00°" (no + or -, never N or S)
 * - If > 0: "+X.XX°"
 * - If < 0: "-X.XX°"
 */
export function formatSignedLatitude(lat: number | null | undefined, decimals: number = 2): string {
  if (lat === null || lat === undefined || isNaN(lat)) return "---";
  const threshold = Math.pow(10, -decimals) / 2;
  if (isEquatorLatitude(lat, Math.max(threshold, 1e-7))) {
    return `${(0).toFixed(decimals)}°`;
  }
  const absVal = Math.abs(lat).toFixed(decimals);
  if (parseFloat(absVal) === 0) {
    return `${(0).toFixed(decimals)}°`;
  }
  return `${lat > 0 ? '+' : '-'}${absVal}°`;
}

/**
 * Formats a longitude value:
 * - On 0° (Prime Meridian): "0.000°" (no E or W, no + or -)
 * - If > 0: "X.XX° E" (or "+X.XX°")
 * - If < 0: "X.XX° W" (or "-X.XX°")
 */
export function formatLongitude(lon: number | null | undefined, decimals: number = 3, showDir: boolean = true): string {
  if (lon === null || lon === undefined || isNaN(lon)) return "---";
  const threshold = Math.pow(10, -decimals) / 2;
  if (Object.is(lon, 0) || Object.is(lon, -0) || Math.abs(lon) < Math.max(threshold, 1e-7)) {
    return `${(0).toFixed(decimals)}°`;
  }
  const absVal = Math.abs(lon).toFixed(decimals);
  if (!showDir) {
    return `${lon > 0 ? '+' : '-'}${absVal}°`;
  }
  return `${absVal}° ${lon > 0 ? 'E' : 'W'}`;
}

/**
 * Formats a signed longitude value:
 * - If 0°: "0.00°" (no + or -)
 * - If > 0: "+X.XX°"
 * - If < 0: "-X.XX°"
 */
export function formatSignedLongitude(lon: number | null | undefined, decimals: number = 2): string {
  if (lon === null || lon === undefined || isNaN(lon)) return "---";
  const threshold = Math.pow(10, -decimals) / 2;
  if (Object.is(lon, 0) || Object.is(lon, -0) || Math.abs(lon) < Math.max(threshold, 1e-7)) {
    return `${(0).toFixed(decimals)}°`;
  }
  return `${lon > 0 ? '+' : '-'}${Math.abs(lon).toFixed(decimals)}°`;
}

/**
 * Formats a complete coordinate pair:
 * e.g. "0.00°, -46.63°" or "+35.68°, +139.65°"
 */
export function formatCoordinatePair(lat: number | null | undefined, lon: number | null | undefined, decimals: number = 2, signed: boolean = true): string {
  if (signed) {
    return `${formatSignedLatitude(lat, decimals)}, ${formatSignedLongitude(lon, decimals)}`;
  }
  return `${formatLatitude(lat, decimals)}, ${formatLongitude(lon, decimals)}`;
}
