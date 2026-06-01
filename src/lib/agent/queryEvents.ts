import { getElasticClient, INDEXES } from '@/lib/elastic';
import type { TripEvent } from '@/lib/types';

export async function queryEvents(date: string, lat: number, lon: number, radiusKm = 30): Promise<TripEvent[]> {
  const client = getElasticClient();

  const res = await client.search({
    index: INDEXES.EVENTS,
    size: 5,
    query: {
      bool: {
        filter: [
          { range: { date: { gte: date, lte: date } } },
          {
            geo_distance: {
              distance: `${radiusKm}km`,
              location: { lat, lon },
            },
          },
        ],
      },
    },
  });

  return res.hits.hits
    .filter((h): h is typeof h & { _id: string } => h._id !== undefined)
    .map((h) => ({ ...(h._source as Omit<TripEvent, 'id'>), id: h._id }));
}
