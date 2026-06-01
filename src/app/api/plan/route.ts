import { NextRequest, NextResponse } from 'next/server';
import { planTrip } from '@/lib/agent/planTrip';
import { compareOptions } from '@/lib/agent/compareOptions';
import { DEFAULT_USER_ID } from '@/lib/elastic';
import type { TravelMode } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { origin, destination, date, mode, compare } = body as {
    origin: string;
    destination: string;
    date: string;
    mode: TravelMode;
    compare?: boolean;
  };

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
  }

  try {
    const plan = compare
      ? await compareOptions({ origin, destination, date, mode: mode ?? 'car', userId: DEFAULT_USER_ID })
      : await planTrip({ origin, destination, date, mode: mode ?? 'car', userId: DEFAULT_USER_ID });

    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
