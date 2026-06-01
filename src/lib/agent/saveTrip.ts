import { getElasticClient, INDEXES } from '@/lib/elastic';
import type { TripPlan } from '@/lib/types';

export async function saveTrip(plan: TripPlan, userId: string): Promise<string> {
  const client = getElasticClient();
  const doc = { ...plan, userId, createdAt: new Date().toISOString() };
  const res = await client.index({ index: INDEXES.TRIPS, document: doc });
  return res._id;
}
