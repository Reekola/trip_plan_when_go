export interface HolidayInfo {
  name: string;
  countryCode: string;
  isEve: boolean;      // day before holiday starts
  isEve2: boolean;     // 2 days before holiday starts
  isReturn: boolean;   // day after holiday ends
}

export async function fetchHoliday(date: string, countryCode: string): Promise<HolidayInfo | null> {
  const d = new Date(date);
  const addDays = (base: Date, n: number) => {
    const r = new Date(base); r.setDate(r.getDate() + n); return r.toISOString().split('T')[0];
  };

  const tomorrow = addDays(d, 1);
  const dayAfterTomorrow = addDays(d, 2);
  const yesterday = addDays(d, -1);

  const yearsNeeded = [...new Set([date, tomorrow, dayAfterTomorrow, yesterday].map((s) => s.split('-')[0]))];

  try {
    const allHolidays = (
      await Promise.all(
        yearsNeeded.map((y) =>
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode}`, {
            cache: 'no-store',
          })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      )
    ).flat() as { date: string; localName: string; name: string }[];

    const holidayDates = new Set(allHolidays.map((h) => h.date));
    const getName = (d: string) => {
      const h = allHolidays.find((x) => x.date === d);
      return h ? (h.localName || h.name) : '';
    };

    // Today is a holiday
    if (holidayDates.has(date)) {
      return { name: getName(date), countryCode, isEve: false, isEve2: false, isReturn: false };
    }

    // Tomorrow is a holiday (eve)
    if (holidayDates.has(tomorrow)) {
      return { name: getName(tomorrow), countryCode, isEve: true, isEve2: false, isReturn: false };
    }

    // Day after tomorrow is a holiday (2 days before)
    if (holidayDates.has(dayAfterTomorrow)) {
      return { name: getName(dayAfterTomorrow), countryCode, isEve: false, isEve2: true, isReturn: false };
    }

    // Yesterday was a holiday and today is not — return traffic, but only on weekdays
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (holidayDates.has(yesterday) && !holidayDates.has(date) && !isWeekend) {
      return { name: getName(yesterday), countryCode, isEve: false, isEve2: false, isReturn: true };
    }

    return null;
  } catch {
    return null;
  }
}
