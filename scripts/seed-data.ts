/**
 * Seeds POI + event data for the London → Brighton demo route.
 * Run: npx tsx scripts/seed-data.ts
 */
import { Client } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const client = new Client({
  node: process.env.ELASTIC_URL!,
  auth: { apiKey: process.env.ELASTIC_API_KEY! },
});

const POIS_INDEX  = 'trip-planner-pois';
const EVENTS_INDEX = 'trip-planner-events';

// London → Brighton route (and nearby)
const pois = [
  {
    name: 'Brickwood Coffee & Bread',
    type: 'cafe',
    modes: ['car', 'motorcycle', 'bicycle', 'walk'],
    rating: 4.6,
    description: 'Excellent espresso and avocado toast in Clapham, perfect for a pre-ride caffeine stop.',
    location: { lat: 51.4582, lon: -0.1440 },
  },
  {
    name: 'Box Hill Viewpoint',
    type: 'viewpoint',
    modes: ['bicycle', 'walk', 'car', 'motorcycle'],
    rating: 4.8,
    description: 'Famous cycling climb on the North Downs with sweeping Surrey countryside views. Used in the 2012 Olympics.',
    location: { lat: 51.2497, lon: -0.3094 },
  },
  {
    name: 'Reigate Hill Café',
    type: 'cafe',
    modes: ['bicycle', 'walk', 'car'],
    rating: 4.3,
    description: 'Cosy hilltop café with hot food and stunning views over the Weald. Great midpoint stop.',
    location: { lat: 51.2403, lon: -0.1978 },
  },
  {
    name: 'Hickstead Services',
    type: 'fuel',
    modes: ['car', 'motorcycle'],
    rating: 3.8,
    description: 'Fuel station and services on the A23 — last reliable fuel stop before Brighton.',
    location: { lat: 50.9688, lon: -0.1890 },
  },
  {
    name: "Devil's Dyke",
    type: 'viewpoint',
    modes: ['bicycle', 'walk', 'car', 'motorcycle'],
    rating: 4.7,
    description: 'Dramatic chalk valley on the South Downs with panoramic views towards the sea. Iconic finish approach for cyclists.',
    location: { lat: 50.8966, lon: -0.2171 },
  },
  {
    name: 'Pyecombe Golf Course Café',
    type: 'cafe',
    modes: ['bicycle', 'car'],
    rating: 4.1,
    description: 'Quiet café on the South Downs Way, ideal for a final break before the descent into Brighton.',
    location: { lat: 50.8902, lon: -0.1756 },
  },
  {
    name: 'Brighton Marina Fuel Dock',
    type: 'fuel',
    modes: ['car', 'motorcycle'],
    rating: 3.9,
    description: 'Convenient fuel stop right at the seafront.',
    location: { lat: 50.8146, lon: -0.1028 },
  },
  {
    name: 'Redhill Cycle Café',
    type: 'cafe',
    modes: ['bicycle'],
    rating: 4.5,
    description: 'Cyclist-friendly café with secure bike parking, maintenance stand, and great coffee.',
    location: { lat: 51.2400, lon: -0.1697 },
  },
  // Edinburgh → Glasgow pois
  {
    name: 'Linlithgow Palace Viewpoint',
    type: 'viewpoint',
    modes: ['car', 'motorcycle', 'bicycle', 'walk'],
    rating: 4.6,
    description: 'Ruins of a royal palace with loch views — a dramatic mid-route stop on the M9 corridor.',
    location: { lat: 55.9763, lon: -3.6017 },
  },
  {
    name: 'Harthill Services',
    type: 'rest_area',
    modes: ['car', 'motorcycle'],
    rating: 3.5,
    description: 'Motorway services on the M8 with food and fuel.',
    location: { lat: 55.8577, lon: -3.7617 },
  },
];

const events = [
  {
    name: 'Brighton Food & Drink Festival',
    type: 'food_festival',
    date: '2026-06-06',
    description: 'Annual outdoor food festival on Brighton seafront. Arrive before noon to beat the crowds.',
    location: { lat: 50.8225, lon: -0.1372 },
  },
  {
    name: 'Brighton Marathon Finish',
    type: 'sport',
    date: '2026-06-07',
    description: 'Road closures expected around the seafront and Preston Park until 3 pm.',
    location: { lat: 50.8225, lon: -0.1372 },
  },
  {
    name: "Devil's Dyke Sunset Run",
    type: 'sport',
    date: '2026-06-08',
    description: 'Popular trail run finishing at sunset. Car park busy from 4 pm.',
    location: { lat: 50.8966, lon: -0.2171 },
  },
  {
    name: 'Glasgow Jazz Festival Opening Night',
    type: 'music',
    date: '2026-06-19',
    description: 'City centre streets around the Concert Hall closed from 5 pm.',
    location: { lat: 55.8617, lon: -4.2583 },
  },
];

async function main() {
  const pOps = pois.map((p) => [
    { index: { _index: POIS_INDEX } },
    p,
  ]).flat();

  const eOps = events.map((e) => [
    { index: { _index: EVENTS_INDEX } },
    e,
  ]).flat();

  const pRes = await client.bulk({ operations: pOps, refresh: true });
  console.log(`POIs: ${pOps.length / 2} docs, errors=${pRes.errors}`);
  if (pRes.errors) pRes.items.forEach(i => { const e = i.index?.error; if (e) console.error('POI error:', JSON.stringify(e)); });

  const eRes = await client.bulk({ operations: eOps, refresh: true });
  console.log(`Events: ${eOps.length / 2} docs, errors=${eRes.errors}`);
  if (eRes.errors) eRes.items.forEach(i => { const e = i.index?.error; if (e) console.error('Event error:', JSON.stringify(e)); });

  console.log('Seed complete.');
}

main().catch(console.error);
