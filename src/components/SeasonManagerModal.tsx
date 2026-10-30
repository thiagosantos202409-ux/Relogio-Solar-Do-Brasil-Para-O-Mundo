import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Calendar, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Check, 
  SlidersHorizontal, 
  Lock, 
  FastForward, 
  Rewind, 
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Timer,
  CalendarDays,
  Sun,
  Hourglass,
  ArrowRightLeft,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  Clock4,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Infinity as InfinityIcon,
  PlusCircle,
  CalendarPlus,
  Hash,
  Volume2,
  VolumeX,
  Volume1,
  Bell,
  BellOff,
  Play,
  Music,
  Radio,
  Palette,
  Paintbrush,
  Smile,
  Type,
  Copy,
  Globe,
  Compass,
  Search,
  ExternalLink
} from "lucide-react";
import { 
  SeasonManagerConfig, 
  SeasonType, 
  CycleFormat, 
  DurationMode,
  SEASONAL_ACCENTS, 
  getSeasonCycleStatus,
  getSeasonalAccent,
  generateSeasonTimeline,
  generateTimeChangeSchedule,
  resolveManagedTimeShift,
  DEFAULT_SEASONAL_TIME_CHANGE_CONFIG,
  CustomTimeChangeSeason,
  SeasonalSoundType,
  playSeasonalSoundAlert,
  CustomSeasonOverride,
  hexToRgbaGlow,
  getAstronomicalSeasonSummary,
  AstronomicalSeasonSummary
} from "../lib/seasonalTheme";
import { 
  calculateAstronomicalTransitions, 
  checkDSTAtEpoch, 
  calculateSeasonalForecastWithDST, 
  getDstForecast 
} from "../lib/solarTime";
import { processSeasonalRuleWithException, calculateCarnavalSunday, calculateFutureSeasonalTransitions } from "../App";

interface SeasonManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SeasonManagerConfig;
  onChangeConfig: (newConfig: SeasonManagerConfig) => void;
  currentAstronomicalSeason?: string | null;
  effectiveSeason?: string | null;
  latitude?: number;
  longitude?: number;
  offsetMinutes?: number;
  baseOffset?: number;
  location?: any;
  nowMs: number;
  language?: string;
  enableSeasonalVariation?: boolean;
  onToggleSeasonalVariation?: (enabled: boolean) => void;
  customAxialTilt?: number;
}

export const SeasonManagerModal: React.FC<SeasonManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  currentAstronomicalSeason = 'summer',
  effectiveSeason = 'summer',
  latitude = -23.55,
  longitude = -46.63,
  offsetMinutes = 0,
  baseOffset,
  location = null,
  nowMs,
  language = 'pt',
  enableSeasonalVariation = true,
  onToggleSeasonalVariation,
  customAxialTilt
}) => {
  const isPt = language === 'pt';
  const [localConfig, setLocalConfig] = useState<SeasonManagerConfig>(config);
  const [activeTab, setActiveTab] = useState<'cycle' | 'customization' | 'timeline' | 'almanac' | 'timechange' | 'duration' | 'sounds'>('cycle');
  const [selectedSeasonToEdit, setSelectedSeasonToEdit] = useState<SeasonType>('summer');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [seasonTypeFilter, setSeasonTypeFilter] = useState<string>('all');
  const [timeChangeFilter, setTimeChangeFilter] = useState<'all' | 'active' | 'upcoming' | 'completed' | 'custom'>('all');
  const [showCustomSeasonCreator, setShowCustomSeasonCreator] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [replicatedSeasonId, setReplicatedSeasonId] = useState<string | null>(null);
  const [almanacYear, setAlmanacYear] = useState<number>(new Date(nowMs).getFullYear());
  const [almanacSearch, setAlmanacSearch] = useState<string>('');

  const currentYear = new Date(nowMs).getFullYear();
  const [copiedVariationFeedback, setCopiedVariationFeedback] = useState(false);

  const handleCopySeasonalVariation = () => {
    const tc = localConfig.timeChange;
    const summary = [
      `=== VARIAÇÃO SAZONAL PROGRAMADA (LOCAL) ===`,
      `Formato: ${localConfig.cycleFormat === 'range' ? 'Bi-Anual (XXX1/XXX2)' : 'Ano Civil (XXX1)'}`,
      `Desvio: ${tc?.shiftMinutes ? (tc.shiftMinutes > 0 ? `+${tc.shiftMinutes}m` : `${tc.shiftMinutes}m`) : '+60m'}`,
      `Início: ${tc?.startRule || tc?.startDate || 'Último domingo de Setembro'} às ${tc?.startTime || '00:00'}`,
      `Término: ${tc?.endRule || tc?.endDate || 'Último domingo de Março'} às ${tc?.endTime || '00:00'}`,
      `Vigência: ${tc?.startYear || localConfig.targetYear} a ${tc?.endYear || localConfig.endYear} (${tc?.seasonCount || 1} temporadas)`,
      tc?.customSeasonLabel ? `Rótulo: ${tc.customSeasonLabel}` : '',
      `Nota: Regra local vinculada ao fuso horário e localização do usuário.`,
      `==========================================`
    ].filter(Boolean).join('\n');

    const payload = JSON.stringify({
      type: 'solaris_seasonal_variation',
      cycleFormat: localConfig.cycleFormat,
      timeChange: localConfig.timeChange,
      customSeasonOverrides: localConfig.customSeasonOverrides
    }, null, 2);

    try {
      localStorage.setItem('solaris_copied_seasonal_variation', payload);
      navigator.clipboard.writeText(`${summary}\n\n[DADOS_TECNICOS_JSON]\n${payload}`);
      setCopiedVariationFeedback(true);
      setTimeout(() => setCopiedVariationFeedback(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePasteSeasonalVariation = async () => {
    try {
      let raw = localStorage.getItem('solaris_copied_seasonal_variation') || '';
      if (!raw && navigator.clipboard) {
        raw = await navigator.clipboard.readText();
      }
      if (raw) {
        let jsonStr = raw;
        if (raw.includes('[DADOS_TECNICOS_JSON]')) {
          jsonStr = raw.split('[DADOS_TECNICOS_JSON]')[1].trim();
        }
        const parsed = JSON.parse(jsonStr);
        if (parsed && (parsed.timeChange || parsed.type === 'solaris_seasonal_variation')) {
          setLocalConfig(prev => ({
            ...prev,
            ...(parsed.cycleFormat ? { cycleFormat: parsed.cycleFormat } : {}),
            timeChange: {
              ...prev.timeChange,
              ...parsed.timeChange,
              enabled: true
            },
            ...(parsed.customSeasonOverrides ? { customSeasonOverrides: parsed.customSeasonOverrides } : {})
          }));
          setCopiedVariationFeedback(true);
          setTimeout(() => setCopiedVariationFeedback(false), 2500);
        }
      }
    } catch (e) {
      console.warn("Failed to paste seasonal variation", e);
    }
  };

  const handleUpdateSeasonOverride = (season: SeasonType, patch: Partial<CustomSeasonOverride>) => {
    setLocalConfig(prev => {
      const existingArray = prev.customSeasonOverrides?.[season] || [];
      const updatedArray = existingArray.length > 0 
        ? [{ ...existingArray[0], ...patch, enabled: true }, ...existingArray.slice(1)]
        : [{ ...patch, enabled: true }];
      return {
        ...prev,
        customSeasonOverrides: {
          ...(prev.customSeasonOverrides || {}),
          [season]: updatedArray
        }
      };
    });
  };

  const handleResetSeasonOverride = (season: SeasonType) => {
    setLocalConfig(prev => {
      if (!prev.customSeasonOverrides) return prev;
      const copy = { ...prev.customSeasonOverrides };
      delete copy[season];
      return {
        ...prev,
        customSeasonOverrides: copy
      };
    });
  };

  const handleResetAllSeasonOverrides = () => {
    setLocalConfig(prev => ({
      ...prev,
      customSeasonOverrides: {}
    }));
  };

  const customizedSeasonCount = useMemo(() => {
    return Object.keys(localConfig.customSeasonOverrides || {}).length;
  }, [localConfig.customSeasonOverrides]);

  const handleTestSound = (soundType: SeasonalSoundType) => {
    setPreviewingSound(soundType);
    playSeasonalSoundAlert(soundType, localConfig.soundVolume ?? 0.65, (effectiveSeason as SeasonType) || 'summer');
    setTimeout(() => {
      setPreviewingSound(null);
    }, 900);
  };

  // Custom season draft form state
  const [customDraft, setCustomDraft] = useState<{
    startYear: number;
    endYear: number;
    seasonLabel: string;
    customName: string;
    customStartDate: string;
    customEndDate: string;
    startRule: string;
    endRule: string;
    startTime: string;
    endTime: string;
    shiftMinutes: number;
    notes: string;
    useSpecificDates: boolean;
  }>({
    startYear: currentYear + 1,
    endYear: currentYear + 2,
    seasonLabel: '',
    customName: '',
    customStartDate: '',
    customEndDate: '',
    startRule: 'Último domingo de Setembro',
    endRule: 'Último domingo de Março',
    startTime: '00:00',
    endTime: '00:00',
    shiftMinutes: 60,
    notes: '',
    useSpecificDates: false
  });

  // Sync when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig({
        ...config,
        timeChange: config.timeChange || DEFAULT_SEASONAL_TIME_CHANGE_CONFIG
      });
    }
  }, [isOpen, config]);

  const cycleStatus = useMemo(() => {
    return getSeasonCycleStatus(localConfig, nowMs);
  }, [localConfig, nowMs]);

  const effectiveBaseOffset = (baseOffset !== undefined && !isNaN(baseOffset)) ? baseOffset : offsetMinutes;

  const timelineItems = useMemo(() => {
    return generateSeasonTimeline(localConfig, latitude, effectiveBaseOffset, nowMs, longitude, location);
  }, [localConfig, latitude, effectiveBaseOffset, nowMs, longitude, location]);

  const seasonalForecast = useMemo(() => {
    return calculateSeasonalForecastWithDST(
      new Date(nowMs), 
      latitude, 
      effectiveBaseOffset, 
      longitude, 
      location,
      customAxialTilt,
      localConfig,
      enableSeasonalVariation
    );
  }, [nowMs, latitude, effectiveBaseOffset, longitude, location, customAxialTilt, localConfig, enableSeasonalVariation]);

  const localDstForecast = useMemo(() => {
    return getDstForecast(
      new Date(nowMs), 
      effectiveBaseOffset, 
      latitude, 
      longitude, 
      location,
      localConfig,
      enableSeasonalVariation
    );
  }, [nowMs, effectiveBaseOffset, latitude, longitude, location, localConfig, enableSeasonalVariation]);

  const filteredTimeline = useMemo(() => {
    return timelineItems.filter(item => {
      if (timelineFilter !== 'all' && item.status !== timelineFilter) return false;
      if (seasonTypeFilter !== 'all' && item.season !== seasonTypeFilter) return false;
      return true;
    });
  }, [timelineItems, timelineFilter, seasonTypeFilter]);

  const timeChangeSchedule = useMemo(() => {
    return generateTimeChangeSchedule(localConfig.timeChange, nowMs, offsetMinutes);
  }, [localConfig.timeChange, nowMs, offsetMinutes]);

  const filteredTimeChangeSchedule = useMemo(() => {
    return timeChangeSchedule.filter(item => {
      if (timeChangeFilter === 'all') return true;
      if (timeChangeFilter === 'custom') return item.isCustom;
      return item.status === timeChangeFilter;
    });
  }, [timeChangeSchedule, timeChangeFilter]);

  const activeTimeShift = useMemo(() => {
    return resolveManagedTimeShift(localConfig, nowMs, offsetMinutes);
  }, [localConfig, nowMs, offsetMinutes]);

  // Hook to automatically calculate next transition date and compare with astronomical Carnival Sunday
  const carnavalComparison = useMemo(() => {
    const now = new Date(nowMs);
    const year = now.getUTCFullYear();
    
    const carnavalThisYear = calculateCarnavalSunday(year);
    const carnavalNextYear = calculateCarnavalSunday(year + 1);
    
    const futureTransitions = calculateFutureSeasonalTransitions(year, 2, { baseOffsetMinutes: effectiveBaseOffset });
    const nextTransition = futureTransitions.find(t => t.effectiveDate.getTime() >= nowMs) || futureTransitions[0];

    const evaluationYear = nextTransition ? nextTransition.year : year;
    const ruleStr = localConfig.timeChange?.startRule || "(Data Prevista) (Exceto Domingo De Carnaval +7)";
    const excResult = processSeasonalRuleWithException(ruleStr, evaluationYear);

    const isCarnavalPlus7Active = excResult.ruleIdentified && excResult.isCoincident;

    let messagePt = '';
    let messageEn = '';

    if (isCarnavalPlus7Active) {
      messagePt = `⚠️ AVISO DE EXCEÇÃO (Domingo de Carnaval +7): No ano de ${evaluationYear}, a data prevista coincide com o Domingo de Carnaval (${excResult.carnavalDate?.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}). A transição foi adiada automaticamente em +7 dias para ${excResult.postponedDate?.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`;
      messageEn = `⚠️ EXCEPTION NOTICE (Carnaval Sunday +7): In ${evaluationYear}, the scheduled date coincides with Carnival Sunday (${excResult.carnavalDate?.toLocaleDateString('en-US', { timeZone: 'UTC' })}). The transition was automatically postponed by +7 days to ${excResult.postponedDate?.toLocaleDateString('en-US', { timeZone: 'UTC' })}.`;
    } else {
      messagePt = `✓ Regra 'Exceto Domingo De Carnaval +7' avaliada para ${evaluationYear}: Sem coincidência astronômica com o Domingo de Carnaval. Data padrão aplicada (${excResult.effectiveDate?.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}).`;
      messageEn = `✓ 'Except Carnival Sunday +7' rule evaluated for ${evaluationYear}: No astronomical coincidence with Carnival Sunday. Standard date applied (${excResult.effectiveDate?.toLocaleDateString('en-US', { timeZone: 'UTC' })}).`;
    }

    return {
      nextTransition,
      carnavalThisYear,
      carnavalNextYear,
      excResult,
      isCarnavalPlus7Active,
      messagePt,
      messageEn
    };
  }, [localConfig, nowMs, effectiveBaseOffset]);

  const configuredSeasonCount = useMemo(() => {
    const startY = localConfig.timeChange?.startYear || (currentYear - 1);
    if (localConfig.timeChange?.seasonCount) return localConfig.timeChange.seasonCount;
    const endY = localConfig.timeChange?.endYear || (startY + 2);
    return Math.max(1, endY - startY + 1);
  }, [localConfig.timeChange, currentYear]);

  const handleSetSeasonCount = (count: number) => {
    const validCount = Math.max(1, Math.min(500, count));
    const startY = localConfig.timeChange?.startYear || (currentYear - 1);
    setLocalConfig(prev => ({
      ...prev,
      timeChange: {
        ...prev.timeChange,
        seasonCount: validCount,
        endYear: startY + validCount - 1
      }
    }));
  };

  const handleAddSeasonCount = (delta: number) => {
    handleSetSeasonCount(configuredSeasonCount + delta);
  };

  const handleOpenCustomCreator = (existingSeason?: Partial<CustomTimeChangeSeason>) => {
    const isRange = localConfig.timeChange?.format === 'range';
    const nextStartYear = existingSeason?.startYear || (localConfig.timeChange?.endYear || currentYear) + 1;
    const nextEndYear = existingSeason?.endYear || (isRange ? nextStartYear + 1 : nextStartYear);

    setCustomDraft({
      startYear: nextStartYear,
      endYear: nextEndYear,
      seasonLabel: existingSeason?.seasonLabel || (isRange ? `${nextStartYear}/${nextEndYear}` : `${nextStartYear}`),
      customName: existingSeason?.customName || '',
      customStartDate: existingSeason?.customStartDate || '',
      customEndDate: existingSeason?.customEndDate || '',
      startRule: existingSeason?.startRule || localConfig.timeChange?.startRule || 'Último domingo de Setembro',
      endRule: existingSeason?.endRule || localConfig.timeChange?.endRule || 'Último domingo de Março',
      startTime: existingSeason?.startTime || localConfig.timeChange?.startTime || '00:00',
      endTime: existingSeason?.endTime || localConfig.timeChange?.endTime || '00:00',
      shiftMinutes: existingSeason?.shiftMinutes ?? (localConfig.timeChange?.shiftMinutes || 60),
      notes: existingSeason?.notes || '',
      useSpecificDates: !!(existingSeason?.customStartDate || existingSeason?.customEndDate)
    });
    setEditingSeasonId(existingSeason?.id || null);
    setShowCustomSeasonCreator(true);
  };

  const handleSaveCustomSeason = () => {
    const isRange = localConfig.timeChange?.format === 'range';
    const label = customDraft.seasonLabel || (isRange ? `${customDraft.startYear}/${customDraft.endYear}` : `${customDraft.startYear}`);
    const newCustomSeason: CustomTimeChangeSeason = {
      id: editingSeasonId || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      seasonLabel: label,
      customName: customDraft.customName?.trim() || undefined,
      startYear: customDraft.startYear,
      endYear: customDraft.endYear,
      customStartDate: customDraft.useSpecificDates && customDraft.customStartDate ? customDraft.customStartDate : undefined,
      customEndDate: customDraft.useSpecificDates && customDraft.customEndDate ? customDraft.customEndDate : undefined,
      startRule: !customDraft.useSpecificDates ? customDraft.startRule : undefined,
      endRule: !customDraft.useSpecificDates ? customDraft.endRule : undefined,
      startTime: customDraft.startTime || '00:00',
      endTime: customDraft.endTime || '00:00',
      shiftMinutes: customDraft.shiftMinutes || 60,
      notes: customDraft.notes,
      enabled: true
    };

    setLocalConfig(prev => {
      const existing = prev.timeChange?.customSeasons || [];
      const updated = editingSeasonId 
        ? existing.map(cs => (cs.id === editingSeasonId || `timechange-custom-${cs.id}` === editingSeasonId) ? newCustomSeason : cs)
        : [...existing, newCustomSeason];
      return {
        ...prev,
        timeChange: {
          ...prev.timeChange,
          customSeasons: updated
        }
      };
    });

    setShowCustomSeasonCreator(false);
    setEditingSeasonId(null);
  };

  const handleDeleteCustomSeason = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      timeChange: {
        ...prev.timeChange,
        customSeasons: (prev.timeChange?.customSeasons || []).filter(cs => cs.id !== id && `timechange-custom-${cs.id}` !== id)
      }
    }));
  };

  const handleReplicateSeasonVigency = (item: any) => {
    setLocalConfig(prev => {
      const updatedCustoms = (prev.timeChange?.customSeasons || []).map(cs => ({
        ...cs,
        startRule: item.startRuleText,
        endRule: item.endRuleText,
        startTime: item.startTime,
        endTime: item.endTime,
        shiftMinutes: item.shiftMinutes,
        customStartDate: undefined,
        customEndDate: undefined
      }));
      return {
        ...prev,
        timeChange: {
          ...prev.timeChange,
          startRule: item.startRuleText,
          endRule: item.endRuleText,
          startTime: item.startTime,
          endTime: item.endTime,
          shiftMinutes: item.shiftMinutes,
          customSeasons: updatedCustoms
        }
      };
    });
    setReplicatedSeasonId(item.id);
    setTimeout(() => setReplicatedSeasonId(null), 2500);
  };

  const handleResetSeasonToDefaultVigency = (itemId: string, seasonLabel: string) => {
    setLocalConfig(prev => ({
      ...prev,
      timeChange: {
        ...prev.timeChange,
        customSeasons: (prev.timeChange?.customSeasons || []).filter(
          cs => cs.id !== itemId && `timechange-custom-${cs.id}` !== itemId && cs.seasonLabel !== seasonLabel
        )
      }
    }));
  };

  if (!isOpen) return null;

  const seasons: SeasonType[] = ['summer', 'autumn', 'winter', 'spring'];
  const activeAccent = getSeasonalAccent(
    localConfig.seasonMode === 'manual' 
      ? localConfig.manualSeason 
      : (effectiveSeason || currentAstronomicalSeason)
  );

  const handleSave = () => {
    onChangeConfig(localConfig);
    onClose();
  };

  const handleReset = () => {
    const resetCfg: SeasonManagerConfig = {
      enabled: true,
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
      timeChange: {
        enabled: true,
        format: 'range',
        startYear: currentYear - 1,
        endYear: currentYear + 2,
        startRule: 'Último domingo de Setembro',
        endRule: 'Último domingo de Março',
        startTime: '00:00',
        endTime: '00:00',
        shiftMinutes: 60,
        label: 'Horário Sazonal (DST)'
      }
    };
    setLocalConfig(resetCfg);
    onChangeConfig(resetCfg);
  };

  // Rule suggestions
  const startRulePresets = [
    'Último domingo de Setembro',
    'Último domingo de Março',
    'Primeiro domingo de Outubro',
    'Terceiro domingo de Outubro',
    'Primeiro domingo de Novembro',
    '15 de Outubro',
    '01 de Outubro'
  ];

  const endRulePresets = [
    'Último domingo de Março',
    'Último domingo de Setembro',
    'Terceiro domingo de Fevereiro',
    'Primeiro domingo de Abril',
    'Primeiro domingo de Novembro',
    '15 de Março',
    '15 de Fevereiro'
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="glass max-w-3xl w-full p-5 sm:p-6 rounded-3xl relative border border-white/15 text-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-2xl border shadow-lg transition-all"
                style={{
                  backgroundColor: `${activeAccent.color}20`,
                  borderColor: `${activeAccent.color}50`,
                  color: activeAccent.color
                }}
              >
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                    {isPt ? 'Gerenciador de Temporadas' : 'Season Manager'}
                  </h2>
                  <span 
                    className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${activeAccent.badgeBg} ${activeAccent.badgeBorder}`}
                  >
                    <span>{activeAccent.icon}</span>
                    <span>{isPt ? activeAccent.namePt : activeAccent.name}</span>
                  </span>
                </div>
                <p className="text-[9.5px] text-white/40 uppercase tracking-wider font-mono">
                  {isPt ? 'Ciclos • Mudanças Sazonais • Horário de Verão • Duração' : 'Cycles • Seasonal Shifts • Daylight Saving • Duration'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Programmed Seasonal Variation Active/Inactive Toggle */}
              <div className="hidden sm:flex items-center gap-2 bg-black/40 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[7px] uppercase font-mono text-white/50">
                    {isPt ? 'Variação Sazonal:' : 'Seasonal Variation:'}
                  </span>
                  <span className={`text-[8.5px] font-bold font-mono mt-0.5 ${enableSeasonalVariation ? 'text-amber-300' : 'text-white/40'}`}>
                    {enableSeasonalVariation 
                      ? (isPt ? 'ATIVA (Afeta Estações)' : 'ACTIVE (Affects Seasons)') 
                      : (isPt ? 'INATIVA (Padrão Fixo)' : 'INACTIVE (Fixed)')}
                  </span>
                </div>
                {onToggleSeasonalVariation && (
                  <button
                    type="button"
                    onClick={() => onToggleSeasonalVariation(!enableSeasonalVariation)}
                    className={`px-2 py-0.5 rounded-lg text-[8px] font-mono font-bold transition-all cursor-pointer ${
                      enableSeasonalVariation
                        ? 'bg-amber-400 text-black shadow-sm shadow-amber-400/30 hover:bg-amber-300'
                        : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                    }`}
                    title={isPt ? 'Clique para alternar se a programação afeta as estações do ano' : 'Click to toggle if programming affects seasons'}
                  >
                    {enableSeasonalVariation ? (isPt ? 'LIGADA' : 'ON') : (isPt ? 'DESLIGADA' : 'OFF')}
                  </button>
                )}
              </div>

              <button 
                onClick={onClose}
                className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all cursor-pointer"
                title={isPt ? 'Fechar' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-3 pb-2 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('cycle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cycle'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isPt ? '1. Vigência de Temporadas' : '1. Season Validity'}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/20 font-normal">
                {cycleStatus.cycleLabel}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customization')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'customization'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{isPt ? '2. Personalizar Temporadas' : '2. Customize Seasons'}</span>
              {customizedSeasonCount > 0 && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {customizedSeasonCount} {isPt ? 'editada(s)' : 'custom'}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{isPt ? '3. Mudança Sazonal (Solstícios/Equinócios)' : '3. Astronomical Shifts'}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/20 font-bold">
                {timelineItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('almanac')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'almanac'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isPt ? '4. Almanaque UTC (1900–2100)' : '4. UTC Almanac (1900–2100)'}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                1900–2100
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timechange')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'timechange'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Clock4 className="w-3.5 h-3.5" />
              <span>{isPt ? '5. Mudança de Horário Sazonal' : '5. Seasonal Time Change'}</span>
              {localConfig.timeChange?.enabled && (
                <span className={`w-2 h-2 rounded-full ${activeTimeShift.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'duration'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isPt ? '6. Modificador de Duração' : '6. Duration Shift'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sounds')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'sounds'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {localConfig.soundAlertsEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
              )}
              <span>{isPt ? '7. Alertas Sonoros' : '7. Sound Alerts'}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                localConfig.soundAlertsEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-black/20 text-white/40'
              }`}>
                {localConfig.soundAlertsEnabled ? (isPt ? 'ATIVO' : 'ON') : (isPt ? 'DESL' : 'OFF')}
              </span>
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="overflow-y-auto space-y-4 py-3 pr-1 -mr-1 flex-1">
            
            {/* TAB 1: CICLOS DE VIGÊNCIA (XXXX ou XXXX/XXXX, com intervalo XXX1 a XXX9) */}
            {activeTab === 'cycle' && (
              <div className="space-y-4">
                {/* 1.0 Previsão do Início das Estações & Horário de Verão (DST) */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 via-white/5 to-white/[0.02] rounded-2xl border border-amber-400/30 shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Previsão do Início das Estações & Horário de Verão' : 'Start of Seasons & Daylight Saving Forecast'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                        {localDstForecast.statusLabelPt}
                      </span>
                    </div>
                  </div>

                  {Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0) ? (
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      {isPt 
                        ? 'Latitude 0° (Linha do Equador): Esta região não possui variações astronômicas de estações do ano e não adota Horário de Verão.'
                        : 'Latitude 0° (Equator): This region has no astronomical seasons variation and does not observe Daylight Saving Time.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {seasonalForecast.map((item) => (
                        <div
                          key={`cycle-forecast-${item.transitionKey}-${item.utcDate.getTime()}`}
                          className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between space-y-2 hover:border-amber-400/40 transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: item.seasonColor }}>
                                <span className="text-sm">{item.seasonIcon}</span>
                                <span>{isPt ? item.seasonNamePt : item.seasonNameEn}</span>
                              </span>
                              <span className="text-[8px] font-mono text-white/40">
                                {item.daysRemaining === 0 ? (isPt ? 'Hoje' : 'Today') : (isPt ? `em ${item.daysRemaining}d` : `in ${item.daysRemaining}d`)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[8.5px] font-mono text-white/50 block truncate">
                                {isPt ? item.transitionNamePt : item.transitionNameEn}
                              </span>
                              {item.isVariationAdjusted && (
                                <span className="text-[7px] font-mono px-1 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded shrink-0">
                                  {isPt ? item.variationAdjustmentLabelPt : item.variationAdjustmentLabelEn}
                                </span>
                              )}
                              {item.exceptionLabelPt && (
                                <span className="text-[7px] font-mono px-1 py-0.2 bg-red-400/20 text-red-300 border border-red-400/30 rounded shrink-0">
                                  {isPt ? item.exceptionLabelPt : item.exceptionLabelEn}
                                </span>
                              )}
                              {item.isUserProgrammed && (
                                <span 
                                  className="text-[7px] font-mono px-1 py-0.2 bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 rounded shrink-0"
                                  title={isPt ? "Definido pela programação do usuário (Independente do País)" : "Defined by user programming (Country-Independent)"}
                                >
                                  {isPt ? 'Programado' : 'User Rule'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5 space-y-1">
                            <span className="text-[7px] text-white/40 uppercase font-mono block font-bold">
                              {isPt ? 'Início Civil Previsto:' : 'Predicted Civil Start:'}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-white tabular-nums block" title={item.formattedLocalWithException || item.formattedLocal}>
                              {item.formattedLocal}
                              {item.variationAdjustmentLabelPt && (
                                <span className="text-amber-300 font-bold ml-1.5 inline-block text-[10px]">
                                  {isPt ? item.variationAdjustmentLabelPt : item.variationAdjustmentLabelEn}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1 text-[8px] font-mono">
                              {item.isDstActive ? (
                                <span className="text-amber-400 font-bold flex items-center gap-0.5" title={item.seasonalRuleDescription}>
                                  <Sun size={9} />
                                  <span>{isPt ? `Variação Sazonal (+${item.dstShiftMinutes}m)` : `Seasonal Shift (+${item.dstShiftMinutes}m)`}</span>
                                </span>
                              ) : (
                                <span className="text-white/40 flex items-center gap-0.5" title={item.seasonalRuleDescription}>
                                  <Clock size={9} />
                                  <span>{isPt ? 'Horário Padrão' : 'Standard Time'}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[7.5px] text-white/30 font-mono block truncate" title={item.seasonalRuleDescription}>
                              {item.seasonalRuleDescription}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[8.5px] text-white/40 font-mono gap-1">
                    <span>
                      {location?.name ? `${location.name} · ` : ''}{localDstForecast.ruleDescription}
                    </span>
                    <span>
                      {isPt ? 'Projeções sincronizadas pontualmente às 00:00:00 do fuso civil' : 'Projections synchronized at 00:00:00 civil midnight'}
                    </span>
                  </div>
                </div>

                {/* Overlapping / Stacking Seasonal Variations Toggle */}
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 rounded-2xl border border-amber-500/30 flex flex-col gap-2.5 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {isPt ? 'Sobreposição e Acúmulo de Variações Sazonais' : 'Overlapping & Stacking Seasonal Variations'}
                        </h4>
                        <p className="text-[9.5px] text-white/60 leading-relaxed">
                          {isPt 
                            ? 'Permite que regras e períodos sazonais vigentes no mesmo intervalo de datas se sobreponham e acumulem seus deslocamentos de horário (+60 min, +30 min, etc.).' 
                            : 'Allows overlapping active seasonal rules to accumulate their time shifts (+60 min, +30 min, etc.) simultaneously.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalConfig(prev => ({
                        ...prev,
                        allowOverlap: prev.allowOverlap === false ? true : false,
                        timeChange: {
                          ...prev.timeChange,
                          allowOverlap: prev.allowOverlap === false ? true : false
                        }
                      }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer border shrink-0 ${
                        localConfig.allowOverlap !== false
                          ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                          : 'bg-white/10 text-white/50 border-white/10 hover:text-white'
                      }`}
                    >
                      {localConfig.allowOverlap !== false
                        ? (isPt ? 'SOBREPOSIÇÃO ATIVA' : 'OVERLAP ACTIVE')
                        : (isPt ? 'APENAS PRIMEIRA REGRA' : 'FIRST RULE ONLY')}
                    </button>
                  </div>
                  {localConfig.allowOverlap !== false && (
                    <div className="text-[8.5px] font-mono text-amber-300/90 bg-black/40 p-2 rounded-lg border border-amber-400/20 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {isPt 
                          ? 'Modo Empilhamento/Sobreposição Ativo: Quando duas regras sazonais coincidirem, os deslocamentos serão somados (ex: +60m + +30m = +90m).' 
                          : 'Overlapping Active Mode: Overlapping active seasonal rules will sum their time shifts (e.g. +60m + +30m = +90m).'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 1.1 Ciclo Format Mode Selector */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Formato de Temporada / Ciclo' : 'Season / Cycle Format'}
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      {isPt ? 'Regra de Vigência' : 'Validity Rule'}
                    </span>
                  </div>

                  {/* Formato Civil XXXX vs Bi-anual XXXX/YYYY */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Option 1: Single Year XXXX (01/01 a 31/12) */}
                    <button
                      type="button"
                      onClick={() => setLocalConfig(prev => ({ ...prev, cycleFormat: 'single' }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        localConfig.cycleFormat === 'single'
                          ? 'bg-amber-400/15 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black font-mono text-amber-300">
                          {localConfig.isRangeMode ? `${localConfig.targetYear} a ${localConfig.endYear}` : `${localConfig.targetYear}`}
                        </span>
                        <span className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 text-white/70 border border-white/10">
                          {isPt ? 'Ano Civil (XXXX)' : 'Calendar Year (XXXX)'}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white/90">
                        {isPt ? 'Válido entre 01/01 a 31/12' : 'Valid from 01/01 to 31/12'}
                      </p>
                      <p className="text-[9px] text-white/40 mt-0.5">
                        {isPt 
                          ? 'Ciclos alinhados ao ano civil padrão de 1º de janeiro a 31 de dezembro.' 
                          : 'Cycles aligned with standard calendar year from Jan 1st to Dec 31st.'}
                      </p>
                      {localConfig.cycleFormat === 'single' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                      )}
                    </button>

                    {/* Option 2: Range Year XXXX/YYYY (01/07 a 30/06) */}
                    <button
                      type="button"
                      onClick={() => setLocalConfig(prev => ({ ...prev, cycleFormat: 'range' }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        localConfig.cycleFormat === 'range'
                          ? 'bg-amber-400/15 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black font-mono text-amber-300">
                          {localConfig.isRangeMode 
                            ? `${localConfig.targetYear}/${localConfig.targetYear + 1} a ${localConfig.endYear}/${localConfig.endYear + 1}`
                            : `${localConfig.targetYear}/${localConfig.targetYear + 1}`}
                        </span>
                        <span className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 text-white/70 border border-white/10">
                          {isPt ? 'Bi-anual (XXXX/YYYY)' : 'Bi-annual (XXXX/YYYY)'}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white/90">
                        {isPt ? 'Válido entre 01/07 a 30/06' : 'Valid from 01/07 to 30/06'}
                      </p>
                      <p className="text-[9px] text-white/40 mt-0.5">
                        {isPt 
                          ? 'Ciclos sazonais iniciando em 1º de julho e terminando em 30 de junho.' 
                          : 'Seasonal cycles starting July 1st and ending June 30th.'}
                      </p>
                      {localConfig.cycleFormat === 'range' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                      )}
                    </button>
                  </div>

                  {/* Single Cycle vs Multi-Season Range vs A Permanente */}
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white block">
                            {isPt ? 'Vigência por Temporada (Quais temporadas vão vigorar):' : 'Season Validity Scope:'}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                            {localConfig.endScopeType === 'permanent'
                              ? (isPt ? 'A Permanente' : 'To Permanent')
                              : (localConfig.isRangeMode 
                                  ? (localConfig.cycleFormat === 'single' ? 'XXX1 a XXX6' : 'XXX1/XXX2 a XXX6/XXX7') 
                                  : (isPt ? 'Temporada Única' : 'Single Season'))}
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50 block mt-0.5">
                          {isPt 
                            ? 'Configure quais temporadas vigoram: Escolha entre Temporada Única, Intervalo (XXX1 a XXX6 / XXX1/XXX2 a XXX6/XXX7) ou até Permanente (ex: XXX9 a Permanente).' 
                            : 'Configure which seasons will be in effect: Choose Single Season, Range Interval (XXX1 to XXX6 / XXX1/XXX2 to XXX6/XXX7) or Permanent (e.g. XXX9 to Permanent).'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ 
                            ...prev, 
                            isRangeMode: false, 
                            endScopeType: 'year',
                            vigencyScope: 'single'
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            !localConfig.isRangeMode && localConfig.endScopeType !== 'permanent'
                              ? 'bg-amber-400 text-black font-extrabold shadow-sm' 
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {isPt ? 'Temporada Única' : 'Single Season'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ 
                            ...prev, 
                            isRangeMode: true,
                            endScopeType: 'year',
                            vigencyScope: 'range',
                            endYear: Math.max(prev.targetYear + 1, prev.endYear || prev.targetYear + 5)
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            localConfig.isRangeMode && localConfig.endScopeType !== 'permanent'
                              ? 'bg-amber-400 text-black font-extrabold shadow-sm' 
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {localConfig.cycleFormat === 'single' 
                            ? (isPt ? 'Intervalo (XXX1 a XXX6)' : 'Range (XXX1 to XXX6)') 
                            : (isPt ? 'Intervalo (XXX1/XXX2 a XXX6/XXX7)' : 'Range (XXX1/XXX2 to XXX6/XXX7)')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ 
                            ...prev, 
                            isRangeMode: true,
                            endScopeType: 'permanent',
                            vigencyScope: 'permanent'
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            localConfig.endScopeType === 'permanent' || localConfig.vigencyScope === 'permanent'
                              ? 'bg-emerald-400 text-black font-extrabold shadow-sm' 
                              : 'text-emerald-400/70 hover:text-emerald-300'
                          }`}
                        >
                          {localConfig.cycleFormat === 'single'
                            ? (isPt ? 'XXX9 a Permanente' : 'XXX9 to Permanent')
                            : (isPt ? 'XXX9/XX10 a Permanente' : 'XXX9/XX10 to Permanent')}
                        </button>
                      </div>
                    </div>

                    {/* Single Season Year Selector */}
                    {!localConfig.isRangeMode && localConfig.endScopeType !== 'permanent' ? (
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-xs text-white/70 font-semibold">
                          {isPt ? 'Ano Base da Temporada:' : 'Base Season Year:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => {
                              const newY = prev.targetYear - 1;
                              return {
                                ...prev,
                                targetYear: newY,
                                timeChange: {
                                  ...prev.timeChange,
                                  startYear: newY,
                                  endYear: Math.max(newY, prev.timeChange?.endYear || prev.endYear)
                                }
                              };
                            })}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                            title={isPt ? 'Ano anterior' : 'Previous year'}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="font-mono font-bold text-sm text-amber-300 min-w-[3.5rem] text-center">
                            {localConfig.cycleFormat === 'single' ? localConfig.targetYear : `${localConfig.targetYear}/${localConfig.targetYear + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => {
                              const newY = prev.targetYear + 1;
                              const newEndY = Math.max(newY, prev.endYear);
                              return {
                                ...prev,
                                targetYear: newY,
                                endYear: newEndY,
                                timeChange: {
                                  ...prev.timeChange,
                                  startYear: newY,
                                  endYear: newEndY
                                }
                              };
                            })}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                            title={isPt ? 'Próximo ano' : 'Next year'}
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalConfig(prev => ({
                              ...prev,
                              targetYear: currentYear,
                              timeChange: {
                                ...prev.timeChange,
                                startYear: currentYear,
                                endYear: Math.max(currentYear, prev.timeChange?.endYear || prev.endYear)
                              }
                            }))}
                            className="text-[9px] font-mono font-bold px-2 py-1 bg-white/5 hover:bg-white/15 text-white/70 rounded-lg border border-white/10 transition-all ml-1 cursor-pointer"
                          >
                            {isPt ? 'Atual' : 'Current'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Multi-Season Interval Range Pickers (XXX1 a XXX6 / XXX1/XXX2 a XXX6/XXX7 ou XXX9 a Permanente) */
                      <div className="space-y-2.5 pt-2 border-t border-white/5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Start Year Picker (XXX1 ou XXX1/XXX2) */}
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-white/40 uppercase font-mono block">
                                {localConfig.cycleFormat === 'single'
                                  ? (isPt ? 'Temporada Inicial (XXX1):' : 'Start Season (XXX1):')
                                  : (isPt ? 'Temporada Inicial (XXX1/XXX2):' : 'Start Season (XXX1/XXX2):')}
                              </span>
                              <span className="font-mono font-bold text-sm text-amber-300">
                                {localConfig.cycleFormat === 'single' ? `${localConfig.targetYear}` : `${localConfig.targetYear}/${localConfig.targetYear + 1}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setLocalConfig(prev => {
                                  const newY = prev.targetYear - 1;
                                  return {
                                    ...prev,
                                    targetYear: newY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      startYear: newY,
                                      endYear: Math.max(newY, prev.timeChange?.endYear || prev.endYear)
                                    }
                                  };
                                })}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <span className="font-mono text-xs px-1 text-white font-bold">{localConfig.targetYear}</span>
                              <button
                                type="button"
                                onClick={() => setLocalConfig(prev => {
                                  const newY = prev.targetYear + 1;
                                  const newEndY = Math.max(newY, prev.endYear);
                                  return {
                                    ...prev,
                                    targetYear: newY,
                                    endYear: newEndY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      startYear: newY,
                                      endYear: newEndY
                                    }
                                  };
                                })}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>

                          {/* End Year Picker (XXX6 ou XXX6/XXX7 ou Permanente) */}
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-white/40 uppercase font-mono block">
                                {localConfig.endScopeType === 'permanent'
                                  ? (isPt ? 'Término da Vigência:' : 'End Validity Scope:')
                                  : (localConfig.cycleFormat === 'single'
                                      ? (isPt ? 'Temporada Final (XXX6):' : 'End Season (XXX6):')
                                      : (isPt ? 'Temporada Final (XXX6/XXX7):' : 'End Season (XXX6/XXX7):'))}
                              </span>
                              <span className={`font-mono font-bold text-sm ${localConfig.endScopeType === 'permanent' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {localConfig.endScopeType === 'permanent'
                                  ? (isPt ? 'Permanente (Sem Expiração)' : 'Permanent (No Expiration)')
                                  : (localConfig.cycleFormat === 'single' ? `${localConfig.endYear}` : `${localConfig.endYear}/${localConfig.endYear + 1}`)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {localConfig.endScopeType === 'permanent' ? (
                                <button
                                  type="button"
                                  onClick={() => setLocalConfig(prev => ({ 
                                    ...prev, 
                                    endScopeType: 'year', 
                                    endYear: Math.max(prev.targetYear + 1, prev.targetYear + 5),
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: Math.max(prev.targetYear + 1, prev.targetYear + 5),
                                      isPermanent: false
                                    }
                                  }))}
                                  className="text-[9px] font-mono px-2 py-1 bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-black rounded border border-amber-400/30 transition-all font-bold cursor-pointer"
                                >
                                  {isPt ? 'Definir Ano Fim' : 'Set End Year'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setLocalConfig(prev => {
                                      const newEndY = Math.max(prev.targetYear, prev.endYear - 1);
                                      return {
                                        ...prev,
                                        endYear: newEndY,
                                        timeChange: {
                                          ...prev.timeChange,
                                          endYear: newEndY
                                        }
                                      };
                                    })}
                                    className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                                  >
                                    <ChevronLeft size={12} />
                                  </button>
                                  <span className="font-mono text-xs px-1 text-white font-bold">{localConfig.endYear}</span>
                                  <button
                                    type="button"
                                    onClick={() => setLocalConfig(prev => {
                                      const newEndY = prev.endYear + 1;
                                      return {
                                        ...prev,
                                        endYear: newEndY,
                                        timeChange: {
                                          ...prev.timeChange,
                                          endYear: newEndY
                                        }
                                      };
                                    })}
                                    className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                                  >
                                    <ChevronRight size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLocalConfig(prev => ({ 
                                      ...prev, 
                                      endScopeType: 'permanent', 
                                      vigencyScope: 'permanent',
                                      timeChange: {
                                        ...prev.timeChange,
                                        isPermanent: true
                                      }
                                    }))}
                                    className="text-[8px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded border border-emerald-500/30 font-bold ml-1 cursor-pointer"
                                    title={isPt ? 'Mudar para Permanente' : 'Switch to Permanent'}
                                  >
                                    {isPt ? 'Permanente' : 'Permanent'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Presets for Ranges and Permanent */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[8.5px] font-mono text-white/40 uppercase">
                            {isPt ? 'Exemplos / Atalhos de Vigência:' : 'Presets & Examples:'}
                          </span>
                          {[
                            { 
                              label: localConfig.cycleFormat === 'single' ? `${localConfig.targetYear} a ${localConfig.targetYear + 5} (6 temp.)` : `${localConfig.targetYear}/${localConfig.targetYear + 1} a ${localConfig.targetYear + 5}/${localConfig.targetYear + 6} (6 temp.)`, 
                              start: localConfig.targetYear, 
                              end: localConfig.targetYear + 5, 
                              permanent: false 
                            },
                            { 
                              label: localConfig.cycleFormat === 'single' ? `${currentYear} a ${currentYear + 5} (XXX1 a XXX6)` : `${currentYear}/${currentYear + 1} a ${currentYear + 5}/${currentYear + 6} (XXX1/XXX2 a XXX6/XXX7)`, 
                              start: currentYear, 
                              end: currentYear + 5, 
                              permanent: false 
                            },
                            { 
                              label: localConfig.cycleFormat === 'single' ? `${currentYear} a Permanente` : `${currentYear}/${currentYear + 1} a Permanente`, 
                              start: currentYear, 
                              end: currentYear + 10, 
                              permanent: true 
                            },
                            { 
                              label: localConfig.cycleFormat === 'single' ? `${currentYear + 9} a Permanente (XXX9 a Permanente)` : `${currentYear + 9}/${currentYear + 10} a Permanente (XXX9/XX10 a Permanente)`, 
                              start: currentYear + 9, 
                              end: currentYear + 20, 
                              permanent: true 
                            },
                            { 
                              label: localConfig.cycleFormat === 'single' ? '2024 a 2030' : '2024/2025 a 2030/2031', 
                              start: 2024, 
                              end: 2030, 
                              permanent: false 
                            },
                            { 
                              label: localConfig.cycleFormat === 'single' ? '1900 a 2100 (Completo)' : '1900/1901 a 2100/2101', 
                              start: 1900, 
                              end: 2100, 
                              permanent: false 
                            }
                          ].map(preset => {
                            const isMatch = preset.permanent 
                              ? (localConfig.endScopeType === 'permanent' && localConfig.targetYear === preset.start)
                              : (localConfig.endScopeType !== 'permanent' && localConfig.targetYear === preset.start && localConfig.endYear === preset.end);
                            return (
                              <button
                                key={`range-preset-${preset.label}`}
                                type="button"
                                onClick={() => setLocalConfig(prev => ({ 
                                  ...prev, 
                                  isRangeMode: true,
                                  targetYear: preset.start, 
                                  endYear: preset.end,
                                  endScopeType: preset.permanent ? 'permanent' : 'year',
                                  vigencyScope: preset.permanent ? 'permanent' : 'range'
                                }))}
                                className={`text-[8.5px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  isMatch
                                    ? (preset.permanent ? 'bg-emerald-400 text-black font-bold border-emerald-400' : 'bg-amber-400 text-black font-bold border-amber-400')
                                    : (preset.permanent ? 'bg-emerald-500/10 text-emerald-300 hover:text-white border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10')
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-time Active Span Gauge */}
                  <div className="mt-3.5 p-3 bg-black/30 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cycleStatus.isValidNow ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span className="font-bold text-white text-[11px]">
                          {isPt ? 'Período Total:' : 'Total Active Period:'} {cycleStatus.startDateFormatted} {'\u2192'} {cycleStatus.endDateFormatted}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                        cycleStatus.isValidNow ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {cycleStatus.isValidNow ? (isPt ? 'EM VIGOR' : 'ACTIVE') : (isPt ? 'FORA DO PERÍODO' : 'INACTIVE')}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative mb-1.5">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${cycleStatus.progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-white/50">
                      <span>{cycleStatus.daysElapsed} {isPt ? 'dias decorridos' : 'days elapsed'} ({cycleStatus.progressPercent.toFixed(1)}%)</span>
                      <span>{cycleStatus.daysRemaining} {isPt ? 'dias restantes' : 'days remaining'} ({cycleStatus.totalDays}d total)</span>
                    </div>
                  </div>
                </div>

                {/* 1.2 Selection of Season Mode (Auto Astronomical vs Manual) */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Estação em Vigor no Momento' : 'Currently Active Season Station'}
                      </h3>
                    </div>
                    {/* Auto vs Manual Toggle */}
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, seasonMode: 'auto' }))}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          localConfig.seasonMode === 'auto'
                            ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {isPt ? 'Astronômica (Auto)' : 'Astronomical (Auto)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, seasonMode: 'manual' }))}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          localConfig.seasonMode === 'manual'
                            ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                            : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {isPt ? 'Manual' : 'Manual'}
                      </button>
                    </div>
                  </div>

                  {/* 4 Season Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {seasons.map(s => {
                      const item = SEASONAL_ACCENTS[s];
                      const isSelected = localConfig.seasonMode === 'manual' 
                        ? localConfig.manualSeason === s 
                        : (effectiveSeason || currentAstronomicalSeason) === s;

                      return (
                        <button
                          key={`season-opt-${s}`}
                          type="button"
                          onClick={() => {
                            setLocalConfig(prev => ({
                              ...prev,
                              seasonMode: 'manual',
                              manualSeason: s
                            }));
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? 'bg-white/15 border-white/40 shadow-lg ring-1'
                              : 'bg-black/30 border-white/5 opacity-70 hover:opacity-100 hover:bg-white/5'
                          }`}
                          style={{
                            ringColor: isSelected ? item.color : 'transparent'
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{item.icon}</span>
                            <div 
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: item.color }}
                            />
                          </div>
                          <div>
                            <span className="text-xs font-bold block" style={{ color: item.color }}>
                              {isPt ? item.namePt : item.name}
                            </span>
                            <span className="text-[8px] font-mono text-white/50 uppercase block mt-0.5">
                              {s}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-1 text-[7.5px] font-bold text-white uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded">
                              <Check size={9} className="text-amber-400" />
                              <span>{isPt ? 'Selecionada' : 'Selected'}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PERSONALIZAR TEMPORADAS (Identidade visual, nomes, cores, emojis, datas e offsets) */}
            {activeTab === 'customization' && (
              <div className="space-y-4">
                {/* Header info & reset all */}
                <div className="p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Personalização das Estações' : 'Season Customization'}
                      </h3>
                      {customizedSeasonCount > 0 ? (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {customizedSeasonCount} {isPt ? 'customizada(s)' : 'customized'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                          {isPt ? 'Padrão Astronômico Ativo' : 'Astronomical Defaults'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/60 mt-1">
                      {isPt 
                        ? 'Personalize o nome, ícone/emoji, cor de destaque, descrição e ajuste as datas e regras de cada estação.' 
                        : 'Customize name, icon/emoji, accent color, description and fine-tune start/end dates for each season.'}
                    </p>
                  </div>

                  {customizedSeasonCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAllSeasonOverrides}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isPt ? 'Restaurar Todas' : 'Reset All'}</span>
                    </button>
                  )}
                </div>

                {/* Astronomical Carnival & +7 Exception Live Monitor Banner */}
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  carnavalComparison.isCarnavalPlus7Active 
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-200' 
                    : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                }`}>
                  <CalendarDays className="w-5 h-5 shrink-0 mt-0.5" style={{ color: carnavalComparison.isCarnavalPlus7Active ? '#fbbf24' : '#34d399' }} />
                  <div className="flex-1 text-xs font-mono space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>{isPt ? 'Monitor Astronômico de Carnaval & Exceção +7' : 'Astronomical Carnival & +7 Exception Monitor'}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        carnavalComparison.isCarnavalPlus7Active ? 'bg-amber-400 text-black' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {carnavalComparison.isCarnavalPlus7Active ? (isPt ? '⚠️ ADIA +7 DIAS' : '⚠️ POSTPONED +7D') : (isPt ? '✓ DATA PADRÃO' : '✓ STANDARD DATE')}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {isPt ? carnavalComparison.messagePt : carnavalComparison.messageEn}
                    </p>
                  </div>
                </div>

                {/* 4 Season Selector Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {seasons.map(s => {
                    const defaultAcc = SEASONAL_ACCENTS[s];
                    const effectiveAcc = getSeasonalAccent(s, localConfig.customSeasonOverrides);
                    const isCustomized = !!localConfig.customSeasonOverrides?.[s];
                    const isSelected = selectedSeasonToEdit === s;

                    return (
                      <button
                        key={`custom-edit-sel-${s}`}
                        type="button"
                        onClick={() => setSelectedSeasonToEdit(s)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'bg-white/15 border-white/40 shadow-lg ring-2'
                            : 'bg-black/30 border-white/5 opacity-75 hover:opacity-100 hover:bg-white/5'
                        }`}
                        style={{
                          ringColor: isSelected ? effectiveAcc.color : 'transparent'
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{effectiveAcc.icon}</span>
                          <div 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: effectiveAcc.color }}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold block truncate" style={{ color: effectiveAcc.color }}>
                            {isPt ? effectiveAcc.namePt : effectiveAcc.name}
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[8px] font-mono text-white/50 uppercase">
                              {s}
                            </span>
                            <span className={`text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
                              isCustomized 
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                                : 'bg-white/5 text-white/40'
                            }`}>
                              {isCustomized ? (isPt ? 'EDITADA' : 'CUSTOM') : (isPt ? 'PADRÃO' : 'DEFAULT')}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Season Customizer Editor Form */}
                {(() => {
                  const s = selectedSeasonToEdit;
                  const defaultAcc = SEASONAL_ACCENTS[s];
                  const currentOverride = localConfig.customSeasonOverrides?.[s]?.[0] || {};
                  const effectiveAcc = getSeasonalAccent(s, localConfig.customSeasonOverrides);
                  const isCurrentSeasonCustomized = !!localConfig.customSeasonOverrides?.[s];

                  const popularEmojis = [
                    '☀️', '🌞', '🌴', '🏖️', '🌺', '🌸', '🌻', '🍃', 
                    '🍂', '🍁', '🌾', '🌲', '❄️', '🌨️', '⛄', '🧊', 
                    '🌊', '🪐', '⚡', '🌙', '✨', '🔥', '⛺', '🌈'
                  ];

                  const colorPresets = [
                    { name: 'Ouro Solar', hex: '#fbbf24' },
                    { name: 'Âmbar Quente', hex: '#f59e0b' },
                    { name: 'Cobre Outonal', hex: '#f97316' },
                    { name: 'Vermelho Rubro', hex: '#ef4444' },
                    { name: 'Rosa Sakura', hex: '#ec4899' },
                    { name: 'Magenta Cósmico', hex: '#d946ef' },
                    { name: 'Púrpura Mística', hex: '#a855f7' },
                    { name: 'Índigo Estelar', hex: '#6366f1' },
                    { name: 'Azul Glacial', hex: '#38bdf8' },
                    { name: 'Ciano Oceânico', hex: '#06b6d4' },
                    { name: 'Esmeralda', hex: '#34d399' },
                    { name: 'Verde Lima', hex: '#84cc16' }
                  ];

                  return (
                    <div className="space-y-4">
                      {/* Section 1: Identidade Visual e Nome */}
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{effectiveAcc.icon}</span>
                            <div>
                              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                {isPt ? `Personalizar ${defaultAcc.namePt}` : `Customize ${defaultAcc.name}`}
                              </span>
                              <span className="text-[9px] text-white/50">
                                {isPt ? 'Identidade visual, ícone e nome da estação' : 'Visual identity, icon and season name'}
                              </span>
                            </div>
                          </div>

                          {isCurrentSeasonCustomized && (
                            <button
                              type="button"
                              onClick={() => handleResetSeasonOverride(s)}
                              className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw size={10} />
                              <span>{isPt ? 'Restaurar Padrão' : 'Reset to Default'}</span>
                            </button>
                          )}
                        </div>

                        {/* Nomes da Estação (PT e EN) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] uppercase font-mono text-white/50 block mb-1">
                              {isPt ? 'Nome em Português:' : 'Name in Portuguese:'}
                            </label>
                            <input
                              type="text"
                              value={currentOverride.namePt ?? defaultAcc.namePt}
                              onChange={(e) => handleUpdateSeasonOverride(s, { namePt: e.target.value })}
                              placeholder={defaultAcc.namePt}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-mono text-white/50 block mb-1">
                              {isPt ? 'Nome em Inglês:' : 'Name in English:'}
                            </label>
                            <input
                              type="text"
                              value={currentOverride.nameEn ?? defaultAcc.name}
                              onChange={(e) => handleUpdateSeasonOverride(s, { nameEn: e.target.value })}
                              placeholder={defaultAcc.name}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all"
                            />
                          </div>
                        </div>

                        {/* Seletor de Ícone / Emoji */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] uppercase font-mono text-white/50">
                              {isPt ? 'Ícone / Emoji da Estação:' : 'Season Icon / Emoji:'}
                            </label>
                            <span className="text-[9px] text-white/40">
                              {isPt ? 'Selecione abaixo ou digite qualquer caractere' : 'Select below or type custom'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0 shadow-inner">
                              {effectiveAcc.icon}
                            </div>
                            <input
                              type="text"
                              value={currentOverride.icon ?? defaultAcc.icon}
                              onChange={(e) => handleUpdateSeasonOverride(s, { icon: e.target.value })}
                              placeholder="☀️"
                              maxLength={4}
                              className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-center text-sm text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          {/* Quick Emoji Presets Grid */}
                          <div className="flex flex-wrap gap-1.5 p-2 bg-black/30 rounded-xl border border-white/5">
                            {popularEmojis.map((emoji) => (
                              <button
                                key={`emoji-preset-${emoji}`}
                                type="button"
                                onClick={() => handleUpdateSeasonOverride(s, { icon: emoji })}
                                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                                  (currentOverride.icon ?? defaultAcc.icon) === emoji
                                    ? 'bg-amber-400/20 border border-amber-400 scale-110 shadow-sm'
                                    : 'bg-white/5 hover:bg-white/15 border border-white/5'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Seletor de Cor Primária & Glow */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] uppercase font-mono text-white/50">
                              {isPt ? 'Cor de Destaque da Estação:' : 'Season Accent Color:'}
                            </label>
                            <span className="text-[9px] font-mono text-white/70">
                              {effectiveAcc.color}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="color"
                              value={effectiveAcc.color}
                              onChange={(e) => {
                                const hex = e.target.value;
                                handleUpdateSeasonOverride(s, {
                                  color: hex,
                                  glow: hexToRgbaGlow(hex, 0.45)
                                });
                              }}
                              className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0 shadow-md"
                            />
                            <input
                              type="text"
                              value={currentOverride.color ?? defaultAcc.color}
                              onChange={(e) => {
                                const hex = e.target.value;
                                handleUpdateSeasonOverride(s, {
                                  color: hex,
                                  glow: hexToRgbaGlow(hex, 0.45)
                                });
                              }}
                              placeholder="#fbbf24"
                              className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          {/* Quick Color Presets Grid */}
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {colorPresets.map((cp) => (
                              <button
                                key={`col-preset-${cp.hex}`}
                                type="button"
                                onClick={() => handleUpdateSeasonOverride(s, {
                                  color: cp.hex,
                                  glow: hexToRgbaGlow(cp.hex, 0.45)
                                })}
                                className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  effectiveAcc.color.toLowerCase() === cp.hex.toLowerCase()
                                    ? 'bg-white/20 border-white shadow-sm ring-1 ring-white/40'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: cp.hex }}
                                />
                                <span className="text-[8.5px] font-medium text-white/80 truncate">
                                  {cp.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Descrição Personalizada */}
                        <div>
                          <label className="text-[9px] uppercase font-mono text-white/50 block mb-1">
                            {isPt ? 'Descrição / Notas da Estação:' : 'Description / Season Notes:'}
                          </label>
                          <textarea
                            value={currentOverride.descriptionPt ?? defaultAcc.descriptionPt}
                            onChange={(e) => handleUpdateSeasonOverride(s, { descriptionPt: e.target.value, description: e.target.value })}
                            rows={2}
                            placeholder={defaultAcc.descriptionPt}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all resize-none"
                          />
                        </div>
                      </div>

                      {/* Section 2: Regras e Ajuste de Datas */}
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <CalendarRange className="w-4 h-4 text-amber-400" />
                            <div>
                              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                                {isPt ? 'Ajuste de Cronograma e Datas' : 'Schedule & Date Tuning'}
                              </span>
                              <span className="text-[9px] text-white/50">
                                {isPt ? 'Adiantar/atrasar o início ou fixar datas exatas para esta estação' : 'Advance/delay start or set specific dates'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Deslocamento de Início em Dias */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              {isPt ? 'Deslocamento do Início:' : 'Start Date Offset:'}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              (currentOverride.startOffsetDays || 0) > 0
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : (currentOverride.startOffsetDays || 0) < 0
                                ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                                : 'bg-white/10 text-white/60'
                            }`}>
                              {(currentOverride.startOffsetDays || 0) > 0 ? `+${currentOverride.startOffsetDays} dias (atrasar)` : (currentOverride.startOffsetDays || 0) < 0 ? `${currentOverride.startOffsetDays} dias (adiantar)` : '0 dias (astronômico)'}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="-45"
                            max="45"
                            step="1"
                            value={currentOverride.startOffsetDays || 0}
                            onChange={(e) => handleUpdateSeasonOverride(s, { startOffsetDays: parseInt(e.target.value, 10) })}
                            className="w-full accent-amber-400 cursor-pointer"
                          />

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[-30, -15, -7, 0, 7, 15, 30].map(days => (
                              <button
                                key={`start-offset-${days}`}
                                type="button"
                                onClick={() => handleUpdateSeasonOverride(s, { startOffsetDays: days })}
                                className={`text-[8.5px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  (currentOverride.startOffsetDays || 0) === days
                                    ? 'bg-amber-400 text-black font-bold border-amber-400'
                                    : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                                }`}
                              >
                                {days > 0 ? `+${days}d` : days === 0 ? 'Padrão' : `${days}d`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Deslocamento de Término em Dias */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              {isPt ? 'Deslocamento do Término:' : 'End Date Offset:'}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              (currentOverride.endOffsetDays || 0) > 0
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                : (currentOverride.endOffsetDays || 0) < 0
                                ? 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
                                : 'bg-white/10 text-white/60'
                            }`}>
                              {(currentOverride.endOffsetDays || 0) > 0 ? `+${currentOverride.endOffsetDays} dias (estender)` : (currentOverride.endOffsetDays || 0) < 0 ? `${currentOverride.endOffsetDays} dias (encurtar)` : '0 dias (astronômico)'}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="-45"
                            max="45"
                            step="1"
                            value={currentOverride.endOffsetDays || 0}
                            onChange={(e) => handleUpdateSeasonOverride(s, { endOffsetDays: parseInt(e.target.value, 10) })}
                            className="w-full accent-amber-400 cursor-pointer"
                          />

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[-30, -15, -7, 0, 7, 15, 30].map(days => (
                              <button
                                key={`end-offset-${days}`}
                                type="button"
                                onClick={() => handleUpdateSeasonOverride(s, { endOffsetDays: days })}
                                className={`text-[8.5px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                  (currentOverride.endOffsetDays || 0) === days
                                    ? 'bg-amber-400 text-black font-bold border-amber-400'
                                    : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                                }`}
                              >
                                {days > 0 ? `+${days}d` : days === 0 ? 'Padrão' : `${days}d`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Datas Fixas / Regras Específicas */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2.5">
                          <span className="text-[9px] uppercase font-mono text-white/50 block">
                            {isPt ? 'Regra de Início / Término Específica (Opcional):' : 'Specific Start / End Rule (Optional):'}
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[8.5px] text-white/40 block mb-0.5">
                                {isPt ? 'Regra de Início / Exceção (ex: "Domingo de Carnaval"):' : 'Start Rule / Exception:'}
                              </label>
                              <input
                                type="text"
                                value={currentOverride.customStartRule ?? ''}
                                onChange={(e) => handleUpdateSeasonOverride(s, { customStartRule: e.target.value })}
                                placeholder={isPt ? 'ex: Domingo de Carnaval, Páscoa, 21 de Dezembro' : 'e.g. Domingo de Carnaval, Easter'}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-400"
                              />
                              <div className="flex flex-wrap gap-1 mt-1">
                                {['Domingo de Carnaval', 'Carnaval', 'Páscoa', 'Sábado de Carnaval', 'Quarta de Cinzas'].map(preset => (
                                  <button
                                    key={`exc-preset-${preset}`}
                                    type="button"
                                    onClick={() => handleUpdateSeasonOverride(s, { customStartRule: preset })}
                                    className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                      currentOverride.customStartRule === preset
                                        ? 'bg-amber-400 text-black font-bold border-amber-400'
                                        : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[8.5px] text-white/40 block mb-0.5">
                                {isPt ? 'Regra de Término (ex: "20 de Março"):' : 'End Rule:'}
                              </label>
                              <input
                                type="text"
                                value={currentOverride.customEndRule ?? ''}
                                onChange={(e) => handleUpdateSeasonOverride(s, { customEndRule: e.target.value })}
                                placeholder={isPt ? 'ex: 20 de Março ou 20/03' : 'e.g. Mar 20th'}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Pré-visualização ao Vivo (Live Preview Card) */}
                      <div className="p-4 rounded-2xl border transition-all relative overflow-hidden bg-gradient-to-br from-black/60 to-black/30 border-white/15">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" style={{ color: effectiveAcc.color }} />
                            <span className="text-xs font-bold uppercase tracking-wider text-white">
                              {isPt ? 'Pré-visualização da Estação Ativa' : 'Live Season Preview'}
                            </span>
                          </div>
                          <span 
                            className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm"
                            style={{ 
                              backgroundColor: `${effectiveAcc.color}20`,
                              color: effectiveAcc.color,
                              borderColor: `${effectiveAcc.color}40`
                            }}
                          >
                            {isPt ? 'Aparência no Sistema' : 'Live Look'}
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg border"
                            style={{ 
                              backgroundColor: `${effectiveAcc.color}15`,
                              borderColor: `${effectiveAcc.color}40`,
                              boxShadow: `0 0 15px ${effectiveAcc.glow}`
                            }}
                          >
                            {effectiveAcc.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black truncate" style={{ color: effectiveAcc.color }}>
                              {isPt ? effectiveAcc.namePt : effectiveAcc.name}
                            </h4>
                            <p className="text-[10px] text-white/70 mt-0.5 line-clamp-2">
                              {isPt ? effectiveAcc.descriptionPt : effectiveAcc.description}
                            </p>

                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-mono text-white/50">
                                {isPt ? 'Cor:' : 'Color:'} {effectiveAcc.color}
                              </span>
                              <span className="text-white/20">•</span>
                              <span className="text-[9px] font-mono text-white/50">
                                {isPt ? 'Glow:' : 'Glow:'} {effectiveAcc.glow}
                              </span>
                            </div>

                            {/* Live Rule & Exception Indicator */}
                            {currentOverride.customStartRule && (() => {
                              const currentYear = new Date().getUTCFullYear();
                              const excResult = processSeasonalRuleWithException(`(Data Prevista) (Exceto ${currentOverride.customStartRule} ${currentOverride.startOffsetDays ? '+' + currentOverride.startOffsetDays : '+7'})`, currentYear);
                              return (
                                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-[10px] font-mono text-amber-200 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white/70 font-semibold">{isPt ? 'Regra Aplicada (Data Prevista):' : 'Applied Rule (Scheduled):'}</span>
                                    <span className="font-bold text-amber-300">
                                      (Data Prevista) (Exceto {currentOverride.customStartRule} {currentOverride.startOffsetDays ?? 7})
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-amber-400/20 pt-1.5 mt-0.5">
                                    <span className="text-white/65">
                                      {isPt ? `Ano ${currentYear} — Coincidência Carnaval:` : `Year ${currentYear} — Carnival Coincidence:`}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${excResult.isCoincident ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                      {excResult.isCoincident 
                                        ? (isPt ? '⚠️ SIM (Vai mudar / Adiado +7d)' : '⚠️ YES (Will change / Postponed +7d)')
                                        : (isPt ? '✓ NÃO (Sem mudança / Data padrão)' : '✓ NO (No change / Standard date)')
                                      }
                                    </span>
                                  </div>
                                  {excResult.effectiveDate && (
                                    <div className="flex items-center justify-between text-[9px] text-white/75">
                                      <span>{isPt ? 'Data Efetiva Calculada:' : 'Calculated Effective Date:'}</span>
                                      <span className="font-bold text-amber-200">
                                        {excResult.effectiveDate.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: CADA TEMPORADA DE MUDANÇA SAZONAL COM DATAS PREVISTAS */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {/* Header info & filters */}
                <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {isPt ? 'Cronograma de Transições Astronômicas' : 'Astronomical Transitions Schedule'}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {cycleStatus.cycleLabel}
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-0.5">
                      {isPt 
                        ? 'Exibição detalhada de cada solstício e equinócio com data de início e término previstos.' 
                        : 'Detailed breakdown of each solstice and equinox with planned start and end dates.'}
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', labelPt: 'Todas', labelEn: 'All' },
                      { id: 'active', labelPt: 'Em Vigor', labelEn: 'Active' },
                      { id: 'upcoming', labelPt: 'Futuras', labelEn: 'Upcoming' },
                      { id: 'completed', labelPt: 'Passadas', labelEn: 'Past' },
                    ].map(f => (
                      <button
                        key={`filter-status-${f.id}`}
                        type="button"
                        onClick={() => setTimelineFilter(f.id as any)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          timelineFilter === f.id
                            ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                            : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isPt ? f.labelPt : f.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Cards List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredTimeline.map((item, idx) => {
                    const accent = SEASONAL_ACCENTS[item.season];
                    return (
                      <div
                        key={`timeline-item-${item.id}-${idx}`}
                        className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                          item.isCurrent
                            ? 'bg-gradient-to-r from-amber-400/15 via-white/5 to-white/5 border-amber-400/50 shadow-lg ring-1 ring-amber-400/40'
                            : item.status === 'completed'
                            ? 'bg-black/30 border-white/5 opacity-65 hover:opacity-100 hover:bg-white/5'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Top Bar: Icon, Name, Period & Status Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white" style={{ color: item.color }}>
                                  {isPt ? item.namePt : item.nameEn}
                                </span>
                                <span className="text-[8.5px] font-mono text-white/40 uppercase bg-black/40 px-1.5 py-0.2 rounded border border-white/5">
                                  {item.cycleLabel}
                                </span>
                              </div>
                              <span className="text-[8.5px] text-white/50 font-mono block">
                                {item.transitionName}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            item.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : item.status === 'completed'
                              ? 'bg-white/10 text-white/40 border-white/10'
                              : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          }`}>
                            {item.status === 'active' ? (isPt ? '● EM VIGOR' : '● ACTIVE') : item.status === 'completed' ? (isPt ? 'CONCLUÍDA' : 'COMPLETED') : (isPt ? 'PREVISTA' : 'UPCOMING')}
                          </span>
                        </div>

                        {/* Date Grid: Start and End Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-black/40 rounded-xl border border-white/5 text-[9.5px]">
                          {/* Data de Início Prevista */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Data Prevista de Início:' : 'Expected Start Date:'}
                            </span>
                            <div className="flex items-center gap-1 text-white/90 font-bold font-mono">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>{item.startDateFormatted}</span>
                              <span className="text-amber-400/80 font-normal">({item.startTimeFormatted})</span>
                              {item.isStartDstActive && (
                                <span className="text-[7.5px] text-amber-400 font-mono font-normal flex items-center gap-0.5 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20">
                                  <Sun size={8} /> DST
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Data de Término Prevista */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Data Prevista de Término:' : 'Expected End Date:'}
                            </span>
                            <div className="flex items-center gap-1 text-white/90 font-bold font-mono">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              <span>{item.endDateFormatted}</span>
                              <span className="text-amber-400/80 font-normal">({item.endTimeFormatted})</span>
                              {item.isEndDstActive && (
                                <span className="text-[7.5px] text-amber-400 font-mono font-normal flex items-center gap-0.5 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20">
                                  <Sun size={8} /> DST
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Duração Prevista */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Duração Prevista:' : 'Planned Duration:'}
                            </span>
                            <div className="flex items-center gap-1 text-amber-300 font-bold font-mono">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span>{item.durationDays} {isPt ? 'dias' : 'days'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Active Progress Bar if currently running */}
                        {item.status === 'active' && (
                          <div className="mt-2 space-y-1">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${item.progressPercent}%`,
                                  backgroundColor: item.color 
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-white/50">
                              <span>{isPt ? 'Progresso da estação:' : 'Season progress:'} {item.progressPercent.toFixed(1)}%</span>
                              <span style={{ color: item.color }}>{isPt ? 'Transição Astronômica em Andamento' : 'Active Astronomical Shift'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredTimeline.length === 0 && (
                    <div className="p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 text-center">
                      <p className="text-xs text-white/40">
                        {Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0)
                          ? (isPt ? 'Latitude 0° (Linha do Equador): Esta posição não possui estações do ano ao longo do ciclo solar.' : 'Latitude 0° (Equator): This location has no seasons throughout the solar cycle.')
                          : (isPt ? 'Nenhuma temporada encontrada para o filtro selecionado.' : 'No seasons found for the selected filter.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: ALMANAQUE ASTRONÔMICO DE TRANSIÇÕES UTC (1900 A 2100) */}
            {activeTab === 'almanac' && (() => {
              const clampedYear = Math.max(1900, Math.min(2100, almanacYear || currentYear));
              const summary = getAstronomicalSeasonSummary(clampedYear);
              
              const pad2 = (n: number) => n.toString().padStart(2, '0');
              const formatUtcFull = (d: Date) => {
                const day = pad2(d.getUTCDate());
                const month = pad2(d.getUTCMonth() + 1);
                const year = d.getUTCFullYear();
                const hours = pad2(d.getUTCHours());
                const minutes = pad2(d.getUTCMinutes());
                const seconds = pad2(d.getUTCSeconds());
                return {
                  dateStr: `${day}/${month}/${year}`,
                  timeStr: `${hours}:${minutes}:${seconds} UTC`,
                  rawDate: d
                };
              };

              const marchUtc = formatUtcFull(summary.marchEquinoxUtc);
              const juneUtc = formatUtcFull(summary.juneSolsticeUtc);
              const septUtc = formatUtcFull(summary.septemberEquinoxUtc);
              const decUtc = formatUtcFull(summary.decemberSolsticeUtc);

              // Calculate local transition date with DST applied for this specific year
              const getLocalTransitionInfo = (utcDate: Date) => {
                const effectiveBase = (baseOffset !== undefined && !isNaN(baseOffset)) ? baseOffset : offsetMinutes;
                const dstCheck = checkDSTAtEpoch(utcDate.getTime(), effectiveBase, latitude, longitude, location);
                const totalOffset = effectiveBase + (dstCheck.isDst ? dstCheck.shiftMinutes : 0);
                const localEpoch = utcDate.getTime() + totalOffset * 60000;
                const localDate = new Date(localEpoch);
                const weekdayNamesPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const weekdayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const wDay = isPt ? weekdayNamesPt[localDate.getUTCDay()] : weekdayNamesEn[localDate.getUTCDay()];
                const dateStr = `${wDay}, ${pad2(localDate.getUTCDate())}/${pad2(localDate.getUTCMonth() + 1)}/${localDate.getUTCFullYear()}`;
                const timeStr = `${pad2(localDate.getUTCHours())}:${pad2(localDate.getUTCMinutes())}`;
                const daysDiff = Math.ceil((utcDate.getTime() - nowMs) / (24 * 3600000));
                return {
                  localDate,
                  dateStr,
                  timeStr,
                  isDst: dstCheck.isDst,
                  shift: dstCheck.shiftMinutes,
                  totalOffset,
                  rule: dstCheck.ruleDescription,
                  daysDiff
                };
              };

              const marchLocal = getLocalTransitionInfo(summary.marchEquinoxUtc);
              const juneLocal = getLocalTransitionInfo(summary.juneSolsticeUtc);
              const septLocal = getLocalTransitionInfo(summary.septemberEquinoxUtc);
              const decLocal = getLocalTransitionInfo(summary.decemberSolsticeUtc);

              const isZeroLat = Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0);
              const isNorthern = latitude > 0;

              const formatDurationDHM = (daysFloat: number) => {
                const totalSec = Math.round(daysFloat * 86400);
                const d = Math.floor(totalSec / 86400);
                const rem = totalSec % 86400;
                const h = Math.floor(rem / 3600);
                const m = Math.floor((rem % 3600) / 60);
                return `${d}d ${h}h ${m}m (${daysFloat.toFixed(2)}d)`;
              };

              // Filtered list of years for comparative table
              const searchNum = parseInt(almanacSearch.trim(), 10);
              let tableYears: number[] = [];
              if (!isNaN(searchNum) && searchNum >= 1900 && searchNum <= 2100) {
                tableYears = [searchNum];
              } else if (almanacSearch.trim().length > 0) {
                tableYears = Array.from({ length: 201 }, (_, i) => 1900 + i)
                  .filter(y => y.toString().includes(almanacSearch.trim()))
                  .slice(0, 20);
              } else {
                // Show a window around the selected year
                const startW = Math.max(1900, clampedYear - 4);
                const endW = Math.min(2100, clampedYear + 5);
                for (let y = startW; y <= endW; y++) {
                  tableYears.push(y);
                }
              }

              return (
                <div className="space-y-4">
                  {/* Master Header Card */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent rounded-2xl border border-amber-400/30 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-amber-400 animate-spin-slow" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                            {isPt ? 'Almanaque Astronômico de Transições UTC & Horário Civil Local' : 'Astronomical UTC & Local Civil Transitions Almanac'}
                          </h3>
                        </div>
                        <p className="text-[9.5px] text-white/60 mt-1 max-w-2xl leading-relaxed">
                          {isPt 
                            ? 'Calcula com exatidão matemática o início das 4 estações (algoritmo Jean Meeus Cap. 27 com Delta T) e projeta o horário civil local com previsão dinâmica de Horário de Verão (DST).'
                            : 'Calculates exact start of all 4 seasons (Jean Meeus algorithm Ch. 27 with Delta T) and projects local civil time with dynamic Daylight Saving Time (DST) forecasting.'}
                        </p>
                      </div>

                      {/* Current Active Year Badge */}
                      <div className="flex items-center gap-2 shrink-0 bg-black/40 px-3 py-1.5 rounded-xl border border-amber-400/20">
                        <span className="text-[10px] text-white/50 uppercase font-mono">{isPt ? 'Ano Selecionado:' : 'Selected Year:'}</span>
                        <span className="font-mono text-base font-extrabold text-amber-300">{clampedYear}</span>
                      </div>
                    </div>

                    {/* Year Navigation Bar & Sliders */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-col md:flex-row items-center gap-3">
                      {/* Year step controls */}
                      <div className="flex items-center gap-1.5 w-full md:w-auto justify-between md:justify-start">
                        <button
                          type="button"
                          onClick={() => setAlmanacYear(prev => Math.max(1900, prev - 10))}
                          className="px-2 py-1 text-[9px] font-mono bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded border border-white/10 cursor-pointer"
                          title="-10 anos"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlmanacYear(prev => Math.max(1900, prev - 1))}
                          className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                          title={isPt ? 'Ano anterior' : 'Previous year'}
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          value={almanacYear}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setAlmanacYear(val);
                          }}
                          className="w-20 text-center font-mono font-bold text-sm bg-black/50 border border-amber-400/40 rounded-lg py-0.5 text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />

                        <button
                          type="button"
                          onClick={() => setAlmanacYear(prev => Math.min(2100, prev + 1))}
                          className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                          title={isPt ? 'Próximo ano' : 'Next year'}
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlmanacYear(prev => Math.min(2100, prev + 10))}
                          className="px-2 py-1 text-[9px] font-mono bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded border border-white/10 cursor-pointer"
                          title="+10 anos"
                        >
                          +10
                        </button>

                        <button
                          type="button"
                          onClick={() => setAlmanacYear(currentYear)}
                          className="text-[9px] font-mono font-bold px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 rounded border border-amber-400/30 transition-all cursor-pointer ml-1"
                        >
                          {isPt ? 'Hoje' : 'Today'}
                        </button>
                      </div>

                      {/* Quick Epoch Presets */}
                      <div className="flex flex-wrap items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
                        {[
                          { label: '1900', year: 1900 },
                          { label: '1925', year: 1925 },
                          { label: '1950', year: 1950 },
                          { label: '1975', year: 1975 },
                          { label: '2000 (J2000)', year: 2000 },
                          { label: '2024', year: 2024 },
                          { label: '2026', year: 2026 },
                          { label: '2030', year: 2030 },
                          { label: '2050', year: 2050 },
                          { label: '2100', year: 2100 }
                        ].map(p => (
                          <button
                            key={`almanac-preset-${p.label}`}
                            type="button"
                            onClick={() => setAlmanacYear(p.year)}
                            className={`text-[8.5px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                              clampedYear === p.year
                                ? 'bg-amber-400 text-black font-bold border-amber-400'
                                : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4 Cardinal Transitions in UTC and Local Civil (with DST) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. March Equinox */}
                    <div className="p-3.5 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <span>🌱</span> {isPt ? 'Equinócio de Março' : 'March Equinox'}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            λ = 0.0°
                          </span>
                        </div>

                        {/* Local Time with DST indicator */}
                        <div className="p-2 bg-black/40 rounded-xl border border-white/10 mb-2 space-y-1">
                          <span className="text-[7.5px] text-amber-300/80 uppercase font-mono block font-bold">
                            {isPt ? 'Início Civil Local Previsto:' : 'Local Civil Start (Forecast):'}
                          </span>
                          <p className="font-mono text-xs font-black text-white">
                            {marchLocal.dateStr}
                          </p>
                          <p className="font-mono text-sm font-extrabold text-amber-400">
                            {marchLocal.timeStr}
                          </p>
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[8px] font-mono">
                            <span className={marchLocal.isDst ? "text-amber-400 font-bold flex items-center gap-0.5" : "text-white/40 flex items-center gap-0.5"}>
                              <Sun size={9} />
                              <span>{marchLocal.isDst ? `DST (+${marchLocal.shift}m)` : (isPt ? 'Horário Padrão' : 'Standard')}</span>
                            </span>
                            <span className="text-white/40">
                              {marchLocal.daysDiff === 0 ? (isPt ? 'Hoje' : 'Today') : marchLocal.daysDiff > 0 ? `em ${marchLocal.daysDiff}d` : `há ${Math.abs(marchLocal.daysDiff)}d`}
                            </span>
                          </div>
                        </div>

                        {/* Astronomical UTC Start */}
                        <div className="text-[8px] font-mono text-white/40 mb-2">
                          <span>UTC: {marchUtc.dateStr} {marchUtc.timeStr}</span>
                        </div>

                        {/* Local Season Breakdown */}
                        <div className="p-2 bg-black/30 rounded-xl border border-white/5 text-[8.5px] text-white/70 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Norte:' : 'North:'}</span>
                            <span className={`font-bold ${isNorthern ? 'text-amber-400 underline underline-offset-2' : 'text-emerald-300'}`}>
                              {isPt ? 'Primavera' : 'Spring'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Sul:' : 'South:'}</span>
                            <span className={`font-bold ${!isNorthern && !isZeroLat ? 'text-amber-400 underline underline-offset-2' : 'text-amber-300'}`}>
                              {isPt ? 'Outono' : 'Autumn'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[8px] font-mono text-white/50 flex justify-between">
                        <span>{isPt ? 'Duração:' : 'Duration:'}</span>
                        <span className="text-white font-bold">{formatDurationDHM(summary.springNorthDays)}</span>
                      </div>
                    </div>

                    {/* 2. June Solstice */}
                    <div className="p-3.5 bg-gradient-to-b from-amber-500/10 to-transparent rounded-2xl border border-amber-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <span>☀️</span> {isPt ? 'Solstício de Junho' : 'June Solstice'}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            λ = 90.0°
                          </span>
                        </div>

                        {/* Local Time with DST indicator */}
                        <div className="p-2 bg-black/40 rounded-xl border border-white/10 mb-2 space-y-1">
                          <span className="text-[7.5px] text-amber-300/80 uppercase font-mono block font-bold">
                            {isPt ? 'Início Civil Local Previsto:' : 'Local Civil Start (Forecast):'}
                          </span>
                          <p className="font-mono text-xs font-black text-white">
                            {juneLocal.dateStr}
                          </p>
                          <p className="font-mono text-sm font-extrabold text-amber-400">
                            {juneLocal.timeStr}
                          </p>
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[8px] font-mono">
                            <span className={juneLocal.isDst ? "text-amber-400 font-bold flex items-center gap-0.5" : "text-white/40 flex items-center gap-0.5"}>
                              <Sun size={9} />
                              <span>{juneLocal.isDst ? `DST (+${juneLocal.shift}m)` : (isPt ? 'Horário Padrão' : 'Standard')}</span>
                            </span>
                            <span className="text-white/40">
                              {juneLocal.daysDiff === 0 ? (isPt ? 'Hoje' : 'Today') : juneLocal.daysDiff > 0 ? `em ${juneLocal.daysDiff}d` : `há ${Math.abs(juneLocal.daysDiff)}d`}
                            </span>
                          </div>
                        </div>

                        {/* Astronomical UTC Start */}
                        <div className="text-[8px] font-mono text-white/40 mb-2">
                          <span>UTC: {juneUtc.dateStr} {juneUtc.timeStr}</span>
                        </div>

                        {/* Local Season Breakdown */}
                        <div className="p-2 bg-black/30 rounded-xl border border-white/5 text-[8.5px] text-white/70 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Norte:' : 'North:'}</span>
                            <span className={`font-bold ${isNorthern ? 'text-amber-400 underline underline-offset-2' : 'text-amber-300'}`}>
                              {isPt ? 'Verão (Mais longo)' : 'Summer (Longest)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Sul:' : 'South:'}</span>
                            <span className={`font-bold ${!isNorthern && !isZeroLat ? 'text-amber-400 underline underline-offset-2' : 'text-sky-300'}`}>
                              {isPt ? 'Inverno' : 'Winter'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[8px] font-mono text-white/50 flex justify-between">
                        <span>{isPt ? 'Duração:' : 'Duration:'}</span>
                        <span className="text-white font-bold">{formatDurationDHM(summary.summerNorthDays)}</span>
                      </div>
                    </div>

                    {/* 3. September Equinox */}
                    <div className="p-3.5 bg-gradient-to-b from-orange-500/10 to-transparent rounded-2xl border border-orange-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                            <span>🍂</span> {isPt ? 'Equinócio de Setembro' : 'September Equinox'}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            λ = 180.0°
                          </span>
                        </div>

                        {/* Local Time with DST indicator */}
                        <div className="p-2 bg-black/40 rounded-xl border border-white/10 mb-2 space-y-1">
                          <span className="text-[7.5px] text-amber-300/80 uppercase font-mono block font-bold">
                            {isPt ? 'Início Civil Local Previsto:' : 'Local Civil Start (Forecast):'}
                          </span>
                          <p className="font-mono text-xs font-black text-white">
                            {septLocal.dateStr}
                          </p>
                          <p className="font-mono text-sm font-extrabold text-amber-400">
                            {septLocal.timeStr}
                          </p>
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[8px] font-mono">
                            <span className={septLocal.isDst ? "text-amber-400 font-bold flex items-center gap-0.5" : "text-white/40 flex items-center gap-0.5"}>
                              <Sun size={9} />
                              <span>{septLocal.isDst ? `DST (+${septLocal.shift}m)` : (isPt ? 'Horário Padrão' : 'Standard')}</span>
                            </span>
                            <span className="text-white/40">
                              {septLocal.daysDiff === 0 ? (isPt ? 'Hoje' : 'Today') : septLocal.daysDiff > 0 ? `em ${septLocal.daysDiff}d` : `há ${Math.abs(septLocal.daysDiff)}d`}
                            </span>
                          </div>
                        </div>

                        {/* Astronomical UTC Start */}
                        <div className="text-[8px] font-mono text-white/40 mb-2">
                          <span>UTC: {septUtc.dateStr} {septUtc.timeStr}</span>
                        </div>

                        {/* Local Season Breakdown */}
                        <div className="p-2 bg-black/30 rounded-xl border border-white/5 text-[8.5px] text-white/70 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Norte:' : 'North:'}</span>
                            <span className={`font-bold ${isNorthern ? 'text-amber-400 underline underline-offset-2' : 'text-orange-300'}`}>
                              {isPt ? 'Outono' : 'Autumn'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Sul:' : 'South:'}</span>
                            <span className={`font-bold ${!isNorthern && !isZeroLat ? 'text-amber-400 underline underline-offset-2' : 'text-emerald-300'}`}>
                              {isPt ? 'Primavera' : 'Spring'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[8px] font-mono text-white/50 flex justify-between">
                        <span>{isPt ? 'Duração:' : 'Duration:'}</span>
                        <span className="text-white font-bold">{formatDurationDHM(summary.autumnNorthDays)}</span>
                      </div>
                    </div>

                    {/* 4. December Solstice */}
                    <div className="p-3.5 bg-gradient-to-b from-sky-500/10 to-transparent rounded-2xl border border-sky-500/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                            <span>❄️</span> {isPt ? 'Solstício de Dezembro' : 'December Solstice'}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            λ = 270.0°
                          </span>
                        </div>

                        {/* Local Time with DST indicator */}
                        <div className="p-2 bg-black/40 rounded-xl border border-white/10 mb-2 space-y-1">
                          <span className="text-[7.5px] text-amber-300/80 uppercase font-mono block font-bold">
                            {isPt ? 'Início Civil Local Previsto:' : 'Local Civil Start (Forecast):'}
                          </span>
                          <p className="font-mono text-xs font-black text-white">
                            {decLocal.dateStr}
                          </p>
                          <p className="font-mono text-sm font-extrabold text-amber-400">
                            {decLocal.timeStr}
                          </p>
                          <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[8px] font-mono">
                            <span className={decLocal.isDst ? "text-amber-400 font-bold flex items-center gap-0.5" : "text-white/40 flex items-center gap-0.5"}>
                              <Sun size={9} />
                              <span>{decLocal.isDst ? `DST (+${decLocal.shift}m)` : (isPt ? 'Horário Padrão' : 'Standard')}</span>
                            </span>
                            <span className="text-white/40">
                              {decLocal.daysDiff === 0 ? (isPt ? 'Hoje' : 'Today') : decLocal.daysDiff > 0 ? `em ${decLocal.daysDiff}d` : `há ${Math.abs(decLocal.daysDiff)}d`}
                            </span>
                          </div>
                        </div>

                        {/* Astronomical UTC Start */}
                        <div className="text-[8px] font-mono text-white/40 mb-2">
                          <span>UTC: {decUtc.dateStr} {decUtc.timeStr}</span>
                        </div>

                        {/* Local Season Breakdown */}
                        <div className="p-2 bg-black/30 rounded-xl border border-white/5 text-[8.5px] text-white/70 space-y-0.5">
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Norte:' : 'North:'}</span>
                            <span className={`font-bold ${isNorthern ? 'text-amber-400 underline underline-offset-2' : 'text-sky-300'}`}>
                              {isPt ? 'Inverno (Mais curto)' : 'Winter (Shortest)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isPt ? 'Hemisfério Sul:' : 'South:'}</span>
                            <span className={`font-bold ${!isNorthern && !isZeroLat ? 'text-amber-400 underline underline-offset-2' : 'text-amber-300'}`}>
                              {isPt ? 'Verão' : 'Summer'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/5 text-[8px] font-mono text-white/50 flex justify-between">
                        <span>{isPt ? 'Duração:' : 'Duration:'}</span>
                        <span className="text-white font-bold">{formatDurationDHM(summary.winterNorthDays)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Keplerian Orbital Dynamics & Duration Insight Card */}
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {isPt ? 'Mecânica Celeste: Variação das Durações Sazonais (2ª Lei de Kepler)' : 'Celestial Mechanics: Keplerian Seasonal Durations'}
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                        {isPt ? 'Ano Trópico:' : 'Tropical Year:'} {summary.tropicalYearDays.toFixed(4)} {isPt ? 'dias' : 'days'}
                      </span>
                    </div>

                    <p className="text-[9px] text-white/60 leading-relaxed">
                      {isPt 
                        ? 'Como a órbita da Terra é elíptica, a velocidade de translação varia (mais rápida no Periélio em janeiro a ~30.29 km/s, e mais lenta no Afélio em julho a ~29.29 km/s). Por isso, o Verão no Norte (Inverno no Sul) dura ~93.65 dias, enquanto o Inverno no Norte (Verão no Sul) é o mais curto, com ~88.99 dias.'
                        : 'Because Earth orbits in an ellipse, its orbital velocity varies (fastest at Perihelion in January at ~30.29 km/s, slowest at Aphelion in July at ~29.29 km/s). Northern Summer (Southern Winter) lasts ~93.65 days, whereas Northern Winter (Southern Summer) lasts only ~88.99 days.'}
                    </p>

                    {/* Proportional Duration Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-3 bg-white/5 rounded-lg overflow-hidden flex text-[8px] font-mono font-bold text-black text-center leading-3">
                        <div 
                          style={{ width: `${(summary.springNorthDays / summary.tropicalYearDays) * 100}%` }}
                          className="bg-emerald-400 flex items-center justify-center overflow-hidden"
                          title={`Mar-Jun: ${summary.springNorthDays}d`}
                        >
                          {summary.springNorthDays.toFixed(1)}d
                        </div>
                        <div 
                          style={{ width: `${(summary.summerNorthDays / summary.tropicalYearDays) * 100}%` }}
                          className="bg-amber-400 flex items-center justify-center overflow-hidden"
                          title={`Jun-Set: ${summary.summerNorthDays}d`}
                        >
                          {summary.summerNorthDays.toFixed(1)}d
                        </div>
                        <div 
                          style={{ width: `${(summary.autumnNorthDays / summary.tropicalYearDays) * 100}%` }}
                          className="bg-orange-400 flex items-center justify-center overflow-hidden"
                          title={`Set-Dez: ${summary.autumnNorthDays}d`}
                        >
                          {summary.autumnNorthDays.toFixed(1)}d
                        </div>
                        <div 
                          style={{ width: `${(summary.winterNorthDays / summary.tropicalYearDays) * 100}%` }}
                          className="bg-sky-400 flex items-center justify-center overflow-hidden"
                          title={`Dez-Mar: ${summary.winterNorthDays}d`}
                        >
                          {summary.winterNorthDays.toFixed(1)}d
                        </div>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-white/40">
                        <span className="text-emerald-400">● {isPt ? 'Março a Junho' : 'March to June'}</span>
                        <span className="text-amber-400">● {isPt ? 'Junho a Setembro (Máxima)' : 'June to Sept (Max)'}</span>
                        <span className="text-orange-400">● {isPt ? 'Setembro a Dezembro' : 'Sept to Dec'}</span>
                        <span className="text-sky-400">● {isPt ? 'Dezembro a Março (Mínima)' : 'Dec to March (Min)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Multi-Year Ephemeris Table (1900 to 2100) */}
                  <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {isPt ? 'Tabela Comparativa de Efemérides UTC (1900 a 2100)' : 'Comparative UTC Ephemeris Table (1900 to 2100)'}
                        </h4>
                      </div>

                      {/* Search Filter input */}
                      <div className="relative w-full sm:w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          placeholder={isPt ? 'Buscar ano (1900..2100)...' : 'Search year (1900..2100)...'}
                          value={almanacSearch}
                          onChange={(e) => setAlmanacSearch(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1 text-[9.5px] font-mono bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[9px] font-mono text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-white/40 uppercase bg-black/40">
                            <th className="p-2">{isPt ? 'Ano' : 'Year'}</th>
                            <th className="p-2 text-emerald-400">{isPt ? 'Equinócio Março (UTC)' : 'March Equinox (UTC)'}</th>
                            <th className="p-2 text-amber-400">{isPt ? 'Solstício Junho (UTC)' : 'June Solstice (UTC)'}</th>
                            <th className="p-2 text-orange-400">{isPt ? 'Equinócio Setembro (UTC)' : 'Sept Equinox (UTC)'}</th>
                            <th className="p-2 text-sky-400">{isPt ? 'Solstício Dezembro (UTC)' : 'Dec Solstice (UTC)'}</th>
                            <th className="p-2 text-right">{isPt ? 'Ação' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {tableYears.map((yearNum, index) => {
                            const rowSummary = getAstronomicalSeasonSummary(yearNum);
                            const m = formatUtcFull(rowSummary.marchEquinoxUtc);
                            const j = formatUtcFull(rowSummary.juneSolsticeUtc);
                            const s = formatUtcFull(rowSummary.septemberEquinoxUtc);
                            const d = formatUtcFull(rowSummary.decemberSolsticeUtc);
                            const isSelected = yearNum === clampedYear;

                            return (
                              <tr 
                                key={`ephemeris-row-${yearNum}-${index}`} 
                                className={`transition-colors hover:bg-white/5 ${isSelected ? 'bg-amber-400/10 font-bold' : ''}`}
                              >
                                <td className="p-2 font-bold text-amber-300">
                                  {yearNum} {yearNum === currentYear && <span className="text-[7.5px] text-emerald-400 ml-1">● {isPt ? 'ATUAL' : 'NOW'}</span>}
                                </td>
                                <td className="p-2 text-white/90">
                                  {m.dateStr} <span className="text-emerald-400/80">{m.timeStr}</span>
                                </td>
                                <td className="p-2 text-white/90">
                                  {j.dateStr} <span className="text-amber-400/80">{j.timeStr}</span>
                                </td>
                                <td className="p-2 text-white/90">
                                  {s.dateStr} <span className="text-orange-400/80">{s.timeStr}</span>
                                </td>
                                <td className="p-2 text-white/90">
                                  {d.dateStr} <span className="text-sky-400/80">{d.timeStr}</span>
                                </td>
                                <td className="p-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAlmanacYear(yearNum);
                                      setLocalConfig(prev => ({
                                        ...prev,
                                        targetYear: yearNum,
                                        endYear: prev.isRangeMode ? Math.max(yearNum, prev.endYear || yearNum) : yearNum
                                      }));
                                    }}
                                    className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-400 text-black font-bold'
                                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                                    }`}
                                  >
                                    {isPt ? 'Inspecionar' : 'Inspect'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 3: MUDANÇA DE HORÁRIO SAZONAL (HORÁRIO DE VERÃO / TIME SHIFTS) */}
            {activeTab === 'timechange' && (
              <div className="space-y-4">
                {/* 3.1 Time Change Master Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock4 className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Mudanças de Horário Sazonal (Horário de Verão / DST)' : 'Seasonal Time Changes (Daylight Saving)'}
                      </h3>
                    </div>
                    {/* Enable / Disable Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/60">
                        {localConfig.timeChange?.enabled ? (isPt ? 'ATIVADO' : 'ENABLED') : (isPt ? 'DESATIVADO' : 'DISABLED')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLocalConfig(prev => ({
                          ...prev,
                          timeChange: {
                            ...prev.timeChange,
                            enabled: !prev.timeChange?.enabled
                          }
                        }))}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                          localConfig.timeChange?.enabled ? 'bg-amber-400' : 'bg-white/20'
                        }`}
                      >
                        <div 
                          className={`w-3.5 h-3.5 rounded-full bg-black absolute top-0.75 transition-transform ${
                            localConfig.timeChange?.enabled ? 'left-5.5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Scope Notice & Copy Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 bg-black/40 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2 text-[10px] text-amber-200">
                      <span className="font-bold uppercase tracking-wider text-amber-400 font-mono">📍 {isPt ? 'Variação Local' : 'Local Variation'}:</span>
                      <span className="text-white/70">{isPt ? 'Esta regra é local e não é aplicada globalmente para outros locais do mundo.' : 'This rule is local and not applied globally to other world locations.'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleCopySeasonalVariation}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-[9.5px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title={isPt ? "Copiar regras e datas da variação sazonal" : "Copy seasonal variation rules"}
                      >
                        {copiedVariationFeedback ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedVariationFeedback ? (isPt ? 'Copiado!' : 'Copied!') : (isPt ? 'Copiar Variação' : 'Copy Variation')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePasteSeasonalVariation}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[9.5px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title={isPt ? "Colar variação sazonal copiada" : "Paste copied seasonal variation"}
                      >
                        <span>📋</span>
                        <span>{isPt ? 'Colar' : 'Paste'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Local DST Status & Astronomical Forecast Banner */}
                  <div className="p-3.5 bg-black/40 rounded-xl border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          {isPt ? 'Regime de Horário de Verão do Local Atual' : 'Current Location Daylight Saving Policy'}
                        </span>
                        <span className="text-[8.5px] font-mono font-bold px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {localDstForecast.statusLabelPt}
                        </span>
                      </div>
                      <p className="text-[9px] text-white/50">
                        {location?.name ? `${location.name} — ` : ''}{localDstForecast.ruleDescription}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[8.5px] font-mono text-white/40 block">
                        {isPt ? 'Variação nas Estações:' : 'Seasonal Shift:'}
                      </span>
                      <span className="text-[9.5px] font-mono text-amber-300 font-bold">
                        {localDstForecast.isCurrentlyActive ? '+60 min no relógio' : (isPt ? 'Sem adiantamento ativo' : 'No active shift')}
                      </span>
                    </div>
                  </div>

                  {/* 3.1 Nomenclatura / Prefixo dos Períodos e Entre Temporadas */}
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🏷️</span>
                          <span className="text-xs font-bold text-white block">
                            {isPt ? 'Nomeclatura dos Períodos / Entre Temporadas:' : 'Period Naming & Inter-Season Label:'}
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50 block mt-0.5">
                          {isPt 
                            ? 'Escolha qualquer nome ou termo no lugar de "Temporada" para os períodos e entre temporadas.' 
                            : 'Choose any custom name instead of "Season" for the periods and inter-season vigencies.'}
                        </span>
                      </div>

                      {/* Live preview badge */}
                      <div className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[9px] font-bold flex items-center gap-1 self-start sm:self-auto">
                        <span className="opacity-60 text-[8px]">{isPt ? 'Exibição:' : 'Display:'}</span>
                        <span>
                          {localConfig.timeChange?.seasonPrefix ? `${localConfig.timeChange.seasonPrefix} ` : ''}
                          {localConfig.timeChange?.format === 'range' 
                            ? `${localConfig.timeChange?.startYear || currentYear}/${(localConfig.timeChange?.startYear || currentYear) + 1}` 
                            : `${localConfig.timeChange?.startYear || currentYear}`}
                        </span>
                      </div>
                    </div>

                    {/* Pre-set Naming Options + Custom Text Input */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'entre_temporadas', prefix: 'Entre Temporadas', icon: '🌴', labelPt: 'Entre Temporadas', labelEn: 'Inter-Seasons' },
                          { id: 'horario_verao', prefix: 'Horário de Verão', icon: '☀️', labelPt: 'Horário de Verão', labelEn: 'Daylight Saving' },
                          { id: 'ciclo', prefix: 'Ciclo', icon: '🔄', labelPt: 'Ciclo', labelEn: 'Cycle' },
                          { id: 'safra', prefix: 'Safra', icon: '🌾', labelPt: 'Safra / Período', labelEn: 'Harvest / Period' },
                          { id: 'temporada', prefix: 'Temporada', icon: '📅', labelPt: 'Temporada', labelEn: 'Season' },
                          { id: 'periodo', prefix: 'Período', icon: '⏱️', labelPt: 'Período', labelEn: 'Period' },
                          { id: 'empty', prefix: '', icon: '🔢', labelPt: 'Apenas Anos (Sem Prefixo)', labelEn: 'Years Only (No Prefix)' },
                        ].map(opt => {
                          const isSelected = (localConfig.timeChange?.seasonPrefix ?? 'Entre Temporadas') === opt.prefix;
                          return (
                            <button
                              key={`prefix-opt-${opt.id}`}
                              type="button"
                              onClick={() => setLocalConfig(prev => ({
                                ...prev,
                                timeChange: {
                                  ...prev.timeChange,
                                  seasonPrefix: opt.prefix
                                }
                              }))}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm ring-1 ring-amber-400/50'
                                  : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
                              }`}
                            >
                              <span>{opt.icon}</span>
                              <span>{isPt ? opt.labelPt : opt.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom text field for any free-form name */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[8.5px] font-mono uppercase text-white/50 shrink-0">
                          {isPt ? '✍️ Digite Qualquer Nome Personalizado:' : '✍️ Type Any Custom Name:'}
                        </span>
                        <input
                          type="text"
                          value={localConfig.timeChange?.seasonPrefix ?? 'Entre Temporadas'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalConfig(prev => ({
                              ...prev,
                              timeChange: {
                                ...prev.timeChange,
                                seasonPrefix: val
                              }
                            }));
                          }}
                          placeholder={isPt ? "Ex: Entre Temporadas, Estação Solar, Operação Verão, Ciclo..." : "e.g. Inter-Season, Solar Station, Summer Operation..."}
                          className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold placeholder-white/30 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Formato dos Anos de Temporada Vigentes (XXX1 a XXX4 ou XXX1/XXX2 a XXX3/XXX4) */}
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {isPt ? 'Anos de Temporada Vigentes:' : 'Effective Season Years Format:'}
                        </span>
                        <span className="text-[9px] text-white/50">
                          {isPt 
                            ? 'Escolha a temporada que inicia e encerra as mudanças sazonais.' 
                            : 'Choose the seasons that start and conclude the time changes.'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            timeChange: {
                              ...prev.timeChange,
                              format: 'single'
                            }
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            localConfig.timeChange?.format === 'single'
                              ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {isPt ? 'XXX1 a XXX4' : 'XXX1 to XXX4'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            timeChange: {
                              ...prev.timeChange,
                              format: 'range'
                            }
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            localConfig.timeChange?.format === 'range'
                              ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {isPt ? 'XXX1/XXX2 a XXX3/XXX4' : 'XXX1/XXX2 to XXX3/XXX4'}
                        </button>
                      </div>
                    </div>

                    {/* Pickers for Start Season and End Season */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Temporada que Inicia */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-[8.5px] font-mono text-white/40 uppercase block">
                            {isPt ? 'Temporada que Inicia:' : 'Start Season Year:'}
                          </span>
                          <span className="font-mono font-bold text-sm text-amber-300">
                            {localConfig.timeChange?.format === 'single' 
                              ? `${localConfig.timeChange?.startYear}` 
                              : `${localConfig.timeChange?.startYear}/${(localConfig.timeChange?.startYear || currentYear) + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newStart = (localConfig.timeChange?.startYear || currentYear) - 1;
                              const currentCount = configuredSeasonCount;
                              setLocalConfig(prev => ({
                                ...prev,
                                timeChange: {
                                  ...prev.timeChange,
                                  startYear: newStart,
                                  endYear: newStart + currentCount - 1
                                }
                              }));
                            }}
                            className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <span className="font-mono text-xs px-1 text-white font-bold">
                            {localConfig.timeChange?.startYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newStart = (localConfig.timeChange?.startYear || currentYear) + 1;
                              const currentCount = configuredSeasonCount;
                              setLocalConfig(prev => ({
                                ...prev,
                                timeChange: {
                                  ...prev.timeChange,
                                  startYear: newStart,
                                  endYear: newStart + currentCount - 1
                                }
                              }));
                            }}
                            className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Temporada que Encerra */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-[8.5px] font-mono text-white/40 uppercase block">
                            {isPt ? 'Temporada que Encerra:' : 'End Season Year:'}
                          </span>
                          <span className={`font-mono font-bold text-sm ${localConfig.endScopeType === 'permanent' || localConfig.vigencyScope === 'permanent' ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {localConfig.endScopeType === 'permanent' || localConfig.vigencyScope === 'permanent'
                              ? (isPt ? 'Permanente (Sem Expiração)' : 'Permanent (No Expiration)')
                              : (localConfig.timeChange?.format === 'single' 
                                  ? `${localConfig.timeChange?.endYear}` 
                                  : `${localConfig.timeChange?.endYear}/${(localConfig.timeChange?.endYear || currentYear) + 1}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {localConfig.endScopeType === 'permanent' || localConfig.vigencyScope === 'permanent' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLocalConfig(prev => ({
                                  ...prev,
                                  endScopeType: 'year',
                                  vigencyScope: 'range',
                                  timeChange: {
                                    ...prev.timeChange,
                                    endYear: (prev.timeChange?.startYear || currentYear) + 5,
                                    seasonCount: 6
                                  }
                                }));
                              }}
                              className="text-[8.5px] font-mono px-2 py-1 rounded bg-amber-400 text-black font-bold cursor-pointer"
                            >
                              {isPt ? 'Definir Ano Fim' : 'Set End Year'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || currentYear;
                                  const newEnd = Math.max(startY, (localConfig.timeChange?.endYear || currentYear) - 1);
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: newEnd,
                                      seasonCount: Math.max(1, newEnd - startY + 1)
                                    }
                                  }));
                                }}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <span className="font-mono text-xs px-1 text-white font-bold">
                                {localConfig.timeChange?.endYear}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || currentYear;
                                  const newEnd = (localConfig.timeChange?.endYear || currentYear) + 1;
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: newEnd,
                                      seasonCount: Math.max(1, newEnd - startY + 1)
                                    }
                                  }));
                                }}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                              >
                                <ChevronRight size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || currentYear;
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    endScopeType: 'permanent',
                                    vigencyScope: 'permanent',
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: startY + 15,
                                      seasonCount: 16
                                    }
                                  }));
                                }}
                                className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-bold cursor-pointer ml-1"
                                title={isPt ? "Mudar término para Permanente" : "Set end to Permanent"}
                              >
                                {isPt ? 'Permanente' : 'Permanent'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick year range presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[8px] font-mono text-white/40 uppercase">{isPt ? 'Exemplos / Atalhos de Vigência:' : 'Vigency Presets & Examples:'}</span>
                      {(() => {
                        const presets = [
                          {
                            label: `${currentYear} a ${currentYear + 5} (XXX1 a XXX6)`,
                            start: currentYear,
                            end: currentYear + 5,
                            format: 'single' as const,
                            permanent: false
                          },
                          {
                            label: `${currentYear}/${currentYear + 1} a ${currentYear + 5}/${currentYear + 6} (XXX1/XXX2 a XXX6/XXX7)`,
                            start: currentYear,
                            end: currentYear + 5,
                            format: 'range' as const,
                            permanent: false
                          },
                          {
                            label: `${currentYear - 5} a Permanente (XXX9 a Permanente)`,
                            start: currentYear - 5,
                            end: currentYear + 10,
                            format: 'single' as const,
                            permanent: true
                          },
                          {
                            label: `${currentYear - 5}/${currentYear - 4} a Permanente (XXX9/XX10 a Permanente)`,
                            start: currentYear - 5,
                            end: currentYear + 10,
                            format: 'range' as const,
                            permanent: true
                          },
                          {
                            label: isPt ? 'Permanente (Para Sempre)' : 'Permanent (Forever)',
                            start: currentYear,
                            end: currentYear + 15,
                            format: localConfig.timeChange?.format || 'range',
                            permanent: true
                          }
                        ];

                        return presets.map((preset, pIdx) => (
                          <button
                            key={`time-preset-${pIdx}`}
                            type="button"
                            onClick={() => setLocalConfig(prev => ({
                              ...prev,
                              endScopeType: preset.permanent ? 'permanent' : 'year',
                              vigencyScope: preset.permanent ? 'permanent' : 'range',
                              timeChange: {
                                ...prev.timeChange,
                                format: preset.format,
                                startYear: preset.start,
                                endYear: preset.end,
                                seasonCount: preset.end - preset.start + 1
                              }
                            }))}
                            className={`text-[8.5px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              localConfig.timeChange?.startYear === preset.start && 
                              (preset.permanent 
                                ? (localConfig.endScopeType === 'permanent' || localConfig.vigencyScope === 'permanent')
                                : localConfig.timeChange?.endYear === preset.end && localConfig.timeChange?.format === preset.format)
                                ? 'bg-amber-400 text-black font-bold border-amber-400'
                                : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* 3.1.5 QUANTAS TEMPORADAS PODE / QUANTIDADE DE TEMPORADAS (ILIMITADAS) */}
                  <div className="p-4 bg-gradient-to-r from-amber-500/10 via-black/40 to-black/40 rounded-xl border border-amber-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wide">
                              {isPt ? 'Quantas Temporadas Deseja (Capacidade Ilimitada)' : 'Season Quantity (Unlimited Multi-Seasons)'}
                            </span>
                            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black">
                              {configuredSeasonCount} {isPt ? (configuredSeasonCount === 1 ? 'Temporada' : 'Temporadas') : 'Seasons'}
                            </span>
                          </div>
                          <span className="text-[9px] text-white/50 block">
                            {isPt 
                              ? 'Adicione e configure quantas temporadas de mudança sazonal desejar para cálculo contínuo.' 
                              : 'Define and generate any number of seasonal time change cycles without limits.'}
                          </span>
                        </div>
                      </div>

                      {/* Stepper and Add Buttons */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center bg-black/70 border border-white/20 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleAddSeasonCount(-1)}
                            disabled={configuredSeasonCount <= 1}
                            title={isPt ? "Diminuir 1 temporada" : "Decrease 1 season"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                          >
                            -
                          </button>
                          
                          <div className="px-2.5 flex items-center gap-1 text-center">
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={configuredSeasonCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 1) handleSetSeasonCount(val);
                              }}
                              className="w-10 text-center text-xs font-mono font-black text-amber-300 bg-transparent focus:outline-none"
                            />
                            <span className="text-[9px] font-mono text-white/40">
                              {isPt ? 'temp.' : 'seas.'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddSeasonCount(1)}
                            title={isPt ? "Aumentar 1 temporada" : "Increase 1 season"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer transition-all"
                          >
                            +
                          </button>
                        </div>

                        {/* Quick Action Button: Add Season */}
                        <button
                          type="button"
                          onClick={() => handleAddSeasonCount(1)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-[10px] uppercase shadow hover:bg-amber-300 active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isPt ? '+1 Temporada' : '+1 Season'}</span>
                        </button>

                        {/* Custom Season Creator Trigger */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomCreator()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] border border-white/20 shadow active:scale-95 transition-all cursor-pointer"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isPt ? 'Criar Personalizada' : 'Create Custom'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick presets for season counts (1, 2, 3, 4, 5, 8, 10, 15, 20, 30, 50, 100) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                      <span className="text-[8px] font-mono text-white/40 uppercase">
                        {isPt ? 'Quantidades Rápidas:' : 'Quick Season Counts:'}
                      </span>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100].map(cnt => (
                        <button
                          key={`season-count-chip-${cnt}`}
                          type="button"
                          onClick={() => handleSetSeasonCount(cnt)}
                          className={`text-[8.5px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            configuredSeasonCount === cnt
                              ? 'bg-amber-400 text-black font-extrabold border-amber-400 shadow-sm'
                              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {cnt} {isPt ? (cnt === 1 ? 'Temp' : 'Temps') : 'Seas'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3.1.6 CUSTOM SEASON BUILDER MODAL / ACCORDION */}
                  <AnimatePresence>
                    {showCustomSeasonCreator && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-br from-amber-500/15 via-black/60 to-black/80 rounded-2xl border border-amber-400/50 shadow-xl space-y-3.5">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <CalendarPlus className="w-4 h-4 text-amber-400" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {editingSeasonId 
                                  ? (isPt ? 'Editar Temporada de Mudança Sazonal' : 'Edit Seasonal Time Change') 
                                  : (isPt ? 'Adicionar Temporada Personalizada Sob Medida' : 'Add Custom Tailored Season')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomSeasonCreator(false);
                                setEditingSeasonId(null);
                              }}
                              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Nome do Período Personalizado / Entre Temporadas */}
                          <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[8.5px] font-mono uppercase text-amber-300 font-bold block">
                                {isPt ? '🏷️ Nome Personalizado do Período (Opcional):' : '🏷️ Custom Period Name (Optional):'}
                              </label>
                              <span className="text-[8px] text-white/40 font-mono">
                                {isPt ? 'Ex: Entre Temporadas 2026/2027, Verão 2026' : 'e.g. Inter-Season 2026/2027'}
                              </span>
                            </div>
                            <input
                              type="text"
                              value={customDraft.customName}
                              onChange={(e) => setCustomDraft(prev => ({ ...prev, customName: e.target.value }))}
                              placeholder={isPt ? "Digite qualquer nome para este período (ex: Entre Temporadas 2026/2027)" : "Enter custom name for this period"}
                              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold placeholder-white/30 focus:border-amber-400 focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {[
                                `Entre Temporadas ${customDraft.seasonLabel || customDraft.startYear}`,
                                `Horário de Verão ${customDraft.seasonLabel || customDraft.startYear}`,
                                `Ciclo ${customDraft.seasonLabel || customDraft.startYear}`,
                                `Safra ${customDraft.seasonLabel || customDraft.startYear}`,
                                `Período ${customDraft.seasonLabel || customDraft.startYear}`,
                              ].map((suggestion, sIdx) => (
                                <button
                                  key={`draft-sugg-${sIdx}`}
                                  type="button"
                                  onClick={() => setCustomDraft(prev => ({ ...prev, customName: suggestion }))}
                                  className="text-[7.5px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-amber-300 border border-white/10 cursor-pointer"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Rótulo / Ano da Temporada */}
                            <div>
                              <label className="text-[8.5px] font-mono uppercase text-white/60 block mb-1">
                                {isPt ? 'Rótulo / Anos da Temporada:' : 'Season Label / Years:'}
                              </label>
                              <input
                                type="text"
                                value={customDraft.seasonLabel}
                                onChange={(e) => setCustomDraft(prev => ({ ...prev, seasonLabel: e.target.value }))}
                                placeholder={localConfig.timeChange?.format === 'range' ? `${customDraft.startYear}/${customDraft.endYear}` : `${customDraft.startYear}`}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                              />
                              <div className="flex flex-wrap gap-1 pt-1">
                                {[
                                  { label: `${customDraft.startYear}`, tag: 'XXX1' },
                                  { label: `${customDraft.startYear}/${customDraft.startYear + 1}`, tag: 'XXX1/XXX2' },
                                  { label: `${customDraft.startYear} a ${customDraft.endYear || customDraft.startYear + 3}`, tag: 'XXX1 a XXX4' },
                                  { label: `${customDraft.startYear}/${customDraft.startYear + 1} a ${customDraft.endYear || customDraft.startYear + 3}/${(customDraft.endYear || customDraft.startYear + 3) + 1}`, tag: 'XXX1/XXX2 a XXX4/XXX5' },
                                ].map((opt, oIdx) => (
                                  <button
                                    key={`draft-lbl-opt-${oIdx}`}
                                    type="button"
                                    onClick={() => setCustomDraft(prev => ({ ...prev, seasonLabel: opt.label }))}
                                    className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-amber-300 border border-white/10 cursor-pointer"
                                    title={opt.label}
                                  >
                                    {opt.tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Ano Início */}
                            <div>
                              <label className="text-[8.5px] font-mono uppercase text-white/60 block mb-1">
                                {isPt ? 'Ano Inicial:' : 'Start Year:'}
                              </label>
                              <input
                                type="number"
                                value={customDraft.startYear}
                                onChange={(e) => {
                                  const yr = parseInt(e.target.value, 10) || currentYear;
                                  setCustomDraft(prev => ({
                                    ...prev,
                                    startYear: yr,
                                    endYear: yr + (localConfig.timeChange?.format === 'range' ? 1 : 0),
                                    seasonLabel: localConfig.timeChange?.format === 'range' ? `${yr}/${yr + 1}` : `${yr}`
                                  }));
                                }}
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                              />
                            </div>

                            {/* Desvio Específico */}
                            <div>
                              <label className="text-[8.5px] font-mono uppercase text-white/60 block mb-1">
                                {isPt ? 'Desvio de Horário:' : 'Time Shift:'}
                              </label>
                              <div className="flex items-center gap-1">
                                {[60, 30, -60].map(m => (
                                  <button
                                    key={`draft-shift-${m}`}
                                    type="button"
                                    onClick={() => setCustomDraft(prev => ({ ...prev, shiftMinutes: m }))}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                                      customDraft.shiftMinutes === m
                                        ? 'bg-amber-400 text-black border-amber-400 font-extrabold'
                                        : 'bg-white/5 text-white/70 border-white/10 hover:text-white'
                                    }`}
                                  >
                                    {m > 0 ? `+${m}m` : `${m}m`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Alternância: Usar Data Específica de Calendário vs Regra Descritiva */}
                          <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-white">
                                {isPt ? 'Método de Definição das Datas:' : 'Date Definition Method:'}
                              </span>
                              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => setCustomDraft(prev => ({ ...prev, useSpecificDates: false }))}
                                  className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase transition-all cursor-pointer ${
                                    !customDraft.useSpecificDates ? 'bg-amber-400 text-black' : 'text-white/60 hover:text-white'
                                  }`}
                                >
                                  {isPt ? 'Por Regra' : 'By Rule'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustomDraft(prev => ({ ...prev, useSpecificDates: true }))}
                                  className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase transition-all cursor-pointer ${
                                    customDraft.useSpecificDates ? 'bg-amber-400 text-black' : 'text-white/60 hover:text-white'
                                  }`}
                                >
                                  {isPt ? 'Data Exata' : 'Exact Date'}
                                </button>
                              </div>
                            </div>

                            {/* Início e Término */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Início */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold">
                                    {isPt ? '● Início da Temporada:' : '● Season Start:'}
                                  </span>
                                  <input
                                    type="text"
                                    value={customDraft.startTime}
                                    onChange={(e) => setCustomDraft(prev => ({ ...prev, startTime: e.target.value }))}
                                    placeholder="00:00"
                                    className="w-12 text-center text-[9px] font-mono bg-black/60 border border-white/20 rounded text-amber-300"
                                  />
                                </div>
                                {customDraft.useSpecificDates ? (
                                  <input
                                    type="date"
                                    value={customDraft.customStartDate}
                                    onChange={(e) => setCustomDraft(prev => ({ ...prev, customStartDate: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                  />
                                ) : (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={customDraft.startRule}
                                      onChange={(e) => setCustomDraft(prev => ({ ...prev, startRule: e.target.value }))}
                                      placeholder={isPt ? "Ex: Último domingo de Setembro" : "e.g. Last Sunday of September"}
                                      className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                      {startRulePresets.slice(0, 4).map(preset => (
                                        <button
                                          key={`draft-start-${preset}`}
                                          type="button"
                                          onClick={() => setCustomDraft(prev => ({ ...prev, startRule: preset }))}
                                          className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10"
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Fim */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono uppercase text-rose-400 font-bold">
                                    {isPt ? '● Término da Temporada:' : '● Season End:'}
                                  </span>
                                  <input
                                    type="text"
                                    value={customDraft.endTime}
                                    onChange={(e) => setCustomDraft(prev => ({ ...prev, endTime: e.target.value }))}
                                    placeholder="00:00"
                                    className="w-12 text-center text-[9px] font-mono bg-black/60 border border-white/20 rounded text-amber-300"
                                  />
                                </div>
                                {customDraft.useSpecificDates ? (
                                  <input
                                    type="date"
                                    value={customDraft.customEndDate}
                                    onChange={(e) => setCustomDraft(prev => ({ ...prev, customEndDate: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                  />
                                ) : (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={customDraft.endRule}
                                      onChange={(e) => setCustomDraft(prev => ({ ...prev, endRule: e.target.value }))}
                                      placeholder={isPt ? "Ex: Último domingo de Março" : "e.g. Last Sunday of March"}
                                      className="w-full bg-white/5 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                      {endRulePresets.slice(0, 4).map(preset => (
                                        <button
                                          key={`draft-end-${preset}`}
                                          type="button"
                                          onClick={() => setCustomDraft(prev => ({ ...prev, endRule: preset }))}
                                          className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10"
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notas / Descrição */}
                          <div>
                            <input
                              type="text"
                              value={customDraft.notes}
                              onChange={(e) => setCustomDraft(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder={isPt ? "Observações ou justificativa (ex: Decreto Presidencial nº 1234)" : "Notes or justification (e.g. Decree #1234)"}
                              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white/80 placeholder-white/30 focus:border-amber-400 focus:outline-none"
                            />
                          </div>

                          {/* Save & Cancel buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomSeasonCreator(false);
                                setEditingSeasonId(null);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-bold transition-all cursor-pointer"
                            >
                              {isPt ? 'Cancelar' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveCustomSeason}
                              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold shadow active:scale-95 transition-all cursor-pointer"
                            >
                              {isPt ? 'Salvar no Cronograma' : 'Save to Schedule'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 3.2 Vigência entre Períodos de Temporadas (Inter-Season Period Vigency & Schedule) */}
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-bold text-white uppercase tracking-wider block">
                            {isPt ? 'Vigência entre Períodos de Temporadas' : 'Inter-Season Period Vigency & Schedule'}
                          </span>
                          <span className="text-[9px] text-white/50 block">
                            {isPt 
                              ? 'Defina o modelo de vigência para as temporadas ou personalize cada período individualmente.' 
                              : 'Select a vigency schedule model or customize each season period individually.'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Shift Selector */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[8.5px] font-mono text-white/40 uppercase mr-1">
                          {isPt ? 'Desvio:' : 'Shift:'}
                        </span>
                        {[
                          { label: '+60 min (+1h)', val: 60 },
                          { label: '+30 min (+30m)', val: 30 },
                          { label: '-60 min (-1h)', val: -60 },
                        ].map(opt => (
                          <button
                            key={`shift-opt-${opt.val}`}
                            type="button"
                            onClick={() => setLocalConfig(prev => ({
                              ...prev,
                              timeChange: {
                                ...prev.timeChange,
                                shiftMinutes: opt.val
                              }
                            }))}
                            className={`text-[8.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              localConfig.timeChange?.shiftMinutes === opt.val
                                ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                                : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3.2 Vigência entre Períodos de Temporadas e Gestão de Múltiplos Tipos de Temporadas */}
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider block">
                              {isPt ? 'Vigência e Tipos de Mudança de Horário Sazonal' : 'Seasonal Time Shift Types & Vigency Rules'}
                            </span>
                            <span className="text-[9px] text-white/50 block">
                              {isPt 
                                ? 'Configure quando muda e crie quantos tipos diferentes de temporadas quiser no formato XXX1 ou XXX1/XXX2 (de 1 a 10+ temporadas).' 
                                : 'Configure transition rules and create as many different season types as you want in XXX1 or XXX1/XXX2 formats.'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action: Add Custom Season Type */}
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomCreator()}
                            className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 transition-all cursor-pointer shadow-sm"
                          >
                            <Plus size={12} />
                            <span>{isPt ? 'Novo Tipo de Temporada' : 'New Season Type'}</span>
                          </button>
                        </div>
                      </div>

                      {/* SELEÇÃO RÁPIDA DE TIPOS / PERFIS DE TEMPORADAS */}
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                        <span className="text-[9.5px] font-mono uppercase text-amber-300/80 font-bold block">
                          {isPt ? '⚡ Modelos de Tipos de Temporadas Pré-Configurados:' : '⚡ Pre-configured Season Type Profiles:'}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            {
                              id: 'hem_south',
                              titlePt: 'Sul Bi-Anual (5 Temps)',
                              titleEn: 'South Bi-Annual (5 Seasons)',
                              descPt: 'Formato XXX1/XXX2 (Set a Mar)',
                              format: 'range',
                              startRule: 'Último domingo de Setembro',
                              endRule: 'Último domingo de Março',
                              seasonCount: 5,
                              shift: 60
                            },
                            {
                              id: 'hem_north',
                              titlePt: 'Norte Ano Civil (5 Temps)',
                              titleEn: 'North Single Year (5 Seasons)',
                              descPt: 'Formato XXX1 (Mar a Out)',
                              format: 'single',
                              startRule: 'Último domingo de Março',
                              endRule: 'Último domingo de Outubro',
                              seasonCount: 5,
                              shift: 60
                            },
                            {
                              id: 'short_cycle',
                              titlePt: 'Ciclo Curto (3 Temps)',
                              titleEn: 'Short Cycle (3 Seasons)',
                              descPt: '3 Temporadas XXX1/XXX2',
                              format: 'range',
                              startRule: 'Primeiro domingo de Outubro',
                              endRule: 'Terceiro domingo de Fevereiro',
                              seasonCount: 3,
                              shift: 60
                            },
                            {
                              id: 'long_decennial',
                              titlePt: 'Ciclo Longo (10 Temps)',
                              titleEn: 'Long Cycle (10 Seasons)',
                              descPt: '10 Temporadas XXX1',
                              format: 'single',
                              startRule: 'Último domingo de Setembro',
                              endRule: 'Último domingo de Março',
                              seasonCount: 10,
                              shift: 60
                            },
                          ].map(preset => {
                            const isCurrentFormat = (localConfig.cycleFormat === preset.format || localConfig.timeChange?.format === preset.format) && 
                              localConfig.timeChange?.startRule === preset.startRule;

                            return (
                              <button
                                key={`preset-profile-${preset.id}`}
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || currentYear;
                                  const endY = startY + preset.seasonCount - 1;
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    cycleFormat: preset.format as any,
                                    timeChange: {
                                      ...prev.timeChange,
                                      format: preset.format as any,
                                      startRule: preset.startRule,
                                      endRule: preset.endRule,
                                      shiftMinutes: preset.shift,
                                      startYear: startY,
                                      endYear: endY,
                                      seasonCount: preset.seasonCount
                                    }
                                  }));
                                }}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isCurrentFormat
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                                    : 'bg-black/30 border-white/10 hover:bg-white/10 text-white/70 hover:text-white'
                                }`}
                              >
                                <span className="text-[10px] font-bold block text-white font-mono">
                                  {isPt ? preset.titlePt : preset.titleEn}
                                </span>
                                <span className="text-[8px] text-white/50 block font-mono">
                                  {preset.descPt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* CARD 1: QUANDO MUDA (Regras e Horários da Transição Sazonal) */}
                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                            {isPt ? '⏰ 1. Quando Muda (Regra de Início e Término)' : '⏰ 1. When it Changes (Start & End Rules)'}
                          </span>
                          <span className="text-[8.5px] font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            {localConfig.timeChange?.shiftMinutes ? `${localConfig.timeChange.shiftMinutes > 0 ? '+' : ''}${localConfig.timeChange.shiftMinutes} min` : '+60 min'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Início (Quando entra em vigor o horário de verão/sazonal) */}
                          <div className="p-2.5 bg-black/50 rounded-xl border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                                <span>●</span> {isPt ? 'Início da Mudança:' : 'Start Transition:'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-mono text-white/40">{isPt ? 'Horário:' : 'Time:'}</span>
                                <input
                                  type="text"
                                  value={localConfig.timeChange?.startTime || '00:00'}
                                  onChange={(e) => setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: { ...prev.timeChange, startTime: e.target.value }
                                  }))}
                                  placeholder="00:00"
                                  className="w-12 text-center text-[9.5px] font-mono font-bold bg-white/10 border border-white/20 rounded px-1 py-0.5 text-amber-300 focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={localConfig.timeChange?.startRule || 'Último domingo de Setembro'}
                              onChange={(e) => setLocalConfig(prev => ({
                                ...prev,
                                timeChange: { ...prev.timeChange, startRule: e.target.value }
                              }))}
                              placeholder={isPt ? "Ex: Último domingo de Setembro" : "e.g. Last Sunday of September"}
                              className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                            />

                            {/* Preset Buttons for Start Rule */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {startRulePresets.slice(0, 5).map(preset => (
                                <button
                                  key={`main-start-${preset}`}
                                  type="button"
                                  onClick={() => setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: { ...prev.timeChange, startRule: preset }
                                  }))}
                                  className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer border ${
                                    localConfig.timeChange?.startRule === preset
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 font-bold'
                                      : 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border-white/10'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Término (Quando encerra o horário de verão/sazonal e retorna) */}
                          <div className="p-2.5 bg-black/50 rounded-xl border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
                                <span>●</span> {isPt ? 'Término da Mudança:' : 'End Transition:'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-mono text-white/40">{isPt ? 'Horário:' : 'Time:'}</span>
                                <input
                                  type="text"
                                  value={localConfig.timeChange?.endTime || '00:00'}
                                  onChange={(e) => setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: { ...prev.timeChange, endTime: e.target.value }
                                  }))}
                                  placeholder="00:00"
                                  className="w-12 text-center text-[9.5px] font-mono font-bold bg-white/10 border border-white/20 rounded px-1 py-0.5 text-amber-300 focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={localConfig.timeChange?.endRule || 'Último domingo de Março'}
                              onChange={(e) => setLocalConfig(prev => ({
                                ...prev,
                                timeChange: { ...prev.timeChange, endRule: e.target.value }
                              }))}
                              placeholder={isPt ? "Ex: Último domingo de Março" : "e.g. Last Sunday of March"}
                              className="w-full bg-white/10 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-400 focus:outline-none font-mono"
                            />

                            {/* Preset Buttons for End Rule */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {endRulePresets.slice(0, 5).map(preset => (
                                <button
                                  key={`main-end-${preset}`}
                                  type="button"
                                  onClick={() => setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: { ...prev.timeChange, endRule: preset }
                                  }))}
                                  className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer border ${
                                    localConfig.timeChange?.endRule === preset
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/50 font-bold'
                                      : 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border-white/10'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD 2: DURAÇÃO & FAIXA DE TEMPORADAS DE VIGÊNCIA (Formatos XXX1/XXX2 até XXX5/XXX6) */}
                      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                              {isPt ? '📅 2. Quanto de Temporada Vigora (Formato e Faixa XXX1 - XXX5)' : '📅 2. Vigency Period & Format (XXX1 or XXX1/XXX2 to XXX5)'}
                            </span>
                            <span className="text-[9.5px] text-white/60">
                              {isPt 
                                ? 'Escolha o formato do rótulo e a extensão de temporadas em que esta regra vai vigorar.' 
                                : 'Select season label format and range of seasons this rule will be in effect.'}
                            </span>
                          </div>

                          {/* Selector of Cycle Format: XXX1 vs XXX1/XXX2 */}
                          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/15">
                            <button
                              type="button"
                              onClick={() => setLocalConfig(prev => ({
                                ...prev,
                                cycleFormat: 'single',
                                timeChange: { ...prev.timeChange, format: 'single' }
                              }))}
                              className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                  ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              {isPt ? 'Ano Civil (XXX1)' : 'Single Year (XXX1)'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocalConfig(prev => ({
                                ...prev,
                                cycleFormat: 'range',
                                timeChange: { ...prev.timeChange, format: 'range' }
                              }))}
                              className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                localConfig.cycleFormat === 'range' || localConfig.timeChange?.format === 'range'
                                  ? 'bg-amber-400 text-black font-extrabold shadow-sm'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              {isPt ? 'Bi-Anual (XXX1/XXX2)' : 'Bi-Annual (XXX1/XXX2)'}
                            </button>
                          </div>
                        </div>

                        {/* Year Range Pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* Start Season Year (XXX1 or XXX1/XXX2) */}
                          <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                            <div>
                              <span className="text-[8.5px] text-white/50 uppercase font-mono block">
                                {isPt ? 'Temporada Inicial (De):' : 'Start Season (From):'}
                              </span>
                              <span className="font-mono font-bold text-sm text-amber-300">
                                {localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                  ? `${localConfig.timeChange?.startYear || localConfig.targetYear}`
                                  : `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newStartY = Math.max(1970, (localConfig.timeChange?.startYear || localConfig.targetYear) - 1);
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    targetYear: newStartY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      startYear: newStartY,
                                      endYear: Math.max(newStartY, prev.timeChange?.endYear || prev.endYear)
                                    }
                                  }));
                                }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                                title="-1 ano"
                              >
                                <ChevronLeft size={13} />
                              </button>
                              <span className="font-mono text-xs px-1 text-white font-bold">
                                {localConfig.timeChange?.startYear || localConfig.targetYear}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newStartY = (localConfig.timeChange?.startYear || localConfig.targetYear) + 1;
                                  const newEndY = Math.max(newStartY, localConfig.timeChange?.endYear || localConfig.endYear);
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    targetYear: newStartY,
                                    endYear: newEndY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      startYear: newStartY,
                                      endYear: newEndY
                                    }
                                  }));
                                }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                                title="+1 ano"
                              >
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>

                          {/* End Season Year (XXX5 or XXX5/XXX6) */}
                          <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                            <div>
                              <span className="text-[8.5px] text-white/50 uppercase font-mono block">
                                {isPt ? 'Temporada Final (Até):' : 'End Season (To):'}
                              </span>
                              <span className="font-mono font-bold text-sm text-amber-300">
                                {localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                  ? `${localConfig.timeChange?.endYear || localConfig.endYear}`
                                  : `${localConfig.timeChange?.endYear || localConfig.endYear}/${(localConfig.timeChange?.endYear || localConfig.endYear) + 1}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || localConfig.targetYear;
                                  const newEndY = Math.max(startY, (localConfig.timeChange?.endYear || localConfig.endYear) - 1);
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    endYear: newEndY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: newEndY,
                                      seasonCount: newEndY - startY + 1
                                    }
                                  }));
                                }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                                title="-1 ano"
                              >
                                <ChevronLeft size={13} />
                              </button>
                              <span className="font-mono text-xs px-1 text-white font-bold">
                                {localConfig.timeChange?.endYear || localConfig.endYear}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const startY = localConfig.timeChange?.startYear || localConfig.targetYear;
                                  const newEndY = (localConfig.timeChange?.endYear || localConfig.endYear) + 1;
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    endYear: newEndY,
                                    timeChange: {
                                      ...prev.timeChange,
                                      endYear: newEndY,
                                      seasonCount: newEndY - startY + 1
                                    }
                                  }));
                                }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                                title="+1 ano"
                              >
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Rótulo / Anos da Temporada Personalizado (XXX1, XXX1/XXX2 a XXX4, XXX4/XXX5) */}
                        <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-mono uppercase text-amber-300 font-bold block">
                              {isPt ? 'Rótulo / Anos da Temporada:' : 'Season Label / Years:'}
                            </label>
                            <span className="text-[8px] font-mono text-white/50">
                              {isPt ? 'Ex: XXX1, XXX1/XXX2 ou Faixas (2024/2025 a 2027/2028)' : 'e.g. XXX1, XXX1/XXX2 or Ranges'}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={localConfig.timeChange?.customSeasonLabel !== undefined ? localConfig.timeChange.customSeasonLabel : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalConfig(prev => ({
                                ...prev,
                                timeChange: {
                                  ...prev.timeChange,
                                  customSeasonLabel: val
                                }
                              }));
                            }}
                            placeholder={
                              localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                ? `${localConfig.timeChange?.startYear || localConfig.targetYear} a ${localConfig.timeChange?.endYear || localConfig.endYear}`
                                : `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1} a ${localConfig.timeChange?.endYear || localConfig.endYear}/${(localConfig.timeChange?.endYear || localConfig.endYear) + 1}`
                            }
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                          />

                          {/* Preset Formats for Season Label */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[8px] font-mono text-white/40 uppercase mr-1">
                              {isPt ? 'Formatos Rápidos:' : 'Quick Formats:'}
                            </span>
                            {[
                              {
                                id: 'single_year',
                                label: `${localConfig.timeChange?.startYear || localConfig.targetYear}`,
                                desc: 'XXX1'
                              },
                              {
                                id: 'range_year',
                                label: `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1}`,
                                desc: 'XXX1/XXX2'
                              },
                              {
                                id: 'single_span',
                                label: `${localConfig.timeChange?.startYear || localConfig.targetYear} a ${localConfig.timeChange?.endYear || localConfig.endYear}`,
                                desc: 'XXX1 a XXX4'
                              },
                              {
                                id: 'range_span',
                                label: `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1} a ${localConfig.timeChange?.endYear || localConfig.endYear}/${(localConfig.timeChange?.endYear || localConfig.endYear) + 1}`,
                                desc: 'XXX1/XXX2 a XXX4/XXX5'
                              },
                              {
                                id: 'placeholder_demo',
                                label: 'XXX1/XXX2 a XXX4/XXX5',
                                desc: 'Modelo'
                              }
                            ].map(item => (
                              <button
                                key={`label-preset-${item.id}`}
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: {
                                      ...prev.timeChange,
                                      customSeasonLabel: item.label
                                    }
                                  }));
                                }}
                                className={`text-[8px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  localConfig.timeChange?.customSeasonLabel === item.label
                                    ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                                    : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border-white/10'
                                }`}
                              >
                                <span className="font-bold">{item.label}</span>
                                <span className="opacity-60 ml-1">({item.desc})</span>
                              </button>
                            ))}
                            {localConfig.timeChange?.customSeasonLabel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalConfig(prev => ({
                                    ...prev,
                                    timeChange: {
                                      ...prev.timeChange,
                                      customSeasonLabel: undefined
                                    }
                                  }));
                                }}
                                className="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/40 cursor-pointer"
                              >
                                {isPt ? 'Limpar Rótulo' : 'Clear Label'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Range Duration Preset Buttons */}
                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                          <span className="text-[8.5px] font-mono text-white/50 uppercase">
                            {isPt ? 'Atalhos de Extensão de Vigência:' : 'Quick Vigency Extensions:'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {[
                              { seasons: 1, labelPt: '1 Temp.', labelEn: '1 Season' },
                              { seasons: 3, labelPt: '3 Temps.', labelEn: '3 Seasons' },
                              { seasons: 5, labelPt: '5 Temps. (Padronizado)', labelEn: '5 Seasons (Standard)' },
                              { seasons: 10, labelPt: '10 Temps.', labelEn: '10 Seasons' },
                            ].map(p => {
                              const startY = localConfig.timeChange?.startYear || localConfig.targetYear;
                              const currentCount = (localConfig.timeChange?.endYear || localConfig.endYear) - startY + 1;
                              const isSelected = currentCount === p.seasons;

                              return (
                                <button
                                  key={`vigency-extent-${p.seasons}`}
                                  type="button"
                                  onClick={() => {
                                    const newEndY = startY + p.seasons - 1;
                                    setLocalConfig(prev => ({
                                      ...prev,
                                      endYear: newEndY,
                                      timeChange: {
                                        ...prev.timeChange,
                                        endYear: newEndY,
                                        seasonCount: p.seasons
                                      }
                                    }));
                                  }}
                                  className={`text-[8.5px] font-mono font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                                      : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                                  }`}
                                >
                                  {isPt ? p.labelPt : p.labelEn}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Vigency Range Display Banner */}
                        <div className="p-3 bg-amber-400/10 rounded-xl border border-amber-400/30 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-white/80 font-bold">
                              {isPt ? 'Vigorando no Formato:' : 'In Effect Format:'}
                            </span>
                            <span className="text-amber-300 font-extrabold">
                              {localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                ? (isPt ? 'Ano Civil (XXX1)' : 'Single Year (XXX1)')
                                : (isPt ? 'Bi-Anual (XXX1/XXX2)' : 'Bi-Annual (XXX1/XXX2)')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-white/60">{isPt ? 'Faixa / Rótulo em Vigor:' : 'Active Label / Range:'}</span>
                            <span className="text-amber-300 font-extrabold bg-amber-400/20 px-3 py-1 rounded-lg border border-amber-400/40 text-xs">
                              {localConfig.timeChange?.customSeasonLabel || (
                                localConfig.cycleFormat === 'single' || localConfig.timeChange?.format === 'single'
                                  ? ((localConfig.timeChange?.startYear || localConfig.targetYear) === (localConfig.timeChange?.endYear || localConfig.endYear)
                                      ? `${localConfig.timeChange?.startYear || localConfig.targetYear}`
                                      : `${localConfig.timeChange?.startYear || localConfig.targetYear} a ${localConfig.timeChange?.endYear || localConfig.endYear}`)
                                  : ((localConfig.timeChange?.startYear || localConfig.targetYear) === (localConfig.timeChange?.endYear || localConfig.endYear)
                                      ? `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1}`
                                      : `${localConfig.timeChange?.startYear || localConfig.targetYear}/${(localConfig.timeChange?.startYear || localConfig.targetYear) + 1} a ${localConfig.timeChange?.endYear || localConfig.endYear}/${(localConfig.timeChange?.endYear || localConfig.endYear) + 1}`)
                              )}
                            </span>
                            <span className="text-[10px] text-amber-200/80 font-bold">
                              ({(localConfig.timeChange?.endYear || localConfig.endYear) - (localConfig.timeChange?.startYear || localConfig.targetYear) + 1} {isPt ? 'temporadas' : 'seasons'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Status of Current Time Shift */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    activeTimeShift.active 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-white/5 border-white/10 text-white/70'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${activeTimeShift.active ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                      <div>
                        <span className="text-xs font-bold block">
                          {activeTimeShift.active 
                            ? (isPt ? 'Horário de Mudança Sazonal Ativo' : 'Seasonal Time Shift Active') 
                            : (isPt ? 'Horário Padrão (Sem Desvio Ativo)' : 'Standard Time (No Shift Active)')}
                        </span>
                        <span className="text-[9px] font-mono opacity-80">
                          {activeTimeShift.active 
                            ? `${isPt ? 'Desvio aplicado:' : 'Active Shift:'} +${activeTimeShift.shiftMinutes}m (${activeTimeShift.activePeriod?.seasonLabel})`
                            : (activeTimeShift.nextTransition ? `${isPt ? 'Próxima mudança:' : 'Next shift:'} ${activeTimeShift.nextTransition.name}` : '')}
                        </span>
                      </div>
                    </div>
                    {activeTimeShift.active && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                        +{activeTimeShift.shiftMinutes / 60}h
                      </span>
                    )}
                  </div>
                </div>

                {/* 3.3 Cronograma de Cada Temporada de Horário Vigente com Vigência Individual */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {isPt ? 'Cronograma e Vigência das Temporadas' : 'Season Vigency Schedule & Periods'}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {timeChangeSchedule.length} {isPt ? (timeChangeSchedule.length === 1 ? 'temporada' : 'temporadas') : 'seasons'}
                      </span>
                    </div>

                    {/* Filter buttons & Add Season */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { id: 'all', labelPt: 'Todas', labelEn: 'All' },
                        { id: 'active', labelPt: 'Em Vigor', labelEn: 'Active' },
                        { id: 'upcoming', labelPt: 'Previstas', labelEn: 'Upcoming' },
                        { id: 'completed', labelPt: 'Encerradas', labelEn: 'Past' },
                        { id: 'custom', labelPt: 'Personalizadas', labelEn: 'Custom' },
                      ].map(f => (
                        <button
                          key={`tc-filter-${f.id}`}
                          type="button"
                          onClick={() => setTimeChangeFilter(f.id as any)}
                          className={`text-[8.5px] font-bold uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            timeChangeFilter === f.id
                              ? 'bg-amber-400 text-black border-amber-400 font-extrabold shadow-sm'
                              : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                          }`}
                        >
                          {isPt ? f.labelPt : f.labelEn}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddSeasonCount(1)}
                        className="flex items-center gap-1 text-[8.5px] font-bold uppercase px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 transition-all cursor-pointer"
                        title={isPt ? "Adicionar mais uma temporada ao cronograma" : "Add one more season to the schedule"}
                      >
                        <Plus size={11} />
                        <span>{isPt ? 'Mais Temporada' : 'More Season'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Banner when vigency is replicated */}
                  {replicatedSeasonId && (
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/50 rounded-xl flex items-center justify-between animate-fade-in text-emerald-300 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>{isPt ? 'Vigência replicada com sucesso para todas as temporadas!' : 'Vigency successfully replicated to all seasons!'}</span>
                      </div>
                      <span className="text-[10px] text-white/60">OK</span>
                    </div>
                  )}

                  {/* List of Time Change Seasons */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredTimeChangeSchedule.map((item, idx) => (
                      <div
                        key={`timechange-item-${item.id}-${idx}`}
                        className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                          item.isCurrent
                            ? 'bg-gradient-to-r from-emerald-500/15 via-white/5 to-white/5 border-emerald-400/50 shadow-lg ring-1 ring-emerald-400/40'
                            : item.status === 'completed'
                            ? 'bg-black/30 border-white/5 opacity-65 hover:opacity-100 hover:bg-white/5'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Top bar: Season label & status badge */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">⏰</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white font-mono">
                                  {item.displayName || `${isPt ? 'Temporada' : 'Season'} ${item.seasonLabel}`}
                                </span>
                                {item.customName && (
                                  <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-300 border border-purple-400/30">
                                    {isPt ? 'Nome Customizado' : 'Custom Name'}
                                  </span>
                                )}
                                {item.isCustom && (
                                  <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    {isPt ? 'Vigência Personalizada' : 'Custom Vigency'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] text-white/50 block font-mono">
                                {item.startRuleText} {'\u2192'} {item.endRuleText}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              +{item.shiftMinutes}m
                            </span>
                            <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              item.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                                : item.status === 'completed'
                                ? 'bg-white/10 text-white/40 border-white/10'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            }`}>
                              {item.status === 'active' ? (isPt ? '● EM VIGOR' : '● ACTIVE') : item.status === 'completed' ? (isPt ? 'ENCERRADA' : 'COMPLETED') : (isPt ? 'PREVISTA' : 'UPCOMING')}
                            </span>

                            {/* Action Buttons: Edit Vigency / Replicate / Reset */}
                            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                              {/* Replicate button */}
                              <button
                                type="button"
                                onClick={() => handleReplicateSeasonVigency(item)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-amber-400/20 text-white/60 hover:text-amber-300 transition-colors cursor-pointer"
                                title={isPt ? "Replicar vigência desta temporada para as demais" : "Replicate this season's vigency to all other seasons"}
                              >
                                <Copy size={11} />
                              </button>

                              {/* Edit vigency button */}
                              <button
                                type="button"
                                onClick={() => handleOpenCustomCreator({
                                  id: item.id,
                                  seasonLabel: item.seasonLabel,
                                  customName: item.customName || '',
                                  startYear: item.startYear,
                                  endYear: item.endYear,
                                  startRule: item.startRuleText,
                                  endRule: item.endRuleText,
                                  startTime: item.startTime,
                                  endTime: item.endTime,
                                  shiftMinutes: item.shiftMinutes,
                                  notes: item.notes
                                })}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                                title={isPt ? "Personalizar vigência e nome deste período" : "Customize vigency & name for this period"}
                              >
                                <Edit3 size={11} />
                              </button>

                              {/* Reset or delete custom override button */}
                              {item.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleResetSeasonToDefaultVigency(item.id, item.seasonLabel)}
                                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                  title={isPt ? "Restaurar vigência padrão" : "Reset to default vigency"}
                                >
                                  <RotateCcw size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Date details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-black/40 rounded-xl border border-white/5 text-[9.5px]">
                          {/* Data de Início da Vigência */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Início da Vigência:' : 'Vigency Start:'}
                            </span>
                            <div className="flex items-center gap-1 text-white/90 font-bold font-mono">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              <span>{item.startDateFormatted}</span>
                              <span className="text-emerald-400/80 font-normal">({item.startTime})</span>
                            </div>
                          </div>

                          {/* Data de Término da Vigência */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Fim da Vigência:' : 'Vigency End:'}
                            </span>
                            <div className="flex items-center gap-1 text-white/90 font-bold font-mono">
                              <Calendar className="w-3 h-3 text-rose-400" />
                              <span>{item.endDateFormatted}</span>
                              <span className="text-rose-400/80 font-normal">({item.endTime})</span>
                            </div>
                          </div>

                          {/* Duração da Vigência */}
                          <div>
                            <span className="text-[7.5px] font-mono uppercase text-white/40 block">
                              {isPt ? 'Duração da Vigência:' : 'Vigency Duration:'}
                            </span>
                            <div className="flex items-center gap-1 text-amber-300 font-bold font-mono">
                              <Timer className="w-3 h-3 text-amber-400" />
                              <span>{item.durationDays} {isPt ? 'dias' : 'days'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Notes if available */}
                        {item.notes && (
                          <div className="mt-1.5 px-2.5 py-1 bg-white/5 rounded-lg text-[8.5px] text-white/60 font-mono">
                            <span className="text-amber-400/80 font-bold">{isPt ? 'Nota:' : 'Note:'}</span> {item.notes}
                          </div>
                        )}

                        {/* Active Progress Bar */}
                        {item.status === 'active' && (
                          <div className="mt-2 space-y-1">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-white/50">
                              <span>{isPt ? 'Progresso da vigência:' : 'Period progress:'} {item.progressPercent.toFixed(1)}%</span>
                              <span className="text-emerald-400">{isPt ? 'Horário Sazonal Vigente no Momento' : 'Active Time Shift'}</span>
                            </div>
                          </div>
                        )}

                        {/* Período Entre-Temporadas (Intervalo sem desvio entre o término desta e início da próxima) */}
                        {item.interSeasonGapDays !== undefined && item.interSeasonStartDateFormatted && item.interSeasonEndDateFormatted && (
                          <div className="mt-2 p-2.5 bg-gradient-to-r from-amber-500/10 via-white/5 to-emerald-500/10 rounded-xl border border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🌿</span>
                              <div>
                                <span className="font-bold text-amber-300 block">
                                  {isPt ? 'Vigência Entre Temporadas (Horário Padrão):' : 'Inter-Season Vigency (Standard Time):'}
                                </span>
                                <span className="text-white/70">
                                  {isPt ? 'De' : 'From'} {item.interSeasonStartDateFormatted} {isPt ? 'até' : 'to'} {item.interSeasonEndDateFormatted} ({item.interSeasonGapDays} {isPt ? 'dias sem horário de verão' : 'days standard time'})
                                </span>
                              </div>
                            </div>
                            {item.nextSeasonStartsFormatted && (
                              <div className="text-right text-[8px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0 self-start sm:self-auto">
                                <span className="text-white/60">{isPt ? 'Próxima Vigência:' : 'Next Vigency:'}</span> {item.nextSeasonStartsFormatted}
                                {item.nextSeasonStartsInDays !== undefined && item.nextSeasonStartsInDays > 0 && (
                                  <span className="text-emerald-400 font-bold ml-1">({isPt ? `em ${item.nextSeasonStartsInDays}d` : `in ${item.nextSeasonStartsInDays}d`})</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {filteredTimeChangeSchedule.length === 0 && (
                      <div className="p-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 text-center space-y-2">
                        <p className="text-xs text-white/40">
                          {isPt ? 'Nenhuma temporada de mudança de horário encontrada no filtro.' : 'No time change seasons found.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddSeasonCount(1)}
                          className="px-3 py-1 bg-amber-400 text-black text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          {isPt ? '+ Adicionar Temporada' : '+ Add Season'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DURAÇÃO & MODIFICADORES (ADIANTAMENTO, ATRASO OU PERMANENTE) */}
            {activeTab === 'duration' && (
              <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {isPt ? 'Ajustes Globais de Duração e Antecipação' : 'Global Duration & Shift Adjustments'}
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    {isPt ? 'Flexibilidade Sazonal' : 'Seasonal Flexibility'}
                  </span>
                </div>

                {/* 4 Duration Modes: Natural, Adiantamento, Atraso, Permanente */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'natural' as DurationMode,
                      title: isPt ? 'Natural (Padrão)' : 'Natural (Default)',
                      icon: <Clock size={14} className="text-white/60" />,
                      desc: isPt ? 'Duração astronômica exata' : 'Exact astronomical duration'
                    },
                    {
                      id: 'advance' as DurationMode,
                      title: isPt ? 'Adiantamento' : 'Advance / Early',
                      icon: <FastForward size={14} className="text-amber-400" />,
                      desc: isPt ? 'Antecipa a próxima estação' : 'Early transition to next season'
                    },
                    {
                      id: 'delay' as DurationMode,
                      title: isPt ? 'Atraso (Extensão)' : 'Delay / Extension',
                      icon: <Rewind size={14} className="text-cyan-400" />,
                      desc: isPt ? 'Prorroga a estação atual' : 'Extends the current season'
                    },
                    {
                      id: 'permanent' as DurationMode,
                      title: isPt ? 'Permanente' : 'Permanent Lock',
                      icon: <Lock size={14} className="text-purple-400" />,
                      desc: isPt ? 'Fixa a estação indefinidamente' : 'Locks season indefinitely'
                    }
                  ].map(mode => {
                    const isSelected = localConfig.durationMode === mode.id;
                    return (
                      <button
                        key={`dur-mode-${mode.id}`}
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, durationMode: mode.id }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-400/15 border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                            : 'bg-black/30 border-white/5 hover:bg-white/5 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          {mode.icon}
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-white block">
                            {mode.title}
                          </span>
                          <span className="text-[8px] text-white/50 block mt-0.5 leading-tight">
                            {mode.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Offset adjustment slider for Advance / Delay */}
                {(localConfig.durationMode === 'advance' || localConfig.durationMode === 'delay') && (
                  <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/80 font-bold">
                        {localConfig.durationMode === 'advance' 
                          ? (isPt ? 'Dias de Adiantamento (Antecipação):' : 'Days of Advance:')
                          : (isPt ? 'Dias de Atraso (Prorrogação):' : 'Days of Delay / Extension:')}
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {localConfig.durationDaysOffset || 15} {isPt ? 'dias' : 'days'}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="60"
                      step="1"
                      value={localConfig.durationDaysOffset || 15}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, durationDaysOffset: Number(e.target.value) }))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />

                    {/* Preset quick buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono uppercase text-white/40">{isPt ? 'Atalhos:' : 'Presets:'}</span>
                      {[7, 15, 30, 45, 60].map(days => (
                        <button
                          key={`preset-days-${days}`}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, durationDaysOffset: days }))}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            localConfig.durationDaysOffset === days 
                              ? 'bg-amber-400 text-black font-bold border-amber-400' 
                              : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                          }`}
                        >
                          +{days}d
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanatory banner for Permanent mode */}
                {localConfig.durationMode === 'permanent' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2.5 text-xs text-purple-200">
                    <Lock size={16} className="text-purple-400 shrink-0" />
                    <span>
                      {isPt 
                        ? 'Modo permanente ativo: a estação e as cores sazonais permanecerão fixas indefinidamente, sem transições astronômicas automáticas.'
                        : 'Permanent mode active: season and palette will remain locked indefinitely without automatic transitions.'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ALERTAS SONOROS (SONS DE TRANSIÇÃO SAZONAL E MUDANÇAS DE REGRA) */}
            {activeTab === 'sounds' && (
              <div className="space-y-4">
                {/* 5.1 Master Sound Switch Card */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-lg ${
                  localConfig.soundAlertsEnabled
                    ? 'bg-gradient-to-br from-amber-500/15 via-black/40 to-black/60 border-amber-400/40 ring-1 ring-amber-400/20'
                    : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-2xl border transition-all shrink-0 ${
                        localConfig.soundAlertsEnabled
                          ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/30'
                          : 'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {localConfig.soundAlertsEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {isPt ? 'Alertas Sonoros Sazonais' : 'Seasonal Sound Alerts'}
                          </h3>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                            localConfig.soundAlertsEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {localConfig.soundAlertsEnabled ? (isPt ? 'ATIVADO' : 'ENABLED') : (isPt ? 'DESATIVADO' : 'DISABLED')}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 mt-1 max-w-xl">
                          {isPt 
                            ? 'Emite um alerta sonoro harmônico curto quando uma nova estação astronômica ou regra de horário sazonal entra em vigor.'
                            : 'Plays a short harmonious audible chime when a new astronomical season or seasonal time change rule takes effect.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleTestSound(localConfig.soundAlertType || 'chime')}
                        disabled={!localConfig.soundAlertsEnabled}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          localConfig.soundAlertsEnabled
                            ? previewingSound
                              ? 'bg-amber-400 text-black shadow-lg scale-95'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                            : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                        }`}
                        title={isPt ? 'Ouvir demonstração do som configurado' : 'Preview configured alert sound'}
                      >
                        <Play size={12} className={previewingSound ? 'animate-spin' : ''} />
                        <span>{isPt ? 'Testar Som' : 'Preview'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, soundAlertsEnabled: !prev.soundAlertsEnabled }))}
                        className={`relative w-12 h-6.5 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                          localConfig.soundAlertsEnabled ? 'bg-amber-400' : 'bg-white/20'
                        }`}
                      >
                        <div
                          className={`w-5.5 h-5.5 rounded-full bg-black transition-transform flex items-center justify-center ${
                            localConfig.soundAlertsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                          }`}
                        >
                          {localConfig.soundAlertsEnabled ? (
                            <Check size={11} className="text-amber-400" />
                          ) : (
                            <X size={11} className="text-white/40" />
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5.2 Sound Presets Selection Grid */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isPt ? 'Timbres e Estilos de Alerta' : 'Alert Sound Timbre & Styles'}
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono text-white/40">
                      {isPt ? 'Síntese Web Audio Pura' : 'Pure Web Audio Synthesis'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: 'chime' as SeasonalSoundType,
                        name: isPt ? 'Carrilhão Harmônico Celestial' : 'Celestial Harmonic Chime',
                        desc: isPt ? 'Sequência de 4 notas ascendentes com afinação dinâmica para cada estação.' : '4-note ascending chord tuned to seasonal resonance.',
                        icon: '✨',
                        badge: isPt ? 'Recomendado' : 'Recommended'
                      },
                      {
                        id: 'bell' as SeasonalSoundType,
                        name: isPt ? 'Sino Sazonal de Observatório' : 'Observatory Bell Chime',
                        desc: isPt ? 'Sino suave e ressonante com decaimento natural caloroso.' : 'Warm resonant acoustic bell with natural harmonic decay.',
                        icon: '🔔',
                        badge: isPt ? 'Clássico' : 'Classic'
                      },
                      {
                        id: 'marimba' as SeasonalSoundType,
                        name: isPt ? 'Marimba Orgânica de Madeira' : 'Organic Wooden Marimba',
                        desc: isPt ? 'Toque acústico rápido, orgânico e percussivo com calor solar.' : 'Bouncy, organic wooden mallet stroke with solar warmth.',
                        icon: '🪵',
                        badge: isPt ? 'Acústico' : 'Acoustic'
                      },
                      {
                        id: 'crystal' as SeasonalSoundType,
                        name: isPt ? 'Brilho Cristalino Etéreo' : 'Ethereal Crystal Shimmer',
                        desc: isPt ? 'Harmônicos agudos e cintilantes inspirados na luz solar dos solstícios.' : 'High-frequency shimmering overtone sparkle.',
                        icon: '💎',
                        badge: isPt ? 'Brilhante' : 'Sparkle'
                      },
                      {
                        id: 'zen' as SeasonalSoundType,
                        name: isPt ? 'Sino Tibetano Zen Meditativo' : 'Meditative Tibetan Zen Bowl',
                        desc: isPt ? 'Frequência senoidal pura C4 com ressonância profunda e suave.' : 'Deep pure sinusoidal C4 fundamental tone with calm ring.',
                        icon: '🧘',
                        badge: isPt ? 'Zen' : 'Zen'
                      }
                    ].map((preset) => {
                      const isSelected = (localConfig.soundAlertType || 'chime') === preset.id;
                      const isPlaying = previewingSound === preset.id;

                      return (
                        <div
                          key={`sound-preset-${preset.id}`}
                          onClick={() => setLocalConfig(prev => ({ ...prev, soundAlertType: preset.id, soundAlertsEnabled: true }))}
                          className={`p-3.5 rounded-2xl border transition-all text-left relative cursor-pointer group flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400/60 ring-1 ring-amber-400/30 shadow-lg'
                              : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/15'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{preset.icon}</span>
                                <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                  {preset.name}
                                </span>
                              </div>
                              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                                isSelected 
                                  ? 'bg-amber-400 text-black font-bold border-amber-400' 
                                  : 'bg-white/5 text-white/40 border-white/10'
                              }`}>
                                {preset.badge}
                              </span>
                            </div>

                            <p className="text-[10px] text-white/50 leading-relaxed mb-3">
                              {preset.desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-amber-400 bg-amber-400' : 'border-white/30'
                              }`}>
                                {isSelected && <Check size={9} className="text-black stroke-[3]" />}
                              </div>
                              <span className="text-[9.5px] text-white/60 font-mono">
                                {isSelected ? (isPt ? 'Selecionado' : 'Active') : (isPt ? 'Escolher' : 'Select')}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestSound(preset.id);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                isPlaying
                                  ? 'bg-amber-400 text-black shadow-md scale-95 animate-pulse'
                                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                              }`}
                              title={isPt ? 'Ouvir amostra' : 'Play sound'}
                            >
                              <Play size={10} className={isPlaying ? 'animate-spin' : ''} />
                              <span>{isPlaying ? (isPt ? 'Tocando...' : 'Playing...') : (isPt ? 'Ouvir' : 'Play')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5.3 Volume Control & Triggers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Volume Slider */}
                  <div className="p-4 bg-black/30 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume1 className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {isPt ? 'Volume do Alerta' : 'Alert Volume'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {Math.round((localConfig.soundVolume ?? 0.65) * 100)}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={localConfig.soundVolume ?? 0.65}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, soundVolume: Number(e.target.value) }))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />

                    <div className="flex items-center justify-between gap-1 pt-1">
                      {[0.25, 0.5, 0.75, 1.0].map(vol => (
                        <button
                          key={`vol-preset-${vol}`}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, soundVolume: vol }))}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            Math.abs((localConfig.soundVolume ?? 0.65) - vol) < 0.05
                              ? 'bg-amber-400 text-black font-bold border-amber-400'
                              : 'bg-white/5 text-white/60 hover:text-white border-white/10'
                          }`}
                        >
                          {Math.round(vol * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification Triggers */}
                  <div className="p-4 bg-black/30 rounded-2xl border border-white/10 space-y-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {isPt ? 'Gatilhos de Notificação' : 'Notification Triggers'}
                      </span>
                    </div>

                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={localConfig.soundAlertOnSeasonChange !== false}
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, soundAlertOnSeasonChange: e.target.checked }))}
                        className="mt-0.5 accent-amber-400 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-white block">
                          {isPt ? 'Transições de Estações Astronômicas' : 'Astronomical Season Shifts'}
                        </span>
                        <span className="text-[10px] text-white/50 block">
                          {isPt ? 'Solstícios de Verão/Inverno e Equinócios de Primavera/Outono' : 'Summer/Winter Solstices and Spring/Autumn Equinoxes'}
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={localConfig.soundAlertOnTimeChange !== false}
                        onChange={(e) => setLocalConfig(prev => ({ ...prev, soundAlertOnTimeChange: e.target.checked }))}
                        className="mt-0.5 accent-amber-400 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-white block">
                          {isPt ? 'Mudanças de Horário Sazonal (DST)' : 'Seasonal Time Change (DST)'}
                        </span>
                        <span className="text-[10px] text-white/50 block">
                          {isPt ? 'Ativação e encerramento de regras de horário de verão' : 'Activation and ending of daylight saving time rules'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 5.4 Info Card */}
                <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
                  <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isPt
                      ? 'Os alertas sonoros utilizam síntese procedural em tempo real via Web Audio API. Não necessitam de downloads adicionais, funcionam instantaneamente e respondem tanto ao relógio em tempo real quanto à simulação solar.'
                      : 'Sound alerts use real-time procedural synthesis via Web Audio API. They require no downloads, work instantaneously, and respond to both real-time clock and solar simulation scrubber.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{isPt ? 'Restaurar Padrão' : 'Restore Default'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>{isPt ? 'Salvar Configurações' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
