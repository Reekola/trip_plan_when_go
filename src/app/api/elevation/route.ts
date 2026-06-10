import { NextRequest, NextResponse } from 'next/server';
import { fetchElevation } from '@/lib/data/fetchElevation';
import { routeWaypoints } from '@/lib/data/geocode';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const originLat = parseFloat(searchParams.get('originLat') ?? '');
  const originLng = parseFloat(searchParams.get('originLng') ?? '');
  const destLat   = parseFloat(searchParams.get('destLat') ?? '');
  const destLng   = parseFloat(searchParams.get('destLng') ?? '');

  if ([originLat, originLng, destLat, destLng].some(isNaN)) {
    return NextResponse.json(
      { error: 'originLat, originLng, destLat, destLng are required' },
      { status: 400 }
    );
  }

  const waypoints = routeWaypoints(
    { lat: originLat, lng: originLng },
    { lat: destLat, lng: destLng },
    8
  );

  const data = await fetchElevation(waypoints);
  return NextResponse.json(data);
}
