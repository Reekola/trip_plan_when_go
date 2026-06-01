import type { POI, Stop, TravelMode, UserPreferences } from '@/lib/types';

export function selectStops(
  pois: POI[],
  mode: TravelMode,
  preferences: UserPreferences,
  maxStops = 3
): Stop[] {
  const modePrefs = preferences.modes[mode];
  const preferredTypes = modePrefs?.stopTypes ?? [];

  const scored = pois
    .filter((p) => p.modes.includes(mode))
    .map((p) => {
      let score = (p.rating ?? 3) * 10;
      const preferred = preferredTypes.includes(p.type);
      if (preferred) score += 30;
      const reason = buildStopReason(p, mode, preferred, modePrefs?.preferScenic ?? false);
      return { poi: p, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxStops);

  return scored.map(({ poi, reason }) => ({
    id: poi.id,
    name: poi.name,
    type: poi.type,
    location: poi.location,
    reason,
  }));
}

function buildStopReason(poi: POI, mode: TravelMode, preferred: boolean, preferScenic: boolean): string {
  if (preferred) {
    return `Matches your preferred stop type for ${mode} trips${poi.rating ? ` — rated ${poi.rating}/5` : ''}.`;
  }
  if (preferScenic && (poi.type === 'viewpoint' || poi.type === 'park')) {
    return `Scenic spot${poi.description ? `: ${poi.description}` : ''}.`;
  }
  if (poi.type === 'cafe') return `Good coffee stop — breaks up the journey.`;
  if (poi.type === 'fuel') return `Fuel available — good to know for this route.`;
  if (poi.type === 'rest_area') return `Rest area with facilities.`;
  return poi.description ?? `Recommended stop on this route.`;
}
