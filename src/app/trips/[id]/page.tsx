'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Map from '@/components/Map';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import StopCard from '@/components/StopCard';
import type { TripPlan } from '@/lib/types';

const PLANNING_STEPS = [
  { label: 'Finding locations', detail: 'Geocoding origin and destination' },
  { label: 'Fetching traffic data', detail: 'Checking each departure hour via Routes API' },
  { label: 'Detecting public holidays', detail: 'Scanning transit countries along the route' },
  { label: 'Reading weather forecast', detail: 'Hourly forecast for your travel date' },
  { label: 'Scoring departure windows', detail: 'Ranking by traffic, weather and daylight' },
  { label: 'Finding stops', detail: 'Cafes, restaurants and fuel along the way' },
  { label: 'Writing trip summary', detail: 'AI narrative via Gemini' },
] as const;

const STEP_DELAYS = [0, 1400, 3200, 5400, 7200, 9000, 11500];

function PlanningProgress({ step }: { step: number }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 25000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-full max-w-sm space-y-3">
        <p className="text-sm font-semibold text-[#9B8FB0] uppercase tracking-widest mb-6 text-center">
          Planning your trip
        </p>
        {PLANNING_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className={`flex items-start gap-3 transition-opacity duration-300 ${i > step + 1 ? 'opacity-30' : 'opacity-100'}`}>
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center flex-shrink-0">
                {done ? (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <svg className="w-5 h-5 text-[#5080C0] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#DDD6EE] mt-1.5" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${active ? 'text-[#2D2540]' : done ? 'text-[#6B5F80]' : 'text-[#9B8FB0]'}`}>
                  {s.label}
                </p>
                {active && (
                  <p className="text-xs text-[#9B8FB0] mt-0.5">{s.detail}</p>
                )}
              </div>
            </div>
          );
        })}
        {slow && (
          <p className="text-xs text-[#9B8FB0] text-center pt-4">
            Taking longer than expected — fetching live traffic data…
          </p>
        )}
      </div>
    </div>
  );
}

function TripSkeleton() {
  return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="bg-[#EAE6F5] rounded-2xl h-40 w-full" />
      <div className="bg-[#EAE6F5] rounded-xl h-52 w-full" />
      <div className="bg-[#EAE6F5] rounded-xl h-28 w-full" />
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
  const [mapExpanded, setMapExpanded] = useState(false);
  const [planningStep, setPlanningStep] = useState(0);

  const isNew = params.id === 'new' || params.id === 'compare';

  useEffect(() => {
    if (!isNew) return;
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setPlanningStep(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isNew]);

  useEffect(() => {
    const isNew = params.id === 'new' || params.id === 'compare';

    if (isNew) {
      const origin = searchParams.get('origin');
      const destination = searchParams.get('destination');
      const date = searchParams.get('date');
      const mode = searchParams.get('mode') ?? 'car';
      const compare = params.id === 'compare';
      const timeFrom = searchParams.get('timeFrom') ? Number(searchParams.get('timeFrom')) : undefined;
      const timeTo = searchParams.get('timeTo') ? Number(searchParams.get('timeTo')) : undefined;

      if (!origin || !destination) {
        setError('Missing trip details — go back and try again.');
        setLoading(false);
        return;
      }

      fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, date, mode, compare, timeFrom, timeTo, clientHour: new Date().getHours() }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({})) as { error?: string };
            throw new Error(body.error ?? `Server error ${r.status}`);
          }
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

  if (loading) return isNew ? <PlanningProgress step={planningStep} /> : <TripSkeleton />;
  if (error)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/" className="text-[#5080B0] hover:underline text-sm">
            ← Back to home
          </a>
        </div>
      </div>
    );
  if (!plan) return null;

  const timeFrom = searchParams.get('timeFrom') ? Number(searchParams.get('timeFrom')) : undefined;
  const timeTo = searchParams.get('timeTo') ? Number(searchParams.get('timeTo')) : undefined;
  const windowLabel = timeFrom != null && timeTo != null
    ? (() => {
        const names: Record<string, string> = { '6-10': 'Morning', '10-14': 'Midday', '14-18': 'Afternoon', '18-21': 'Evening' };
        return names[`${timeFrom}-${timeTo}`] ?? `${timeFrom}:00–${timeTo}:00`;
      })()
    : null;

  const formattedDate = plan.date
    ? new Date(plan.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
      {/* Route query header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D2540] flex items-center gap-2 flex-wrap">
          <span className="capitalize">{plan.origin}</span>
          <span className="text-[#9B8FB0]">→</span>
          <span className="capitalize">{plan.destination}</span>
        </h1>
        <p className="text-sm text-[#9B8FB0] mt-1">
          {formattedDate}
          {windowLabel && <span> · {windowLabel}</span>}
        </p>
      </div>

      {/* Traffic indicator banner */}
      {plan.liveTraffic && (() => {
        const { delayMinutes, forHour, isLive } = plan.liveTraffic;
        const heavy = delayMinutes > 15;
        const moderate = delayMinutes > 5;
        const colorCls = heavy
          ? 'bg-red-50 border-red-200 text-red-700'
          : moderate
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700';
        const dotCls = heavy ? 'bg-red-500' : moderate ? 'bg-amber-500' : 'bg-emerald-500';

        const message = isLive
          ? (delayMinutes > 5
              ? `Live traffic now: +${delayMinutes} min delay on your route`
              : 'Live traffic now: roads are clear on your route')
          : (delayMinutes > 5
              ? `Historically +${delayMinutes} min delay expected at ${forHour} on this day`
              : `Roads typically clear at ${forHour} on this day`);

        const label = isLive ? `as of ${forHour}` : 'based on historical data';

        return (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border ${colorCls}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'animate-pulse' : ''} ${dotCls}`} />
            <span>{message}</span>
            <span className="ml-auto opacity-60 font-normal whitespace-nowrap">{label}</span>
          </div>
        );
      })()}

      {/* Top row: departure card + map */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <div className="flex-1 bg-[#EBF4FF] border border-[#B0CCEE] rounded-2xl p-6">
          <p className="text-xs font-semibold text-[#4070A0] uppercase tracking-widest mb-2">
            Recommended departure
          </p>
          <h2 className="text-5xl font-bold text-[#2D2540] mb-3">{plan.recommendedDeparture}</h2>
          <p className="text-[#4D4560] text-lg leading-relaxed">{plan.departureReason}</p>
          <div className="flex gap-4 mt-4 text-sm text-[#6B5F80]">
            <span>{Math.round(plan.distance / 1000)} km</span>
            <span>·</span>
            <span>~{Math.round(plan.duration / 60)} min</span>
            <span>·</span>
            <span className="capitalize">{plan.mode}</span>
          </div>
        </div>

        <div className="relative h-56 lg:h-auto lg:w-[420px] rounded-2xl overflow-hidden flex-shrink-0">
          <Map origin={plan.origin} destination={plan.destination} stops={plan.stops} />
          <button
            onClick={() => setMapExpanded(true)}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white text-[#2D2540] rounded-lg p-1.5 shadow transition-colors"
            title="Expand map"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full-screen map overlay */}
      {mapExpanded && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setMapExpanded(false)}>
          <div className="relative w-full max-w-5xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Map origin={plan.origin} destination={plan.destination} stops={plan.stops} />
            <button
              onClick={() => setMapExpanded(false)}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-[#2D2540] rounded-lg p-2 shadow transition-colors"
              title="Close map"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Two-column: departure windows + sidebar */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left: departure windows */}
        <div className="flex-1 min-w-0">
          <ScoreBreakdown windows={plan.departureWindows} />
        </div>

        {/* Right: overview + stops + rating */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="bg-white border border-[#DDD6EE] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-[#9B8FB0] uppercase tracking-widest mb-3">
              Trip overview
            </h3>
            <p className="text-[#2D2540] leading-relaxed text-sm">{plan.narrative}</p>
          </div>

          {plan.stops.length > 0 && (
            <div className="bg-white border border-[#DDD6EE] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#9B8FB0] uppercase tracking-widest mb-3">
                Suggested stops
              </h3>
              <div className="space-y-3">
                {plan.stops.map((stop) => (
                  <StopCard key={stop.id} stop={stop} />
                ))}
              </div>
            </div>
          )}

          {plan.id && (
            <div className="bg-white border border-[#DDD6EE] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#9B8FB0] uppercase tracking-widest mb-3">
                Rate this trip
              </h3>
              {ratingDone ? (
                <p className="text-[#6B5F80] text-sm">Thanks — your preferences have been updated.</p>
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
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F4FF] text-[#2D2540]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#DDD6EE] bg-white flex-shrink-0">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/api/logo" alt="WhenGo" className="w-8 h-8 object-contain" />
          <span className="text-sm text-[#6B5F80] hover:text-[#2D2540] transition-colors">← New trip</span>
        </a>
        <div className="flex gap-2">
          <a
            href="/history"
            className="text-sm text-[#6B5F80] hover:text-[#2D2540] px-3 py-1.5 rounded-lg hover:bg-[#EAE6F5] transition-colors"
          >
            History
          </a>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#6B5F80] hover:text-[#2D2540] px-3 py-1.5 rounded-lg hover:bg-[#EAE6F5] transition-colors"
          >
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
