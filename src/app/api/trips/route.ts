import { NextRequest, NextResponse } from 'next/server';
import { getElasticClient, INDEXES, DEFAULT_USER_ID } from '@/lib/elastic';
import { savePreference } from '@/lib/agent/savePreference';
import { rateTrip } from '@/lib/agent/rateTrip';
import { getUserContext } from '@/lib/agent/getUserContext';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  const action = searchParams.get('action');

  if (action === 'preferences') {
    const prefs = await getUserContext(DEFAULT_USER_ID);
    return NextResponse.json(prefs);
  }

  const client = getElasticClient();

  if (id) {
    const hit = await client.get({ index: INDEXES.TRIPS, id });
    return NextResponse.json({ ...(hit._source as Record<string, unknown>), id: hit._id });
  }

  const result = await client.search({
    index: INDEXES.TRIPS,
    query: { term: { userId: DEFAULT_USER_ID } },
    sort: [{ createdAt: { order: 'desc' } }],
    size: 20,
  });

  const trips = result.hits.hits.map((h) => ({ ...(h._source as Record<string, unknown>), id: h._id }));
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'rate') {
    await rateTrip(body.tripId, body.rating, DEFAULT_USER_ID);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'savePreferences') {
    await savePreference(DEFAULT_USER_ID, body.preferences);
    return NextResponse.json({ ok: true });
  }

  const client = getElasticClient();
  const doc = { ...body, userId: DEFAULT_USER_ID, createdAt: new Date().toISOString() };
  const res = await client.index({ index: INDEXES.TRIPS, document: doc });
  return NextResponse.json({ ...doc, id: res._id });
}
