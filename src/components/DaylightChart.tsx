import React, { useMemo } from 'react';
import { ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Scatter } from 'recharts';
import { calculateSolarTime, calculateAstronomicalTransitions } from '../lib/solarTime';

interface DaylightChartProps {
  coords: { latitude: number; longitude: number };
  manualOffset: number;
  axialTilt?: number;
}

export const DaylightChart: React.FC<DaylightChartProps> = ({ coords, manualOffset, axialTilt }) => {
  const { data, transitions } = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);
      const solar = calculateSolarTime(date, coords.longitude, coords.latitude, manualOffset, axialTilt);
      const duration = solar.sunlightDurationSeconds / 3600;
      result.push({
        day: date.toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short' }),
        date: new Date(date),
        duration: parseFloat(duration.toFixed(2))
      });
    }

    const year = today.getUTCFullYear();
    const trans = calculateAstronomicalTransitions(year, axialTilt);
    const transitionPoints = trans.filter(t => {
        return t.date >= result[0].date && t.date <= result[6].date;
    }).map(t => {
        const solar = calculateSolarTime(t.date, coords.longitude, coords.latitude, manualOffset, axialTilt);
        const duration = solar.sunlightDurationSeconds / 3600;
        return {
            day: t.date.toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short' }),
            duration: parseFloat(duration.toFixed(2)),
            name: t.name
        };
    });

    return { data: result, transitions: transitionPoints };
  }, [coords, manualOffset]);

  return (
    <div className="h-24 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#fbbf24' }} 
          />
          <Line type="monotone" dataKey="duration" stroke="#fbbf24" strokeWidth={2} dot={false} />
          <Scatter data={transitions} fill="#ef4444" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
