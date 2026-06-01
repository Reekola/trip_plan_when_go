import type { DaylightData } from '@/lib/types';

export async function fetchDaylight(lat: number, lon: number, date: string): Promise<DaylightData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo astronomy error ${res.status}`);
  const data = await res.json();

  return {
    sunrise: data.daily.sunrise[0] as string,
    sunset: data.daily.sunset[0] as string,
    date,
  };
}
