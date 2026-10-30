import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, X, Loader2, Sparkles, Navigation, 
  Star, Clock, Globe, Sun, Info, Calendar, Check,
  ChevronDown, ChevronUp, BookOpen, Layers, SlidersHorizontal,
  ClipboardPaste, ClipboardCheck, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, Copy, Plus
} from 'lucide-react';
import { LocationSuggestion, searchLocations } from '../services/geminiService';
import { parseCoordinates, formatCoordinatePair, formatLatitude, formatLongitude } from '../lib/coordinateParser';
import { FEATURED_LOCATIONS, MAJOR_SOLAR_OBSERVATORIES, EXTREME_LATITUDE_LOCATIONS, GENERIC_TIMEZONES } from '../constants';
import { 
  NOAA_TIMEZONE_SYSTEMS, 
  NoaaTimezoneSystem, 
  NOAA_REGIONS, 
  NOAA_COUNTRY_PRESETS,
  formatOffsetMinutes, 
  searchNoaaTimezones, 
  getNoaaTimezoneById 
} from '../lib/noaaTimezones';
import { MiniMap } from './MiniMap';
import { SeasonalTimeline } from './SeasonalTimeline';
import { SeasonalSummaryCard } from './SeasonalSummaryCard';
import { SeasonalTable } from './SeasonalTable';
import { TimelineScrubber } from './TimelineScrubber';
import { PermanentChangeTab, PermanentChange } from './PermanentChangeTab';
import { isVigenciaActive, resolveSeasonalRule, parseRuleTimeToMinutes } from '../lib/seasonalTheme';
import { parseOffsetStringToMinutes, formatOffsetMinutesToString } from '../lib/moroccoTimezone';

export interface SeasonalPeriodItem {
  id: string;
  periodMode?: 'standard' | 'selection';
  startRule: string;
  endRule: string;
  shift: string;
  vigencia?: string;
  validityType?: 'single' | 'range';
  startTime?: string;
  endTime?: string;
  duration?: string;
  enabled: boolean;

  // "Seleção" mode fields ("Que tempo vai vigorar a mudança")
  startDate?: string;
  startTimeSelection?: string;
  startClockSource?: 'local' | 'utc';
  initialShift?: string;
  endDate?: string;
  endTimeSelection?: string;
  endClockSource?: 'local' | 'utc';
  finalShift?: string;
  isEndPermanent?: boolean;
}

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: LocationSuggestion) => void;
  onResetToGPS: () => void;
  hasManualLocation: boolean;
  language: 'pt' | 'en';
  t: Record<string, string>;
  favorites: LocationSuggestion[];
  onToggleFavorite: (loc: LocationSuggestion) => void;
  isFavorite: (loc: LocationSuggestion) => boolean;
  locationHistory: LocationSuggestion[];
  onClearHistory: () => void;
  onDeleteHistoryItem?: (loc: LocationSuggestion) => void;
  onDeleteFavorite?: (loc: LocationSuggestion) => void;
  onOpenCreatorChat: () => void;
  effectiveCoords?: { latitude: number; longitude: number } | null;
  manualLocation?: LocationSuggestion | null;
  baseNowMs: number;
  axialTilt?: number;
}

export const LocationSearchModal: React.FC<LocationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  onResetToGPS,
  hasManualLocation,
  manualLocation,
  language,
  t,
  favorites,
  onToggleFavorite,
  isFavorite,
  locationHistory,
  onClearHistory,
  onDeleteHistoryItem,
  onDeleteFavorite,
  onOpenCreatorChat,
  effectiveCoords,
  baseNowMs,
  axialTilt = 23.44,
}) => {
  // Local search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isAISearching, setIsAISearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [copiedPeriodsFeedback, setCopiedPeriodsFeedback] = useState(false);

  const handleCopyLocationSeasonalPeriods = () => {
    if (!seasonalPeriods || seasonalPeriods.length === 0) return;
    const locName = selectedNoaaSystem?.name || manualLocation?.name || 'Local';
    const summary = [
      `=== VARIAÇÃO SAZONAL LOCAL (${locName}) ===`,
      ...seasonalPeriods.map((p, i) => `Regra #${i+1}: Início: ${p.startRule} (${p.startTime || '00:00'}) | Fim: ${p.endRule} (${p.endTime || '00:00'}) | Desvio: ${p.shift} min | Vigência: ${p.vigencia || 'Todas'}`),
      `Nota: Regra local vinculada a este local. Não se aplica a outros locais do mundo.`,
      `============================================================`
    ].join('\n');

    const payload = JSON.stringify({
      type: 'solaris_seasonal_periods',
      locationName: locName,
      periods: seasonalPeriods
    }, null, 2);

    try {
      localStorage.setItem('solaris_copied_seasonal_variation', payload);
      navigator.clipboard.writeText(`${summary}\n\n[DADOS_TECNICOS_JSON]\n${payload}`);
      setCopiedPeriodsFeedback(true);
      setTimeout(() => setCopiedPeriodsFeedback(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePasteLocationSeasonalPeriods = async () => {
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
        if (parsed?.periods && Array.isArray(parsed.periods)) {
          setSeasonalPeriods(parsed.periods);
          setCopiedPeriodsFeedback(true);
          setTimeout(() => setCopiedPeriodsFeedback(false), 2500);
        } else if (parsed?.timeChange) {
          const tc = parsed.timeChange;
          const newPeriod: SeasonalPeriodItem = {
            id: `p-pasted-${Date.now()}`,
            startRule: tc.startRule || 'Último domingo de Setembro',
            endRule: tc.endRule || 'Último domingo de Março',
            shift: String(tc.shiftMinutes || 60),
            startTime: tc.startTime || '00:00',
            endTime: tc.endTime || '00:00',
            vigencia: tc.format === 'range' ? `${tc.startYear || 2024}/${(tc.startYear || 2024) + 1} a ${tc.endYear || 2028}/${(tc.endYear || 2028) + 1}` : `${tc.startYear || 2024} a ${tc.endYear || 2028}`,
            validityType: tc.format === 'range' ? 'range' : 'single',
            enabled: true
          };
          setSeasonalPeriods([newPeriod]);
          setCopiedPeriodsFeedback(true);
          setTimeout(() => setCopiedPeriodsFeedback(false), 2500);
        }
      }
    } catch (e) {
      console.warn("Failed to paste seasonal periods", e);
    }
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<'config' | 'permanent'>('config');

  // Permanent Timezone Changes (Historical)
  const [permanentTimezoneChanges, setPermanentTimezoneChanges] = useState<PermanentChange[]>([]);

  // Deleted locations persistence
  const [deletedLocationKeys, setDeletedLocationKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('helios_deleted_locations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getLocationKey = useCallback((loc: LocationSuggestion) => {
    return `${(loc.name || '').toLowerCase().trim()}_${(loc.latitude || 0).toFixed(3)}_${(loc.longitude || 0).toFixed(3)}`;
  }, []);

  const handleDeleteLocation = useCallback((e: React.MouseEvent, loc: LocationSuggestion, type: 'history' | 'favorite' | 'suggestion' | 'preset') => {
    e.stopPropagation();
    const key = getLocationKey(loc);
    
    // If it's a history item, remove from history
    if (type === 'history') {
      if (onDeleteHistoryItem) {
        onDeleteHistoryItem(loc);
      }
    }
    
    // If it's a favorite item, remove from favorite
    if (type === 'favorite') {
      if (onDeleteFavorite) {
        onDeleteFavorite(loc);
      } else if (onToggleFavorite) {
        onToggleFavorite(loc);
      }
    }

    // If it's a search suggestion, remove from suggestion list
    if (type === 'suggestion') {
      setSuggestions(prev => prev.filter(s => getLocationKey(s) !== key));
    }

    // Also mark in deletedLocationKeys so it is removed from presets and doesn't reappear
    setDeletedLocationKeys(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      try {
        localStorage.setItem('helios_deleted_locations', JSON.stringify(next));
      } catch (err) {
        console.error("Failed saving deleted locations", err);
      }
      return next;
    });
  }, [getLocationKey, onDeleteHistoryItem, onDeleteFavorite, onToggleFavorite]);

  const handleRestoreDeletedLocations = useCallback(() => {
    setDeletedLocationKeys([]);
    try {
      localStorage.removeItem('helios_deleted_locations');
    } catch (err) {
      console.error("Failed restoring deleted locations", err);
    }
  }, []);

  const isLocationDeleted = useCallback((loc: LocationSuggestion) => {
    return deletedLocationKeys.includes(getLocationKey(loc));
  }, [deletedLocationKeys, getLocationKey]);

  const visibleFeaturedLocations = useMemo(() => {
    return FEATURED_LOCATIONS.filter(loc => !isLocationDeleted(loc));
  }, [isLocationDeleted]);

  const visibleGenericTimezones = useMemo(() => {
    return GENERIC_TIMEZONES.filter(loc => !isLocationDeleted(loc));
  }, [isLocationDeleted]);

  const visibleObservatories = useMemo(() => {
    return MAJOR_SOLAR_OBSERVATORIES.filter(loc => !isLocationDeleted(loc));
  }, [isLocationDeleted]);

  const visibleExtremeLatitudes = useMemo(() => {
    return EXTREME_LATITUDE_LOCATIONS.filter(loc => !isLocationDeleted(loc));
  }, [isLocationDeleted]);

  // Real-time Coordinate detection from search bar or pasted strings
  const parsedFromSearch = useMemo(() => parseCoordinates(searchQuery), [searchQuery]);

  // Local custom position state
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");
  const [customName, setCustomName] = useState("");
  const [customTimezone, setCustomTimezone] = useState("");
  const [timezoneMode, setTimezoneMode] = useState<'geographic' | 'custom'>('geographic');

  const handlePasteFullCoordinates = useCallback((text: string) => {
    const parsed = parseCoordinates(text);
    if (parsed) {
      setCustomLat(parsed.latStr);
      setCustomLon(parsed.lonStr);
      if (!customName || customName === 'Posição Personalizada' || customName === 'Custom Position') {
        setCustomName(language === 'pt' ? 'Posição 100% Original' : '100% Original Position');
      }
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
      return true;
    }
    return false;
  }, [customName, language]);

  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const success = handlePasteFullCoordinates(text);
          if (!success) {
            const trimmed = text.trim();
            if (!isNaN(parseFloat(trimmed))) {
              setCustomLat(trimmed);
            }
          }
        }
      }
    } catch {
      // Ignore clipboard read permission failure
    }
  };
  
  // UTC source mode: 'manual' (controlled by seasonal variation) vs 'noaa' (full NOAA system + history + seasonal data)
  const [utcSourceMode, setUtcSourceMode] = useState<'manual' | 'noaa'>('manual');
  const [selectedNoaaId, setSelectedNoaaId] = useState<string>("noaa-br-brasilia");
  const [noaaSearchQuery, setNoaaSearchQuery] = useState<string>("");
  const [noaaRegionFilter, setNoaaRegionFilter] = useState<string>("all");
  const [noaaCountryFilter, setNoaaCountryFilter] = useState<string>("all");
  const [showNoaaHistory, setShowNoaaHistory] = useState<boolean>(true);
  const [isNoaaListExpanded, setIsNoaaListExpanded] = useState<boolean>(false);
  
  // Seasonal variation state
  const [enableSeasonalVariation, setEnableSeasonalVariation] = useState(true);
  const [seasonalMode, setSeasonalMode] = useState<'permanent' | 'seasonal'>('seasonal');
  const [permanentStartRule, setPermanentStartRule] = useState<string>("Primeiro Domingo De Outubro");
  const [permanentStartTime, setPermanentStartTime] = useState<string>("00:00");
  const [permanentEndRule, setPermanentEndRule] = useState<string>("Primeiro Domingo De Abril");
  const [permanentEndTime, setPermanentEndTime] = useState<string>("00:00");
  const [permanentShift, setPermanentShift] = useState<string>("60");
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriodItem[]>(() => {
    const simOrCurrentYear = new Date().getFullYear();
    return [{ 
      id: 'default-seasonal-period-1', 
      startRule: "Último Domingo De Setembro", 
      endRule: "Último Domingo De Março", 
      shift: "60", 
      vigencia: `${simOrCurrentYear} a ${simOrCurrentYear + 5}`, 
      validityType: 'single', 
      startTime: "00:00", 
      endTime: "00:00", 
      duration: "", 
      enabled: true 
    }];
  });
  const [isSimulation, setIsSimulation] = useState(false);
  const [isSimulationPlaying, setIsSimulationPlaying] = useState(false);
  const [simulationDate, setSimulationDate] = useState(() => Date.now());

  const selectedNoaaSystem = useMemo(() => {
    return getNoaaTimezoneById(selectedNoaaId) || NOAA_TIMEZONE_SYSTEMS[0];
  }, [selectedNoaaId]);

  const filteredNoaaSystems = useMemo(() => {
    return searchNoaaTimezones(noaaSearchQuery, noaaRegionFilter, noaaCountryFilter);
  }, [noaaSearchQuery, noaaRegionFilter, noaaCountryFilter]);

  const handleSelectNoaaSystem = useCallback((system: NoaaTimezoneSystem, autoFillCoords = false) => {
    setSelectedNoaaId(system.id);
    const offsetStr = formatOffsetMinutes(system.baseOffset).replace('UTC', '');
    setCustomTimezone(offsetStr);

    if (autoFillCoords || !customLat || !customLon) {
      setCustomLat(system.referenceCoords.latitude.toFixed(4));
      setCustomLon(system.referenceCoords.longitude.toFixed(4));
      if (!customName || customName === 'Posição Personalizada' || customName === 'Custom Position' || customName.startsWith('NOAA')) {
        setCustomName(language === 'pt' ? system.name : system.nameEn);
      }
    }

    // Load ALL data and rules of this NOAA timezone system into "Variação Sazonal"
    if (system.seasonalPeriods && system.seasonalPeriods.length > 0) {
      setEnableSeasonalVariation(true);
      const isSinglePermanent = system.seasonalPeriods.length === 1 && !!system.seasonalPeriods[0].isPermanent;
      setSeasonalMode(isSinglePermanent ? 'permanent' : 'seasonal');

      if (system.seasonalPeriods.length >= 1) {
        setPermanentStartRule(system.seasonalPeriods[0].startRule);
        setPermanentStartTime(system.seasonalPeriods[0].startTime);
        setPermanentEndRule(system.seasonalPeriods[0].endRule);
        setPermanentEndTime(system.seasonalPeriods[0].endTime);
        setPermanentShift(String(system.seasonalPeriods[0].shift));
      }

      const mapped: SeasonalPeriodItem[] = system.seasonalPeriods.map(p => ({
        id: p.id || Math.random().toString(),
        startRule: p.startRule,
        endRule: p.endRule,
        shift: String(p.shift),
        startTime: p.startTime,
        endTime: p.endTime,
        vigencia: p.vigencia,
        validityType: p.validityType,
        enabled: p.enabled
      }));
      setSeasonalPeriods(mapped);
    } else {
      setEnableSeasonalVariation(false);
      setSeasonalPeriods([]);
    }
  }, [customLat, customLon, customName, language]);

  const [savedSnapshots, setSavedSnapshots] = useState<{ name: string; periods: SeasonalPeriodItem[] }[]>(() => {
    try {
      const saved = localStorage.getItem('seasonalSnapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('seasonalSnapshots', JSON.stringify(savedSnapshots));
    } catch (e) {
      console.warn(e);
    }
  }, [savedSnapshots]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulationPlaying) {
      interval = setInterval(() => {
        setSimulationDate(prev => prev + 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSimulationPlaying]);

  // Synchronize custom position fields and seasonal periods when modal opens with active manual location
  useEffect(() => {
    if (isOpen && manualLocation) {
      if (manualLocation.latitude !== undefined && manualLocation.longitude !== undefined) {
        setCustomLat(manualLocation.latitude.toFixed(4));
        setCustomLon(manualLocation.longitude.toFixed(4));
      }
      if (manualLocation.name && manualLocation.name !== 'Posição Personalizada' && manualLocation.name !== 'Custom Position') {
        setCustomName(manualLocation.name);
      }
      if (manualLocation.seasonalPeriods && manualLocation.seasonalPeriods.length > 0) {
        setEnableSeasonalVariation(true);
        if (manualLocation.seasonalPeriods.length === 1 && (manualLocation.seasonalPeriods[0] as any).isPermanent) {
          setSeasonalMode('permanent');
          setPermanentStartRule(manualLocation.seasonalPeriods[0].startRule);
          setPermanentEndRule(manualLocation.seasonalPeriods[0].endRule);
          setPermanentShift(String(manualLocation.seasonalPeriods[0].shift));
          setPermanentStartTime(manualLocation.seasonalPeriods[0].startTime || "00:00");
          setPermanentEndTime(manualLocation.seasonalPeriods[0].endTime || "00:00");
        } else {
          setSeasonalMode('seasonal');
          setSeasonalPeriods(manualLocation.seasonalPeriods.map(p => ({
            id: p.id || Math.random().toString(),
            periodMode: p.periodMode || 'standard',
            startRule: p.startRule || "",
            endRule: p.endRule || "",
            shift: String(p.shift ?? "60"),
            startTime: p.startTime || "00:00",
            endTime: p.endTime || "00:00",
            vigencia: p.vigencia || "",
            validityType: p.validityType || 'single',
            enabled: p.enabled !== false,

            // "Seleção" mode fields
            startDate: p.startDate,
            startTimeSelection: p.startTimeSelection,
            startClockSource: p.startClockSource,
            initialShift: p.initialShift,
            endDate: p.endDate,
            endTimeSelection: p.endTimeSelection,
            endClockSource: p.endClockSource,
            finalShift: p.finalShift,
            isEndPermanent: p.isEndPermanent
          })));
        }
      }
      if (manualLocation.baseOffsetTransitions && manualLocation.baseOffsetTransitions.length > 0) {
        setPermanentTimezoneChanges(manualLocation.baseOffsetTransitions.map(t => ({
          id: t.id || `perm-${Math.random().toString(36).substring(2, 6)}`,
          date: t.date,
          time: t.time || '00:00:00',
          source: t.source || 'local',
          offset: t.offset || formatOffsetMinutesToString(t.newOffset),
          validityType: t.validityType || 'from'
        })));
      }
    }
  }, [isOpen, manualLocation]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if user entered / pasted 100% exact coordinates
    if (parsedFromSearch) {
      const lat = parsedFromSearch.latitude;
      const lon = parsedFromSearch.longitude;
      const offset = Math.abs(lat) >= 89.9 ? 0 : lon * 4;
      onSelectLocation({
        name: language === 'pt' ? 'Posição 100% Original' : '100% Original Position',
        latitude: lat,
        longitude: lon,
        description: `Posição 100% Original (${parsedFromSearch.latStr}°, ${parsedFromSearch.lonStr}°)`,
        timezoneOffset: offset,
        alternativeTimes: []
      });
      onClose();
      return;
    }

    setIsAISearching(true);
    setSearchError(null);
    try {
      const currentYear = new Date(baseNowMs).getUTCFullYear();
      const currentLanguageName = language === 'pt' ? 'Portuguese' : 'English';
      const results = await searchLocations(searchQuery, currentYear, currentLanguageName);
      if (results.length === 0 && searchQuery.trim().length > 0) {
        setSearchError("Nenhum resultado encontrado.");
      }
      setSuggestions(results.slice(0, 5));
    } catch {
      setSearchError("Limite temporário do serviço. Tente novamente em alguns instantes.");
    } finally {
      setIsAISearching(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocalização não é suportada.");
      return;
    }
    setIsAISearching(true);
    setSearchError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const currentYear = new Date(baseNowMs).getUTCFullYear();
      const currentLanguageName = language === 'pt' ? 'Portuguese' : 'English';
      const results = await searchLocations(coords, currentYear, currentLanguageName);
      if (results.length > 0) {
        onSelectLocation(results[0]);
      } else {
        setSearchError("Nenhum resultado para a localização atual.");
      }
    } catch {
      setSearchError("Falha ao obter localização atual.");
    } finally {
      setIsAISearching(false);
    }
  };

  const handleApplyCustomPosition = useCallback(() => {
    let lat = customLat.trim() 
      ? parseFloat(customLat.replace(',', '.')) 
      : (utcSourceMode === 'noaa' ? selectedNoaaSystem.referenceCoords.latitude : NaN);
    let lon = customLon.trim() 
      ? parseFloat(customLon.replace(',', '.')) 
      : (utcSourceMode === 'noaa' ? selectedNoaaSystem.referenceCoords.longitude : NaN);

    if (isNaN(lat) || isNaN(lon)) return;

    // Clamp coordinates to valid planetary ranges
    lat = Math.max(-90, Math.min(90, lat));
    lon = Math.max(-180, Math.min(180, lon));

    let offset = lon * 4;
    if (Math.abs(lat) >= 89.9) {
      offset = 0;
    }

    let appliedPolicyHistory: string | undefined = undefined;
    let appliedDstInfo: any = undefined;

    if (utcSourceMode === 'noaa') {
      offset = selectedNoaaSystem.baseOffset;
      appliedPolicyHistory = language === 'pt' ? selectedNoaaSystem.policyHistory : selectedNoaaSystem.policyHistoryEn;
      appliedDstInfo = selectedNoaaSystem.dstInfo;
    } else {
      if (timezoneMode === 'custom' && customTimezone.trim()) {
        const cleanTz = customTimezone.trim().replace(/^(UTC|GMT)/i, '').trim();
        const isNegative = cleanTz.startsWith('-');
        const normalizedTz = cleanTz.replace(/^[+-]/, '');
        const parts = normalizedTz.split(':');
        const hours = Math.abs(parseInt(parts[0], 10) || 0);
        const minutes = Math.abs(parseInt(parts[1] || '0', 10) || 0);
        const seconds = Math.abs(parseInt(parts[2] || '0', 10) || 0);
        
        offset = (isNegative ? -1 : 1) * (hours * 60 + minutes + seconds / 60);
        if (isNaN(offset)) offset = 0;
        // Clamp offset to valid terrestrial timezone range (-14h to +14h = -840 to +840 min)
        offset = Math.max(-840, Math.min(840, offset));
      }
    }
    
    if (!isNaN(lat) && !isNaN(lon)) {
      let finalSeasonalPeriods: any[] | undefined = undefined;

      if (enableSeasonalVariation) {
        if (seasonalMode === 'permanent') {
          const parsedShift = parseInt(permanentShift, 10);
          finalSeasonalPeriods = [{
            id: 'permanent-rule-' + Date.now(),
            startRule: permanentStartRule.trim() || "Primeiro Domingo De Outubro",
            endRule: permanentEndRule.trim() || "Primeiro Domingo De Abril",
            shift: isNaN(parsedShift) ? 60 : parsedShift,
            startTime: permanentStartTime || "00:00",
            endTime: permanentEndTime || "00:00",
            vigencia: 'Permanente',
            validityType: 'single',
            enabled: true,
            isPermanent: true
          }];
        } else {
          finalSeasonalPeriods = seasonalPeriods
            .filter(p => p.periodMode === 'selection' ? (p.startDate && (p.endDate || p.isEndPermanent)) : (p.startRule.trim() && p.endRule.trim()))
            .map(p => {
              const isSelection = p.periodMode === 'selection';
              const isEndPerm = p.isEndPermanent || p.endDate?.toUpperCase() === 'PERMANENTE' || p.endDate?.toUpperCase() === 'PERMANENT';

              if (isSelection) {
                // Modo Seleção Ativado: Desligue 100% o Modo Temporada Padrão
                return {
                  id: p.id,
                  periodMode: 'selection',
                  startRule: '',
                  endRule: '',
                  shift: parseInt(p.initialShift || p.shift || "60", 10) || 60,
                  startTime: "00:00",
                  endTime: "00:00",
                  vigencia: "",
                  validityType: 'single',
                  enabled: p.enabled !== false,

                  // Mantenha exclusivamente os campos da Seleção
                  startDate: p.startDate,
                  startTimeSelection: p.startTimeSelection || '00:00:00',
                  startClockSource: p.startClockSource || 'local',
                  initialShift: p.initialShift || '+60',
                  endDate: isEndPerm ? 'Permanente' : p.endDate,
                  endTimeSelection: p.endTimeSelection || '00:00:00',
                  endClockSource: p.endClockSource || 'local',
                  finalShift: p.finalShift || '0',
                  isEndPermanent: isEndPerm
                };
              } else {
                // Modo Temporada Padrão Ativado: Desligue 100% o Modo Seleção
                return {
                  id: p.id,
                  periodMode: 'standard',
                  startRule: p.startRule.trim(),
                  endRule: p.endRule.trim(),
                  shift: parseInt(p.shift, 10) || 60,
                  startTime: p.startTime || "00:00",
                  endTime: p.endTime || "00:00",
                  vigencia: p.vigencia || "",
                  validityType: p.validityType || 'single',
                  enabled: p.enabled !== false,

                  // Zere 100% os campos de Seleção
                  startDate: undefined,
                  startTimeSelection: undefined,
                  startClockSource: undefined,
                  initialShift: undefined,
                  endDate: undefined,
                  endTimeSelection: undefined,
                  endClockSource: undefined,
                  finalShift: undefined,
                  isEndPermanent: undefined
                };
              }
            });
        }
      } else if (utcSourceMode === 'noaa' && selectedNoaaSystem.seasonalPeriods && selectedNoaaSystem.seasonalPeriods.length > 0) {
        finalSeasonalPeriods = undefined;
      }

      const defaultName = utcSourceMode === 'noaa'
        ? (language === 'pt' ? selectedNoaaSystem.name : selectedNoaaSystem.nameEn)
        : (language === 'pt' ? "Posição Personalizada" : "Custom Position");

      const sysCode = utcSourceMode === 'noaa'
        ? selectedNoaaSystem.code
        : (timezoneMode === 'geographic' ? 'Geográfica' : customTimezone);

      const baseOffsetTransitions = permanentTimezoneChanges.length > 0
        ? permanentTimezoneChanges.map(c => ({
            id: c.id,
            date: c.date,
            time: c.time,
            source: c.source,
            offset: c.offset,
            newOffset: parseOffsetStringToMinutes(c.offset),
            validityType: c.validityType
          }))
        : undefined;

      onSelectLocation({
        name: customName.trim() || defaultName,
        latitude: lat,
        longitude: lon,
        description: `Personalizada: ${lat.toFixed(4)}, ${lon.toFixed(4)} (${sysCode})` + 
          (finalSeasonalPeriods && finalSeasonalPeriods.length > 0 
            ? (seasonalMode === 'permanent' 
                ? (language === 'pt' ? ` [Variação Permanente: ${permanentStartRule} ➔ ${permanentEndRule} (+${permanentShift || '60'}m)]` : ` [Permanent Shift: ${permanentStartRule} ➔ ${permanentEndRule} (+${permanentShift || '60'}m)]`)
                : (language === 'pt' ? ` [Sazonal: ${finalSeasonalPeriods.length}]` : ` [Seasonal: ${finalSeasonalPeriods.length}]`))
            : "") +
          (baseOffsetTransitions && baseOffsetTransitions.length > 0
            ? (language === 'pt' ? ` [Transições: ${baseOffsetTransitions.length}]` : ` [Transitions: ${baseOffsetTransitions.length}]`)
            : ""),
        timezoneOffset: offset,
        alternativeTimes: [],
        seasonalPeriods: finalSeasonalPeriods,
        baseOffsetTransitions,
        policyHistory: appliedPolicyHistory,
        dstInfo: appliedDstInfo
      });
      onClose();
    }
  }, [customLat, customLon, customName, customTimezone, timezoneMode, utcSourceMode, selectedNoaaSystem, enableSeasonalVariation, seasonalMode, permanentStartRule, permanentStartTime, permanentEndRule, permanentEndTime, permanentShift, seasonalPeriods, permanentTimezoneChanges, language, onSelectLocation, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="glass max-w-lg w-full p-6 rounded-[30px] relative border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.neuralLocationSearch || "Pesquisa de Localização"}</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{t.globalPositionOverride || "Ajuste de Posição Global"}</p>
          </div>
        </div>

        {/* Current Locked Position Status Banner */}
        {effectiveCoords && (
          <div className="mb-5 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
                  {language === 'pt' ? 'Trava de Localização IA Ativa' : 'AI Location Lock Active'}
                </span>
                <span className="text-[9px] text-white/70 font-mono">
                  Lat: {effectiveCoords.latitude >= 0 ? '+' : ''}{effectiveCoords.latitude.toFixed(4)}° | Lon: {effectiveCoords.longitude >= 0 ? '+' : ''}{effectiveCoords.longitude.toFixed(4)}°
                </span>
              </div>
            </div>
            {hasManualLocation && (
              <button
                onClick={() => {
                  onResetToGPS();
                  onClose();
                }}
                className="text-[8px] font-bold uppercase tracking-wider bg-amber-400 text-black px-2.5 py-1 rounded-lg hover:bg-amber-300 transition-all cursor-pointer shrink-0"
              >
                {t.restoreGps || "Restaurar GPS"}
              </button>
            )}
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4">
          <input 
            autoFocus
            type="text"
            placeholder={t.searchPlaceholder || "Buscar cidade, observatório, ou colar coordenadas (ex: -23.5505, -46.6333)..."}
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (!val.trim()) {
                setSuggestions([]);
              } else {
                const q = val.toLowerCase().trim();
                const allLocs = [
                  ...visibleGenericTimezones,
                  ...visibleFeaturedLocations,
                  ...visibleObservatories,
                  ...visibleExtremeLatitudes
                ];
                const matched = allLocs.filter(loc => 
                  loc.name.toLowerCase().includes(q) || 
                  loc.description.toLowerCase().includes(q)
                ).slice(0, 5);
                setSuggestions(matched);
              }
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-5 pr-12 text-sm focus:outline-none focus:border-amber-400/50 transition-all placeholder:text-white/20 text-white"
          />
          <button 
            type="submit"
            disabled={isAISearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-amber-400 text-black hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAISearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {/* Real-time Detected 100% Original Coordinates Banner */}
        {parsedFromSearch && (
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/20 via-amber-400/15 to-transparent border border-emerald-400/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-400/20 flex items-center justify-center border border-emerald-400/30 text-emerald-300 shrink-0">
                <MapPin size={15} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    {language === 'pt' ? 'Coordenadas 100% Originais Reconhecidas' : '100% Original Coordinates Detected'}
                  </span>
                  <span className="text-[8px] font-mono bg-emerald-400/20 text-emerald-300 px-1 rounded">100% Original</span>
                </div>
                <p className="text-[9px] font-mono text-white/80">
                  Lat: <span className="text-amber-300 font-bold">{parsedFromSearch.latStr}°</span> | Lon: <span className="text-amber-300 font-bold">{parsedFromSearch.lonStr}°</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setCustomLat(parsedFromSearch.latStr);
                  setCustomLon(parsedFromSearch.lonStr);
                  if (!customName || customName === 'Posição Personalizada') {
                    setCustomName(language === 'pt' ? 'Posição 100% Original' : '100% Original Position');
                  }
                }}
                className="text-[8.5px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
              >
                {language === 'pt' ? 'Preencher Campos' : 'Fill Fields'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const lat = parsedFromSearch.latitude;
                  const lon = parsedFromSearch.longitude;
                  const offset = Math.abs(lat) >= 89.9 ? 0 : lon * 4;
                  onSelectLocation({
                    name: language === 'pt' ? 'Posição 100% Original' : '100% Original Position',
                    latitude: lat,
                    longitude: lon,
                    description: `Posição 100% Original (${parsedFromSearch.latStr}°, ${parsedFromSearch.lonStr}°)`,
                    timezoneOffset: offset,
                    alternativeTimes: []
                  });
                  onClose();
                }}
                className="text-[8.5px] font-mono font-bold px-3 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black shadow-md shadow-emerald-400/20 transition-all cursor-pointer"
              >
                {language === 'pt' ? 'Aplicar 100% Original' : 'Apply 100% Original'}
              </button>
            </div>
          </div>
        )}

        {/* Posição Personalizada */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex bg-black/40 rounded-xl p-1 mb-4 border border-white/10">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'config' ? 'bg-amber-400 text-black shadow-md font-extrabold' : 'text-white/40 hover:text-white'
              }`}
            >
              <span>{language === 'pt' ? 'Variação Sazonal' : 'Seasonal Variation'}</span>
              {enableSeasonalVariation && (
                <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.2 rounded-full ${activeTab === 'config' ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'}`}>
                  {seasonalMode === 'permanent' ? '1' : seasonalPeriods.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('permanent')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'permanent' ? 'bg-amber-400 text-black shadow-md font-extrabold' : 'text-white/40 hover:text-white'
              }`}
            >
              <span>{language === 'pt' ? 'Mudança De Fuso Horario Local Previsto Por Local' : 'Local Timezone Change Predicted By Location'}</span>
              {permanentTimezoneChanges.length > 0 && (
                <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.2 rounded-full ${activeTab === 'permanent' ? 'bg-black/20 text-black' : 'bg-emerald-400/20 text-emerald-300'}`}>
                  {permanentTimezoneChanges.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Tab content starts below */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-bold text-amber-400/90 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {language === 'pt' ? 'Posição Personalizada' : 'Custom Position'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReadClipboard}
                className="text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-1 cursor-pointer"
                title={language === 'pt' ? 'Colar coordenadas da área de transferência (100% Original)' : 'Paste coordinates from clipboard (100% Original)'}
              >
                {copiedSuccess ? <ClipboardCheck size={11} className="text-emerald-400" /> : <ClipboardPaste size={11} />}
                <span>{copiedSuccess ? (language === 'pt' ? 'Colado 100%!' : 'Pasted 100%!') : (language === 'pt' ? 'Colar Coordenadas' : 'Paste Coordinates')}</span>
              </button>
              <span className="text-[9px] text-white/30 font-mono">100% Original</span>
            </div>
          </div>

          <input
            type="text"
            placeholder={language === 'pt' ? "Nome do Local (Opcional)" : "Location Name (Optional)"}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs w-full mb-3 focus:outline-none focus:border-amber-400/50 text-white placeholder:text-white/20"
          />

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                Latitude (-90 a +90)
              </label>
              <input 
                type="text"
                inputMode="decimal"
                placeholder="-23.5505"
                value={customLat}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText && handlePasteFullCoordinates(pastedText)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  // If user pastes full pair into lat input
                  if (val.includes(',') || val.includes(';') || val.includes('/') || (val.includes(' ') && val.trim().split(/\s+/).length >= 2)) {
                    if (handlePasteFullCoordinates(val)) return;
                  }
                  setCustomLat(val);
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                Longitude (-180 a +180)
              </label>
              <input 
                type="text"
                inputMode="decimal"
                placeholder="-46.6333"
                value={customLon}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText && handlePasteFullCoordinates(pastedText)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  // If user pastes full pair into lon input
                  if (val.includes(',') || val.includes(';') || val.includes('/') || (val.includes(' ') && val.trim().split(/\s+/).length >= 2)) {
                    if (handlePasteFullCoordinates(val)) return;
                  }
                  setCustomLon(val);
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
              />
            </div>
          </div>

          {activeTab === 'config' ? (
            <>
              {/* Método de Definição da Diferença UTC */}
          <div className="mb-3">
            <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
              <span>{language === 'pt' ? 'Método de Definição da Diferença UTC' : 'UTC Offset Definition Method'}</span>
              <span className="text-[8px] font-mono text-amber-400 font-semibold">
                {utcSourceMode === 'manual' 
                  ? (language === 'pt' ? 'Manual & Sazonal' : 'Manual & Seasonal') 
                  : (language === 'pt' ? 'Sistema NOAA + Histórico' : 'NOAA System + History')}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUtcSourceMode('manual')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  utcSourceMode === 'manual'
                    ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                    : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                    {language === 'pt' ? 'Diferença UTC Manual' : 'Manual UTC Offset'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${utcSourceMode === 'manual' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-white/20'}`} />
                </div>
                <p className="text-[8px] text-white/60 leading-tight">
                  {language === 'pt'
                    ? 'Offset manual ou geográfico sob o controle da Variação Sazonal'
                    : 'Manual or geographic offset under Seasonal Variation control'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUtcSourceMode('noaa');
                  const sys = getNoaaTimezoneById(selectedNoaaId) || NOAA_TIMEZONE_SYSTEMS[0];
                  handleSelectNoaaSystem(sys, false);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  utcSourceMode === 'noaa'
                    ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                    : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-400" />
                    {language === 'pt' ? 'Sistema NOAA' : 'NOAA System'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${utcSourceMode === 'noaa' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-white/20'}`} />
                </div>
                <p className="text-[8px] text-white/60 leading-tight">
                  {language === 'pt'
                    ? 'Qualquer fuso NOAA com histórico legal e variação sazonal com todo o dado'
                    : 'Any NOAA timezone with legal history and seasonal variation with all data'}
                </p>
              </button>
            </div>
          </div>

          {/* MODO 1: DIFERENÇA UTC MANUAL */}
          {utcSourceMode === 'manual' && (
            <div className="mb-3 space-y-2 p-2.5 bg-black/25 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider">
                  {language === 'pt' ? 'Cálculo de Base' : 'Base Calculation'}
                </span>
                <span className="text-[8px] text-amber-400/80 font-mono">
                  {timezoneMode === 'geographic' 
                    ? (language === 'pt' ? 'Base solar: 1h a cada 15° lon' : 'Solar base: 1h per 15° lon') 
                    : (language === 'pt' ? 'Offset fixo absoluto' : 'Absolute fixed offset')}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button 
                  type="button"
                  onClick={() => {
                    setTimezoneMode('geographic');
                    setCustomTimezone("");
                  }}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                    timezoneMode === 'geographic' 
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20' 
                      : 'bg-black/30 text-white/50 border-white/10 hover:bg-white/5'
                  }`}
                >
                  {language === 'pt' ? 'Hora Geográfica' : 'Geographic Time'}
                </button>
                <button 
                  type="button"
                  onClick={() => setTimezoneMode('custom')}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                    timezoneMode === 'custom' 
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20' 
                      : 'bg-black/30 text-white/50 border-white/10 hover:bg-white/5'
                  }`}
                >
                  {language === 'pt' ? 'Precisão Absoluta' : 'Absolute Precision'}
                </button>
              </div>

              {timezoneMode === 'custom' && (
                <input 
                  type="text"
                  placeholder="Timezone Offset (ex: -03:00 ou -03:00:30)"
                  value={customTimezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
                />
              )}

              <p className="text-[8px] text-white/40 italic">
                {language === 'pt'
                  ? 'Nota: Esta diferença UTC está sob o controle direto da seção "Variação Sazonal" abaixo.'
                  : 'Note: This UTC offset is directly under the control of the "Seasonal Variation" section below.'}
              </p>
            </div>
          )}

          {/* MODO 2: SISTEMA DE FUSO HORÁRIO NOAA */}
          {utcSourceMode === 'noaa' && (
            <div className="mb-3 space-y-2.5 p-3 bg-black/35 rounded-xl border border-amber-400/20">
              {/* Header do Sistema Selecionado */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base leading-none">
                      {selectedNoaaSystem.countryFlag || '🌐'}
                    </span>
                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      NOAA
                    </span>
                    <span className="text-[8.5px] font-semibold text-white/70">
                      {selectedNoaaSystem.country}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight w-full mt-0.5">
                      {language === 'pt' ? selectedNoaaSystem.name : selectedNoaaSystem.nameEn}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[8px] font-mono text-amber-300/90 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {selectedNoaaSystem.code}
                    </span>
                    {selectedNoaaSystem.subdivision && (
                      <span className="text-[8px] text-amber-400/90 font-medium">
                        • {selectedNoaaSystem.subdivision}
                      </span>
                    )}
                    <span className="text-[8px] text-white/50">
                      • Ref: {selectedNoaaSystem.referenceCoords.cityName}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-xs font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {formatOffsetMinutes(selectedNoaaSystem.baseOffset)}
                  </span>
                  <span className={`block text-[8px] font-semibold mt-0.5 ${selectedNoaaSystem.dstInfo.hasDst ? 'text-emerald-400' : 'text-white/40'}`}>
                    {selectedNoaaSystem.dstInfo.hasDst 
                      ? (language === 'pt' ? 'Possui Horário de Verão' : 'Has Daylight Saving') 
                      : (language === 'pt' ? 'Fuso Permanente / Sem DST' : 'Permanent Standard Time')}
                  </span>
                </div>
              </div>

              {/* Botão de Preenchimento das Coordenadas de Referência */}
              <button
                type="button"
                onClick={() => {
                  setCustomLat(selectedNoaaSystem.referenceCoords.latitude.toFixed(4));
                  setCustomLon(selectedNoaaSystem.referenceCoords.longitude.toFixed(4));
                  if (!customName || customName === 'Posição Personalizada' || customName === 'Custom Position') {
                    setCustomName(language === 'pt' ? selectedNoaaSystem.name : selectedNoaaSystem.nameEn);
                  }
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] text-amber-300 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>
                  {language === 'pt'
                    ? `Preencher Coordenadas com Referência NOAA (${selectedNoaaSystem.referenceCoords.latitude.toFixed(2)}°, ${selectedNoaaSystem.referenceCoords.longitude.toFixed(2)}° - ${selectedNoaaSystem.referenceCoords.cityName})`
                    : `Fill Coordinates with NOAA Reference (${selectedNoaaSystem.referenceCoords.latitude.toFixed(2)}°, ${selectedNoaaSystem.referenceCoords.longitude.toFixed(2)}° - ${selectedNoaaSystem.referenceCoords.cityName})`}
                </span>
              </button>

              {/* Seletor / Pesquisa de Fusos Horários NOAA */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1">
                    <Search className="w-2.5 h-2.5 text-amber-400" />
                    {language === 'pt' ? 'Sistemas & Estados por País' : 'Systems & States by Country'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNoaaListExpanded(!isNoaaListExpanded)}
                    className="text-[8px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{isNoaaListExpanded ? (language === 'pt' ? 'Recolher Lista' : 'Collapse List') : (language === 'pt' ? 'Ver Todos os Fusos' : 'View All Systems')}</span>
                    {isNoaaListExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder={language === 'pt' ? "Pesquisar fuso ou estado: Salvador, Tocantins, Brasília, Acre, Arizona, Cancún..." : "Search system or state: Salvador, Tocantins, Brasilia, Acre, Arizona, Cancun..."}
                      value={noaaSearchQuery}
                      onChange={(e) => {
                        setNoaaSearchQuery(e.target.value);
                        if (!isNoaaListExpanded) setIsNoaaListExpanded(true);
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
                    />
                  </div>

                  {/* Filtro por País (Com Brasil, Salvador, Tocantins, etc. em destaque) */}
                  <div>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                      {language === 'pt' ? 'Filtrar por País:' : 'Filter by Country:'}
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                      {NOAA_COUNTRY_PRESETS.map((country) => (
                        <button
                          key={country.id}
                          type="button"
                          onClick={() => {
                            setNoaaCountryFilter(country.id);
                            if (!isNoaaListExpanded) setIsNoaaListExpanded(true);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[8px] font-mono whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                            noaaCountryFilter === country.id
                              ? 'bg-amber-400 text-black font-bold shadow-sm shadow-amber-400/30'
                              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'
                          }`}
                        >
                          <span>{country.flag}</span>
                          <span>{language === 'pt' ? country.labelPt : country.labelEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro por Região Global */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                    {NOAA_REGIONS.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => {
                          setNoaaRegionFilter(reg.id);
                          if (!isNoaaListExpanded) setIsNoaaListExpanded(true);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[8px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                          noaaRegionFilter === reg.id
                            ? 'bg-white/20 text-white font-bold border border-white/30'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {language === 'pt' ? reg.labelPt : reg.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista rolável de fusos NOAA */}
                {(isNoaaListExpanded || noaaSearchQuery.trim().length > 0) && (
                  <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1 bg-black/60 rounded-xl p-1.5 border border-white/10">
                    {filteredNoaaSystems.length === 0 ? (
                      <p className="text-[9px] text-white/40 text-center py-3">
                        {language === 'pt' ? 'Nenhum sistema NOAA encontrado' : 'No NOAA timezone found'}
                      </p>
                    ) : (
                      filteredNoaaSystems.map((sys) => {
                        const isSelected = sys.id === selectedNoaaId;
                        return (
                          <button
                            key={sys.id}
                            type="button"
                            onClick={() => {
                              handleSelectNoaaSystem(sys, false);
                              setIsNoaaListExpanded(false);
                            }}
                            className={`w-full p-2 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400/20 border border-amber-400 text-white'
                                : 'bg-white/5 border border-transparent hover:bg-white/10 text-white/70'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm leading-none shrink-0">{sys.countryFlag}</span>
                                <span className="text-[9px] font-bold text-white truncate">
                                  {language === 'pt' ? sys.name : sys.nameEn}
                                </span>
                                <span className="text-[7.5px] font-mono text-amber-300/80 bg-amber-400/10 px-1 rounded shrink-0">
                                  {sys.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[7.5px] text-white/50 mt-0.5 truncate">
                                <span className="font-semibold text-white/70">{sys.country}</span>
                                {sys.subdivision && (
                                  <span className="text-amber-400/80 font-medium truncate">• {sys.subdivision}</span>
                                )}
                                <span className="truncate">• {sys.referenceCoords.cityName}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-mono font-bold text-amber-300">
                                {formatOffsetMinutes(sys.baseOffset)}
                              </span>
                              {sys.dstInfo.hasDst ? (
                                <span className="block text-[7px] text-emerald-400 font-bold">DST</span>
                              ) : (
                                <span className="block text-[7px] text-white/30 font-mono">FIXO</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Histórico Oficial do Sistema NOAA */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <button
                  type="button"
                  onClick={() => setShowNoaaHistory(!showNoaaHistory)}
                  className="w-full flex items-center justify-between py-1 text-left text-amber-300 text-[9px] font-bold cursor-pointer hover:text-amber-200"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-amber-400" />
                    {language === 'pt' ? 'Histórico Oficial do Sistema NOAA' : 'NOAA System Official History'}
                  </span>
                  {showNoaaHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showNoaaHistory && (
                  <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-[8px] font-mono text-white/80 leading-relaxed max-h-36 overflow-y-auto no-scrollbar whitespace-pre-line">
                    {language === 'pt' ? selectedNoaaSystem.policyHistory : selectedNoaaSystem.policyHistoryEn}
                  </div>
                )}
              </div>

              {/* Status de Sincronização com Variação Sazonal */}
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[8px] text-emerald-300 leading-tight">
                  <span className="font-bold block">
                    {language === 'pt' ? 'Variação Sazonal Sincronizada com o Sistema NOAA' : 'Seasonal Variation Synced with NOAA'}
                  </span>
                  <span className="text-white/60">
                    {selectedNoaaSystem.seasonalPeriods.length > 0 
                      ? (language === 'pt'
                          ? `Carregadas ${selectedNoaaSystem.seasonalPeriods.length} regra(s) e todo o histórico deste fuso horário. Disponíveis para visualização e edição logo abaixo.`
                          : `Loaded ${selectedNoaaSystem.seasonalPeriods.length} rule(s) and full history of this timezone. Active for inspection and editing below.`)
                      : (language === 'pt'
                          ? 'Este fuso oficial opera em horário padrão permanente (sem horário de verão ativo).'
                          : 'This official timezone operates on permanent standard time (no active DST).')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Variação Sazonal section */}
          <div className="mt-3 border-t border-white/5 pt-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={enableSeasonalVariation}
                onChange={(e) => {
                  setEnableSeasonalVariation(e.target.checked);
                  if (e.target.checked && seasonalPeriods.length === 0) {
                    const simOrCurrentYear = new Date(isSimulation ? simulationDate : baseNowMs).getUTCFullYear();
                    setSeasonalPeriods([{ 
                      id: Math.random().toString(), 
                      startRule: "Último Domingo De Setembro", 
                      endRule: "Último Domingo De Março", 
                      shift: "60", 
                      startTime: "00:00", 
                      endTime: "00:00", 
                      vigencia: `${simOrCurrentYear} a ${simOrCurrentYear + 5}`,
                      validityType: 'single',
                      enabled: true 
                    }]);
                  }
                }}
                className="w-4 h-4 accent-amber-400 bg-black/20 border border-white/10 rounded cursor-pointer"
              />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                {language === 'pt' ? 'Variação Sazonal' : 'Seasonal Variation'}
              </span>
            </label>

            {enableSeasonalVariation && (
              <div className="mt-3 space-y-3 bg-black/30 p-3 rounded-2xl border border-white/10 max-h-[350px] overflow-y-auto no-scrollbar">
                
                {/* Banner de Sincronização NOAA se ativo */}
                {utcSourceMode === 'noaa' && (
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[9px] text-amber-200 font-bold">
                        {language === 'pt' 
                          ? `Dados NOAA: ${selectedNoaaSystem.name}` 
                          : `NOAA Data: ${selectedNoaaSystem.nameEn}`}
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {selectedNoaaSystem.seasonalPeriods.length} {language === 'pt' ? 'regras carregadas' : 'loaded rules'}
                    </span>
                  </div>
                )}
                
                {/* Seção Escolha Qual? */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {language === 'pt' ? 'Escolha Qual?' : 'Choose Mode'}
                    </span>
                    <span className="text-[8.5px] font-mono text-white/40">
                      {language === 'pt' ? 'Modo de Aplicação Sazonal' : 'Seasonal Mode'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeasonalMode('permanent')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        seasonalMode === 'permanent'
                          ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                          : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                          {language === 'pt' ? 'Permanente' : 'Permanent'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${seasonalMode === 'permanent' ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
                      </div>
                      <p className="text-[8px] text-white/60 leading-tight">
                        {language === 'pt'
                          ? 'Variação ativada e mantida para sempre nesta posição'
                          : 'Fixed variation stays active forever in this position'}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSeasonalMode('seasonal')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        seasonalMode === 'seasonal'
                          ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                          : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                          {language === 'pt' ? 'Por Temporada' : 'By Season'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${seasonalMode === 'seasonal' ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
                      </div>
                      <p className="text-[8px] text-white/60 leading-tight">
                        {language === 'pt'
                          ? 'Escolha os anos e temporadas onde a variação é decidida'
                          : 'Choose years and seasons where variation is decided'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Conteúdo Permanente */}
                {seasonalMode === 'permanent' ? (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                          {language === 'pt' ? 'Calendário de Variação Permanente' : 'Permanent Variation Calendar'}
                        </span>
                        <span className="text-[8px] text-white/50">
                          {language === 'pt' ? 'Regra de início e fim que vigora continuamente todos os anos' : 'Start and end rule active continuously every year'}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 whitespace-nowrap">
                        {language === 'pt' ? 'Para Sempre' : 'Forever'}
                      </span>
                    </div>

                    {/* Início (Regra) & Hora Entrada */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                          <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                            {language === 'pt' ? 'Início (Regra do Calendário)' : 'Start (Calendar Rule)'}
                          </label>
                          <input
                            type="text"
                            value={permanentStartRule}
                            onChange={(e) => setPermanentStartRule(e.target.value)}
                            placeholder={language === 'pt' ? "Ex: Primeiro Domingo De Outubro" : "e.g. First Sunday of October"}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 px-2.5 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                            {language === 'pt' ? 'Hora Entrada' : 'Entry Time'}
                          </label>
                          <input
                            type="time"
                            value={permanentStartTime}
                            onChange={(e) => setPermanentStartTime(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                      </div>
                      {/* Presets de Início */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          "Primeiro Domingo De Outubro",
                          "Último Domingo De Setembro",
                          "Primeiro Domingo De Novembro",
                          "15/10"
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPermanentStartRule(preset)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer ${
                              permanentStartRule === preset 
                                ? 'bg-amber-400/30 text-amber-300 border border-amber-400/40' 
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fim (Regra) & Hora Saída */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                          <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                            {language === 'pt' ? 'Fim (Regra do Calendário)' : 'End (Calendar Rule)'}
                          </label>
                          <input
                            type="text"
                            value={permanentEndRule}
                            onChange={(e) => setPermanentEndRule(e.target.value)}
                            placeholder={language === 'pt' ? "Ex: Primeiro Domingo De Abril" : "e.g. First Sunday of April"}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 px-2.5 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                            {language === 'pt' ? 'Hora Saída' : 'Exit Time'}
                          </label>
                          <input
                            type="time"
                            value={permanentEndTime}
                            onChange={(e) => setPermanentEndTime(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                      </div>
                      {/* Presets de Fim */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          "Primeiro Domingo De Abril",
                          "Terceiro Domingo De Fevereiro",
                          "Último Domingo De Março",
                          "31/03"
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPermanentEndRule(preset)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer ${
                              permanentEndRule === preset 
                                ? 'bg-amber-400/30 text-amber-300 border border-amber-400/40' 
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deslocamento em Minutos */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block">
                          {language === 'pt' ? 'Desvio (Minutos)' : 'Shift (Minutes)'}
                        </label>
                        <span className="text-[9px] font-mono font-bold text-amber-300">
                          {parseInt(permanentShift, 10) >= 0 ? `+${permanentShift}` : permanentShift} min
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="1"
                          value={permanentShift}
                          onChange={(e) => setPermanentShift(e.target.value)}
                          placeholder="60"
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg py-1.5 px-2.5 text-[10px] font-mono text-amber-300 focus:outline-none focus:border-amber-400/50"
                        />
                        <div className="flex gap-1">
                          {[
                            { label: '+60m', val: '60' },
                            { label: '+30m', val: '30' },
                            { label: '-60m', val: '-60' }
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setPermanentShift(preset.val)}
                              className={`px-2 py-1 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                                permanentShift === preset.val
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-black/40 text-white/70 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resumo da Regra */}
                    <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-300 text-[9px] font-bold">
                        <Calendar className="w-3 h-3" />
                        <span>{language === 'pt' ? 'Resumo da Regra Permanente:' : 'Permanent Rule Summary:'}</span>
                      </div>
                      <p className="text-[8.5px] text-white/80 font-mono leading-relaxed">
                        Início: <strong className="text-amber-300">{permanentStartRule || '...'}</strong> ({permanentStartTime}) <br />
                        Fim: <strong className="text-amber-300">{permanentEndRule || '...'}</strong> ({permanentEndTime}) <br />
                        Deslocamento: <strong className="text-amber-300">+{permanentShift || '60'}m</strong> (Validade: Permanente todos os anos)
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Conteúdo Por Temporada */}
                    <SeasonalTimeline 
                      periods={seasonalPeriods} 
                      language={language} 
                      currentTime={isSimulation ? simulationDate : baseNowMs} 
                    />
                    <SeasonalSummaryCard periods={seasonalPeriods} language={language} />
                    <SeasonalTable language={language} />
                    
                    {isSimulation && (
                      <TimelineScrubber 
                        simulationDate={simulationDate} 
                        setSimulationDate={setSimulationDate} 
                        language={language}
                        latitude={parseFloat(customLat) || effectiveCoords?.latitude || 0}
                        longitude={parseFloat(customLon) || effectiveCoords?.longitude || 0}
                        seasonalPeriods={seasonalPeriods}
                        axialTilt={axialTilt}
                      />
                    )}
                    
                    <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
                      <label className="flex items-center gap-2 text-[10px] text-white/60 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isSimulation} 
                          onChange={(e) => setIsSimulation(e.target.checked)} 
                        />
                        {language === 'pt' ? 'Ativar Simulação' : 'Enable Simulation'}
                      </label>
                      {isSimulation && (
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsSimulationPlaying(!isSimulationPlaying)}
                            className="px-2.5 py-1 bg-amber-400 text-black rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            {isSimulationPlaying ? (language === 'pt' ? 'Pausar' : 'Pause') : (language === 'pt' ? 'Reproduzir' : 'Play')}
                          </button>
                          <input 
                            type="range"
                            min={new Date(new Date().getFullYear(), 0, 1).getTime()}
                            max={new Date(new Date().getFullYear(), 11, 31).getTime()}
                            value={simulationDate}
                            onChange={(e) => setSimulationDate(Number(e.target.value))}
                            className="flex-1 h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input 
                          type="date"
                          value={new Date(isSimulation ? simulationDate : baseNowMs).toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value).getTime();
                            if (isSimulation) setSimulationDate(newDate);
                          }}
                          className="bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                        />
                        <input 
                          type="text"
                          placeholder={language === 'pt' ? "Nome do Snapshot" : "Snapshot Name"}
                          className="flex-1 bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white"
                          id="modal-snapshot-name-input"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nameInput = document.getElementById('modal-snapshot-name-input') as HTMLInputElement;
                            if (nameInput?.value) {
                              setSavedSnapshots(prev => [...prev, { name: nameInput.value, periods: seasonalPeriods }]);
                              nameInput.value = "";
                            }
                          }}
                          className="bg-amber-400 text-black px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                        >
                          {language === 'pt' ? 'Salvar' : 'Save'}
                        </button>
                      </div>
                      
                      {savedSnapshots.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {savedSnapshots.map((snapshot, idx) => (
                            <button
                              key={`snapshot-${snapshot.name}-${idx}`}
                              type="button"
                              onClick={() => setSeasonalPeriods(snapshot.periods)}
                              className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-[9px] cursor-pointer"
                            >
                              {snapshot.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Local Scope Notice & Copy Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 bg-black/40 border border-white/10 rounded-xl my-2">
                      <div className="flex items-center gap-2 text-[10px] text-amber-200">
                        <span className="font-bold uppercase tracking-wider text-amber-400 font-mono">📍 {language === 'pt' ? 'Variação Local' : 'Local Variation'}:</span>
                        <span className="text-white/70">{language === 'pt' ? 'As regras deste local são locais e não se aplicam a outros locais do mundo.' : 'These location rules are local and do not apply to other world locations.'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={handleCopyLocationSeasonalPeriods}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-[9.5px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          title={language === 'pt' ? "Copiar regras sazonais deste local" : "Copy seasonal rules of this location"}
                        >
                          {copiedPeriodsFeedback ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedPeriodsFeedback ? (language === 'pt' ? 'Copiado!' : 'Copied!') : (language === 'pt' ? 'Copiar Variação' : 'Copy Variation')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handlePasteLocationSeasonalPeriods}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[9.5px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          title={language === 'pt' ? "Colar variação sazonal copiada" : "Paste copied seasonal variation"}
                        >
                          <span>📋</span>
                          <span>{language === 'pt' ? 'Colar Variação' : 'Paste Variation'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {seasonalPeriods.map((period, index) => {
                        const simOrCurrentYear = new Date(isSimulation ? simulationDate : baseNowMs).getUTCFullYear();
                        const vTrimmed = (period.vigencia || '').trim();
                        
                        // Parse current vigencia to initialize pickers
                        let parsedStart = simOrCurrentYear;
                        let parsedEnd = simOrCurrentYear + 5;
                        let isPerm = false;
                        let isDouble = period.validityType === 'range';

                        let expandedVig = vTrimmed.toLowerCase().replace(/^(?:temporadas?|ano|vigencia|vigência)\s*:?\s*/i, '').trim();
                        if (/x{2,}/i.test(expandedVig)) {
                          const decadePrefix = Math.floor(simOrCurrentYear / 10).toString();
                          const centPrefix = Math.floor(simOrCurrentYear / 100).toString();
                          expandedVig = expandedVig.replace(/xxx/gi, decadePrefix).replace(/xx/gi, centPrefix);
                        }

                        const permM = expandedVig.match(/^(\d{4})(?:\/(\d{2,4}))?\s*(?:-|–|—|a|até|to)\s*(?:permanente|permanent|infinito|sempre)\b/i);
                        if (permM) {
                          parsedStart = parseInt(permM[1], 10);
                          isPerm = true;
                          if (permM[2]) isDouble = true;
                        } else {
                          const dblM = expandedVig.match(/^(\d{4})\/(\d{2,4})\s*(?:-|–|—|a|até|to)\s*(\d{4})\/(\d{2,4})$/i);
                          if (dblM) {
                            parsedStart = parseInt(dblM[1], 10);
                            parsedEnd = parseInt(dblM[3], 10);
                            isDouble = true;
                          } else {
                            const sglM = expandedVig.match(/^(\d{4})\s*(?:-|–|—|a|até|to)\s*(\d{4})$/i);
                            if (sglM) {
                              parsedStart = parseInt(sglM[1], 10);
                              parsedEnd = parseInt(sglM[2], 10);
                              isDouble = false;
                            } else if (expandedVig.includes('permanente') || expandedVig.includes('sempre') || expandedVig.includes('fixo')) {
                              isPerm = true;
                            } else if (/^\d{4}$/.test(expandedVig)) {
                              parsedStart = parseInt(expandedVig, 10);
                              parsedEnd = parsedStart;
                              isDouble = false;
                            } else {
                              const pairM = expandedVig.match(/^(\d{4})\/(\d{2,4})$/);
                              if (pairM) {
                                parsedStart = parseInt(pairM[1], 10);
                                parsedEnd = parsedStart;
                                isDouble = true;
                              }
                            }
                          }
                        }

                        const currentSimMs = isSimulation ? simulationDate : baseNowMs;
                        const seasonBaseYear = simOrCurrentYear;

                        // Determine if active in the season currently in force
                        const isCurrentlyActive = isVigenciaActive(period.vigencia, period.validityType, currentSimMs, seasonBaseYear);

                        const applyVigencia = (sYear: number, eYear: number, perm: boolean, doubleFmt: boolean) => {
                          const updated = [...seasonalPeriods];
                          let newVig = "";
                          if (perm) {
                            newVig = doubleFmt ? `${sYear}/${sYear + 1} a Permanente` : `${sYear} a Permanente`;
                          } else {
                            newVig = doubleFmt ? `${sYear}/${sYear + 1} a ${eYear}/${eYear + 1}` : `${sYear} a ${eYear}`;
                          }
                          updated[index].vigencia = newVig;
                          updated[index].validityType = doubleFmt ? 'range' : 'single';
                          setSeasonalPeriods(updated);
                        };

                        return (
                          <div 
                            key={`seasonal-period-${period.id || index}-${index}`}
                            className="relative flex flex-col gap-2.5 p-3 rounded-2xl border border-white/10 bg-white/5 shadow-inner"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                                  {language === 'pt' ? `Temporada #${index + 1}` : `Season #${index + 1}`}
                                </span>
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${isCurrentlyActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' : 'bg-white/5 text-white/40'}`}>
                                  {isCurrentlyActive 
                                    ? (language === 'pt' ? `● Vigente na Temporada ${period.validityType === 'range' ? `${seasonBaseYear}/${seasonBaseYear + 1}` : seasonBaseYear}` : `● Active in Season ${period.validityType === 'range' ? `${seasonBaseYear}/${seasonBaseYear + 1}` : seasonBaseYear}`)
                                    : (language === 'pt' ? `○ Fora da Vigência (${period.validityType === 'range' ? `${seasonBaseYear}/${seasonBaseYear + 1}` : seasonBaseYear})` : `○ Inactive (${period.validityType === 'range' ? `${seasonBaseYear}/${seasonBaseYear + 1}` : seasonBaseYear})`)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSeasonalPeriods(prev => [
                                      ...prev,
                                      {
                                        ...period,
                                        id: Math.random().toString(),
                                        startRule: period.startRule,
                                        endRule: period.endRule,
                                        vigencia: period.vigencia,
                                        shift: period.shift,
                                        startTime: period.startTime,
                                        endTime: period.endTime,
                                        validityType: period.validityType,
                                        enabled: true
                                      }
                                    ]);
                                  }}
                                  className="text-[8px] font-mono text-white/60 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 flex items-center gap-0.5 cursor-pointer"
                                  title={language === 'pt' ? "Duplicar este período" : "Duplicate this period"}
                                >
                                  <Copy size={9} />
                                  <span>{language === 'pt' ? 'Duplicar' : 'Copy'}</span>
                                </button>
                                {seasonalPeriods.length > 1 && (
                                  <button 
                                    type="button"
                                    onClick={() => setSeasonalPeriods(prev => prev.filter(p => p.id !== period.id))}
                                    className="text-rose-400 hover:text-rose-300 text-[10px] font-bold uppercase p-1 cursor-pointer"
                                    title={language === 'pt' ? "Remover temporada" : "Remove season"}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Selector de Modo da Temporada: Temporada Padrão vs Seleção */}
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...seasonalPeriods];
                                  updated[index].periodMode = 'standard';
                                  setSeasonalPeriods(updated);
                                }}
                                className={`flex-1 py-1 px-2 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                                  (period.periodMode || 'standard') === 'standard'
                                    ? 'bg-amber-400 text-black shadow-sm font-extrabold'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                {language === 'pt' ? 'Temporada Padrão' : 'Standard Season'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...seasonalPeriods];
                                  updated[index].periodMode = 'selection';
                                  if (!updated[index].startDate) updated[index].startDate = '20/09/2026';
                                  if (!updated[index].startTimeSelection) updated[index].startTimeSelection = '01:00:00';
                                  if (!updated[index].startClockSource) updated[index].startClockSource = 'local';
                                  if (!updated[index].initialShift) updated[index].initialShift = '+60';
                                  if (!updated[index].endDate) updated[index].endDate = '21/03/2027';
                                  if (!updated[index].endTimeSelection) updated[index].endTimeSelection = '00:00:00';
                                  if (!updated[index].endClockSource) updated[index].endClockSource = 'local';
                                  if (!updated[index].finalShift) updated[index].finalShift = '0';
                                  setSeasonalPeriods(updated);
                                }}
                                className={`flex-1 py-1 px-2 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                                  period.periodMode === 'selection'
                                    ? 'bg-amber-400 text-black shadow-sm font-extrabold'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                {language === 'pt' ? 'Seleção' : 'Selection'}
                              </button>
                            </div>

                            {/* Conteúdo por Modo: Seleção vs Temporada Padrão */}
                            {period.periodMode === 'selection' ? (
                              <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                                  <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider">
                                    {language === 'pt' ? 'Que Tempo Vai Vigorar A Mudança' : 'Active Time Change Duration'}
                                  </span>
                                  <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                    {language === 'pt' ? 'Modo Seleção' : 'Selection Mode'}
                                  </span>
                                </div>

                                {/* Início da Mudança */}
                                <div className="space-y-1.5 bg-white/5 p-2 rounded-lg border border-white/5">
                                  <span className="text-[8px] font-bold text-emerald-300 uppercase tracking-wider block">
                                    {language === 'pt' ? 'Início da Mudança:' : 'Start of Change:'}
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                                    <div>
                                      <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Data Início</label>
                                      <input
                                        type="text"
                                        placeholder="XX/XX/XXXX"
                                        value={period.startDate || '20/09/2026'}
                                        onChange={(e) => {
                                          const updated = [...seasonalPeriods];
                                          updated[index].startDate = e.target.value;
                                          setSeasonalPeriods(updated);
                                        }}
                                        className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Hora Início</label>
                                      <input
                                        type="text"
                                        placeholder="XX:XX:XX"
                                        value={period.startTimeSelection || '01:00:00'}
                                        onChange={(e) => {
                                          const updated = [...seasonalPeriods];
                                          updated[index].startTimeSelection = e.target.value;
                                          setSeasonalPeriods(updated);
                                        }}
                                        className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Origem</label>
                                      <select
                                        value={period.startClockSource || 'local'}
                                        onChange={(e) => {
                                          const updated = [...seasonalPeriods];
                                          updated[index].startClockSource = e.target.value as 'local' | 'utc';
                                          setSeasonalPeriods(updated);
                                        }}
                                        className="w-full bg-black/60 border border-white/10 rounded py-1 px-1.5 text-[10px] text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
                                      >
                                        <option value="local">Hora Local</option>
                                        <option value="utc">Hora UTC</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[7.5px] font-bold text-amber-300 uppercase block mb-0.5">Desvio Inicial</label>
                                      <input
                                        type="text"
                                        placeholder="+60"
                                        value={period.initialShift || '+60'}
                                        onChange={(e) => {
                                          const updated = [...seasonalPeriods];
                                          updated[index].initialShift = e.target.value;
                                          setSeasonalPeriods(updated);
                                        }}
                                        className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-amber-300 font-bold placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Fim da Mudança */}
                                <div className="space-y-1.5 bg-white/5 p-2 rounded-lg border border-white/5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-bold text-rose-300 uppercase tracking-wider block">
                                      {language === 'pt' ? 'Fim da Mudança:' : 'End of Change:'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...seasonalPeriods];
                                        const isCurrentlyPerm = updated[index].isEndPermanent || updated[index].endDate?.toUpperCase() === 'PERMANENTE';
                                        if (isCurrentlyPerm) {
                                          updated[index].isEndPermanent = false;
                                          updated[index].endDate = '21/03/2027';
                                        } else {
                                          updated[index].isEndPermanent = true;
                                          updated[index].endDate = 'Permanente';
                                        }
                                        setSeasonalPeriods(updated);
                                      }}
                                      className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                                        (period.isEndPermanent || period.endDate?.toUpperCase() === 'PERMANENTE')
                                          ? 'bg-amber-400 text-black border border-amber-300 shadow-sm'
                                          : 'bg-white/10 hover:bg-white/20 text-white/70 border border-white/10'
                                      }`}
                                    >
                                      {(period.isEndPermanent || period.endDate?.toUpperCase() === 'PERMANENTE')
                                        ? (language === 'pt' ? '✓ Fim Permanente (Fixado)' : '✓ Permanent End (Fixed)')
                                        : (language === 'pt' ? '+ Tornar Permanente' : '+ Make Permanent')}
                                    </button>
                                  </div>

                                  {(period.isEndPermanent || period.endDate?.toUpperCase() === 'PERMANENTE') ? (
                                    <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded flex items-center justify-between text-[9px] font-mono text-amber-300">
                                      <span className="font-bold">
                                        {language === 'pt' ? '📌 Permanente: O Desvio Inicial vigorará para sempre a partir da Data Início.' : '📌 Permanent: Initial Shift will remain active indefinitely from Start Date.'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...seasonalPeriods];
                                          updated[index].isEndPermanent = false;
                                          updated[index].endDate = '21/03/2027';
                                          setSeasonalPeriods(updated);
                                        }}
                                        className="text-[8px] underline text-amber-200 hover:text-white cursor-pointer ml-2"
                                      >
                                        {language === 'pt' ? 'Alterar' : 'Change'}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                                      <div>
                                        <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Data Fim</label>
                                        <input
                                          type="text"
                                          placeholder="XX/XX/XXXX"
                                          value={period.endDate || '21/03/2027'}
                                          onChange={(e) => {
                                            const updated = [...seasonalPeriods];
                                            updated[index].endDate = e.target.value;
                                            setSeasonalPeriods(updated);
                                          }}
                                          className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Hora Fim</label>
                                        <input
                                          type="text"
                                          placeholder="XX:XX:XX"
                                          value={period.endTimeSelection || '00:00:00'}
                                          onChange={(e) => {
                                            const updated = [...seasonalPeriods];
                                            updated[index].endTimeSelection = e.target.value;
                                            setSeasonalPeriods(updated);
                                          }}
                                          className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[7.5px] font-bold text-white/40 uppercase block mb-0.5">Origem</label>
                                        <select
                                          value={period.endClockSource || 'local'}
                                          onChange={(e) => {
                                            const updated = [...seasonalPeriods];
                                            updated[index].endClockSource = e.target.value as 'local' | 'utc';
                                            setSeasonalPeriods(updated);
                                          }}
                                          className="w-full bg-black/60 border border-white/10 rounded py-1 px-1.5 text-[10px] text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
                                        >
                                          <option value="local">Hora Local</option>
                                          <option value="utc">Hora UTC</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[7.5px] font-bold text-amber-300 uppercase block mb-0.5">Desvio Final</label>
                                        <input
                                          type="text"
                                          placeholder="0"
                                          value={period.finalShift || '0'}
                                          onChange={(e) => {
                                            const updated = [...seasonalPeriods];
                                            updated[index].finalShift = e.target.value;
                                            setSeasonalPeriods(updated);
                                          }}
                                          className="w-full bg-black/60 border border-white/10 rounded py-1 px-2 text-[10px] font-mono text-amber-300 font-bold placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Regras de Transição (Início e Fim) */}
                                <div className="grid grid-cols-5 gap-2">
                              <div className="col-span-3">
                                <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                                  {language === 'pt' ? `Início (Regra)` : `Start (Rule)`}
                                </label>
                                <input 
                                  type="text"
                                  placeholder={language === 'pt' ? "Ex: Ultimo Domingo De Setembro" : "e.g. Last Sunday of September"}
                                  value={period.startRule}
                                  onChange={(e) => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].startRule = e.target.value;
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="w-full bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                                  {language === 'pt' ? 'Hora Entrada' : 'Entry Time'}
                                </label>
                                <input 
                                  type="time"
                                  value={period.startTime || "00:00"}
                                  onChange={(e) => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].startTime = e.target.value;
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="w-full bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                              <div className="col-span-3">
                                <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                                  {language === 'pt' ? 'Fim (Regra)' : 'End (Rule)'}
                                </label>
                                <input 
                                  type="text"
                                  placeholder={language === 'pt' ? "Ex: Terceiro Domingo De Fevereiro" : "e.g. Third Sunday of February"}
                                  value={period.endRule}
                                  onChange={(e) => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].endRule = e.target.value;
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="w-full bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                                  {language === 'pt' ? 'Hora Saída' : 'Exit Time'}
                                </label>
                                <input 
                                  type="time"
                                  value={period.endTime || "00:00"}
                                  onChange={(e) => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].endTime = e.target.value;
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="w-full bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                                />
                              </div>
                            </div>

                            {/* Desvio em Minutos */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">
                                  {language === 'pt' ? 'Desvio (Minutos)' : 'Shift (Minutes)'}
                                </label>
                                <span className="text-[9px] font-mono font-bold text-amber-300">
                                  {parseInt(period.shift, 10) >= 0 ? `+${period.shift}` : period.shift} min
                                </span>
                              </div>
                              <input 
                                type="number"
                                placeholder="60"
                                value={period.shift}
                                onChange={(e) => {
                                  const updated = [...seasonalPeriods];
                                  updated[index].shift = e.target.value;
                                  setSeasonalPeriods(updated);
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-md py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-400/50"
                              />
                            </div>

                            {/* VIGÊNCIA POR TEMPORADA (QUAIS TEMPORADAS VÃO VIGORAR) */}
                            <div className="p-2.5 bg-black/50 rounded-xl border border-white/10 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <div>
                                  <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider block">
                                    {language === 'pt' ? 'Quais Temporadas Vão Vigorar:' : 'Which Seasons Will Be In Effect:'}
                                  </span>
                                  <span className="text-[8px] text-white/50 block">
                                    {language === 'pt'
                                      ? 'Escolha entre XXX1 a XXX6, XXX1/XXX2 a XXX6/XXX7, ou XXX9 (ou XXX9/XX10) a Permanente.'
                                      : 'Select between XXX1 to XXX6, XXX1/XXX2 to XXX6/XXX7, or XXX9 to Permanent.'}
                                  </span>
                                </div>
                                
                                {/* Toggle Formato XXX1 vs XXX1/XXX2 */}
                                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => applyVigencia(parsedStart, parsedEnd, isPerm, false)}
                                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                      !isDouble 
                                        ? 'bg-amber-400 text-black font-extrabold shadow-sm' 
                                        : 'text-white/50 hover:text-white'
                                    }`}
                                  >
                                    XXX1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyVigencia(parsedStart, parsedEnd, isPerm, true)}
                                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                      isDouble 
                                        ? 'bg-amber-400 text-black font-extrabold shadow-sm' 
                                        : 'text-white/50 hover:text-white'
                                    }`}
                                  >
                                    XXX1/XXX2
                                  </button>
                                </div>
                              </div>

                              {/* Presets Rápidos com 1 Clique */}
                              <div className="flex flex-wrap items-center gap-1">
                                {/* Temporada Única Vigente neste Ano */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].vigencia = isDouble ? `${seasonBaseYear}/${seasonBaseYear + 1}` : `${seasonBaseYear}`;
                                    updated[index].validityType = isDouble ? 'range' : 'single';
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="text-[8px] font-mono px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-bold cursor-pointer"
                                  title={language === 'pt' ? `Temporada em vigor neste ano (${seasonBaseYear})` : `Season in effect this year (${seasonBaseYear})`}
                                >
                                  {isDouble ? `${seasonBaseYear}/${seasonBaseYear + 1}` : `${seasonBaseYear}`} ({language === 'pt' ? 'Temporada Vigente' : 'In Effect'})
                                </button>
                                {/* Faixa Decenal XXX1 a XXX6 (ex: 2021 a 2026) */}
                                <button
                                  type="button"
                                  onClick={() => applyVigencia(Math.floor(seasonBaseYear / 10) * 10 + 1, seasonBaseYear, false, isDouble)}
                                  className="text-[8px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 cursor-pointer"
                                  title={language === 'pt' ? `Faixa decenal vigorando até a temporada ${seasonBaseYear}` : `Decade range ending ${seasonBaseYear}`}
                                >
                                  {isDouble 
                                    ? `${Math.floor(seasonBaseYear / 10) * 10 + 1}/${Math.floor(seasonBaseYear / 10) * 10 + 2} a ${seasonBaseYear}/${seasonBaseYear + 1}` 
                                    : `${Math.floor(seasonBaseYear / 10) * 10 + 1} a ${seasonBaseYear}`} (XXX1 a XXX6)
                                </button>
                                {/* 6 Temporadas a partir da temporada vigente */}
                                <button
                                  type="button"
                                  onClick={() => applyVigencia(seasonBaseYear, seasonBaseYear + 5, false, isDouble)}
                                  className="text-[8px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 cursor-pointer"
                                  title="6 temporadas consecutivas"
                                >
                                  {isDouble 
                                    ? `${seasonBaseYear}/${seasonBaseYear + 1} a ${seasonBaseYear + 5}/${seasonBaseYear + 6}` 
                                    : `${seasonBaseYear} a ${seasonBaseYear + 5}`} (+5 anos)
                                </button>
                                {/* A Permanente a partir da temporada vigente */}
                                <button
                                  type="button"
                                  onClick={() => applyVigencia(seasonBaseYear, seasonBaseYear + 5, true, isDouble)}
                                  className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold cursor-pointer"
                                  title="Vigorando a partir desta temporada para sempre"
                                >
                                  {isDouble ? `${seasonBaseYear}/${seasonBaseYear + 1} a Permanente` : `${seasonBaseYear} a Permanente`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].vigencia = 'Permanente';
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold cursor-pointer"
                                >
                                  {language === 'pt' ? 'Permanente (Sempre)' : 'Permanent (Always)'}
                                </button>
                              </div>

                              {/* Steppers Interativos de Início e Término */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                {/* Temporada Inicial (De) */}
                                <div className="p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[7.5px] font-mono text-white/40 uppercase block">
                                      {language === 'pt' ? 'Início (De):' : 'Start (From):'}
                                    </span>
                                    <span className="font-mono font-bold text-xs text-amber-300">
                                      {isDouble ? `${parsedStart}/${parsedStart + 1}` : `${parsedStart}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => applyVigencia(parsedStart - 1, parsedEnd, isPerm, isDouble)}
                                      className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                                    >
                                      <ChevronLeft size={11} />
                                    </button>
                                    <span className="font-mono text-[10px] text-white px-0.5">{parsedStart}</span>
                                    <button
                                      type="button"
                                      onClick={() => applyVigencia(parsedStart + 1, Math.max(parsedStart + 1, parsedEnd), isPerm, isDouble)}
                                      className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                                    >
                                      <ChevronRight size={11} />
                                    </button>
                                  </div>
                                </div>

                                {/* Temporada Final (Até) ou Permanente */}
                                <div className="p-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                                  <div>
                                    <span className="text-[7.5px] font-mono text-white/40 uppercase block">
                                      {language === 'pt' ? 'Término (Até):' : 'End (To):'}
                                    </span>
                                    <span className={`font-mono font-bold text-xs ${isPerm ? 'text-emerald-300' : 'text-amber-300'}`}>
                                      {isPerm 
                                        ? (language === 'pt' ? 'Permanente' : 'Permanent')
                                        : (isDouble ? `${parsedEnd}/${parsedEnd + 1}` : `${parsedEnd}`)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isPerm ? (
                                      <button
                                        type="button"
                                        onClick={() => applyVigencia(parsedStart, Math.max(parsedStart + 1, simOrCurrentYear + 5), false, isDouble)}
                                        className="text-[8px] font-mono px-2 py-1 rounded bg-amber-400 text-black font-bold cursor-pointer"
                                      >
                                        {language === 'pt' ? 'Definir Ano Fim' : 'Set End Year'}
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => applyVigencia(parsedStart, Math.max(parsedStart, parsedEnd - 1), false, isDouble)}
                                          className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                                        >
                                          <ChevronLeft size={11} />
                                        </button>
                                        <span className="font-mono text-[10px] text-white px-0.5">{parsedEnd}</span>
                                        <button
                                          type="button"
                                          onClick={() => applyVigencia(parsedStart, parsedEnd + 1, false, isDouble)}
                                          className="p-1 bg-white/10 hover:bg-white/20 rounded text-white cursor-pointer"
                                        >
                                          <ChevronRight size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => applyVigencia(parsedStart, parsedEnd, true, isDouble)}
                                          className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black font-bold cursor-pointer ml-0.5"
                                          title="Tornar permanente a partir desta temporada"
                                        >
                                          ∞
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Input Livre Editável de Vigência */}
                              <div>
                                <label className="text-[7.5px] font-bold text-white/40 uppercase tracking-wider block mb-1">
                                  {language === 'pt' ? 'Texto Livre / Vigência Personalizada:' : 'Custom Vigency Expression:'}
                                </label>
                                <input 
                                  type="text"
                                  placeholder={language === 'pt' ? "Ex: 2021 a 2026, 2021/2022 a 2026/2027, ou 2019 a Permanente" : "e.g. 2021 to 2026, 2021/2022 to 2026/2027, or 2019 to Permanent"}
                                  value={period.vigencia || ""}
                                  onChange={(e) => {
                                    const updated = [...seasonalPeriods];
                                    updated[index].vigencia = e.target.value;
                                    setSeasonalPeriods(updated);
                                  }}
                                  className="w-full bg-black/60 border border-white/10 rounded-md py-1 px-2 text-[10px] font-mono text-amber-300 focus:outline-none focus:border-amber-400/50 placeholder:text-white/20"
                                />
                              </div>
                            </div>
                          </>
                          )}
                        </div>
                        );
                      })}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const simOrCurrentYear = new Date(isSimulation ? simulationDate : baseNowMs).getUTCFullYear();
                        setSeasonalPeriods(prev => [
                          ...prev, 
                          { 
                            id: Math.random().toString(), 
                            startRule: "Último Domingo De Setembro", 
                            endRule: "Último Domingo De Março", 
                            shift: "60", 
                            vigencia: `${simOrCurrentYear} a ${simOrCurrentYear + 5}`, 
                            validityType: 'single', 
                            startTime: "00:00", 
                            endTime: "00:00", 
                            duration: "", 
                            enabled: true 
                          }
                        ]);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm"
                    >
                      <Plus size={13} />
                      <span>{language === 'pt' ? '+ Adicionar Temporada / Período (Capacidade Ilimitada)' : '+ Add Season / Period (Unlimited)'}</span>
                    </button>
                  </>
                )}

                {/* Opção Mudança De Fuso Horario Local Previsto Por Local dentro da Variação Sazonal */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <PermanentChangeTab
                    language={language}
                    changes={permanentTimezoneChanges}
                    setChanges={setPermanentTimezoneChanges}
                  />
                </div>
              </div>
            )}
          </div>
            </>
          ) : (
            <div className="mt-3">
              <PermanentChangeTab
                language={language}
                changes={permanentTimezoneChanges}
                setChanges={setPermanentTimezoneChanges}
              />
            </div>
          )}

          {/* Indicador de Aplicação Simultânea */}
          <div className="mt-4 p-2.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono">
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className={`w-2 h-2 rounded-full ${enableSeasonalVariation ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
              <span className="font-bold">
                {language === 'pt' ? 'Variação Sazonal:' : 'Seasonal Variation:'}
              </span>
              <span className="text-white/80">
                {enableSeasonalVariation
                  ? (seasonalMode === 'permanent'
                      ? (language === 'pt' ? '1 Regra Permanente' : '1 Permanent Rule')
                      : `${seasonalPeriods.length} ${language === 'pt' ? 'Período(s)' : 'Period(s)'}`)
                  : (language === 'pt' ? 'Desativada' : 'Disabled')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-300">
              <span className={`w-2 h-2 rounded-full ${permanentTimezoneChanges.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
              <span className="font-bold">
                {language === 'pt' ? 'Fuso Local Previsto:' : 'Predicted Local Offset:'}
              </span>
              <span className="text-white/80">
                {permanentTimezoneChanges.length > 0
                  ? `${permanentTimezoneChanges.length} ${language === 'pt' ? 'Regra(s) de Fuso' : 'Offset Rule(s)'}`
                  : (language === 'pt' ? 'Nenhuma regra' : 'No rules')}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleApplyCustomPosition}
            disabled={
              utcSourceMode === 'manual'
                ? (!customLat || !customLon || isNaN(parseFloat(customLat)) || isNaN(parseFloat(customLon)))
                : false
            }
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-400 text-black font-bold uppercase tracking-widest text-xs hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-400/10"
          >
            {language === 'pt' ? 'Aplicar Posição' : 'Apply Position'}
          </button>

          <div className="relative mt-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onOpenCreatorChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/20 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-400/5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Arquiteto de Fuso/Sazonalidade AI
            </button>
          </div>
        </div>

        {/* GPS Button */}
        <button 
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isAISearching}
          className="w-full mb-6 flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest text-white/70 cursor-pointer"
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          {t.useCurrentLocation || "Usar Localização Atual (GPS)"}
        </button>

        {/* Presets and suggestions list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.suggestions || "Sugestões"}</h3>
            {hasManualLocation && (
              <button 
                type="button"
                onClick={onResetToGPS}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                {t.restoreGps || "Restaurar GPS"}
              </button>
            )}
          </div>

          {searchError && (
            <div className="mx-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <Info className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider leading-relaxed">
                {searchError}
              </p>
            </div>
          )}

          <div className="grid gap-2 max-h-[380px] sm:max-h-[440px] overflow-y-auto no-scrollbar pr-1">
            {suggestions.length > 0 ? (
              suggestions.map((s, idx) => (
                <div 
                  key={`suggestion-${s.name}-${s.latitude}-${s.longitude}-${idx}`}
                  className="group flex flex-col gap-0.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all text-left cursor-pointer"
                  onClick={() => onSelectLocation(s)}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{s.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono text-white/20">{s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(s); }}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${isFavorite(s) ? 'text-amber-400' : 'text-white/20 hover:text-white/50'}`}
                        title={isFavorite(s) ? (language === 'pt' ? 'Remover dos favoritos' : 'Remove from favorites') : (language === 'pt' ? 'Favoritar' : 'Favorite')}
                      >
                        <Star className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLocation(e, s, 'suggestion')}
                        className="p-1 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title={language === 'pt' ? 'Excluir este local' : 'Delete this location'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 line-clamp-1">{s.description}</p>
                  <div className="mt-1">
                    <MiniMap lat={s.latitude} lng={s.longitude} />
                  </div>
                </div>
              ))
            ) : searchQuery === "" ? (
              <div className="space-y-6">
                {deletedLocationKeys.length > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-white/70 text-[10px] font-mono">
                        {language === 'pt' ? `${deletedLocationKeys.length} local(is) excluído(s)` : `${deletedLocationKeys.length} location(s) deleted`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreDeletedLocations}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/20 transition-all cursor-pointer uppercase tracking-wider"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {language === 'pt' ? 'Restaurar Locais' : 'Restore Locations'}
                    </button>
                  </div>
                )}

                {favorites.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Star className="w-3 h-3 text-amber-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Observatórios Favoritos</span>
                    </div>
                    <div className="grid gap-2">
                      {favorites.map((s, idx) => (
                        <div
                          key={`favorite-${s.name}-${s.latitude}-${s.longitude}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all text-left cursor-pointer"
                        >
                          <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{s.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono text-white/20">{formatCoordinatePair(s.latitude, s.longitude, 1, false)}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLocation(e, s, 'favorite')}
                              className="p-1 rounded-full text-white/30 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title={language === 'pt' ? 'Excluir dos favoritos' : 'Delete from favorites'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {locationHistory.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-emerald-400/60" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{t.recentExploration || "Recentes"}</span>
                        <span 
                          className="text-[8px] font-mono font-bold text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"
                          title={language === 'pt' ? 'Capacidade Ilimitada' : 'Unlimited Capacity'}
                        >
                          <span>{locationHistory.length}</span>
                          <span className="text-[9px] font-bold text-emerald-300">/ ∞</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearHistory();
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors bg-white/5 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-white/5 hover:border-rose-500/20 cursor-pointer"
                      >
                        {language === 'pt' ? 'Limpar Tudo' : 'Clear All'}
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {locationHistory.map((s, idx) => (
                        <div
                          key={`history-${s.name}-${s.latitude}-${s.longitude}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all text-left cursor-pointer"
                        >
                          <span className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{s.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-mono text-white/20">{formatCoordinatePair(s.latitude, s.longitude, 1, false)}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLocation(e, s, 'history')}
                              className="p-1 rounded-full text-white/30 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title={language === 'pt' ? 'Excluir do histórico' : 'Delete from history'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleGenericTimezones.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Globe className="w-3 h-3 text-amber-400/70" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                        {t.genericTimezones || (language === 'pt' ? "Fusos Horários Genéricos" : "Generic Time Zones")}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {visibleGenericTimezones.map((s, idx) => (
                        <div
                          key={`generic-tz-${s.name}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex flex-col gap-0.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all text-left cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-amber-300 group-hover:text-amber-200 transition-colors uppercase tracking-tight">{s.name}</span>
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                                {s.timezoneOffset === 0 ? 'UTC±0' : (s.timezoneOffset > 0 ? `UTC+${s.timezoneOffset / 60}` : `UTC${s.timezoneOffset / 60}`)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-white/20">Lat: {formatLatitude(s.latitude, 2, false)}, Lon: {formatLongitude(s.longitude, 1, false)}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLocation(e, s, 'preset')}
                                className="p-1 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title={language === 'pt' ? 'Excluir este local' : 'Delete this location'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/30 line-clamp-1 italic">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleFeaturedLocations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Sparkles className="w-3 h-3 text-amber-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{t.featuredChronometers || "Cronômetros em Destaque"}</span>
                    </div>
                    <div className="grid gap-2">
                      {visibleFeaturedLocations.map((s, idx) => (
                        <div
                          key={`featured-${s.name}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex flex-col gap-0.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5 transition-all text-left cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-emerald-400 group-hover:text-amber-400 transition-colors uppercase tracking-tight">{s.name}</span>
                            <div className="flex items-center gap-1.5">
                              {s.dstInfo?.hasDst && <Sun className="w-2.5 h-2.5 text-amber-500/50" />}
                              <span className="text-[8px] font-mono text-white/20">{formatCoordinatePair(s.latitude, s.longitude, 2, false)}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLocation(e, s, 'preset')}
                                className="p-1 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title={language === 'pt' ? 'Excluir este local' : 'Delete this location'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/30 line-clamp-1 italic">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleObservatories.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Globe className="w-3 h-3 text-emerald-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{t.majorSolarObservatories || "Observatórios Solares"}</span>
                    </div>
                    <div className="grid gap-2">
                      {visibleObservatories.map((s, idx) => (
                        <div
                          key={`observatory-${s.name}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex flex-col gap-0.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all text-left cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-amber-400 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{s.name}</span>
                            <div className="flex items-center gap-1.5">
                              {s.dstInfo?.hasDst && <Sun className="w-2.5 h-2.5 text-amber-500/50" />}
                              <span className="text-[8px] font-mono text-white/20">{formatCoordinatePair(s.latitude, s.longitude, 2, false)}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLocation(e, s, 'preset')}
                                className="p-1 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title={language === 'pt' ? 'Excluir este local' : 'Delete this location'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/30 line-clamp-1 italic">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleExtremeLatitudes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <Globe className="w-3 h-3 text-emerald-400/60" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Cidades em Latitudes Extremas</span>
                    </div>
                    <div className="grid gap-2">
                      {visibleExtremeLatitudes.map((s, idx) => (
                        <div
                          key={`extreme-${s.name}-${idx}`}
                          onClick={() => onSelectLocation(s)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectLocation(s); }}
                          className="group flex flex-col gap-0.5 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all text-left cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-amber-400 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{s.name}</span>
                            <div className="flex items-center gap-1.5">
                              {s.dstInfo?.hasDst && <Sun className="w-2.5 h-2.5 text-amber-500/50" />}
                              <span className="text-[8px] font-mono text-white/20">{formatCoordinatePair(s.latitude, s.longitude, 2, false)}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLocation(e, s, 'preset')}
                                className="p-1 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title={language === 'pt' ? 'Excluir este local' : 'Delete this location'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/30 line-clamp-1 italic">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
