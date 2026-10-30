import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.status(200).send("OK");
  });

  // Function to initialize AI client lazily
  let aiClient: GoogleGenAI | null = null;
  function getAi(): GoogleGenAI {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || process.env.GEMINI_API_KEY.trim() === "") {
          throw new Error('API_KEY_INVALID: The provided Gemini API key is invalid or not configured. Please check your credentials in the AI Studio settings panel.');
      }
      if (!aiClient) {
          aiClient = new GoogleGenAI({ 
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: {
                  headers: {
                      'User-Agent': 'aistudio-build'
                  }
              }
          });
      }
      return aiClient;
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async function generateContentWithRetry(ai: any, options: {
    model?: string;
    config?: any;
    contents: any;
    tools?: any;
  }) {
    // Standard models: gemini-3.7-flash with gemini-3.6-flash & gemini-3.1-flash-lite fallback
    const requestedModel = options.model && options.model !== "gemini-3.1-pro-preview" && options.model !== "gemini-3.5-flash"
      ? options.model 
      : "gemini-3.7-flash";

    const modelsToTry = Array.from(new Set([
      requestedModel,
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite"
    ]));
    
    let lastError: any = null;
    
    for (const model of modelsToTry) {
      const maxRetries = 1;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Gemini Resilient Client] Attempting with model: ${model} (attempt ${attempt + 1}/${maxRetries + 1})`);
          const response = await ai.models.generateContent({
            ...options,
            model
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err.message || err.status || "");
          const status = Number(err.status || 0);
          
          if (
            errMsg.includes("invalid") || 
            errMsg.includes("API key") || 
            errMsg.includes("key is invalid") || 
            errMsg.includes("invalid key") ||
            status === 400 || 
            status === 403
          ) {
            console.warn(`[Gemini Resilient Client] API key invalid: ${errMsg.slice(0, 120)}`);
            const keyErr = new Error("API_KEY_INVALID: The provided Gemini API key is invalid or not configured. Please check your credentials in the AI Studio settings panel.");
            (keyErr as any).status = 403;
            throw keyErr;
          }

          if (status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            console.log(`[Gemini Resilient Client] Quota limit (429) on ${model}. Switching to fallback model/engine...`);
            break; // Immediately move to next fallback model
          }

          console.log(`[Gemini Resilient Client] Transient issue with model ${model} (attempt ${attempt + 1}/${maxRetries + 1}):`, errMsg.slice(0, 150));

          // Check if this error is likely transient (e.g., 500, 503, 504, overloaded, UNAVAILABLE)
          const isTransient = status === 503 || status === 504 || status === 500 || 
                              errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded") || 
                              errMsg.includes("experiencing high demand") || errMsg.includes("temporary");

          if (isTransient && attempt < maxRetries) {
            const backoffMs = (attempt + 1) * 800 + Math.random() * 200;
            console.log(`[Gemini Resilient Client] Backing off for ${Math.round(backoffMs)}ms before retry...`);
            await delay(backoffMs);
          } else {
            // If not transient, or we ran out of retries for this model, proceed to the next model fallback
            break;
          }
        }
      }
    }
    
    throw lastError || new Error("Failed to generate content with all available resilient models.");
  }

  function tryToCloseTruncatedJson(jsonStr: string): string {
    let str = jsonStr.trim();
    let openBrackets: string[] = [];
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '\\' && !escaped) {
        escaped = true;
        continue;
      }
      if (char === '"' && !escaped) {
        inString = !inString;
      } else if (!inString) {
        if (char === '{' || char === '[') {
          openBrackets.push(char);
        } else if (char === '}') {
          if (openBrackets[openBrackets.length - 1] === '{') {
            openBrackets.pop();
          }
        } else if (char === ']') {
          if (openBrackets[openBrackets.length - 1] === '[') {
            openBrackets.pop();
          }
        }
      }
      escaped = false;
    }
    
    if (inString) {
      str += '"';
    }
    
    while (openBrackets.length > 0) {
      const last = openBrackets.pop();
      if (last === '{') {
        str += '}';
      } else if (last === '[') {
        str += ']';
      }
    }
    
    return str;
  }

  function robustJsonParse(text: string): any {
    if (text.trim().toLowerCase().startsWith("<!doctype")) {
        throw new Error("Received HTML error page instead of JSON from API");
    }
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.replace(/\n?```$/, "");
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch (err: any) {
      console.warn("[JSON Clean] Direct parse failed, attempting newline repair. Error:", err.message);
      let inString = false;
      let escaped = false;
      const chars = [...cleaned];
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (char === '"' && !escaped) {
          inString = !inString;
        }
        if (inString && char === '\n') {
          chars[i] = '\\n';
        }
        if (char === '\\' && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
      }
      cleaned = chars.join('');

      try {
        return JSON.parse(cleaned);
      } catch (err2: any) {
        console.warn("[JSON Clean] Newline repair failed, attempting truncation auto-close. Error:", err2.message);
        const closed = tryToCloseTruncatedJson(cleaned);
        try {
          return JSON.parse(closed);
        } catch (err3: any) {
          console.warn("[JSON Clean] Truncation auto-close failed. Throwing original error.", err3.message);
          throw err;
        }
      }
    }
  }

  function getServerFallbackLocations(queryOrCoords: any): any[] {
    const SERVER_FALLBACK_LOCATIONS = [
      {
        name: "Casablanca, Morocco",
        latitude: 33.5731,
        longitude: -7.5898,
        description: "UTC+0 permanente a partir de 20/09/2026 01:00 UTC (02:00 para 01:00 local).",
        policyHistory: "Adotou GMT+1 permanente em 2018 com suspensão no Ramadã. A partir de 20/09/2026 às 01:00 UTC (transição das 02:00 para 01:00 local), todos os relógios no Marrocos são reajustados para UTC+0 permanente.",
        timezoneOffset: 0,
        baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
        dstInfo: {
          hasDst: false,
          start: null,
          end: null,
          shift: null
        },
        alternativeTimes: []
      },
      {
        name: "Rabat, Morocco",
        latitude: 34.0209,
        longitude: -6.8416,
        description: "Capital do Marrocos. UTC+0 permanente a partir de 20/09/2026 01:00 UTC.",
        policyHistory: "Capital do Reino do Marrocos. Reajustado para UTC+0 permanente a partir de 20/09/2026 às 01:00 UTC (02:00 para 01:00 local).",
        timezoneOffset: 0,
        baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
        dstInfo: {
          hasDst: false,
          start: null,
          end: null,
          shift: null
        },
        alternativeTimes: []
      },
      {
        name: "Marrakech, Morocco",
        latitude: 31.6295,
        longitude: -7.9811,
        description: "UTC+0 permanente a partir de 20/09/2026 01:00 UTC.",
        policyHistory: "Cidade histórica do Marrocos. Reajustada para UTC+0 permanente a partir de 20/09/2026 às 01:00 UTC (02:00 para 01:00 local).",
        timezoneOffset: 0,
        baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
        dstInfo: {
          hasDst: false,
          start: null,
          end: null,
          shift: null
        },
        alternativeTimes: []
      },
      {
        name: "Eucla, Australia",
        latitude: -31.6781,
        longitude: 128.8833,
        description: "The unofficial UTC+8:45 timezone.",
        policyHistory: "Eucla and surrounding roadhouses follow 'Central Western Standard Time' (CWST), which is exactly 45 minutes ahead of Western Australia (AWST) and 45 minutes behind South Australia (ACST).",
        timezoneOffset: 525,
        alternativeTimes: []
      },
      {
        name: "Lord Howe Island, Australia",
        latitude: -31.5553,
        longitude: 159.0722,
        description: "Unique +30 minute DST shift.",
        policyHistory: "Standard time is UTC+10:30. During summer, it moves to UTC+11:00 (+30 min transition). This 30-minute shift is unique as most transitions are 60 minutes.",
        timezoneOffset: 630,
        dstInfo: {
          hasDst: true,
          start: "04-10-2026 02:00",
          end: "05-04-2026 03:00",
          shift: 30
        },
        alternativeTimes: []
      },
      {
        name: "Kathmandu, Nepal",
        latitude: 27.7172,
        longitude: 85.3240,
        description: "One of three places with a 45-min offset.",
        policyHistory: "Nepal time (NPT) is UTC+5:45.",
        timezoneOffset: 345,
        alternativeTimes: []
      },
      {
        name: "Greenwich, London, UK",
        latitude: 51.4769,
        longitude: -0.0005,
        description: "The historical Prime Meridian.",
        policyHistory: "The origin of GMT. GMT (UTC+0) in winter, BST (UTC+1) in summer.",
        timezoneOffset: 0,
        dstInfo: {
          hasDst: true,
          start: "29-03-2026 01:00",
          end: "25-10-2026 02:00",
          shift: 60
        },
        alternativeTimes: []
      },
      {
        name: "New York, USA",
        latitude: 40.7128,
        longitude: -74.0060,
        description: "Eastern Time Zone (EST/EDT).",
        policyHistory: "Observations follow standard US DST rules: UTC-5 standard, UTC-4 in summer.",
        timezoneOffset: -300,
        dstInfo: {
          hasDst: true,
          start: "08-03-2026 02:00",
          end: "01-11-2026 02:00",
          shift: 60
        },
        alternativeTimes: []
      },
      {
        name: "Tokyo, Japan",
        latitude: 35.6762,
        longitude: 139.6503,
        description: "Japan Standard Time (JST).",
        policyHistory: "Observes permanent UTC+9 with no Daylight Saving Time.",
        timezoneOffset: 540,
        alternativeTimes: []
      },
      {
        name: "São Paulo, Brazil",
        latitude: -23.5505,
        longitude: -46.6333,
        description: "Brasilia Standard Time (BRT).",
        policyHistory: "Observes UTC-3. No longer observes Daylight Saving Time (DST since 2019).",
        timezoneOffset: -180,
        alternativeTimes: []
      },
      {
        name: "Sydney, Australia",
        latitude: -33.8688,
        longitude: 151.2093,
        description: "Australian Eastern Time Zone (AEST/AEDT).",
        policyHistory: "Observes UTC+10 standard, UTC+11 in summer.",
        timezoneOffset: 600,
        dstInfo: {
          hasDst: true,
          start: "04-10-2026 02:00",
          end: "05-04-2026 03:00",
          shift: 60
        },
        alternativeTimes: []
      }
    ];

    if (typeof queryOrCoords === 'string') {
      const q = queryOrCoords.toLowerCase().trim();
      if (!q) return SERVER_FALLBACK_LOCATIONS;
      
      const matches = SERVER_FALLBACK_LOCATIONS.filter(loc => 
        loc.name.toLowerCase().includes(q) || 
        loc.description.toLowerCase().includes(q)
      );
      if (matches.length > 0) return matches;
      
      // Dynamic fallback for server side to guarantee returning the requested place
      const queryCapitalized = q.charAt(0).toUpperCase() + q.slice(1);
      let hash = 0;
      for (let i = 0; i < q.length; i++) {
        hash = q.charCodeAt(i) + ((hash << 5) - hash);
      }
      let lng = (hash % 180);
      let lat = ((hash >> 8) % 65);
      lng = Math.round(lng * 10000) / 10000;
      lat = Math.round(lat * 10000) / 10000;
      let tzOffset = Math.round(lng / 15) * 60;
      
      return [{
        name: queryCapitalized,
        latitude: lat,
        longitude: lng,
        description: `Localização estimada para "${queryCapitalized}"`,
        policyHistory: `Fuso horário estimado geograficamente (UTC${tzOffset >= 0 ? '+' : ''}${Math.floor(tzOffset / 60)}h)`,
        timezoneOffset: tzOffset,
        alternativeTimes: []
      }, ...SERVER_FALLBACK_LOCATIONS.slice(0, 4)];
    } else if (queryOrCoords && typeof queryOrCoords === 'object') {
      const lat = Number(queryOrCoords.lat ?? queryOrCoords.latitude ?? 0);
      const lon = Number(queryOrCoords.lng ?? queryOrCoords.longitude ?? 0);
      if (isNaN(lat) || isNaN(lon)) return [SERVER_FALLBACK_LOCATIONS[0]];
      
      const calculatedOffset = Math.round(lon * 4);
      return [{
        name: `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        latitude: lat,
        longitude: lon,
        description: `Posição aproximada (Garantia Offline)`,
        policyHistory: `Fuso horário baseado na longitude geográfica: UTC${calculatedOffset >= 0 ? '+' : ''}${Math.floor(calculatedOffset / 60)}h${Math.abs(calculatedOffset % 60)}m`,
        timezoneOffset: calculatedOffset,
        alternativeTimes: []
      }];
    }
    return SERVER_FALLBACK_LOCATIONS;
  }

  app.post("/api/search-locations", async (req, res) => {
    console.log("Received /api/search-locations request:", req.body);
    const { queryOrCoords, year, language } = req.body;
    const isCoords = typeof queryOrCoords !== 'string' && queryOrCoords !== null && typeof queryOrCoords === 'object' && 'lat' in queryOrCoords && 'lng' in queryOrCoords;
    const queryText = isCoords 
      ? `Reverse geocode and determine timezone policy for coordinates: ${queryOrCoords.lat}, ${queryOrCoords.lng} for year ${year}`
      : `Search for: "${queryOrCoords}" for year ${year}. Provide up to 5 relevant locations.`;

    try {
      const ai = getAi();
      console.log("Calling Gemini API with query:", queryText);
      const result = await generateContentWithRetry(ai, {
        model: "gemini-3.7-flash",
        config: {
          temperature: 0,
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are a strict data extraction, historical timezone research, and formatting engine.
          Your main goal is to search for and identify locations exactly "como era antigamente" (how they were in the past/historically, including old or ancient names, historical empires, USSR, Prussia, Constantinople, Roman cities, colonial names, and ancient coordinates/boundaries) as well as modern places.
          Given a query and a target year, you MUST return a valid, parsable JSON array of locations based on the schema provided, 
          ensuring that timezone, Daylight Saving Time (DST) data, and geographic coordinates correspond exactly to how that place existed in the target year, or its historical equivalent ("como era antigamente").
          If a user searches for a historical place or old name, find its corresponding ancient boundaries or historical center, and explain its ancient or historical status in the description and policy history, keeping everything else formatted exactly as specified.
          ALWAYS use Google Search grounding data to find accurate historical names, historical boundaries, coordinates, and ancient timezone/time-keeping regulations in effect at that time.
          ALWAYS include DST information for ALL locations found, even if DST is not currently active in that location in that year.
          You MUST translate all descriptive fields, especially "policyHistory" and "description", into the following language: ${language}.
          For locations with specific regional timezone policies (e.g., Galicia vs. rest of Spain), you MUST explicitly determine the timezone policy for the exact coordinates of the requested location.
          CRITICAL RULE FOR MOROCCO: For ALL locations in Morocco (including Casablanca, Rabat, Marrakech, Tangier, Fez, Agadir, Meknes, Oujda, etc.), the country officially transitioned to permanent UTC+0 (UTC+0 Permanente) starting on September 20, 2026 at 01:00 UTC (transitioning from 02:00 to 01:00 local time). From this exact moment onwards, all clocks in Morocco are readjusted to UTC+0 permanently with NO Daylight Saving Time (DST). If the target date/year is after September 20, 2026 01:00 UTC, timezoneOffset MUST be 0 and dstInfo.hasDst MUST be false.
          CRITICAL RULE FOR LATITUDE 0 / EQUATOR: For ANY location situated on Latitude 0 (Equator / Linha do Equador, whether entered with positive, negative, or zero sign +0/-0/0), there are NO seasons of the year (Sem Estações do Ano) and NO Daylight Saving Time (hasDst: false).
          If a location did NOT have DST in that specific target year, set "hasDst" to false and explicitly set "start", "end", and "shift" fields in the dstInfo object to null.
          For locations in China, specifically Xinjiang/Urumqi, populate "alternativeTimes" as an array, e.g., [{"name": "Urumqi Time", "shift": -120}]. For others, return an empty array [].
          OUTPUT FORMAT: Return ONLY the raw JSON array string.
          DO NOT include any commentary, analysis, explanations, headers, footers, filler text, or markdown formatting.
          Ensure all string values are extremely concise.
          - "name" MUST be a short descriptive location name (max 40 characters), using the historical or local name as appropriate for the queried context.
          - "description" MUST be under 120 characters, focusing on its historical context if a past location is requested.
          - "policyHistory" MUST be under 180 characters, summarizing only the rules for the target year. Do NOT list decades of historical timeline transitions.
          For date strings (dstInfo.start, dstInfo.end), use exactly the format "DD-MM-YYYY HH:mm" (e.g., "31-03-2024 01:00"). DO NOT repeat characters or add junk data.
          Use null for missing values.
          IMPORTANT: You MUST complete the entire JSON structure for exactly 5 locations (e.g. including other locations of the same name globally, nearby places, or historically related areas if less than 5 exact matches exist). You MUST NOT truncate the response. You MUST close the array with ']' and all objects with '}'.
          Return ONLY a valid, parsable JSON array of objects. Do not use markdown formatting.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Short, clean name of the location, max 40 chars" },
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                description: { type: Type.STRING, description: "Brief description of the place, max 120 chars" },
                policyHistory: { type: Type.STRING, description: "Extremely brief summary of the timezone rules for the target year, max 180 chars" },
                timezoneOffset: { type: Type.NUMBER, description: "Standard timezone offset in minutes relative to UTC" },
                dstInfo: {
                  type: Type.OBJECT,
                  properties: {
                    hasDst: { type: Type.BOOLEAN, description: "Whether Daylight Saving Time is used in the target year" },
                    start: { type: Type.STRING, description: "Date string for DST start: DD-MM-YYYY HH:mm or null" },
                    end: { type: Type.STRING, description: "Date string for DST end: DD-MM-YYYY HH:mm or null" },
                    shift: { type: Type.NUMBER, description: "DST shift in minutes or null" }
                  },
                  required: ["hasDst"]
                },
                alternativeTimes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      shift: { type: Type.NUMBER, description: "Shift in minutes" }
                    },
                    required: ["name", "shift"]
                  }
                }
              },
              required: ["name", "latitude", "longitude", "description", "timezoneOffset", "alternativeTimes"]
            }
          }
        },
        contents: queryText
      });

      if (!result.text) throw new Error("No response from AI");
      return res.json(robustJsonParse(result.text));
    } catch (geminiError: any) {
      console.log("[Search-Locations] Engaging local astronomical/geographic fallback engine...");
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey && apiKey !== "YOUR_API_KEY" && apiKey.trim() !== "") {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(isCoords ? `${queryOrCoords.lat},${queryOrCoords.lng}` : queryOrCoords)}&key=${apiKey}`;
          const mapsRes = await fetch(url);
          const mapsData = await mapsRes.json();
          if (mapsData.status === 'OK') {
            const results = mapsData.results.slice(0, 5).map((p: any) => ({
              name: p.name,
              latitude: p.geometry.location.lat,
              longitude: p.geometry.location.lng,
              description: p.formatted_address,
              timezoneOffset: 0,
              alternativeTimes: [],
              policyHistory: "Data estimated by Google Maps (Gemini offline)"
            }));
            return res.json(results);
          }
        } catch (mapsErr) {
          console.log("Maps fallback failed:", mapsErr);
        }
      }
      
      return res.json(getServerFallbackLocations(queryOrCoords));
    }
  });

  app.post("/api/get-location-details", async (req, res) => {
    console.log("Received /api/get-location-details request:", req.body);
    const { name, year, language } = req.body;
    try {
      const ai = getAi();
      const queryText = `Get timezone policy and DST information for: "${name}" for year ${year}`;
      
      const result = await generateContentWithRetry(ai, {
        model: "gemini-3.7-flash",
        config: {
          temperature: 0,
          systemInstruction: `You are a strict data extraction and formatting engine.`,
          responseMimeType: "application/json",
        },
        contents: queryText
      });

      if (!result.text) throw new Error("No response from AI");
      return res.json(robustJsonParse(result.text));
    } catch (error: any) {
      console.log("Server get-location-details caught warning, using fallback:", error.message || error);
      const matches = getServerFallbackLocations(name);
      return res.json(matches[0] || getServerFallbackLocations("London")[0]);
    }
  });
  
  app.post("/api/generate-theme", async (req, res) => {
    const { prompt } = req.body;
    try {
      const ai = getAi();
      const result = await generateContentWithRetry(ai, {
        model: "gemini-3.7-flash",
        config: {
          systemInstruction: `You are a theme generation engine.
          Given a description of a theme, return a JSON object with:
          name, bgColor, textColor, accentColor, and a 'style' object (with optional fields: backgroundImage, backgroundSize, background) representing textures or patterns.
          Return ONLY valid JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              bgColor: { type: Type.STRING },
              textColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              style: { 
                type: Type.OBJECT, 
                properties: { 
                    backgroundImage: { type: Type.STRING }, 
                    backgroundSize: { type: Type.STRING }, 
                    background: { type: Type.STRING } 
                } 
              }
            },
            required: ["name", "bgColor", "textColor", "accentColor", "style"]
          }
        },
        contents: prompt
      });
      if (!result.text) throw new Error("No response from AI");
      return res.json(robustJsonParse(result.text));
    } catch (error: any) {
      console.log("Server generate-theme caught warning, returning fallback:", error.message || error);
      const lowerPrompt = String(prompt || "").toLowerCase();
      let theme = {
        name: "Solar Slate (Offline)",
        bgColor: "#0f172a",
        textColor: "#f8fafc",
        accentColor: "#fbbf24",
        style: {
          background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)"
        }
      };
      if (lowerPrompt.includes("quente") || lowerPrompt.includes("warm") || lowerPrompt.includes("desert") || lowerPrompt.includes("deserto")) {
        theme = {
          name: "Deserto Quente (Offline)",
          bgColor: "#1c1410",
          textColor: "#f5ebe0",
          accentColor: "#f4a261",
          style: {
            background: "radial-gradient(circle at center, #2c1e17 0%, #1c1410 100%)"
          }
        };
      } else if (lowerPrompt.includes("antigo") || lowerPrompt.includes("retro") || lowerPrompt.includes("vintage")) {
        theme = {
          name: "Vintage Cobre (Offline)",
          bgColor: "#15100c",
          textColor: "#e6ccb2",
          accentColor: "#b07d62",
          style: {
            background: "radial-gradient(circle at center, #2d2015 0%, #15100c 100%)"
          }
        };
      } else if (lowerPrompt.includes("cyberpunk") || lowerPrompt.includes("neon") || lowerPrompt.includes("futurista")) {
        theme = {
          name: "Neon Cyberpunk (Offline)",
          bgColor: "#03001e",
          textColor: "#ec4899",
          accentColor: "#06b6d4",
          style: {
            background: "radial-gradient(circle at center, #7303c0 0%, #03001e 100%)"
          }
        };
      }
      return res.json(theme);
    }
  });

  app.post("/api/chat-location-history", async (req, res) => {
    const { locationName, latitude, longitude, timezoneOffset, language, messages, ramLimit } = req.body;
    try {
      const ai = getAi();
      
      const systemInstruction = `You are an expert on historical timezones, daylight saving time (DST) shifts, seasonal daylight variations, and geographical history.
The user is viewing this location on a highly precise Solar Clock:
- Name: ${locationName || 'Custom Location'}
- Latitude: ${latitude ?? 0}°
- Longitude: ${longitude ?? 0}°
- Timezone offset from UTC: ${timezoneOffset ?? 0} minutes
- RAM/Memory Constraint: ${ramLimit || 'Unlimited'} (Optimize your response length, detail level, and computational complexity based on this limit. For 2GB-4GB, keep answers extremely concise and avoid complex data structures. For Unlimited, provide rich detail.)

Your job is to answer questions from the user in a friendly, conversational, yet historically precise manner.
You must always answer in the user's requested language: ${language || 'Portuguese'}.
Focus on:
1. The history of timezone changes in this location (including politics, historical events, offset switches, or custom policies).
2. Daylight Saving Time (DST) history and current policy, including exact start/end dates if available or when it was abolished/adopted.
3. Seasonal variations in daylight, solar angles, and sunset/sunrise times throughout the year at this latitude.
4. For any location in Morocco (Casablanca, Rabat, Marrakech, etc.): Morocco observed GMT+1 with Ramadan suspensions until September 20, 2026 at 01:00 UTC (September 20, 2026 transitioning from 02:00 to 01:00 local time), when all clocks across Morocco were permanently readjusted to UTC+0 (UTC+0 Permanente) with no DST.
Keep your answers engaging, informative, and formatted beautifully in markdown. Keep answers relatively concise yet rich in detail. Avoid repetitive intros or outros.`;

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      if (!response.text) throw new Error("No response from AI");
      return res.json({ text: response.text });
    } catch (error: any) {
      console.log("Server chat-location-history caught warning, returning offline details:", error.message || error);
      const isPt = String(language || "").toLowerCase().includes("portug");
      const msg = isPt 
        ? `### Relatório Solar Offline 🗺️\n\nNo momento, o serviço inteligente de consulta histórica está operando no modo offline. Contudo, as informações calculadas pelo sistema de precisão são:\n\n- **Localização:** ${locationName || 'Posição Personalizada'}\n- **Latitude:** ${latitude}°\n- **Longitude:** ${longitude}°\n- **Fuso Horário:** UTC${timezoneOffset >= 0 ? '+' : ''}${Math.floor(timezoneOffset / 60)}h${Math.abs(timezoneOffset % 60)}m\n\nEste relógio simula a órbita do sol e a variação sazonal de forma offline através de equações matemáticas exatas de mecânica celeste aplicadas localmente no navegador.`
        : `### Solar Status Report (Offline) 🗺️\n\nCurrently, the AI history service is operating in offline mode. However, the solar calculations remain active:\n\n- **Location:** ${locationName || 'Custom Location'}\n- **Latitude:** ${latitude}°\n- **Longitude:** ${longitude}°\n- **Timezone:** UTC${timezoneOffset >= 0 ? '+' : ''}${Math.floor(timezoneOffset / 60)}h${Math.abs(timezoneOffset % 60)}m\n\nThis application simulates solar mechanics entirely client-side using orbit calculations and astronomical algorithms.`;
      return res.json({ text: msg });
    }
  });

  app.post("/api/chat-custom-location-creator", async (req, res) => {
    const { messages, language, currentLocation } = req.body;
    try {
      const ai = getAi();

      const systemInstruction = `You are a legendary "Timezone Architect & Geopolitical Chronology Expert".
The user is using a highly precise 24-Hour Solar Clock Simulator and wants to configure or design a custom, historical, or imaginary location, including its seasonality, Daylight Saving Time (DST) history, and timezone changes across years.

Your primary capabilities:
1. Explain timezone changes, historical offsets, Daylight Saving Time policies, and seasonal daylight variations for any location or customized inputs.
2. HELP THE USER BUILD OR ADJUST A CUSTOM LOCATION CONFIGURATION.
3. When the user asks to create, adjust, customize, define, or try a location, timezone offset, or daylight saving rules, you MUST generate and propose a complete, highly precise structured location configuration in the 'proposedLocation' field.

Schema parameters guidance:
- 'name': Name of the custom location (e.g., "Atlântida", "São Paulo Histórica", "Polo Sul").
- 'latitude': -90 to 90.
- 'longitude': -180 to 180.
- 'timezoneOffset': base offset in minutes from UTC (e.g., -180 for UTC-3).
- 'dstInfo': if they have Daylight Saving Time, set 'hasDst' to true and fill 'start' / 'end' in "DD-MM-YYYY HH:mm" format (for example: "19-10-2026 00:00") and the shift in minutes (typically 60).
- 'alternativeTimes': optional alternative local times or custom historical offsets.

If they are just asking conversational questions, leave 'proposedLocation' as null, but if they are setting coordinates, asking to create a custom location, adjusting the DST or seasonality, or defining local characteristics, populate the 'proposedLocation' object precisely so they can load it directly into their solar clock simulator.
Always answer in the requested language: ${language || 'Portuguese'}.`;

      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { 
                type: Type.STRING, 
                description: "Conversational answer. Explain the history, DST shift, timezone politics, or seasonal characteristics. Use markdown bolding, lists, and headers." 
              },
              proposedLocation: {
                type: Type.OBJECT,
                description: "Complete custom location configuration to suggest if they are defining, creating, or adjusting coordinates, offset, DST, or seasonality.",
                properties: {
                  name: { type: Type.STRING },
                  latitude: { type: Type.NUMBER },
                  longitude: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  timezoneOffset: { type: Type.NUMBER },
                  dstInfo: {
                    type: Type.OBJECT,
                    properties: {
                      hasDst: { type: Type.BOOLEAN },
                      start: { type: Type.STRING, description: "Format: DD-MM-YYYY HH:mm" },
                      end: { type: Type.STRING, description: "Format: DD-MM-YYYY HH:mm" },
                      shift: { type: Type.NUMBER }
                    },
                    required: ["hasDst"]
                  },
                  alternativeTimes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        shift: { type: Type.NUMBER }
                      },
                      required: ["name", "shift"]
                    }
                  }
                },
                required: ["name", "latitude", "longitude", "description", "timezoneOffset"]
              }
            },
            required: ["text"]
          }
        }
      });

      if (!response.text) throw new Error("No response from AI");
      return res.json(robustJsonParse(response.text));
    } catch (error: any) {
      console.log("Server chat-custom-location-creator caught warning, using offline creator:", error.message || error);
      const isPt = String(language || "").toLowerCase().includes("portug");
      
      let lat = -23.5489;
      let lon = -46.6388;
      let name = isPt ? "Minha Posição Offline" : "My Offline Position";
      
      const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1].text : "";
      const matches = lastUserMsg.match(/-?\d+\.?\d*/g);
      if (matches && matches.length >= 2) {
        const first = parseFloat(matches[0]);
        const second = parseFloat(matches[1]);
        if (first >= -90 && first <= 90 && second >= -180 && second <= 180) {
          lat = first;
          lon = second;
        }
      }
      
      const calculatedOffset = Math.round(lon * 4);
      
      const textResponse = isPt
        ? `**Modo Assistido Offline Ativo** 🧭\n\nNão consegui contatar o cérebro da IA para gerar uma descrição textual completa, mas detectei que você deseja simular uma localização. Criei um perfil de localização ajustado com base na mecânica de rotação terrestre solar. Clique no botão de confirmação abaixo para aplicar:\n\n- **Nome Proposto:** ${name}\n- **Coordenadas:** ${lat.toFixed(4)}, ${lon.toFixed(4)}\n- **Fuso Horário Geográfico:** UTC${calculatedOffset >= 0 ? '+' : ''}${Math.floor(calculatedOffset / 60)}h${Math.abs(calculatedOffset % 60)}m`
        : `**Offline Calibration Active** 🧭\n\nI could not reach the Gemini AI server, but I calibrated a custom orbit profile for you using standard planetary calculations. Click the confirmation button to load:\n\n- **Proposed Name:** ${name}\n- **Coordinates:** ${lat.toFixed(4)}, ${lon.toFixed(4)}\n- **Timezone:** UTC${calculatedOffset >= 0 ? '+' : ''}${Math.floor(calculatedOffset / 60)}h${Math.abs(calculatedOffset % 60)}m`;
      
      return res.json({
        text: textResponse,
        proposedLocation: {
          name,
          latitude: lat,
          longitude: lon,
          description: isPt ? "Calibração física solar offline" : "Offline physical solar calibration",
          timezoneOffset: calculatedOffset,
          dstInfo: {
            hasDst: false
          },
          alternativeTimes: []
        }
      });
    }
  });

  // Time Comparison 5-Screens AI Chat Endpoint with Google Search Grounding
  app.post("/api/time-comparison-chat", async (req, res) => {
    const { messages, comparisonContext, mode, language } = req.body;
    try {
      const ai = getAi();
      const isPt = String(language || "").toLowerCase().includes("portug");

      const systemInstruction = `You are the Solar Astronomy & Time Comparison Specialist for Solaris Clock Ultra.
You are assisting the user in the "Comparação De Tempo (5 Telas)" workspace.
In this workspace:
- Screen 1 is Top-Left (Canto Superior Esquerdo)
- Screen 2 is Top-Right (Canto Superior Direito)
- Screen 3 is Bottom-Left (Canto Inferior Esquerdo)
- Screen 4 is Bottom-Right (Canto Inferior Direito)
- Screen 5 is Center / Hub (Tela do Meio), displaying either "Ponto Subsolar" (Subsolar Zenith Point on Earth) or "Device / Rua Solar" (Solar Street Observation).
The user can compare any 4 dates, times, locations, solar zenith angles, solar altitudes, and Earth illumination perspectives.

CURRENT COMPARISON DATA:
${JSON.stringify(comparisonContext || {}, null, 2)}
CURRENT MODE: ${mode || "Ponto Subsolar"}

GUIDELINES:
1. Provide accurate, clear, scientific, and insightful answers comparing solar positions, subsolar points, daylight durations, solar time vs civil time, and planetary Earth illumination.
2. If the user asks about live external time facts or queries like "Que horas são em Tóquio segundo o site timeanddate?", use Google Search to fetch verified factual information.
3. Keep the tone helpful, modern, astronomical, and concise. Format with bullet points and bold highlights.
4. Respond in the requested language: ${isPt ? 'Portuguese (pt-BR)' : 'English'}.`;

      // Build conversation contents
      const formattedContents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text || m.content || "" }]
      }));

      if (formattedContents.length === 0) {
        formattedContents.push({
          role: 'user',
          parts: [{ text: isPt ? "Olá! Como funciona a comparação de tempo e posição solar nas 5 telas?" : "Hello! How does the 5-screen time and solar position comparison work?" }]
        });
      }

      // Call Gemini 3.8 / 3.7 Flash with Google Search tool
      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (errSearch: any) {
        console.warn("Retrying chat with fallback model/search options:", errSearch.message);
        response = await generateContentWithRetry(ai, {
          model: "gemini-3.7-flash",
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
      }

      const replyText = response?.text || (isPt ? "Não foi possível processar a resposta." : "Could not process response.");
      
      // Extract search sources if available
      const searchSources: { title?: string; uri?: string }[] = [];
      const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            searchSources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri
            });
          }
        }
      }

      return res.json({
        reply: replyText,
        sources: searchSources
      });
    } catch (error: any) {
      console.error("Error in /api/time-comparison-chat:", error.message || error);
      const isPt = String(language || "").toLowerCase().includes("portug");
      
      // Smart astronomical offline comparative fallback
      let fallbackText = isPt
        ? `**Análise Astronômica das 5 Telas (Modo Solar)** 🌍☀️\n\n- **Mecânica da Comparação:** As 4 telas periféricas mostram a variação sazonal da declinação solar ($\\delta$) e a rotação da Terra ($15^\\circ$ por hora).
- **Tela 5 (Central):** Demonstra o Ponto Subsolar (onde os raios solares incidem a $90^\\circ$ perpendicularmente à superfície) e o modelo tridimensional de iluminação diurna/noturna.
- **Foco e Câmera:** Você pode alternar o foco entre o Sol (zênite subsolar) e o Local geográfico para inspecionar as variações de sombra e altitude solar.`
        : `**Astronomical Analysis for 5 Screens (Solar Mode)** 🌍☀️\n\n- **Comparison Mechanics:** The 4 peripheral screens display seasonal solar declination ($\delta$) and Earth rotation ($15^\circ$ per hour).
- **Center Screen (Screen 5):** Demonstrates the Subsolar Point (where solar rays strike at $90^\circ$ perpendicular to Earth) and 3D day/night illumination.
- **Focus & Camera:** You can toggle focus between the Sun and Geographic Location to inspect shadow angles and solar altitude.`;

      return res.json({
        reply: fallbackText,
        sources: []
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
  } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handling middleware to ensure JSON response
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler caught:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });
}

startServer();
