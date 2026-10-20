import { LocationSuggestion } from './services/geminiService';

export const FEATURED_LOCATIONS: LocationSuggestion[] = [
  {
    name: "Casablanca, Morocco",
    latitude: 33.5731,
    longitude: -7.5898,
    description: "Até 20/09/2026 01:00 UTC: UTC+1. A partir de 20/09/2026 às 01:00 UTC (transição das 02:00 para as 01:00 local): passa para UTC+0 permanente.",
    policyHistory: "No caso do país Marrocos, até 20/09/2026 às 01:00 UTC o país opera em UTC+1 (Decreto nº 2.18.855 de 2018). A partir de 20/09/2026 às 01:00 UTC (transição das 02:00 para as 01:00 local), todos os relógios passam de UTC+1 para UTC+0 permanente.",
    timezoneOffset: 60,
    baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
    dstInfo: {
      hasDst: false,
      start: "15-03-2026 03:00",
      end: "19-04-2026 02:00",
      shift: -60
    }
  },
  {
    name: "Rabat, Morocco",
    latitude: 34.0209,
    longitude: -6.8416,
    description: "Capital do Marrocos. UTC+1 até 20/09/2026 01:00 UTC; a partir deste instante (transição das 02:00 para as 01:00 local) passa para UTC+0 permanente.",
    policyHistory: "A capital administrativa do Reino do Marrocos. Até 20/09/2026 às 01:00 UTC opera em UTC+1. A partir de 20/09/2026 às 01:00 UTC (02:00 para 01:00 local), todos os relógios passam de UTC+1 para UTC+0 permanente.",
    timezoneOffset: 60,
    baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
    dstInfo: {
      hasDst: false
    }
  },
  {
    name: "Marrakech, Morocco",
    latitude: 31.6295,
    longitude: -7.9811,
    description: "Importante centro histórico do Marrocos. UTC+1 até 20/09/2026 01:00 UTC; a partir deste instante (transição das 02:00 para as 01:00 local) passa para UTC+0 permanente.",
    policyHistory: "Importante centro histórico e cultural do Marrocos. Até 20/09/2026 às 01:00 UTC opera em UTC+1. A partir de 20/09/2026 às 01:00 UTC (02:00 para 01:00 local), passa para UTC+0 permanente.",
    timezoneOffset: 60,
    baseOffsetTransitions: [{ date: "20-09-2026 01:00", newOffset: 0 }],
    dstInfo: {
      hasDst: false
    }
  },
  {
    name: "Eucla, Australia",
    latitude: -31.6781,
    longitude: 128.8833,
    description: "The unofficial UTC+8:45 timezone.",
    policyHistory: "Eucla and surrounding roadhouses follow 'Central Western Standard Time' (CWST), which is exactly 45 minutes ahead of Western Australia (AWST) and 45 minutes behind South Australia (ACST). A rare non-hour/half-hour offset.",
    timezoneOffset: 525
  },
  {
    name: "Lord Howe Island, Australia",
    latitude: -31.5553,
    longitude: 159.0722,
    description: "Unique +30 minute DST shift.",
    policyHistory: "Standard time is UTC+10:30. During summer, it moves to UTC+11:00. This 30-minute shift is unique in the IANA database as most DST transitions are exactly 60 minutes.",
    timezoneOffset: 630,
    dstInfo: {
      hasDst: true,
      start: "04-10-2026 02:00",
      end: "05-04-2026 03:00",
      shift: 30
    }
  },
  {
    name: "Kathmandu, Nepal",
    latitude: 27.7172,
    longitude: 85.3240,
    description: "One of three places with a 45-min offset.",
    policyHistory: "Nepal time (NPT) is UTC+5:45. It was adopted in 1956 to approximate the mean time of Gauri Sankar, a mountain east of Kathmandu. It is one of the most precise official offsets in any central timezone registry.",
    timezoneOffset: 345
  },
  {
    name: "Chatham Islands, New Zealand",
    latitude: -43.9536,
    longitude: -176.5413,
    description: "UTC+12:45 standard time.",
    policyHistory: "The Chatham Islands observe a standard time 45 minutes ahead of New Zealand. During summer (DST), they move to UTC+13:45, keeping them ahead of almost everywhere else on the planet.",
    timezoneOffset: 765,
    dstInfo: {
      hasDst: true,
      start: "27-09-2026 02:45",
      end: "05-04-2026 03:45",
      shift: 60
    }
  },
  {
    name: "Cairo, Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    description: "Reintroduced DST in 2023.",
    policyHistory: "Egypt has a volatile relationship with DST, having abolished it in 2011, 2014, 2015, and 2016. In 2023, the government reinstated DST (UTC+3) to save energy, reflecting modern geopolitical policy flux.",
    timezoneOffset: 120,
    dstInfo: {
      hasDst: true,
      start: "24-04-2026 00:00",
      end: "30-10-2026 00:00",
      shift: 60
    }
  },
  {
    name: "Greenwich, London",
    latitude: 51.4769,
    longitude: -0.0005,
    description: "The historical Prime Meridian.",
    policyHistory: "The origin of GMT. Before 1972, GMT was based on solar noon at this location. Since then, it has been tied to UTC, but remains the global anchor for all longitudinal time registries.",
    timezoneOffset: 0,
    dstInfo: { hasDst: true, start: "29-03-2026 01:00", end: "25-10-2026 02:00", shift: 60 }
  },
  {
    name: "Manaus, Brazil",
    latitude: -3.1190,
    longitude: -60.0217,
    description: "Amazonian Equatorial time.",
    policyHistory: "Manaus was one of the first cities in Brazil to abandon DST observation due to its proximity to the equator, where daylight variance is minimal. This alignment reflects ecological axial reality.",
    timezoneOffset: -240
  },
  {
    name: "Salvador, Bahia, Brazil",
    latitude: -12.9714,
    longitude: -38.5014,
    description: "Capital da Bahia (Nordeste) • UTC-3 Permanente.",
    policyHistory: "Salvador e a Bahia operam em UTC-3 permanente. Devido à sua latitude tropical (12°S), a variação entre verão e inverno é insignificante. O estado foi excluído do horário de verão brasileiro em 2003 e, após teste isolado em 2011/2012, revogou a adesão pela forte rejeição popular e ausência de economia energética.",
    timezoneOffset: -180,
    dstInfo: { hasDst: false }
  },
  {
    name: "Palmas, Tocantins, Brazil",
    latitude: -10.1844,
    longitude: -48.3336,
    description: "Capital do Tocantins (Norte) • UTC-3 Permanente.",
    policyHistory: "Palmas e o Tocantins operam em UTC-3 permanente. Criado em 1988, o Tocantins ficou fora do horário de verão no Decreto 6.558/2008. Foi incluído em 2012 (Decreto 7.826), mas a proximidade com o equador causava amanhecer tardio às 7h, levando o Decreto Federal 8.112/2013 a revogar definitivamente sua participação.",
    timezoneOffset: -180,
    dstInfo: { hasDst: false }
  },
  {
    name: "Brasília, DF, Brazil",
    latitude: -15.7938,
    longitude: -47.8828,
    description: "Capital Federal • Horário Oficial de Brasília (BRT UTC-3).",
    policyHistory: "Hora Oficial do Brasil (meridiano 45°W). Adotou horário de verão histórico regulado pelos Decretos 20.466/1931 e 6.558/2008. Em 25 de abril de 2019, o Decreto Federal nº 9.772 revogou em definitivo o horário de verão no Brasil.",
    timezoneOffset: -180,
    dstInfo: { hasDst: false }
  },
  {
    name: "Cuiabá, Mato Grosso, Brazil",
    latitude: -15.6014,
    longitude: -56.0979,
    description: "Pantanal & Centro-Oeste • AMT UTC-4.",
    policyHistory: "Mato Grosso e MS operam em AMT (UTC-4). Ao contrário do norte amazônico, MT e MS participavam do horário de verão brasileiro passando para UTC-3, até a revogação pelo Decreto Federal nº 9.772/2019.",
    timezoneOffset: -240,
    dstInfo: { hasDst: false }
  },
  {
    name: "Rio Branco, Acre, Brazil",
    latitude: -9.9753,
    longitude: -67.8249,
    description: "Extremo Oeste Brasileiro • Fuso do Acre (ACT UTC-5).",
    policyHistory: "O fuso do Acre foi alterado para UTC-4 pela Lei 11.662/2008. A população rejeitou a mudança no histórico referendo popular de 2010 promovido pelo TSE, e o Congresso Nacional promulgou a Lei Federal nº 12.876/2013 restaurando em definitivo o UTC-5.",
    timezoneOffset: -300,
    dstInfo: { hasDst: false }
  },
  {
    name: "Fernando de Noronha, Brazil",
    latitude: -3.8547,
    longitude: -32.4238,
    description: "Fuso Insular Oceânico • FNT UTC-2.",
    policyHistory: "Arquipélago oceânico brasileiro no Atlântico equatorial. Fuso horário fixado em UTC-2 pela Lei Federal nº 2.784 de 1913, sem horário de verão.",
    timezoneOffset: -120,
    dstInfo: { hasDst: false }
  }
];

export const MAJOR_SOLAR_OBSERVATORIES: LocationSuggestion[] = [
  {
    name: "Mauna Kea, Hawaii",
    latitude: 19.8207,
    longitude: -155.4681,
    description: "World-class solar and astronomical site.",
    policyHistory: "Home to multiple solar and night-time observatories due to high altitude and stable atmosphere.",
    timezoneOffset: -600
  },
  {
    name: "Roque de los Muchachos, La Palma",
    latitude: 28.7621,
    longitude: -17.8931,
    description: "Premier European solar observation site.",
    policyHistory: "Located at 2400m altitude in the Canary Islands, known for the Swedish 1-meter Solar Telescope.",
    timezoneOffset: 0,
    dstInfo: { hasDst: true, start: "29-03-2026 01:00", end: "25-10-2026 02:00", shift: 60 }
  },
  {
    name: "Atacama Desert, Chile",
    latitude: -23.0000,
    longitude: -68.0000,
    description: "High-altitude solar research hub.",
    policyHistory: "The driest place on Earth, hosting state-of-the-art solar and radio telescopes.",
    timezoneOffset: -240,
    dstInfo: { hasDst: true, start: "07-09-2026 00:00", end: "05-04-2026 00:00", shift: 60 }
  },
  {
    name: "Royal Observatory, Greenwich",
    latitude: 51.4769,
    longitude: -0.0005,
    description: "Historical center for solar timekeeping.",
    policyHistory: "The site of the Prime Meridian and historical home of solar noon measurements.",
    timezoneOffset: 0,
    dstInfo: { hasDst: true, start: "29-03-2026 01:00", end: "25-10-2026 02:00", shift: 60 }
  },
];

export const EXTREME_LATITUDE_LOCATIONS: LocationSuggestion[] = [
  {
    name: "Longyearbyen, Norway",
    latitude: 78.2232,
    longitude: 15.6467,
    description: "One of the world's northernmost settlements.",
    policyHistory: "Follows Central European Time. Experiences polar night and midnight sun due to high latitude.",
    timezoneOffset: 60,
    dstInfo: { hasDst: true, start: "29-03-2026 01:00", end: "25-10-2026 02:00", shift: 60 }
  },
  {
    name: "Ny-Ålesund, Norway",
    latitude: 78.9254,
    longitude: 11.9261,
    description: "World's northernmost functional town.",
    policyHistory: "A research town in Svalbard, following the same time policy as Longyearbyen.",
    timezoneOffset: 60,
    dstInfo: { hasDst: true, start: "29-03-2026 01:00", end: "25-10-2026 02:00", shift: 60 }
  },
  {
    name: "Qaanaaq, Greenland",
    latitude: 77.4700,
    longitude: -69.2300,
    description: "Northernmost town in Greenland.",
    policyHistory: "Follows Western Greenland Time.",
    timezoneOffset: -240,
    dstInfo: { hasDst: true, start: "29-03-2026 00:00", end: "25-10-2026 00:00", shift: 60 }
  },
  {
    name: "Puerto Williams, Chile",
    latitude: -54.9422,
    longitude: -67.6144,
    description: "Southernmost city in the world.",
    policyHistory: "Located on Navarino Island, observes Chilean DST.",
    timezoneOffset: -180,
    dstInfo: { hasDst: true, start: "07-09-2026 00:00", end: "05-04-2026 00:00", shift: 60 }
  },
  {
    name: "Ushuaia, Argentina",
    latitude: -54.8019,
    longitude: -68.3030,
    description: "Southernmost city in Argentina.",
    policyHistory: "Does not observe DST.",
    timezoneOffset: -180
  },
  {
    name: "Punta Arenas, Chile",
    latitude: -53.1638,
    longitude: -70.9171,
    description: "Major southernmost city in Chile.",
    policyHistory: "Follows Chilean time and observes DST.",
    timezoneOffset: -180,
    dstInfo: { hasDst: true, start: "07-09-2026 00:00", end: "05-04-2026 00:00", shift: 60 }
  }
];

export const GENERIC_TIMEZONES: LocationSuggestion[] = [
  {
    name: "UTC-12 (180° O)",
    latitude: 0,
    longitude: -180,
    timezoneOffset: -720,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 180° Oeste • Latitude 0° (Linha do Equador) • UTC-12:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 180° Oeste (Linha Internacional de Data) e latitude 0° (Linha do Equador). Não possui estações do ano e não adota horário de verão (DST)."
  },
  {
    name: "UTC-11 (165° O)",
    latitude: 0,
    longitude: -165,
    timezoneOffset: -660,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 165° Oeste • Latitude 0° (Linha do Equador) • UTC-11:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 165° Oeste e latitude 0°. Deslocamento exato de -11 horas em relação ao meridiano de Greenwich (-660min), sem estações e sem DST."
  },
  {
    name: "UTC-10 (150° O)",
    latitude: 0,
    longitude: -150,
    timezoneOffset: -600,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 150° Oeste • Latitude 0° (Linha do Equador) • UTC-10:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 150° Oeste e latitude 0°. Deslocamento exato de -10 horas em relação ao meridiano de Greenwich (-600min), sem estações e sem DST."
  },
  {
    name: "UTC-9 (135° O)",
    latitude: 0,
    longitude: -135,
    timezoneOffset: -540,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 135° Oeste • Latitude 0° (Linha do Equador) • UTC-9:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 135° Oeste e latitude 0°. Deslocamento exato de -9 horas em relação ao meridiano de Greenwich (-540min), sem estações e sem DST."
  },
  {
    name: "UTC-8 (120° O)",
    latitude: 0,
    longitude: -120,
    timezoneOffset: -480,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 120° Oeste • Latitude 0° (Linha do Equador) • UTC-8:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 120° Oeste e latitude 0°. Deslocamento exato de -8 horas em relação ao meridiano de Greenwich (-480min), sem estações e sem DST."
  },
  {
    name: "UTC-7 (105° O)",
    latitude: 0,
    longitude: -105,
    timezoneOffset: -420,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 105° Oeste • Latitude 0° (Linha do Equador) • UTC-7:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 105° Oeste e latitude 0°. Deslocamento exato de -7 horas em relação ao meridiano de Greenwich (-420min), sem estações e sem DST."
  },
  {
    name: "UTC-6 (90° O)",
    latitude: 0,
    longitude: -90,
    timezoneOffset: -360,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 90° Oeste • Latitude 0° (Linha do Equador) • UTC-6:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 90° Oeste e latitude 0°. Deslocamento exato de -6 horas em relação ao meridiano de Greenwich (-360min), sem estações e sem DST."
  },
  {
    name: "UTC-5 (75° O)",
    latitude: 0,
    longitude: -75,
    timezoneOffset: -300,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 75° Oeste • Latitude 0° (Linha do Equador) • UTC-5:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 75° Oeste e latitude 0°. Deslocamento exato de -5 horas em relação ao meridiano de Greenwich (-300min), sem estações e sem DST."
  },
  {
    name: "UTC-4 (60° O)",
    latitude: 0,
    longitude: -60,
    timezoneOffset: -240,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 60° Oeste • Latitude 0° (Linha do Equador) • UTC-4:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 60° Oeste e latitude 0°. Deslocamento exato de -4 horas em relação ao meridiano de Greenwich (-240min), sem estações e sem DST."
  },
  {
    name: "UTC-3 (45° O)",
    latitude: 0,
    longitude: -45,
    timezoneOffset: -180,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 45° Oeste • Latitude 0° (Linha do Equador) • UTC-3:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 45° Oeste e latitude 0°. Deslocamento exato de -3 horas em relação ao meridiano de Greenwich (-180min), sem estações e sem DST."
  },
  {
    name: "UTC-2 (30° O)",
    latitude: 0,
    longitude: -30,
    timezoneOffset: -120,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 30° Oeste • Latitude 0° (Linha do Equador) • UTC-2:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 30° Oeste e latitude 0°. Deslocamento exato de -2 horas em relação ao meridiano de Greenwich (-120min), sem estações e sem DST."
  },
  {
    name: "UTC-1 (15° O)",
    latitude: 0,
    longitude: -15,
    timezoneOffset: -60,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 15° Oeste • Latitude 0° (Linha do Equador) • UTC-1:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 15° Oeste e latitude 0°. Primeiro fuso oeste, atrasando 1 hora (-60min) em relação ao meridiano de Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+0 (0° Greenwich)",
    latitude: 0,
    longitude: 0,
    timezoneOffset: 0,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 0° (Greenwich) • Latitude 0° (Linha do Equador) • UTC±0:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário de referência primária no Meridiano de Greenwich (0° de longitude) e latitude 0° (Linha do Equador). Base zero do Tempo Universal Coordenado (UTC+0), sem estações do ano e sem DST."
  },
  {
    name: "UTC+1 (15° L)",
    latitude: 0,
    longitude: 15,
    timezoneOffset: 60,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 15° Leste • Latitude 0° (Linha do Equador) • UTC+1:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 15° Leste e latitude 0°. Primeiro fuso leste, adiantando 1 hora (+60min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+2 (30° L)",
    latitude: 0,
    longitude: 30,
    timezoneOffset: 120,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 30° Leste • Latitude 0° (Linha do Equador) • UTC+2:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 30° Leste e latitude 0°. Deslocamento de +2 horas (+120min) a cada 15° Leste, sem estações e sem DST."
  },
  {
    name: "UTC+3 (45° L)",
    latitude: 0,
    longitude: 45,
    timezoneOffset: 180,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 45° Leste • Latitude 0° (Linha do Equador) • UTC+3:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 45° Leste e latitude 0°. Deslocamento de +3 horas (+180min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+4 (60° L)",
    latitude: 0,
    longitude: 60,
    timezoneOffset: 240,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 60° Leste • Latitude 0° (Linha do Equador) • UTC+4:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 60° Leste e latitude 0°. Deslocamento de +4 horas (+240min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+5 (75° L)",
    latitude: 0,
    longitude: 75,
    timezoneOffset: 300,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 75° Leste • Latitude 0° (Linha do Equador) • UTC+5:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 75° Leste e latitude 0°. Deslocamento de +5 horas (+300min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+6 (90° L)",
    latitude: 0,
    longitude: 90,
    timezoneOffset: 360,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 90° Leste • Latitude 0° (Linha do Equador) • UTC+6:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 90° Leste e latitude 0°. Deslocamento de +6 horas (+360min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+7 (105° L)",
    latitude: 0,
    longitude: 105,
    timezoneOffset: 420,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 105° Leste • Latitude 0° (Linha do Equador) • UTC+7:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 105° Leste e latitude 0°. Deslocamento de +7 horas (+420min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+8 (120° L)",
    latitude: 0,
    longitude: 120,
    timezoneOffset: 480,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 120° Leste • Latitude 0° (Linha do Equador) • UTC+8:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 120° Leste e latitude 0°. Deslocamento de +8 horas (+480min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+9 (135° L)",
    latitude: 0,
    longitude: 135,
    timezoneOffset: 540,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 135° Leste • Latitude 0° (Linha do Equador) • UTC+9:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 135° Leste e latitude 0°. Deslocamento de +9 horas (+540min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+10 (150° L)",
    latitude: 0,
    longitude: 150,
    timezoneOffset: 600,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 150° Leste • Latitude 0° (Linha do Equador) • UTC+10:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 150° Leste e latitude 0°. Deslocamento de +10 horas (+600min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+11 (165° L)",
    latitude: 0,
    longitude: 165,
    timezoneOffset: 660,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 165° Leste • Latitude 0° (Linha do Equador) • UTC+11:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 165° Leste e latitude 0°. Deslocamento de +11 horas (+660min) em relação a Greenwich, sem estações e sem DST."
  },
  {
    name: "UTC+12 (180° L)",
    latitude: 0,
    longitude: 180,
    timezoneOffset: 720,
    dstInfo: { hasDst: false },
    description: "Fuso Genérico • Meridiano 180° Leste • Latitude 0° (Linha do Equador) • UTC+12:00 • Sem Estações • Sem DST",
    policyHistory: "Fuso horário genérico com meridiano de referência a 180° Leste (Linha Internacional de Data) e latitude 0°. Deslocamento de +12 horas (+720min) em relação a Greenwich, sem estações e sem DST."
  }
];

export function isGenericTimezone(loc: LocationSuggestion | null | undefined): boolean {
  if (!loc) return false;
  return GENERIC_TIMEZONES.some(gtz => 
    gtz.name === loc.name && 
    Math.abs(gtz.latitude - loc.latitude) < 0.001 && 
    Math.abs(gtz.longitude - loc.longitude) < 0.001
  ) || (loc.latitude === 0 && /^UTC[+-]?\d+/i.test(loc.name.trim()));
}



