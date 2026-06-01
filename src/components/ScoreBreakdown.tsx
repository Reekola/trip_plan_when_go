'use client';

import type { DepartureWindow } from '@/lib/types';

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5">
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
    <div className="bg-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Departure windows
      </h3>
      <div className="space-y-3">
        {windows.map((w) => (
          <div
            key={w.time}
            className={`rounded-lg p-3 border transition-colors ${
              w.recommended
                ? 'border-blue-600 bg-blue-900/20'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{w.time}</span>
                {w.recommended && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                {w.warning && (
                  <span className="text-xs bg-amber-700/50 text-amber-300 px-2 py-0.5 rounded-full">
                    {w.warning}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-white">{w.score}/100</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-xs text-slate-400">
              {w.scoreBreakdown.traffic !== undefined && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span>Traffic</span>
                    <span>{w.scoreBreakdown.traffic}</span>
                  </div>
                  <ScoreBar value={w.scoreBreakdown.traffic} color="bg-blue-500" />
                </div>
              )}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Weather</span>
                  <span>{w.scoreBreakdown.weather}</span>
                </div>
                <ScoreBar value={w.scoreBreakdown.weather} color="bg-green-500" />
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span>Daylight</span>
                  <span>{w.scoreBreakdown.daylight}</span>
                </div>
                <ScoreBar value={w.scoreBreakdown.daylight} color="bg-yellow-500" />
              </div>
              {w.scoreBreakdown.elevation !== undefined && (
                <div>
                  <div className="flex justify-between mb-0.5">
                    <span>Elevation</span>
                    <span>{w.scoreBreakdown.elevation}</span>
                  </div>
                  <ScoreBar value={w.scoreBreakdown.elevation} color="bg-orange-500" />
                </div>
              )}
            </div>

            {w.reasons.length > 0 && (
              <ul className="text-xs text-slate-400 space-y-0.5">
                {w.reasons.map((r, i) => (
                  <li key={i} className="flex gap-1">
                    <span className="text-slate-500">·</span>
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
