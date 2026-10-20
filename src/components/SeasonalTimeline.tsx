import React from 'react';

interface SeasonalPeriod {
  id: string;
  startRule: string;
  endRule: string;
  vigencia?: string;
  validityType?: 'single' | 'range';
  shift?: string;
}

interface SeasonalTimelineProps {
  periods: SeasonalPeriod[];
  language: string;
  currentTime: number;
}

const monthMap: Record<string, number> = {
  'jan': 0, 'january': 0, 'janeiro': 0,
  'feb': 1, 'fevereiro': 1, 'february': 1,
  'mar': 2, 'marco': 2, 'março': 2, 'march': 2,
  'apr': 3, 'abril': 3, 'april': 3,
  'may': 4, 'maio': 4,
  'jun': 5, 'junho': 5, 'june': 5,
  'jul': 6, 'julho': 6, 'july': 6,
  'aug': 7, 'agosto': 7, 'august': 7,
  'sep': 8, 'setembro': 8, 'september': 8,
  'oct': 9, 'outubro': 9, 'october': 9,
  'nov': 10, 'novembro': 10, 'november': 10,
  'dec': 11, 'dezembro': 11, 'december': 11,
};

const getMonth = (rule: string): number => {
  const lower = (rule || '').toLowerCase();
  for (const month in monthMap) {
    if (lower.includes(month)) return monthMap[month];
  }
  return 0;
};

const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const SeasonalTimeline: React.FC<SeasonalTimelineProps> = React.memo(({ periods, language, currentTime }) => {
  const currentMonth = new Date(currentTime).getMonth();

  if (periods.length === 0) return null;

  return (
    <div className="w-full bg-black/40 rounded-xl p-3 border border-white/5 space-y-2">
      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-white/50">
        <span>{language === 'pt' ? 'Linha do Tempo Sazonal' : 'Seasonal Timeline'}</span>
        <span className="text-amber-400 font-mono">{language === 'pt' ? `Mês Atual: ${monthLabels[currentMonth]}` : `Current: ${monthLabels[currentMonth]}`}</span>
      </div>

      {/* Month grid headers */}
      <div className="grid grid-cols-12 gap-0.5 text-center text-[8px] font-mono text-white/30 border-b border-white/5 pb-1">
        {monthLabels.map((m, idx) => (
          <span key={`month-hdr-${idx}`} className={idx === currentMonth ? "text-amber-400 font-bold" : ""}>
            {m}
          </span>
        ))}
      </div>

      {/* Bars per period */}
      <div className="space-y-1.5 pt-1">
        {periods.map((p, pIdx) => {
          const startMonth = getMonth(p.startRule);
          const endMonth = getMonth(p.endRule);
          const hasConflict = periods.some(other => 
            other.id !== p.id && other.vigencia === p.vigencia && other.startRule === p.startRule
          );
          
          const isWrapped = startMonth > endMonth;
          const isActive = isWrapped
            ? (currentMonth >= startMonth || currentMonth <= endMonth)
            : (currentMonth >= startMonth && currentMonth <= endMonth);

          const barColorClass = hasConflict 
            ? 'bg-rose-500/80 border border-rose-400' 
            : isActive 
            ? 'bg-emerald-500/80 border border-emerald-400' 
            : 'bg-amber-400/60 border border-amber-300';

          return (
            <div key={p.id ? `period-${p.id}-${pIdx}` : `period-${pIdx}`} className="relative h-5 bg-white/5 rounded-md overflow-hidden flex items-center px-2">
              {!isWrapped ? (
                <div 
                  className={`absolute top-0 bottom-0 rounded-md transition-all ${barColorClass}`}
                  style={{
                    left: `${(startMonth / 12) * 100}%`,
                    width: `${Math.max(8.33, ((endMonth - startMonth + 1) / 12) * 100)}%`,
                  }}
                />
              ) : (
                <>
                  <div 
                    className={`absolute top-0 bottom-0 rounded-r-none rounded-l-md transition-all ${barColorClass}`}
                    style={{
                      left: `${(startMonth / 12) * 100}%`,
                      width: `${((12 - startMonth) / 12) * 100}%`,
                    }}
                  />
                  <div 
                    className={`absolute top-0 bottom-0 rounded-l-none rounded-r-md transition-all ${barColorClass}`}
                    style={{
                      left: '0%',
                      width: `${((endMonth + 1) / 12) * 100}%`,
                    }}
                  />
                </>
              )}
              <span className="relative z-10 text-[8px] font-mono font-bold text-white drop-shadow truncate">
                {p.startRule || 'Período'} → {p.endRule || '...'} {p.shift ? `(${p.shift}m)` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
