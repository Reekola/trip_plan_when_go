import type { Metadata } from 'next';
import type { TripPlan } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Trip plan ${id} — Trip Planner`,
  };
}

async function getTripPlan(id: string): Promise<TripPlan | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/trips?id=${id}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getTripPlan(id);

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#F7F4FF] text-[#2D2540] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9B8FB0]">Trip not found.</p>
          <a href="/" className="text-[#5080B0] hover:underline text-sm mt-2 inline-block">
            Plan a new trip
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4FF] text-[#2D2540]">
      <nav className="px-6 py-4 border-b border-[#DDD6EE] bg-white">
        <a href="/" className="text-sm text-[#5080B0] hover:underline">
          Plan your own trip →
        </a>
      </nav>
      <div className="max-w-2xl mx-auto p-6 space-y-5">
        <div className="bg-[#EBF4FF] border border-[#B0CCEE] rounded-2xl p-6">
          <p className="text-xs font-semibold text-[#4070A0] uppercase tracking-widest mb-2">
            Recommended departure
          </p>
          <h2 className="text-4xl font-bold text-[#2D2540] mb-3">{plan.recommendedDeparture}</h2>
          <p className="text-[#4D4560] leading-relaxed">{plan.departureReason}</p>
          <p className="text-sm text-[#9B8FB0] mt-3">
            {plan.origin} → {plan.destination} · {plan.date} · {plan.mode}
          </p>
        </div>

        <div className="bg-white border border-[#DDD6EE] rounded-xl p-5">
          <p className="text-[#2D2540] leading-relaxed">{plan.narrative}</p>
        </div>
      </div>
    </div>
  );
}
