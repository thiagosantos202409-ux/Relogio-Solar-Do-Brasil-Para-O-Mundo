import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { formatCoordinatePair } from '../lib/coordinateParser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface LocationHistoryChatProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  language: string;
  ramLimit: '2GB' | '4GB' | '6GB' | '8GB' | '10GB' | '12GB' | 'Unlimited';
}

// 1. Memoized markdown text parser component
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

        // Replace **bold** with <strong>
        const parts = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;

        while ((match = boldRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(<span key={`txt-${idx}-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
          }
          parts.push(<strong key={`bold-${idx}-${match.index}`} className="text-amber-400 font-bold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < content.length) {
          parts.push(<span key={`txt-${idx}-${lastIndex}`}>{content.substring(lastIndex)}</span>);
        }

        const renderedLine = parts.length > 0 ? parts : content;

        if (isBullet) {
          return (
            <li key={idx} className="ml-4 list-disc pl-1 text-white/90 leading-relaxed text-xs my-1">
              {renderedLine}
            </li>
          );
        }

        if (line.trim().startsWith('###')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-amber-300 tracking-wider uppercase mt-3 mb-1 font-mono">
              {line.replace('###', '').trim()}
            </h4>
          );
        }
        if (line.trim().startsWith('##')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-amber-400 tracking-widest uppercase mt-4 mb-1.5 font-mono">
              {line.replace('##', '').trim()}
            </h3>
          );
        }

        return line.trim() === '' ? (
          <div key={idx} className="h-2" />
        ) : (
          <p key={idx} className="text-white/80 leading-relaxed text-xs mb-1">
            {renderedLine}
          </p>
        );
      })}
    </>
  );
});

ParsedMessageText.displayName = 'ParsedMessageText';

// 2. Memoized Chat Message Item
const ChatMessageItem: React.FC<{ message: Message }> = React.memo(({ message }) => {
  return (
    <div
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
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
            key={`chat-sugg-${idx}-${s.slice(0, 12)}`}
            onClick={() => onSelect(s)}
            className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-amber-400/10 hover:text-amber-400 border border-white/5 hover:border-amber-400/30 text-[10px] transition-all flex items-center justify-between text-white/60 cursor-pointer"
          >
            <span>{s}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-50 shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
});

SuggestionsList.displayName = 'SuggestionsList';

// 4. Dedicated Input Box Sub-component to isolate typing state and prevent drawer re-rendering
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
export const LocationHistoryChat: React.FC<LocationHistoryChatProps> = ({
  isOpen,
  onClose,
  locationName,
  latitude,
  longitude,
  timezoneOffset,
  language,
  ramLimit,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPt = language === 'pt';

  // Translate labels memoized to prevent constant object literal rebuilds
  const t = useMemo(() => ({
    title: isPt ? "Histórico & Sazonalidade AI" : "AI Timezone & Seasonal History",
    subtitle: isPt ? "Assistente Neural de Fusos" : "Neural Timezone Assistant",
    placeholder: isPt ? "Pergunte sobre fuso horário, história ou estações..." : "Ask about timezones, history, or seasons...",
    suggestionTitle: isPt ? "Sugestões de Pergunta:" : "Suggested Questions:",
    welcomeMsg: isPt 
      ? `Olá! Sou seu assistente de fuso horário. Estou calibrado para analisar **${locationName}** (${formatCoordinatePair(latitude, longitude, 2, false)}, Offset: ${timezoneOffset}m). O que gostaria de saber sobre a história dos fusos horários daqui, as alterações sazonais ou o horário de verão?`
      : `Hello! I'm your timezone history assistant. I am calibrated for **${locationName}** (${formatCoordinatePair(latitude, longitude, 2, false)}, Offset: ${timezoneOffset}m). What would you like to know about this location's timezone history, seasonal shifts, or daylight saving time?`,
    errorMsg: isPt ? "Desculpe, ocorreu um erro de conexão." : "Sorry, a connection error occurred.",
    suggestions: isPt ? [
      "Qual é a história do fuso horário aqui?",
      "Quando ocorreu o último Horário de Verão nesta região?",
      "Como mudam os ângulos solares e as estações do ano aqui?",
      "Quais foram as decisões políticas de fuso horário mais marcantes?"
    ] : [
      "What is the timezone history of this location?",
      "When did DST last occur in this region?",
      "How do solar angles and seasons vary here?",
      "What were the most significant timezone policy changes here?"
    ]
  }), [locationName, latitude, longitude, timezoneOffset, isPt]);

  // Initialize welcome message when location or translation changes
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

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `history-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const getLimitedMessages = (currentMessages: Message[], limit: '2GB' | '4GB' | '6GB' | '8GB' | '10GB' | '12GB' | 'Unlimited') => {
      const allMessages = [...currentMessages, userMsg];
      if (limit === '2GB' || limit === '4GB') {
        // Keep only the last 4 messages (2 user, 2 assistant) for low RAM
        return allMessages.slice(-4);
      }
      return allMessages;
    };

    try {
      const response = await fetch('/api/chat-location-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName,
          latitude,
          longitude,
          timezoneOffset,
          ramLimit,
          language: isPt ? 'Portuguese' : 'English',
          messages: getLimitedMessages(messages, ramLimit).map(m => ({
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
        id: `history-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      let errorText = t.errorMsg;
      const errorString = String(err.message || err);
      if (errorString.includes('API_KEY_INVALID')) {
        errorText = isPt 
          ? "⚠️ **Chave API do Gemini não configurada ou Inválida**\n\nPor favor, configure sua `GEMINI_API_KEY` nas Configurações (ícone de engrenagem) do AI Studio."
          : "⚠️ **Gemini API Key is missing or invalid**\n\nPlease configure your `GEMINI_API_KEY` in the Settings panel (gear icon) of AI Studio.";
      } else if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('high demand')) {
        errorText = isPt
          ? "⚠️ **Limite de Cota Atingido**\n\nVocê excedeu sua cota atual da API do Gemini. Por favor, verifique seu plano e detalhes de faturamento no Google AI Studio."
          : "⚠️ **Quota Limit Reached**\n\nYou have exceeded your current Gemini API quota. Please check your plan and billing details in the Google AI Studio console.";
      } else if (err.message) {
        errorText = isPt
          ? `⚠️ **Erro na geração:**\n\n${err.message}`
          : `⚠️ **Generation error:**\n\n${err.message}`;
      }
      
      setMessages(prev => [...prev, {
        id: `history-ai-err-${Date.now()}`,
        role: 'assistant',
        text: errorText,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm pointer-events-auto">
          {/* Backdrop click close */}
          <div className="flex-1" onClick={onClose} />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md h-full bg-[#0a0714]/95 border-l border-white/10 flex flex-col shadow-2xl relative"
          >
            {/* Ambient glows - hardware accelerated */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none transform-gpu" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none transform-gpu" />

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

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10">
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest animate-pulse">
                      {isPt ? "Sincronizando com Gemini..." : "Syncing with Gemini..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions & Input Footer */}
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
