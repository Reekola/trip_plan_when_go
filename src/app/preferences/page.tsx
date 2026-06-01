'use client';

import { useEffect, useState } from 'react';
import type { TravelMode, UserPreferences } from '@/lib/types';

const MODES: TravelMode[] = ['car', 'motorcycle', 'bicycle', 'walk'];
const MODE_EMOJI: Record<TravelMode, string> = {
  car: '🚗', motorcycle: '🏍️', bicycle: '🚲', walk: '🚶',
};

const STOP_TYPE_OPTIONS = [
  { value: 'cafe', label: 'Cafés' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'viewpoint', label: 'Viewpoints' },
  { value: 'fuel', label: 'Fuel stops' },
  { value: 'rest_area', label: 'Rest areas' },
  { value: 'supermarket', label: 'Shops' },
];

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/trips?action=preferences')
      .then((r) => r.json())
      .then((data) => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => {
        setPrefs({
          userId: 'demo-user',
          modes: {},
          learnedPatterns: [],
          tripCount: 0,
        });
        setLoading(false);
      });
  }, []);

  const getModePrefs = (mode: TravelMode) =>
    prefs?.modes[mode] ?? { preferScenic: false, avoidHills: false, stopTypes: [] };

  const updateModePrefs = (
    mode: TravelMode,
    update: Partial<ReturnType<typeof getModePrefs>>
  ) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      modes: {
        ...prefs.modes,
        [mode]: { ...getModePrefs(mode), ...update },
      },
    });
  };

  const toggleStopType = (mode: TravelMode, type: string) => {
    const current = getModePrefs(mode).stopTypes;
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    updateModePrefs(mode, { stopTypes: next });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'savePreferences', preferences: prefs }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Home
        </a>
        <h1 className="text-sm font-medium text-slate-300">Preferences</h1>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {prefs?.learnedPatterns && prefs.learnedPatterns.length > 0 && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">
              What the agent has learned about you
            </p>
            <ul className="space-y-1">
              {prefs.learnedPatterns.map((p, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-blue-500">·</span>
                  {p}
                </li>
              ))}
            </ul>
            {prefs.tripCount !== undefined && (
              <p className="text-xs text-slate-500 mt-3">Based on {prefs.tripCount} trips</p>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl h-40 animate-pulse" />
            ))}
          </div>
        )}

        {!loading &&
          MODES.map((mode) => {
            const mp = getModePrefs(mode);
            return (
              <div key={mode} className="bg-slate-800 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">{MODE_EMOJI[mode]}</span>
                  <span className="capitalize">{mode}</span>
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Prefer scenic routes</span>
                    <button
                      onClick={() => updateModePrefs(mode, { preferScenic: !mp.preferScenic })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        mp.preferScenic ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          mp.preferScenic ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>

                  {(mode === 'bicycle' || mode === 'walk') && (
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Avoid hills</span>
                      <button
                        onClick={() => updateModePrefs(mode, { avoidHills: !mp.avoidHills })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          mp.avoidHills ? 'bg-blue-600' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            mp.avoidHills ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </label>
                  )}

                  <div>
                    <p className="text-sm text-slate-400 mb-2">Preferred stops</p>
                    <div className="flex flex-wrap gap-2">
                      {STOP_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => toggleStopType(mode, opt.value)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            mp.stopTypes.includes(opt.value)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {!loading && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save preferences'}
          </button>
        )}
      </div>
    </div>
  );
}
