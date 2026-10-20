export interface ComparisonScreenState {
  id: number;
  label: string;
  name: string;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  locationName: string;
  subsolarLat: number;
  subsolarLon: number;
  solarAltitude: number;
  solarAzimuth: number;
  solarNoonStr: string;
  dayLengthMinutes: number;
  solarTimeStr: string;
  civilTimeStr: string;
  focusTarget: 'sun' | 'location' | 'free';
  cameraAngle: { lat: number; lon: number; zoom: number };
}

export interface TimeComparisonChatResponse {
  reply: string;
  sources?: { title?: string; uri?: string }[];
}

export async function sendTimeComparisonQuery(
  messages: { role: 'user' | 'assistant'; text: string }[],
  screens: ComparisonScreenState[],
  centerMode: 'subsolar' | 'device',
  language: string = 'pt'
): Promise<TimeComparisonChatResponse> {
  try {
    const comparisonContext = {
      centerMode,
      screens: screens.map(s => ({
        screenId: s.id,
        screenPosition: s.label,
        name: s.name,
        date: s.dateStr,
        time: s.timeStr,
        location: `${s.locationName} (${s.latitude.toFixed(2)}°, ${s.longitude.toFixed(2)}°)`,
        subsolarPoint: `Lat ${s.subsolarLat.toFixed(2)}°, Lon ${s.subsolarLon.toFixed(2)}°`,
        solarAltitudeDeg: Number(s.solarAltitude.toFixed(1)),
        solarAzimuthDeg: Number(s.solarAzimuth.toFixed(1)),
        daylightHours: (s.dayLengthMinutes / 60).toFixed(1),
        solarTime: s.solarTimeStr,
        civilTime: s.civilTimeStr,
        focusTarget: s.focusTarget
      }))
    };

    const res = await fetch("/api/time-comparison-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        comparisonContext,
        mode: centerMode === 'subsolar' ? "Ponto Subsolar (Subsolar Point)" : "Device / Rua Solar",
        language
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      reply: data.reply || "",
      sources: data.sources || []
    };
  } catch (error: any) {
    console.warn("Error calling time comparison chat API, returning formatted offline response:", error);
    const isPt = language === 'pt';
    return {
      reply: isPt
        ? `**Comparativo Solar das 5 Telas** 🌍☀️\n\n- **Tela 1 (Superior Esquerdo):** ${screens[0]?.dateStr} ${screens[0]?.timeStr} — Alt. Solar: ${screens[0]?.solarAltitude.toFixed(1)}° (${screens[0]?.locationName})\n- **Tela 2 (Superior Direito):** ${screens[1]?.dateStr} ${screens[1]?.timeStr} — Alt. Solar: ${screens[1]?.solarAltitude.toFixed(1)}° (${screens[1]?.locationName})\n- **Tela 3 (Inferior Esquerdo):** ${screens[2]?.dateStr} ${screens[2]?.timeStr} — Alt. Solar: ${screens[2]?.solarAltitude.toFixed(1)}° (${screens[2]?.locationName})\n- **Tela 4 (Inferior Direito):** ${screens[3]?.dateStr} ${screens[3]?.timeStr} — Alt. Solar: ${screens[3]?.solarAltitude.toFixed(1)}° (${screens[3]?.locationName})\n- **Tela 5 (Centro - ${centerMode === 'subsolar' ? 'Ponto Subsolar' : 'Rua Solar'}):** Referência central ${screens[4]?.dateStr} ${screens[4]?.timeStr} com foco em ${screens[4]?.focusTarget === 'sun' ? 'Sol (Zênite)' : screens[4]?.focusTarget === 'location' ? 'Local' : 'Globo Livre'}.`
        : `**5-Screen Solar Comparison** 🌍☀️\n\n- **Screen 1 (Top-Left):** ${screens[0]?.dateStr} ${screens[0]?.timeStr} — Solar Alt: ${screens[0]?.solarAltitude.toFixed(1)}° (${screens[0]?.locationName})\n- **Screen 2 (Top-Right):** ${screens[1]?.dateStr} ${screens[1]?.timeStr} — Solar Alt: ${screens[1]?.solarAltitude.toFixed(1)}° (${screens[1]?.locationName})\n- **Screen 3 (Bottom-Left):** ${screens[2]?.dateStr} ${screens[2]?.timeStr} — Solar Alt: ${screens[2]?.solarAltitude.toFixed(1)}° (${screens[2]?.locationName})\n- **Screen 4 (Bottom-Right):** ${screens[3]?.dateStr} ${screens[3]?.timeStr} — Solar Alt: ${screens[3]?.solarAltitude.toFixed(1)}° (${screens[3]?.locationName})\n- **Screen 5 (Center - ${centerMode === 'subsolar' ? 'Subsolar Point' : 'Solar Street'}):** Central reference ${screens[4]?.dateStr} ${screens[4]?.timeStr} focused on ${screens[4]?.focusTarget === 'sun' ? 'Sun (Zenith)' : screens[4]?.focusTarget === 'location' ? 'Location' : 'Free Globe'}.`,
      sources: []
    };
  }
}
