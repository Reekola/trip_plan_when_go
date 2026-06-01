import { getElasticClient, INDEXES } from '@/lib/elastic';
import { getUserContext } from './getUserContext';
import { savePreference } from './savePreference';

export async function rateTrip(tripId: string, rating: number, userId: string): Promise<void> {
  const client = getElasticClient();

  // Save rating on the trip document
  await client.update({
    index: INDEXES.TRIPS,
    id: tripId,
    doc: { rating, ratedAt: new Date().toISOString() },
  });

  // Load trip to learn from it
  const tripRes = await client.get({ index: INDEXES.TRIPS, id: tripId });
  const trip = tripRes._source as { mode: string; stops: unknown[]; recommendedDeparture: string; date: string } | undefined;
  if (!trip) return;

  // Load existing preferences and augment learned patterns
  const prefs = await getUserContext(userId);
  const patterns = prefs.learnedPatterns ?? [];
  const tripCount = (prefs.tripCount ?? 0) + 1;

  if (rating >= 4) {
    patterns.push(`Enjoyed ${trip.mode} trip on ${trip.date} — departure at ${trip.recommendedDeparture}`);
  } else if (rating <= 2) {
    patterns.push(`Rated ${trip.mode} trip on ${trip.date} poorly (${rating}/5)`);
  }

  // Keep only the 20 most recent patterns
  const recentPatterns = patterns.slice(-20);

  await savePreference(userId, { ...prefs, learnedPatterns: recentPatterns, tripCount });
}
