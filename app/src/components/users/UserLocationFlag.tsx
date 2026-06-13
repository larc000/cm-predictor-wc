import Image from 'next/image';

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
  const normalizedLocation = String(timezone || '').trim().toLowerCase();

  if (
    normalizedLocation === 'america/costa_rica' ||
    normalizedLocation === 'costa rica' ||
    normalizedLocation === 'cr'
  ) {
    return {
      src: '/cr.png',
      alt: 'Costa Rica'
    };
  }

  if (
    normalizedLocation === 'america/bogota' ||
    normalizedLocation === 'colombia' ||
    normalizedLocation === 'co'
  ) {
    return {
      src: '/co.png',
      alt: 'Colombia'
    };
  }

  return null;
}
