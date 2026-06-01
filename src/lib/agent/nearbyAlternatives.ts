import { searchPOIs } from './searchPOIs';
import type { POI, TravelMode } from '@/lib/types';

export async function nearbyAlternatives(
  replacedType: string,
  mode: TravelMode,
  lat: number,
  lon: number
): Promise<POI[]> {
  return searchPOIs(replacedType, mode, lat, lon, 5, 3);
}
