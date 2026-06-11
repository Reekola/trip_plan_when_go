import type { DaylightData } from '@/lib/types';

export async function fetchDaylight(lat: number, lon: number, date: string): Promise<DaylightData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('timezone', 'auto');

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.error(`Open-Meteo astronomy error ${res.status} for ${lat},${lon} on ${date}`);
      return { sunrise: `${date}T06:00:00`, sunset: `${date}T20:00:00`, date };
    }
    const data = await res.json();
    return {
      sunrise: data.daily.sunrise[0] as string,
      sunset: data.daily.sunset[0] as string,
      date,
    };
  } catch (err) {
    console.error('fetchDaylight failed:', err instanceof Error ? err.message : err);
    return { sunrise: `${date}T06:00:00`, sunset: `${date}T20:00:00`, date };
  }
}
