import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  latitude: number;
}

const SeasonalDayLengthChart: React.FC<Props> = ({ latitude }) => {
  const data = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((month, index) => {
      // Approximate day of year for the middle of the month
      const dayOfYear = index * 30 + 15;
      const radLat = latitude * Math.PI / 180;
      const declination = 0.4095 * Math.sin(2 * Math.PI * (dayOfYear - 81) / 365);
      
      let hourAngle = Math.acos(-Math.tan(radLat) * Math.tan(declination));
      
      // Handle polar days/nights
      if (isNaN(hourAngle)) {
        hourAngle = (latitude * declination > 0) ? Math.PI : 0;
      }
      
      const dayLength = 24 * hourAngle / Math.PI;
      
      return {
        month,
        dayLength: parseFloat(dayLength.toFixed(1)),
      };
    });
  }, [latitude]);

  return (
    <div className="h-32 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorDay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="month" hide />
          <YAxis hide domain={[0, 24]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#fbbf24' }}
          />
          <Area type="monotone" dataKey="dayLength" stroke="#fbbf24" fillOpacity={1} fill="url(#colorDay)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeasonalDayLengthChart;
