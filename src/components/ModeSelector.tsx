'use client';

import type { TravelMode } from '@/lib/types';

const MODES: { value: TravelMode; label: string; emoji: string }[] = [
  { value: 'car', label: 'Car', emoji: '🚗' },
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
              ? 'bg-[#C0D8F8] border-[#A0C0F0] text-[#1A3A5C]'
              : 'bg-[#F0EDF8] border-[#DDD6EE] text-[#6B5F80] hover:bg-[#EAE6F5]'
          }`}
        >
          <span className="text-xl mb-1">{emoji}</span>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
