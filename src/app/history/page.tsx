'use client';

import { useEffect, useState } from 'react';
import type { TripPlan } from '@/lib/types';

const MODE_EMOJI: Record<string, string> = {
  car: '🚗', motorcycle: '🏍️', bicycle: '🚲', walk: '🚶',
};

export default function HistoryPage() {
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trips')
      .then((r) => r.json())
      .then((data) => {
        setTrips(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Home
        </a>
        <h1 className="text-sm font-medium text-slate-300">Trip history</h1>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-4">🗺️</p>
            <p>No trips yet — plan your first one.</p>
            <a href="/" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
              Plan a trip
            </a>
          </div>
        )}

        <div className="space-y-3">
          {trips.map((trip) => (
            <a
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">
                    {trip.origin} → {trip.destination}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">{trip.date}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{trip.departureReason}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xl">{MODE_EMOJI[trip.mode] ?? '🗺️'}</span>
                  <span className="text-xs text-slate-400">{trip.recommendedDeparture}</span>
                  {trip.rating && (
                    <span className="text-xs text-yellow-400">{'★'.repeat(trip.rating)}</span>
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
