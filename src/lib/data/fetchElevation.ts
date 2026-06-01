import type { ElevationData } from '@/lib/types';

export async function fetchElevation(
  waypoints: { lat: number; lng: number }[]
): Promise<ElevationData> {
  const locations = waypoints.map((p) => ({ latitude: p.lat, longitude: p.lng }));

  const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Open-Elevation error ${res.status}`);
  const data = await res.json() as { results: { elevation: number }[] };

  const elevations = data.results.map((r) => r.elevation);
  let gain = 0;
  let loss = 0;
  let cumulativeDistance = 0;
  const profile: ElevationData['profile'] = [];

  for (let i = 0; i < elevations.length; i++) {
    if (i > 0) {
      const diff = elevations[i] - elevations[i - 1];
      const segDist = haversine(waypoints[i - 1], waypoints[i]);
      cumulativeDistance += segDist;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }
    profile.push({ distance: cumulativeDistance, elevation: elevations[i] });
  }

  return { totalGain: Math.round(gain), totalLoss: Math.round(loss), profile };
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
