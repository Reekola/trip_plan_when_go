import { NextRequest, NextResponse } from 'next/server';
import { fetchTraffic } from '@/lib/data/fetchTraffic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const departureTime = searchParams.get('departureTime');

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
  }

  const traffic = await fetchTraffic(origin, destination, departureTime ?? undefined);
  return NextResponse.json(traffic);
}
