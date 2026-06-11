'use client';

import { useEffect, useState } from 'react';
import type { TripPlan } from '@/lib/types';

const MODE_EMOJI: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', bicycle: '🚲', walk: '🚶',
};

export default function HistoryPage() {
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetch('/api/trips')
      .then((r) => r.json())
      .then((data) => {
        setTrips(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function clearHistory() {
    if (!confirm('Delete all trip history?')) return;
    setClearing(true);
    await fetch('/api/trips', { method: 'DELETE' });
    setTrips([]);
    setClearing(false);
  }

  return (
    <div className="min-h-screen bg-[#F7F4FF] text-[#2D2540]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#DDD6EE] bg-white">
        <a href="/" className="text-[#6B5F80] hover:text-[#2D2540] text-sm transition-colors">
          ← Home
        </a>
        <h1 className="text-sm font-medium text-[#2D2540]">Trip history</h1>
        <button
          onClick={clearHistory}
          disabled={clearing || trips.length === 0}
          className="text-sm text-red-400 hover:text-red-500 disabled:opacity-30 transition-colors"
        >
          {clearing ? 'Clearing…' : 'Clear all'}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#EAE6F5] rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-center py-20 text-[#9B8FB0]">
            <p className="text-4xl mb-4">🗺️</p>
            <p>No trips yet — plan your first one.</p>
            <a href="/" className="text-[#5080B0] hover:underline text-sm mt-2 inline-block">
              Plan a trip
            </a>
          </div>
        )}

        <div className="space-y-3">
          {trips.map((trip) => (
            <a
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="block bg-white border border-[#DDD6EE] rounded-xl p-4 hover:border-[#B0A0D0] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-[#2D2540] truncate">
                    {trip.origin} → {trip.destination}
                  </p>
                  <p className="text-sm text-[#6B5F80] mt-0.5">{trip.date}</p>
                  <p className="text-xs text-[#9B8FB0] mt-1 line-clamp-1">{trip.departureReason}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xl">{MODE_EMOJI[trip.mode] ?? '🗺️'}</span>
                  <span className="text-xs text-[#6B5F80]">{trip.recommendedDeparture}</span>
                  {trip.rating && (
                    <span className="text-xs text-[#D0A020]">{'★'.repeat(trip.rating)}</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
