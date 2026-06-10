import { NextRequest, NextResponse } from 'next/server';
import { geocode } from '@/lib/data/geocode';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }
  const point = await geocode(address);
  return NextResponse.json(point);
}
