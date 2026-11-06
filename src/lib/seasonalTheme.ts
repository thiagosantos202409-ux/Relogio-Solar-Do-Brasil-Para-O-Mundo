import { calculateAstronomicalTransitions, checkDSTAtEpoch, getMovableFeast } from './solarTime';

export type SeasonType = 'summer' | 'autumn' | 'winter' | 'spring';
export type CycleFormat = 'single' | 'range'; // 'single' = XXXX (01/01 - 31/12), 'range' = XXXX/YYYY (01/07 - 30/06)
export type DurationMode = 'natural' | 'advance' | 'delay' | 'permanent';

export interface SeasonalAccentConfig {
  season: SeasonType;
  color: string;
  glow: string;
  name: string;
  namePt: string;
  icon: string;
  description: string;
  descriptionPt: string;
  gradient: string;
  badgeBg: string;
  badgeBorder: string;
}

export interface CustomTimeChangeSeason {
  id: string;
  seasonLabel: string;
  customName?: string; // Optional custom name chosen by user (e.g. "Entre Temporadas 2026/2027", "Ciclo Especial", etc.)
  startYear: number;
  endYear: number;
  startRule?: string;
  endRule?: string;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  shiftMinutes?: number;
  notes?: string;
  enabled?: boolean;
}

export interface SeasonalTimeChangeConfig {
  enabled: boolean;
  format: CycleFormat; // 'single' (XXX1 a XXX4) or 'range' (XXX1/XXX2 a XXX3/XXX4)
  allowOverlap?: boolean; // Permitir sobreposição e acúmulo de variações/regras sazonais
  startYear: number; // Ano / Temporada de Início (ex: 2024)
  endYear: number; // Ano / Temporada de Encerramento (ex: 2027)
  seasonCount?: number; // Quantidade de temporadas geradas (ex: 1, 4, 10, 20, 50, etc.)
  seasonPrefix?: string; // Nome/Termo configurável (ex: "Entre Temporadas", "Temporada", "Ciclo", "Horário de Verão", "Safra", "Período")
  interSeasonName?: string; // Nome do período entre temporadas (ex: "Entre Temporadas", "Intervalo sem Horário")
  startRule: string; // Ex: "Último domingo de Setembro", "Último domingo de Março", "Primeiro domingo de Outubro", "Terceiro domingo de Outubro"
  endRule: string; // Ex: "Último domingo de Março", "Último domingo de Setembro", "Terceiro domingo de Fevereiro", "Primeiro domingo de Abril"
  startTime: string; // Ex: "00:00", "01:00", "02:00"
  endTime: string; // Ex: "00:00", "01:00", "02:00"
  shiftMinutes: number; // Ex: 60 (+1 hora)
  label?: string; // Ex: "Horário de Verão Sazonal"
  customSeasonLabel?: string; // Rótulo/Anos da Temporada personalizado (ex: XXX1, XXX1/XXX2 a XXX4/XXX5)
  customSeasons?: CustomTimeChangeSeason[]; // Temporadas personalizadas adicionais
  isPermanent?: boolean;
  endScopeType?: 'year' | 'permanent';
  vigencyScope?: 'single' | 'range' | 'permanent';
}

export type SeasonalSoundType = 'chime' | 'bell' | 'marimba' | 'crystal' | 'zen';

export interface CustomSeasonOverride {
  name?: string;
  namePt?: string;
  nameEn?: string;
  color?: string; // Hex color code (e.g. #fbbf24, #f43f5e, #a855f7)
  glow?: string;
  icon?: string; // Emoji or icon string (e.g. ☀️, 🌴, 🌸, ❄️, 🍂, 🏖️, 🌺, 🌾, 🌊)
  description?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  startOffsetDays?: number; // Days to offset start date (-60 to +60)
  endOffsetDays?: number; // Days to offset end date (-60 to +60)
  customStartDate?: string; // Exact start date YYYY-MM-DD or MM-DD
  customEndDate?: string; // Exact end date YYYY-MM-DD or MM-DD
  customStartRule?: string; // Natural language rule e.g. "21 de Dezembro"
  customEndRule?: string; // Natural language rule e.g. "20 de Março"
  enabled?: boolean;
}

export interface CustomExtraSeason {
  id: string;
  name: string;
  namePt: string;
  nameEn: string;
  icon: string;
  color: string;
  startMonth: number; // 1-12
  startDay: number; // 1-31
  endMonth: number; // 1-12
  endDay: number; // 1-31
  description?: string;
  descriptionPt?: string;
  enabled: boolean;
}

export type SeasonVigencyScope = 'single' | 'range' | 'permanent';

export interface SeasonManagerConfig {
  enabled: boolean;
  allowOverlap?: boolean; // Permitir sobrepor e acumular variações sazonais umas em cima das outras
  cycleFormat: CycleFormat; // 'single' (XXXX) or 'range' (XXXX/YYYY)
  vigencyScope?: SeasonVigencyScope; // 'single' | 'range' | 'permanent'
  isRangeMode: boolean; // true = interval (XXX1 a XXX9 or XXX1/XXX2 a XXX9/XX10 or Permanente)
  endScopeType?: 'year' | 'permanent'; // 'year' (termina em XXX6/XXX7) ou 'permanent' (a Permanente)
  targetYear: number; // Base or Start Year (e.g. 2026 or 2024)
  endYear: number; // End Year when isRangeMode is true (e.g. 2029 or 2030)
  seasonMode: 'auto' | 'manual';
  manualSeason: SeasonType;
  durationMode: DurationMode;
  durationDaysOffset: number; // e.g. 15 for 15 days advance or delay
  customLabel?: string;
  customSeasonOverrides?: Record<string, CustomSeasonOverride[]>;
  customExtraSeasons?: CustomExtraSeason[];
  timeChange: SeasonalTimeChangeConfig;
  // Sound Alerts Configuration
  soundAlertsEnabled?: boolean;
  soundAlertType?: SeasonalSoundType;
  soundVolume?: number; // 0 to 1 (default: 0.65)
  soundAlertOnSeasonChange?: boolean;
  soundAlertOnTimeChange?: boolean;
}

export const checkSingleVigencia = (vTrimmed: string, validityType: 'single' | 'range' | undefined, timeMs: number, year: number): boolean => {
  let vLower = vTrimmed.toLowerCase().trim();
  if (!vLower) return true;

  // 1. Check for "fixed/permanent/active" keywords
  if (["permanente", "fixo", "fixa", "infinito", "sempre", "permanent", "fixed", "always", "ativo", "ativa", "vigente"].includes(vLower)) return true;
  
  // Clean optional prefixes like "temporada", "temporadas:", "ano", "vigência"
  vLower = vLower.replace(/^(?:temporadas?|ano|vigencia|vigência)\s*:?\s*/i, '').trim();

  // Expand literal placeholder "XXX" or "XX" (e.g. XXX1 a XXX6 -> 2021 a 2026 for year in the 2020s)
  if (/x{2,}/i.test(vLower)) {
    const decadePrefix = Math.floor(year / 10).toString();
    const centPrefix = Math.floor(year / 100).toString();
    vLower = vLower.replace(/xxx/gi, decadePrefix).replace(/xx/gi, centPrefix);
  }

  // Check again for permanent if it ended up like "permanente"
  if (["permanente", "fixo", "fixa", "infinito", "sempre", "permanent", "fixed", "always", "ativo", "ativa", "vigente"].includes(vLower)) return true;

  // 2. Historical Brazilian presidential decree validations
  if (vLower.includes("6.558/2008") || vLower.includes("regra histórica nacional") || vLower.includes("regra histórica mt/ms")) {
    return year >= 2008 && year <= 2018; // Active 2008 through 2018 (revoked in 2019)
  }
  if (vLower.includes("9.242/2017") || vLower.includes("anos eleitorais")) {
    return year === 2018;
  }
  if (vLower.includes("13.367/2011") || vLower.includes("experimento isolado")) {
    return year === 2011;
  }
  if (vLower.includes("7.826/2012") || vLower.includes("revogado pelo decreto 8.112/2013")) {
    return year === 2012;
  }

  // 3. "XXX9 a Permanente" or "XXX9/XX10 a Permanente" (e.g. 2019 a Permanente, 2019/2020 a Permanente)
  const permStartMatch = vLower.match(/^(\d{4})(?:\/(\d{2,4}))?\s*(?:-|–|—|a|até|to)\s*(?:permanente|permanent|infinito|sempre)\b/i);
  if (permStartMatch) {
    const yStart = parseInt(permStartMatch[1], 10);
    return year >= yStart;
  }

  // 4. "XXX1/XXX2 a XXX6/XXX7" (e.g. 2001/2002 a 2006/2007, 2021/2022 a 2026/2027)
  const doubleRangeMatch = vLower.match(/^(\d{4})\/(\d{2,4})\s*(?:-|–|—|a|até|to)\s*(\d{4})\/(\d{2,4})$/i);
  if (doubleRangeMatch) {
    const yStart = parseInt(doubleRangeMatch[1], 10);
    const yEnd = parseInt(doubleRangeMatch[3], 10);
    return year >= yStart && year <= yEnd;
  }

  // 5. "XXX1 a XXX6" (e.g. 2001 a 2006, 2021 a 2026)
  const singleRangeMatch = vLower.match(/^(\d{4})\s*(?:-|–|—|a|até|to)\s*(\d{4})$/i);
  if (singleRangeMatch) {
    const yStart = parseInt(singleRangeMatch[1], 10);
    const yEnd = parseInt(singleRangeMatch[2], 10);
    return year >= yStart && year <= yEnd;
  }

  // 6. Broad range with 4-digit years (e.g. 2008-2018, 2008 a 2019)
  const rangeYearMatch = vLower.match(/\b(\d{4})\s*(?:-|–|—|a|até|to)\s*(\d{4})\b/i);
  if (rangeYearMatch) {
    const yStart = parseInt(rangeYearMatch[1], 10);
    const yEnd = parseInt(rangeYearMatch[2], 10);
    return year >= yStart && year <= yEnd;
  }

  // 7. "desde YYYY" / "a partir de YYYY" / "since YYYY" / "YYYY em diante" / "YYYY+"
  const fromYearMatch = vLower.match(/(?:a partir de|desde|since|from|pos-|pós-)\s*(\d{4})/i) || vLower.match(/^(\d{4})\s*(?:em diante|\+)/i);
  if (fromYearMatch) {
    const yStart = parseInt(fromYearMatch[1], 10);
    return year >= yStart;
  }

  // 8. "até YYYY" / "until YYYY" / "revogado em YYYY"
  const untilYearMatch = vLower.match(/(?:até|ate|until|revogado em|revoked in)\s*(\d{4})/i);
  if (untilYearMatch) {
    const yEnd = parseInt(untilYearMatch[1], 10);
    return year <= yEnd;
  }

  // 9. Single 4-digit year or year pair (e.g., "2024" or "2024/2025" or "2024/25")
  if (/^\d{4}$/.test(vLower)) {
    return parseInt(vLower, 10) === year;
  }
  const pairMatch = vLower.match(/^(\d{4})\/(\d{2,4})$/);
  if (pairMatch) {
    const y1 = parseInt(pairMatch[1], 10);
    return year === y1;
  }

  // 10. Explicit date range format DD/MM/YYYY - DD/MM/YYYY
  const parseDate = (s: string): Date | null => {
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1;
      const y = dmy[3] ? parseInt(dmy[3], 10) : year;
      const actualYear = y < 100 ? y + 2000 : y;
      return new Date(Date.UTC(actualYear, month, day));
    }
    return null;
  };

  const explicitDateRange = vTrimmed.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s*(?:-|–|—|a|até|to)\s*(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)$/i);
  if (explicitDateRange) {
    const dStart = parseDate(explicitDateRange[1]);
    const dEnd = parseDate(explicitDateRange[2]);
    if (dStart && dEnd) {
      dEnd.setUTCHours(23, 59, 59, 999);
      return timeMs >= dStart.getTime() && timeMs <= dEnd.getTime();
    }
  }

  // 11. Single date DD/MM/YYYY with validityType === 'single'
  if (validityType === 'single') {
    const singleTargetDate = parseDate(vTrimmed);
    if (singleTargetDate) {
      const d = new Date(timeMs);
      return d.getUTCDate() === singleTargetDate.getUTCDate() && d.getUTCMonth() === singleTargetDate.getUTCMonth() && d.getUTCFullYear() === singleTargetDate.getUTCFullYear();
    }
  }

  // 12. Standard legal statute or international law name in force
  return true;
};

export const isVigenciaActive = (vigencia: string | undefined, validityType: 'single' | 'range' | undefined, timeMs: number, year: number): boolean => {
  if (!vigencia || vigencia.trim() === "") return true;
  const clauses = vigencia.split(/[,;]+/).map(c => c.trim()).filter(Boolean);
  if (clauses.length === 0) return true;
  return clauses.some(clause => checkSingleVigencia(clause, validityType, timeMs, year));
};

const currentYear = new Date().getFullYear();

export const DEFAULT_SEASONAL_TIME_CHANGE_CONFIG: SeasonalTimeChangeConfig = {
  enabled: false,
  allowOverlap: false, // Desabilitado por padrão para aplicar estritamente o desvio pedido sem duplicar/pular 2h+
  format: 'range', // Default to bi-annual cycle XXX1/XXX2 a XXX3/XXX4
  startYear: currentYear - 1,
  endYear: currentYear + 2,
  seasonPrefix: 'Entre Temporadas',
  interSeasonName: 'Período Entre-Temporadas',
  startRule: 'Último domingo de Setembro',
  endRule: 'Último domingo de Março',
  startTime: '00:00',
  endTime: '00:00',
  shiftMinutes: 60,
  label: 'Horário Sazonal (DST)'
};

export const DEFAULT_SEASON_MANAGER_CONFIG: SeasonManagerConfig = {
  enabled: false,
  allowOverlap: false, // Desabilitado por padrão para evitar desvios duplicados
  cycleFormat: 'single',
  isRangeMode: false,
  targetYear: currentYear,
  endYear: currentYear + 3,
  seasonMode: 'auto',
  manualSeason: 'summer',
  durationMode: 'natural',
  durationDaysOffset: 0,
  customLabel: '',
  customSeasonOverrides: {},
  timeChange: DEFAULT_SEASONAL_TIME_CHANGE_CONFIG,
  soundAlertsEnabled: false,
  soundAlertType: 'chime',
  soundVolume: 0.65,
  soundAlertOnSeasonChange: true,
  soundAlertOnTimeChange: true
};


/**
 * High-quality Web Audio API short alert synthesis for season & time change transitions.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not available:', e);
    return null;
  }
}

export function playSeasonalSoundAlert(
  soundType: SeasonalSoundType = 'chime',
  volume: number = 0.65,
  accentSeason?: SeasonType
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const clampedVol = Math.max(0.05, Math.min(1, volume));
    const now = ctx.currentTime;

    if (soundType === 'chime') {
      // Harmonic pleasant ascending chime
      const baseFreqs = accentSeason === 'winter' 
        ? [587.33, 739.99, 880.00, 1174.66] // D5, F#5, A5, D6 (Frost crystalline)
        : accentSeason === 'spring'
        ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (Verdant)
        : accentSeason === 'autumn'
        ? [440.00, 554.37, 659.25, 880.00]  // A4, C#5, E5, A5 (Golden amber)
        : [523.25, 659.25, 783.99, 1046.50]; // Summer golden

      baseFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(clampedVol * 0.35, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
      });

    } else if (soundType === 'bell') {
      // Warm resonant harmonic bell chime
      const rootFreq = accentSeason === 'winter' ? 660 : 523.25;
      const harmonics = [1, 2.01, 3.02, 4.2];
      const gains = [0.4, 0.25, 0.15, 0.08];

      harmonics.forEach((h, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(rootFreq * h, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(clampedVol * gains[idx], now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);
      });

    } else if (soundType === 'marimba') {
      // Organic wooden mallet chime (short, bouncy)
      const freqs = [440, 554.37, 659.25];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(clampedVol * 0.4, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.28);
      });

    } else if (soundType === 'crystal') {
      // Pure ethereal shimmer with sparkle
      const freqs = [1046.50, 1318.51, 1567.98, 2093.00];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(clampedVol * 0.25, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.6);
      });

    } else if (soundType === 'zen') {
      // Deep meditative Tibetan bowl note with subtle harmonic
      const fundamental = 261.63; // C4
      [1, 2.76, 5.4].forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * ratio, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(clampedVol * (0.4 / (idx + 1)), now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
      });
    }
  } catch (err) {
    console.warn('Could not play seasonal sound alert:', err);
  }
}

export const SEASONAL_ACCENTS: Record<SeasonType, SeasonalAccentConfig> = {
  summer: {
    season: 'summer',
    color: '#fbbf24', // Warm Gold / Amber
    glow: 'rgba(251, 191, 36, 0.45)',
    name: 'Warm Gold',
    namePt: 'Ouro Caloroso',
    icon: '☀️',
    description: 'Radiant golden amber capturing high zenith sun and maximal solar radiation.',
    descriptionPt: 'Ouro radiante e caloroso capturando o sol no zênite e máxima radiação solar.',
    gradient: 'from-amber-400 via-yellow-400 to-amber-600',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    badgeBorder: 'border-amber-500/40'
  },
  autumn: {
    season: 'autumn',
    color: '#f97316', // Warm Amber / Copper
    glow: 'rgba(249, 115, 22, 0.45)',
    name: 'Autumn Amber',
    namePt: 'Âmbar de Outono',
    icon: '🍂',
    description: 'Warm copper and sunset amber reflecting seasonal equinox transition.',
    descriptionPt: 'Cobre caloroso e âmbar crepuscular refletindo a transição do equinócio de outono.',
    gradient: 'from-orange-400 via-amber-500 to-amber-700',
    badgeBg: 'bg-orange-500/20 text-orange-300',
    badgeBorder: 'border-orange-500/40'
  },
  winter: {
    season: 'winter',
    color: '#38bdf8', // Cool Frost Blue / Glacial Cyan
    glow: 'rgba(56, 189, 248, 0.45)',
    name: 'Cool Frost Blue',
    namePt: 'Azul Glacial Frio',
    icon: '❄️',
    description: 'Crisp crystalline azure mirroring winter solstice clarity and low declination.',
    descriptionPt: 'Azul cristalino e gélido espelhando a nitidez do solstício de inverno.',
    gradient: 'from-sky-400 via-cyan-400 to-blue-600',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    badgeBorder: 'border-sky-500/40'
  },
  spring: {
    season: 'spring',
    color: '#34d399', // Fresh Emerald / Verdant Green
    glow: 'rgba(52, 211, 153, 0.45)',
    name: 'Verdant Emerald',
    namePt: 'Esmeralda Primaveril',
    icon: '🌱',
    description: 'Lush spring emerald celebrating ascending solar altitude and daylight rebirth.',
    descriptionPt: 'Verde esmeralda primaveril celebrando o renascimento da luz e elevação solar.',
    gradient: 'from-emerald-400 via-teal-400 to-emerald-600',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    badgeBorder: 'border-emerald-500/40'
  }
};

export function hexToRgbaGlow(hex: string, alpha: number = 0.45): string {
  if (!hex || !hex.startsWith('#')) return `rgba(251, 191, 36, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(251, 191, 36, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSeasonalAccent(
  season?: string | null,
  overrides?: Record<string, CustomSeasonOverride[]>
): SeasonalAccentConfig {
  const normSeason = (season?.toLowerCase() as SeasonType) || 'summer';
  const base = SEASONAL_ACCENTS[normSeason] || SEASONAL_ACCENTS.summer;
  const customOverrides = overrides?.[normSeason] || [];

  // Combine enabled overrides
  const activeOverrides = customOverrides.filter(o => o.enabled !== false);
  if (activeOverrides.length === 0) {
    return base;
  }

  // Reduce overrides into one configuration
  const merged = activeOverrides.reduce((acc, custom) => {
    return {
      color: custom.color || acc.color,
      glow: custom.glow || acc.glow,
      icon: custom.icon || acc.icon,
      namePt: custom.namePt || custom.name || acc.namePt,
      nameEn: custom.nameEn || custom.name || acc.nameEn,
      descriptionPt: custom.descriptionPt || custom.description || acc.descriptionPt,
      descriptionEn: custom.descriptionEn || custom.description || acc.descriptionEn,
    };
  }, {
    color: base.color,
    glow: hexToRgbaGlow(base.color, 0.45),
    icon: base.icon,
    namePt: base.namePt,
    nameEn: base.name,
    descriptionPt: base.descriptionPt,
    descriptionEn: base.description,
  });

  return {
    season: normSeason,
    color: merged.color,
    glow: merged.glow || hexToRgbaGlow(merged.color, 0.45),
    name: merged.nameEn,
    namePt: merged.namePt,
    icon: merged.icon,
    description: merged.descriptionEn,
    descriptionPt: merged.descriptionPt,
    gradient: base.gradient,
    badgeBg: base.badgeBg,
    badgeBorder: base.badgeBorder
  };
}

export interface SeasonCycleStatus {
  cycleLabel: string;
  format: CycleFormat;
  isRangeMode: boolean;
  isPermanentEnd?: boolean;
  startYear: number;
  endYear: number;
  startDate: Date;
  endDate: Date;
  startDateFormatted: string;
  endDateFormatted: string;
  isValidNow: boolean;
  progressPercent: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
}

/**
 * Calculates the cycle period and current validity for the Season Manager
 * Supporting single cycles (XXXX or XXXX/YYYY) as well as ranges (XXX1 a XXX9, XXX1/XXX2 a XXX9/XX10, or XXX9 a Permanente).
 */
export function getSeasonCycleStatus(config: SeasonManagerConfig, currentMs: number = Date.now()): SeasonCycleStatus {
  const { cycleFormat, isRangeMode, targetYear, endScopeType, vigencyScope } = config;
  const isPermanentEnd = vigencyScope === 'permanent' || endScopeType === 'permanent';
  const startYear = targetYear;
  const endYear = isPermanentEnd ? Math.max(targetYear + 10, config.endYear || targetYear + 10) : (isRangeMode ? Math.max(targetYear, config.endYear || targetYear) : targetYear);
  const isSingle = cycleFormat === 'single';

  let startDate: Date;
  let endDate: Date;
  let cycleLabel: string;

  if (isPermanentEnd) {
    if (isSingle) {
      startDate = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(2100, 11, 31, 23, 59, 59, 999));
      cycleLabel = `${startYear} a Permanente`;
    } else {
      startDate = new Date(Date.UTC(startYear, 6, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(2100, 11, 31, 23, 59, 59, 999));
      cycleLabel = `${startYear}/${startYear + 1} a Permanente`;
    }
  } else if (isSingle) {
    // 01/01/startYear to 31/12/endYear
    startDate = new Date(Date.UTC(startYear, 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(endYear, 11, 31, 23, 59, 59, 999));
    cycleLabel = isRangeMode && endYear > startYear
      ? `${startYear} a ${endYear}`
      : `${startYear}`;
  } else {
    // 01/07/startYear to 30/06/(endYear + 1)
    startDate = new Date(Date.UTC(startYear, 6, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(endYear + 1, 5, 30, 23, 59, 59, 999));
    cycleLabel = isRangeMode && endYear > startYear
      ? `${startYear}/${startYear + 1} a ${endYear}/${endYear + 1}`
      : `${startYear}/${startYear + 1}`;
  }

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const totalMs = Math.max(1, endMs - startMs);
  const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));

  const isValidNow = isPermanentEnd ? currentMs >= startMs : (currentMs >= startMs && currentMs <= endMs);
  const elapsedMs = Math.max(0, Math.min(totalMs, currentMs - startMs));
  const progressPercent = isPermanentEnd ? 100 : Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  const daysElapsed = Math.max(0, Math.floor((currentMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysRemaining = isPermanentEnd ? 99999 : Math.max(0, Math.ceil((endMs - currentMs) / (1000 * 60 * 60 * 24)));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatD = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

  return {
    cycleLabel,
    format: cycleFormat,
    isRangeMode,
    isPermanentEnd,
    startYear,
    endYear,
    startDate,
    endDate,
    startDateFormatted: formatD(startDate),
    endDateFormatted: isPermanentEnd ? 'Permanente (Sem Expiração)' : formatD(endDate),
    isValidNow,
    progressPercent,
    daysElapsed,
    daysRemaining,
    totalDays
  };
}

export interface SeasonPeriodTimelineItem {
  id: string;
  year: number;
  cycleLabel: string;
  season: SeasonType;
  namePt: string;
  nameEn: string;
  icon: string;
  color: string;
  startDate: Date;
  endDate: Date;
  startDateFormatted: string;
  endDateFormatted: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  durationDays: number;
  status: 'completed' | 'active' | 'upcoming';
  progressPercent: number;
  isCurrent: boolean;
  transitionName: string;
  isStartDstActive?: boolean;
  startDstShift?: number;
  isEndDstActive?: boolean;
  endDstShift?: number;
}

/**
 * Generates every seasonal transition period across the configured years
 * with expected start and end dates based on astronomical solar solstices and equinoxes,
 * adjusted dynamically with Daylight Saving Time (Horário de Verão) evaluated at the transitions.
 */
export function generateSeasonTimeline(
  config: SeasonManagerConfig,
  latitude: number = -23.55,
  offsetMinutes: number = 0,
  currentMs: number = Date.now(),
  longitude: number = 0,
  location?: any
): SeasonPeriodTimelineItem[] {
  // Latitude 0 (Linha do Equador) has no seasons
  if (Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)) {
    return [];
  }
  const isNorthern = latitude > 0;
  const startYear = config.targetYear;
  const isPermanentEnd = config.vigencyScope === 'permanent' || config.endScopeType === 'permanent';
  const endYear = isPermanentEnd 
    ? Math.max(startYear + 6, config.endYear || startYear + 6) 
    : (config.isRangeMode ? Math.max(startYear, config.endYear || startYear) : startYear);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateTime = (d: Date) => ({
    dateStr: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`,
    timeStr: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  });

  const timelineItems: SeasonPeriodTimelineItem[] = [];

  // Generate transitions for each year in the range
  for (let y = startYear; y <= endYear; y++) {
    const prevYearTransitions = calculateAstronomicalTransitions(y - 1);
    const currYearTransitions = calculateAstronomicalTransitions(y);

    const periodsDef = [
      {
        seasonNorth: 'winter' as SeasonType,
        seasonSouth: 'summer' as SeasonType,
        startUtc: prevYearTransitions[3].date,
        endUtc: currYearTransitions[0].date,
        transitionNamePt: isNorthern ? 'Solstício de Inverno a Equinócio de Primavera' : 'Solstício de Verão a Equinócio de Outono',
        transitionNameEn: isNorthern ? 'Winter Solstice to Spring Equinox' : 'Summer Solstice to Autumn Equinox',
        periodYearLabel: `${y - 1}/${y}`
      },
      {
        seasonNorth: 'spring' as SeasonType,
        seasonSouth: 'autumn' as SeasonType,
        startUtc: currYearTransitions[0].date,
        endUtc: currYearTransitions[1].date,
        transitionNamePt: isNorthern ? 'Equinócio de Primavera a Solstício de Verão' : 'Equinócio de Outono a Solstício de Inverno',
        transitionNameEn: isNorthern ? 'Spring Equinox to Summer Solstice' : 'Autumn Equinox to Winter Solstice',
        periodYearLabel: `${y}`
      },
      {
        seasonNorth: 'summer' as SeasonType,
        seasonSouth: 'winter' as SeasonType,
        startUtc: currYearTransitions[1].date,
        endUtc: currYearTransitions[2].date,
        transitionNamePt: isNorthern ? 'Solstício de Verão a Equinócio de Outono' : 'Solstício de Inverno a Equinócio de Primavera',
        transitionNameEn: isNorthern ? 'Summer Solstice to Autumn Equinox' : 'Winter Solstice to Spring Equinox',
        periodYearLabel: `${y}`
      },
      {
        seasonNorth: 'autumn' as SeasonType,
        seasonSouth: 'spring' as SeasonType,
        startUtc: currYearTransitions[2].date,
        endUtc: currYearTransitions[3].date,
        transitionNamePt: isNorthern ? 'Equinócio de Outono a Solstício de Inverno' : 'Equinócio de Primavera a Solstício de Verão',
        transitionNameEn: isNorthern ? 'Autumn Equinox to Winter Solstice' : 'Spring Equinox to Summer Solstice',
        periodYearLabel: `${y}`
      }
    ];

    for (let pIdx = 0; pIdx < periodsDef.length; pIdx++) {
      const def = periodsDef[pIdx];
      const seasonType = isNorthern ? def.seasonNorth : def.seasonSouth;
      const seasonOverrideList = config.customSeasonOverrides?.[seasonType] || [];
      const customOverride = seasonOverrideList.find(o => o.enabled !== false);
      const accent = getSeasonalAccent(seasonType, config.customSeasonOverrides);

      // Check whether DST was or will be active at start and end transitions
      const startDst = checkDSTAtEpoch(def.startUtc.getTime(), offsetMinutes, latitude, longitude, location);
      const endDst = checkDSTAtEpoch(def.endUtc.getTime(), offsetMinutes, latitude, longitude, location);

      const startEffectiveOffset = offsetMinutes + (startDst.isDst ? startDst.shiftMinutes : 0);
      const endEffectiveOffset = offsetMinutes + (endDst.isDst ? endDst.shiftMinutes : 0);

      // Convert to local civil time with offset taking DST into account
      let startLocalDate = new Date(def.startUtc.getTime() + startEffectiveOffset * 60000);
      let endLocalDate = new Date(def.endUtc.getTime() + endEffectiveOffset * 60000);

      // Apply custom date overrides if specified
      if (customOverride?.customStartDate) {
        const parsed = new Date(customOverride.customStartDate.includes('T') ? customOverride.customStartDate : `${customOverride.customStartDate}T00:00:00Z`);
        if (!isNaN(parsed.getTime())) {
          startLocalDate = new Date(Date.UTC(y, parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0));
        }
      } else if (customOverride?.customStartRule) {
        const ruleD = resolveSeasonalRule(customOverride.customStartRule, y);
        if (ruleD) startLocalDate = ruleD;
      }

      if (customOverride?.customEndDate) {
        const parsed = new Date(customOverride.customEndDate.includes('T') ? customOverride.customEndDate : `${customOverride.customEndDate}T00:00:00Z`);
        if (!isNaN(parsed.getTime())) {
          endLocalDate = new Date(Date.UTC(y, parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59));
        }
      } else if (customOverride?.customEndRule) {
        const ruleD = resolveSeasonalRule(customOverride.customEndRule, y);
        if (ruleD) endLocalDate = ruleD;
      }

      // Apply specific season offset days
      if (customOverride?.startOffsetDays) {
        startLocalDate = new Date(startLocalDate.getTime() + customOverride.startOffsetDays * 86400000);
      }
      if (customOverride?.endOffsetDays) {
        endLocalDate = new Date(endLocalDate.getTime() + customOverride.endOffsetDays * 86400000);
      }

      // Apply duration mode global offsets if advance/delay
      if (config.durationMode === 'advance' && config.durationDaysOffset) {
        startLocalDate = new Date(startLocalDate.getTime() - config.durationDaysOffset * 86400000);
        endLocalDate = new Date(endLocalDate.getTime() - config.durationDaysOffset * 86400000);
      } else if (config.durationMode === 'delay' && config.durationDaysOffset) {
        startLocalDate = new Date(startLocalDate.getTime() + config.durationDaysOffset * 86400000);
        endLocalDate = new Date(endLocalDate.getTime() + config.durationDaysOffset * 86400000);
      }

      const periodId = `season-${y}-${seasonType}-${pIdx}`;
      const startMs = startLocalDate.getTime();
      const endMs = endLocalDate.getTime();
      const durationMs = Math.max(1, endMs - startMs);
      const durationDays = parseFloat((durationMs / 86400000).toFixed(1));

      let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
      let progressPercent = 0;
      let isCurrent = false;

      if (currentMs > endMs) {
        status = 'completed';
        progressPercent = 100;
      } else if (currentMs >= startMs && currentMs <= endMs) {
        status = 'active';
        isCurrent = true;
        progressPercent = Math.min(100, Math.max(0, ((currentMs - startMs) / durationMs) * 100));
      } else {
        status = 'upcoming';
        progressPercent = 0;
      }

      const sDt = formatDateTime(startLocalDate);
      const eDt = formatDateTime(endLocalDate);

      const displayNamePt = customOverride?.namePt || customOverride?.name || accent.namePt;
      const displayNameEn = customOverride?.nameEn || customOverride?.name || accent.name;

      timelineItems.push({
        id: periodId,
        year: y,
        cycleLabel: def.periodYearLabel,
        season: seasonType,
        namePt: `${displayNamePt} (${def.periodYearLabel})`,
        nameEn: `${displayNameEn} (${def.periodYearLabel})`,
        icon: customOverride?.icon || accent.icon,
        color: customOverride?.color || accent.color,
        startDate: startLocalDate,
        endDate: endLocalDate,
        startDateFormatted: sDt.dateStr,
        endDateFormatted: eDt.dateStr,
        startTimeFormatted: sDt.timeStr,
        endTimeFormatted: eDt.timeStr,
        durationDays,
        status,
        progressPercent,
        isCurrent,
        transitionName: def.transitionNamePt,
        isStartDstActive: startDst.isDst,
        startDstShift: startDst.shiftMinutes,
        isEndDstActive: endDst.isDst,
        endDstShift: endDst.shiftMinutes
      });
    }
  }

  return timelineItems;
}

// -------------------------------------------------------------
// Seasonal Time Change Resolver and Schedule Generator
// -------------------------------------------------------------

const MONTHS_MAP: { [key: string]: number } = {
  janeiro: 0, january: 0, jan: 0,
  fevereiro: 1, february: 1, feb: 1,
  marco: 2, março: 2, march: 2, mar: 2,
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

const DAYS_MAP: { [key: string]: number } = {
  domingo: 0, sunday: 0, dom: 0, sun: 0,
  segunda: 1, 'segunda-feira': 1, monday: 1, seg: 1, mon: 1,
  terca: 2, 'terça': 2, 'terça-feira': 2, 'terca-feira': 2, tuesday: 2, ter: 2, tue: 2,
  quarta: 3, 'quarta-feira': 3, wednesday: 3, qua: 3, wed: 3,
  quinta: 4, 'quinta-feira': 4, thursday: 4, qui: 4, thu: 4,
  sexta: 5, 'sexta-feira': 5, friday: 5, sex: 5, fri: 5,
  sabado: 6, 'sábado': 6, saturday: 6, sab: 6, sat: 6
};

const OCCURRENCE_MAP: { [key: string]: string } = {
  primeiro: '1', '1º': '1', '1o': '1', first: '1', '1st': '1',
  segundo: '2', '2º': '2', '2o': '2', second: '2', '2nd': '2',
  terceiro: '3', '3º': '3', '3o': '3', third: '3', '3rd': '3',
  quarto: '4', '4º': '4', '4o': '4', fourth: '4', '4th': '4',
  penultimo: 'penult', 'penúltimo': 'penult',
  ultimo: 'last', 'último': 'last', last: 'last'
};

function cleanRuleStr(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Resolves a natural-language rule (e.g. "Último domingo de Março", "15 de Outubro")
 * to a concrete UTC date for a given year.
 */
export function resolveSeasonalRule(rule: string, year: number): Date | null {
  // Try movable feasts first
  const movable = getMovableFeast(rule, year);
  if (movable) return movable;

  const clean = cleanRuleStr(rule);
  if (!clean) return null;

  // 1. Matches "15/10" or "15-10" or "15-10-2024"
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const ruleYear = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : year;
    return new Date(Date.UTC(ruleYear, month, day, 0, 0));
  }

  // 2. Matches "dia 15 de outubro", "15 de outubro", "15 out", "15 de out"
  const numberMatch = clean.match(/(?:dia\s+)?(\d{1,2})\s*(?:de|do)?\s*([a-z]+)/);
  if (numberMatch) {
    const day = parseInt(numberMatch[1], 10);
    const monthStr = numberMatch[2];
    if (day >= 1 && day <= 31 && MONTHS_MAP[monthStr] !== undefined) {
      const month = MONTHS_MAP[monthStr];
      return new Date(Date.UTC(year, month, day, 0, 0));
    }
  }

  // 3. Matches relative days of week (ex: "último domingo de março", "terceiro domingo de outubro")
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
  for (const [key, val] of Object.entries(MONTHS_MAP)) {
    if (clean.includes(key)) {
      month = val;
      break;
    }
  }

  if (month !== null && dayOfWeek !== null && occurrence !== null) {
    if (occurrence === 'last') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      const maxDay = lastDay.getUTCDate();
      for (let d = maxDay; d >= 1; d--) {
        const checkDate = new Date(Date.UTC(year, month, d, 0, 0));
        if (checkDate.getUTCDay() === dayOfWeek) {
          return checkDate;
        }
      }
    } else if (occurrence === 'penult') {
      let count = 0;
      const lastDay = new Date(Date.UTC(year, month + 1, 0));
      const maxDay = lastDay.getUTCDate();
      for (let d = maxDay; d >= 1; d--) {
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
          if (count === occNum) {
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

export function parseRuleTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export interface TimeChangePeriodItem {
  id: string;
  seasonLabel: string;
  displayName: string;
  customName?: string;
  startYear: number;
  endYear: number;
  startDate: Date;
  endDate: Date;
  startDateFormatted: string;
  endDateFormatted: string;
  startTime: string;
  endTime: string;
  startEpoch: number;
  endEpoch: number;
  shiftMinutes: number;
  durationDays: number;
  status: 'completed' | 'active' | 'upcoming';
  progressPercent: number;
  isCurrent: boolean;
  startRuleText: string;
  endRuleText: string;
  isCustom?: boolean;
  notes?: string;
  interSeasonGapDays?: number;
  interSeasonStartDateFormatted?: string;
  interSeasonEndDateFormatted?: string;
  nextSeasonStartsFormatted?: string;
  nextSeasonStartsInDays?: number;
}

function customMatchSeasonLabel(
  cfg: SeasonalTimeChangeConfig,
  y: number,
  isRange: boolean,
  defaultLabel: string
): string {
  if (cfg.customSeasonLabel && cfg.customSeasonLabel.trim() !== '') {
    const rawLabel = cfg.customSeasonLabel.trim();
    // If it contains placeholders like {y} or {start}, replace them
    if (rawLabel.includes('{y}') || rawLabel.includes('{start}')) {
      return rawLabel
        .replace(/\{y\}/g, `${y}`)
        .replace(/\{start\}/g, `${y}`)
        .replace(/\{end\}/g, isRange ? `${y + 1}` : `${y}`);
    }
    // If total count is 1 or custom string supplied directly
    return rawLabel;
  }
  return defaultLabel;
}

/**
 * Generates the full list of Seasonal Time Change periods across the configured years
 * supporting XXX1 a XXX4 (single year format) or XXX1/XXX2 a XXX3/XXX4 (bi-annual range format),
 * with support for arbitrary season counts and custom added seasons.
 */
export function generateTimeChangeSchedule(
  timeChangeConfig: SeasonalTimeChangeConfig,
  currentMs: number = Date.now(),
  baseOffsetMinutes: number = 0
): TimeChangePeriodItem[] {
  if (!timeChangeConfig || !timeChangeConfig.startRule || !timeChangeConfig.endRule) {
    return [];
  }

  const isRangeFormat = timeChangeConfig.format === 'range';
  const currentYear = new Date(currentMs).getFullYear();
  const startY = timeChangeConfig.startYear || (currentYear - 1);
  const isPermanent = !!timeChangeConfig.isPermanent || (timeChangeConfig as any).endScopeType === 'permanent' || (timeChangeConfig as any).vigencyScope === 'permanent';

  let computedEnd = timeChangeConfig.endYear || (startY + 2);
  if (isPermanent) {
    computedEnd = Math.max(computedEnd, currentYear + 5);
  }
  const totalCount = timeChangeConfig.seasonCount 
    ? Math.max(1, timeChangeConfig.seasonCount) 
    : Math.max(1, computedEnd - startY + 1);
  const endY = isPermanent ? Math.max(startY + totalCount - 1, currentYear + 5) : (startY + totalCount - 1);

  const defaultPrefix = timeChangeConfig.seasonPrefix !== undefined ? timeChangeConfig.seasonPrefix : 'Entre Temporadas';
  const prefixTrimmed = defaultPrefix ? defaultPrefix.trim() : '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatD = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

  const items: TimeChangePeriodItem[] = [];

  for (let y = startY; y <= endY; y++) {
    const defaultLabel = isRangeFormat ? `${y}/${y + 1}` : `${y}`;
    const seasonLabel = customMatchSeasonLabel(timeChangeConfig, y, isRangeFormat, defaultLabel);
    
    // Check if there is an explicit custom override for this season label or year
    const customMatch = timeChangeConfig.customSeasons?.find(
      cs => cs.enabled !== false && (cs.seasonLabel === seasonLabel || cs.startYear === y)
    );

    const startRule = customMatch?.startRule || timeChangeConfig.startRule;
    const endRule = customMatch?.endRule || timeChangeConfig.endRule;
    const startTimeStr = customMatch?.startTime || timeChangeConfig.startTime || '00:00';
    const endTimeStr = customMatch?.endTime || timeChangeConfig.endTime || '00:00';
    const shiftMins = customMatch?.shiftMinutes ?? (timeChangeConfig.shiftMinutes || 60);

    // Resolve start date
    let rawStartDate: Date | null = null;
    if (customMatch?.customStartDate) {
      const p = new Date(customMatch.customStartDate + 'T00:00:00Z');
      if (!isNaN(p.getTime())) rawStartDate = p;
    }
    if (!rawStartDate) {
      rawStartDate = resolveSeasonalRule(startRule, y);
    }
    if (!rawStartDate) continue;

    // Resolve end date: if range format (or end month is earlier in calendar year than start month), evaluate for y+1
    let endYearCalc = y;
    const startClean = cleanRuleStr(startRule);
    const endClean = cleanRuleStr(endRule);
    
    let startM = 0;
    let endM = 0;
    for (const [k, v] of Object.entries(MONTHS_MAP)) {
      if (startClean.includes(k)) startM = v;
      if (endClean.includes(k)) endM = v;
    }

    if (isRangeFormat || endM < startM) {
      endYearCalc = y + 1;
    }

    let rawEndDate: Date | null = null;
    if (customMatch?.customEndDate) {
      const p = new Date(customMatch.customEndDate + 'T00:00:00Z');
      if (!isNaN(p.getTime())) rawEndDate = p;
    }
    if (!rawEndDate) {
      rawEndDate = resolveSeasonalRule(endRule, endYearCalc);
    }
    if (!rawEndDate) continue;

    const startOffsetMs = parseRuleTimeToMinutes(startTimeStr) * 60000;
    const endOffsetMs = parseRuleTimeToMinutes(endTimeStr) * 60000;

    const startEpoch = rawStartDate.getTime() + startOffsetMs;
    const endEpoch = rawEndDate.getTime() + endOffsetMs;

    const totalMs = Math.max(1, endEpoch - startEpoch);
    const durationDays = parseFloat((totalMs / 86400000).toFixed(1));

    let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
    let progressPercent = 0;
    let isCurrent = false;

    if (currentMs >= endEpoch) {
      status = 'completed';
      progressPercent = 100;
    } else if (currentMs >= startEpoch && currentMs < endEpoch) {
      status = 'active';
      isCurrent = true;
      progressPercent = Math.min(100, Math.max(0, ((currentMs - startEpoch) / totalMs) * 100));
    } else {
      status = 'upcoming';
      progressPercent = 0;
    }

    const calculatedDisplayName = customMatch?.customName || 
      (prefixTrimmed ? `${prefixTrimmed} ${seasonLabel}` : seasonLabel);

    items.push({
      id: customMatch ? `timechange-custom-${customMatch.id}` : `timechange-${y}-${seasonLabel}`,
      seasonLabel,
      displayName: calculatedDisplayName,
      customName: customMatch?.customName,
      startYear: y,
      endYear: endYearCalc,
      startDate: rawStartDate,
      endDate: rawEndDate,
      startDateFormatted: formatD(rawStartDate),
      endDateFormatted: formatD(rawEndDate),
      startTime: startTimeStr,
      endTime: endTimeStr,
      startEpoch,
      endEpoch,
      shiftMinutes: shiftMins,
      durationDays,
      status,
      progressPercent,
      isCurrent,
      startRuleText: customMatch?.customStartDate ? `${formatD(rawStartDate)} (${startTimeStr})` : startRule,
      endRuleText: customMatch?.customEndDate ? `${formatD(rawEndDate)} (${endTimeStr})` : endRule,
      isCustom: !!customMatch,
      notes: customMatch?.notes
    });
  }

  // Also include any standalone custom seasons outside the startY..endY range
  if (timeChangeConfig.customSeasons && timeChangeConfig.customSeasons.length > 0) {
    for (const cs of timeChangeConfig.customSeasons) {
      if (cs.enabled === false) continue;
      // Check if already included
      if (items.some(it => it.id === `timechange-custom-${cs.id}` || it.seasonLabel === cs.seasonLabel)) {
        continue;
      }
      
      let rawStartDate: Date | null = null;
      if (cs.customStartDate) {
        const p = new Date(cs.customStartDate + 'T00:00:00Z');
        if (!isNaN(p.getTime())) rawStartDate = p;
      } else if (cs.startRule) {
        rawStartDate = resolveSeasonalRule(cs.startRule, cs.startYear);
      }
      if (!rawStartDate) continue;

      let rawEndDate: Date | null = null;
      if (cs.customEndDate) {
        const p = new Date(cs.customEndDate + 'T00:00:00Z');
        if (!isNaN(p.getTime())) rawEndDate = p;
      } else if (cs.endRule) {
        rawEndDate = resolveSeasonalRule(cs.endRule, cs.endYear);
      }
      if (!rawEndDate) continue;

      const startTimeStr = cs.startTime || '00:00';
      const endTimeStr = cs.endTime || '00:00';
      const shiftMins = cs.shiftMinutes ?? 60;

      const startOffsetMs = parseRuleTimeToMinutes(startTimeStr) * 60000;
      const endOffsetMs = parseRuleTimeToMinutes(endTimeStr) * 60000;

      const startEpoch = rawStartDate.getTime() + startOffsetMs;
      const endEpoch = rawEndDate.getTime() + endOffsetMs;

      const totalMs = Math.max(1, endEpoch - startEpoch);
      const durationDays = parseFloat((totalMs / 86400000).toFixed(1));

      let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
      let progressPercent = 0;
      let isCurrent = false;

      if (currentMs >= endEpoch) {
        status = 'completed';
        progressPercent = 100;
      } else if (currentMs >= startEpoch && currentMs < endEpoch) {
        status = 'active';
        isCurrent = true;
        progressPercent = Math.min(100, Math.max(0, ((currentMs - startEpoch) / totalMs) * 100));
      } else {
        status = 'upcoming';
        progressPercent = 0;
      }

      const calculatedDisplayName = cs.customName || 
        (prefixTrimmed ? `${prefixTrimmed} ${cs.seasonLabel}` : cs.seasonLabel);

      items.push({
        id: `timechange-custom-${cs.id}`,
        seasonLabel: cs.seasonLabel,
        displayName: calculatedDisplayName,
        customName: cs.customName,
        startYear: cs.startYear,
        endYear: cs.endYear,
        startDate: rawStartDate,
        endDate: rawEndDate,
        startDateFormatted: formatD(rawStartDate),
        endDateFormatted: formatD(rawEndDate),
        startTime: startTimeStr,
        endTime: endTimeStr,
        startEpoch,
        endEpoch,
        shiftMinutes: shiftMins,
        durationDays,
        status,
        progressPercent,
        isCurrent,
        startRuleText: cs.customStartDate ? `${formatD(rawStartDate)} (${startTimeStr})` : (cs.startRule || ''),
        endRuleText: cs.customEndDate ? `${formatD(rawEndDate)} (${endTimeStr})` : (cs.endRule || ''),
        isCustom: true,
        notes: cs.notes
      });
    }
  }

  // Sort by startEpoch ascending
  items.sort((a, b) => a.startEpoch - b.startEpoch);

  // Compute inter-season period intervals and gap days between successive seasons
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const next = items[i + 1];
    if (next) {
      const gapMs = Math.max(0, next.startEpoch - current.endEpoch);
      current.interSeasonGapDays = parseFloat((gapMs / 86400000).toFixed(1));
      current.interSeasonStartDateFormatted = current.endDateFormatted;
      current.interSeasonEndDateFormatted = next.startDateFormatted;
      current.nextSeasonStartsFormatted = next.startDateFormatted;
      if (currentMs < next.startEpoch) {
        current.nextSeasonStartsInDays = Math.max(0, Math.ceil((next.startEpoch - currentMs) / 86400000));
      }
    }
  }

  return items;
}

export interface ManagedTimeShiftResult {
  active: boolean;
  shiftMinutes: number;
  activePeriod: TimeChangePeriodItem | null;
  activePeriods: TimeChangePeriodItem[];
  stackedCount: number;
  nextTransition: { name: string; date: Date; shiftChange: number } | null;
}

/**
 * Evaluates whether any configured Seasonal Time Change period is currently active.
 * Supports overlapping/stacking multiple active rules when allowOverlap !== false.
 */
export function resolveManagedTimeShift(
  config: SeasonManagerConfig,
  currentMs: number = Date.now(),
  baseOffsetMinutes: number = 0
): ManagedTimeShiftResult {
  if (!config.enabled || !config.timeChange || !config.timeChange.enabled) {
    return { active: false, shiftMinutes: 0, activePeriod: null, activePeriods: [], stackedCount: 0, nextTransition: null };
  }

  const schedule = generateTimeChangeSchedule(config.timeChange, currentMs, baseOffsetMinutes);
  const activePeriods = schedule.filter(s => s.isCurrent);

  const isOverlapAllowed = config.allowOverlap !== false && config.timeChange.allowOverlap !== false;

  if (activePeriods.length > 0) {
    if (isOverlapAllowed) {
      // Sum up shifts of ALL active overlapping seasonal rules
      const totalShiftMinutes = activePeriods.reduce((sum, p) => sum + p.shiftMinutes, 0);
      const primaryPeriod = activePeriods[0];
      
      // Nearest ending transition among active overlapping rules
      const nearestEndPeriod = [...activePeriods].sort((a, b) => a.endEpoch - b.endEpoch)[0];

      return {
        active: true,
        shiftMinutes: totalShiftMinutes,
        activePeriod: primaryPeriod,
        activePeriods,
        stackedCount: activePeriods.length,
        nextTransition: {
          name: activePeriods.length > 1 
            ? `Fim de Regra Sobreposta (${nearestEndPeriod.displayName})`
            : `Fim do ${config.timeChange.label || 'Horário Sazonal'}`,
          date: new Date(nearestEndPeriod.endEpoch),
          shiftChange: -nearestEndPeriod.shiftMinutes
        }
      };
    } else {
      // Single active rule mode
      const activePeriod = activePeriods[0];
      return {
        active: true,
        shiftMinutes: activePeriod.shiftMinutes,
        activePeriod,
        activePeriods: [activePeriod],
        stackedCount: 1,
        nextTransition: {
          name: `Fim do ${config.timeChange.label || 'Horário Sazonal'}`,
          date: new Date(activePeriod.endEpoch),
          shiftChange: -activePeriod.shiftMinutes
        }
      };
    }
  }

  // Find next upcoming transition
  const upcoming = schedule.find(s => s.status === 'upcoming');
  return {
    active: false,
    shiftMinutes: 0,
    activePeriod: null,
    activePeriods: [],
    stackedCount: 0,
    nextTransition: upcoming ? {
      name: `Início do ${config.timeChange.label || 'Horário Sazonal'}`,
      date: new Date(upcoming.startEpoch),
      shiftChange: upcoming.shiftMinutes
    } : null
  };
}

export interface ResolvedSeasonResult {
  season: SeasonType;
  isManual: boolean;
  isPermanent: boolean;
  durationMode: DurationMode;
  durationDaysOffset: number;
  cycleStatus: SeasonCycleStatus;
  nextTransition: { name: string; date: Date };
}

/**
 * Computes the effective active season and transition taking into account
 * the Season Manager configuration (Cycle, Manual/Auto, Advance/Delay/Permanent).
 */
export function resolveManagedSeason(
  rawAstronomicalSeason: string | null | undefined,
  rawNextTransition: { name: string; date: Date } | null | undefined,
  config: SeasonManagerConfig,
  nowMs: number,
  calculateAstronomicalSeasonFn?: (date: Date) => { season: string; nextTransition: { name: string; date: Date } } | null,
  enableSeasonalVariation: boolean = true
): ResolvedSeasonResult {
  const cycleStatus = getSeasonCycleStatus(config, nowMs);

  // If user disabled seasonal variations or if Season Manager is disabled, return pure natural astronomical season
  if (!enableSeasonalVariation || (config && config.enabled === false)) {
    const fallbackSeason: SeasonType = (rawAstronomicalSeason?.toLowerCase() as SeasonType) || 'summer';
    return {
      season: fallbackSeason,
      isManual: false,
      isPermanent: false,
      durationMode: 'natural',
      durationDaysOffset: 0,
      cycleStatus,
      nextTransition: rawNextTransition || {
        name: 'Equinócio / Solstício',
        date: new Date(nowMs + 90 * 24 * 3600 * 1000)
      }
    };
  }

  // If permanent lock is requested
  if (config.durationMode === 'permanent') {
    const activeSeason: SeasonType = config.seasonMode === 'manual'
      ? config.manualSeason
      : ((rawAstronomicalSeason?.toLowerCase() as SeasonType) || 'summer');

    return {
      season: activeSeason,
      isManual: config.seasonMode === 'manual',
      isPermanent: true,
      durationMode: 'permanent',
      durationDaysOffset: 0,
      cycleStatus,
      nextTransition: {
        name: 'Permanente (Sem Expiração)',
        date: new Date(nowMs + 365 * 24 * 3600 * 1000)
      }
    };
  }

  // If manual season is selected
  if (config.seasonMode === 'manual') {
    return {
      season: config.manualSeason,
      isManual: true,
      isPermanent: false,
      durationMode: config.durationMode,
      durationDaysOffset: config.durationDaysOffset,
      cycleStatus,
      nextTransition: rawNextTransition || {
        name: 'Manual Override',
        date: cycleStatus.endDate
      }
    };
  }

  // Auto season with advance or delay
  if (calculateAstronomicalSeasonFn && (config.durationMode === 'advance' || config.durationMode === 'delay')) {
    const shiftSign = config.durationMode === 'advance' ? 1 : -1;
    const shiftedMs = nowMs + shiftSign * (config.durationDaysOffset || 0) * 24 * 60 * 60 * 1000;
    const shiftedRes = calculateAstronomicalSeasonFn(new Date(shiftedMs));

    if (shiftedRes) {
      // Adjust transition date
      const adjustedTransitionDate = new Date(
        shiftedRes.nextTransition.date.getTime() - shiftSign * (config.durationDaysOffset || 0) * 24 * 60 * 60 * 1000
      );

      return {
        season: (shiftedRes.season.toLowerCase() as SeasonType) || 'summer',
        isManual: false,
        isPermanent: false,
        durationMode: config.durationMode,
        durationDaysOffset: config.durationDaysOffset,
        cycleStatus,
        nextTransition: {
          name: shiftedRes.nextTransition.name,
          date: adjustedTransitionDate
        }
      };
    }
  }

  // Default natural astronomical calculation
  const fallbackSeason: SeasonType = (rawAstronomicalSeason?.toLowerCase() as SeasonType) || 'summer';
  return {
    season: fallbackSeason,
    isManual: false,
    isPermanent: false,
    durationMode: 'natural',
    durationDaysOffset: 0,
    cycleStatus,
    nextTransition: rawNextTransition || {
      name: 'Equinócio / Solstício',
      date: new Date(nowMs + 90 * 24 * 3600 * 1000)
    }
  };
}

/**
 * Detailed Astronomical Ephemeris Summary for Equinoxes & Solstices in UTC (1900 to 2100+).
 */
export interface AstronomicalSeasonSummary {
  year: number;
  marchEquinoxUtc: Date;
  juneSolsticeUtc: Date;
  septemberEquinoxUtc: Date;
  decemberSolsticeUtc: Date;
  springNorthDays: number; // March Equinox -> June Solstice (Spring in North / Autumn in South)
  summerNorthDays: number; // June Solstice -> September Equinox (Summer in North / Winter in South)
  autumnNorthDays: number; // September Equinox -> December Solstice (Autumn in North / Spring in South)
  winterNorthDays: number; // December Solstice -> next March Equinox (Winter in North / Summer in South)
  tropicalYearDays: number; // Exact duration of tropical astronomical cycle
}

/**
 * Computes exact high-precision astronomical transitions in UTC and season durations for any given year.
 */
export function getAstronomicalSeasonSummary(year: number, customAxialTilt?: number): AstronomicalSeasonSummary {
  const curr = calculateAstronomicalTransitions(year, customAxialTilt);
  const next = calculateAstronomicalTransitions(year + 1, customAxialTilt);

  const march = curr[0].date;
  const june = curr[1].date;
  const sept = curr[2].date;
  const dec = curr[3].date;
  const nextMarch = next[0].date;

  const springNorthDays = (june.getTime() - march.getTime()) / 86400000;
  const summerNorthDays = (sept.getTime() - june.getTime()) / 86400000;
  const autumnNorthDays = (dec.getTime() - sept.getTime()) / 86400000;
  const winterNorthDays = (nextMarch.getTime() - dec.getTime()) / 86400000;
  const tropicalYearDays = springNorthDays + summerNorthDays + autumnNorthDays + winterNorthDays;

  return {
    year,
    marchEquinoxUtc: march,
    juneSolsticeUtc: june,
    septemberEquinoxUtc: sept,
    decemberSolsticeUtc: dec,
    springNorthDays: parseFloat(springNorthDays.toFixed(4)),
    summerNorthDays: parseFloat(summerNorthDays.toFixed(4)),
    autumnNorthDays: parseFloat(autumnNorthDays.toFixed(4)),
    winterNorthDays: parseFloat(winterNorthDays.toFixed(4)),
    tropicalYearDays: parseFloat(tropicalYearDays.toFixed(4))
  };
}
