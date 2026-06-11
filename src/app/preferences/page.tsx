'use client';

import { useEffect, useState } from 'react';
import type { UserPreferences } from '@/lib/types';

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

  const getModePrefs = () =>
    prefs?.modes['car'] ?? { preferScenic: false, avoidHills: false, stopTypes: [] };

  const updateModePrefs = (update: Partial<ReturnType<typeof getModePrefs>>) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      modes: { car: { ...getModePrefs(), ...update } },
    });
  };

  const toggleStopType = (type: string) => {
    const current = getModePrefs().stopTypes;
    const next = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
    updateModePrefs({ stopTypes: next });
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
    <div className="min-h-screen bg-[#F7F4FF] text-[#2D2540]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#DDD6EE] bg-white">
        <a href="/" className="text-[#6B5F80] hover:text-[#2D2540] text-sm transition-colors">
          ← Home
        </a>
        <h1 className="text-sm font-medium text-[#2D2540]">Preferences</h1>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {prefs?.learnedPatterns && prefs.learnedPatterns.length > 0 && (
          <div className="bg-[#EBF4FF] border border-[#B0CCEE] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#4070A0] uppercase tracking-widest mb-2">
              What the agent has learned about you
            </p>
            <ul className="space-y-1">
              {prefs.learnedPatterns.map((p, i) => (
                <li key={i} className="text-sm text-[#2D2540] flex gap-2">
                  <span className="text-[#7090B0]">·</span>
                  {p}
                </li>
              ))}
            </ul>
            {prefs.tripCount !== undefined && (
              <p className="text-xs text-[#9B8FB0] mt-3">Based on {prefs.tripCount} trips</p>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#EAE6F5] rounded-xl h-40 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (() => {
          const mp = getModePrefs();
          return (
            <div className="bg-white rounded-xl p-5 border border-[#DDD6EE]">

              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-[#6B5F80]">Prefer scenic routes</span>
                  <button
                    onClick={() => updateModePrefs({ preferScenic: !mp.preferScenic })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      mp.preferScenic ? 'bg-[#C0D8F8]' : 'bg-[#DDD6EE]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        mp.preferScenic ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                <div>
                  <p className="text-sm text-[#9B8FB0] mb-2">Preferred stops</p>
                  <div className="flex flex-wrap gap-2">
                    {STOP_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => toggleStopType(opt.value)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          mp.stopTypes.includes(opt.value)
                            ? 'bg-[#C0D8F8] border-[#A0C0F0] text-[#1A3A5C]'
                            : 'bg-[#F0EDF8] border-[#DDD6EE] text-[#6B5F80] hover:bg-[#EAE6F5]'
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
        })()}

        {!loading && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#C0D8F8] hover:bg-[#A8C8F0] disabled:opacity-50 text-[#1A3A5C] font-semibold py-3 rounded-xl transition-colors"
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save preferences'}
          </button>
        )}
      </div>
    </div>
  );
}
