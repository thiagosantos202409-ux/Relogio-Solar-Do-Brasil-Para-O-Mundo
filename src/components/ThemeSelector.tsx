import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Wand2, Sparkles, Sun, Snowflake, Leaf, Check, Palette, RotateCcw, CalendarRange, Sliders } from "lucide-react";
import { SEASONAL_ACCENTS, SeasonalAccentConfig, SeasonType } from "../lib/seasonalTheme";

export interface Theme {
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  style: React.CSSProperties;
  frameStyle?: React.CSSProperties;
  panelStyle?: React.CSSProperties;
  fontStyle?: React.CSSProperties;
  className?: string;
}

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (theme: Theme) => void;
  onGenerate: (prompt: string) => void;
  predefinedThemes: Theme[];
  currentTheme: Theme;
  isGenerating: boolean;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isSeasonalColorEnabled: boolean;
  onToggleSeasonalColor: (enabled: boolean) => void;
  currentSeason?: string | null;
  language?: string;
  onOpenSeasonManager?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  isOpen,
  onClose, 
  onSelect, 
  onGenerate, 
  predefinedThemes,
  currentTheme,
  isGenerating, 
  prompt, 
  setPrompt,
  isSeasonalColorEnabled,
  onToggleSeasonalColor,
  currentSeason = 'summer',
  language = 'en',
  onOpenSeasonManager
}) => {
  if (!isOpen) return null;

  const isPt = language === 'pt';
  const normSeason = (currentSeason?.toLowerCase() as SeasonType) || 'summer';
  const activeSeasonalAccent = SEASONAL_ACCENTS[normSeason] || SEASONAL_ACCENTS.summer;

  const seasonsList: SeasonType[] = ['summer', 'autumn', 'winter', 'spring'];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="glass max-w-xl w-full p-6 sm:p-7 rounded-3xl relative border border-white/10 text-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-2xl border transition-colors shadow-lg"
                style={{
                  backgroundColor: `${activeSeasonalAccent.color}18`,
                  borderColor: `${activeSeasonalAccent.color}40`,
                  color: activeSeasonalAccent.color
                }}
              >
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                  {isPt ? 'Temas & Cores do Sistema' : 'Themes & System Colors'}
                </h2>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
                  {isPt ? 'Personalização e Adaptação Solar' : 'Customization & Solar Adaptation'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-full transition-all cursor-pointer"
              title={isPt ? 'Fechar' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="overflow-y-auto space-y-5 py-4 pr-1 -mr-1">
            
            {/* 1. Automated Seasonal Color Feature Card */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 shadow-md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {isPt ? 'Cor Sazonal Automática' : 'Automated Seasonal Color'}
                    </h3>
                    <span 
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${activeSeasonalAccent.badgeBg} ${activeSeasonalAccent.badgeBorder}`}
                    >
                      <span>{activeSeasonalAccent.icon}</span>
                      <span>{isPt ? activeSeasonalAccent.namePt : activeSeasonalAccent.name}</span>
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {isPt 
                      ? 'Adapta dinamicamente o destaque visual conforme a estação astronômica em tempo real (Ouro no Verão, Âmbar no Outono, Azul no Inverno, Esmeralda na Primavera).' 
                      : 'Dynamically shifts the theme accent based on real-time solar season (Gold in Summer, Amber in Autumn, Frost Blue in Winter, Emerald in Spring).'}
                  </p>
                </div>

                {/* Automated Seasonal Toggle */}
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={isSeasonalColorEnabled}
                    onChange={(e) => onToggleSeasonalColor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div 
                    className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      isSeasonalColorEnabled ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : ''
                    }`}
                  />
                </label>
              </div>

              {/* Real-time 4-Season Palette Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                {seasonsList.map(s => {
                  const item = SEASONAL_ACCENTS[s];
                  const isCurrent = s === normSeason;
                  return (
                    <div 
                      key={s}
                      className={`relative p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        isCurrent && isSeasonalColorEnabled 
                          ? 'bg-white/10 border-white/30 shadow-lg ring-1' 
                          : 'bg-black/30 border-white/5 opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        ringColor: isCurrent && isSeasonalColorEnabled ? item.color : 'transparent'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{item.icon}</span>
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold block truncate" style={{ color: item.color }}>
                          {isPt ? item.namePt : item.name}
                        </span>
                        <span className="text-[8px] font-mono text-white/40 uppercase block">
                          {item.color}
                        </span>
                      </div>
                      {isCurrent && isSeasonalColorEnabled && (
                        <div className="mt-1.5 flex items-center gap-1 text-[7.5px] text-white/80 font-bold uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: item.color }} />
                          {isPt ? 'Ativo Agora' : 'Active Now'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Open Season Manager Callout */}
              {onOpenSeasonManager && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <CalendarRange size={14} className="text-amber-400" />
                    <span>{isPt ? 'Gerenciador de Temporadas & Ciclos' : 'Season & Cycle Manager'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSeasonManager();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    <Sliders size={12} />
                    <span>{isPt ? 'Gerenciar Ciclos' : 'Manage Cycles'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Predefined Themes Section */}
            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2 font-mono">
                {isPt ? 'Temas Predefinidos' : 'Predefined Themes'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {predefinedThemes.map(t => {
                  const isSelected = currentTheme.name === t.name;
                  return (
                    <button 
                      key={t.name} 
                      onClick={() => onSelect(t)} 
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-white/15 border-amber-400/60 shadow-lg' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-7 h-7 rounded-xl border border-white/20 shadow-inner flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: t.bgColor,
                            borderColor: t.accentColor
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.accentColor }}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {t.name}
                          </span>
                          <span className="text-[8px] font-mono text-white/40 block">
                            {t.bgColor} • {t.accentColor}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-md">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. AI Custom Theme Generator */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1.5">
                <Wand2 size={12} className="text-amber-400" />
                {isPt ? 'Gerador de Tema com IA' : 'AI Theme Generator'}
              </label>
              <div className="flex gap-2">
                <input 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && prompt.trim() && !isGenerating) {
                      onGenerate(prompt);
                    }
                  }}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400/50 text-white w-full placeholder:text-white/30"
                  placeholder={isPt ? "Ex: Vintage Cobre, Cyberpunk Solar, Deserto Dourado..." : "Ex: Vintage Copper, Solar Cyberpunk, Golden Desert..."}
                  disabled={isGenerating}
                />
                <button 
                  onClick={() => onGenerate(prompt)} 
                  className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs shrink-0 cursor-pointer shadow-md" 
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Wand2 size={14} />
                      <span className="hidden sm:inline font-bold">{isPt ? 'Gerar' : 'Generate'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preset quick suggestions */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[8px] text-white/30 font-mono uppercase">{isPt ? 'Sugestões:' : 'Suggestions:'}</span>
                {[
                  isPt ? 'Obsidiana Estelar' : 'Stellar Obsidian',
                  isPt ? 'Cobre Mecânico' : 'Mechanical Copper',
                  isPt ? 'Aurora Boreal' : 'Northern Aurora',
                  isPt ? 'Ouro Solar Cósmico' : 'Cosmic Solar Gold'
                ].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      setPrompt(sug);
                      onGenerate(sug);
                    }}
                    className="text-[8px] font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5 transition-all cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              {isPt ? 'Concluído' : 'Done'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
