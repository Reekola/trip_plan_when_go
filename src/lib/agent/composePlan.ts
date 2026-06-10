import { GoogleGenAI } from '@google/genai';
import { VERTEX_CONFIG } from '@/lib/vertex';
import type { DepartureWindow, DaylightData, Stop, TravelMode, UserPreferences } from '@/lib/types';

interface ComposePlanInput {
  origin: string;
  destination: string;
  date: string;
  mode: TravelMode;
  bestWindow: DepartureWindow;
  stops: Stop[];
  daylight: DaylightData;
  preferences?: UserPreferences;
  events?: Array<{ name: string; type: string }>;
}

export async function composePlan(
  input: ComposePlanInput
): Promise<{ narrative: string; departureReason: string }> {
  const { origin, destination, date, mode, bestWindow, stops, daylight, preferences, events } = input;

  const prompt = `You are a concise trip planning assistant. Generate two things for this trip.

Trip: ${origin} → ${destination} on ${date} by ${mode}
Recommended departure: ${bestWindow.time} (score ${bestWindow.score}/100)
Key factors: ${bestWindow.reasons.join('; ')}
Sunrise: ${new Date(daylight.sunrise).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}, Sunset: ${new Date(daylight.sunset).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
Stops: ${stops.map((s) => s.name).join(', ') || 'none planned'}
${events?.length ? `Destination events: ${events.map((e) => e.name).join(', ')}` : ''}
${preferences?.learnedPatterns?.length ? `Traveller note: ${preferences.learnedPatterns.slice(-2).join(', ')}` : ''}

DEPARTURE_REASON: One sentence (max 30 words) starting "Leave at ${bestWindow.time} because…" explaining WHY this time, citing specific factors.
NARRATIVE: 2–3 sentences describing what the trip will be like. Be specific and practical.

Output exactly:
DEPARTURE_REASON: [text]
NARRATIVE: [text]`;

  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: VERTEX_CONFIG.project,
      location: VERTEX_CONFIG.location,
    });
    const result = await ai.models.generateContent({
      model: VERTEX_CONFIG.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 350 },
    });

    const text = result.text ?? '';
    const reasonMatch = text.match(/DEPARTURE_REASON:\s*(.+?)(?=NARRATIVE:|$)/s);
    const narrativeMatch = text.match(/NARRATIVE:\s*(.+)/s);

    return {
      departureReason: reasonMatch?.[1]?.trim() ?? fallbackReason(bestWindow),
      narrative: narrativeMatch?.[1]?.trim() ?? fallbackNarrative(input),
    };
  } catch {
    return {
      departureReason: fallbackReason(bestWindow),
      narrative: fallbackNarrative(input),
    };
  }
}

function fallbackReason(w: DepartureWindow): string {
  const top = w.reasons[0]?.toLowerCase() ?? 'good conditions overall';
  return `Leave at ${w.time} because ${top} — this window scores ${w.score}/100 across traffic, weather, and daylight.`;
}

function fallbackNarrative(input: ComposePlanInput): string {
  const stopNote = input.stops.length
    ? ` Stop at ${input.stops[0].name} along the way.`
    : '';
  return `Your ${input.mode} trip from ${input.origin} to ${input.destination}.${stopNote} Check live conditions closer to departure.`;
}
