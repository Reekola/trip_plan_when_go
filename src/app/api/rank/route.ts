import { NextRequest, NextResponse } from 'next/server';
import { rankDepartures } from '@/lib/agent/rankDepartures';
import type { WeatherData, DaylightData, TrafficData, ElevationData, TravelMode } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    weather: WeatherData;
    daylight: DaylightData;
    traffic?: TrafficData | null;
    elevation?: ElevationData | null;
    mode: TravelMode;
  };

  const { weather, daylight, traffic, elevation, mode } = body;
  if (!weather || !daylight || !mode) {
    return NextResponse.json(
      { error: 'weather, daylight, and mode are required' },
      { status: 400 }
    );
  }

  const windows = rankDepartures(weather, daylight, traffic ?? null, elevation ?? null, mode);
  return NextResponse.json(windows);
}
