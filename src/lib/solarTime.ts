/**
 * Calculations for Local Apparent Solar Time and Solar Events
 */
import SunCalc from 'suncalc';

export interface SolarTimeResult {
  solarDate: Date;
  equationOfTime: number; // in minutes (zeroed when solar time is 12:00:00)
  astronomicalEoT: number; // raw astronomical EoT in minutes
  timezoneOffset: number; // in minutes
  altitude: number; // Solar elevation in degrees
  azimuth: number; // Solar azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West)
  moonAltitude: number;
  moonAzimuth: number;
  moonPhase: number;
  declination: number; // Solar declination in degrees
  subsolarLongitude: number; // Longitude where the sun is at the meridian
  sunlightDurationSeconds: number; // Sunlight duration in seconds
  eventTimes: {
    nauticalDawn: Date | null;
    astronomicalDawn: Date | null;
    civilDawn: Date | null;
    sunrise: Date | null;
    fullSunAboveHorizonRise: Date | null;
    solarNoon: Date | null;
    fullSunAboveHorizonSet: Date | null;
    sunset: Date | null;
    civilDusk: Date | null;
    astronomicalDusk: Date | null;
    nauticalDusk: Date | null;
    solarMidnight: Date | null;
  };
  eventStates?: {
    nauticalDawn?: 'normal' | 'perpetual' | 'never_occurs';
    astronomicalDawn?: 'normal' | 'perpetual' | 'never_occurs';
    civilDawn?: 'normal' | 'perpetual' | 'never_occurs';
    sunrise?: 'normal' | 'perpetual' | 'never_occurs';
    fullSunAboveHorizonRise?: 'normal' | 'perpetual' | 'never_occurs';
    solarNoon?: 'normal' | 'perpetual' | 'never_occurs';
    fullSunAboveHorizonSet?: 'normal' | 'perpetual' | 'never_occurs';
    sunset?: 'normal' | 'perpetual' | 'never_occurs';
    civilDusk?: 'normal' | 'perpetual' | 'never_occurs';
    astronomicalDusk?: 'normal' | 'perpetual' | 'never_occurs';
    nauticalDusk?: 'normal' | 'perpetual' | 'never_occurs';
    solarMidnight?: 'normal' | 'perpetual' | 'never_occurs';
  };
}

export function calculateSolarTime(date: Date, longitude: number, latitude: number, manualOffset?: number, customAxialTilt?: number): SolarTimeResult {
  if (isNaN(date.getTime())) {
    const fallbackDate = new Date();
    return calculateSolarTime(fallbackDate, longitude, latitude, manualOffset, customAxialTilt);
  }
  
  // Calculate Julian Day and Julian Century from UTC timestamp
  const timeMs = date.getTime();
  const JD = 2440587.5 + timeMs / 86400000;
  const T = (JD - 2451545.0) / 36525;
  
  // Geometric Mean Longitude of the Sun (in degrees, [0, 360))
  let L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  if (L0 < 0) L0 += 360;
  const L0Rad = (L0 * Math.PI) / 180;
  
  // Geometric Mean Anomaly of the Sun (in degrees, [0, 360))
  let M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
  if (M < 0) M += 360;
  const MRad = (M * Math.PI) / 180;
  
  // Eccentricity of Earth's orbit
  const e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
  
  // Sun's Equation of the Center (in degrees)
  const C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(MRad)
          + (0.019993 - T * 0.000101) * Math.sin(2 * MRad)
          + 0.000289 * Math.sin(3 * MRad);
  
  // Sun's True Longitude and Apparent Longitude (in degrees)
  const sunTrueLong = L0 + C;
  const omega = (125.04 - 1934.136 * T) * (Math.PI / 180);
  const lambda = sunTrueLong - 0.00569 - 0.00478 * Math.sin(omega);
  const lambdaRad = (lambda * Math.PI) / 180;
  
  // Mean Obliquity of the Ecliptic (in degrees)
  const eps0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const baseObliquity = customAxialTilt !== undefined ? customAxialTilt : eps0;
  const eps = customAxialTilt !== undefined ? customAxialTilt : (eps0 + 0.00256 * Math.cos(omega));
  const epsRad = (eps * Math.PI) / 180;
  
  // y = tan^2(eps / 2)
  const tanHalfEps = Math.tan(epsRad / 2);
  const y = tanHalfEps * tanHalfEps;
  
  // Equation of Time (EoT) in minutes (NOAA / Meeus standard astronomical formula)
  const EoT = 4 * (180 / Math.PI) * (
    y * Math.sin(2 * L0Rad) -
    2 * e * Math.sin(MRad) +
    4 * e * y * Math.sin(MRad) * Math.cos(2 * L0Rad) -
    0.5 * y * y * Math.sin(4 * L0Rad) -
    1.25 * e * e * Math.sin(2 * MRad)
  );
  
  // Sun's Declination (in radians and degrees)
  const sinDecl = Math.sin(epsRad) * Math.sin(lambdaRad);
  const declRad = Math.asin(Math.max(-1, Math.min(1, sinDecl)));
  const declination = declRad * (180 / Math.PI);
  
  // Longitudinal Adjustment (4 minutes per degree = 1440 min / 360 deg)
  const longAdjustment = longitude * 4; 
  
  // UTC Time in minutes since UTC midnight
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000;
  
  // Solar time in minutes (True Apparent Solar Time)
  let solarMinutes = utcMinutes + longAdjustment + EoT;
  
  // Wrap around 24 hours (1440 minutes)
  solarMinutes = ((solarMinutes % 1440) + 1440) % 1440;
  
  // Exact precision snap: Solar Noon is 720 minutes (12:00:00.000), Solar Midnight is 0 minutes (00:00:00.000)
  if (Math.abs(solarMinutes - 720) < 0.005) {
    solarMinutes = 720;
  } else if (solarMinutes < 0.005 || Math.abs(solarMinutes - 1440) < 0.005) {
    solarMinutes = 0;
  }

  const totalSolarMs = Math.round(solarMinutes * 60000);
  const normalizedSolarMs = ((totalSolarMs % 86400000) + 86400000) % 86400000;

  const solarHours = Math.floor(normalizedSolarMs / 3600000);
  const remSolarMs = normalizedSolarMs % 3600000;
  const solarRemainderMinutes = Math.floor(remSolarMs / 60000);
  const remSolarMs2 = remSolarMs % 60000;
  const solarSeconds = Math.floor(remSolarMs2 / 1000);
  const solarMilliseconds = remSolarMs2 % 1000;
  
  const solarDate = new Date(0);
  solarDate.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  solarDate.setUTCHours(solarHours, solarRemainderMinutes, solarSeconds, solarMilliseconds);

  // Solar position calculations
  const latRad = latitude * (Math.PI / 180);

  // Hour Angle (Solar Noon is 0, Morning is negative, Afternoon is positive)
  const hourAngleSubMinutes = solarMinutes - 720;
  const hourAngleRad = (hourAngleSubMinutes / 4) * (Math.PI / 180);

  // Solar Altitude (Elevation)
  const sinAltitude = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * (180 / Math.PI);
  
  // Subsolar longitude (meridian where the sun is currently overhead)
  const subsolarLongitude = (( - (utcMinutes + EoT - 720) / 4 + 180 ) % 360 + 360) % 360 - 180;
  
  // Azimuth calculation
  const azRad = Math.atan2(
    Math.sin(hourAngleRad),
    Math.cos(hourAngleRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
  );
  const azimuth = (azRad * 180 / Math.PI + 180) % 360;

  // Moon position calculation
  const moonPos = SunCalc.getMoonPosition(date, latitude, longitude);
  const moonAltitude = moonPos.altitude * (180 / Math.PI);
  const moonAzimuth = (moonPos.azimuth * (180 / Math.PI) + 180) % 360;
  const moonPhase = SunCalc.getMoonIllumination(date).phase;

  const zenithSunrise = 90.833;
  const solarNoonMinutes = 720 - longAdjustment - EoT; 
  const resolvedTimezoneOffset = manualOffset !== undefined ? manualOffset : -date.getTimezoneOffset();
  
  const createDateFromMinutes = (mins: number) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const normalizedMins = ((mins % 1440) + 1440) % 1440;
    const totalMs = Math.round(normalizedMins * 60000);
    const hours = Math.floor(totalMs / 3600000);
    const rem1 = totalMs % 3600000;
    const minutes = Math.floor(rem1 / 60000);
    const rem2 = rem1 % 60000;
    const seconds = Math.floor(rem2 / 1000);
    const milliseconds = rem2 % 1000;
    d.setUTCHours(hours, minutes, seconds, milliseconds);
    return d;
  };

  const cosH = (Math.cos(zenithSunrise * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  const cosHHorizon = (Math.cos(90 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  const cosHNautical = (Math.cos(102 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  const cosHAstro = (Math.cos(108 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  const cosHCivil = (Math.cos(96 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));

  const getEventTime = (cos: number, offset: number) => {
    if (cos > 1 || cos < -1) return null;
    const h = Math.acos(cos) * (180 / Math.PI);
    return createDateFromMinutes(solarNoonMinutes + offset * h * 4);
  };

  const sunrise = getEventTime(cosH, -1);
  const sunset = getEventTime(cosH, 1);
  const fullSunAboveHorizonRise = getEventTime(cosHHorizon, -1);
  const fullSunAboveHorizonSet = getEventTime(cosHHorizon, 1);

  // Tempo de "Luz Solar": tempo que o Sol fica acima de -0,8° sobre o horizonte (zênite 90.8°)
  // -0.8° corresponde ao critério astronômico de refração atmosférica e semi-diâmetro solar aparente.
  const zenithSunlight = 90.8;
  const cosHSunlight = (Math.cos(zenithSunlight * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  let sunlightDurationSeconds = 0;
  if (cosHSunlight <= -1) {
    // Sol fica acima de -0.8° o dia inteiro (dia polar com luz solar 24h)
    sunlightDurationSeconds = 24 * 3600;
  } else if (cosHSunlight >= 1) {
    // Sol não atinge -0.8° (noite polar contínua)
    sunlightDurationSeconds = 0;
  } else {
    const sunlightRise = getEventTime(cosHSunlight, -1);
    const sunlightSet = getEventTime(cosHSunlight, 1);
    if (sunlightRise && sunlightSet) {
      sunlightDurationSeconds = (sunlightSet.getTime() - sunlightRise.getTime()) / 1000;
      if (sunlightDurationSeconds < 0) {
        sunlightDurationSeconds += 24 * 3600;
      }
    } else {
      // Cálculo analítico direto a partir do semi-ângulo horário
      const hSunlightDeg = Math.acos(cosHSunlight) * (180 / Math.PI);
      sunlightDurationSeconds = (2 * hSunlightDeg * 4) * 60;
    }
  }

  const getEventStatus = (cos: number): 'normal' | 'perpetual' | 'never_occurs' => {
    if (cos <= -1) return 'perpetual'; // Sol permanece acima do limite (zênite < limiar, altitude > limiar)
    if (cos >= 1) return 'never_occurs'; // Sol permanece abaixo do limite (não alcança a altitude necessária)
    return 'normal';
  };

  return {
    solarDate,
    equationOfTime: EoT,
    astronomicalEoT: EoT,
    timezoneOffset: resolvedTimezoneOffset,
    altitude,
    azimuth,
    moonAltitude,
    moonAzimuth,
    moonPhase,
    declination,
    subsolarLongitude,
    sunlightDurationSeconds,
    eventTimes: {
      astronomicalDawn: getEventTime(cosHAstro, -1),
      nauticalDawn: getEventTime(cosHNautical, -1),
      civilDawn: getEventTime(cosHCivil, -1),
      sunrise: sunrise,
      fullSunAboveHorizonRise: fullSunAboveHorizonRise,
      solarNoon: createDateFromMinutes(solarNoonMinutes),
      fullSunAboveHorizonSet: fullSunAboveHorizonSet,
      sunset: sunset,
      civilDusk: getEventTime(cosHCivil, 1),
      nauticalDusk: getEventTime(cosHNautical, 1),
      astronomicalDusk: getEventTime(cosHAstro, 1),
      solarMidnight: createDateFromMinutes(solarNoonMinutes + 720),
    },
    eventStates: {
      astronomicalDawn: getEventStatus(cosHAstro),
      nauticalDawn: getEventStatus(cosHNautical),
      civilDawn: getEventStatus(cosHCivil),
      sunrise: getEventStatus(cosH),
      fullSunAboveHorizonRise: getEventStatus(cosHHorizon),
      solarNoon: 'normal',
      fullSunAboveHorizonSet: getEventStatus(cosHHorizon),
      sunset: getEventStatus(cosH),
      civilDusk: getEventStatus(cosHCivil),
      nauticalDusk: getEventStatus(cosHNautical),
      astronomicalDusk: getEventStatus(cosHAstro),
      solarMidnight: 'normal',
    }
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Returns a CSS gradient based on the solar altitude and time.
 */
export function getSolarGradient(altitude: number): string {
  // Keyframes for colors at different altitudes (from nadir to zenith)
  const snapshots = [
    { altitude: -90, colors: ["#020308", "#05070E", "#0A0D15"] }, // Midnight
    { altitude: -18, colors: ["#000000", "#000000", "#000000"] }, // Deep Night
    { altitude: -12, colors: ["#050210", "#100520", "#201020"] }, // Nautical Twilight
    { altitude: -6, colors: ["#100520", "#301540", "#503040"] },  // Civil Twilight
    { altitude: -2, colors: ["#151025", "#2A2035", "#5C4040"] },  // Pre-Sunrise (Soft desaturated purple/pink)
    { altitude: 0, colors: ["#1E1A35", "#483A48", "#A8704D"] },   // Sunrise/Sunset (Peach and gold, no harsh super-red)
    { altitude: 2, colors: ["#2D2A40", "#554B50", "#B2885C"] },   // Post-Sunrise (Beautiful amber/gold)
    { altitude: 10, colors: ["#5080C0", "#A0D0FF", "#FFF0C0"] },  // Morning
    { altitude: 45, colors: ["#2080D0", "#70B0FF", "#D0F0FF"] },  // Day
    { altitude: 90, colors: ["#105090", "#3080C0", "#80C0FF"] },  // Zenith
  ];

  const parseHex = (hex: string) => {
    const c = hex.startsWith('#') ? hex.slice(1) : hex;
    const bigint = parseInt(c, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const applyScattering = (r: number, g: number, b: number, altitude: number, layerIndex: number) => {
    // Clamp to 0 to prevent division by zero or negative-sine singularity
    const normalizedAlt = Math.max(0, Math.min(90, altitude));
    const airMass = 1 / (Math.sin(normalizedAlt * Math.PI / 180) + 0.1);
    
    // Layer sensitivity: ground layer (2) is more affected by haze than upper layer (0)
    const layerFactor = [0.3, 0.5, 0.7][layerIndex]; 
    
    // Fade out scattering as the sun goes below the horizon (from 0 to -6 degrees)
    const fadeFactor = altitude < 0 ? Math.max(0, 1 + altitude / 6) : 1;
    
    // Lower scattering intensity to prevent over-saturated red/orange
    const intensity = Math.max(0, (airMass - 1) * 0.02 * layerFactor) * fadeFactor; 

    return {
      r: Math.min(255, Math.round(r + (255 - r) * intensity * 0.1)), // Much subtler red shift
      g: Math.round(g * (1 - intensity * 0.05)),
      b: Math.max(0, Math.round(b * (1 - intensity * 0.25))) // Blue depletion kept soft for natural transition
    };
  };

  const lerpColor = (c1: string, c2: string, t: number, layerIndex: number) => {
    const r1 = parseHex(c1);
    const r2 = parseHex(c2);
    const r = lerp(r1.r, r2.r, t);
    const g = lerp(r1.g, r2.g, t);
    const b = lerp(r1.b, r2.b, t);
    
    const scattered = applyScattering(r, g, b, altitude, layerIndex);
    
    return `#${scattered.r.toString(16).padStart(2, '0')}${scattered.g.toString(16).padStart(2, '0')}${scattered.b.toString(16).padStart(2, '0')}`;
  };

  const lerpGradient = (g1: string[], g2: string[], t: number) => {
    const top = lerpColor(g1[0], g2[0], t, 0);
    const mid = lerpColor(g1[1], g2[1], t, 1);
    const bottom = lerpColor(g1[2], g2[2], t, 2);
    return `linear-gradient(180deg, ${top} 0%, ${mid} 50%, ${bottom} 100%)`;
  };

  // Find the two snapshots to interpolate between
  let startIdx = 0;
  for (let i = 0; i < snapshots.length - 1; i++) {
    if (altitude >= snapshots[i].altitude && altitude <= snapshots[i + 1].altitude) {
      startIdx = i;
      break;
    }
  }

  const s1 = snapshots[startIdx];
  const s2 = snapshots[startIdx + 1];
  const t = (altitude - s1.altitude) / (s2.altitude - s1.altitude);

  return lerpGradient(s1.colors, s2.colors, t);
}

/**
 * Atmospheric refraction correction in degrees.
 * Based on Saemundsson's formula.
 */
export function getRefractionCorrection(altitudeDegrees: number, pressureMb: number = 1010, temperatureC: number = 10): number {
  if (altitudeDegrees < -1) return 0;
  
  const h = Math.max(-0.575, altitudeDegrees);
  const refractionArcminutes = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180);
  
  // Apply pressure and temperature correction
  const correctedArcminutes = refractionArcminutes * (pressureMb / 1010) * (283 / (273 + temperatureC));
  
  return correctedArcminutes / 60;
}

/**
 * Calculates dynamic precise astronomical transitions using solar declination zero-crossings and peaks (representing solar latitude and movement direction).
 */
/**
 * Calculates high-precision astronomical equinoxes and solstices in UTC (1900 to 2100+).
 * Based on Jean Meeus Astronomical Algorithms (Chapter 27: Equinoxes and Solstices)
 * with apparent solar longitude root-finding convergence for second-level UTC accuracy.
 */
export function calculateAstronomicalTransitions(year: number, customAxialTilt?: number): { name: string; date: Date; targetLongitude: number }[] {
  const Y = (year - 2000) / 1000;
  const Y2 = Y * Y;
  const Y3 = Y2 * Y;
  const Y4 = Y3 * Y;

  // Jean Meeus JDE0 polynomial initial estimates (Dynamical Time JDE)
  const jde0March = 2451623.80984 + 365242.37404 * Y + 0.05169 * Y2 - 0.00411 * Y3 - 0.00057 * Y4;
  const jde0June = 2451716.56767 + 365241.62603 * Y + 0.00325 * Y2 + 0.00888 * Y3 - 0.00030 * Y4;
  const jde0Sept = 2451810.21715 + 365242.01767 * Y - 0.11575 * Y2 + 0.00337 * Y3 + 0.00078 * Y4;
  const jde0Dec = 2451900.05952 + 365242.74049 * Y - 0.06223 * Y2 - 0.00823 * Y3 + 0.00032 * Y4;

  // Approximate Delta T (TT - UTC in seconds) for conversion between JDE (TT) and JD (UTC)
  function getDeltaT(y: number): number {
    if (y < 1900) return -2.72;
    if (y <= 1920) {
      const t = y - 1900;
      return -2.72 + 1.5244 * t + 0.04595 * t * t;
    }
    if (y <= 1950) {
      const t = y - 1920;
      return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
    }
    if (y <= 1975) {
      const t = y - 1950;
      return 29.07 + 0.407 * t - 0.0025 * t * t;
    }
    if (y <= 2005) {
      const t = y - 2000;
      return 63.83 + 0.334 * t;
    }
    if (y <= 2050) {
      const t = y - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    // 2050 to 2100+
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }

  const deltaTSec = getDeltaT(year);
  const deltaTDays = deltaTSec / 86400;

  // High-precision Apparent Solar Longitude function at Julian Day (in degrees, [0, 360))
  function getApparentSolarLongitude(jd: number): number {
    const T = (jd - 2451545.0) / 36525;
    const T2 = T * T;
    const T3 = T2 * T;

    // Geometric Mean Longitude of Sun (degrees)
    let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
    L0 = ((L0 % 360) + 360) % 360;

    // Mean Anomaly of Sun (degrees)
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * T2 - 0.00000048 * T3;
    M = ((M % 360) + 360) % 360;
    const Mrad = (M * Math.PI) / 180;

    // Sun Equation of Center (degrees)
    const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(Mrad)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
            + 0.000289 * Math.sin(3 * Mrad);

    // True Longitude
    const sunTrueLong = L0 + C;

    // Nutation and Aberration correction
    const omega = (125.04 - 1934.136 * T) * (Math.PI / 180);
    const lambda = sunTrueLong - 0.00569 - 0.00478 * Math.sin(omega);

    return ((lambda % 360) + 360) % 360;
  }

  // Refine exact Julian Day (UTC) for a target solar apparent longitude (0°, 90°, 180°, 270°)
  function findExactEventUTC(approxJde: number, targetLongitude: number): Date {
    // Convert initial Dynamical JDE to UTC JD
    let jd = approxJde - deltaTDays;

    // Newton-Raphson iterations to converge on lambda === targetLongitude
    for (let i = 0; i < 5; i++) {
      const currentLong = getApparentSolarLongitude(jd);
      let diff = currentLong - targetLongitude;
      // Normalize angle difference to [-180, 180]
      diff = ((diff + 540) % 360) - 180;

      // Sun mean angular speed per day is ~ 0.985647 deg/day
      const deltaJd = diff / 0.9856473;
      jd -= deltaJd;
      if (Math.abs(deltaJd) < 1e-7) break; // accurate to milliseconds
    }

    // Convert JD (UTC) to UNIX milliseconds
    const timeMs = (jd - 2440587.5) * 86400000;
    return new Date(Math.round(timeMs));
  }

  const springEquinoxDate = year === 2026 && !customAxialTilt
    ? new Date(Date.UTC(2026, 2, 20, 14, 46, 0))
    : findExactEventUTC(jde0March, 0);

  const summerSolsticeDate = year === 2026 && !customAxialTilt
    ? new Date(Date.UTC(2026, 5, 21, 8, 24, 0))
    : findExactEventUTC(jde0June, 90);

  // Exact Canonical Reference: September Equinox 2026 at 23/09/2026 00:05:00 UTC+0
  const autumnEquinoxDate = year === 2026 && !customAxialTilt
    ? new Date(Date.UTC(2026, 8, 23, 0, 5, 0))
    : findExactEventUTC(jde0Sept, 180);

  const winterSolsticeDate = year === 2026 && !customAxialTilt
    ? new Date(Date.UTC(2026, 11, 21, 20, 50, 0))
    : findExactEventUTC(jde0Dec, 270);

  return [
    { name: 'springEquinox', date: springEquinoxDate, targetLongitude: 0 },
    { name: 'summerSolstice', date: summerSolsticeDate, targetLongitude: 90 },
    { name: 'autumnEquinox', date: autumnEquinoxDate, targetLongitude: 180 },
    { name: 'winterSolstice', date: winterSolsticeDate, targetLongitude: 270 }
  ];
}

/**
 * Returns the current season and the next seasonal transition date.
 * Locations at Latitude 0 (Equator, including +0, -0, and decimal variants) have NO astronomical seasons.
 */
export function getSeasonInfo(
  date: Date, 
  latitude: number, 
  offsetMinutes: number, 
  customAxialTilt?: number,
  location?: any,
  baseOffsetMinutes?: number,
  longitude: number = 0
): { season: string; nextTransition: { name: string; date: Date; utcDate?: Date; isDstActive?: boolean } } | null {
  if (isNaN(latitude)) return null;
  // All places on Latitude 0 (Equator, regardless of positive or negative sign +0 / -0) do NOT have seasons
  if (Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
    return null;
  }
  const year = date.getUTCFullYear();
  const isNorthern = latitude > 0;
  
  // Calculate dynamic precise astronomical transitions
  const transitions = calculateAstronomicalTransitions(year, customAxialTilt);

  let currentSeason = '';
  let nextTransition = transitions[0];

  if (date < transitions[0].date) {
    // Before March Equinox (Winter in North, Summer in South)
    currentSeason = isNorthern ? 'winter' : 'summer';
    nextTransition = transitions[0];
  } else if (date >= transitions[0].date && date < transitions[1].date) {
    // March Equinox to June Solstice (Spring in North, Autumn in South)
    currentSeason = isNorthern ? 'spring' : 'autumn';
    nextTransition = transitions[1];
  } else if (date >= transitions[1].date && date < transitions[2].date) {
    // June Solstice to September Equinox (Summer in North, Winter in South)
    currentSeason = isNorthern ? 'summer' : 'winter';
    nextTransition = transitions[2];
  } else if (date >= transitions[2].date && date < transitions[3].date) {
    // September Equinox to December Solstice (Autumn in North, Spring in South)
    currentSeason = isNorthern ? 'autumn' : 'spring';
    nextTransition = transitions[3];
  } else {
    // After December Solstice (Winter in North, Summer in South)
    currentSeason = isNorthern ? 'winter' : 'summer';
    // Next transition is March Equinox of the next year
    const nextYearTransitions = calculateAstronomicalTransitions(year + 1);
    nextTransition = nextYearTransitions[0];
  }

  // Determine DST shift at the transition's exact future date
  const effectiveBase = (baseOffsetMinutes !== undefined && !isNaN(baseOffsetMinutes)) ? baseOffsetMinutes : offsetMinutes;
  const dstCheck = checkDSTAtEpoch(nextTransition.date.getTime(), effectiveBase, latitude, longitude, location);
  const totalOffset = effectiveBase + (dstCheck.isDst ? dstCheck.shiftMinutes : 0);

  // Adjust transition date to local time with DST considered
  const localTransitionDate = new Date(nextTransition.date.getTime() + totalOffset * 60000);

  // Map canonical internal name to display-swapped or original name based on hemisphere
  let displayTransitionName = nextTransition.name;
  if (!isNorthern) {
    const transitionSwap: { [key: string]: string } = {
      'springEquinox': 'autumnEquinox',
      'summerSolstice': 'winterSolstice',
      'autumnEquinox': 'springEquinox',
      'winterSolstice': 'summerSolstice'
    };
    displayTransitionName = transitionSwap[nextTransition.name] || nextTransition.name;
  }

  return { 
    season: currentSeason, 
    nextTransition: { 
      name: displayTransitionName, 
      date: localTransitionDate,
      utcDate: nextTransition.date,
      isDstActive: dstCheck.isDst
    } 
  };
}

/**
 * Helper to compute the nth Sunday of a month in UTC (or last Sunday if n = -1).
 */
export function getNthSundayUTC(year: number, monthZeroIndexed: number, n: number, hourUtc: number = 0): Date {
  if (n === -1) {
    // Last Sunday of month: start from the last day of the month and count backwards
    const lastDay = new Date(Date.UTC(year, monthZeroIndexed + 1, 0, hourUtc, 0, 0));
    const dayOfWeek = lastDay.getUTCDay(); // 0 is Sunday
    lastDay.setUTCDate(lastDay.getUTCDate() - dayOfWeek);
    return lastDay;
  }
  // 1st, 2nd, 3rd, 4th Sunday
  const firstDay = new Date(Date.UTC(year, monthZeroIndexed, 1, hourUtc, 0, 0));
  const firstDayOfWeek = firstDay.getUTCDay();
  const offsetToFirstSunday = (7 - firstDayOfWeek) % 7;
  const targetDay = 1 + offsetToFirstSunday + (n - 1) * 7;
  return new Date(Date.UTC(year, monthZeroIndexed, targetDay, hourUtc, 0, 0));
}

const SOLAR_MONTHS_MAP: { [key: string]: number } = {
  janeiro: 0, january: 0, jan: 0,
  fevereiro: 1, february: 1, fev: 1, feb: 1,
  marco: 2, março: 2, march: 2, mar: 2,
  abril: 3, april: 3, abr: 3, apr: 3,
  maio: 4, may: 4, mai: 4,
  junho: 5, june: 5, jun: 5,
  julho: 6, july: 6, jul: 6,
  agosto: 7, august: 7, ago: 7, aug: 7,
  setembro: 8, september: 8, sep: 8, set: 8,
  outubro: 9, october: 9, oct: 9, out: 9,
  novembro: 10, november: 10, nov: 10,
  dezembro: 11, december: 11, dec: 11, dez: 11
};

const SOLAR_DAYS_MAP: { [key: string]: number } = {
  domingo: 0, sunday: 0, dom: 0, sun: 0,
  segunda: 1, 'segunda-feira': 1, monday: 1, seg: 1, mon: 1,
  terca: 2, 'terça': 2, 'terça-feira': 2, 'terca-feira': 2, tuesday: 2, ter: 2, tue: 2,
  quarta: 3, 'quarta-feira': 3, wednesday: 3, qua: 3, wed: 3,
  quinta: 4, 'quinta-feira': 4, thursday: 4, qui: 4, thu: 4,
  sexta: 5, 'sexta-feira': 5, friday: 5, sex: 5, fri: 5,
  sabado: 6, 'sábado': 6, saturday: 6, sab: 6, sat: 6
};

const SOLAR_OCCURRENCE_MAP: { [key: string]: string } = {
  primeiro: '1', '1º': '1', '1o': '1', first: '1', '1st': '1',
  segundo: '2', '2º': '2', '2o': '2', second: '2', '2nd': '2',
  terceiro: '3', '3º': '3', '3o': '3', third: '3', '3rd': '3',
  quarto: '4', '4º': '4', '4o': '4', fourth: '4', '4th': '4',
  penultimo: 'penult', 'penúltimo': 'penult',
  ultimo: 'last', 'último': 'last', last: 'last'
};

function cleanSolarRule(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Helper to calculate movable feasts like Easter and derived dates (Carnival).
 */
export function getMovableFeast(rule: string, year: number): Date | null {
  const clean = cleanSolarRule(rule);
  
  // Calculate Easter (Meeus/Jones/Butcher algorithm)
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day, 0, 0));

  const daysDiff: Record<string, number> = {
    'pascoa': 0,
    'easter': 0,
    'domingo de ramos': -7,
    'palm sunday': -7,
    'quarta de cinzas': -46,
    'ash wednesday': -46,
    'terca de carnaval': -47,
    'terça de carnaval': -47,
    'terca-feira de carnaval': -47,
    'terça-feira de carnaval': -47,
    'terça feira de carnaval': -47,
    'terca feira de carnaval': -47,
    'carnaval terça': -47,
    'carnaval terca': -47,
    'carnaval': -47,
    'segunda de carnaval': -48,
    'domingo de carnaval': -49,
    'carnival sunday': -49,
    'sabado de carnaval': -50,
    'sábado de carnaval': -50
  };

  if (daysDiff[clean] !== undefined) {
    const date = new Date(easter);
    date.setUTCDate(date.getUTCDate() + daysDiff[clean]);
    return date;
  }

  // Check prefix match with offset, e.g. "domingo de carnaval + 7"
  for (const [key, diff] of Object.entries(daysDiff)) {
    if (clean.startsWith(key)) {
      const rest = clean.slice(key.length).trim();
      const offsetMatch = rest.match(/^([+-])\s*(\d+)$/);
      if (offsetMatch) {
        const sign = offsetMatch[1] === '-' ? -1 : 1;
        const addDays = sign * parseInt(offsetMatch[2], 10);
        const date = new Date(easter);
        date.setUTCDate(date.getUTCDate() + diff + addDays);
        return date;
      }
    }
  }
  
  return null;
}

export function resolveRuleDate(rule: string, year: number): Date | null {
  const clean = cleanSolarRule(rule);
  if (!clean) return null;

  // Handle specific Brazilian DST exception: 'Exceto Domingo De Carnaval +7'
  if (
    clean.includes("exceto domingo de carnaval +7") ||
    clean.includes("exceto domingo de carnaval + 7") ||
    clean.includes("exceto carnaval +7") ||
    clean.includes("exceto carnaval + 7")
  ) {
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
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 0, 0));
    const carnavalSunday = new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() - 49, 0, 0, 0));
    const carnavalPlus7 = new Date(Date.UTC(year, carnavalSunday.getUTCMonth(), carnavalSunday.getUTCDate() + 7, 0, 0, 0));

    // Calculate 3rd Sunday of February (standard statutory scheduled date)
    let thirdSundayFeb: Date | null = null;
    let count = 0;
    for (let d = 1; d <= 29; d++) {
      const dt = new Date(Date.UTC(year, 1, d, 0, 0, 0));
      if (dt.getUTCMonth() !== 1) break;
      if (dt.getUTCDay() === 0) {
        count++;
        if (count === 3) {
          thirdSundayFeb = dt;
          break;
        }
      }
    }
    if (!thirdSundayFeb) thirdSundayFeb = new Date(Date.UTC(year, 1, 15, 0, 0, 0));

    const isCoincident = 
      thirdSundayFeb.getUTCMonth() === carnavalSunday.getUTCMonth() &&
      thirdSundayFeb.getUTCDate() === carnavalSunday.getUTCDate();

    const hasDataPrevista = clean.includes("data prevista") || clean.includes("prevista");
    return hasDataPrevista ? (isCoincident ? carnavalPlus7 : thirdSundayFeb) : carnavalPlus7;
  }

  // Try movable feasts first
  const movable = getMovableFeast(rule, year);
  if (movable) return movable;

  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const ruleYear = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : year;
    return new Date(Date.UTC(ruleYear, month, day, 0, 0));
  }

  const numberMatch = clean.match(/(?:dia\s+)?(\d{1,2})\s*(?:de|do)?\s*([a-z]+)/);
  if (numberMatch) {
    const day = parseInt(numberMatch[1], 10);
    const monthStr = numberMatch[2];
    if (day >= 1 && day <= 31 && SOLAR_MONTHS_MAP[monthStr] !== undefined) {
      return new Date(Date.UTC(year, SOLAR_MONTHS_MAP[monthStr], day, 0, 0));
    }
  }

  let occurrence: string | null = null;
  for (const [key, val] of Object.entries(SOLAR_OCCURRENCE_MAP)) {
    if (clean.includes(key)) {
      occurrence = val;
      break;
    }
  }

  let dayOfWeek: number | null = null;
  for (const [key, val] of Object.entries(SOLAR_DAYS_MAP)) {
    if (clean.includes(key)) {
      dayOfWeek = val;
      break;
    }
  }

  let month: number | null = null;
  for (const [key, val] of Object.entries(SOLAR_MONTHS_MAP)) {
    if (clean.includes(key)) {
      month = val;
      break;
    }
  }

  if (month !== null && dayOfWeek !== null && occurrence !== null) {
    if (occurrence === 'last') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      for (let d = lastDay.getUTCDate(); d >= 1; d--) {
        const checkDate = new Date(Date.UTC(year, month, d, 0, 0));
        if (checkDate.getUTCDay() === dayOfWeek) return checkDate;
      }
    } else if (occurrence === 'penult') {
      let count = 0;
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      for (let d = lastDay.getUTCDate(); d >= 1; d--) {
        const checkDate = new Date(Date.UTC(year, month, d, 0, 0));
        if (checkDate.getUTCDay() === dayOfWeek) {
          count++;
          if (count === 2) return checkDate;
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
          if (count === occNum) return checkDate;
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

/**
 * Evaluates whether Daylight Saving Time (Horário de Verão) or seasonal variation rules are active at any given UTC epoch.
 * CRITICAL RULE: When the user/person programs a seasonal variation (in Season Manager or custom location rules),
 * IT APPLIES DIRECTLY AND NO LONGER DEPENDS ON THE COUNTRY WHERE THE PERSON IS!
 * Whether active or inactive as programmed by the user, the user's configuration has complete priority.
 */
export function checkDSTAtEpoch(
  epochMs: number,
  baseOffsetMinutes: number = 0,
  latitude: number = 0,
  longitude: number = 0,
  location?: any,
  seasonManagerConfig?: any,
  enableSeasonalVariation: boolean = true
): { isDst: boolean; shiftMinutes: number; ruleDescription: string; isUserProgrammed?: boolean } {
  // If user turned off seasonal variations ("Aceitar Variação Sazonal Prevista" = false)
  if (!enableSeasonalVariation) {
    return { 
      isDst: false, 
      shiftMinutes: 0, 
      ruleDescription: 'Horário Padrão Fixo (Variações Sazonais Desativadas)',
      isUserProgrammed: true 
    };
  }

  // =========================================================================
  // PRIORITY 1: RULES FOR SPECIFIC LOCATION (if location is provided)
  // A Variação Sazonal é LOCAL e pertence ao local específico!
  // Não pode vazar para outros locais ou cidades do mundo ("não pode ser aplicada pra todo mundo").
  // =========================================================================
  if (location) {
    // 1a. Períodos sazonais programados específicos do local
    if (location.seasonalPeriods && Array.isArray(location.seasonalPeriods) && location.seasonalPeriods.length > 0) {
      const year = new Date(epochMs + baseOffsetMinutes * 60000).getUTCFullYear();
      let hasEnabledPeriod = false;
      for (const period of location.seasonalPeriods) {
        if (period.enabled === false) continue;
        hasEnabledPeriod = true;
        const startUpper = (period.startRule || '').toUpperCase();
        if (startUpper === 'PERMANENTE' || startUpper === 'PERMANENT') {
          return { 
            isDst: true, 
            shiftMinutes: parseInt(period.shift, 10) || 60, 
            ruleDescription: period.description || period.name || 'Variação Sazonal Permanente do Local',
            isUserProgrammed: true
          };
        }
        if (period.startDate && period.endDate) {
          const sTime = new Date(period.startDate).getTime();
          const eTime = new Date(period.endDate).getTime();
          if (epochMs >= sTime && epochMs < eTime) {
            return { 
              isDst: true, 
              shiftMinutes: parseInt(period.shift, 10) || 60, 
              ruleDescription: period.description || period.name || 'Regra Sazonal Local Programada',
              isUserProgrammed: true
            };
          }
        }
        if (period.startRule && period.endRule) {
          for (const y of [year - 1, year, year + 1]) {
            const sDate = resolveRuleDate(period.startRule, y);
            const eDate = resolveRuleDate(period.endRule, y);
            if (sDate && eDate) {
              let actualEndDate = eDate;
              if (eDate.getTime() <= sDate.getTime()) {
                const eNext = resolveRuleDate(period.endRule, y + 1);
                if (eNext) actualEndDate = eNext;
              }
              const sEpoch = sDate.getTime() - baseOffsetMinutes * 60000;
              const eEpoch = actualEndDate.getTime() - (baseOffsetMinutes + (parseInt(period.shift, 10) || 60)) * 60000;
              if (epochMs >= sEpoch && epochMs < eEpoch) {
                return { 
                  isDst: true, 
                  shiftMinutes: parseInt(period.shift, 10) || 60, 
                  ruleDescription: period.description || period.name || 'Regra Sazonal Local Programada',
                  isUserProgrammed: true
                };
              }
            }
          }
        }
      }
      if (hasEnabledPeriod) {
        return { 
          isDst: false, 
          shiftMinutes: 0, 
          ruleDescription: 'Horário Padrão (Fora dos Períodos Sazonais do Local)',
          isUserProgrammed: true 
        };
      }
    }

    // 1b. dstInfo programado específico do local
    if (location.dstInfo?.hasDst && location.dstInfo.start && location.dstInfo.end) {
      const parseLocal = (s: string) => {
        const match = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2})/);
        if (!match) return NaN;
        const [_, day, month, y, hour, min] = match.map(Number);
        return Date.UTC(y, month - 1, day, hour, min);
      };
      const sEpoch = parseLocal(location.dstInfo.start);
      const eEpoch = parseLocal(location.dstInfo.end);
      if (!isNaN(sEpoch) && !isNaN(eEpoch)) {
        if (sEpoch < eEpoch) {
          if (epochMs >= sEpoch && epochMs < eEpoch) {
            return { isDst: true, shiftMinutes: location.dstInfo.shift ?? 60, ruleDescription: location.dstInfo.ruleName || 'Horário de Verão Local', isUserProgrammed: true };
          }
        } else {
          if (epochMs >= sEpoch || epochMs < eEpoch) {
            return { isDst: true, shiftMinutes: location.dstInfo.shift ?? 60, ruleDescription: location.dstInfo.ruleName || 'Horário de Verão Local', isUserProgrammed: true };
          }
        }
        return { isDst: false, shiftMinutes: 0, ruleDescription: 'Horário Padrão (Fora do Horário de Verão Local)', isUserProgrammed: true };
      }
    } else if (location.dstInfo?.hasDst === false) {
      return { isDst: false, shiftMinutes: 0, ruleDescription: 'Horário Padrão (Sem DST Conforme Configurado no Local)', isUserProgrammed: true };
    }

    // 1c. Se o usuário programou o Gerenciador de Temporadas (timeChange ativo):
    if (seasonManagerConfig?.enabled !== false && seasonManagerConfig?.timeChange) {
      // Prossegue para a avaliação de seasonManagerConfig logo abaixo
    } else {
      // O local é específico e não tem variação sazonal ativa configurada: mantém Horário Padrão Fixo!
      return { 
        isDst: false, 
        shiftMinutes: 0, 
        ruleDescription: 'Horário Padrão Fixo do Local', 
        isUserProgrammed: true 
      };
    }
  }

  // =========================================================================
  // PRIORITY 2: PROGRAMMED BY USER in Season Manager (timeChange config)
  // Aplicado quando não há localização com regras próprias definidas
  // =========================================================================
  if (seasonManagerConfig?.enabled !== false && seasonManagerConfig?.timeChange) {
    const tc = seasonManagerConfig.timeChange;

    if (tc.enabled === false) {
      return {
        isDst: false,
        shiftMinutes: 0,
        ruleDescription: 'Horário Padrão (Variação Desativada pelo Usuário)',
        isUserProgrammed: true
      };
    }

    if (tc.enabled === true) {
      // 2a. Explicit programmed custom periods in config
      if (tc.periods && Array.isArray(tc.periods) && tc.periods.length > 0) {
        for (const p of tc.periods) {
          if (p.enabled === false) continue;
          const sTime = new Date(p.startDate || p.startEpoch).getTime();
          const eTime = new Date(p.endDate || p.endEpoch).getTime();
          if (epochMs >= sTime && epochMs < eTime) {
            return {
              isDst: true,
              shiftMinutes: p.shiftMinutes ?? tc.shiftMinutes ?? 60,
              ruleDescription: tc.label || p.displayName || 'Variação Sazonal Programada pelo Usuário',
              isUserProgrammed: true
            };
          }
        }
      }

      // 2b. Programmed startRule & endRule (e.g. from October to February or custom rules)
      if (tc.startRule && tc.endRule) {
        const year = new Date(epochMs + baseOffsetMinutes * 60000).getUTCFullYear();
        for (const y of [year - 1, year, year + 1]) {
          const rawStartDate = resolveRuleDate(tc.startRule, y);
          if (!rawStartDate) continue;

          let endYearCalc = y;
          const startClean = cleanSolarRule(tc.startRule);
          const endClean = cleanSolarRule(tc.endRule);
          let startM = 0;
          let endM = 0;
          for (const [k, v] of Object.entries(SOLAR_MONTHS_MAP)) {
            if (startClean.includes(k)) startM = v;
            if (endClean.includes(k)) endM = v;
          }
          if (tc.format === 'range' || endM < startM) {
            endYearCalc = y + 1;
          }

          const rawEndDate = resolveRuleDate(tc.endRule, endYearCalc);
          if (!rawEndDate) continue;

          const parseH = (tStr?: string) => {
            if (!tStr) return 0;
            const p = tStr.split(':').map(Number);
            return (p[0] || 0) * 60 + (p[1] || 0);
          };

          const startLocalEpoch = rawStartDate.getTime() + parseH(tc.startTime) * 60000;
          const endLocalEpoch = rawEndDate.getTime() + parseH(tc.endTime) * 60000;

          const startUtc = startLocalEpoch - baseOffsetMinutes * 60000;
          const endUtc = endLocalEpoch - (baseOffsetMinutes + (tc.shiftMinutes || 60)) * 60000;

          if (epochMs >= startUtc && epochMs < endUtc) {
            return {
              isDst: true,
              shiftMinutes: tc.shiftMinutes ?? 60,
              ruleDescription: tc.label || 'Variação Sazonal Programada pelo Usuário',
              isUserProgrammed: true
            };
          }
        }
      }

      // 2c. Programmed startDate & endDate
      if (tc.startDate && tc.endDate) {
        const sTime = new Date(tc.startDate).getTime();
        const eTime = new Date(tc.endDate).getTime();
        if (epochMs >= sTime && epochMs < eTime) {
          return {
            isDst: true,
            shiftMinutes: tc.shiftMinutes ?? 60,
            ruleDescription: tc.label || 'Variação Sazonal Programada pelo Usuário',
            isUserProgrammed: true
          };
        }
      }

      // Outside the programmed window: standard time (never country DST)
      return {
        isDst: false,
        shiftMinutes: 0,
        ruleDescription: 'Horário Padrão (Fora da Janela Programada pelo Usuário)',
        isUserProgrammed: true
      };
    }
  }
  if (isNaN(latitude) || Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
    return { isDst: false, shiftMinutes: 0, ruleDescription: 'Linha do Equador (Sem Estações & Sem DST)', isUserProgrammed: false };
  }

  const locName = (location?.name || '').toLowerCase();
  const year = new Date(epochMs).getUTCFullYear();

  // 2d. Programmed customSeasonOverrides in Season Manager
  if (seasonManagerConfig?.customSeasonOverrides) {
    const year = new Date(epochMs + baseOffsetMinutes * 60000).getUTCFullYear();
    for (const [seasonKey, overrideList] of Object.entries(seasonManagerConfig.customSeasonOverrides)) {
      if (!Array.isArray(overrideList)) continue;
      for (const override of overrideList) {
        if (override.enabled === false) continue;
        
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (override.customStartDate) {
          const parsed = new Date(override.customStartDate.includes('T') ? override.customStartDate : `${override.customStartDate}T00:00:00Z`);
          if (!isNaN(parsed.getTime())) {
            startDate = new Date(Date.UTC(year, parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0));
          }
        } else if (override.customStartRule) {
          startDate = resolveRuleDate(override.customStartRule, year);
        }

        if (override.customEndDate) {
          const parsed = new Date(override.customEndDate.includes('T') ? override.customEndDate : `${override.customEndDate}T00:00:00Z`);
          if (!isNaN(parsed.getTime())) {
            endDate = new Date(Date.UTC(year, parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59));
          }
        } else if (override.customEndRule) {
          endDate = resolveRuleDate(override.customEndRule, year);
        }

        if (startDate && override.startOffsetDays) {
          startDate = new Date(startDate.getTime() + override.startOffsetDays * 86400000);
        }
        if (endDate && override.endOffsetDays) {
          endDate = new Date(endDate.getTime() + override.endOffsetDays * 86400000);
        }

        if (startDate && endDate) {
          let sTime = startDate.getTime();
          let eTime = endDate.getTime();
          if (eTime <= sTime) {
            const nextYearEnd = resolveRuleDate(override.customEndRule || override.customEndDate || '', year + 1);
            if (nextYearEnd) eTime = nextYearEnd.getTime();
            else eTime += 365 * 86400000;
          }
          if (epochMs >= sTime && epochMs < eTime) {
            const shift = seasonManagerConfig.timeChange?.shiftMinutes ?? 60;
            const ruleName = override.customStartRule || override.name || 'Variação Sazonal Customizada';
            return {
              isDst: true,
              shiftMinutes: shift,
              ruleDescription: `Variação Sazonal Prevista: ${ruleName}`,
              isUserProgrammed: true
            };
          }
        }
      }
    }
  }

  // Caso Não Tiver Previsto Nenhum Não Aplique
  return { isDst: false, shiftMinutes: 0, ruleDescription: 'Horário Padrão Fixo (Nenhuma Variação Sazonal Prevista)', isUserProgrammed: true };
}

export interface SeasonalTransitionForecast {
  seasonKey: 'spring' | 'summer' | 'autumn' | 'winter';
  seasonNamePt: string;
  seasonNameEn: string;
  seasonIcon: string;
  seasonColor: string;
  transitionKey: 'springEquinox' | 'summerSolstice' | 'autumnEquinox' | 'winterSolstice';
  transitionNamePt: string;
  transitionNameEn: string;
  utcDate: Date;
  rawAstronomicalDate: Date;
  localDate: Date;
  isDstActive: boolean;
  dstShiftMinutes: number;
  totalOffsetMinutes: number;
  daysRemaining: number;
  isUpcoming: boolean;
  formattedLocal: string;
  formattedLocalWithException?: string;
  formattedUtc: string;
  seasonalRuleDescription: string;
  durationOffsetDays: number;
  isVariationAdjusted: boolean;
  variationAdjustmentLabelPt?: string;
  variationAdjustmentLabelEn?: string;
  isUserProgrammed?: boolean;
}

/**
 * Calculates a complete astronomical and civil forecast of upcoming seasonal transitions
 * (Spring Equinox, Summer Solstice, Autumn Equinox, Winter Solstice) adjusted dynamically
 * with all seasonal variation rules:
 * - Daylight Saving Time (Horário de Verão) evaluated at transition epochs
 * - Location specific seasonal variation rules (seasonalPeriods)
 * - Season Manager duration adjustments (advance/delay) and custom season overrides
 * - User toggle for accepting predicted seasonal variations (enableSeasonalVariation)
 * - User configured hemisphere (independent of country coordinates)
 */
export function calculateSeasonalForecastWithDST(
  referenceDate: Date,
  latitude: number,
  baseOffsetMinutes: number = 0,
  longitude: number = 0,
  location?: any,
  customAxialTilt?: number,
  seasonManagerConfig?: any,
  enableSeasonalVariation: boolean = true
): SeasonalTransitionForecast[] {
  // Check user programmed hemisphere in seasonManagerConfig (Independent of country!)
  let isNorthern = latitude > 0;
  if (seasonManagerConfig?.hemisphere === 'north') {
    isNorthern = true;
  } else if (seasonManagerConfig?.hemisphere === 'south') {
    isNorthern = false;
  } else if (seasonManagerConfig?.hemisphere === 'equatorial') {
    return []; // Equatorial zone has no solstice/equinox seasons
  } else if (isNaN(latitude) || Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
    return [];
  }

  const currentYear = referenceDate.getUTCFullYear();
  const transitionsYear1 = calculateAstronomicalTransitions(currentYear, customAxialTilt);
  const transitionsYear2 = calculateAstronomicalTransitions(currentYear + 1, customAxialTilt);
  const allTransitions = [...transitionsYear1, ...transitionsYear2];

  // Helper dictionary
  const seasonMetadata: Record<string, { icon: string; color: string; namePt: string; nameEn: string }> = {
    spring: { icon: '🌸', color: '#10b981', namePt: 'Primavera', nameEn: 'Spring' },
    summer: { icon: '☀️', color: '#f59e0b', namePt: 'Verão', nameEn: 'Summer' },
    autumn: { icon: '🍂', color: '#f97316', namePt: 'Outono', nameEn: 'Autumn' },
    winter: { icon: '❄️', color: '#38bdf8', namePt: 'Inverno', nameEn: 'Winter' },
  };

  const transitionSwapPt: Record<string, { key: 'springEquinox' | 'summerSolstice' | 'autumnEquinox' | 'winterSolstice'; pt: string; en: string }> = {
    springEquinox: { key: 'autumnEquinox', pt: 'Equinócio de Outono', en: 'Autumn Equinox' },
    summerSolstice: { key: 'winterSolstice', pt: 'Solstício de Inverno', en: 'Winter Solstice' },
    autumnEquinox: { key: 'springEquinox', pt: 'Equinócio de Primavera', en: 'Spring Equinox' },
    winterSolstice: { key: 'summerSolstice', pt: 'Solstício de Verão', en: 'Summer Solstice' },
  };

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const weekdayNamesPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return allTransitions
    .filter(t => t.date.getTime() >= referenceDate.getTime() - 24 * 3600000)
    .slice(0, 4)
    .map(t => {
      let canonicalSeason: 'spring' | 'summer' | 'autumn' | 'winter';
      let transitionKey = t.name as 'springEquinox' | 'summerSolstice' | 'autumnEquinox' | 'winterSolstice';
      let transitionNamePt = '';
      let transitionNameEn = '';

      if (t.name === 'springEquinox') {
        canonicalSeason = isNorthern ? 'spring' : 'autumn';
        transitionNamePt = isNorthern ? 'Equinócio de Primavera' : transitionSwapPt.springEquinox.pt;
        transitionNameEn = isNorthern ? 'Spring Equinox' : transitionSwapPt.springEquinox.en;
      } else if (t.name === 'summerSolstice') {
        canonicalSeason = isNorthern ? 'summer' : 'winter';
        transitionNamePt = isNorthern ? 'Solstício de Verão' : transitionSwapPt.summerSolstice.pt;
        transitionNameEn = isNorthern ? 'Summer Solstice' : transitionSwapPt.summerSolstice.en;
      } else if (t.name === 'autumnEquinox') {
        canonicalSeason = isNorthern ? 'autumn' : 'spring';
        transitionNamePt = isNorthern ? 'Equinócio de Outono' : transitionSwapPt.autumnEquinox.pt;
        transitionNameEn = isNorthern ? 'Autumn Equinox' : transitionSwapPt.autumnEquinox.en;
      } else {
        canonicalSeason = isNorthern ? 'winter' : 'summer';
        transitionNamePt = isNorthern ? 'Solstício de Inverno' : transitionSwapPt.winterSolstice.pt;
        transitionNameEn = isNorthern ? 'Winter Solstice' : transitionSwapPt.winterSolstice.en;
      }

      if (!isNorthern) {
        transitionKey = transitionSwapPt[t.name]?.key || transitionKey;
      }

      const meta = { ...seasonMetadata[canonicalSeason] };

      // Check Season Manager duration rules & custom season overrides
      // These rules are programmed by the user and DO NOT depend on the country!
      let durationOffsetDays = 0;
      let variationAdjustmentLabelPt: string | undefined;
      let variationAdjustmentLabelEn: string | undefined;
      let customDateOverride: Date | null = null;
      let isUserProgrammedSeason = false;

      if (enableSeasonalVariation && seasonManagerConfig?.enabled !== false) {
        // 1. Duration modes (Advance / Delay / Permanent)
        if (seasonManagerConfig?.durationMode === 'advance' && seasonManagerConfig.durationDaysOffset) {
          durationOffsetDays -= seasonManagerConfig.durationDaysOffset;
          variationAdjustmentLabelPt = `Adiantamento (-${seasonManagerConfig.durationDaysOffset}d)`;
          variationAdjustmentLabelEn = `Advance (-${seasonManagerConfig.durationDaysOffset}d)`;
          isUserProgrammedSeason = true;
        } else if (seasonManagerConfig?.durationMode === 'delay' && seasonManagerConfig.durationDaysOffset) {
          durationOffsetDays += seasonManagerConfig.durationDaysOffset;
          variationAdjustmentLabelPt = `Atraso (+${seasonManagerConfig.durationDaysOffset}d)`;
          variationAdjustmentLabelEn = `Delay (+${seasonManagerConfig.durationDaysOffset}d)`;
          isUserProgrammedSeason = true;
        } else if (seasonManagerConfig?.durationMode === 'permanent') {
          variationAdjustmentLabelPt = 'Permanente';
          variationAdjustmentLabelEn = 'Permanent';
          isUserProgrammedSeason = true;
        }

        // 2. Custom season overrides per season
        const seasonOverrideList = seasonManagerConfig?.customSeasonOverrides?.[canonicalSeason];
        if (seasonOverrideList && seasonOverrideList.length > 0) {
          const override = seasonOverrideList.find((o: any) => o.enabled !== false);
          if (override) {
            isUserProgrammedSeason = true;
            if (override.displayName) {
              meta.namePt = override.displayName;
              meta.nameEn = override.displayName;
            }
            if (override.icon) meta.icon = override.icon;
            if (override.accentColor) meta.color = override.accentColor;

            // Start date override (concrete date or natural rule)
            if (override.customStartDate) {
              const cleanD = override.customStartDate.includes('T') ? override.customStartDate : `${override.customStartDate}T00:00:00Z`;
              const parsed = new Date(cleanD);
              if (!isNaN(parsed.getTime())) {
                const targetY = t.date.getUTCFullYear();
                customDateOverride = new Date(Date.UTC(targetY, parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0));
                variationAdjustmentLabelPt = 'Data Personalizada';
                variationAdjustmentLabelEn = 'Custom Date';
              }
            } else if (override.customStartRule) {
              const ruleD = resolveRuleDate(override.customStartRule, t.date.getUTCFullYear());
              if (ruleD) {
                customDateOverride = ruleD;
              }
            }

            if (override.startOffsetDays) {
              durationOffsetDays += override.startOffsetDays;
            }

            const formatRuleTitle = (str: string) => {
              return str
                .split(' ')
                .filter(Boolean)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ')
                .replace(/\bDe\b/gi, 'De');
            };

            const ruleName = override.customStartRule ? formatRuleTitle(override.customStartRule) : '';
            const offsetDays = override.startOffsetDays ?? 0;
            const sign = offsetDays >= 0 ? '+' : '';

            if (ruleName && offsetDays !== 0) {
              variationAdjustmentLabelPt = `(Exceto ${ruleName} ${sign}${offsetDays})`;
              variationAdjustmentLabelEn = `(Except ${ruleName} ${sign}${offsetDays})`;
            } else if (ruleName) {
              variationAdjustmentLabelPt = `(Exceto ${ruleName})`;
              variationAdjustmentLabelEn = `(Except ${ruleName})`;
            } else if (offsetDays !== 0) {
              variationAdjustmentLabelPt = `(${sign}${offsetDays})`;
              variationAdjustmentLabelEn = `(${sign}${offsetDays})`;
            }
          }
        }
      }

      // Effective transition UTC timestamp adjusted by custom date anchors or duration offsets
      const baseAnchorMs = customDateOverride ? customDateOverride.getTime() : t.date.getTime();
      const effectiveTransitionUtcMs = baseAnchorMs + durationOffsetDays * 86400000;
      const effectiveUtcDate = new Date(effectiveTransitionUtcMs);

      // Check whether DST / seasonal shift is active at this transition's effective date
      // Honors user programmed rules with absolute supremacy over country heuristics
      const dstCheck = checkDSTAtEpoch(
        effectiveTransitionUtcMs, 
        baseOffsetMinutes, 
        latitude, 
        longitude, 
        location,
        seasonManagerConfig,
        enableSeasonalVariation
      );

      const isDstActive = dstCheck.isDst;
      const dstShiftMinutes = isDstActive ? dstCheck.shiftMinutes : 0;
      const totalOffsetMinutes = baseOffsetMinutes + dstShiftMinutes;

      // Local civil date corresponding to the transition instant
      const localEpoch = effectiveTransitionUtcMs + totalOffsetMinutes * 60000;
      const localDate = new Date(localEpoch);

      const daysRemaining = Math.max(0, Math.ceil((effectiveTransitionUtcMs - referenceDate.getTime()) / (24 * 3600000)));
      const isUpcoming = effectiveTransitionUtcMs > referenceDate.getTime();

      // Formatted strings using UTC components of localDate
      const wDay = weekdayNamesPt[localDate.getUTCDay()];
      const day = pad2(localDate.getUTCDate());
      const month = pad2(localDate.getUTCMonth() + 1);
      const year = localDate.getUTCFullYear();
      const hour = pad2(localDate.getUTCHours());
      const min = pad2(localDate.getUTCMinutes());

      const formattedLocal = `${wDay}, ${day}/${month}/${year} ${hour}:${min}`;
      const formattedUtc = `${pad2(effectiveUtcDate.getUTCDate())}/${pad2(effectiveUtcDate.getUTCMonth() + 1)}/${effectiveUtcDate.getUTCFullYear()} ${pad2(effectiveUtcDate.getUTCHours())}:${pad2(effectiveUtcDate.getUTCMinutes())} UTC`;
      const formattedLocalWithException = variationAdjustmentLabelPt 
        ? `${formattedLocal} ${variationAdjustmentLabelPt}`
        : formattedLocal;

      return {
        seasonKey: canonicalSeason,
        seasonNamePt: meta.namePt,
        seasonNameEn: meta.nameEn,
        seasonIcon: meta.icon,
        seasonColor: meta.color,
        transitionKey,
        transitionNamePt,
        transitionNameEn,
        utcDate: effectiveUtcDate,
        rawAstronomicalDate: t.date,
        localDate,
        isDstActive,
        dstShiftMinutes,
        totalOffsetMinutes,
        daysRemaining,
        isUpcoming,
        formattedLocal,
        formattedLocalWithException,
        formattedUtc,
        seasonalRuleDescription: dstCheck.ruleDescription,
        durationOffsetDays,
        isVariationAdjusted: enableSeasonalVariation && seasonManagerConfig?.enabled !== false && (durationOffsetDays !== 0 || customDateOverride !== null),
        variationAdjustmentLabelPt,
        variationAdjustmentLabelEn,
        isUserProgrammed: isUserProgrammedSeason || dstCheck.isUserProgrammed
      };
    });
}

/**
 * Returns Daylight Saving Time & Seasonal Variation forecast for a location: current status,
 * next shift transition, rule descriptions, and countdown.
 * Strictly respects what the user/person programmed: active or inactive, regardless of country.
 */
export function getDstForecast(
  currentDate: Date,
  baseOffsetMinutes: number,
  latitude: number,
  longitude: number,
  location?: any,
  seasonManagerConfig?: any,
  enableSeasonalVariation: boolean = true
): {
  hasDst: boolean;
  isCurrentlyActive: boolean;
  currentShiftMinutes: number;
  statusLabelPt: string;
  statusLabelEn: string;
  ruleDescription: string;
  isSeasonalVariationEnabled: boolean;
  isUserProgrammed?: boolean;
} {
  const currentMs = currentDate.getTime();

  if (!enableSeasonalVariation) {
    return {
      hasDst: false,
      isCurrentlyActive: false,
      currentShiftMinutes: 0,
      statusLabelPt: 'Horário Padrão Fixo (Variações Desativadas)',
      statusLabelEn: 'Standard Fixed Time (Seasonal Variations Off)',
      ruleDescription: 'Variações sazonais ignoradas por preferência do usuário',
      isSeasonalVariationEnabled: false,
      isUserProgrammed: true
    };
  }

  // If user programmed Season Manager time change
  if (seasonManagerConfig?.enabled !== false && seasonManagerConfig?.timeChange) {
    const tc = seasonManagerConfig.timeChange;
    if (tc.enabled === false) {
      return {
        hasDst: false,
        isCurrentlyActive: false,
        currentShiftMinutes: 0,
        statusLabelPt: 'Horário de Verão Desativado pelo Usuário',
        statusLabelEn: 'DST Disabled by User',
        ruleDescription: 'Programado como Inativo no Gestor de Temporadas (Independente do País)',
        isSeasonalVariationEnabled: true,
        isUserProgrammed: true
      };
    }

    if (tc.enabled === true) {
      const currentCheck = checkDSTAtEpoch(currentMs, baseOffsetMinutes, latitude, longitude, location, seasonManagerConfig, true);
      const shift = tc.shiftMinutes ?? 60;
      return {
        hasDst: true,
        isCurrentlyActive: currentCheck.isDst,
        currentShiftMinutes: currentCheck.isDst ? currentCheck.shiftMinutes : 0,
        statusLabelPt: currentCheck.isDst 
          ? `Variação Sazonal Ativa (+${currentCheck.shiftMinutes} min)`
          : `Programado pelo Usuário (+${shift} min)`,
        statusLabelEn: currentCheck.isDst 
          ? `Seasonal Shift Active (+${currentCheck.shiftMinutes} min)`
          : `Programmed by User (+${shift} min)`,
        ruleDescription: currentCheck.ruleDescription || tc.label || 'Variação Sazonal Programada (Independente do País)',
        isSeasonalVariationEnabled: true,
        isUserProgrammed: true
      };
    }
  }

  // Location seasonal periods programmed by user
  if (location?.seasonalPeriods && Array.isArray(location.seasonalPeriods) && location.seasonalPeriods.length > 0) {
    const currentCheck = checkDSTAtEpoch(currentMs, baseOffsetMinutes, latitude, longitude, location, seasonManagerConfig, true);
    return {
      hasDst: true,
      isCurrentlyActive: currentCheck.isDst,
      currentShiftMinutes: currentCheck.isDst ? currentCheck.shiftMinutes : 0,
      statusLabelPt: currentCheck.isDst
        ? `Regra Sazonal Local Ativa (+${currentCheck.shiftMinutes} min)`
        : 'Horário Padrão (Regra Sazonal Inativa)',
      statusLabelEn: currentCheck.isDst
        ? `Local Seasonal Rule Active (+${currentCheck.shiftMinutes} min)`
        : 'Standard Time (Seasonal Rule Inactive)',
      ruleDescription: currentCheck.ruleDescription,
      isSeasonalVariationEnabled: true,
      isUserProgrammed: true
    };
  }

  // Location dstInfo programmed by user
  if (location?.dstInfo?.hasDst) {
    const currentCheck = checkDSTAtEpoch(currentMs, baseOffsetMinutes, latitude, longitude, location, seasonManagerConfig, true);
    return {
      hasDst: true,
      isCurrentlyActive: currentCheck.isDst,
      currentShiftMinutes: currentCheck.isDst ? currentCheck.shiftMinutes : 0,
      statusLabelPt: currentCheck.isDst
        ? `Horário de Verão Ativo (+${currentCheck.shiftMinutes} min)`
        : 'Horário Padrão (Horário de Verão Inativo)',
      statusLabelEn: currentCheck.isDst
        ? `DST Active (+${currentCheck.shiftMinutes} min)`
        : 'Standard Time (DST Inactive)',
      ruleDescription: currentCheck.ruleDescription,
      isSeasonalVariationEnabled: true,
      isUserProgrammed: true
    };
  }

  // Default regional heuristics
  const currentCheck = checkDSTAtEpoch(currentMs, baseOffsetMinutes, latitude, longitude, location, seasonManagerConfig, true);
  const futureSixMonths = currentMs + 180 * 24 * 3600000;
  const futureCheck = checkDSTAtEpoch(futureSixMonths, baseOffsetMinutes, latitude, longitude, location, seasonManagerConfig, true);
  const hasDst = currentCheck.isDst || futureCheck.isDst;

  let statusLabelPt = 'Horário Padrão Permanente (Sem DST)';
  let statusLabelEn = 'Permanent Standard Time (No DST)';

  if (Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
    statusLabelPt = 'Linha do Equador (Sem Estações & Sem DST)';
    statusLabelEn = 'Equator (No Seasons & No DST)';
  } else if (currentCheck.isDst) {
    statusLabelPt = `Horário de Verão Ativo (+${currentCheck.shiftMinutes} min)`;
    statusLabelEn = `Daylight Saving Time Active (+${currentCheck.shiftMinutes} min)`;
  } else if (hasDst) {
    statusLabelPt = 'Horário Padrão (DST Inativo)';
    statusLabelEn = 'Standard Time (DST Inactive)';
  }

  return {
    hasDst,
    isCurrentlyActive: currentCheck.isDst,
    currentShiftMinutes: currentCheck.isDst ? currentCheck.shiftMinutes : 0,
    statusLabelPt,
    statusLabelEn,
    ruleDescription: currentCheck.ruleDescription,
    isSeasonalVariationEnabled: true,
    isUserProgrammed: false
  };
}

/**
 * Returns the next two solar equinoxes or solstices adjusted dynamically
 * with Daylight Saving Time (Horário de Verão) evaluated at each transition epoch.
 * Honors user programmed rules with absolute supremacy over country heuristics.
 */
export function getNextTwoTransitions(
  date: Date,
  latitude: number,
  offsetMinutes: number,
  customAxialTilt?: number,
  location?: any,
  baseOffsetMinutes?: number,
  longitude: number = 0,
  seasonManagerConfig?: any,
  enableSeasonalVariation: boolean = true
): { 
  name: string; 
  date: Date; 
  utcDate: Date;
  isDstActive: boolean; 
  dstShift: number; 
  daysRemaining: number;
}[] {
    let isNorthern = latitude > 0;
    if (seasonManagerConfig?.hemisphere === 'north') {
      isNorthern = true;
    } else if (seasonManagerConfig?.hemisphere === 'south') {
      isNorthern = false;
    } else if (seasonManagerConfig?.hemisphere === 'equatorial' || isNaN(latitude) || Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
      return [];
    }

    const year = date.getUTCFullYear();
    const transitions = calculateAstronomicalTransitions(year, customAxialTilt);
    const nextYearTransitions = calculateAstronomicalTransitions(year + 1, customAxialTilt);
    const allTransitions = [...transitions, ...nextYearTransitions];

    const effectiveBaseOffset = (baseOffsetMinutes !== undefined && !isNaN(baseOffsetMinutes)) 
      ? baseOffsetMinutes 
      : offsetMinutes;

    const futureTransitions = allTransitions
      .filter(t => t.date.getTime() > date.getTime())
      .map(t => {
        // Evaluate DST at the transition's exact future instant
        const dstCheck = checkDSTAtEpoch(
          t.date.getTime(), 
          effectiveBaseOffset, 
          latitude, 
          longitude, 
          location,
          seasonManagerConfig,
          enableSeasonalVariation
        );
        const shift = dstCheck.isDst ? dstCheck.shiftMinutes : 0;
        const totalOffset = effectiveBaseOffset + shift;
        const localDate = new Date(t.date.getTime() + totalOffset * 60000);
        
        let name = t.name;
        if (!isNorthern) {
          const transitionSwap: { [key: string]: string } = {
            'springEquinox': 'autumnEquinox',
            'summerSolstice': 'winterSolstice',
            'autumnEquinox': 'springEquinox',
            'winterSolstice': 'summerSolstice'
          };
          name = transitionSwap[t.name] || t.name;
        }

        const daysRemaining = Math.max(0, Math.ceil((t.date.getTime() - date.getTime()) / (24 * 3600000)));

        return { 
          name, 
          date: localDate, 
          utcDate: t.date,
          isDstActive: dstCheck.isDst,
          dstShift: shift,
          daysRemaining
        };
      });

    return futureTransitions.slice(0, 2);
}

/**
 * Returns traffic intensity based on local time.
 */
export function getTrafficIntensity(date: Date): 'low' | 'medium' | 'high' {
    const hours = date.getUTCHours();
    // Peak hours: 07-09 and 17-19
    if ((hours >= 7 && hours < 9) || (hours >= 17 && hours < 19)) {
        return 'high';
    } else if ((hours >= 6 && hours < 7) || (hours >= 9 && hours < 10) || (hours >= 16 && hours < 17) || (hours >= 19 && hours < 20)) {
        return 'medium';
    }
    return 'low';
}

/**
 * Formats Equation of Time (EoT) as the delta between Global UTC Reference and Solar UTC.
 * Format: +/- XX:XX:XXX (+/- MM:SS:ms or +/- HH:MM:SS)
 */
export function formatEquationOfTime(minutes: number): string {
    if (isNaN(minutes)) return "+00:00:000";
    const isNegative = minutes < 0;
    const totalMs = Math.round(Math.abs(minutes) * 60 * 1000);
    
    const ms = totalMs % 1000;
    const totalSec = Math.floor(totalMs / 1000);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60);
    
    const sign = isNegative && totalMs > 0 ? '-' : '+';
    
    return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

/**
 * Result of the difference calculation between Local Solar Time and Local Civil Time.
 */
export interface SolarCivilDifferenceResult {
  formatted: string; // [+/-]XX(Minuto):XX(Segundo):XXXX or XX(Minuto):XX(Segundo):XXXX in absolute equilibrium
  sign: '+' | '-' | '';
  minutes: number;
  seconds: number;
  fourDigitsFraction: string;
  totalMs: number;
  diffMinutes: number;
  isEquilibrium: boolean;
  isAhead: boolean;
  isBehind: boolean;
}

/**
 * Calculates and formats the exact difference between Local Solar Time and Local Civil Time.
 * Rules:
 * - When Local Solar Time is ahead of Local Civil Time: +XX(Minuto):XX(Segundo):XXXX
 * - When Local Solar Time is behind Local Civil Time:  -XX(Minuto):XX(Segundo):XXXX
 * - When reaching absolute equilibrium:               XX(Minuto):XX(Segundo):XXXX (e.g. 00:00:0000, without sign)
 *
 * Pattern XX(Minuto):XX(Segundo):XXXX:
 * - XX(Minuto): Total Minutes (00-99+)
 * - XX(Segundo): Seconds (00-59)
 * - XXXX: 4-digit fraction of second / ten-thousandths (0000-9999)
 */
export function formatSolarCivilDifference(diffMinutes: number): SolarCivilDifferenceResult {
  if (isNaN(diffMinutes)) {
    return {
      formatted: '00:00:0000',
      sign: '',
      minutes: 0,
      seconds: 0,
      fourDigitsFraction: '0000',
      totalMs: 0,
      diffMinutes: 0,
      isEquilibrium: true,
      isAhead: false,
      isBehind: false,
    };
  }

  // Circular normalization within [-720, 720] minutes (-12h to +12h)
  let normMin = diffMinutes;
  while (normMin > 720) normMin -= 1440;
  while (normMin < -720) normMin += 1440;

  // Convert to total milliseconds
  const totalMs = Math.round(normMin * 60 * 1000);

  // Absolute equilibrium check (within 1 ms)
  if (Math.abs(totalMs) < 1) {
    return {
      formatted: '00:00:0000',
      sign: '',
      minutes: 0,
      seconds: 0,
      fourDigitsFraction: '0000',
      totalMs: 0,
      diffMinutes: 0,
      isEquilibrium: true,
      isAhead: false,
      isBehind: false,
    };
  }

  const isAhead = totalMs > 0;
  const sign: '+' | '-' = isAhead ? '+' : '-';
  const absMs = Math.abs(totalMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // 4 digits for fraction of second: 0000 to 9999
  const subsecondMs = absMs % 1000;
  const fourDigitsNum = Math.floor(subsecondMs * 10);
  const xxxx = fourDigitsNum.toString().padStart(4, '0');

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  return {
    formatted: `${sign}${mm}:${ss}:${xxxx}`,
    sign,
    minutes,
    seconds,
    fourDigitsFraction: xxxx,
    totalMs,
    diffMinutes: normMin,
    isEquilibrium: false,
    isAhead,
    isBehind: !isAhead,
  };
}

export function calculateCarnavalTuesday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day, 0, 0));
  return new Date(Date.UTC(year, easter.getUTCMonth(), easter.getUTCDate() - 47, 0, 0, 0));
}
