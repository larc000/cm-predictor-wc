export const COUNTRY_CODES: Record<string, string> = {
  'Alemania': 'de',
  'Arabia Saudita': 'sa',
  'Argelia': 'dz',
  'Argentina': 'ar',
  'Australia': 'au',
  'Austria': 'at',
  'Bélgica': 'be',
  'Bosnia y Herzegovina': 'ba',
  'Brasil': 'br',
  'Cabo Verde': 'cv',
  'Canadá': 'ca',
  'Catar': 'qa',
  'Chequia': 'cz',
  'Colombia': 'co',
  'Corea del Sur': 'kr',
  'Costa de Marfil': 'ci',
  'Croacia': 'hr',
  'Curazao': 'cw',
  'Ecuador': 'ec',
  'Egipto': 'eg',
  'Escocia': 'gb-sct',
  'España': 'es',
  'Estados Unidos': 'us',
  'Francia': 'fr',
  'Ghana': 'gh',
  'Haití': 'ht',
  'Inglaterra': 'gb-eng',
  'Irak': 'iq',
  'Irán': 'ir',
  'Japón': 'jp',
  'Jordania': 'jo',
  'Marruecos': 'ma',
  'México': 'mx',
  'Noruega': 'no',
  'Nueva Zelanda': 'nz',
  'Países Bajos': 'nl',
  'Panamá': 'pa',
  'Paraguay': 'py',
  'Portugal': 'pt',
  'República Democrática del Congo': 'cd',
  'Senegal': 'sn',
  'Sudáfrica': 'za',
  'Suecia': 'se',
  'Suiza': 'ch',
  'Túnez': 'tn',
  'Turquía': 'tr',
  'Uruguay': 'uy',
  'Uzbekistán': 'uz',
};

export function getFlagUrl(country: string) {
  const code = COUNTRY_CODES[country];

  if (!code) {
    return '/images/unknown-flag.svg';
  }

  return `https://flagcdn.com/w40/${code}.png`;
}