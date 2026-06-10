/**
 * Creates Elastic indexes with the correct mappings.
 * Run once: npx ts-node --esm scripts/setup-elastic.ts
 * Or: npx tsx scripts/setup-elastic.ts
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

const INDEXES = {
  USERS: 'trip-planner-users',
  TRIPS: 'trip-planner-trips',
  POIS:  'trip-planner-pois',
  EVENTS: 'trip-planner-events',
};

async function createOrRecreate(name: string, mappings: object, settings?: object) {
  const exists = await client.indices.exists({ index: name });
  if (exists) {
    console.log(`Index ${name} exists — skipping.`);
    return;
  }
  await client.indices.create({ index: name, mappings, settings });
  console.log(`Created ${name}`);
}

async function main() {
  // users — preference profile per mode, learned patterns
  await createOrRecreate(INDEXES.USERS, {
    properties: {
      userId:          { type: 'keyword' },
      modes:           { type: 'object', dynamic: true },
      learnedPatterns: { type: 'text' },
      tripCount:       { type: 'integer' },
      updatedAt:       { type: 'date' },
    },
  });

  // trips — full plan document
  await createOrRecreate(INDEXES.TRIPS, {
    properties: {
      userId:               { type: 'keyword' },
      origin:               { type: 'text', fields: { keyword: { type: 'keyword' } } },
      destination:          { type: 'text', fields: { keyword: { type: 'keyword' } } },
      date:                 { type: 'date' },
      mode:                 { type: 'keyword' },
      recommendedDeparture: { type: 'keyword' },
      departureReason:      { type: 'text' },
      narrative:            { type: 'text' },
      rating:               { type: 'short' },
      duration:             { type: 'integer' },
      distance:             { type: 'integer' },
      createdAt:            { type: 'date' },
    },
  });

  // pois — semantic search via ELSER (semantic_text), geo for radius filter
  await createOrRecreate(INDEXES.POIS, {
    properties: {
      name:        { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: {
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
      },
      type:     { type: 'keyword' },
      modes:    { type: 'keyword' },
      rating:   { type: 'half_float' },
      location: { type: 'geo_point' },
    },
  });

  // events — date + geo
  await createOrRecreate(INDEXES.EVENTS, {
    properties: {
      name:        { type: 'text' },
      type:        { type: 'keyword' },
      date:        { type: 'date' },
      description: { type: 'text' },
      location:    { type: 'geo_point' },
    },
  });

  console.log('Done.');
}

main().catch(console.error);
