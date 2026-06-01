'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModeSelector from '@/components/ModeSelector';
import type { TravelMode } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<TravelMode>('car');
  const [loading, setLoading] = useState(false);

  const canSubmit = origin.trim() && destination.trim() && !loading;

  const handlePlan = () => {
    if (!canSubmit) return;
    setLoading(true);
    const p = new URLSearchParams({ origin, destination, date, mode });
    router.push(`/trips/new?${p}`);
  };

  const handleCompare = () => {
    if (!canSubmit) return;
    setLoading(true);
    const p = new URLSearchParams({ origin, destination, date });
    router.push(`/trips/compare?${p}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            When should you leave?
          </h1>
          <p className="text-slate-400 text-lg">
            AI trip planning that reasons over traffic, weather, daylight, and elevation.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">From</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlan()}
              placeholder="Starting point"
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlan()}
              placeholder="Destination"
              className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Travel mode</label>
            <ModeSelector selected={mode} onChange={setMode} />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handlePlan}
              disabled={!canSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Planning…' : 'Plan trip'}
            </button>
            <button
              onClick={handleCompare}
              disabled={!canSubmit}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Compare modes
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-6 text-sm text-slate-500">
          <a href="/history" className="hover:text-slate-300 transition-colors">
            Trip history
          </a>
          <a href="/preferences" className="hover:text-slate-300 transition-colors">
            Preferences
          </a>
        </div>
      </div>
    </main>
  );
}
