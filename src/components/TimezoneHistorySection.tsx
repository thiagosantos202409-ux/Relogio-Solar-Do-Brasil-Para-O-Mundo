import React from 'react';
import { Clock, Plus, Trash2, Copy } from 'lucide-react';

interface TimezoneHistoryItem {
  id: string;
  startRule: string;
  startTime: string;
  utcOffset: string;
}

interface Props {
  periods: TimezoneHistoryItem[];
  setPeriods: React.Dispatch<React.SetStateAction<TimezoneHistoryItem[]>>;
  language: 'pt' | 'en';
}

export const TimezoneHistorySection: React.FC<Props> = ({ periods, setPeriods, language }) => {
  const addPeriod = () => {
    setPeriods([...periods, { id: Math.random().toString(), startRule: '01/01/2000', startTime: '00:00', utcOffset: '+00:00:00' }]);
  };

  const removePeriod = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, field: keyof TimezoneHistoryItem, value: string) => {
    setPeriods(periods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const duplicatePeriod = (period: TimezoneHistoryItem) => {
    setPeriods([...periods, { ...period, id: Math.random().toString() }]);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
        <Clock size={12} className="text-indigo-400" />
        {language === 'pt' ? 'Histórico do Fuso Horário' : 'Time Zone History'}
      </h3>
      {periods.map((period, index) => (
        <div key={period.id} className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded-xl space-y-3">
          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
            <span className="text-[10px] text-indigo-300 font-bold uppercase">
              {language === 'pt' ? `Mudança #${index + 1}` : `Change #${index + 1}`}
              {index === periods.length - 1 && <span className="ml-2 text-amber-400">({language === 'pt' ? 'Atual/Permanente' : 'Current/Permanent'})</span>}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => duplicatePeriod(period)} className="text-white/60 hover:text-white cursor-pointer"><Copy size={12} /></button>
              <button onClick={() => removePeriod(period.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer"><Trash2 size={12} /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <label className="text-white/40 block mb-1 uppercase">{language === 'pt' ? 'Data (XX/XX/XXXX)' : 'Date'}</label>
              <input type="text" placeholder="01/01/2000" className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-white" value={period.startRule} onChange={(e) => updatePeriod(period.id, 'startRule', e.target.value)} />
            </div>
            <div>
              <label className="text-white/40 block mb-1 uppercase">{language === 'pt' ? 'Hora' : 'Time'}</label>
              <input type="time" className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-white" value={period.startTime} onChange={(e) => updatePeriod(period.id, 'startTime', e.target.value)} />
            </div>
          </div>

          <div>
             <label className="text-white/40 block mb-1 uppercase">{language === 'pt' ? 'Fuso UTC (+/- HH:MM:SS)' : 'UTC Offset (+/- HH:MM:SS)'}</label>
             <input type="text" placeholder="+00:00:00" className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-white font-mono" value={period.utcOffset} onChange={(e) => updatePeriod(period.id, 'utcOffset', e.target.value)} />
          </div>
        </div>
      ))}
      <button onClick={addPeriod} className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer">
        <Plus size={12} /> {language === 'pt' ? 'Adicionar Mudança' : 'Add Change'}
      </button>
    </div>
  );
};
