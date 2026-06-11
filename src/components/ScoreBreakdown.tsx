'use client';

import type { DepartureWindow } from '@/lib/types';

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-[#E8E0F0] rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

export default function ScoreBreakdown({ windows }: { windows: DepartureWindow[] }) {
  if (!windows.length) return null;

  return (
    <div className="bg-white border border-[#DDD6EE] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#9B8FB0] uppercase tracking-wider mb-4">
        Departure windows
      </h3>
      <div className="space-y-3">
        {[...windows].sort((a, b) => b.score - a.score).map((w) => (
          <div
            key={w.time}
            className={`rounded-lg p-3 border transition-colors ${
              w.recommended
                ? 'border-[#A0D8B8] bg-[#F0FBF4]'
                : 'border-[#DDD6EE] bg-[#F8F6FF]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#2D2540] text-sm">{w.time}</span>
                {w.recommended && (
                  <span className="text-xs bg-[#C8F0D8] text-[#1A5C3A] px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                {w.warning && (
                  <span className="text-xs bg-[#FAFAC8] text-[#7A7820] px-2 py-0.5 rounded-full">
                    {w.warning}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-[#2D2540]">{w.score}/100</span>
            </div>

            <div className="space-y-1.5 mb-2 text-xs text-[#6B5F80]">
              {w.scoreBreakdown.traffic !== undefined && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span>Traffic</span>
                    <span>{w.scoreBreakdown.traffic}</span>
                  </div>
                  <ScoreBar value={w.scoreBreakdown.traffic} color="bg-[#90B8E8]" />
                </div>
              )}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Daylight</span>
                  <span>{w.scoreBreakdown.daylight}</span>
                </div>
                <ScoreBar value={w.scoreBreakdown.daylight} color="bg-[#D8C840]" />
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Weather</span>
                  <span>{w.scoreBreakdown.weather}</span>
                </div>
                <ScoreBar value={w.scoreBreakdown.weather} color="bg-[#80C898]" />
              </div>
              {w.scoreBreakdown.elevation !== undefined && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span>Elevation</span>
                    <span>{w.scoreBreakdown.elevation}</span>
                  </div>
                  <ScoreBar value={w.scoreBreakdown.elevation} color="bg-[#B890D8]" />
                </div>
              )}
            </div>

            {w.reasons.length > 0 && (
              <ul className="text-xs text-[#6B5F80] space-y-0.5">
                {w.reasons.map((r, i) => (
                  <li key={i} className="flex gap-1">
                    <span className="text-[#9B8FB0]">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
