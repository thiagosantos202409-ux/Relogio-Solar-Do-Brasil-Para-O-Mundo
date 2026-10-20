import React from 'react';

interface SeasonalTableProps {
  language: 'pt' | 'en';
}

const MONTH_DATA = [
  { namePt: 'Janeiro', nameEn: 'January', abbrPt: 'JAN', abbrEn: 'JAN', days: '31', minutes: '44640' },
  { namePt: 'Fevereiro', nameEn: 'February', abbrPt: 'FEV', abbrEn: 'FEB', days: '28/29', minutes: '40320/41760' },
  { namePt: 'Março', nameEn: 'March', abbrPt: 'MAR', abbrEn: 'MAR', days: '31', minutes: '44640' },
  { namePt: 'Abril', nameEn: 'April', abbrPt: 'ABR', abbrEn: 'APR', days: '30', minutes: '43200' },
  { namePt: 'Maio', nameEn: 'May', abbrPt: 'MAI', abbrEn: 'MAY', days: '31', minutes: '44640' },
  { namePt: 'Junho', nameEn: 'June', abbrPt: 'JUN', abbrEn: 'JUN', days: '30', minutes: '43200' },
  { namePt: 'Julho', nameEn: 'July', abbrPt: 'JUL', abbrEn: 'JUL', days: '31', minutes: '44640' },
  { namePt: 'Agosto', nameEn: 'August', abbrPt: 'AGO', abbrEn: 'AUG', days: '31', minutes: '44640' },
  { namePt: 'Setembro', nameEn: 'September', abbrPt: 'SET', abbrEn: 'SEP', days: '30', minutes: '43200' },
  { namePt: 'Outubro', nameEn: 'October', abbrPt: 'OUT', abbrEn: 'OCT', days: '31', minutes: '44640' },
  { namePt: 'Novembro', nameEn: 'November', abbrPt: 'NOV', abbrEn: 'NOV', days: '30', minutes: '43200' },
  { namePt: 'Dezembro', nameEn: 'December', abbrPt: 'DEZ', abbrEn: 'DEC', days: '31', minutes: '44640' },
] as const;

export const SeasonalTable: React.FC<SeasonalTableProps> = ({ language }) => {
  const headers = language === 'pt' ? ['Mês', 'Sigla', 'Dias', 'Minutos'] : ['Month', 'Abbr', 'Days', 'Minutes'];

  return (
    <div className="mt-4 bg-black/40 p-3 rounded-xl border border-white/5">
      <table className="w-full text-[10px] text-white/80">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left pb-1">{headers[0]}</th>
            <th className="text-center pb-1">{headers[1]}</th>
            <th className="text-right pb-1">{headers[2]}</th>
            <th className="text-right pb-1">{headers[3]}</th>
          </tr>
        </thead>
        <tbody>
          {MONTH_DATA.map((m, i) => (
            <tr key={`month-row-${m.abbrPt}-${i}`} className="border-b border-white/5 last:border-0">
              <td className="py-1">{language === 'pt' ? m.namePt : m.nameEn}</td>
              <td className="py-1 text-center font-mono text-amber-400">{language === 'pt' ? m.abbrPt : m.abbrEn}</td>
              <td className="py-1 text-right font-mono">{m.days}</td>
              <td className="py-1 text-right font-mono text-emerald-400">{m.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
