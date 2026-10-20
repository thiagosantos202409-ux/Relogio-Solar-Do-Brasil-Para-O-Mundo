import React, { useMemo } from 'react';
import { Calendar, Moon, Settings, Clock, Eye } from 'lucide-react';
import SunCalc from 'suncalc';
import { getMoonPhaseInfo } from '../lib/moon';

interface ClockWidgetsProps {
  date: Date;
  latitude: number;
  longitude: number;
  onCalendarClick: () => void;
  onSettingsClick: () => void;
  onSolarDeVistaClick: () => void;
  is24hFormat: boolean;
  onToggleFormat: () => void;
}

export const ClockWidgets: React.FC<ClockWidgetsProps> = ({ 
  date, latitude, longitude, onCalendarClick, onSettingsClick, onSolarDeVistaClick, is24hFormat, onToggleFormat
}) => {
  const moonPhase = useMemo(() => {
    const illumination = SunCalc.getMoonIllumination(date);
    return getMoonPhaseInfo(illumination.phase);
  }, [date]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDayOfWeek = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'long' });
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-4 px-2">
      {/* Date Widget */}
      <button 
        onClick={onCalendarClick}
        className="bg-white/5 p-2 rounded-lg text-center border border-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1">
          <Calendar size={10} /> Data
        </div>
        <div className="text-white font-medium text-[10px]">
          {formatDate(date)}
        </div>
      </button>

      {/* Day Widget */}
      <button 
         onClick={onCalendarClick}
         className="bg-white/5 p-2 rounded-lg text-center border border-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1">
          <Calendar size={10} /> Dia
        </div>
        <div className="text-white font-medium text-[10px] capitalize">
          {formatDayOfWeek(date)}
        </div>
      </button>

      {/* Moon Widget */}
      <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
        <div className="text-gray-400 text-[8px] flex items-center justify-center gap-1 mb-1">
          <Moon size={10} /> Lua
        </div>
        <div className="text-white font-medium text-[10px] flex items-center justify-center gap-1">
          {moonPhase.icon} {moonPhase.name}
        </div>
      </div>
      
      {/* Settings Widget */}
      <div className="col-span-3 grid grid-cols-4 gap-2">
        <button 
           onClick={onSettingsClick}
           className="bg-white/5 p-2 rounded-lg text-center border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Settings size={12} className="text-gray-400" />
          <span className="text-gray-400 text-[9px] uppercase tracking-wider">Config</span>
        </button>
        <button 
           onClick={onToggleFormat}
           className="bg-white/5 p-2 rounded-lg text-center border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Clock size={12} className="text-gray-400" />
          <span className="text-gray-400 text-[9px] uppercase tracking-wider">{is24hFormat ? '24h' : '12h'}</span>
        </button>
        <button 
           onClick={onSolarDeVistaClick}
           className="bg-white/5 p-2 rounded-lg text-center border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Eye size={12} className="text-gray-400" />
          <span className="text-gray-400 text-[9px] uppercase tracking-wider">Vista</span>
        </button>
      </div>
    </div>
  );
};
