import { planTrip } from './planTrip';
import { composePlan } from './composePlan';
import type { TripPlan, TripRequest, TravelMode } from '@/lib/types';

const COMPARE_MODES: TravelMode[] = ['car'];

export async function compareOptions(req: TripRequest): Promise<TripPlan> {
  // Run all modes in parallel
  const plans = await Promise.allSettled(
    COMPARE_MODES.map((m) => planTrip({ ...req, mode: m }))
  );

  const results: TripPlan[] = plans
    .filter((r): r is PromiseFulfilledResult<TripPlan> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (!results.length) throw new Error('All mode plans failed');

  // Pick the best overall plan (highest recommended departure score)
  const best = results.reduce((a, b) => {
    const scoreA = a.departureWindows.find((w) => w.recommended)?.score ?? 0;
    const scoreB = b.departureWindows.find((w) => w.recommended)?.score ?? 0;
    return scoreB > scoreA ? b : a;
  });

  // Compose a comparison narrative via Gemini
  const bestWindow = best.departureWindows.find((w) => w.recommended) ?? best.departureWindows[0];
  const compareSummary = results
    .map((p) => {
      const w = p.departureWindows.find((w) => w.recommended);
      return `${p.mode}: depart ${w?.time ?? '?'}, score ${w?.score ?? 0}/100`;
    })
    .join('; ');

  const { narrative, departureReason } = await composePlan({
    origin: best.origin,
    destination: best.destination,
    date: best.date,
    mode: best.mode,
    bestWindow,
    stops: best.stops,
    daylight: { sunrise: '', sunset: '', date: best.date },
    events: [{ name: `Mode comparison: ${compareSummary}`, type: 'comparison' }],
  });

  return { ...best, narrative, departureReason };
}
