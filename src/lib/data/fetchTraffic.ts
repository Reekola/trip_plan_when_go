import type { TrafficData } from '@/lib/types';

export async function fetchTraffic(
  origin: string,
  destination: string,
  departureTime?: string
): Promise<TrafficData> {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_ROUTES_API_KEY not configured');

  const departure = departureTime ?? new Date().toISOString();

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    departureTime: departure,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.travelAdvisory',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('No route returned from Routes API');

  const durationInTraffic = parseInt((route.duration as string).replace('s', ''), 10);
  const staticDuration = parseInt((route.staticDuration as string).replace('s', ''), 10);

  return {
    duration: staticDuration,
    durationInTraffic,
    distance: route.distanceMeters as number,
    congestionLevel: (route.travelAdvisory?.trafficDensity as string) ?? 'UNKNOWN',
  };
}
