import type { POI, TravelMode } from '@/lib/types';

const PLACE_TYPES = ['cafe', 'restaurant', 'gas_station'];

interface NewPlacesResult {
  id: string;
  displayName?: { text: string };
  types?: string[];
  rating?: number;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

function mapPlaceType(types: string[] = []): POI['type'] {
  if (types.includes('cafe') || types.includes('coffee_shop')) return 'cafe';
  if (types.includes('restaurant')) return 'restaurant';
  if (types.includes('gas_station')) return 'fuel';
  if (types.includes('park') || types.includes('tourist_attraction') || types.includes('natural_feature') || types.includes('national_park')) return 'viewpoint';
  return 'rest_area';
}

export async function searchPOIs(
  _query: string,
  _mode: TravelMode,
  lat: number,
  lon: number,
  radiusKm = 40,
  size = 5
): Promise<POI[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  const radiusM = Math.min(radiusKm * 1000, 50000);

  const results = await Promise.all(
    PLACE_TYPES.map(async (type) => {
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.rating,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          includedTypes: [type],
          maxResultCount: 5,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lon },
              radius: radiusM,
            },
          },
        }),
      });
      const data = await res.json() as { places?: NewPlacesResult[] };
      return data.places ?? [];
    })
  );

  const seen = new Set<string>();
  const pois: POI[] = [];
  const perType = Math.max(2, Math.ceil(size / results.length));

  for (const group of results) {
    let count = 0;
    for (const place of group) {
      if (count >= perType) break;
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      count++;
      pois.push({
        id: place.id,
        name: place.displayName?.text ?? 'Unknown',
        type: mapPlaceType(place.types),
        modes: ['car'],
        rating: place.rating,
        description: place.formattedAddress,
        location: {
          lat: place.location?.latitude ?? lat,
          lng: place.location?.longitude ?? lon,
        },
      });
    }
  }

  return pois.slice(0, size);
}
