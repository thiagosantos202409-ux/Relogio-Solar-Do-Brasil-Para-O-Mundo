import React, { useMemo, useState } from 'react';
import { Calendar, Sun, Clock, ChevronRight, Copy, Check } from 'lucide-react';
import { calculateSeasonalForecastWithDST, getDstForecast } from '../lib/solarTime';
import { Translations } from '../translations';

interface SeasonalWidgetProps {
  date: Date;
  latitude: number;
  longitude?: number;
  offsetMinutes: number;
  baseOffset?: number;
  location?: any;
  seasonManagerConfig?: any;
  enableSeasonalVariation?: boolean;
  onToggleSeasonalVariation?: (enabled: boolean) => void;
  customAxialTilt?: number;
  t: Translations;
  language?: string;
  onOpenSeasonManager?: () => void;
}

export const SeasonalWidget = React.memo(({ 
  date, 
  latitude, 
  longitude = 0,
  offsetMinutes, 
  baseOffset,
  location,
  seasonManagerConfig,
  enableSeasonalVariation = true,
  onToggleSeasonalVariation,
  customAxialTilt,
  t,
  language = 'pt',
  onOpenSeasonManager
}: SeasonalWidgetProps) => {
  const isPt = language === 'pt';
  const [copied, setCopied] = useState(false);
  const isZeroLat = Math.abs(latitude) < 0.0001 || Object.is(latitude, 0) || Object.is(latitude, -0);

  const effectiveBaseOffset = (baseOffset !== undefined && !isNaN(baseOffset)) ? baseOffset : offsetMinutes;

  const seasonalForecast = useMemo(() => {
    if (isZeroLat) return [];
    return calculateSeasonalForecastWithDST(
      date, 
      latitude, 
      effectiveBaseOffset, 
      longitude, 
      location,
      customAxialTilt,
      seasonManagerConfig,
      enableSeasonalVariation
    );
  }, [date, latitude, effectiveBaseOffset, longitude, location, customAxialTilt, seasonManagerConfig, enableSeasonalVariation, isZeroLat]);

  const dstForecast = useMemo(() => {
    return getDstForecast(
      date, 
      effectiveBaseOffset, 
      latitude, 
      longitude, 
      location,
      seasonManagerConfig,
      enableSeasonalVariation
    );
  }, [date, effectiveBaseOffset, latitude, longitude, location, seasonManagerConfig, enableSeasonalVariation]);

  if (isZeroLat) {
    return (
      <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-white">
        <h3 className="text-xs text-amber-400 mb-1 flex items-center gap-1.5 font-semibold">
          <Calendar size={13} /> {isPt ? 'Zona Equatorial' : 'Equatorial Zone'}
        </h3>
        <p className="text-[10px] text-white/60 leading-tight">
          {isPt 
            ? 'Latitude 0° (Linha do Equador): Sem estações do ano ao longo do ciclo solar e sem Horário de Verão.' 
            : 'Latitude 0° (Equator): No seasons throughout the solar cycle and no Daylight Saving Time.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-white space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
          <Calendar size={13} className="text-amber-400" />
          <span>{isPt ? 'Previsão de Estações do Ano' : 'Seasonal Forecast'}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Automatic vs Desligado Mode Toggle Button */}
          {onToggleSeasonalVariation && (
            <button
              type="button"
              onClick={() => onToggleSeasonalVariation(!enableSeasonalVariation)}
              className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border transition-all cursor-pointer flex items-center gap-1 ${
                enableSeasonalVariation
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              title={
                isPt
                  ? (enableSeasonalVariation ? 'Modo Automático Ativo: Clique para Desligar a variação sazonal' : 'Modo Desligado: Clique para Ativar o modo Automático (Sendo como previsto)')
                  : (enableSeasonalVariation ? 'Automatic Mode Active: Click to turn OFF seasonal variation' : 'Off Mode: Click to enable Automatic mode')
              }
            >
              <span>{enableSeasonalVariation ? '⚡' : '🚫'}</span>
              <span>{enableSeasonalVariation ? (isPt ? 'Automático' : 'Auto') : (isPt ? 'Desligado' : 'Off')}</span>
            </button>
          )}

          {/* Dynamic Status Indicator Badge */}
          <span
            className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
              enableSeasonalVariation && dstForecast.isCurrentlyActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-white/40 border-white/10'
            }`}
            title={
              !enableSeasonalVariation
                ? (isPt ? 'Variação Sazonal Desligada pelo Usuário' : 'Seasonal Variation Turned Off')
                : isPt
                  ? (dstForecast.isCurrentlyActive ? 'Mudança de horário em vigor (Automático)' : 'Horário padrão / Variação inativa (Automático)')
                  : (dstForecast.isCurrentlyActive ? 'Seasonal time change active (Automatic)' : 'Standard time / Inactive (Automatic)')
            }
          >
            <span>{enableSeasonalVariation && dstForecast.isCurrentlyActive ? '☀️' : '🚫'}</span>
            <span>
              {!enableSeasonalVariation
                ? (isPt ? 'Desligado' : 'Off')
                : dstForecast.isCurrentlyActive
                  ? (isPt ? 'Variação Ativa' : 'Variation Active')
                  : (isPt ? 'Variação Inativa' : 'Variation Inactive')}
            </span>
          </span>

          {onOpenSeasonManager && (
            <button
              type="button"
              onClick={onOpenSeasonManager}
              className="text-[9px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors cursor-pointer"
              title={isPt ? 'Abrir Gerenciador de Temporadas' : 'Open Season Manager'}
            >
              <span>{isPt ? 'Gerenciar' : 'Manage'}</span>
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Upcoming Seasonal Transitions List */}
      <div className="space-y-1.5">
        {seasonalForecast.slice(0, 2).map((item) => (
          <div 
            key={`${item.transitionKey}-${item.utcDate.getTime()}`}
            className="flex items-center justify-between text-[11px] bg-black/25 px-2 py-1.5 rounded-lg border border-white/5"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm shrink-0">{item.seasonIcon}</span>
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="font-semibold block truncate" style={{ color: item.seasonColor }}>
                    {isPt ? item.transitionNamePt : item.transitionNameEn}
                  </span>
                  {item.isVariationAdjusted && (
                    <span className="text-[7.5px] font-mono px-1 py-0.2 bg-amber-400/15 text-amber-300 border border-amber-400/25 rounded shrink-0">
                      {isPt ? item.variationAdjustmentLabelPt : item.variationAdjustmentLabelEn}
                    </span>
                  )}
                  {item.exceptionLabelPt && (
                    <span className="text-[7.5px] font-mono px-1 py-0.2 bg-red-400/15 text-red-300 border border-red-400/25 rounded shrink-0">
                      {isPt ? item.exceptionLabelPt : item.exceptionLabelEn}
                    </span>
                  )}
                  {item.isUserProgrammed && (
                    <span 
                      className="text-[7px] font-mono px-1 py-0.2 bg-cyan-400/15 text-cyan-300 border border-cyan-400/25 rounded shrink-0"
                      title={isPt ? "Definido pela programação do usuário (Independente do País)" : "Defined by user programming (Country-Independent)"}
                    >
                      {isPt ? 'Programado' : 'User Rule'}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-white/40 font-mono block">
                  {item.daysRemaining === 0 
                    ? (isPt ? 'Hoje' : 'Today') 
                    : (isPt ? `em ${item.daysRemaining} dias` : `in ${item.daysRemaining} days`)}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 ml-2">
              <span className="text-white/90 font-mono text-[10.5px] tabular-nums block" title={item.formattedLocalWithException || item.formattedLocal}>
                {item.formattedLocal}
                {item.variationAdjustmentLabelPt && (
                  <span className="text-amber-300 font-bold ml-1.5 inline-block text-[9.5px]">
                    {isPt ? item.variationAdjustmentLabelPt : item.variationAdjustmentLabelEn}
                  </span>
                )}
              </span>
              <div className="flex items-center justify-end gap-1 text-[8.5px] font-mono">
                {item.isDstActive ? (
                  <span className="text-amber-400 flex items-center gap-0.5" title={item.seasonalRuleDescription}>
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
            </div>
          </div>
        ))}
      </div>

      {/* Daylight Saving Time & Seasonal Variations Status Footer */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-white/50 font-mono">
        <span className="flex items-center gap-1 truncate max-w-[190px]" title={dstForecast.statusLabelPt}>
          <Sun size={10} className={dstForecast.isCurrentlyActive ? 'text-amber-400' : 'text-white/30'} />
          <span className="truncate">{isPt ? dstForecast.statusLabelPt : dstForecast.statusLabelEn}</span>
          {dstForecast.isUserProgrammed && (
            <span className="text-[7.5px] text-cyan-400/80 shrink-0 font-semibold">
              · {isPt ? 'Usuário' : 'User'}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[8px] text-white/30 truncate max-w-[110px]" title={dstForecast.ruleDescription}>
            {dstForecast.ruleDescription}
          </span>
          <button
            type="button"
            onClick={() => {
              const locName = location?.name || 'Local';
              const lines = [
                `=== STATUS DA VARIAÇÃO SAZONAL (${locName}) ===`,
                `Estado: ${isPt ? dstForecast.statusLabelPt : dstForecast.statusLabelEn}`,
                `Regra: ${dstForecast.ruleDescription}`,
                `Desvio: ${dstForecast.isCurrentlyActive ? '+60 min' : '0 min (Horário Padrão)'}`,
                ...seasonalForecast.slice(0, 4).map(f => `• ${isPt ? f.transitionNamePt : f.transitionNameEn}: ${f.formattedLocal} (${isPt ? f.seasonNamePt : f.seasonNameEn})`),
                `Nota: Esta variação é local e pertence a este local.`
              ].join('\n');
              try {
                navigator.clipboard.writeText(lines);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // Fallback
              }
            }}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-amber-300 transition-colors cursor-pointer"
            title={isPt ? "Copiar Variação Sazonal Local" : "Copy Local Seasonal Variation"}
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
});

SeasonalWidget.displayName = 'SeasonalWidget';
