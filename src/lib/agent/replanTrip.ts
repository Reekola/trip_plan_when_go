import { planTrip } from './planTrip';
import type { TripPlan, TripRequest } from '@/lib/types';

export async function replanTrip(
  existingPlan: TripPlan,
  adjustment: string,
  userId: string
): Promise<TripPlan> {
  // Re-run planTrip with the same parameters; adjustment is noted in preferences
  // TODO: pass adjustment context to composePlan for personalised narrative
  return planTrip({
    origin: existingPlan.origin,
    destination: existingPlan.destination,
    date: existingPlan.date,
    mode: existingPlan.mode,
    userId,
  } satisfies TripRequest);
}
