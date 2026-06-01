'use client';

import type { Stop } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  cafe: 'Café',
  restaurant: 'Restaurant',
  fuel: 'Fuel',
  viewpoint: 'Viewpoint',
  rest_area: 'Rest area',
  bike_parking: 'Bike parking',
  supermarket: 'Shop',
};

export default function StopCard({ stop }: { stop: Stop }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-4">
      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
        {stop.type === 'cafe' ? '☕' : stop.type === 'viewpoint' ? '🌄' : stop.type === 'fuel' ? '⛽' : '📍'}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-white text-sm truncate">{stop.name}</span>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {TYPE_LABELS[stop.type] ?? stop.type}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{stop.reason}</p>
      </div>
    </div>
  );
}
