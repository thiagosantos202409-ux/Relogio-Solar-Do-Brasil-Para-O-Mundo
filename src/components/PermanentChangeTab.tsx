import React, { useState } from 'react';
import { Clock, Trash2, Plus } from 'lucide-react';

interface PermanentChange {
  id: string;
  date: string;
  time: string;
  source: 'local' | 'utc';
  offset: string;
}

export const PermanentChangeTab: React.FC<{
  language: 'pt' | 'en';
  changes: PermanentChange[];
  setChanges: React.Dispatch<React.SetStateAction<PermanentChange[]>>;
}> = ({ language, changes, setChanges }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [source, setSource] = useState<'local' | 'utc'>('local');
  const [offset, setOffset] = useState('');

  const addChange = () => {
    if (!date || !time || !offset) return;
    setChanges([...changes, { id: Date.now().toString(), date, time, source, offset }]);
    setDate('');
    setTime('');
    setOffset('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-bold text-amber-400/90 uppercase tracking-widest flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        {language === 'pt' ? 'Mudança Permanente de Fuso' : 'Permanent Timezone Change'}
      </h3>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <input type="text" placeholder="DD/MM/YYYY" value={date} onChange={e => setDate(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white placeholder:text-white/20"/>
        <input type="text" placeholder="HH:MM:SS" value={time} onChange={e => setTime(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white placeholder:text-white/20"/>
        <select value={source} onChange={e => setSource(e.target.value as 'local' | 'utc')} className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white">
          <option value="local">Local</option>
          <option value="utc">UTC Global</option>
        </select>
        <input type="text" placeholder="UTC+/- HH:MM" value={offset} onChange={e => setOffset(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white placeholder:text-white/20"/>
      </div>
      
      <button onClick={addChange} className="w-full py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
        <Plus size={14} /> {language === 'pt' ? 'Adicionar Mudança' : 'Add Change'}
      </button>

      <div className="space-y-2">
        {changes.map(change => (
          <div key={change.id} className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
            <span className="font-mono text-[10px] text-white">{change.date} {change.time} ({change.source.toUpperCase()})</span>
            <span className="font-mono text-[10px] text-amber-300">{change.offset}</span>
            <button onClick={() => setChanges(prev => prev.filter(c => c.id !== change.id))} className="text-red-400 cursor-pointer">
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
