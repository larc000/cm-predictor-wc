export const DEFAULT_USER_TIMEZONE = 'America/Costa_Rica';

export type SupportedTimezone = {
  region: string;
  timezone: string;
  currentLabel: string;
  countryCode: string;
  flagSrc: string;
};

export const SUPPORTED_USER_TIMEZONES = [
  {
    region: 'Calgary',
    timezone: 'America/Edmonton',
    currentLabel: 'MDT (UTC-6)',
    countryCode: 'ca',
    flagSrc: '/ca.svg'
  },
  {
    region: 'Chicago / Nashville',
    timezone: 'America/Chicago',
    currentLabel: 'CDT (UTC-5)',
    countryCode: 'us',
    flagSrc: '/us.svg'
  },
  {
    region: 'Cincinnati / New York',
    timezone: 'America/New_York',
    currentLabel: 'EDT (UTC-4)',
    countryCode: 'us',
    flagSrc: '/us.svg'
  },
  {
    region: 'Colombia',
    timezone: 'America/Bogota',
    currentLabel: 'COT (UTC-5)',
    countryCode: 'co',
    flagSrc: '/co.png'
  },
  {
    region: 'Costa Rica',
    timezone: 'America/Costa_Rica',
    currentLabel: 'CST (UTC-6)',
    countryCode: 'cr',
    flagSrc: '/cr.png'
  },
  {
    region: 'Cupertino / Los Angeles',
    timezone: 'America/Los_Angeles',
    currentLabel: 'PDT (UTC-7)',
    countryCode: 'us',
    flagSrc: '/us.svg'
  },
  {
    region: 'Germany',
    timezone: 'Europe/Berlin',
    currentLabel: 'CEST (UTC+2)',
    countryCode: 'de',
    flagSrc: '/de.svg'
  },
  {
    region: 'London',
    timezone: 'Europe/London',
    currentLabel: 'BST (UTC+1)',
    countryCode: 'gb-eng',
    flagSrc: '/gb-eng.svg'
  },
  {
    region: 'Toronto',
    timezone: 'America/Toronto',
    currentLabel: 'EDT (UTC-4)',
    countryCode: 'ca',
    flagSrc: '/ca.svg'
  },
  {
    region: 'Vancouver',
    timezone: 'America/Vancouver',
    currentLabel: 'PDT (UTC-7)',
    countryCode: 'ca',
    flagSrc: '/ca.svg'
  }
] as const satisfies readonly SupportedTimezone[];

const TIMEZONE_BY_VALUE = new Map(
  SUPPORTED_USER_TIMEZONES.map((item) => [item.timezone.toLowerCase(), item])
);

const TIMEZONE_BY_REGION = new Map(
  SUPPORTED_USER_TIMEZONES.flatMap((item) =>
    item.region
      .split('/')
      .map((region) => [region.trim().toLowerCase(), item] as const)
  )
);

const TIMEZONE_BY_COUNTRY = new Map(
  SUPPORTED_USER_TIMEZONES.map((item) => [item.countryCode.toLowerCase(), item])
);

const TIMEZONE_BY_ALIAS = new Map<string, SupportedTimezone | undefined>([
  ['canada', getTimezoneByCountryCode('ca')],
  ['united states', getTimezoneByCountryCode('us')],
  ['usa', getTimezoneByCountryCode('us')],
  ['us', getTimezoneByCountryCode('us')],
  ['germany', getTimezoneByCountryCode('de')],
  ['deutschland', getTimezoneByCountryCode('de')],
  ['united kingdom', getTimezoneByCountryCode('gb-eng')],
  ['uk', getTimezoneByCountryCode('gb-eng')],
  ['england', getTimezoneByCountryCode('gb-eng')]
]);

export function getSupportedTimezone(value?: string | null) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return (
    TIMEZONE_BY_VALUE.get(normalizedValue) ||
    TIMEZONE_BY_REGION.get(normalizedValue) ||
    TIMEZONE_BY_COUNTRY.get(normalizedValue) ||
    TIMEZONE_BY_ALIAS.get(normalizedValue) ||
    null
  );
}

export function normalizeUserTimezone(value?: string | null) {
  return getSupportedTimezone(value)?.timezone || DEFAULT_USER_TIMEZONE;
}

function getTimezoneByCountryCode(countryCode: string) {
  return SUPPORTED_USER_TIMEZONES.find((item) => item.countryCode === countryCode);
}
