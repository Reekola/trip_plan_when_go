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
  const isMotorised = plan.mode === 'car' || plan.mode === 'motorcycle';

  const [weather, daylight, traffic] = await Promise.all([
    fetchWeather(mid.lat, mid.lng, plan.date),
    fetchDaylight(mid.lat, mid.lng, plan.date),
    isMotorised ? fetchTraffic(plan.origin, plan.destination).catch(() => null) : Promise.resolve(null),
  ]);

  const windows = rankDepartures(weather, daylight, traffic, null, plan.mode);
  const best = windows.find((w) => w.recommended) ?? windows[0];

  const refreshed: TripPlan = { ...plan, departureWindows: windows, recommendedDeparture: best.time };
  await client.update({ index: INDEXES.TRIPS, id: tripId, doc: refreshed });
  return refreshed;
}
