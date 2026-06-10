import { getElasticClient, INDEXES } from '@/lib/elastic';
import { mcpSearch, isMCPConfigured } from './elasticMCP';
import type { TripEvent } from '@/lib/types';
type SearchHit = { _id?: string; _source?: unknown };

export async function queryEvents(date: string, lat: number, lon: number, radiusKm = 30): Promise<TripEvent[]> {
  const esQuery = {
    bool: {
      filter: [
        { range: { date: { gte: date, lte: date } } },
        { geo_distance: { distance: `${radiusKm}km`, location: { lat, lon } } },
      ],
    },
  };

  let hits: SearchHit[];

  if (isMCPConfigured()) {
    hits = await mcpSearch(INDEXES.EVENTS, { size: 5, query: esQuery });
  } else {
    const client = getElasticClient();
    const res = await client.search({ index: INDEXES.EVENTS, size: 5, query: esQuery });
    hits = res.hits.hits;
  }

  return hits
    .filter((h): h is typeof h & { _id: string } => h._id !== undefined)
    .map((h) => ({ ...(h._source as Omit<TripEvent, 'id'>), id: h._id }));
}
