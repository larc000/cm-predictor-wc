import Image from 'next/image';
import { getSupportedTimezone } from '@/lib/timezones';

type UserLocationFlagProps = {
  timezone?: string | null;
};

export function UserLocationFlag({ timezone }: UserLocationFlagProps) {
  const locationFlag = getLocationFlag(timezone);

  if (!locationFlag) {
    return null;
  }

  return (
    <Image
      className="ranking-location-flag"
      src={locationFlag.src}
      alt={locationFlag.alt}
      width={22}
      height={15}
    />
  );
}

function getLocationFlag(timezone?: string | null) {
  const supportedTimezone = getSupportedTimezone(timezone);

  return supportedTimezone
    ? {
        src: supportedTimezone.flagSrc,
        alt: supportedTimezone.region
      }
    : null;
}
