export interface CloudTrendResult {
  percentage: number; // 0 to 100
  mode: 'off' | 'light' | 'medium' | 'heavy';
  descriptionPt: string;
  descriptionEn: string;
}

/**
 * Calculates a realistic historical cloud cover estimate based on coordinate climate statistics,
 * seasonal variation, and diurnal cycles (inspired by typical timeanddate.com weather reports).
 */
export function calculateHistoricalClouds(date: Date, latitude: number, longitude: number): CloudTrendResult {
  const month = date.getUTCMonth(); // 0 to 11
  const hour = date.getUTCHours() + longitude / 15; // Local solar time estimate
  const localHour = (hour + 24) % 24;
  const absLat = Math.abs(latitude);

  let baseCloud = 40; // Default average

  // Latitude based climate zones (timeanddate.com statistics)
  if (absLat < 10) {
    // Equatorial rain belt (ITCZ): high cloudiness year round
    baseCloud = 65 + 10 * Math.sin((month / 12) * Math.PI * 2);
  } else if (absLat >= 10 && absLat < 22) {
    // Tropical monsoon zones: dry and wet seasons
    // In Northern hemisphere: summer (May-Oct) is rainy/cloudy.
    // In Southern hemisphere: winter (May-Oct) is dry, summer (Nov-Apr) is rainy/cloudy.
    const isNorth = latitude >= 0;
    const isWetSeason = isNorth ? (month >= 4 && month <= 9) : (month <= 3 || month >= 10);
    baseCloud = isWetSeason ? 70 : 25;
  } else if (absLat >= 22 && absLat < 35) {
    // Subtropical deserts (very clear skies, e.g. Sahara, Atacama, Middle East)
    baseCloud = 20 + 8 * Math.sin((month / 12) * Math.PI * 2);
  } else if (absLat >= 35 && absLat < 60) {
    // Temperate zones: winter is cloudier, summer is clearer
    const isNorth = latitude >= 0;
    const isWinter = isNorth ? (month <= 2 || month >= 10) : (month >= 4 && month <= 8);
    baseCloud = isWinter ? 65 : 40;
  } else {
    // Polar / subpolar zones: high cloud cover
    baseCloud = 70 + 10 * Math.sin((month / 12) * Math.PI * 2);
  }

  // Diurnal variation (time of day impact on cloud types and convection)
  let hourModifier = 0;
  if (localHour >= 12 && localHour <= 17) {
    // Convective heating forms Cumulus clouds in the afternoon
    hourModifier = 12;
  } else if (localHour >= 5 && localHour <= 9) {
    // Morning humidity/fog
    hourModifier = 6;
  } else if (localHour >= 21 || localHour <= 3) {
    // Cooler night skies are often clearer
    hourModifier = -10;
  }

  // Clamp cloud percentage between 5% and 95%
  let percentage = Math.max(5, Math.min(95, Math.round(baseCloud + hourModifier)));

  // Map to cloud density presets
  let mode: 'off' | 'light' | 'medium' | 'heavy' = 'light';
  let descriptionPt = '';
  let descriptionEn = '';

  if (percentage < 15) {
    mode = 'off';
    descriptionPt = 'Céu Totalmente Limpo';
    descriptionEn = 'Completely Clear Sky';
  } else if (percentage < 40) {
    mode = 'light';
    descriptionPt = 'Poucas Nuvens / Céu Aberto';
    descriptionEn = 'Few Clouds / Sunny Skies';
  } else if (percentage < 70) {
    mode = 'medium';
    descriptionPt = 'Parcialmente Nublado';
    descriptionEn = 'Partially Cloudy';
  } else {
    mode = 'heavy';
    descriptionPt = 'Encoberto / Céu Nublado';
    descriptionEn = 'Overcast / Cloudy Sky';
  }

  return { percentage, mode, descriptionPt, descriptionEn };
}
