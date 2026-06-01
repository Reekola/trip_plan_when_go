import { getElasticClient, INDEXES } from '@/lib/elastic';
import type { POI, TravelMode } from '@/lib/types';

export async function searchPOIs(
  query: string,
  mode: TravelMode,
  lat: number,
  lon: number,
  radiusKm = 10,
  size = 5
): Promise<POI[]> {
  const client = getElasticClient();

  const res = await client.search({
    index: INDEXES.POIS,
    size,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query,
              fields: ['name^2', 'description', 'type'],
            },
          },
        ],
        filter: [
          { term: { modes: mode } },
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
    .map((h) => ({ ...(h._source as Omit<POI, 'id'>), id: h._id }));
}
