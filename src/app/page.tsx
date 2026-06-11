'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LocationInput from '@/components/LocationInput';

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [timeWindow, setTimeWindow] = useState<{ from: number; to: number } | null>(null);

  const currentHour = new Date().getHours();
  const isToday = date === today;

  const TIME_WINDOWS = [
    { label: 'Morning', sub: '06–10', from: 6, to: 10 },
    { label: 'Midday', sub: '10–14', from: 10, to: 14 },
    { label: 'Afternoon', sub: '14–18', from: 14, to: 18 },
    { label: 'Evening', sub: '18–21', from: 18, to: 21 },
  ] as const;

  const isWindowPast = (w: typeof TIME_WINDOWS[number]) =>
    isToday && currentHour >= w.to;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    // deselect window if it becomes past on the new date
    if (timeWindow) {
      const newIsToday = newDate === today;
      if (newIsToday && currentHour >= timeWindow.to) setTimeWindow(null);
    }
  };

  const canSubmit = origin.trim() && destination.trim() && !loading;

  const handlePlan = () => {
    if (!canSubmit) return;
    setLoading(true);
    const p = new URLSearchParams({ origin, destination, date, mode: 'car' });
    if (timeWindow) {
      p.set('timeFrom', timeWindow.from.toString());
      p.set('timeTo', timeWindow.to.toString());
    }
    router.push(`/trips/new?${p}`);
  };

return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img src="/api/logo" alt="WhenGo" className="w-44 h-44 object-contain" />
          </div>
          <p className="text-[#6B5F80] text-lg">
            AI trip planning that reasons over traffic, weather, daylight, and elevation.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#DDD6EE] space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6B5F80] mb-1">From</label>
            <LocationInput
              value={origin}
              onChange={setOrigin}
              onKeyDown={(e) => e.key === 'Enter' && handlePlan()}
              placeholder="Starting point"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5F80] mb-1">To</label>
            <LocationInput
              value={destination}
              onChange={setDestination}
              onKeyDown={(e) => e.key === 'Enter' && handlePlan()}
              placeholder="Destination"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5F80] mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-[#F0EDF8] text-[#2D2540] rounded-lg px-4 py-3 border border-[#DDD6EE] focus:outline-none focus:ring-2 focus:ring-[#C0D8F8] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5F80] mb-2">
              Departure window
              <span className="ml-2 font-normal text-[#9B8FB0]">(optional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_WINDOWS.map((w) => {
                const active = timeWindow?.from === w.from && timeWindow?.to === w.to;
                const past = isWindowPast(w);
                return (
                  <button
                    key={w.label}
                    type="button"
                    disabled={past}
                    onClick={() => !past && setTimeWindow(active ? null : { from: w.from, to: w.to })}
                    className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-sm font-medium transition-colors ${
                      past
                        ? 'bg-[#F0EDF8] border-[#DDD6EE] text-[#C0B8D0] cursor-not-allowed opacity-50'
                        : active
                        ? 'bg-[#C0D8F8] border-[#7AACEC] text-[#1A3A5C]'
                        : 'bg-[#F0EDF8] border-[#DDD6EE] text-[#6B5F80] hover:bg-[#E6E2F4]'
                    }`}
                  >
                    <span>{w.label}</span>
                    <span className="text-xs opacity-70 mt-0.5">{w.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handlePlan}
              disabled={!canSubmit}
              className="flex-1 bg-[#C0D8F8] hover:bg-[#A8C8F0] disabled:opacity-40 disabled:cursor-not-allowed text-[#1A3A5C] font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Planning…' : 'Plan trip'}
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-6 text-sm text-[#9B8FB0]">
          <a href="/history" className="hover:text-[#6B5F80] transition-colors">
            Trip history
          </a>
          <a href="/preferences" className="hover:text-[#6B5F80] transition-colors">
            Preferences
          </a>
        </div>
      </div>
    </main>
  );
}
