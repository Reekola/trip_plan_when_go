import { GoogleGenAI, Type } from '@google/genai';
import type { Part, FunctionDeclaration } from '@google/genai';
import { SYSTEM_PROMPT } from './systemPrompt';
import { getUserContext } from './getUserContext';
import { searchPOIs } from './searchPOIs';
import { queryEvents } from './queryEvents';
import { saveTrip } from './saveTrip';
import { rankDepartures } from './rankDepartures';
import { geocode, routeWaypoints } from '@/lib/data/geocode';
import { fetchWeather } from '@/lib/data/fetchWeather';
import { fetchDaylight } from '@/lib/data/fetchDaylight';
import { fetchTraffic } from '@/lib/data/fetchTraffic';
import { fetchElevation } from '@/lib/data/fetchElevation';
import type {
  TripPlan,
  TravelMode,
  WeatherData,
  DaylightData,
  TrafficData,
  ElevationData,
} from '@/lib/types';

const S = Type;

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getUserContext',
    description: 'Load the user preference profile and learned travel patterns from Elastic. ALWAYS call this first.',
    parameters: {
      type: S.OBJECT,
      properties: { userId: { type: S.STRING, description: 'User identifier' } },
      required: ['userId'],
    },
  },
  {
    name: 'geocode',
    description: 'Convert an address string to latitude/longitude coordinates.',
    parameters: {
      type: S.OBJECT,
      properties: { address: { type: S.STRING, description: 'Address or place name' } },
      required: ['address'],
    },
  },
  {
    name: 'fetchWeather',
    description: 'Hourly weather forecast (temperature, wind, precipitation, weather code) for a location on a date.',
    parameters: {
      type: S.OBJECT,
      properties: {
        lat:  { type: S.NUMBER },
        lon:  { type: S.NUMBER },
        date: { type: S.STRING, description: 'YYYY-MM-DD' },
      },
      required: ['lat', 'lon', 'date'],
    },
  },
  {
    name: 'fetchDaylight',
    description: 'Sunrise and sunset times for a location on a given date. Required for all modes — hard constraint for bicycle and walk.',
    parameters: {
      type: S.OBJECT,
      properties: {
        lat:  { type: S.NUMBER },
        lon:  { type: S.NUMBER },
        date: { type: S.STRING },
      },
      required: ['lat', 'lon', 'date'],
    },
  },
  {
    name: 'fetchTraffic',
    description: 'Traffic-aware travel duration and distance. Use ONLY for car or motorcycle.',
    parameters: {
      type: S.OBJECT,
      properties: {
        origin:        { type: S.STRING },
        destination:   { type: S.STRING },
        departureTime: { type: S.STRING, description: 'ISO 8601 datetime. Optional.' },
      },
      required: ['origin', 'destination'],
    },
  },
  {
    name: 'fetchElevation',
    description: 'Elevation profile, total gain and loss. Use ONLY for bicycle or walk.',
    parameters: {
      type: S.OBJECT,
      properties: {
        originLat: { type: S.NUMBER },
        originLng: { type: S.NUMBER },
        destLat:   { type: S.NUMBER },
        destLng:   { type: S.NUMBER },
      },
      required: ['originLat', 'originLng', 'destLat', 'destLng'],
    },
  },
  {
    name: 'rankDepartures',
    description: 'Score every departure window (5 am–9 pm) using collected weather, daylight, traffic, and elevation data. Always call before composing the final plan.',
    parameters: {
      type: S.OBJECT,
      properties: {
        weather:   { type: S.OBJECT, description: 'Output of fetchWeather' },
        daylight:  { type: S.OBJECT, description: 'Output of fetchDaylight' },
        traffic:   { type: S.OBJECT, description: 'Output of fetchTraffic. Pass null for non-motorised.' },
        elevation: { type: S.OBJECT, description: 'Output of fetchElevation. Pass null for motorised.' },
        mode:      { type: S.STRING, enum: ['car', 'motorcycle', 'bicycle', 'walk'] },
      },
      required: ['weather', 'daylight', 'mode'],
    },
  },
  {
    name: 'searchPOIs',
    description: 'Hybrid semantic + keyword search for points of interest near the route midpoint, filtered by travel mode.',
    parameters: {
      type: S.OBJECT,
      properties: {
        query:    { type: S.STRING, description: 'Stop type keywords, e.g. "cafe viewpoint"' },
        mode:     { type: S.STRING, enum: ['car', 'motorcycle', 'bicycle', 'walk'] },
        lat:      { type: S.NUMBER, description: 'Midpoint latitude' },
        lon:      { type: S.NUMBER, description: 'Midpoint longitude' },
        radiusKm: { type: S.NUMBER, description: 'Search radius in km. Default 10.' },
      },
      required: ['query', 'mode', 'lat', 'lon'],
    },
  },
  {
    name: 'queryEvents',
    description: 'Find events at the destination on the trip date.',
    parameters: {
      type: S.OBJECT,
      properties: {
        date: { type: S.STRING, description: 'YYYY-MM-DD' },
        lat:  { type: S.NUMBER, description: 'Destination latitude' },
        lon:  { type: S.NUMBER, description: 'Destination longitude' },
      },
      required: ['date', 'lat', 'lon'],
    },
  },
  {
    name: 'saveTrip',
    description: 'Persist the completed trip plan to Elastic. Call as the final step before returning the plan.',
    parameters: {
      type: S.OBJECT,
      properties: {
        plan:   { type: S.OBJECT, description: 'The complete TripPlan object' },
        userId: { type: S.STRING },
      },
      required: ['plan', 'userId'],
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (name) {
    case 'getUserContext':
      return getUserContext((args.userId as string) ?? userId);

    case 'geocode':
      return geocode(args.address as string);

    case 'fetchWeather':
      return fetchWeather(args.lat as number, args.lon as number, args.date as string);

    case 'fetchDaylight':
      return fetchDaylight(args.lat as number, args.lon as number, args.date as string);

    case 'fetchTraffic':
      return fetchTraffic(
        args.origin as string,
        args.destination as string,
        (args.departureTime as string | undefined) ?? undefined
      );

    case 'fetchElevation': {
      const waypoints = routeWaypoints(
        { lat: args.originLat as number, lng: args.originLng as number },
        { lat: args.destLat as number, lng: args.destLng as number },
        8
      );
      return fetchElevation(waypoints);
    }

    case 'rankDepartures':
      return rankDepartures(
        args.weather as WeatherData,
        args.daylight as DaylightData,
        null,
        null,
        args.mode as TravelMode
      );

    case 'searchPOIs':
      return searchPOIs(
        args.query as string,
        args.mode as TravelMode,
        args.lat as number,
        args.lon as number,
        (args.radiusKm as number | undefined) ?? undefined
      );

    case 'queryEvents':
      return queryEvents(args.date as string, args.lat as number, args.lon as number);

    case 'saveTrip':
      return saveTrip(args.plan as TripPlan, (args.userId as string) ?? userId);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function callAgent(
  origin: string,
  destination: string,
  date: string,
  mode: TravelMode,
  userId: string
): Promise<TripPlan> {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  });

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4,
    },
  });

  const userMessage =
    `Plan a ${mode} trip from "${origin}" to "${destination}" on ${date}. UserId: ${userId}.\n` +
    `Workflow: getUserContext → geocode both → ` +
    `parallel(fetchWeather, fetchDaylight, ${mode === 'car' || mode === 'motorcycle' ? 'fetchTraffic' : 'fetchElevation'}) → ` +
    `rankDepartures → parallel(searchPOIs, queryEvents) → saveTrip → output JSON plan.`;

  let response = await chat.sendMessage({ message: userMessage });

  for (let i = 0; i < 20; i++) {
    const fnCalls = response.functionCalls ?? [];
    if (fnCalls.length === 0) break;

    const results: Part[] = await Promise.all(
      fnCalls.map(async (fc) => {
        try {
          const result = await executeTool(
            fc.name!,
            (fc.args ?? {}) as Record<string, unknown>,
            userId
          );
          return { functionResponse: { name: fc.name!, response: { content: result } } };
        } catch (err) {
          return {
            functionResponse: {
              name: fc.name!,
              response: { error: err instanceof Error ? err.message : String(err) },
            },
          };
        }
      })
    );

    response = await chat.sendMessage({ message: results });
  }

  const text = response.text ?? '';
  const jsonMatch =
    text.match(/```json\s*([\s\S]+?)\s*```/) ??
    text.match(/(\{[\s\S]+\})/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as TripPlan;
    } catch {
      throw new Error(`Agent returned invalid JSON: ${text.slice(0, 300)}`);
    }
  }

  throw new Error(`Agent returned no parseable plan: ${text.slice(0, 300)}`);
}
