'use client';

import type { TravelMode } from '@/lib/types';

const MODES: { value: TravelMode; label: string; emoji: string }[] = [
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'motorcycle', label: 'Moto', emoji: '🏍️' },
  { value: 'bicycle', label: 'Bike', emoji: '🚲' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
];

export default function ModeSelector({
  selected,
  onChange,
}: {
  selected: TravelMode;
  onChange: (mode: TravelMode) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MODES.map(({ value, label, emoji }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all ${
            selected === value
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <span className="text-xl mb-1">{emoji}</span>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
