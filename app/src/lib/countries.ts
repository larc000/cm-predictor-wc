export const COUNTRY_CODES: Record<string, string> = {
  'Alemania': 'de',
  'Germany': 'de',
  'Arabia Saudita': 'sa',
  'Saudi Arabia': 'sa',
  'Argelia': 'dz',
  'Algeria': 'dz',
  'Argentina': 'ar',
  'Australia': 'au',
  'Austria': 'at',
  'Bélgica': 'be',
  'Belgium': 'be',
  'Bosnia y Herzegovina': 'ba',
  'Bosnia and Herzegovina': 'ba',
  'Brasil': 'br',
  'Brazil': 'br',
  'Cabo Verde': 'cv',
  'Cape Verde': 'cv',
  'Canadá': 'ca',
  'Canada': 'ca',
  'Catar': 'qa',
  'Qatar': 'qa',
  'Chequia': 'cz',
  'Czechia': 'cz',
  'Czech Republic': 'cz',
  'Colombia': 'co',
  'Corea del Sur': 'kr',
  'South Korea': 'kr',
  'Korea Republic': 'kr',
  'Costa de Marfil': 'ci',
  'Ivory Coast': 'ci',
  "Cote d'Ivoire": 'ci',
  'Côte d’Ivoire': 'ci',
  'Croacia': 'hr',
  'Croatia': 'hr',
  'Curazao': 'cw',
  'Curacao': 'cw',
  'Curaçao': 'cw',
  'Ecuador': 'ec',
  'Egipto': 'eg',
  'Egypt': 'eg',
  'Escocia': 'gb-sct',
  'Scotland': 'gb-sct',
  'España': 'es',
  'Spain': 'es',
  'Estados Unidos': 'us',
  'United States': 'us',
  'USA': 'us',
  'Francia': 'fr',
  'France': 'fr',
  'Ghana': 'gh',
  'Haití': 'ht',
  'Haiti': 'ht',
  'Inglaterra': 'gb-eng',
  'England': 'gb-eng',
  'Irak': 'iq',
  'Iraq': 'iq',
  'Irán': 'ir',
  'Iran': 'ir',
  'Japón': 'jp',
  'Japan': 'jp',
  'Jordania': 'jo',
  'Jordan': 'jo',
  'Marruecos': 'ma',
  'Morocco': 'ma',
  'México': 'mx',
  'Mexico': 'mx',
  'Noruega': 'no',
  'Norway': 'no',
  'Nueva Zelanda': 'nz',
  'New Zealand': 'nz',
  'Países Bajos': 'nl',
  'Netherlands': 'nl',
  'Holland': 'nl',
  'Panamá': 'pa',
  'Panama': 'pa',
  'Paraguay': 'py',
  'Portugal': 'pt',
  'República Democrática del Congo': 'cd',
  'Democratic Republic of the Congo': 'cd',
  'DR Congo': 'cd',
  'Congo DR': 'cd',
  'Senegal': 'sn',
  'Sudáfrica': 'za',
  'South Africa': 'za',
  'Suecia': 'se',
  'Sweden': 'se',
  'Suiza': 'ch',
  'Switzerland': 'ch',
  'Túnez': 'tn',
  'Tunisia': 'tn',
  'Turquía': 'tr',
  'Turkey': 'tr',
  'Turkiye': 'tr',
  'Türkiye': 'tr',
  'Uruguay': 'uy',
  'Uzbekistán': 'uz',
  'Uzbekistan': 'uz',
};

export function getCountryCode(country: string) {
  const normalizedCountry = normalizeCountryName(country);
  const exactCode = COUNTRY_CODES[country];

  if (exactCode) {
    return exactCode;
  }

  return Object.entries(COUNTRY_CODES).find(
    ([countryName]) => normalizeCountryName(countryName) === normalizedCountry
  )?.[1] || '';
}

export function getFlagUrl(country: string) {
  const code = getCountryCode(country);

  if (!code) {
    return '/images/unknown-flag.svg';
  }

  return `/flags/${code}.svg`;
}

function normalizeCountryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ');
}
