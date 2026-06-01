import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/data/fetchWeather';
import { fetchDaylight } from '@/lib/data/fetchDaylight';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lon = parseFloat(searchParams.get('lon') ?? '');
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const [weather, daylight] = await Promise.all([
    fetchWeather(lat, lon, date),
    fetchDaylight(lat, lon, date),
  ]);

  return NextResponse.json({ weather, daylight });
}
