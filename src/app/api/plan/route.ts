import { NextRequest, NextResponse } from 'next/server';
import { planTrip } from '@/lib/agent/planTrip';
import { compareOptions } from '@/lib/agent/compareOptions';
import { callAgent } from '@/lib/agent/agentBuilder';
import { DEFAULT_USER_ID } from '@/lib/elastic';
import type { TravelMode } from '@/lib/types';

const USE_AGENT_BUILDER = process.env.USE_AGENT_BUILDER === 'true';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    origin: string;
    destination: string;
    date: string;
    mode: TravelMode;
    compare?: boolean;
    timeFrom?: number;
    timeTo?: number;
    clientHour?: number;
  };

  const { origin, destination, date, mode, compare, timeFrom, timeTo, clientHour } = body;

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
  }

  try {
    let plan;

    if (USE_AGENT_BUILDER && !compare) {
      // Agent Builder path: Gemini orchestrates tool calls end-to-end
      plan = await callAgent(
        origin,
        destination,
        date ?? new Date().toISOString().split('T')[0],
        mode ?? 'car',
        DEFAULT_USER_ID
      );
    } else if (compare) {
      plan = await compareOptions({
        origin,
        destination,
        date,
        mode: mode ?? 'car',
        userId: DEFAULT_USER_ID,
      });
    } else {
      // Direct path: used locally or when Agent Builder is not configured
      plan = await planTrip({
        origin,
        destination,
        date,
        mode: mode ?? 'car',
        userId: DEFAULT_USER_ID,
        timeFrom,
        timeTo,
        clientHour,
      });
    }

    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Plan error:', message, stack);

    if (message.includes('Geocoding failed') || message.includes('ZERO_RESULTS')) {
      const match = message.match(/Geocoding failed for "([^"]+)"/);
      const loc = match?.[1] ?? 'that location';
      return NextResponse.json(
        { error: `Couldn't find "${loc}". Try a more specific name, e.g. "Split, Croatia".` },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: message, detail: stack?.split('\n').slice(0, 5).join(' | ') }, { status: 500 });
  }
}
