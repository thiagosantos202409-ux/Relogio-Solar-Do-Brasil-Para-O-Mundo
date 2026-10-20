export interface SeasonalPeriod {
  id: string;
  startRule: string;
  endRule: string;
  shift: string;
  vigencia: string;
  validityType: 'single' | 'range';
  startTime?: string;
  endTime?: string;
  duration?: string;
  enabled: boolean;
}
