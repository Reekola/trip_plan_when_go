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
  };

  const { origin, destination, date, mode, compare } = body;

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
      });
    }

    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
