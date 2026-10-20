import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Loader2, ArrowRight, CheckCircle2, Globe, Calendar, Clock, Info } from 'lucide-react';
import { LocationSuggestion } from '../services/geminiService';
import { formatCoordinatePair } from '../lib/coordinateParser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposedLocation?: LocationSuggestion | null;
  timestamp: Date;
}

interface CustomLocationCreatorChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationSuggestion) => void;
  currentCoords?: { latitude: number; longitude: number };
  language: string;
  initialLocation?: any;
}

// 1. Memoized component to parse and render Markdown message text efficiently
const ParsedMessageText: React.FC<{ text: string }> = React.memo(({ text }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, idx) => {
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        let content = line;
        if (isBullet) {
          content = line.trim().substring(2);
        }

        // Replace **bold**
        const parts: React.ReactNode[] = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;
        let partIdx = 0;

        while ((match = boldRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(<span key={`txt-${idx}-${partIdx++}`}>{content.substring(lastIndex, match.index)}</span>);
          }
          parts.push(<strong key={`bold-${idx}-${partIdx++}`} className="text-amber-400 font-bold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < content.length) {
          parts.push(<span key={`txt-end-${idx}-${partIdx++}`}>{content.substring(lastIndex)}</span>);
        }

        const renderedLine = parts.length > 0 ? parts : content;

        if (isBullet) {
          return (
            <li key={`bullet-${idx}`} className="ml-4 list-disc pl-1 text-white/90 leading-relaxed text-xs my-1">
              {renderedLine}
            </li>
          );
        }

        if (line.trim().startsWith('###')) {
          return (
            <h4 key={`h4-${idx}`} className="text-xs font-bold text-amber-300 tracking-wider uppercase mt-3 mb-1 font-mono">
              {line.replace('###', '').trim()}
            </h4>
          );
        }
        if (line.trim().startsWith('##')) {
          return (
            <h3 key={`h3-${idx}`} className="text-sm font-bold text-amber-400 tracking-widest uppercase mt-4 mb-1.5 font-mono">
              {line.replace('##', '').trim()}
            </h3>
          );
        }

        return line.trim() === '' ? (
          <div key={`space-${idx}`} className="h-2" />
        ) : (
          <p key={`p-${idx}`} className="text-white/80 leading-relaxed text-xs mb-1">
            {renderedLine}
          </p>
        );
      })}
    </>
  );
});

ParsedMessageText.displayName = 'ParsedMessageText';

// 2. Memoized Message Item Component to avoid expensive list re-renders when typing
interface ChatMessageItemProps {
  message: Message;
  appliedId: string | null;
  onApply: (id: string, loc: LocationSuggestion) => void;
  language: string;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  message,
  appliedId,
  onApply,
  language
}) => {
  const isPt = language === 'pt';
  const tProposalTitle = isPt ? "PROPOSTA DE CONFIGURAÇÃO SOLAR:" : "PROPOSED SOLAR CONFIGURATION:";
  const tApplyBtn = isPt ? "Aplicar Configuração ao Relógio" : "Apply Config to Solar Clock";
  const tAppliedSuccess = isPt ? "Configuração aplicada com sucesso!" : "Configuration applied successfully!";

  return (
    <div className="space-y-3">
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
            message.role === 'user'
              ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-tr-none'
              : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
          }`}
        >
          {message.role === 'assistant' ? (
            <div className="space-y-1">
              <ParsedMessageText text={message.text} />
            </div>
          ) : (
            <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
          )}
          <span className="block text-[8px] opacity-30 text-right mt-1.5 font-mono">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {message.proposedLocation && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="border border-amber-400/30 rounded-2xl bg-amber-400/[0.03] p-4 mx-4 space-y-3 shadow-lg shadow-amber-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-1.5 text-[8px] font-bold text-amber-400 uppercase tracking-widest font-mono">
            <Globe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            {tProposalTitle}
          </div>

          <div className="space-y-2">
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{message.proposedLocation.name}</span>
                <span className="text-[8px] font-mono text-white/40">{formatCoordinatePair(message.proposedLocation.latitude, message.proposedLocation.longitude, 4, false)}</span>
              </div>
              <p className="text-[9px] text-white/60 italic">{message.proposedLocation.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
              <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/30 text-[7px] uppercase tracking-wider">{isPt ? "Fuso Base" : "Base Offset"}</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  UTC{message.proposedLocation.timezoneOffset >= 0 ? '+' : ''}{(message.proposedLocation.timezoneOffset / 60).toFixed(1)}h
                </span>
              </div>
              <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col gap-0.5">
                <span className="text-white/30 text-[7px] uppercase tracking-wider">{isPt ? "Horário Verão" : "DST Shift"}</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 shrink-0" />
                  {message.proposedLocation.dstInfo?.hasDst 
                    ? `+${message.proposedLocation.dstInfo.shift || 60}m` 
                    : (isPt ? "Inativo" : "Disabled")}
                </span>
              </div>
            </div>

            {message.proposedLocation.dstInfo?.hasDst && (message.proposedLocation.dstInfo.start || message.proposedLocation.dstInfo.end) && (
              <div className="bg-black/20 p-2 rounded-lg border border-white/5 text-[8px] font-mono text-white/50 space-y-0.5">
                {message.proposedLocation.dstInfo.start && (
                  <div className="flex justify-between">
                    <span>{isPt ? "Início:" : "Starts:"}</span>
                    <span className="text-white/80">{message.proposedLocation.dstInfo.start}</span>
                  </div>
                )}
                {message.proposedLocation.dstInfo.end && (
                  <div className="flex justify-between">
                    <span>{isPt ? "Fim:" : "Ends:"}</span>
                    <span className="text-white/80">{message.proposedLocation.dstInfo.end}</span>
                  </div>
                )}
              </div>
            )}

            {message.proposedLocation.alternativeTimes && message.proposedLocation.alternativeTimes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest font-mono block pl-1">
                  {isPt ? "Fuso Alternativo Adicional:" : "Alternative Time Mode:"}
                </span>
                {message.proposedLocation.alternativeTimes.map((alt, aidx) => (
                  <div key={`creator-alt-${alt.name}-${aidx}`} className="bg-black/20 p-1.5 rounded-lg border border-white/5 text-[8px] font-mono flex justify-between items-center">
                    <span className="text-white/70">{alt.name}</span>
                    <span className="text-amber-400/80 font-bold">UTC{alt.shift >= 0 ? '+' : ''}{(alt.shift / 60).toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onApply(message.id, message.proposedLocation!)}
            className={`w-full py-2 px-3 rounded-xl font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              appliedId === message.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/10'
            }`}
          >
            {appliedId === message.id ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {tAppliedSuccess}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                {tApplyBtn}
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

// 3. Memoized Suggestion Quick Buttons
interface SuggestionsListProps {
  suggestions: string[];
  title: string;
  onSelect: (text: string) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = React.memo(({ suggestions, title, onSelect }) => {
  return (
    <div className="mb-4">
      <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((s, idx) => (
          <button
            key={`creator-sugg-${idx}-${s.slice(0, 12)}`}
            onClick={() => onSelect(s)}
            className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:text-amber-400 border border-white/5 hover:border-amber-400/30 text-[10px] transition-all flex items-center justify-between text-white/60 cursor-pointer"
          >
            <span className="truncate flex-1 pr-2">{s}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-50 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
});

SuggestionsList.displayName = 'SuggestionsList';

// 4. Dedicated Input Box Sub-component to contain typing state
interface ChatInputFormProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const ChatInputForm: React.FC<ChatInputFormProps> = React.memo(({ onSend, isLoading, placeholder }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSend(trimmed);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50 transition-colors placeholder:text-white/20"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="p-2 rounded-xl bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
});

ChatInputForm.displayName = 'ChatInputForm';

// Main Container
export const CustomLocationCreatorChat: React.FC<CustomLocationCreatorChatProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentCoords,
  language,
  initialLocation,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPt = language === 'pt';

  // Memoize static text keys to avoid recreation
  const t = useMemo(() => ({
    title: isPt ? "Arquiteto de Fusos e Sazonalidade AI" : "AI Timezone & Seasonality Architect",
    subtitle: isPt ? "Criação de Locais Personalizados" : "Custom Location Creator",
    placeholder: isPt ? "Descreva o local (ex: 'São Paulo com DST de 90m' ou 'Atlântida na Lat -30')..." : "Describe the location (e.g., 'London but UTC+2 with 60m DST' or 'Utopia at Lat 45')...",
    suggestionTitle: isPt ? "Ideias de Criação:" : "Creation Ideas:",
    welcomeMsg: isPt 
      ? `Bem-vindo ao **Arquiteto de Sazonalidade AI**! Aqui você pode criar fusos horários customizados, simular a história de qualquer local no tempo, ou inventar regiões com regras únicas de Horário de Verão e sazonalidade solar. 
      
Como deseja definir a sazonalidade e o fuso do seu local personalizado hoje? Escreva ou use uma das sugestões abaixo!`
      : `Welcome to the **AI Seasonality Architect**! Here you can create custom timezones, simulate any location's history back in time, or invent geographic regions with unique DST rules and solar seasonality.

How would you like to define your custom location's seasonality and offset today? Type below or pick a suggestion!`,
    errorMsg: isPt ? "Desculpe, ocorreu um erro ao gerar a configuração." : "Sorry, an error occurred while generating the configuration.",
    suggestions: isPt ? [
      "Criar Atlântida na latitude -25 e longitude -40, com fuso UTC-2, e Horário de Verão de 90 minutos ativo em Dezembro",
      "Fazer um fuso personalizado para o Rio de Janeiro em 1995, explicando as regras sazonais e Horário de Verão",
      "Definir fuso solar de Utopia: Latitude 45°N, Longitude 15°E, sem Horário de Verão, mas com fuso alternativo UTO de -30 minutos",
      "Explicar a história e mudança sazonal no Polo Sul e propor a configuração ideal com fuso UTC+12"
    ] : [
      "Create Atlantis at latitude -25 and longitude -40, offset UTC-2, with 90-minute DST active in December",
      "Make a custom timezone for Rio de Janeiro in 1995, explaining daylight saving rules and seasons",
      "Define Utopia: Latitude 45°N, Longitude 15°E, no DST, but with UTO alternative time of -30 minutes",
      "Explain the history and seasonal changes at South Pole and suggest optimal UTC+12 config"
    ],
  }), [isPt]);

  // Load welcome message once or when language updates
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: t.welcomeMsg,
        timestamp: new Date()
      }
    ]);
  }, [t.welcomeMsg]);

  // Handle auto-scroll to latest messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    // Stable ID based on timestamp and sequence to eliminate element replacement and RAM overhead
    const userMsg: Message = {
      id: `msg-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-custom-location-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: isPt ? 'Portuguese' : 'English',
          currentLocation: currentCoords,
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Network error');
      }
      const data = await response.json();

      setMessages(prev => [...prev, {
        id: `msg-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        role: 'assistant',
        text: data.text,
        proposedLocation: data.proposedLocation,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      let errorText = t.errorMsg;
      if (err.message?.includes('API_KEY_INVALID')) {
        errorText = isPt 
          ? "⚠️ **Chave API do Gemini não configurada ou Inválida**\n\nPor favor, configure sua `GEMINI_API_KEY` nas Configurações (ícone de engrenagem) do AI Studio."
          : "⚠️ **Gemini API Key is missing or invalid**\n\nPlease configure your `GEMINI_API_KEY` in the Settings panel (gear icon) of AI Studio.";
      } else if (err.message?.includes('UNAVAILABLE') || err.message?.includes('503') || err.message?.includes('high demand')) {
        errorText = isPt
          ? "⏱️ **Serviço temporariamente indisponível**\n\nOs servidores do Gemini estão com alta demanda no momento. Por favor, tente novamente em alguns instantes."
          : "⏱️ **Service temporarily unavailable**\n\nGemini models are experiencing high demand right now. Please retry in a few moments.";
      } else if (err.message) {
        errorText = isPt
          ? `⚠️ **Erro na geração:**\n\n${err.message}`
          : `⚠️ **Generation error:**\n\n${err.message}`;
      }
      
      setMessages(prev => [...prev, {
        id: `msg-ai-err-${Date.now()}`,
        role: 'assistant',
        text: errorText,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (id: string, loc: LocationSuggestion) => {
    onSelectLocation(loc);
    setAppliedId(id);
    setTimeout(() => setAppliedId(null), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm pointer-events-auto">
          {/* Backdrop close */}
          <div className="flex-1" onClick={onClose} />

          {/* Chat Drawer panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md h-full bg-[#05040a]/95 border-l border-white/10 flex flex-col shadow-2xl relative"
          >
            {/* Ambient visual background glow elements - hardware accelerated */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none transform-gpu" />
            <div className="absolute bottom-1/3 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none transform-gpu" />

            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">{t.title}</h3>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-mono mt-0.5">{t.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {messages.map((m) => (
                <ChatMessageItem 
                  key={m.id}
                  message={m}
                  appliedId={appliedId}
                  onApply={handleApply}
                  language={language}
                />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest animate-pulse">
                      {isPt ? "Arquiteto AI Calculando Sazonalidade..." : "AI Seasonality Architect calculating..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Form Input Panel footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 relative z-10">
              {messages.length === 1 && (
                <SuggestionsList 
                  suggestions={t.suggestions}
                  title={t.suggestionTitle}
                  onSelect={handleSend}
                />
              )}

              <ChatInputForm 
                onSend={handleSend}
                isLoading={isLoading}
                placeholder={t.placeholder}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
