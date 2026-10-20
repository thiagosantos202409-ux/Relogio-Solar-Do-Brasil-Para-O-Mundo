import React from 'react';
import { Moon, Circle } from 'lucide-react';

export interface MoonPhaseInfo {
  name: string;
  icon: React.ReactNode;
}

export function getMoonPhaseInfo(phase: number): MoonPhaseInfo {
  // New Moon: < 0.05 or > 0.95
  if (phase < 0.05 || phase > 0.95) return { name: 'Lua Nova', icon: <Circle className="w-4 h-4" /> };
  // First Quarter: ~ 0.25
  if (phase < 0.5) return { name: 'Quarto Crescente', icon: <Moon className="w-4 h-4" /> };
  // Full Moon: ~ 0.5
  if (phase < 0.75) return { name: 'Lua Cheia', icon: <Moon className="w-4 h-4" /> };
  // Last Quarter: ~ 0.75
  return { name: 'Quarto Minguante', icon: <Moon className="w-4 h-4" /> };
}
