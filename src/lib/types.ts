export type TravelMode = 'car';

export interface TripRequest {
  origin: string;
  destination: string;
  date: string;
  mode: TravelMode;
  userId?: string;
  timeFrom?: number;
  timeTo?: number;
  clientHour?: number;
}

export interface DepartureWindow {
  time: string;
  score: number;
  scoreBreakdown: {
    traffic?: number;
    weather: number;
    daylight: number;
    elevation?: number;
  };
  reasons: string[];
  recommended: boolean;
  warning?: string;
}

export interface Stop {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  reason: string;
  distanceFromRoute?: number;
}

export interface LiveTraffic {
  delayMinutes: number;
  forHour: string;
  isLive: boolean;
}

export interface TripPlan {
  id?: string;
  origin: string;
  destination: string;
  date: string;
  mode: TravelMode;
  recommendedDeparture: string;
  departureReason: string;
  departureWindows: DepartureWindow[];
  stops: Stop[];
  narrative: string;
  duration: number;
  distance: number;
  liveTraffic?: LiveTraffic;
  rating?: number;
  createdAt?: string;
}

export interface UserPreferences {
  userId: string;
  modes: Partial<Record<TravelMode, ModePreferences>>;
  learnedPatterns?: string[];
  tripCount?: number;
}

export interface ModePreferences {
  preferScenic: boolean;
  avoidHills: boolean;
  stopTypes: string[];
  avgSpeed?: number;
}

export interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    precipitation: number[];
    weather_code: number[];
  };
}

export interface DaylightData {
  sunrise: string;
  sunset: string;
  date: string;
}

export interface TrafficData {
  duration: number;
  durationInTraffic: number;
  distance: number;
  congestionLevel?: string;
}

export interface ElevationPoint {
  distance: number;
  elevation: number;
}

export interface ElevationData {
  totalGain: number;
  totalLoss: number;
  profile: ElevationPoint[];
}

export interface POI {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  modes: TravelMode[];
  rating?: number;
  description?: string;
}

export interface TripEvent {
  id: string;
  name: string;
  type: string;
  date: string;
  location: { lat: number; lng: number };
  description?: string;
}
