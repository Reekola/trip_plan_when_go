import { geocode, midpoint, reverseGeocodeCountry } from '@/lib/data/geocode';
import { fetchWeather } from '@/lib/data/fetchWeather';
import { fetchDaylight } from '@/lib/data/fetchDaylight';
import { fetchTraffic } from '@/lib/data/fetchTraffic';
import { fetchHoliday } from '@/lib/data/fetchHolidays';
import { getUserContext } from './getUserContext';
import { rankDepartures } from './rankDepartures';
import { searchPOIs } from './searchPOIs';
import { queryEvents } from './queryEvents';
import { selectStops } from './selectStops';
import { composePlan } from './composePlan';
import { saveTrip } from './saveTrip';
import type { TripPlan, TripRequest } from '@/lib/types';

export async function planTrip(req: TripRequest): Promise<TripPlan> {
  const { origin, destination, date, mode, userId = 'demo-user', timeFrom, timeTo, clientHour } = req;
  const tripDate = date ?? new Date().toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const pastCutoff = tripDate === today && clientHour != null ? clientHour + 1 : 5;
  const fromHour = Math.max(timeFrom ?? 5, pastCutoff);
  const toHour = timeTo ?? 21;

  // 1. User context first — personalisation flows through everything
  const userContext = await getUserContext(userId);

  // 2. Geocode endpoints
  const [originGeo, destGeo] = await Promise.all([geocode(origin), geocode(destination)]);
  const mid = midpoint(originGeo, destGeo);

  // 3. Parallel data fetches — only fetch traffic for hours in the requested window
  const HOURS = Array.from({ length: toHour - fromHour + 1 }, (_, i) => i + fromHour);
  const [weather, daylight, ...trafficResults] = await Promise.all([
    fetchWeather(mid.lat, mid.lng, tripDate),
    fetchDaylight(mid.lat, mid.lng, tripDate),
    ...HOURS.map((h) =>
      fetchTraffic(origin, destination, `${tripDate}T${h.toString().padStart(2, '0')}:00:00Z`)
        .catch(() => null)
    ),
  ]);

  const trafficByHour = new Map(
    HOURS.map((h, i) => [h, trafficResults[i]] as const).filter(([, v]) => v !== null)
  ) as Map<number, Awaited<ReturnType<typeof fetchTraffic>>>;

  const waypointCountryCodes = await Promise.all(
    Array.from({ length: 19 }, (_, i) => (i + 1) * 0.05).map((t) =>
      reverseGeocodeCountry(
        originGeo.lat + (destGeo.lat - originGeo.lat) * t,
        originGeo.lng + (destGeo.lng - originGeo.lng) * t
      ).catch(() => undefined)
    )
  );
  const countryCodes = [...new Set(
    [originGeo.countryCode, ...waypointCountryCodes, destGeo.countryCode].filter(Boolean)
  )] as string[];
  const holidayResults = await Promise.all(
    countryCodes.map((cc) => fetchHoliday(tripDate, cc).catch(() => null))
  );
  // Pick the most impactful holiday: today > eve > eve2 > return
  const holiday = holidayResults
    .filter(Boolean)
    .sort((a, b) => {
      const rank = (h: typeof a) => !h ? 99 : !h.isEve && !h.isEve2 && !h.isReturn ? 0 : h.isEve ? 1 : h.isReturn ? 2 : 3;
      return rank(a) - rank(b);
    })[0] ?? null;

  // 4. Rank departure windows
  const windows = rankDepartures(weather, daylight, trafficByHour, holiday, mode, fromHour, toHour);
  const bestWindow = windows.find((w) => w.recommended) ?? windows[0];

  // 5. POIs + events in parallel
  const modePrefs = userContext.modes[mode];
  const stopQuery = modePrefs?.stopTypes?.join(' ') || 'cafe viewpoint rest';
  const [pois, events] = await Promise.all([
    searchPOIs(stopQuery, mode, mid.lat, mid.lng, 40).catch(() => []),
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
    holiday,
  });

  // 8. Traffic indicator — reuse already-fetched trafficByHour, no extra call needed
  let liveTraffic: import('@/lib/types').LiveTraffic | undefined;
  const isToday = tripDate === today;
  const recHour = parseInt(bestWindow.time.split(':')[0], 10);
  // For today use the first (nearest) available hour; for future use recommended hour with fallback
  const indicatorHour = isToday
    ? (HOURS.find((h) => trafficByHour.has(h)) ?? recHour)
    : (trafficByHour.has(recHour) ? recHour : HOURS.find((h) => trafficByHour.has(h)));
  const indicatorTraffic = indicatorHour != null ? trafficByHour.get(indicatorHour) : undefined;

  if (indicatorTraffic && indicatorHour != null) {
    const delayS = Math.max(0, indicatorTraffic.durationInTraffic - indicatorTraffic.duration);
    liveTraffic = {
      delayMinutes: Math.round(delayS / 60),
      forHour: `${indicatorHour.toString().padStart(2, '0')}:00`,
      isLive: isToday,
    };
  }

  // 9. Assemble plan
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
    duration: (trafficByHour.get(9) ?? trafficByHour.get(HOURS[0]))?.durationInTraffic ?? estimateDuration(originGeo, destGeo, mode),
    distance: (trafficByHour.get(9) ?? trafficByHour.get(HOURS[0]))?.distance ?? estimateDistance(originGeo, destGeo),
    liveTraffic,
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
