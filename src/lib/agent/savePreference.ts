import { getElasticClient, INDEXES } from '@/lib/elastic';
import type { UserPreferences } from '@/lib/types';

export async function savePreference(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
  const client = getElasticClient();
  await client.index({
    index: INDEXES.USERS,
    id: userId,
    document: { ...preferences, userId, updatedAt: new Date().toISOString() },
  });
}
