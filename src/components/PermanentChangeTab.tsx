import React, { useState } from 'react';
import { Clock, Trash2, Plus, Sparkles } from 'lucide-react';
import { parseOffsetStringToMinutes, formatOffsetMinutesToString } from '../lib/moroccoTimezone';

export interface PermanentChange {
  id: string;
  date: string; // XX/XX/XXXX (DD/MM/YYYY)
  time: string; // XX:XX:XX (HH:MM:SS)
  source: 'local' | 'utc';
  offset: string; // UTC+/- XX:XX:XX
  validityType: 'from' | 'single' | 'until' | 'permanent';
}

interface PermanentChangeTabProps {
  language: 'pt' | 'en';
  changes: PermanentChange[];
  setChanges: React.Dispatch<React.SetStateAction<PermanentChange[]>>;
}

export const PermanentChangeTab: React.FC<PermanentChangeTabProps> = ({
  language,
  changes,
  setChanges
}) => {
  const isPt = language === 'pt';

  const [date, setDate] = useState('20/09/2026');
  const [time, setTime] = useState('01:00:00');
  const [source, setSource] = useState<'local' | 'utc'>('local');
  const [offset, setOffset] = useState('UTC+00:00:00');
  const [validityType, setValidityType] = useState<'from' | 'single' | 'until' | 'permanent'>('from');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddChange = () => {
    setErrorMsg(null);
    if (!date.trim() || !time.trim() || !offset.trim()) {
      setErrorMsg(isPt ? 'Preencha a data (XX/XX/XXXX), hora (XX:XX:XX) e o fuso (UTC+/- XX:XX:XX).' : 'Please fill date (XX/XX/XXXX), time (XX:XX:XX), and offset (UTC+/- XX:XX:XX).');
      return;
    }

    const formattedDate = date.trim();
    const formattedTime = time.trim();
    const parsedMinutes = parseOffsetStringToMinutes(offset);
    const formattedOffset = formatOffsetMinutesToString(parsedMinutes);

    const newItem: PermanentChange = {
      id: `perm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: formattedDate,
      time: formattedTime,
      source,
      offset: formattedOffset,
      validityType
    };

    setChanges(prev => [...prev, newItem]);

    setDate('');
    setTime('');
    setOffset('UTC-03:00:00');
  };

  const handleAddPreset = (preset: { date: string; time: string; source: 'local' | 'utc'; offset: string; validityType: 'from' | 'single' | 'until' | 'permanent' }) => {
    setErrorMsg(null);
    const newItem: PermanentChange = {
      id: `perm-preset-${Date.now()}`,
      ...preset
    };
    setChanges(prev => [...prev, newItem]);
  };

  const getValidityLabel = (type: 'from' | 'single' | 'until' | 'permanent') => {
    switch (type) {
      case 'from':
        return isPt ? 'A partir diante (Fuso Previsto)' : 'From date onward (Scheduled)';
      case 'single':
        return isPt ? 'Apenas nesta data' : 'Only on this date';
      case 'until':
        return isPt ? 'Até a data' : 'Until this date';
      case 'permanent':
        return isPt ? 'Permanente (Fixo)' : 'Permanent (Fixed)';
    }
  };

  const getValidityBadgeColor = (type: 'from' | 'single' | 'until' | 'permanent') => {
    switch (type) {
      case 'from':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'single':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'until':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'permanent':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          {isPt ? 'Mudança De Fuso Horario Local Previsto Por Local' : 'Local Timezone Change Predicted By Location'}
        </h3>
        <span className="text-[9px] font-mono text-white/40">
          {changes.length} {isPt ? 'regra(s)' : 'rule(s)'}
        </span>
      </div>

      <p className="text-[10px] text-white/60 leading-relaxed">
        {isPt
          ? 'Configure a mudança de fuso horário local prevista por local (data XX/XX/XXXX, hora de transição local XX:XX:XX, fuso a adotar UTC+/- XX:XX:XX e o tipo de vigência para cada transição).'
          : 'Configure local timezone changes predicted by location (date XX/XX/XXXX, local transition time XX:XX:XX, adopted offset UTC+/- XX:XX:XX and validity type).'}
      </p>

      {/* Form Card */}
      <div className="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-3">
        {/* Row 1: Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              {isPt ? 'Data (XX/XX/XXXX)' : 'Date (XX/XX/XXXX)'}
            </label>
            <input
              type="text"
              placeholder="XX/XX/XXXX"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              {isPt ? 'Hora Transição Local (XX:XX:XX)' : 'Local Transition Time (XX:XX:XX)'}
            </label>
            <input
              type="text"
              placeholder="XX:XX:XX"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        {/* Row 2: Source & Offset */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              {isPt ? 'Origem do Relógio' : 'Clock Source'}
            </label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as 'local' | 'utc')}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
            >
              <option value="local">{isPt ? 'Hora Civil Local' : 'Local Civil Time'}</option>
              <option value="utc">{isPt ? 'Hora UTC Global' : 'UTC Global Time'}</option>
            </select>
          </div>

          <div>
            <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              {isPt ? 'Fuso a Adotar (UTC+/- XX:XX:XX)' : 'Adopted Offset (UTC+/- XX:XX:XX)'}
            </label>
            <input
              type="text"
              placeholder="UTC+/- XX:XX:XX"
              value={offset}
              onChange={e => setOffset(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-amber-300 placeholder:text-white/20 focus:outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        {/* Row 3: Tipo de Vigência (Quando começa a valer cada um) */}
        <div>
          <label className="text-[8px] font-bold text-white/50 uppercase tracking-wider block mb-1">
            {isPt ? 'Tipo de Vigência / Quando Começa a Valer' : 'Validity Scope / Activation Type'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(['from', 'single', 'until', 'permanent'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setValidityType(type)}
                className={`py-1.5 px-2 rounded-xl text-[9px] font-bold border transition-all cursor-pointer text-center ${
                  validityType === type
                    ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                    : 'bg-black/30 text-white/60 border-white/10 hover:bg-white/5'
                }`}
              >
                {getValidityLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <p className="text-[9px] text-red-400 font-medium">{errorMsg}</p>
        )}

        <button
          type="button"
          onClick={handleAddChange}
          className="w-full py-2 bg-amber-400 text-black hover:bg-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
        >
          <Plus size={14} />
          <span>{isPt ? 'Adicionar Regra de Transição' : 'Add Transition Rule'}</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="space-y-1.5">
        <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider block">
          {isPt ? 'Exemplos / Presets Rápidos' : 'Quick Presets'}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleAddPreset({
              date: '20/09/2026',
              time: '01:00:00',
              source: 'local',
              offset: 'UTC+00:00:00',
              validityType: 'permanent'
            })}
            className="text-[8.5px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={10} />
            <span>Marrocos 20/09/2026 01:00:00 (UTC+00:00:00 Permanente)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddPreset({
              date: '16/02/2019',
              time: '00:00:00',
              source: 'local',
              offset: 'UTC-03:00:00',
              validityType: 'permanent'
            })}
            className="text-[8.5px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Brasil Fim HV (UTC-03:00:00)</span>
          </button>
        </div>
      </div>

      {/* Transition Rules List */}
      <div className="space-y-2 pt-1">
        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">
          {isPt ? 'Regras Configuradas' : 'Configured Rules'}
        </span>

        {changes.length === 0 ? (
          <div className="p-3 bg-black/20 rounded-xl text-center border border-white/5">
            <p className="text-[10px] text-white/40">
              {isPt ? 'Nenhuma mudança de fuso cadastrada. O fuso base padrão será aplicado.' : 'No timezone change rules added. Default base offset will apply.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {changes.map((change, idx) => (
              <div
                key={`perm-change-${change.id}-${idx}`}
                className="flex items-center justify-between p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs hover:border-white/20 transition-all"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-white">
                      {change.date} {change.time}
                    </span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      {change.source === 'local' ? (isPt ? 'LOCAL' : 'LOCAL') : 'UTC'}
                    </span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${getValidityBadgeColor(change.validityType)}`}>
                      {getValidityLabel(change.validityType)}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-amber-300">
                    {isPt ? 'Novo fuso:' : 'New offset:'} {change.offset} ({parseOffsetStringToMinutes(change.offset)} min)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setChanges(prev => prev.filter(c => c.id !== change.id))}
                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                  title={isPt ? 'Excluir regra' : 'Delete rule'}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
