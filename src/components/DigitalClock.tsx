import React from 'react';

interface DigitalClockProps {
  time: Date;
  label: string;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ time, label }) => {
  const isInvalid = isNaN(time.getTime());
  const format = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-4xl md:text-6xl font-mono font-medium tracking-tighter text-white">
        {isInvalid ? "00:00:00" : `${format(time.getHours())}:${format(time.getMinutes())}:${format(time.getSeconds())}`}
      </div>
      <span className="text-xs font-medium tracking-widest uppercase text-white/40">{label}</span>
    </div>
  );
};
