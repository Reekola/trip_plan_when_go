import { geocode, midpoint, routeWaypoints } from '@/lib/data/geocode';
import { fetchWeather } from '@/lib/data/fetchWeather';
import { fetchDaylight } from '@/lib/data/fetchDaylight';
import { fetchTraffic } from '@/lib/data/fetchTraffic';
import { fetchElevation } from '@/lib/data/fetchElevation';
import { getUserContext } from './getUserContext';
import { rankDepartures } from './rankDepartures';
import { searchPOIs } from './searchPOIs';
import { queryEvents } from './queryEvents';
import { selectStops } from './selectStops';
import { composePlan } from './composePlan';
import { saveTrip } from './saveTrip';
import type { TripPlan, TripRequest } from '@/lib/types';

export async function planTrip(req: TripRequest): Promise<TripPlan> {
  const { origin, destination, date, mode, userId = 'demo-user' } = req;
  const tripDate = date ?? new Date().toISOString().split('T')[0];

  // 1. User context first — personalisation flows through everything
  const userContext = await getUserContext(userId);

  // 2. Geocode endpoints
  const [originGeo, destGeo] = await Promise.all([geocode(origin), geocode(destination)]);
  const mid = midpoint(originGeo, destGeo);

  // 3. Parallel data fetches based on mode
  const isMotorised = mode === 'car' || mode === 'motorcycle';

  const [weather, daylight, trafficData, elevationData] = await Promise.all([
    fetchWeather(mid.lat, mid.lng, tripDate),
    fetchDaylight(mid.lat, mid.lng, tripDate),
    isMotorised
      ? fetchTraffic(origin, destination).catch(() => null)
      : Promise.resolve(null),
    !isMotorised
      ? fetchElevation(routeWaypoints(originGeo, destGeo, 8)).catch(() => null)
      : Promise.resolve(null),
  ]);

  // 4. Rank departure windows
  const windows = rankDepartures(weather, daylight, trafficData, elevationData, mode);
  const bestWindow = windows.find((w) => w.recommended) ?? windows[0];

  // 5. POIs + events in parallel
  const modePrefs = userContext.modes[mode];
  const stopQuery = modePrefs?.stopTypes?.join(' ') ?? 'cafe viewpoint rest';
  const [pois, events] = await Promise.all([
    searchPOIs(stopQuery, mode, mid.lat, mid.lng).catch(() => []),
    queryEvents(tripDate, destGeo.lat, destGeo.lng).catch(() => []),
  ]);

  // 6. Select + explain stops
  const stops = selectStops(pois, mode, userContext);

  // 7. Compose plan narrative via Gemini
  const { narrative, departureReason } = await composePlan({
    origin,
    destination,
    date: tripDate,
    mode,
    bestWindow,
    stops,
    daylight,
    preferences: userContext,
    events: events.map((e) => ({ name: e.name, type: e.type })),
  });

  // 8. Assemble plan
  const plan: TripPlan = {
    origin,
    destination,
    date: tripDate,
    mode,
    recommendedDeparture: bestWindow.time,
    departureReason,
    departureWindows: windows,
    stops,
    narrative,
    duration: trafficData?.durationInTraffic ?? estimateDuration(originGeo, destGeo, mode),
    distance: trafficData?.distance ?? estimateDistance(originGeo, destGeo),
  };

  // 9. Save to Elastic
  try {
    const id = await saveTrip(plan, userId);
    plan.id = id;
  } catch {
    // non-fatal — return the plan even if save fails
  }

  return plan;
}

function estimateDuration(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  mode: string
): number {
  const dist = estimateDistance(a, b);
  const speeds: Record<string, number> = { car: 80, motorcycle: 90, bicycle: 20, walk: 5 };
  const kmh = speeds[mode] ?? 60;
  return Math.round((dist / 1000 / kmh) * 3600);
}

function estimateDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
