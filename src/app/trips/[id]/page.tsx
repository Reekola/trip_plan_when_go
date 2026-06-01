'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Map from '@/components/Map';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import StopCard from '@/components/StopCard';
import type { TripPlan } from '@/lib/types';

function TripSkeleton() {
  return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="bg-slate-700 rounded-2xl h-40 w-full" />
      <div className="bg-slate-700 rounded-xl h-52 w-full" />
      <div className="bg-slate-700 rounded-xl h-28 w-full" />
    </div>
  );
}

function TripContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingDone, setRatingDone] = useState(false);

  useEffect(() => {
    const isNew = params.id === 'new' || params.id === 'compare';

    if (isNew) {
      const origin = searchParams.get('origin');
      const destination = searchParams.get('destination');
      const date = searchParams.get('date');
      const mode = searchParams.get('mode') ?? 'car';
      const compare = params.id === 'compare';

      if (!origin || !destination) {
        setError('Missing trip details — go back and try again.');
        setLoading(false);
        return;
      }

      fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, date, mode, compare }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Server error ${r.status}`);
          return r.json();
        })
        .then((data: TripPlan) => {
          setPlan(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      fetch(`/api/trips?id=${params.id}`)
        .then((r) => r.json())
        .then((data: TripPlan) => {
          setPlan(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [params.id, searchParams]);

  const handleRate = async (stars: number) => {
    if (!plan?.id) return;
    setRating(stars);
    await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rate', tripId: plan.id, rating: stars }),
    });
    setRatingDone(true);
  };

  if (loading) return <TripSkeleton />;
  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/" className="text-blue-400 hover:underline text-sm">
            ← Back to home
          </a>
        </div>
      </div>
    );
  if (!plan) return null;

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
      {/* Main column — reasoning is the hero */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
        {/* Recommended departure */}
        <div className="bg-blue-900/40 border border-blue-700/60 rounded-2xl p-6">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">
            Recommended departure
          </p>
          <h2 className="text-5xl font-bold text-white mb-3">{plan.recommendedDeparture}</h2>
          <p className="text-slate-300 text-lg leading-relaxed">{plan.departureReason}</p>
          <div className="flex gap-4 mt-4 text-sm text-slate-400">
            <span>{Math.round(plan.distance / 1000)} km</span>
            <span>·</span>
            <span>~{Math.round(plan.duration / 60)} min</span>
            <span>·</span>
            <span className="capitalize">{plan.mode}</span>
          </div>
        </div>

        {/* Score breakdown */}
        <ScoreBreakdown windows={plan.departureWindows} />

        {/* Narrative */}
        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Trip overview
          </h3>
          <p className="text-slate-200 leading-relaxed">{plan.narrative}</p>
        </div>

        {/* Stops */}
        {plan.stops.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Suggested stops
            </h3>
            <div className="space-y-3">
              {plan.stops.map((stop) => (
                <StopCard key={stop.id} stop={stop} />
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        {plan.id && (
          <div className="bg-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Rate this trip
            </h3>
            {ratingDone ? (
              <p className="text-slate-300 text-sm">Thanks — your preferences have been updated.</p>
            ) : (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleRate(s)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      rating && s <= rating ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map — supporting panel */}
      <div className="lg:w-[400px] h-64 lg:h-auto p-4 lg:p-0 lg:pt-4 lg:pr-4 lg:pb-4">
        <Map origin={plan.origin} destination={plan.destination} stops={plan.stops} />
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← New trip
        </a>
        <div className="flex gap-2">
          <a
            href="/history"
            className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            History
          </a>
          <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            Share
          </button>
          <button className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            Refresh
          </button>
        </div>
      </nav>
      <Suspense fallback={<TripSkeleton />}>
        <TripContent />
      </Suspense>
    </div>
  );
}
