import { getElasticClient, INDEXES } from '@/lib/elastic';
import { fetchWeather } from '@/lib/data/fetchWeather';
import { fetchDaylight } from '@/lib/data/fetchDaylight';
import { fetchTraffic } from '@/lib/data/fetchTraffic';
import { geocode, midpoint } from '@/lib/data/geocode';
import { rankDepartures } from './rankDepartures';
import type { TripPlan } from '@/lib/types';

export async function refreshPlan(tripId: string): Promise<TripPlan> {
  const client = getElasticClient();
  const res = await client.get({ index: INDEXES.TRIPS, id: tripId });
  const plan = res._source as TripPlan;

  const [originGeo, destGeo] = await Promise.all([geocode(plan.origin), geocode(plan.destination)]);
  const mid = midpoint(originGeo, destGeo);

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 5);
  const [weather, daylight, ...trafficResults] = await Promise.all([
    fetchWeather(mid.lat, mid.lng, plan.date),
    fetchDaylight(mid.lat, mid.lng, plan.date),
    ...HOURS.map((h) =>
      fetchTraffic(plan.origin, plan.destination, `${plan.date}T${h.toString().padStart(2, '0')}:00:00Z`)
        .catch(() => null)
    ),
  ]);

  const trafficByHour = new Map(
    HOURS.map((h, i) => [h, trafficResults[i]] as const).filter(([, v]) => v !== null)
  ) as Map<number, Awaited<ReturnType<typeof fetchTraffic>>>;

  const { fetchHoliday } = await import('@/lib/data/fetchHolidays');
  const countryCodes = [...new Set([originGeo.countryCode, destGeo.countryCode].filter(Boolean))] as string[];
  const holidayResults = await Promise.all(
    countryCodes.map((cc) => fetchHoliday(plan.date, cc).catch(() => null))
  );
  const holiday = holidayResults
    .filter(Boolean)
    .sort((a, b) => {
      const rank = (h: typeof a) => !h ? 99 : !h.isEve && !h.isEve2 && !h.isReturn ? 0 : h.isEve ? 1 : h.isReturn ? 2 : 3;
      return rank(a) - rank(b);
    })[0] ?? null;
  const windows = rankDepartures(weather, daylight, trafficByHour, holiday, plan.mode);
  const best = windows.find((w) => w.recommended) ?? windows[0];

  const refreshed: TripPlan = { ...plan, departureWindows: windows, recommendedDeparture: best.time };
  await client.update({ index: INDEXES.TRIPS, id: tripId, doc: refreshed });
  return refreshed;
}
