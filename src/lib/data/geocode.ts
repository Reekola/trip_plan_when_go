export interface GeoPoint { lat: number; lng: number }

export async function geocode(address: string): Promise<GeoPoint> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Geocoding error ${res.status}`);

  const data = await res.json() as {
    status: string;
    results: { geometry: { location: { lat: number; lng: number } } }[];
  };

  if (data.status !== 'OK' || !data.results[0]) {
    throw new Error(`Geocoding failed for "${address}": ${data.status}`);
  }

  return data.results[0].geometry.location;
}

export function midpoint(a: GeoPoint, b: GeoPoint): GeoPoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export function routeWaypoints(origin: GeoPoint, destination: GeoPoint, steps = 8): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    points.push({
      lat: origin.lat + ((destination.lat - origin.lat) * i) / steps,
      lng: origin.lng + ((destination.lng - origin.lng) * i) / steps,
    });
  }
  return points;
}
