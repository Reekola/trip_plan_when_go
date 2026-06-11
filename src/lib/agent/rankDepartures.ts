import type { DepartureWindow, DaylightData, TrafficData, TravelMode, WeatherData } from '@/lib/types';
import type { HolidayInfo } from '@/lib/data/fetchHolidays';

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
  trafficByHour: Map<number, TrafficData> | null,
  holiday: HolidayInfo | null,
  _mode: TravelMode,
  fromHour = 5,
  toHour = 21,
): DepartureWindow[] {
  const countryName = holiday
    ? (new Intl.DisplayNames(['en'], { type: 'region' }).of(holiday.countryCode) ?? holiday.countryCode)
    : null;
  const holidayNote = holiday
    ? holiday.isReturn
      ? `Day after ${holiday.name} (${countryName}) — expect heavy return traffic`
      : holiday.isEve
      ? `Eve of ${holiday.name} (${countryName}) — expect heavy outbound traffic`
      : holiday.isEve2
      ? `${holiday.name} in 2 days (${countryName}) — traffic building up`
      : `Public holiday: ${holiday.name} (${countryName}) — expect non-typical traffic`
    : null;
  const sunriseHour = new Date(daylight.sunrise).getHours();
  const sunsetHour = new Date(daylight.sunset).getHours();
  const sunsetMin = new Date(daylight.sunset).getMinutes();
  const sunsetLabel = `${sunsetHour.toString().padStart(2, '0')}:${sunsetMin.toString().padStart(2, '0')}`;

  const windows: DepartureWindow[] = [];

  for (let hour = fromHour; hour <= toHour; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    const hourIndex = weather.hourly.time.findIndex((t) =>
      t.includes(`T${hour.toString().padStart(2, '0')}:`)
    );
    if (hourIndex === -1) continue;

    const temp = weather.hourly.temperature_2m[hourIndex];
    const precip = weather.hourly.precipitation[hourIndex];
    const wCode = weather.hourly.weather_code[hourIndex];
    const severity = weatherSeverity(wCode);

    const reasons: string[] = [];
    let warning: string | undefined;

    // Traffic score — real per-hour data from Routes API
    let trafficScore = 60;
    const traffic = trafficByHour?.get(hour);
    if (traffic) {
      const delayS = Math.max(0, traffic.durationInTraffic - traffic.duration);
      const delayFraction = traffic.duration > 0 ? delayS / traffic.duration : 0;
      const delayMin = Math.round(delayS / 60);
      trafficScore = Math.max(0, Math.round(100 - delayFraction * 120));
      if (delayMin > 15) reasons.push(`Heavy traffic adds ~${delayMin} min`);
      else if (delayMin > 5) reasons.push(`Some congestion (+${delayMin} min)`);
      else reasons.push('Clear roads');
    }

    // Weather score
    let weatherScore = 100;

    if (severity === 'storm') {
      weatherScore -= 70; warning = 'Thunderstorm';
      reasons.push('Thunderstorm risk — not recommended');
    } else if (severity === 'snow') {
      weatherScore -= 40; warning = 'Snow';
      reasons.push('Snow conditions');
    } else if (severity === 'heavy-rain') {
      weatherScore -= 35; warning = 'Heavy rain';
      reasons.push(`Heavy rain ${precip.toFixed(1)} mm/h`);
    } else if (severity === 'light-rain') {
      weatherScore -= 15;
    }

    if (temp < 0) {
      weatherScore -= 20;
      reasons.push(`Freezing ${Math.round(temp)}°C`);
    } else if (temp >= 15 && temp <= 26) {
      reasons.push(`Pleasant ${Math.round(temp)}°C`);
    } else if (temp > 35) {
      weatherScore -= 15;
      reasons.push(`Very hot ${Math.round(temp)}°C`);
    }

    weatherScore = Math.max(0, weatherScore);

    // Daylight score
    let daylightScore = 100;
    const isDark = hour < sunriseHour || hour >= sunsetHour;
    const nearSunset = hour === sunsetHour - 1;

    if (isDark) {
      daylightScore = 55;
      if (hour < sunriseHour) reasons.push('Before sunrise');
      else reasons.push(`After sunset (${sunsetLabel})`);
    } else if (nearSunset) {
      daylightScore = 85;
    } else {
      reasons.push(`Plenty of daylight (until ${sunsetLabel})`);
    }

    if (holidayNote) reasons.push(`${holidayNote} — expect non-typical traffic`);

    // Composite score: car weighting
    const score = trafficScore * 0.5 + weatherScore * 0.3 + daylightScore * 0.2;
    const scoreBreakdown: DepartureWindow['scoreBreakdown'] = {
      traffic: trafficScore,
      weather: weatherScore,
      daylight: daylightScore,
    };

    windows.push({
      time,
      score: Math.round(score),
      scoreBreakdown,
      reasons: reasons.slice(0, 4),
      recommended: false,
      warning,
    });
  }

  const best = windows.filter((w) => w.score > 0).sort((a, b) => b.score - a.score)[0];
  if (best) best.recommended = true;

  return windows;
}
