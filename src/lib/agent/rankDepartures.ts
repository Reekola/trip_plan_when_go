import type { DepartureWindow, DaylightData, ElevationData, TrafficData, TravelMode, WeatherData } from '@/lib/types';

// Time-of-day congestion multipliers relative to free-flow (1.0 = no delay)
const CONGESTION: Record<number, number> = {
  0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0,
  6: 1.1, 7: 1.35, 8: 1.65, 9: 1.4, 10: 1.15, 11: 1.1,
  12: 1.15, 13: 1.1, 14: 1.1, 15: 1.2, 16: 1.4, 17: 1.75,
  18: 1.6, 19: 1.25, 20: 1.1, 21: 1.0, 22: 1.0, 23: 1.0,
};

// WMO weather code severity (higher = worse)
function weatherSeverity(code: number): 'clear' | 'cloudy' | 'light-rain' | 'heavy-rain' | 'snow' | 'storm' {
  if (code <= 1) return 'clear';
  if (code <= 49) return 'cloudy';
  if (code <= 67) return code <= 55 ? 'light-rain' : 'heavy-rain';
  if (code <= 77) return 'snow';
  return 'storm';
}

export function rankDepartures(
  weather: WeatherData,
  daylight: DaylightData,
  trafficBase: TrafficData | null,
  elevation: ElevationData | null,
  mode: TravelMode
): DepartureWindow[] {
  const sunriseHour = new Date(daylight.sunrise).getHours();
  const sunsetHour = new Date(daylight.sunset).getHours();
  const sunsetMin = new Date(daylight.sunset).getMinutes();
  const sunsetLabel = `${sunsetHour.toString().padStart(2, '0')}:${sunsetMin.toString().padStart(2, '0')}`;

  const windows: DepartureWindow[] = [];

  for (let hour = 5; hour <= 21; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    const hourIndex = weather.hourly.time.findIndex((t) =>
      t.includes(`T${hour.toString().padStart(2, '0')}:`)
    );
    if (hourIndex === -1) continue;

    const temp = weather.hourly.temperature_2m[hourIndex];
    const windKmh = weather.hourly.wind_speed_10m[hourIndex];
    const precip = weather.hourly.precipitation[hourIndex];
    const wCode = weather.hourly.weather_code[hourIndex];
    const severity = weatherSeverity(wCode);

    const reasons: string[] = [];
    let warning: string | undefined;

    // ── Traffic score (car / motorcycle) ────────────────────────────────────
    let trafficScore = 60;
    if ((mode === 'car' || mode === 'motorcycle') && trafficBase) {
      const multiplier = CONGESTION[hour] ?? 1.0;
      const delayFraction = (multiplier - 1) / 1.0;
      const delayMin = Math.round((trafficBase.duration * delayFraction) / 60);
      trafficScore = Math.max(0, Math.round(100 - delayFraction * 120));
      if (delayMin > 15) reasons.push(`Rush hour adds ~${delayMin} min`);
      else if (delayMin > 5) reasons.push(`Light congestion (+${delayMin} min)`);
      else reasons.push('Clear roads');
    }

    // ── Weather score ────────────────────────────────────────────────────────
    let weatherScore = 100;

    if (severity === 'storm') {
      weatherScore -= 70; warning = 'Thunderstorm';
      reasons.push('Thunderstorm risk — not recommended');
    } else if (severity === 'snow') {
      weatherScore -= 40; warning = 'Snow';
      reasons.push('Snow conditions');
    } else if (severity === 'heavy-rain') {
      weatherScore -= 35;
      if (mode !== 'car') warning = 'Heavy rain';
      reasons.push(`Heavy rain ${precip.toFixed(1)} mm/h`);
    } else if (severity === 'light-rain') {
      weatherScore -= 15;
      if (mode === 'bicycle' || mode === 'walk') reasons.push(`Light rain ${precip.toFixed(1)} mm/h`);
    }

    if (windKmh > 45 && (mode === 'bicycle' || mode === 'motorcycle')) {
      weatherScore -= 30;
      reasons.push(`Strong wind ${Math.round(windKmh)} km/h — headwind likely`);
    } else if (windKmh > 25 && mode === 'bicycle') {
      weatherScore -= 15;
      reasons.push(`Wind ${Math.round(windKmh)} km/h`);
    }

    if (temp < 0) {
      weatherScore -= 20;
      if (mode !== 'car') reasons.push(`Freezing ${Math.round(temp)}°C`);
    } else if (temp < 5 && (mode === 'bicycle' || mode === 'walk')) {
      weatherScore -= 8;
      reasons.push(`Cold ${Math.round(temp)}°C — layer up`);
    } else if (temp >= 15 && temp <= 26) {
      reasons.push(`Pleasant ${Math.round(temp)}°C`);
    } else if (temp > 35) {
      weatherScore -= 15;
      reasons.push(`Very hot ${Math.round(temp)}°C`);
    }

    weatherScore = Math.max(0, weatherScore);

    // ── Daylight score ───────────────────────────────────────────────────────
    let daylightScore = 100;
    const isDark = hour < sunriseHour || hour >= sunsetHour;
    const nearSunset = hour === sunsetHour - 1;

    if (isDark) {
      if (mode === 'bicycle' || mode === 'walk') {
        daylightScore = 0;
        warning = warning ?? 'After dark';
        reasons.push(`No daylight — sunset ${sunsetLabel}`);
      } else {
        daylightScore = 55;
        if (hour < sunriseHour) reasons.push('Before sunrise');
        else reasons.push(`After sunset (${sunsetLabel})`);
      }
    } else if (nearSunset) {
      if (mode === 'bicycle' || mode === 'walk') {
        daylightScore = 45;
        reasons.push(`Arriving near sunset (${sunsetLabel})`);
      } else {
        daylightScore = 85;
      }
    } else {
      reasons.push(`Plenty of daylight (until ${sunsetLabel})`);
    }

    // ── Elevation score (bicycle / walk only) ────────────────────────────────
    let elevationScore: number | undefined;
    if (elevation && (mode === 'bicycle' || mode === 'walk')) {
      elevationScore = Math.max(0, 100 - Math.round(elevation.totalGain / 8));
      if (elevation.totalGain > 600) reasons.push(`Hard climb: ${elevation.totalGain} m gain`);
      else if (elevation.totalGain > 300) reasons.push(`Moderate hills: ${elevation.totalGain} m gain`);
      else if (elevation.totalGain > 100) reasons.push(`Gentle rolling terrain`);
    }

    // ── Composite score ──────────────────────────────────────────────────────
    const scoreBreakdown: DepartureWindow['scoreBreakdown'] = { weather: weatherScore, daylight: daylightScore };
    let score: number;

    if (mode === 'car' || mode === 'motorcycle') {
      score = trafficScore * 0.5 + weatherScore * 0.3 + daylightScore * 0.2;
      scoreBreakdown.traffic = trafficScore;
    } else if (mode === 'bicycle') {
      const ev = elevationScore ?? 70;
      score = weatherScore * 0.45 + daylightScore * 0.35 + ev * 0.2;
      scoreBreakdown.elevation = ev;
    } else {
      // walk — weather almost everything, daylight hard constraint
      score = weatherScore * 0.6 + daylightScore * 0.4;
    }

    // Hard zero: bike/walk after dark
    if ((mode === 'bicycle' || mode === 'walk') && daylightScore === 0) score = 0;

    windows.push({
      time,
      score: Math.round(score),
      scoreBreakdown,
      reasons: reasons.slice(0, 4),
      recommended: false,
      warning,
    });
  }

  // Mark best window
  const best = windows.filter((w) => w.score > 0).sort((a, b) => b.score - a.score)[0];
  if (best) best.recommended = true;

  return windows;
}
