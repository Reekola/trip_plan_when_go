import { getElasticClient, INDEXES } from '@/lib/elastic';
import type { UserPreferences } from '@/lib/types';

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId'> = {
  modes: {
    car: { preferScenic: false, avoidHills: false, stopTypes: ['cafe', 'fuel'] },
    motorcycle: { preferScenic: true, avoidHills: false, stopTypes: ['viewpoint', 'cafe'] },
    bicycle: { preferScenic: true, avoidHills: false, stopTypes: ['cafe', 'viewpoint'] },
    walk: { preferScenic: true, avoidHills: false, stopTypes: ['cafe', 'viewpoint'] },
  },
  learnedPatterns: [],
  tripCount: 0,
};

export async function getUserContext(userId: string): Promise<UserPreferences> {
  try {
    const client = getElasticClient();
    const res = await client.get({ index: INDEXES.USERS, id: userId });
    const source = res._source as UserPreferences;
    return { ...DEFAULT_PREFERENCES, ...source, userId };
  } catch (err: unknown) {
    // 404 = new user, return defaults
    if ((err as { statusCode?: number }).statusCode === 404) {
      return { userId, ...DEFAULT_PREFERENCES };
    }
    throw err;
  }
}
