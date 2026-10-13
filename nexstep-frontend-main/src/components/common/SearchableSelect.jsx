import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, CheckCircle2, X } from 'lucide-react';
import { matchOption } from '../../utils/profileFields.js';

/**
 * Dropdown with a search box — used wherever a list can be long
 * (universities, cities, programmes, careers, scholarships…).
 *
 * options: Array<string | { value, label, hint?, group? }>
 * value / onChange(value)
 * allowCustom: lets the user keep typed text that is not in the list (e.g. a college name)
 * allLabel: when set, adds a first option with value `allValue` (default 'All')
 */
export function SearchableSelect({
  options = [], value, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…',
  allLabel, allValue = 'All', allowCustom = false, disabled = false, id, ariaLabel, className = '',
  emptyText = 'No matches', maxVisible = 200, buttonClassName,
}) {
  const autoId = useId();
  const listId = `${id || autoId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const items = useMemo(() => {
    const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : { ...o, label: o.label ?? String(o.value) }));
    return allLabel ? [{ value: allValue, label: allLabel }, ...norm] : norm;
  }, [options, allLabel, allValue]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => `${o.label} ${o.hint || ''} ${o.value}`.toLowerCase().includes(q));
  }, [items, query]);

  const selected = matchOption(value, items);
  const showCustom = allowCustom && query.trim() && !items.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 256);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const below = r.bottom + 6;
      const maxH = 320;
      const top = below + maxH > window.innerHeight - 8 ? Math.max(8, r.top - maxH - 6) : below;
      setMenuPos({ top, left: Math.max(8, left), width });
    };
    place();
    const close = (e) => {
      if (rootRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', close);
    setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);
  useEffect(() => { setActive(0); }, [query, open]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (v) => { onChange?.(v); setOpen(false); setQuery(''); };
  const total = filtered.length + (showCustom ? 1 : 0);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(total - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < filtered.length && filtered[active]) choose(filtered[active].value);
      else if (showCustom) choose(query.trim());
    } else if (e.key === 'Escape') { setOpen(false); }
  };

  const label = selected ? selected.label : (value ? String(value) : '');

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName || 'w-full h-11 px-3 inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-start text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 cursor-pointer'}
      >
        <span className={`truncate ${label ? '' : 'text-slate-400'}`}>{label || placeholder}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          {allowCustom && value && (
            <span role="button" tabIndex={-1} aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange?.(''); }} className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="w-3.5 h-3.5" /></span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && createPortal(
        <div
          ref={listRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 220 }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <label className="relative block">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={`${listId}-${active}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-8 pr-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </label>
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.slice(0, maxVisible).map((o, i) => (
              <li
                key={`${o.value}-${i}`}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(o.value); }}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${i === active ? 'bg-slate-100 dark:bg-slate-800' : ''} ${o.value === value ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-slate-500">{o.hint}</span>}
                </span>
                {o.value === value && <Check className="w-4 h-4 shrink-0" />}
              </li>
            ))}
            {showCustom && (
              <li
                id={`${listId}-${filtered.length}`}
                data-idx={filtered.length}
                role="option"
                aria-selected={false}
                onMouseEnter={() => setActive(filtered.length)}
                onMouseDown={(e) => { e.preventDefault(); choose(query.trim()); }}
                className={`px-3 py-2 text-sm cursor-pointer text-slate-700 dark:text-slate-200 ${active === filtered.length ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                Use “{query.trim()}”
              </li>
            )}
            {filtered.length === 0 && !showCustom && <li className="px-3 py-3 text-sm text-slate-500">{emptyText}</li>}
            {filtered.length > maxVisible && <li className="px-3 py-2 text-xs text-slate-500">Showing {maxVisible} of {filtered.length} — type to narrow down.</li>}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

/** Small banner for pages that show demo content. */
export function SampleDataNotice({ show = true, lang }) {
  if (!show) return null;
  return (
    <p role="note" className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <span className="font-semibold shrink-0">{lang === 'ur' ? 'نمونہ ڈیٹا:' : 'Sample data:'}</span>
      <span>{lang === 'ur' ? 'یہ معلومات ڈیمو کے لیے ہیں۔ فیس، میرٹ اور آخری تاریخیں سرکاری ویب سائٹ پر ضرور چیک کریں۔' : 'some items are demo content. Check fees, cut-offs and deadlines on the official website before applying.'}</span>
    </p>
  );
}

export default SearchableSelect;

// ── Universities list shared by pickers (fetched once per page load) ──
let uniCache = null;
export function useUniversityOptions() {
  const [opts, setOpts] = useState(uniCache || []);
  useEffect(() => {
    if (uniCache) return;
    fetch('/api/universities').then((r) => r.json()).then((d) => {
      uniCache = (Array.isArray(d?.data) ? d.data : []).map((u) => ({ value: u.name, label: u.name, hint: [u.city, u.type].filter(Boolean).join(' · ') }));
      setOpts(uniCache);
    }).catch(() => {});
  }, []);
  return opts;
}

/** School / college / university field: pick a university from the list or type any other name. */
export function InstitutionPicker({ id, value, onChange, placeholder = 'Search universities or type your school / college', className }) {
  const options = useUniversityOptions();
  return (
    <SearchableSelect id={id} value={value} onChange={onChange} options={options} allowCustom className={className}
      placeholder={placeholder} searchPlaceholder="Type to search, or enter your school / college name" emptyText="Not in the list — keep typing to use your own" />
  );
}

/** Dropdown that renders in a portal so the list sits in front of neighbouring cards. */
export function SelectField({ id, label, value, onChange, options = [], placeholder = 'Select…', disabled, error, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const selected = matchOption(value, options);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = r.width;
      const below = r.bottom + 8;
      const maxH = 288;
      const top = below + maxH > window.innerHeight - 8 ? Math.max(8, r.top - maxH - 8) : below;
      setMenuPos({ top, left: r.left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <div ref={wrapRef} className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />}
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`ns-select w-full text-left ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all disabled:opacity-60 bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 flex items-center justify-between ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
          } ${!selected ? 'text-slate-400 dark:text-slate-500' : ''}`}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && createPortal(
          <>
            <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)} aria-hidden="true" />
            <ul
              role="listbox"
              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 210 }}
              className="rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-1.5 max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700"
            >
              {options.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body
        )}
      </div>
      {error && <p className="ns-input-error text-[11px] text-red-500 dark:text-red-400 font-semibold">{error}</p>}
    </div>
  );
}
