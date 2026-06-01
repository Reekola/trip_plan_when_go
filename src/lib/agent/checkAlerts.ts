export interface Alert {
  type: 'traffic' | 'weather' | 'closure';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export async function checkAlerts(
  origin: string,
  destination: string,
  date: string
): Promise<Alert[]> {
  // TODO: integrate TomTom Incidents API + Open-Meteo severe weather alerts
  void origin; void destination; void date;
  return [];
}
