import { Client } from '@elastic/elasticsearch';

let client: Client | null = null;

export function getElasticClient(): Client {
  if (!client) {
    client = new Client({
      cloud: { id: process.env.ELASTIC_CLOUD_ID! },
      auth: { apiKey: process.env.ELASTIC_API_KEY! },
    });
  }
  return client;
}

export const INDEXES = {
  USERS: 'trip-planner-users',
  TRIPS: 'trip-planner-trips',
  POIS: 'trip-planner-pois',
  EVENTS: 'trip-planner-events',
} as const;

export const DEFAULT_USER_ID = 'demo-user';
