import type { WeatherData } from '@/lib/types';

function weatherFallback(date: string): WeatherData {
  const hours = Array.from({ length: 24 }, (_, i) => `${date}T${i.toString().padStart(2, '0')}:00`);
  return {
    hourly: {
      time: hours,
      temperature_2m: Array(24).fill(18) as number[],
      wind_speed_10m: Array(24).fill(10) as number[],
      precipitation: Array(24).fill(0) as number[],
      weather_code: Array(24).fill(1) as number[],
    },
  };
}

export async function fetchWeather(lat: number, lon: number, date: string): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('hourly', 'temperature_2m,wind_speed_10m,precipitation,weather_code');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'auto');

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.error(`Open-Meteo forecast error ${res.status} for ${lat},${lon} on ${date}`);
      return weatherFallback(date);
    }
    return res.json() as Promise<WeatherData>;
  } catch (err) {
    console.error('fetchWeather failed:', err instanceof Error ? err.message : err);
    return weatherFallback(date);
  }
}
