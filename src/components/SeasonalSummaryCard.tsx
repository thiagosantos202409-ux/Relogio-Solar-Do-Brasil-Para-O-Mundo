import React, { useMemo } from 'react';

interface SeasonalPeriod {
  id: string;
  startRule: string;
  endRule: string;
  shift?: string;
  vigencia?: string;
  validityType?: 'single' | 'range';
}

interface SeasonalSummaryCardProps {
  periods: SeasonalPeriod[];
  language: string;
}

const monthMap: Record<string, number> = {
  'jan': 0, 'january': 0, 'janeiro': 0,
  'feb': 1, 'fevereiro': 1, 'february': 1,
  'mar': 2, 'march': 2, 'marco': 2, 'março': 2,
  'apr': 3, 'april': 3, 'abril': 3,
  'may': 4, 'maio': 4,
  'jun': 5, 'june': 5, 'junho': 5,
  'jul': 6, 'july': 6, 'julho': 6,
  'aug': 7, 'august': 7, 'agosto': 7,
  'sep': 8, 'september': 8, 'setembro': 8,
  'oct': 9, 'october': 9, 'outubro': 9,
  'nov': 10, 'november': 10, 'novembro': 10,
  'dec': 11, 'december': 11, 'dezembro': 11,
};

const getMonth = (rule: string): number => {
  const lower = (rule || '').toLowerCase();
  for (const month in monthMap) {
    if (lower.includes(month)) return monthMap[month];
  }
  return 0;
};

const monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const SeasonalSummaryCard: React.FC<SeasonalSummaryCardProps> = React.memo(({ periods, language }) => {
  const data = useMemo(() => {
    const arr = new Array(12).fill(0);
    periods.forEach(p => {
      const startMonth = getMonth(p.startRule);
      const endMonth = getMonth(p.endRule);
      const shiftValue = parseInt(p.shift || '60', 10) || 0;

      if (endMonth >= startMonth) {
        for (let m = startMonth; m <= endMonth; m++) {
          arr[m] += shiftValue;
        }
      } else {
        for (let m = startMonth; m < 12; m++) arr[m] += shiftValue;
        for (let m = 0; m <= endMonth; m++) arr[m] += shiftValue;
      }
    });
    return arr;
  }, [periods]);

  const maxVal = Math.max(1, ...data);

  return (
    <div className="bg-black/30 p-3 rounded-xl border border-white/5 mt-4">
      <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2">
        {language === 'pt' ? 'Impacto Sazonal Anual (Minutos)' : 'Annual Seasonal Impact (Minutes)'}
      </h3>
      <div className="flex items-end gap-1 h-20 pt-2 px-1">
        {data.map((val, i) => {
          const heightPct = Math.round((val / maxVal) * 80);
          return (
            <div key={`month-impact-col-${i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              {val > 0 && (
                <span className="text-[7px] font-mono text-amber-400 font-bold leading-none">{val}</span>
              )}
              <div 
                className="w-full bg-amber-400/80 rounded-t-sm transition-all duration-300 min-h-[2px]"
                style={{ height: `${Math.max(4, heightPct)}%` }}
              />
              <span className="text-[8px] font-mono text-white/40">{monthLetters[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
