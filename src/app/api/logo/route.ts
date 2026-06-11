import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  const filePath = join(process.cwd(), 'public', 'logo.png');
  const file = readFileSync(filePath);
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
