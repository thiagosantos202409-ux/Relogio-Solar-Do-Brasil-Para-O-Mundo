const fs = require('fs');
const content = fs.readFileSync('src/lib/solarTime.ts', 'utf8');
const oldFunc = `export function getRefractionCorrection(altitudeDegrees: number): number {
  if (altitudeDegrees < -1) return 0;
  
  const h = Math.max(-0.575, altitudeDegrees);
  const refractionArcminutes = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180);
  return refractionArcminutes / 60;
}`;

const newFunc = `export function getRefractionCorrection(altitudeDegrees: number, pressureMb: number = 1010, temperatureC: number = 10): number {
  if (altitudeDegrees < -1) return 0;
  
  const h = Math.max(-0.575, altitudeDegrees);
  const refractionArcminutes = 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * Math.PI / 180);
  
  // Apply pressure and temperature correction
  const correctedArcminutes = refractionArcminutes * (pressureMb / 1010) * (283 / (273 + temperatureC));
  
  return correctedArcminutes / 60;
}`;

if (content.includes(oldFunc)) {
  fs.writeFileSync('src/lib/solarTime.ts', content.replace(oldFunc, newFunc));
  console.log('Replaced successfully.');
} else {
  console.log('Could not find the function to replace. Let me check the exact text.');
}
