/**
 * Real Celestial Mechanics & Star Catalog Engine
 * Calculates Local Sidereal Time (LST), equatorial-to-horizontal coordinates (Alt/Az),
 * diurnal Earth rotation around the Celestial Poles, and solar-elevation-based star visibility.
 */

export interface CelestialStar {
  name: string;
  constellation?: string;
  ra: number; // Right Ascension in degrees [0, 360)
  dec: number; // Declination in degrees [-90, +90]
  mag: number; // Apparent visual magnitude (lower = brighter)
  color: string; // Spectral class hex color
  isMajor: boolean;
}

export interface AmbientStar {
  id: number;
  ra: number;
  dec: number;
  mag: number;
  color: string;
  twinkleSpeed: number;
}

// Major visible stars catalog with real-world J2000 coordinates and spectral colors
export const MAJOR_STAR_CATALOG: CelestialStar[] = [
  // 1st Magnitude & Brightest Stars (mag <= 1.5)
  { name: 'Sirius', constellation: 'Cão Maior (Canis Major)', ra: 101.287, dec: -16.716, mag: -1.46, color: '#e0f2fe', isMajor: true },
  { name: 'Canopus', constellation: 'Carina', ra: 95.988, dec: -52.696, mag: -0.74, color: '#f8fafc', isMajor: true },
  { name: 'Rigil Kentaurus (Alpha Centauri)', constellation: 'Centauro', ra: 219.902, dec: -60.834, mag: -0.27, color: '#fef08a', isMajor: true },
  { name: 'Arcturus', constellation: 'Boötes', ra: 213.915, dec: 19.182, mag: -0.05, color: '#fed7aa', isMajor: true },
  { name: 'Vega', constellation: 'Lira (Lyra)', ra: 279.234, dec: 38.783, mag: 0.03, color: '#dbeafe', isMajor: true },
  { name: 'Capella', constellation: 'Cocheiro (Auriga)', ra: 79.172, dec: 45.998, mag: 0.08, color: '#fef08a', isMajor: true },
  { name: 'Rigel', constellation: 'Órion (Orion)', ra: 78.634, dec: -8.201, mag: 0.13, color: '#bfdbfe', isMajor: true },
  { name: 'Procyon', constellation: 'Cão Menor (Canis Minor)', ra: 114.825, dec: 5.225, mag: 0.34, color: '#fef9c3', isMajor: true },
  { name: 'Achernar', constellation: 'Erídano (Eridanus)', ra: 24.429, dec: -57.237, mag: 0.46, color: '#dbeafe', isMajor: true },
  { name: 'Betelgeuse', constellation: 'Órion (Orion)', ra: 88.793, dec: 7.407, mag: 0.50, color: '#fca5a5', isMajor: true },
  { name: 'Hadar (Beta Centauri)', constellation: 'Centauro', ra: 210.956, dec: -60.373, mag: 0.61, color: '#bfdbfe', isMajor: true },
  { name: 'Altair', constellation: 'Águia (Aquila)', ra: 297.696, dec: 8.868, mag: 0.77, color: '#f8fafc', isMajor: true },
  { name: 'Acrux (Cruzeiro do Sul)', constellation: 'Crux', ra: 186.650, dec: -63.099, mag: 0.76, color: '#bfdbfe', isMajor: true },
  { name: 'Aldebaran', constellation: 'Touro (Taurus)', ra: 68.980, dec: 16.509, mag: 0.86, color: '#fed7aa', isMajor: true },
  { name: 'Antares', constellation: 'Escorpião (Scorpius)', ra: 247.352, dec: -26.432, mag: 0.96, color: '#f87171', isMajor: true },
  { name: 'Spica', constellation: 'Virgem (Virgo)', ra: 201.298, dec: -11.161, mag: 0.97, color: '#bfdbfe', isMajor: true },
  { name: 'Pollux', constellation: 'Gêmeos (Gemini)', ra: 116.166, dec: 28.026, mag: 1.14, color: '#fed7aa', isMajor: true },
  { name: 'Fomalhaut', constellation: 'Peixe Austral', ra: 344.413, dec: -29.622, mag: 1.16, color: '#f8fafc', isMajor: true },
  { name: 'Deneb', constellation: 'Cisne (Cygnus)', ra: 310.358, dec: 45.280, mag: 1.25, color: '#e0f2fe', isMajor: true },
  { name: 'Mimosa (Cruzeiro do Sul)', constellation: 'Crux', ra: 191.930, dec: -59.689, mag: 1.25, color: '#bfdbfe', isMajor: true },
  { name: 'Regulus', constellation: 'Leão (Leo)', ra: 152.093, dec: 11.967, mag: 1.35, color: '#dbeafe', isMajor: true },
  { name: 'Adhara', constellation: 'Cão Maior', ra: 104.656, dec: -28.972, mag: 1.50, color: '#bfdbfe', isMajor: true },

  // 2nd Magnitude Stars (mag > 1.5)
  { name: 'Castor', constellation: 'Gêmeos (Gemini)', ra: 113.650, dec: 31.888, mag: 1.58, color: '#f8fafc', isMajor: false },
  { name: 'Gacrux (Cruzeiro do Sul)', constellation: 'Crux', ra: 187.791, dec: -57.112, mag: 1.63, color: '#fca5a5', isMajor: false },
  { name: 'Bellatrix', constellation: 'Órion', ra: 81.283, dec: 6.350, mag: 1.64, color: '#bfdbfe', isMajor: false },
  { name: 'Shaula', constellation: 'Escorpião', ra: 263.402, dec: -37.104, mag: 1.62, color: '#bfdbfe', isMajor: false },
  { name: 'Alnilam (Três Marias)', constellation: 'Órion', ra: 84.053, dec: -1.202, mag: 1.69, color: '#bfdbfe', isMajor: false },
  { name: 'Alnitak (Três Marias)', constellation: 'Órion', ra: 85.190, dec: -1.943, mag: 1.77, color: '#bfdbfe', isMajor: false },
  { name: 'Alioth', constellation: 'Ursa Maior', ra: 193.507, dec: 55.960, mag: 1.77, color: '#f8fafc', isMajor: false },
  { name: 'Dubhe', constellation: 'Ursa Maior', ra: 165.932, dec: 61.751, mag: 1.79, color: '#fed7aa', isMajor: false },
  { name: 'Mirfak', constellation: 'Perseu', ra: 51.080, dec: 49.861, mag: 1.80, color: '#fef9c3', isMajor: false },
  { name: 'Avior', constellation: 'Carina', ra: 125.628, dec: -59.509, mag: 1.86, color: '#fed7aa', isMajor: false },
  { name: 'Menkalinan', constellation: 'Cocheiro', ra: 89.882, dec: 44.948, mag: 1.90, color: '#f8fafc', isMajor: false },
  { name: 'Atria', constellation: 'Triângulo Austral', ra: 252.166, dec: -69.028, mag: 1.91, color: '#fed7aa', isMajor: false },
  { name: 'Peacock', constellation: 'Pavão (Pavo)', ra: 306.412, dec: -56.735, mag: 1.94, color: '#bfdbfe', isMajor: false },
  { name: 'Polaris (Estrela Polar)', constellation: 'Ursa Menor (Polo Norte)', ra: 37.953, dec: 89.264, mag: 1.98, color: '#fef08a', isMajor: false },
  { name: 'Mintaka (Três Marias)', constellation: 'Órion', ra: 83.002, dec: -0.299, mag: 2.23, color: '#bfdbfe', isMajor: false },
  { name: 'Saiph', constellation: 'Órion', ra: 86.939, dec: -9.670, mag: 2.07, color: '#bfdbfe', isMajor: false },
  { name: 'Imai (Delta Crucis)', constellation: 'Crux', ra: 183.795, dec: -58.749, mag: 2.78, color: '#bfdbfe', isMajor: false },
  { name: 'Sigma Octantis (Polo Sul)', constellation: 'Octante (Polo Sul Celeste)', ra: 317.200, dec: -88.956, mag: 5.42, color: '#fef08a', isMajor: false }
];

// Generate 180 realistic background stars across equatorial celestial sphere
export const AMBIENT_CELESTIAL_STARS: AmbientStar[] = Array.from({ length: 180 }, (_, i) => {
  // Golden ratio distribution across RA and Dec
  const phi = (1 + Math.sqrt(5)) / 2;
  const ra = ((i * (360 / phi)) % 360);
  const sinDec = 2 * ((i + 0.5) / 180) - 1; // -1 to +1
  const dec = (Math.asin(Math.max(-0.98, Math.min(0.98, sinDec))) * 180) / Math.PI;
  const mag = 2.2 + (Math.sin(i * 7.3) * 0.5 + 0.5) * 3.5;
  const colors = ['#e0f2fe', '#f8fafc', '#fef9c3', '#fed7aa', '#bfdbfe', '#fca5a5'];
  const color = colors[i % colors.length];
  const twinkleSpeed = 1.2 + (i % 6) * 0.4;
  return { id: i, ra, dec, mag, color, twinkleSpeed };
});

/**
 * Calculates Local Sidereal Time (LST) in degrees for a given UTC Date and Observer Longitude.
 * 360 degrees = 24 hours of Sidereal Time (~15 deg/hour).
 */
export function getLocalSiderealTime(date: Date, lonDeg: number): number {
  const time = date.getTime();
  const jd = (time / 86400000) + 2440587.5; // Julian Date
  const d = jd - 2451545.0; // Days since J2000.0
  
  // Greenwich Mean Sidereal Time in degrees (IAU formula)
  let gmst = (280.46061837 + 360.98564736629 * d) % 360;
  if (gmst < 0) gmst += 360;
  
  // Local Sidereal Time (LST)
  let lst = (gmst + lonDeg) % 360;
  if (lst < 0) lst += 360;
  return lst;
}

/**
 * Converts Equatorial Coordinates (RA, Dec) into Horizontal Coordinates (Altitude, Azimuth)
 * for a specific observer latitude and Local Sidereal Time.
 * Azimuth: 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number
): { alt: number; az: number } {
  const latRad = (latDeg * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  
  // Local Hour Angle (H = LST - RA)
  let haDeg = (lstDeg - raDeg) % 360;
  if (haDeg < 0) haDeg += 360;
  const haRad = (haDeg * Math.PI) / 180;

  // Altitude Calculation
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const alt = (altRad * 180) / Math.PI;

  // Azimuth Calculation
  const cosAlt = Math.cos(altRad);
  let az = 0;
  if (cosAlt > 1e-6) {
    const y = -Math.cos(decRad) * Math.sin(haRad);
    const x = Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad);
    const azRad = Math.atan2(y, x);
    az = ((azRad * 180) / Math.PI + 360) % 360;
  } else {
    az = latDeg >= 0 ? 0 : 180;
  }

  return { alt, az };
}

/**
 * Star Visibility Engine based on exact Solar Altitude:
 * - Sun > -6°: Invisible (0 opacity) due to daylight scattering.
 * - Sun between -6° and -12° ("Acima de -12 graus"): Only the brightest stars (mag <= 1.5) are visible.
 * - Sun between -12° and -18° ("Acima de -18 graus todas as estrelas visíveis"): All catalog & background stars fade in.
 * - Sun < -18°: 100% full brilliance night sky.
 */
export function getStarOpacity(starMag: number, sunAltitude: number): number {
  if (sunAltitude > -5.0) return 0; // Daylight and early sunset: complete extinction

  if (starMag <= 1.5) {
    // 1st Magnitude bright stars: visible starting in nautical twilight
    if (sunAltitude > -12) {
      // Linear ramp from -5° (0.0) to -12° (1.0)
      return Math.max(0, Math.min(1, (-sunAltitude - 5.0) / 7.0));
    }
    // Below -12°, brightest stars shine with maximum intensity
    return 1.0;
  } else {
    // Fainter stars (mag > 1.5) and ambient background stars:
    // Invisible until solar altitude descends below -12°
    if (sunAltitude > -12) {
      return 0;
    }
    // Fade in progressively between -12° and -18°
    if (sunAltitude > -18) {
      const progress = (-sunAltitude - 12) / 6.0; // 0.0 at -12°, 1.0 at -18°
      // Faintest stars appear later in the transition
      const magThreshold = 1.5 + progress * 4.5;
      if (starMag > magThreshold) {
        return Math.max(0, (progress - 0.4) * 1.6);
      }
      return Math.max(0, Math.min(1, progress * 1.1));
    }
    // Deep night (< -18°): full visibility
    return 1.0;
  }
}

/**
 * Returns the Celestial Pole info (North or South) for the observer's location.
 * In the Southern Hemisphere (Lat < 0), SCP is at Azimuth 180° (South) and Alt = |Lat|.
 * In the Northern Hemisphere (Lat > 0), NCP is at Azimuth 0° (North) and Alt = Lat.
 */
export interface CelestialPoleInfo {
  hemisphere: 'north' | 'south' | 'equator';
  namePt: string;
  nameEn: string;
  az: number;
  alt: number;
  anchorStar: string;
  constellationPt: string;
  constellationEn: string;
  descriptionPt: string;
  descriptionEn: string;
  rotationDirectionPt: string;
  rotationDirectionEn: string;
}

export function getCelestialPoleInfo(latitude: number): CelestialPoleInfo {
  if (latitude < -0.1) {
    // Southern Hemisphere
    const alt = Math.min(89.9, Math.abs(latitude));
    return {
      hemisphere: 'south',
      namePt: 'Pólo Celeste Sul (SCP)',
      nameEn: 'South Celestial Pole (SCP)',
      az: 180, // Due South
      alt,
      anchorStar: 'Sigma Octantis (Octante)',
      constellationPt: 'Octante / Cruzeiro do Sul',
      constellationEn: 'Octans / Crux (Southern Cross)',
      descriptionPt: 'Ponto fixo no céu meridional em torno do qual todas as estrelas do Hemisfério Sul realizam sua rotação diurna aparente (sentido horário).',
      descriptionEn: 'The fixed point in the southern sky around which all stars apparent diurnal rotation occurs (clockwise).',
      rotationDirectionPt: 'Sentido Horário (Leste → Oeste)',
      rotationDirectionEn: 'Clockwise (East → West)'
    };
  } else if (latitude > 0.1) {
    // Northern Hemisphere
    const alt = Math.min(89.9, latitude);
    return {
      hemisphere: 'north',
      namePt: 'Pólo Celeste Norte (NCP)',
      nameEn: 'North Celestial Pole (NCP)',
      az: 0, // Due North
      alt,
      anchorStar: 'Polaris (Estrela Polar)',
      constellationPt: 'Ursa Menor (Ursa Minor)',
      constellationEn: 'Ursa Minor (Little Dipper)',
      descriptionPt: 'Ponto fixo no céu setentrional marcado pela Estrela Polar (Polaris), onde todas as estrelas do Hemisfério Norte giram em torno deste ponto.',
      descriptionEn: 'The fixed point in the northern sky marked by Polaris, around which all northern stars rotate (counter-clockwise).',
      rotationDirectionPt: 'Sentido Anti-horário (Leste → Oeste)',
      rotationDirectionEn: 'Counter-clockwise (East → West)'
    };
  } else {
    // Equator
    return {
      hemisphere: 'equator',
      namePt: 'Pólos Celestes no Horizonte (Equador)',
      nameEn: 'Celestial Poles on Horizon (Equator)',
      az: 0,
      alt: 0,
      anchorStar: 'Polaris (Norte 0°) / Octante (Sul 180°)',
      constellationPt: 'Horizonte Norte e Sul',
      constellationEn: 'North & South Horizon',
      descriptionPt: 'No Equador terrestre, ambos os Pólos Celestes situam-se exatamente no horizonte (Norte a 0° e Sul a 180°).',
      descriptionEn: 'At the Equator, both celestial poles lie exactly on the horizon at 0° and 180° azimuth.',
      rotationDirectionPt: 'Transição Vertical (Leste → Oeste)',
      rotationDirectionEn: 'Vertical Arc (East → West)'
    };
  }
}
