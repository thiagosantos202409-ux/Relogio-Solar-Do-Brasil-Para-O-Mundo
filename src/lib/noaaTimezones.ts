import { getMoroccoTimezoneOffset, MOROCCO_TRANSITION_UTC_MS } from './moroccoTimezone';

export interface NoaaSeasonalPeriod {
  id: string;
  startRule: string;
  endRule: string;
  shift: number;
  startTime: string;
  endTime: string;
  vigencia: string;
  validityType: 'single' | 'range';
  enabled: boolean;
  isPermanent?: boolean;
  description?: string;
}

export interface NoaaTimezoneSystem {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  subdivision?: string;
  subdivisionPt?: string;
  region: 'Americas' | 'Europe' | 'Africa' | 'Asia' | 'Oceania' | 'Polar & Atlantic';
  regionPt: string;
  code: string;
  baseOffset: number; // in minutes relative to UTC
  referenceCoords: {
    latitude: number;
    longitude: number;
    cityName: string;
  };
  policyHistory: string;
  policyHistoryEn: string;
  dstInfo: {
    hasDst: boolean;
    start?: string;
    end?: string;
    shift?: number;
  };
  seasonalPeriods: NoaaSeasonalPeriod[];
  baseOffsetTransitions?: {
    date: string;
    newOffset: number;
  }[];
}

export const NOAA_REGIONS = [
  { id: 'all', labelPt: 'Todos os Sistemas', labelEn: 'All Systems' },
  { id: 'Americas', labelPt: 'Américas', labelEn: 'Americas' },
  { id: 'Europe', labelPt: 'Europa', labelEn: 'Europe' },
  { id: 'Africa', labelPt: 'África', labelEn: 'Africa' },
  { id: 'Asia', labelPt: 'Ásia & Oriente Médio', labelEn: 'Asia & Middle East' },
  { id: 'Oceania', labelPt: 'Oceania & Pacífico', labelEn: 'Oceania & Pacific' },
  { id: 'Polar & Atlantic', labelPt: 'Polar & Atlântico', labelEn: 'Polar & Atlantic' },
] as const;

export const NOAA_COUNTRY_PRESETS = [
  { id: 'all', labelPt: 'Todos os Países', labelEn: 'All Countries', flag: '🌍' },
  { id: 'BR', labelPt: 'Brasil (9 Sistemas)', labelEn: 'Brazil (9 Systems)', flag: '🇧🇷' },
  { id: 'US', labelPt: 'Estados Unidos (7 Sistemas)', labelEn: 'United States (7 Systems)', flag: '🇺🇸' },
  { id: 'CA', labelPt: 'Canadá (7 Sistemas)', labelEn: 'Canada (7 Systems)', flag: '🇨🇦' },
  { id: 'AU', labelPt: 'Austrália (7 Sistemas)', labelEn: 'Australia (7 Systems)', flag: '🇦🇺' },
  { id: 'MX', labelPt: 'México (4 Sistemas)', labelEn: 'Mexico (4 Systems)', flag: '🇲🇽' },
  { id: 'PT', labelPt: 'Portugal (2 Sistemas)', labelEn: 'Portugal (2 Systems)', flag: '🇵🇹' },
  { id: 'ES', labelPt: 'Espanha (2 Sistemas)', labelEn: 'Spain (2 Systems)', flag: '🇪🇸' },
  { id: 'CL', labelPt: 'Chile (3 Sistemas)', labelEn: 'Chile (3 Systems)', flag: '🇨🇱' },
  { id: 'RU', labelPt: 'Rússia (6 Sistemas)', labelEn: 'Russia (6 Systems)', flag: '🇷🇺' },
  { id: 'MA', labelPt: 'Marrocos', labelEn: 'Morocco', flag: '🇲🇦' },
] as const;

export const NOAA_TIMEZONE_SYSTEMS: NoaaTimezoneSystem[] = [
  // ==========================================
  // --- BRASIL (TODOS OS SUBSISTEMAS ESTADUAIS & REGIONAIS) ---
  // ==========================================
  {
    id: 'noaa-br-brasilia',
    name: 'NOAA Brasil - Brasília / Centro-Sul (BRT / BRST Histórico)',
    nameEn: 'NOAA Brazil - Brasília / Center-South (BRT / Historical BRST)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Distrito Federal, SP, RJ, MG, ES, PR, SC, RS, GO',
    subdivisionPt: 'Distrito Federal, Sudeste, Sul & Goiás',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'BRT / BRST',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -15.7938, longitude: -47.8828, cityName: 'Brasília, DF (Brasil)' },
    policyHistory: 'Instituído pelo Decreto nº 20.466 de 1931 pelo presidente Getúlio Vargas. Fuso oficial do Brasil (meridiano 45°W). O horário de verão vigorou em diversos períodos e foi padronizado pelo Decreto nº 6.558/2008 (3º domingo de outubro a 3º domingo de fevereiro). Em 25 de abril de 2019, o Decreto Federal nº 9.772 revogou o horário de verão em definitivo após estudos técnicos do ONS e Ministério de Minas e Energia.',
    policyHistoryEn: 'Standard time of Brazil (meridian 45°W). Summer time was standardized by Decree 6,558/2008 and permanently revoked on April 25, 2019 by Decree 9,772.',
    dstInfo: {
      hasDst: true,
      shift: 60
    },
    seasonalPeriods: [
      {
        id: 'noaa-br-rule-1',
        startRule: 'Terceiro Domingo De Outubro',
        endRule: 'Terceiro Domingo De Fevereiro',
        shift: 60,
        startTime: '00:00',
        endTime: '00:00',
        vigencia: 'Decreto Federal 6.558/2008 (Regra Histórica Nacional)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação padrão de +60m do horário de verão brasileiro'
      },
      {
        id: 'noaa-br-rule-2',
        startRule: 'Primeiro Domingo De Novembro',
        endRule: 'Terceiro Domingo De Fevereiro',
        shift: 60,
        startTime: '00:00',
        endTime: '00:00',
        vigencia: 'Decreto Federal 9.242/2017 (Anos Eleitorais)',
        validityType: 'single',
        enabled: false,
        isPermanent: false,
        description: 'Regra postergada em anos de eleições gerais'
      }
    ]
  },
  {
    id: 'noaa-br-salvador',
    name: 'NOAA Brasil - Salvador & Bahia (Nordeste / UTC-3 Permanente)',
    nameEn: 'NOAA Brazil - Salvador & Bahia (Northeast / Permanent UTC-3)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Bahia / Salvador (Nordeste)',
    subdivisionPt: 'Bahia (Salvador, Feira de Santana, Vitória da Conquista)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'BRT (BA)',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -12.9714, longitude: -38.5014, cityName: 'Salvador, Bahia (Brasil)' },
    policyHistory: 'No estado da Bahia, a capital Salvador e todos os municípios operam no fuso UTC-3. Devido à sua latitude tropical (12°S), a variação entre a duração do dia no verão e inverno é de apenas 40 minutos. O estado participou do horário de verão em edições anteriores, mas em 2003 e após um teste isolado em 2011/2012, o Governo da Bahia solicitou a exclusão definitiva devido à maciça rejeição da população (trabalhadores que saíam no escuro) e inexistência de economia real de energia. Permanece em UTC-3 fixo o ano todo.',
    policyHistoryEn: 'State of Bahia operates permanently on UTC-3. Due to tropical latitude (12°S), daylight varies minimally. The state was permanently excluded from DST after widespread public rejection.',
    dstInfo: { hasDst: false },
    seasonalPeriods: [
      {
        id: 'noaa-ba-hist-rule',
        startRule: 'Terceiro Domingo De Outubro',
        endRule: 'Terceiro Domingo De Fevereiro',
        shift: 60,
        startTime: '00:00',
        endTime: '00:00',
        vigencia: 'Decreto Estadual 13.367/2011 (Experimento Isolado Revogado)',
        validityType: 'single',
        enabled: false,
        isPermanent: false,
        description: 'Período experimental de horário de verão em 2011/2012 na Bahia, não renovado.'
      }
    ]
  },
  {
    id: 'noaa-br-tocantins',
    name: 'NOAA Brasil - Tocantins & Palmas (Norte / UTC-3 Permanente)',
    nameEn: 'NOAA Brazil - Tocantins & Palmas (North / Permanent UTC-3)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Tocantins / Palmas (Norte)',
    subdivisionPt: 'Tocantins (Palmas, Araguaína, Gurupi)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'BRT (TO)',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -10.1844, longitude: -48.3336, cityName: 'Palmas, Tocantins (Brasil)' },
    policyHistory: 'O Estado do Tocantins (criado pela Constituição de 1988 a partir do norte de Goiás) situa-se na Região Norte e opera no fuso UTC-3. Pelo Decreto Federal nº 6.558/2008, o Tocantins não participava do horário de verão. No ano de 2012 (Decreto nº 7.826), foi incluído a pedido do governador da época; entretanto, a proximidade com o equador fez o sol nascer quase às 7h da manhã, gerando enorme protesto popular. Em 2013, a Presidência da República publicou o Decreto Federal nº 8.112 revogando em definitivo a participação do Tocantins.',
    policyHistoryEn: 'Tocantins state operates on UTC-3. Excluded by Decree 6,558/2008, briefly included in 2012 by Decree 7,826, and permanently removed in 2013 by Decree 8,112 due to severe public disapproval.',
    dstInfo: { hasDst: false },
    seasonalPeriods: [
      {
        id: 'noaa-to-hist-rule',
        startRule: 'Terceiro Domingo De Outubro',
        endRule: 'Terceiro Domingo De Fevereiro',
        shift: 60,
        startTime: '00:00',
        endTime: '00:00',
        vigencia: 'Decreto Federal 7.826/2012 (Revogado pelo Decreto 8.112/2013)',
        validityType: 'single',
        enabled: false,
        isPermanent: false,
        description: 'Histórico da edição única em que o Tocantins participou do horário de verão.'
      }
    ]
  },
  {
    id: 'noaa-br-nordeste',
    name: 'NOAA Brasil - Nordeste Geral (Recife, Fortaleza, Natal / UTC-3 Permanente)',
    nameEn: 'NOAA Brazil - Northeast Region (Recife, Fortaleza / Permanent UTC-3)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Nordeste Setentrional & Leste (PE, CE, MA, PI, PB, RN, AL, SE)',
    subdivisionPt: 'Pernambuco, Ceará, Maranhão, Paraíba, Rio Grande do Norte, Alagoas, Sergipe e Piauí',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'BRT (NE)',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -8.0476, longitude: -34.8770, cityName: 'Recife, Pernambuco (Brasil)' },
    policyHistory: 'Compreende os estados de Pernambuco, Ceará, Maranhão, Piauí, Paraíba, Rio Grande do Norte, Alagoas e Sergipe. Todos operam no fuso UTC-3. Desde o Decreto Federal nº 4.844 de 2003, toda a região Nordeste foi desvinculada do horário de verão brasileiro em virtude da baixa latitude equatorial, mantendo o fuso UTC-3 constante e estável o ano todo.',
    policyHistoryEn: 'Northeast Brazil states (PE, CE, MA, PI, PB, RN, AL, SE) operate on permanent UTC-3 without DST since Decree 4,844 of 2003.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-br-para-amapa',
    name: 'NOAA Brasil - Pará & Amapá (Belém, Macapá / UTC-3 Permanente)',
    nameEn: 'NOAA Brazil - Pará & Amapá (Belém, Macapá / Permanent UTC-3)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Pará & Amapá (Norte Oriental)',
    subdivisionPt: 'Pará (Belém, Santarém, Marabá) e Amapá (Macapá, Santana)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'BRT (PA/AP)',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -1.4558, longitude: -48.4902, cityName: 'Belém, Pará (Brasil)' },
    policyHistory: 'Até 2008, o Estado do Pará era dividido: a parte oeste pertencia ao fuso UTC-4 e a parte leste ao fuso UTC-3. Pela Lei Federal nº 11.662 de 2008, todo o território do Pará foi unificado no fuso UTC-3, mesmo fuso do Amapá. Por estarem sobre a linha do Equador (Macapá fica na latitude 0°), não há qualquer razão física para horário de verão, operando em UTC-3 permanente.',
    policyHistoryEn: 'Covers Pará and Amapá. Unified into a single UTC-3 timezone by Federal Law 11,662 of 2008. Sits right on the equator with zero daylight variance.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-br-pantanal',
    name: 'NOAA Brasil - Mato Grosso & Mato Grosso do Sul (Cuiabá, Campo Grande / AMT)',
    nameEn: 'NOAA Brazil - Mato Grosso & MS (Cuiabá, Campo Grande / AMT)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Mato Grosso & Mato Grosso do Sul (Pantanal & Centro-Oeste)',
    subdivisionPt: 'Mato Grosso (Cuiabá, Rondonópolis) e Mato Grosso do Sul (Campo Grande, Dourados)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'AMT / AMST',
    baseOffset: -240, // UTC-4
    referenceCoords: { latitude: -15.6014, longitude: -56.0979, cityName: 'Cuiabá, Mato Grosso (Brasil)' },
    policyHistory: 'Mato Grosso e Mato Grosso do Sul operam no fuso UTC-4 (meridiano 60°W). Ao contrário dos demais estados do mesmo fuso (AM, RO, RR), MT e MS participavam ativamente do Horário de Verão brasileiro (passando para UTC-3) para acompanhar Brasília e o sistema bancário. Com a revogação geral pelo Decreto nº 9.772/2019, ambos os estados permanecem em UTC-4 permanente o ano todo.',
    policyHistoryEn: 'Mato Grosso and Mato Grosso do Sul operate on UTC-4 (AMT). Unlike northern Amazon states, MT and MS observed DST (shifting to UTC-3) until its nationwide revocation by Decree 9,772 in 2019.',
    dstInfo: {
      hasDst: true,
      shift: 60
    },
    seasonalPeriods: [
      {
        id: 'noaa-amt-rule-1',
        startRule: 'Terceiro Domingo De Outubro',
        endRule: 'Terceiro Domingo De Fevereiro',
        shift: 60,
        startTime: '00:00',
        endTime: '00:00',
        vigencia: 'Decreto Federal 6.558/2008 (Regra Histórica MT/MS)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para UTC-3 observada em MT e MS até 2019'
      }
    ]
  },
  {
    id: 'noaa-br-amazonia',
    name: 'NOAA Brasil - Amazonas, Rondônia & Roraima (Manaus, Porto Velho, Boa Vista / AMT)',
    nameEn: 'NOAA Brazil - Western Amazon (Manaus, Porto Velho, Boa Vista / AMT)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Amazonas Leste, Rondônia & Roraima (Norte Ocidental)',
    subdivisionPt: 'Amazonas (Manaus, Parintins), Rondônia (Porto Velho) e Roraima (Boa Vista)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'AMT',
    baseOffset: -240, // UTC-4
    referenceCoords: { latitude: -3.1190, longitude: -60.0217, cityName: 'Manaus, Amazonas (Brasil)' },
    policyHistory: 'Instituído pela Lei nº 2.784 de 1913. Abrange a maior porção do Estado do Amazonas (incluindo Manaus), Rondônia e Roraima. Pela extrema proximidade com a linha equatorial e o bioma amazônico, o comprimento do dia é invariável ao longo das estações, nunca tendo adotado o horário de verão moderno.',
    policyHistoryEn: 'Established by Law 2,784 of 1913 covering Amazonas, Rondonia, and Roraima. Never observed modern DST due to equatorial stability.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-br-acre',
    name: 'NOAA Brasil - Acre & Sudoeste do Amazonas (Rio Branco, Cruzeiro do Sul / ACT UTC-5)',
    nameEn: 'NOAA Brazil - Acre & SW Amazon (Rio Branco / ACT UTC-5)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Acre & Extremo Oeste do Amazonas',
    subdivisionPt: 'Acre (Rio Branco, Cruzeiro do Sul, Sena Madureira) e Amazonas (Eirunepé, Guajará)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'ACT',
    baseOffset: -300, // UTC-5
    referenceCoords: { latitude: -9.9753, longitude: -67.8249, cityName: 'Rio Branco, Acre (Brasil)' },
    policyHistory: 'Acre e extremo oeste do Amazonas (meridiano 75°W). Em 2008 a Lei nº 11.662 extinguiu o fuso UTC-5 puxando o Acre para UTC-4. A população não aceitou e em 31/10/2010 o TSE realizou um histórico referendo popular onde a maioria esmagadora dos acreanos votou pela restauração do fuso UTC-5. Em 2013, o Congresso Nacional promulgou a Lei Federal nº 12.876 restaurando definitivamente o fuso UTC-5.',
    policyHistoryEn: 'Covers Acre state and westernmost Amazonas. In 2008, Law 11,662 changed the fuso to UTC-4, but voters overwhelmingly rejected it in a 2010 referendum. Law 12,876 permanently restored UTC-5 in 2013.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-br-noronha',
    name: 'NOAA Brasil - Fernando de Noronha & Ilhas Oceânicas (FNT / UTC-2)',
    nameEn: 'NOAA Brazil - Fernando de Noronha & Oceanic Islands (FNT / UTC-2)',
    country: 'Brasil',
    countryCode: 'BR',
    countryFlag: '🇧🇷',
    subdivision: 'Fernando de Noronha & Ilhas Oceânicas',
    subdivisionPt: 'Fernando de Noronha (PE), Atol das Rocas (RN), São Pedro e São Paulo, Trindade (ES)',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'FNT',
    baseOffset: -120, // UTC-2
    referenceCoords: { latitude: -3.8547, longitude: -32.4238, cityName: 'Fernando de Noronha, PE (Brasil)' },
    policyHistory: 'Fuso insular do Atlântico brasileiro fixado em UTC-2 pela Lei Federal nº 2.784 de 1913 (meridiano 30°W). Compreende o arquipélago de Fernando de Noronha, Atol das Rocas, Arquipélago de São Pedro e São Paulo e Trindade/Martim Vaz. Nunca adotou horário de verão.',
    policyHistoryEn: 'Brazilian Atlantic island timezone fixed at UTC-2 since 1913. Sits at meridian 30°W and does not observe DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },

  // ==========================================
  // --- ESTADOS UNIDOS (SUBSISTEMAS ESTADUAIS & REGIONAIS) ---
  // ==========================================
  {
    id: 'noaa-us-eastern',
    name: 'NOAA EUA - Eastern Time (EST / EDT: Nova York, Washington, Miami)',
    nameEn: 'NOAA USA - Eastern Time (EST / EDT: New York, Washington, Miami)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Costa Leste (NY, FL, DC, MA, PA, GA, NC, VA)',
    subdivisionPt: 'Costa Leste Norte-Americana',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'EST / EDT',
    baseOffset: -300, // UTC-5
    referenceCoords: { latitude: 40.7128, longitude: -74.0060, cityName: 'Nova York, NY (EUA)' },
    policyHistory: 'Uniform Time Act de 1966 e Energy Policy Act de 2005. O horário de verão (EDT, UTC-4) entra em vigor às 02:00 do 2º domingo de março e termina às 02:00 do 1º domingo de novembro (+60m).',
    policyHistoryEn: 'Governed by Energy Policy Act of 2005. DST runs from 2nd Sunday in March to 1st Sunday in November.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-us-est-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Energy Policy Act of 2005 (Federal NIST/NOAA)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento de 1 hora para EDT'
      }
    ]
  },
  {
    id: 'noaa-us-central',
    name: 'NOAA EUA - Central Time (CST / CDT: Chicago, Dallas, Houston)',
    nameEn: 'NOAA USA - Central Time (CST / CDT: Chicago, Dallas, Houston)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Região Central (IL, TX, MN, MO, TN, WI, LA)',
    subdivisionPt: 'Região Central e Meio-Oeste',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'CST / CDT',
    baseOffset: -360, // UTC-6
    referenceCoords: { latitude: 41.8781, longitude: -87.6298, cityName: 'Chicago, IL (EUA)' },
    policyHistory: 'Central Standard Time (UTC-6) e Central Daylight Time (CDT, UTC-5). Segue o calendário oficial NIST/NOAA: 2º domingo de março ao 1º domingo de novembro.',
    policyHistoryEn: 'Central Standard Time (UTC-6) with daylight saving shift to UTC-5 under NIST/NOAA schedule.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-us-cst-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Energy Policy Act of 2005',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento de 1 hora para CDT'
      }
    ]
  },
  {
    id: 'noaa-us-mountain',
    name: 'NOAA EUA - Mountain Time (MST / MDT: Denver, Salt Lake City)',
    nameEn: 'NOAA USA - Mountain Time (MST / MDT: Denver, Salt Lake City)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Montanhas Rochosas (CO, UT, NM, WY, MT, ID)',
    subdivisionPt: 'Estados das Rochosas',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'MST / MDT',
    baseOffset: -420, // UTC-7
    referenceCoords: { latitude: 39.7392, longitude: -104.9903, cityName: 'Denver, CO (EUA)' },
    policyHistory: 'Mountain Standard Time (UTC-7) e Mountain Daylight Time (MDT, UTC-6). Adota horário de verão do 2º domingo de março ao 1º domingo de novembro.',
    policyHistoryEn: 'Mountain Standard Time (UTC-7) shifting to MDT (UTC-6) during summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-us-mst-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Energy Policy Act of 2005',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento para MDT'
      }
    ]
  },
  {
    id: 'noaa-us-arizona',
    name: 'NOAA EUA - Arizona (MST / UTC-7 Permanente sem DST)',
    nameEn: 'NOAA USA - Arizona (MST / Permanent UTC-7 without DST)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Arizona (Phoenix, Tucson, Flagstaff)',
    subdivisionPt: 'Estado do Arizona (exceto Nação Navajo)',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'MST',
    baseOffset: -420, // UTC-7
    referenceCoords: { latitude: 33.4484, longitude: -112.0740, cityName: 'Phoenix, Arizona (EUA)' },
    policyHistory: 'O Estado do Arizona optou por ficar fora do horário de verão desde 1968 sob o Uniform Time Act. O motivo é o clima desértico: estender a luz do sol para o final da tarde aumentaria o consumo de ar-condicionado em temperaturas extremas de verão. Apenas a Nação Navajo no nordeste do estado observa o horário de verão.',
    policyHistoryEn: 'Arizona has exempted itself from DST since 1968 under the Uniform Time Act due to extreme desert heat, keeping UTC-7 year-round (except Navajo Nation).',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-us-pacific',
    name: 'NOAA EUA - Pacific Time (PST / PDT: Los Angeles, San Francisco, Seattle)',
    nameEn: 'NOAA USA - Pacific Time (PST / PDT: Los Angeles, San Francisco, Seattle)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Costa Oeste (CA, WA, OR, NV)',
    subdivisionPt: 'Califórnia, Washington, Oregon e Nevada',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'PST / PDT',
    baseOffset: -480, // UTC-8
    referenceCoords: { latitude: 34.0522, longitude: -118.2437, cityName: 'Los Angeles, CA (EUA)' },
    policyHistory: 'Pacific Time cobre Califórnia, Washington, Oregon e Nevada. Observa o calendário NIST/NOAA: 2º domingo de março ao 1º domingo de novembro avançando para PDT (UTC-7).',
    policyHistoryEn: 'US Pacific timezone covering California, Washington, Oregon, and Nevada, advancing to PDT (UTC-7) in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-us-pst-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Energy Policy Act of 2005',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento de 1 hora para PDT'
      }
    ]
  },
  {
    id: 'noaa-us-alaska',
    name: 'NOAA EUA - Alaska Time (AKST / AKDT: Anchorage, Fairbanks)',
    nameEn: 'NOAA USA - Alaska Time (AKST / AKDT: Anchorage, Fairbanks)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Alasca (Anchorage, Fairbanks, Juneau)',
    subdivisionPt: 'Estado do Alasca',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'AKST / AKDT',
    baseOffset: -540, // UTC-9
    referenceCoords: { latitude: 61.2181, longitude: -149.9003, cityName: 'Anchorage, Alasca (EUA)' },
    policyHistory: 'O Estado do Alasca unificou quase todo o território no Alaska Time (UTC-9) em 1983. Observa o horário de verão NIST/NOAA avançando para AKDT (UTC-8).',
    policyHistoryEn: 'Unified almost all of Alaska in 1983 under AKST (UTC-9), shifting to AKDT (UTC-8) in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-us-ak-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Energy Policy Act of 2005',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento para AKDT'
      }
    ]
  },
  {
    id: 'noaa-us-hawaii',
    name: 'NOAA EUA - Hawaii Standard Time (HST: Honolulu / UTC-10 Permanente)',
    nameEn: 'NOAA USA - Hawaii Standard Time (HST: Honolulu / Permanent UTC-10)',
    country: 'Estados Unidos',
    countryCode: 'US',
    countryFlag: '🇺🇸',
    subdivision: 'Havaí (Honolulu, Maui, Kauai, Oahu)',
    subdivisionPt: 'Estado do Havaí e Ilhas do Pacífico Central',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'HST',
    baseOffset: -600, // UTC-10
    referenceCoords: { latitude: 21.3069, longitude: -157.8583, cityName: 'Honolulu, Havaí (EUA)' },
    policyHistory: 'O Havaí optou por sair do horário de verão em 1967 pelo Uniform Time Act. Por estar situado no cinturão tropical (latitude 21°N), a variação solar diária ao longo do ano é praticamente nula.',
    policyHistoryEn: 'Hawaii opted out of DST in 1967 under the Uniform Time Act due to tropical latitude and constant solar duration.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },

  // ==========================================
  // --- CANADÁ (SUBSISTEMAS PROVINCIAIS) ---
  // ==========================================
  {
    id: 'noaa-ca-newfoundland',
    name: 'NOAA Canadá - Newfoundland (NST / NDT: St. John\'s / UTC-3:30)',
    nameEn: 'NOAA Canada - Newfoundland (NST / NDT: St. John\'s / UTC-3:30)',
    country: 'Canadá',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    subdivision: 'Terra Nova e Labrador (St. John\'s)',
    subdivisionPt: 'Província de Terra Nova',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'NST / NDT',
    baseOffset: -210, // UTC-3:30
    referenceCoords: { latitude: 47.5615, longitude: -52.7126, cityName: 'St. John\'s, Terra Nova (Canadá)' },
    policyHistory: 'Fuso oficial de meia-hora da Província de Terra Nova (UTC-3:30). Durante o verão avança para NDT (UTC-2:30), alinhado com o calendário norte-americano.',
    policyHistoryEn: 'Unique half-hour timezone (UTC-3:30) of Newfoundland, advancing to UTC-2:30 during summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-ca-nf-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Newfoundland Standard Time Act',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para NDT (UTC-2:30)'
      }
    ]
  },
  {
    id: 'noaa-ca-saskatchewan',
    name: 'NOAA Canadá - Saskatchewan (CST: Regina, Saskatoon / UTC-6 Permanente)',
    nameEn: 'NOAA Canada - Saskatchewan (CST: Regina / Permanent UTC-6)',
    country: 'Canadá',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    subdivision: 'Saskatchewan (Regina, Saskatoon)',
    subdivisionPt: 'Província de Saskatchewan',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'CST',
    baseOffset: -360, // UTC-6
    referenceCoords: { latitude: 50.4547, longitude: -104.6067, cityName: 'Regina, Saskatchewan (Canadá)' },
    policyHistory: 'A Província de Saskatchewan não observa o horário de verão desde a aprovação do Time Act de 1966. Permanece em Central Standard Time (UTC-6) fixo durante todo o ano.',
    policyHistoryEn: 'Saskatchewan does not observe DST under the Time Act of 1966, keeping permanent CST (UTC-6) all year.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-ca-eastern',
    name: 'NOAA Canadá - Eastern (Toronto, Montreal, Ottawa / EST / EDT)',
    nameEn: 'NOAA Canada - Eastern (Toronto, Montreal, Ottawa / EST / EDT)',
    country: 'Canadá',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    subdivision: 'Ontário e Quebec (Toronto, Montreal)',
    subdivisionPt: 'Ontário e Quebec',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'EST / EDT',
    baseOffset: -300, // UTC-5
    referenceCoords: { latitude: 43.6532, longitude: -79.3832, cityName: 'Toronto, ON (Canadá)' },
    policyHistory: 'Cobre o polo demográfico e financeiro do Canadá (Ontário e Quebec). Observa horário de verão de março a novembro alinhado com Nova York.',
    policyHistoryEn: 'Covers Ontario and Quebec, synchronized with the US Eastern schedule.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-ca-est-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Canadian Eastern Time Harmonization',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para EDT'
      }
    ]
  },
  {
    id: 'noaa-ca-pacific',
    name: 'NOAA Canadá - Pacific (Vancouver, Victoria / PST / PDT)',
    nameEn: 'NOAA Canada - Pacific (Vancouver, Victoria / PST / PDT)',
    country: 'Canadá',
    countryCode: 'CA',
    countryFlag: '🇨🇦',
    subdivision: 'Colúmbia Britânica (Vancouver, Victoria)',
    subdivisionPt: 'Colúmbia Britânica e Yukon',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'PST / PDT',
    baseOffset: -480, // UTC-8
    referenceCoords: { latitude: 49.2827, longitude: -123.1207, cityName: 'Vancouver, BC (Canadá)' },
    policyHistory: 'Colúmbia Britânica opera em PST (UTC-8) e PDT (UTC-7) durante o horário de verão.',
    policyHistoryEn: 'British Columbia operates on Pacific Time with summer daylight saving shift.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-ca-pst-rule-1',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'BC Time Act Harmonization',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para PDT'
      }
    ]
  },

  // ==========================================
  // --- MÉXICO (SUBSISTEMAS PÓS-REFORMA DE 2022) ---
  // ==========================================
  {
    id: 'noaa-mx-centro',
    name: 'NOAA México - Zona Centro (Cidade do México, Guadalajara / UTC-6 Permanente)',
    nameEn: 'NOAA Mexico - Central Zone (Mexico City, Guadalajara / Permanent UTC-6)',
    country: 'México',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    subdivision: 'Centro, Sul e Leste (CDMX, Jalisco, Nuevo León, Puebla)',
    subdivisionPt: 'Maior parte do território mexicano',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'CST (MX)',
    baseOffset: -360, // UTC-6
    referenceCoords: { latitude: 19.4326, longitude: -99.1332, cityName: 'Cidade do México (México)' },
    policyHistory: 'Em outubro de 2022, o Congresso da União do México aprovou a nova "Ley de los Husos Horarios en los Estados Unidos Mexicanos", eliminando o horário de verão em quase todo o país após 26 anos. A Zona Centro opera permanentemente em UTC-6.',
    policyHistoryEn: 'In October 2022, Mexico enacted the Law of Timezones, abolishing nationwide daylight saving time. Central Mexico remains permanently on UTC-6.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-mx-quintanaroo',
    name: 'NOAA México - Quintana Roo (Cancún, Riviera Maya / UTC-5 Permanente sem DST)',
    nameEn: 'NOAA Mexico - Quintana Roo (Cancún, Riviera Maya / Permanent UTC-5)',
    country: 'México',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    subdivision: 'Quintana Roo (Cancún, Playa del Carmen, Cozumel, Tulum)',
    subdivisionPt: 'Estado de Quintana Roo (Península de Yucatán)',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'EST (QR)',
    baseOffset: -300, // UTC-5
    referenceCoords: { latitude: 21.1619, longitude: -86.8515, cityName: 'Cancún, Quintana Roo (México)' },
    policyHistory: 'Criado pela reforma de 2015 a pedido da indústria do turismo para que Cancún ficasse no mesmo fuso dos aeroportos da Costa Leste dos EUA (UTC-5) e aproveitasse mais luz solar no final da tarde. Permanece fixo em UTC-5 sem horário de verão.',
    policyHistoryEn: 'Established in 2015 for tourism alignment with the US East Coast. Quintana Roo remains permanently on UTC-5 with no DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-mx-baja',
    name: 'NOAA México - Baja California / Fronteira Norte (Tijuana, Mexicali / UTC-8 e UTC-7)',
    nameEn: 'NOAA Mexico - Baja California / Northern Border (Tijuana / UTC-8 & UTC-7)',
    country: 'México',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    subdivision: 'Baja California e Faixa de Fronteira Norte com os EUA',
    subdivisionPt: 'Tijuana, Mexicali, Ensenada',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'PST / PDT (MX)',
    baseOffset: -480, // UTC-8
    referenceCoords: { latitude: 32.5149, longitude: -117.0382, cityName: 'Tijuana, Baja California (México)' },
    policyHistory: 'A Lei dos Fusos de 2022 preservou o horário sazonal exclusivo para os municípios da faixa fronteiriça norte e o Estado de Baja California, sincronizando com o horário de verão dos EUA para não prejudicar o fluxo comercial transfronteiriço.',
    policyHistoryEn: 'Retained seasonal DST strictly along the northern border strip and Baja California to align with adjacent US commercial corridors.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-mx-border-rule',
        startRule: 'Segundo Domingo De Março',
        endRule: 'Primeiro Domingo De Novembro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Ley de Husos Horarios (Zona Fronteriza Norte)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Sincronização com o horário de verão dos EUA'
      }
    ]
  },
  {
    id: 'noaa-mx-sonora',
    name: 'NOAA México - Sonora (Hermosillo, Nogales / UTC-7 Permanente sem DST)',
    nameEn: 'NOAA Mexico - Sonora (Hermosillo / Permanent UTC-7 without DST)',
    country: 'México',
    countryCode: 'MX',
    countryFlag: '🇲🇽',
    subdivision: 'Sonora (Hermosillo, Ciudad Obregón, Nogales)',
    subdivisionPt: 'Estado de Sonora',
    region: 'Americas',
    regionPt: 'América do Norte',
    code: 'MST (SO)',
    baseOffset: -420, // UTC-7
    referenceCoords: { latitude: 29.0729, longitude: -110.9559, cityName: 'Hermosillo, Sonora (México)' },
    policyHistory: 'O Estado de Sonora não observa horário de verão desde 1999 para manter paridade absoluta de relógio com o Estado vizinho do Arizona (EUA), mantendo UTC-7 o ano todo.',
    policyHistoryEn: 'Sonora does not observe DST to maintain synchronized time with neighboring Arizona (US), remaining on UTC-7.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },

  // ==========================================
  // --- AUSTRÁLIA (SUBSISTEMAS ESTADUAIS) ---
  // ==========================================
  {
    id: 'noaa-au-sydney',
    name: 'NOAA Austrália - New South Wales & Victoria (Sydney, Melbourne / AEST / AEDT)',
    nameEn: 'NOAA Australia - NSW & Victoria (Sydney, Melbourne / AEST / AEDT)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'New South Wales, Victoria, ACT e Tasmânia',
    subdivisionPt: 'Sudeste Australiano',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'AEST / AEDT',
    baseOffset: 600, // UTC+10
    referenceCoords: { latitude: -33.8688, longitude: 151.2093, cityName: 'Sydney, Austrália' },
    policyHistory: 'Nova Gales do Sul, Victoria, Tasmânia e o Território da Capital Australiana observam AEDT (UTC+11) do 1º domingo de outubro às 02:00 até o 1º domingo de abril às 03:00.',
    policyHistoryEn: 'NSW, Victoria, Tasmania, and ACT observe AEDT (UTC+11) from 1st Sunday in October to 1st Sunday in April.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-au-syd-rule-1',
        startRule: 'Primeiro Domingo De Outubro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'Australian Eastern Standard Time Harmonization',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para AEDT (UTC+11)'
      }
    ]
  },
  {
    id: 'noaa-au-queensland',
    name: 'NOAA Austrália - Queensland (Brisbane, Cairns / AEST UTC+10 Permanente sem DST)',
    nameEn: 'NOAA Australia - Queensland (Brisbane / AEST Permanent UTC+10)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'Queensland (Brisbane, Gold Coast, Cairns)',
    subdivisionPt: 'Estado de Queensland',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'AEST (QLD)',
    baseOffset: 600, // UTC+10
    referenceCoords: { latitude: -27.4698, longitude: 153.0251, cityName: 'Brisbane, Queensland (Austrália)' },
    policyHistory: 'O Estado de Queensland rejeitou o horário de verão em referendo estadual em 1992 devido ao clima tropical e aos produtores rurais do norte, permanecendo em AEST (UTC+10) fixo todo o ano.',
    policyHistoryEn: 'Queensland rejected DST in a 1992 referendum due to tropical climate and regional agriculture, staying permanently on UTC+10.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-au-south',
    name: 'NOAA Austrália - South Australia (Adelaide / ACST / ACDT UTC+9:30)',
    nameEn: 'NOAA Australia - South Australia (Adelaide / ACST / ACDT UTC+9:30)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'South Australia (Adelaide)',
    subdivisionPt: 'Sul da Austrália',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'ACST / ACDT',
    baseOffset: 570, // UTC+9:30
    referenceCoords: { latitude: -34.9285, longitude: 138.6007, cityName: 'Adelaide, South Australia' },
    policyHistory: 'Fuso de meia-hora oficial (UTC+9:30). Durante o horário de verão avança para ACDT (UTC+10:30) de outubro a abril.',
    policyHistoryEn: 'Official half-hour offset (UTC+9:30) shifting to ACDT (UTC+10:30) in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-au-sa-rule-1',
        startRule: 'Primeiro Domingo De Outubro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'South Australia Daylight Saving Act',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para ACDT (UTC+10:30)'
      }
    ]
  },
  {
    id: 'noaa-au-north',
    name: 'NOAA Austrália - Northern Territory (Darwin / ACST UTC+9:30 Permanente sem DST)',
    nameEn: 'NOAA Australia - Northern Territory (Darwin / Permanent UTC+9:30)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'Território do Norte (Darwin, Alice Springs)',
    subdivisionPt: 'Território do Norte',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'ACST (NT)',
    baseOffset: 570, // UTC+9:30
    referenceCoords: { latitude: -12.4634, longitude: 130.8456, cityName: 'Darwin, Território do Norte (Austrália)' },
    policyHistory: 'O Território do Norte mantém UTC+9:30 fixo todo o ano sem horário de verão por se situar no extremo tropical e árido central.',
    policyHistoryEn: 'Northern Territory does not observe DST due to tropical climate, remaining on UTC+9:30.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-au-perth',
    name: 'NOAA Austrália - Western Australia (Perth / AWST UTC+8 Permanente sem DST)',
    nameEn: 'NOAA Australia - Western Australia (Perth / Permanent UTC+8)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'Austrália Ocidental (Perth, Fremantle)',
    subdivisionPt: 'Estado de Western Australia',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'AWST',
    baseOffset: 480, // UTC+8
    referenceCoords: { latitude: -31.9505, longitude: 115.8605, cityName: 'Perth, Austrália Ocidental' },
    policyHistory: 'Após quatro referendos estaduais (o último em 2009 onde a população rejeitou formalmente o horário de verão), Western Australia permanece em AWST (UTC+8) o ano todo.',
    policyHistoryEn: 'Western Australia voted against DST in four referendums, permanently remaining on AWST (UTC+8).',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-au-lord-howe',
    name: 'NOAA Austrália - Lord Howe Island (LHST / LHDT, Shift Único +30m)',
    nameEn: 'NOAA Australia - Lord Howe Island (LHST / LHDT, Unique +30m Shift)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'Ilha Lord Howe',
    subdivisionPt: 'Território Insular de Lord Howe',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'LHST / LHDT',
    baseOffset: 630, // UTC+10:30
    referenceCoords: { latitude: -31.5553, longitude: 159.0821, cityName: 'Ilha Lord Howe, Austrália' },
    policyHistory: 'Fuso insular astronômico único no mundo: durante o horário de verão avança apenas 30 minutos (+30m), transitando de UTC+10:30 para UTC+11:00 do primeiro domingo de outubro ao primeiro domingo de abril.',
    policyHistoryEn: 'Lord Howe Island observes a unique 30-minute DST shift, moving from UTC+10:30 to UTC+11:00 during summer.',
    dstInfo: { hasDst: true, shift: 30 },
    seasonalPeriods: [
      {
        id: 'noaa-lh-rule-1',
        startRule: 'Primeiro Domingo De Outubro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 30,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Lord Howe Island Act',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Shift de 30 minutos para UTC+11:00'
      }
    ]
  },
  {
    id: 'noaa-au-eucla',
    name: 'NOAA Austrália - Central Western Standard Time (CWST, UTC+8:45)',
    nameEn: 'NOAA Australia - Central Western Standard Time (CWST, UTC+8:45)',
    country: 'Austrália',
    countryCode: 'AU',
    countryFlag: '🇦🇺',
    subdivision: 'Eucla & Rodovia Eyre (Eyre Highway)',
    subdivisionPt: 'Região de Eucla e fronteira WA/SA',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'CWST',
    baseOffset: 525, // UTC+8:45
    referenceCoords: { latitude: -31.6766, longitude: 128.8831, cityName: 'Eucla, Austrália Ocidental' },
    policyHistory: 'Fuso regional observado por convenção e placas oficiais na Eyre Highway (Eucla, Caiguna, Madura, Mundrabilla). Fica exatamente 45 minutos à frente de Perth e 45 minutos atrás de Adelaide. Não observa horário de verão.',
    policyHistoryEn: 'Unofficial yet universally observed regional offset on the Eyre Highway (UTC+8:45).',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },

  // ==========================================
  // --- PORTUGAL (CONTINENTE & REGIÕES AUTÓNOMAS) ---
  // ==========================================
  {
    id: 'noaa-pt-continental',
    name: 'NOAA Portugal - Continental & Madeira (Lisboa, Porto, Funchal / WET / WEST)',
    nameEn: 'NOAA Portugal - Mainland & Madeira (Lisbon, Porto / WET / WEST)',
    country: 'Portugal',
    countryCode: 'PT',
    countryFlag: '🇵🇹',
    subdivision: 'Portugal Continental e Arquipélago da Madeira',
    subdivisionPt: 'Continente e Região Autónoma da Madeira',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'WET / WEST',
    baseOffset: 0, // UTC+0
    referenceCoords: { latitude: 38.7223, longitude: -9.1393, cityName: 'Lisboa, Portugal' },
    policyHistory: 'Regido pelo Decreto-Lei nº 4/2012 e pela Diretiva 2000/84/CE. Opera em Western European Time (WET, UTC+0) e avança para Western European Summer Time (WEST, UTC+1) do último domingo de março ao último domingo de outubro.',
    policyHistoryEn: 'Portugal Mainland and Madeira operate on WET (UTC+0), shifting to WEST (UTC+1) under EU Directive 2000/84/EC.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-pt-wet-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '01:00',
        endTime: '02:00',
        vigencia: 'Decreto-Lei 4/2012 / Diretiva Europeia 2000/84/CE',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para WEST (UTC+1)'
      }
    ]
  },
  {
    id: 'noaa-pt-azores',
    name: 'NOAA Portugal - Açores (Ponta Delgada / AZOT / AZOST UTC-1)',
    nameEn: 'NOAA Portugal - Azores (Ponta Delgada / AZOT / AZOST UTC-1)',
    country: 'Portugal',
    countryCode: 'PT',
    countryFlag: '🇵🇹',
    subdivision: 'Região Autónoma dos Açores (9 Ilhas)',
    subdivisionPt: 'Arquipélago dos Açores',
    region: 'Polar & Atlantic',
    regionPt: 'Atlântico',
    code: 'AZOT / AZOST',
    baseOffset: -60, // UTC-1
    referenceCoords: { latitude: 37.7412, longitude: -25.6756, cityName: 'Ponta Delgada, Açores (Portugal)' },
    policyHistory: 'O Arquipélago dos Açores situa-se no Atlântico Norte a 1 hora a menos do continente (UTC-1). Segue a Diretiva Europeia adiantando para UTC+0 (AZOST) no último domingo de março e retornando para UTC-1 no último domingo de outubro.',
    policyHistoryEn: 'Azores archipelago sits at UTC-1, advancing to UTC+0 during summer under EU directives.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-azores-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '00:00',
        endTime: '01:00',
        vigencia: 'Diretiva Europeia 2000/84/CE (Açores)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para AZOST (UTC+0)'
      }
    ]
  },

  // ==========================================
  // --- ESPANHA (PENÍNSULA & CANÁRIAS) ---
  // ==========================================
  {
    id: 'noaa-es-peninsula',
    name: 'NOAA Espanha - Península & Baleares (Madrid, Barcelona / CET / CEST UTC+1)',
    nameEn: 'NOAA Spain - Mainland & Balearics (Madrid, Barcelona / CET / CEST UTC+1)',
    country: 'Espanha',
    countryCode: 'ES',
    countryFlag: '🇪🇸',
    subdivision: 'Espanha Peninsular e Ilhas Baleares',
    subdivisionPt: 'Península Ibérica e Baleares',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'CET / CEST',
    baseOffset: 60, // UTC+1
    referenceCoords: { latitude: 40.4168, longitude: -3.7038, cityName: 'Madrid, Espanha' },
    policyHistory: 'Em 1940 a Espanha adotou o Horário da Europa Central (CET, UTC+1). Segue a Diretiva 2000/84/CE avançando para CEST (UTC+2) no verão.',
    policyHistoryEn: 'Mainland Spain and Balearic Islands operate on CET (UTC+1), advancing to CEST (UTC+2) in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-es-cet-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'Diretiva Europeia 2000/84/CE',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para CEST (UTC+2)'
      }
    ]
  },
  {
    id: 'noaa-es-canarias',
    name: 'NOAA Espanha - Ilhas Canárias (Las Palmas, Tenerife / WET / WEST UTC+0)',
    nameEn: 'NOAA Spain - Canary Islands (Las Palmas, Tenerife / WET / WEST UTC+0)',
    country: 'Espanha',
    countryCode: 'ES',
    countryFlag: '🇪🇸',
    subdivision: 'Comunidade Autónoma das Canárias (Las Palmas, Santa Cruz)',
    subdivisionPt: 'Arquipélago das Ilhas Canárias',
    region: 'Africa',
    regionPt: 'Atlântico / África',
    code: 'WET / WEST (ES)',
    baseOffset: 0, // UTC+0
    referenceCoords: { latitude: 28.1235, longitude: -15.4363, cityName: 'Las Palmas de Gran Canaria, Canárias (Espanha)' },
    policyHistory: 'As Ilhas Canárias ficam 1 hora atrás da Espanha continental ("una hora menos en Canarias"), operando em WET (UTC+0) e avançando para WEST (UTC+1) no horário de verão europeu.',
    policyHistoryEn: 'Canary Islands operate one hour behind mainland Spain (WET, UTC+0), shifting to WEST (UTC+1) in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-es-can-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '01:00',
        endTime: '02:00',
        vigencia: 'Diretiva Europeia 2000/84/CE (Canarias)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para WEST (UTC+1)'
      }
    ]
  },

  // ==========================================
  // --- CHILE (CONTINENTE, MAGALLANES & PÁSCOA) ---
  // ==========================================
  {
    id: 'noaa-cl-santiago',
    name: 'NOAA Chile - Hora Continental (Santiago, Valparaíso / CLT / CLST UTC-4)',
    nameEn: 'NOAA Chile - Continental Time (Santiago / CLT / CLST UTC-4)',
    country: 'Chile',
    countryCode: 'CL',
    countryFlag: '🇨🇱',
    subdivision: 'Chile Continental (Centro e Norte)',
    subdivisionPt: 'Regiões Continental do Chile',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'CLT / CLST',
    baseOffset: -240, // UTC-4
    referenceCoords: { latitude: -33.4489, longitude: -70.6693, cityName: 'Santiago, Chile' },
    policyHistory: 'O Chile adota horário de verão estrito: adianta 60 minutos à meia-noite do primeiro sábado de setembro (para UTC-3) e retrocede à meia-noite do primeiro sábado de abril (para UTC-4).',
    policyHistoryEn: 'Continental Chile advances 60 min at midnight on 1st Saturday of September (UTC-3) and falls back on 1st Saturday of April (UTC-4).',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-cl-rule-1',
        startRule: 'Primeiro Sábado De Setembro',
        endRule: 'Primeiro Sábado De Abril',
        shift: 60,
        startTime: '24:00',
        endTime: '24:00',
        vigencia: 'Decreto Supremo 1.286 (Chile Continental)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação sazonal de verão chileno'
      }
    ]
  },
  {
    id: 'noaa-cl-magallanes',
    name: 'NOAA Chile - Magallanes & Antártica Chilena (Punta Arenas / UTC-3 Permanente)',
    nameEn: 'NOAA Chile - Magallanes Region (Punta Arenas / Permanent UTC-3)',
    country: 'Chile',
    countryCode: 'CL',
    countryFlag: '🇨🇱',
    subdivision: 'Região de Magallanes e da Antártica Chilena',
    subdivisionPt: 'Extremo Sul do Chile e Patagônia',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'CLST (Magallanes)',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -53.1638, longitude: -70.9171, cityName: 'Punta Arenas, Magallanes (Chile)' },
    policyHistory: 'Pelo Decreto Presidencial de 2016, a Região de Magallanes mantém UTC-3 permanente o ano todo sem alterar seus relógios, para aproveitar a luminosidade vespertina no inverno austral austral da Patagônia.',
    policyHistoryEn: 'By 2016 presidential decree, Magallanes maintains UTC-3 permanently year-round to preserve afternoon daylight in subpolar winter.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-cl-pascoa',
    name: 'NOAA Chile - Ilha de Páscoa / Rapa Nui (EAST / EASST UTC-6)',
    nameEn: 'NOAA Chile - Easter Island / Rapa Nui (EAST / EASST UTC-6)',
    country: 'Chile',
    countryCode: 'CL',
    countryFlag: '🇨🇱',
    subdivision: 'Ilha de Páscoa (Rapa Nui)',
    subdivisionPt: 'Território Insular da Ilha de Páscoa',
    region: 'Oceania',
    regionPt: 'Pacífico Sul',
    code: 'EAST / EASST',
    baseOffset: -360, // UTC-6
    referenceCoords: { latitude: -27.1127, longitude: -109.3497, cityName: 'Hanga Roa, Ilha de Páscoa (Chile)' },
    policyHistory: 'A Ilha de Páscoa opera em UTC-6 no inverno e adianta para UTC-5 no verão, sincronizada com o calendário de transição chileno.',
    policyHistoryEn: 'Easter Island operates on UTC-6, advancing to UTC-5 during summer in tandem with Chilean regulations.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-cl-easter-rule',
        startRule: 'Primeiro Sábado De Setembro',
        endRule: 'Primeiro Sábado De Abril',
        shift: 60,
        startTime: '22:00',
        endTime: '22:00',
        vigencia: 'Decreto Supremo (Rapa Nui)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para EASST (UTC-5)'
      }
    ]
  },

  // ==========================================
  // --- MARROCOS (TRANSIÇÃO DEFINITIVA 20/09/2026) ---
  // ==========================================
  {
    id: 'noaa-ma-casablanca',
    name: 'NOAA Marrocos - Western European Time (UTC+1 até 20/09/2026 01:00 UTC ➔ UTC+0 Permanente)',
    nameEn: 'NOAA Morocco - Western European Time (UTC+1 until 20/09/2026 01:00 UTC ➔ Permanent UTC+0)',
    country: 'Marrocos',
    countryCode: 'MA',
    countryFlag: '🇲🇦',
    subdivision: 'Reino do Marrocos (Casablanca, Rabat, Marrakech, Tânger, Fez)',
    subdivisionPt: 'Todo o território nacional marroquino',
    region: 'Africa',
    regionPt: 'África',
    code: 'WEST (UTC+1) ➔ WET (UTC+0)',
    baseOffset: getMoroccoTimezoneOffset(Date.now()),
    referenceCoords: { latitude: 33.5731, longitude: -7.5898, cityName: 'Casablanca, Marrocos' },
    policyHistory: 'No caso do país Marrocos, até 20/09/2026 às 01:00 UTC o fuso horário oficial operava em UTC+1 (GMT+1 / WEST, Decreto nº 2.18.855 de 2018). A partir de 20/09/2026 às 01:00 UTC (transição das 02:00 para as 01:00 no horário local), todos os relógios no Marrocos passam permanentemente de UTC+1 para UTC+0 (WET), extinguindo o horário de verão e unificando o país no meridiano de Greenwich.',
    policyHistoryEn: 'In the case of Morocco, until September 20, 2026 at 01:00 UTC the official timezone operated on UTC+1 (GMT+1 / WEST, Decree 2.18.855 of 2018). Starting from September 20, 2026 at 01:00 UTC (transitioning from 02:00 to 01:00 local time), all clocks across Morocco permanently transition from UTC+1 to UTC+0 (WET), abolishing seasonal shifts and unifying the country on the Greenwich meridian.',
    dstInfo: { hasDst: false },
    seasonalPeriods: [
      {
        id: 'noaa-ma-transition-2026',
        startRule: '20/09',
        endRule: 'PERMANENTE',
        shift: -60,
        startTime: '02:00',
        endTime: '01:00',
        vigencia: 'Transição Oficial 20/09/2026 01:00 UTC: Passagem de UTC+1 para UTC+0 Permanente (02:00 ➔ 01:00)',
        validityType: 'range',
        enabled: true,
        isPermanent: true,
        description: 'Até 20/09/2026 às 01:00 UTC o Marrocos opera em UTC+1. A partir de 20/09/2026 01:00 UTC (02:00 para 01:00 local de 20/09/2026), passa de UTC+1 para UTC+0 permanente.'
      }
    ]
  },

  // ==========================================
  // --- RÚSSIA (SUBSISTEMAS DOS 11 FUSOS) ---
  // ==========================================
  {
    id: 'noaa-ru-moscow',
    name: 'NOAA Rússia - Horário de Moscou (MSK: Moscou, São Petersburgo / UTC+3)',
    nameEn: 'NOAA Russia - Moscow Time (MSK: Moscow, St. Petersburg / UTC+3)',
    country: 'Rússia',
    countryCode: 'RU',
    countryFlag: '🇷🇺',
    subdivision: 'Rússia Europeia (Moscou, São Petersburgo, Cazã)',
    subdivisionPt: 'Zona 2 dos Fusos Russos',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'MSK',
    baseOffset: 180, // UTC+3
    referenceCoords: { latitude: 55.7558, longitude: 37.6173, cityName: 'Moscou, Rússia' },
    policyHistory: 'Em 2014, após rejeição popular ao horário de verão permanente fixado em 2011, a Duma russa aprovou lei federal retornando Moscou a UTC+3 permanente sem horário de verão.',
    policyHistoryEn: 'In 2014, Russia shifted permanently back to UTC+3 standard time with no DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-ru-kaliningrad',
    name: 'NOAA Rússia - Kaliningrado (USZ1: Kaliningrado / UTC+2 Permanente)',
    nameEn: 'NOAA Russia - Kaliningrad (USZ1: Kaliningrad / Permanent UTC+2)',
    country: 'Rússia',
    countryCode: 'RU',
    countryFlag: '🇷🇺',
    subdivision: 'Enclave de Kaliningrado (Mar Báltico)',
    subdivisionPt: 'Zona 1 dos Fusos Russos',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'USZ1',
    baseOffset: 120, // UTC+2
    referenceCoords: { latitude: 54.7104, longitude: 20.4522, cityName: 'Kaliningrado, Rússia' },
    policyHistory: 'Enclave russo no Mar Báltico, opera em UTC+2 permanente sem horário de verão (1 hora atrás de Moscou).',
    policyHistoryEn: 'Kaliningrad exclave on the Baltic Sea, permanently on UTC+2.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-ru-yekaterinburg',
    name: 'NOAA Rússia - Ecaterimburgo / Urais (YEKT: Ecaterimburgo / UTC+5)',
    nameEn: 'NOAA Russia - Yekaterinburg / Urals (YEKT / UTC+5)',
    country: 'Rússia',
    countryCode: 'RU',
    countryFlag: '🇷🇺',
    subdivision: 'Montes Urais e Sibéria Ocidental',
    subdivisionPt: 'Zona 4 dos Fusos Russos',
    region: 'Asia',
    regionPt: 'Ásia / Urais',
    code: 'YEKT',
    baseOffset: 300, // UTC+5
    referenceCoords: { latitude: 56.8389, longitude: 60.6057, cityName: 'Ecaterimburgo, Rússia' },
    policyHistory: 'Fuso dos Montes Urais, marco geográfico entre a Europa e a Ásia. Opera em UTC+5 permanente (MSK+2).',
    policyHistoryEn: 'Urals timezone marking boundary between Europe and Asia, operating permanently at UTC+5.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-ru-vladivostok',
    name: 'NOAA Rússia - Vladivostok / Primorsky (VLAT: Vladivostok / UTC+10)',
    nameEn: 'NOAA Russia - Vladivostok (VLAT: Vladivostok / UTC+10)',
    country: 'Rússia',
    countryCode: 'RU',
    countryFlag: '🇷🇺',
    subdivision: 'Extremo Oriente Russo (Território de Primorsky)',
    subdivisionPt: 'Zona 9 dos Fusos Russos',
    region: 'Asia',
    regionPt: 'Extremo Oriente',
    code: 'VLAT',
    baseOffset: 600, // UTC+10
    referenceCoords: { latitude: 43.1155, longitude: 131.8855, cityName: 'Vladivostok, Rússia' },
    policyHistory: 'Porto principal russo no Oceano Pacífico (MSK+7, UTC+10 permanente).',
    policyHistoryEn: 'Major Russian Pacific port operating permanently on UTC+10 (MSK+7).',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-ru-kamchatka',
    name: 'NOAA Rússia - Kamchatka (PETT: Petropavlovsk-Kamchatsky / UTC+12)',
    nameEn: 'NOAA Russia - Kamchatka (PETT: Petropavlovsk / UTC+12)',
    country: 'Rússia',
    countryCode: 'RU',
    countryFlag: '🇷🇺',
    subdivision: 'Península de Kamchatka e Chukotka',
    subdivisionPt: 'Zona 11 dos Fusos Russos',
    region: 'Asia',
    regionPt: 'Pacífico Norte',
    code: 'PETT',
    baseOffset: 720, // UTC+12
    referenceCoords: { latitude: 53.0167, longitude: 158.6500, cityName: 'Petropavlovsk-Kamchatsky, Rússia' },
    policyHistory: 'O fuso mais oriental da Federação Russa (MSK+9, UTC+12 permanente).',
    policyHistoryEn: 'Easternmost timezone of the Russian Federation, operating on permanent UTC+12.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },

  // ==========================================
  // --- OUTROS SISTEMAS GLOBAIS PRINCIPAIS ---
  // ==========================================
  {
    id: 'noaa-ar-buenosaires',
    name: 'NOAA Argentina - Hora Oficial Argentina (ART: Buenos Aires / UTC-3)',
    nameEn: 'NOAA Argentina - Official Argentina Time (ART / UTC-3)',
    country: 'Argentina',
    countryCode: 'AR',
    countryFlag: '🇦🇷',
    subdivision: 'República Argentina',
    subdivisionPt: 'Todo o território argentino',
    region: 'Americas',
    regionPt: 'América do Sul',
    code: 'ART',
    baseOffset: -180, // UTC-3
    referenceCoords: { latitude: -34.6037, longitude: -58.3816, cityName: 'Buenos Aires, Argentina' },
    policyHistory: 'A Argentina mantém UTC-3 permanente desde 1969. Não observa horário de verão desde março de 2009.',
    policyHistoryEn: 'Argentina has maintained UTC-3 permanently since 1969, with no DST since 2009.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-eu-central',
    name: 'NOAA Europa Central - CET & CEST (Paris, Berlim, Roma, Amsterdã)',
    nameEn: 'NOAA Central Europe - CET & CEST (Paris, Berlin, Rome, Amsterdam)',
    country: 'Alemanha',
    countryCode: 'DE',
    countryFlag: '🇪🇺',
    subdivision: 'União Europeia Central',
    subdivisionPt: 'França, Alemanha, Itália, Holanda, Bélgica, Áustria, Polônia',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'CET / CEST',
    baseOffset: 60, // UTC+1
    referenceCoords: { latitude: 52.5200, longitude: 13.4050, cityName: 'Berlim, Alemanha' },
    policyHistory: 'Regido pela Diretiva 2000/84/CE da União Europeia. O horário de verão (CEST, UTC+2) inicia no último domingo de março às 02:00 CET e termina no último domingo de outubro às 03:00 CEST.',
    policyHistoryEn: 'Governed by EU Directive 2000/84/EC. CEST (UTC+2) runs from last Sunday in March to last Sunday in October.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-eu-cet-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'Diretiva Comunitária Europeia 2000/84/CE',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento de 60m sincronizado em toda a UE'
      }
    ]
  },
  {
    id: 'noaa-uk-gmt',
    name: 'NOAA Reino Unido - GMT & BST (Londres, Greenwich)',
    nameEn: 'NOAA United Kingdom - GMT & BST (London, Greenwich)',
    country: 'Reino Unido',
    countryCode: 'GB',
    countryFlag: '🇬🇧',
    subdivision: 'Inglaterra, Escócia, País de Gales e Irlanda do Norte',
    subdivisionPt: 'Reino Unido e Ilhas Britânicas',
    region: 'Europe',
    regionPt: 'Europa',
    code: 'GMT / BST',
    baseOffset: 0, // UTC+0
    referenceCoords: { latitude: 51.4826, longitude: 0.0077, cityName: 'Greenwich / Londres, Reino Unido' },
    policyHistory: 'Ponto de origem do Meridiano de Greenwich. O British Summer Time (BST, UTC+1) é regido pelo Summer Time Act de 1972 (último domingo de março a último domingo de outubro).',
    policyHistoryEn: 'Historical anchor of GMT. BST (UTC+1) operates from last Sunday in March to last Sunday in October.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-uk-rule-1',
        startRule: 'Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '01:00',
        endTime: '02:00',
        vigencia: 'British Summer Time Act 1972',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para BST (British Summer Time, UTC+1)'
      }
    ]
  },
  {
    id: 'noaa-eg-cairo',
    name: 'NOAA Egito - Cairo Time (EET / EEST: Cairo / UTC+2 e UTC+3)',
    nameEn: 'NOAA Egypt - Cairo Time (EET / EEST: Cairo / UTC+2 & UTC+3)',
    country: 'Egito',
    countryCode: 'EG',
    countryFlag: '🇪🇬',
    subdivision: 'República Árabe do Egito',
    subdivisionPt: 'Todo o território egípcio',
    region: 'Africa',
    regionPt: 'África',
    code: 'EET / EEST',
    baseOffset: 120, // UTC+2
    referenceCoords: { latitude: 30.0444, longitude: 31.2357, cityName: 'Cairo, Egito' },
    policyHistory: 'Em abril de 2023, pela Lei nº 24/2023, o governo restabeleceu o horário de verão: última sexta-feira de abril à 00:00 até a última quinta-feira de outubro às 24:00.',
    policyHistoryEn: 'In April 2023, Law 24/2023 reinstated DST: last Friday in April to last Thursday in October.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-eg-rule-1',
        startRule: 'Última Sexta-feira De Abril',
        endRule: 'Última Quinta-feira De Outubro',
        shift: 60,
        startTime: '00:00',
        endTime: '24:00',
        vigencia: 'Lei Governamental nº 24/2023 (Egito)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Adiantamento para EEST (UTC+3)'
      }
    ]
  },
  {
    id: 'noaa-za-johannesburg',
    name: 'NOAA África do Sul - SAST (Joanesburgo, Cidade do Cabo / UTC+2 Permanente)',
    nameEn: 'NOAA South Africa - SAST (Johannesburg, Cape Town / Permanent UTC+2)',
    country: 'África do Sul',
    countryCode: 'ZA',
    countryFlag: '🇿🇦',
    subdivision: 'República da África do Sul',
    subdivisionPt: 'África do Sul, Namíbia, Botsuana',
    region: 'Africa',
    regionPt: 'África',
    code: 'SAST',
    baseOffset: 120, // UTC+2
    referenceCoords: { latitude: -26.2041, longitude: 28.0473, cityName: 'Joanesburgo, África do Sul' },
    policyHistory: 'Fuso oficial instituído em 1903. Não utiliza horário de verão desde a Segunda Guerra Mundial.',
    policyHistoryEn: 'Established in 1903. South Africa does not observe DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-jp-tokyo',
    name: 'NOAA Japão - Japan Standard Time (JST: Tóquio, Quioto, Osaka / UTC+9)',
    nameEn: 'NOAA Japan - Japan Standard Time (JST: Tokyo, Kyoto, Osaka / UTC+9)',
    country: 'Japão',
    countryCode: 'JP',
    countryFlag: '🇯🇵',
    subdivision: 'Arquipélago Japonês',
    subdivisionPt: 'Todo o território japonês',
    region: 'Asia',
    regionPt: 'Ásia',
    code: 'JST',
    baseOffset: 540, // UTC+9
    referenceCoords: { latitude: 35.6762, longitude: 139.6503, cityName: 'Tóquio, Japão' },
    policyHistory: 'Decreto Imperial nº 51 de 1886 com base no meridiano de 135°E em Akashi. O Japão não adota horário de verão desde 1952.',
    policyHistoryEn: 'Established in 1886 at 135°E meridian. Japan does not observe DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-in-ist',
    name: 'NOAA Índia - Indian Standard Time (IST: Nova Délhi, Mumbai / UTC+5:30)',
    nameEn: 'NOAA India - Indian Standard Time (IST: New Delhi, Mumbai / UTC+5:30)',
    country: 'Índia',
    countryCode: 'IN',
    countryFlag: '🇮🇳',
    subdivision: 'República da Índia',
    subdivisionPt: 'Subcontinente Indiano',
    region: 'Asia',
    regionPt: 'Ásia',
    code: 'IST',
    baseOffset: 330, // UTC+5:30
    referenceCoords: { latitude: 28.6139, longitude: 77.2090, cityName: 'Nova Délhi, Índia' },
    policyHistory: 'Fuso de meia-hora oficializado em 1906, calculado pelo meridiano 82.5°E no Observatório de Mirzapur. Não adota horário de verão.',
    policyHistoryEn: 'Standardized in 1906 based on 82.5°E meridian at Mirzapur. India does not observe DST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-np-nepal',
    name: 'NOAA Nepal - Nepal Time (NPT: Catmandu / UTC+5:45)',
    nameEn: 'NOAA Nepal - Nepal Time (NPT: Kathmandu / UTC+5:45)',
    country: 'Nepal',
    countryCode: 'NP',
    countryFlag: '🇳🇵',
    subdivision: 'Himalaia',
    subdivisionPt: 'Todo o território nepalês',
    region: 'Asia',
    regionPt: 'Ásia',
    code: 'NPT',
    baseOffset: 345, // UTC+5:45
    referenceCoords: { latitude: 27.7172, longitude: 85.3240, cityName: 'Catmandu, Nepal' },
    policyHistory: 'Instituído em 1986 para alinhar o horário civil com o tempo solar médio do meridiano do Monte Gauri Sankar (86°15\'E). É um dos únicos fusos no mundo com fração de 45 minutos.',
    policyHistoryEn: 'Established in 1986 to approximate solar time of Mt. Gauri Sankar (86°15\'E). Rare 45-minute fraction.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-il-jerusalem',
    name: 'NOAA Israel - Israel Standard Time (IST / IDT: Jerusalém, Tel Aviv / UTC+2 e UTC+3)',
    nameEn: 'NOAA Israel - Israel Standard Time (IST / IDT / UTC+2 & UTC+3)',
    country: 'Israel',
    countryCode: 'IL',
    countryFlag: '🇮🇱',
    subdivision: 'Estado de Israel',
    subdivisionPt: 'Todo o território de Israel',
    region: 'Asia',
    regionPt: 'Oriente Médio',
    code: 'IST / IDT',
    baseOffset: 120, // UTC+2
    referenceCoords: { latitude: 31.7683, longitude: 35.2137, cityName: 'Jerusalém, Israel' },
    policyHistory: 'Regido pela Lei do Horário aprovada pelo Knesset em 2013: o horário de verão entra em vigor na sexta-feira anterior ao último domingo de março e termina no último domingo de outubro.',
    policyHistoryEn: 'Governed by the 2013 Knesset Time Law: DST runs from the Friday before the last Sunday of March to the last Sunday of October.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-il-rule-1',
        startRule: 'Sexta-feira Antes Do Último Domingo De Março',
        endRule: 'Último Domingo De Outubro',
        shift: 60,
        startTime: '02:00',
        endTime: '02:00',
        vigencia: 'Knesset Time Law 2013 (Israel)',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para IDT (Israel Daylight Time, UTC+3)'
      }
    ]
  },
  {
    id: 'noaa-cn-beijing',
    name: 'NOAA China - China Standard Time (CST: Pequim, Xangai / UTC+8)',
    nameEn: 'NOAA China - China Standard Time (CST: Beijing, Shanghai / UTC+8)',
    country: 'China',
    countryCode: 'CN',
    countryFlag: '🇨🇳',
    subdivision: 'República Popular da China',
    subdivisionPt: 'Todo o território chinês',
    region: 'Asia',
    regionPt: 'Ásia',
    code: 'CST',
    baseOffset: 480, // UTC+8
    referenceCoords: { latitude: 39.9042, longitude: 116.4074, cityName: 'Pequim, China' },
    policyHistory: 'Todo o território chinês opera oficialmente sob o fuso unificado de Pequim (UTC+8) desde 1949. Na província ocidental de Xinjiang, a população local observa extraoficialmente o Horário de Urumqi (UTC+6, shift de -120m).',
    policyHistoryEn: 'Covers entire China under single unified CST (UTC+8) since 1949. In Xinjiang, locals maintain Urumqi Time (UTC+6).',
    dstInfo: { hasDst: false },
    seasonalPeriods: [
      {
        id: 'noaa-cn-urumqi-rule',
        startRule: '01/01',
        endRule: '31/12',
        shift: -120,
        startTime: '00:00',
        endTime: '24:00',
        vigencia: 'Urumqi Local Time (Xinjiang)',
        validityType: 'single',
        enabled: false,
        isPermanent: true,
        description: 'Deslocamento regional de -120m para o horário solar de Xinjiang'
      }
    ]
  },
  {
    id: 'noaa-nz-auckland',
    name: 'NOAA Nova Zelândia - NZST & NZDT (Auckland, Wellington / UTC+12 e UTC+13)',
    nameEn: 'NOAA New Zealand - NZST & NZDT (Auckland, Wellington / UTC+12 & UTC+13)',
    country: 'Nova Zelândia',
    countryCode: 'NZ',
    countryFlag: '🇳🇿',
    subdivision: 'Ilha Norte e Ilha Sul',
    subdivisionPt: 'Nova Zelândia Continental',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'NZST / NZDT',
    baseOffset: 720, // UTC+12
    referenceCoords: { latitude: -36.8485, longitude: 174.7633, cityName: 'Auckland, Nova Zelândia' },
    policyHistory: 'New Zealand Daylight Time Order 2007: o horário de verão entra em vigor às 02:00 do último domingo de setembro e encerra às 03:00 do primeiro domingo de abril (+60m para UTC+13).',
    policyHistoryEn: 'NZ Daylight Time Order 2007: DST runs from last Sunday in September to first Sunday in April (+60m to UTC+13).',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-nz-rule-1',
        startRule: 'Último Domingo De Setembro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'New Zealand Daylight Time Order 2007',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação para NZDT (UTC+13)'
      }
    ]
  },
  {
    id: 'noaa-nz-chatham',
    name: 'NOAA Nova Zelândia - Chatham Islands (CHAST / CHADT, UTC+12:45)',
    nameEn: 'NOAA New Zealand - Chatham Islands (CHAST / CHADT, UTC+12:45)',
    country: 'Nova Zelândia',
    countryCode: 'NZ',
    countryFlag: '🇳🇿',
    subdivision: 'Ilhas Chatham',
    subdivisionPt: 'Arquipélago de Chatham',
    region: 'Oceania',
    regionPt: 'Oceania',
    code: 'CHAST / CHADT',
    baseOffset: 765, // UTC+12:45
    referenceCoords: { latitude: -43.9536, longitude: -176.5415, cityName: 'Ilhas Chatham, Nova Zelândia' },
    policyHistory: 'As Ilhas Chatham mantêm 45 minutos à frente do fuso neozelandês continental. Durante o horário de verão mudam para UTC+13:45, estando entre as primeiras terras povoadas a ver o nascer do sol de cada dia.',
    policyHistoryEn: 'Chatham Islands maintain a 45-minute offset ahead of mainland NZ, shifting to UTC+13:45 in summer.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-chatham-rule-1',
        startRule: 'Último Domingo De Setembro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 60,
        startTime: '02:45',
        endTime: '03:45',
        vigencia: 'Chatham Islands Time Order',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Deslocamento sazonal para UTC+13:45'
      }
    ]
  },
  {
    id: 'noaa-utc-zero',
    name: 'NOAA Tempo Universal Coordenado / Meridiano Zero (UTC)',
    nameEn: 'NOAA Coordinated Universal Time / Zero Meridian (UTC)',
    country: 'Universal',
    countryCode: 'UN',
    countryFlag: '🌐',
    subdivision: 'Padrão Internacional BIPM / NIST / NOAA',
    subdivisionPt: 'Padrão Mundial',
    region: 'Polar & Atlantic',
    regionPt: 'Universal',
    code: 'UTC',
    baseOffset: 0,
    referenceCoords: { latitude: 51.4769, longitude: 0.0000, cityName: 'Meridiano Zero de Greenwich' },
    policyHistory: 'O padrão internacional de tempo atômico e astronômico coordenado pelo Bureau International des Poids et Mesures (BIPM) e NOAA. Não possui variações sazonais civis.',
    policyHistoryEn: 'Coordinated Universal Time (UTC), the global atomic standard referenced by NOAA, BIPM, and NIST.',
    dstInfo: { hasDst: false },
    seasonalPeriods: []
  },
  {
    id: 'noaa-aq-mcmurdo',
    name: 'NOAA Antártida - Estação McMurdo & Polo Sul (NZST / NZDT: UTC+12 e UTC+13)',
    nameEn: 'NOAA Antarctica - McMurdo & South Pole Station (NZST / NZDT)',
    country: 'Antártida',
    countryCode: 'AQ',
    countryFlag: '🇦🇶',
    subdivision: 'Polo Sul Geográfico e Estação McMurdo',
    subdivisionPt: 'Bases Científicas Polares',
    region: 'Polar & Atlantic',
    regionPt: 'Antártida',
    code: 'NZST / NZDT',
    baseOffset: 720, // UTC+12
    referenceCoords: { latitude: -77.8419, longitude: 166.6863, cityName: 'Estação McMurdo, Antártida' },
    policyHistory: 'A Estação McMurdo e a Estação Polo Sul Amundsen-Scott adotam o horário da Nova Zelândia (NZST/NZDT) com horário de verão neozelandês devido à ponte aérea logística sediada em Christchurch.',
    policyHistoryEn: 'McMurdo and South Pole Station observe New Zealand time including DST, coordinating with airlifts from Christchurch.',
    dstInfo: { hasDst: true, shift: 60 },
    seasonalPeriods: [
      {
        id: 'noaa-mcmurdo-rule-1',
        startRule: 'Último Domingo De Setembro',
        endRule: 'Primeiro Domingo De Abril',
        shift: 60,
        startTime: '02:00',
        endTime: '03:00',
        vigencia: 'US Antarctic Program / NZDT Logística',
        validityType: 'single',
        enabled: true,
        isPermanent: false,
        description: 'Variação alinhada à logística neozelandesa'
      }
    ]
  }
];

export function formatOffsetMinutes(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = Math.floor(abs % 60);
  const seconds = Math.round((abs - Math.floor(abs)) * 60);
  
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  
  if (seconds > 0) {
    const sStr = seconds.toString().padStart(2, '0');
    return `UTC${sign}${hStr}:${mStr}:${sStr}`;
  }
  return `UTC${sign}${hStr}:${mStr}`;
}

export function searchNoaaTimezones(query: string, regionFilter?: string, countryFilter?: string): NoaaTimezoneSystem[] {
  let list = NOAA_TIMEZONE_SYSTEMS.map(s => {
    if (s.id === 'noaa-ma-casablanca') {
      const nowOffset = getMoroccoTimezoneOffset(Date.now());
      return {
        ...s,
        baseOffset: nowOffset,
        code: nowOffset === 60 ? 'WEST (UTC+1) ➔ WET (UTC+0)' : 'WET / UTC+0'
      };
    }
    return s;
  });

  if (countryFilter && countryFilter !== 'all') {
    list = list.filter(s => s.countryCode === countryFilter);
  } else if (regionFilter && regionFilter !== 'all') {
    list = list.filter(s => s.region === regionFilter);
  }

  if (!query || !query.trim()) return list;
  
  const q = query.toLowerCase().trim();
  return list.filter(s => 
    s.name.toLowerCase().includes(q) ||
    s.nameEn.toLowerCase().includes(q) ||
    s.code.toLowerCase().includes(q) ||
    (s.country && s.country.toLowerCase().includes(q)) ||
    (s.subdivision && s.subdivision.toLowerCase().includes(q)) ||
    (s.subdivisionPt && s.subdivisionPt.toLowerCase().includes(q)) ||
    s.referenceCoords.cityName.toLowerCase().includes(q) ||
    s.regionPt.toLowerCase().includes(q) ||
    s.policyHistory.toLowerCase().includes(q)
  );
}

export function getNoaaTimezoneById(id: string): NoaaTimezoneSystem | undefined {
  const sys = NOAA_TIMEZONE_SYSTEMS.find(s => s.id === id);
  if (sys && sys.id === 'noaa-ma-casablanca') {
    const nowOffset = getMoroccoTimezoneOffset(Date.now());
    return {
      ...sys,
      baseOffset: nowOffset,
      code: nowOffset === 60 ? 'WEST (UTC+1) ➔ WET (UTC+0)' : 'WET / UTC+0'
    };
  }
  return sys;
}
