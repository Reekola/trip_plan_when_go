'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Suggestion {
  label: string;
  main: string;
  secondary: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  id?: string;
}

export default function LocationInput({ value, onChange, onKeyDown, placeholder, id }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: Suggestion[]) => {
        setSuggestions(data);
        setOpen(data.length > 0);
        setActive(-1);
      })
      .catch(() => { setSuggestions([]); setOpen(false); });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(v), 280);
  };

  const pick = (s: Suggestion) => {
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); return; }
      if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(suggestions[active]); return; }
      if (e.key === 'Escape') { setOpen(false); setActive(-1); return; }
    }
    onKeyDown?.(e);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-[#F0EDF8] text-[#2D2540] placeholder-[#9B8FB0] rounded-lg px-4 py-3 border border-[#DDD6EE] focus:outline-none focus:ring-2 focus:ring-[#C0D8F8] focus:border-transparent"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-[#DDD6EE] rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s.label}
              onMouseDown={() => pick(s)}
              className={`px-4 py-3 cursor-pointer flex flex-col transition-colors ${
                i === active ? 'bg-[#EEF3FF]' : 'hover:bg-[#F4F0FF]'
              }`}
            >
              <span className="text-sm font-medium text-[#2D2540]">{s.main}</span>
              {s.secondary && (
                <span className="text-xs text-[#9B8FB0] mt-0.5">{s.secondary}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
