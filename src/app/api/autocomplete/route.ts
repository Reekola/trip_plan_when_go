import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('types', '(cities)');
  url.searchParams.set('language', 'en');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json() as {
      predictions: { description: string; structured_formatting: { main_text: string; secondary_text: string } }[];
    };
    return NextResponse.json(
      (data.predictions ?? []).slice(0, 5).map((p) => ({
        label: p.description,
        main: p.structured_formatting.main_text,
        secondary: p.structured_formatting.secondary_text,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
