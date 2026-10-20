const fs = require('fs');
let content = fs.readFileSync('src/components/RefractionChart.tsx', 'utf8');

// Replace the component state and calculations to include temperature and pressure
const oldState = `  const [viewMode, setViewMode] = useState<'chart' | 'simulation'>('simulation');

  const data = useMemo(() => {`;

const newState = `  const [viewMode, setViewMode] = useState<'chart' | 'simulation'>('simulation');
  const [pressure, setPressure] = useState<number>(1010);
  const [temperature, setTemperature] = useState<number>(10);

  const data = useMemo(() => {`;

content = content.replace(oldState, newState);

const oldDataLoop = `      const correction = getRefractionCorrection(altitudeDegrees);`;
const newDataLoop = `      const correction = getRefractionCorrection(altitudeDegrees, pressure, temperature);`;
content = content.replace(oldDataLoop, newDataLoop);

const oldCurrentCorrection = `          currentCorrection: getRefractionCorrection(altitudeDegrees),
          currentAltitude: altitudeDegrees
      };
  }, [timestamp, latitude, longitude]);`;
const newCurrentCorrection = `          currentCorrection: getRefractionCorrection(altitudeDegrees, pressure, temperature),
          currentAltitude: altitudeDegrees
      };
  }, [timestamp, latitude, longitude, pressure, temperature]);`;
content = content.replace(oldCurrentCorrection, newCurrentCorrection);

const oldPastCorrection = `      return getRefractionCorrection(altitudeDegrees);
  }, [timestamp, latitude, longitude]);`;
const newPastCorrection = `      return getRefractionCorrection(altitudeDegrees, pressure, temperature);
  }, [timestamp, latitude, longitude, pressure, temperature]);`;
content = content.replace(oldPastCorrection, newPastCorrection);

// Add the controls UI
const oldControls = `          {viewMode === 'chart' ? (`;
const newControls = `          <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10">
            <div className="flex justify-between items-center gap-4 text-[9px] text-white/70 font-mono">
              <label>Pressure (mb):</label>
              <input type="number" value={pressure} onChange={e => setPressure(Number(e.target.value))} className="w-14 bg-white/10 p-1 rounded border border-white/20 outline-none text-right" />
            </div>
            <div className="flex justify-between items-center gap-4 text-[9px] text-white/70 font-mono">
              <label>Temp (°C):</label>
              <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-14 bg-white/10 p-1 rounded border border-white/20 outline-none text-right" />
            </div>
          </div>
          {viewMode === 'chart' ? (`;
content = content.replace(oldControls, newControls);

fs.writeFileSync('src/components/RefractionChart.tsx', content);
console.log('RefractionChart updated');
