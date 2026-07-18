/**
 * CommandPalette — ⌘K global search overlay
 *
 * Features:
 *  - Keyboard shortcut ⌘K / Ctrl+K to open/close
 *  - Instant static navigation results (pages, actions)
 *  - Live debounced search against reconciliation API (suppliers / invoices / GSTINs)
 *  - Full keyboard navigation (↑ ↓ Enter Esc)
 *  - Categorised result groups with icons
 *  - Themed to match project's navy/blue design system
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, LayoutDashboard, Upload, GitMerge,
  AlertTriangle, Network, FileBarChart2, ClipboardList,
  ShieldAlert, Settings, Loader2, FileWarning, FileMinus,
  CheckCircle2, XCircle, Hash, ChevronRight, Command,
} from 'lucide-react';
import { reconApi } from '../services/api';

// ── Static navigation items ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'n-overview',   label: 'Overview',          desc: 'Dashboard & KPIs',               icon: LayoutDashboard, path: '/dashboard',                group: 'Pages' },
  { id: 'n-upload',     label: 'Data Upload',        desc: 'Upload PR & GSTR-2B files',      icon: Upload,          path: '/dashboard/upload',          group: 'Pages' },
  { id: 'n-recon',      label: 'Reconciliation',    desc: 'Invoice matching table',          icon: GitMerge,        path: '/dashboard/reconciliation',  group: 'Pages' },
  { id: 'n-mismatch',   label: 'Mismatch Analysis', desc: 'Partial & missing invoices',     icon: FileWarning,     path: '/dashboard/mismatch',        group: 'Pages' },
  { id: 'n-fraud',      label: 'Fraud Detection',   desc: 'Risk scoring & flagged entities',icon: ShieldAlert,     path: '/dashboard/fraud',           group: 'Pages' },
  { id: 'n-graph',      label: 'Graph Explorer',    desc: 'Supplier network map',            icon: Network,         path: '/dashboard/graph',           group: 'Pages' },
  { id: 'n-cases',      label: 'Fraud Cases',       desc: 'Open investigation cases',        icon: ClipboardList,   path: '/dashboard/cases',           group: 'Pages' },
  { id: 'n-reports',    label: 'Reports',           desc: 'GST compliance reports',          icon: FileBarChart2,   path: '/dashboard/reports',         group: 'Pages' },
  { id: 'n-audit',      label: 'Audit Trail',       desc: 'Activity log',                   icon: ClipboardList,   path: '/dashboard/audit',           group: 'Pages' },
  { id: 'n-settings',   label: 'Settings',          desc: 'Account & preferences',           icon: Settings,        path: '/dashboard/settings',        group: 'Pages' },
];

const STATUS_META = {
  Exact:     { icon: CheckCircle2, dot: '#16A34A', badge: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  Partial:   { icon: AlertTriangle,dot: '#D97706', badge: 'bg-amber-900/40 text-amber-300 border-amber-700/50'  },
  Missing:   { icon: XCircle,      dot: '#DC2626', badge: 'bg-red-900/40 text-red-300 border-red-700/50'        },
  Duplicate: { icon: FileWarning,  dot: '#7C3AED', badge: 'bg-violet-900/40 text-violet-300 border-violet-700/50'},
};

// ── Highlight matching substring ──────────────────────────────────────────────
function Highlight({ text = '', query = '' }) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-blue-500/30 text-blue-200 rounded-[2px] px-[1px] not-italic font-bold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────
function ResultRow({ item, active, onSelect, query }) {
  const Icon = item.icon;
  const ref  = useRef(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <button
      ref={ref}
      onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all rounded-lg mx-1 my-0.5 group
        ${active
          ? 'bg-[#2563EB]/20 ring-1 ring-[#2563EB]/30'
          : 'hover:bg-white/5'
        }`}
      style={{ width: 'calc(100% - 8px)' }}
    >
      {/* Icon */}
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
        ${active ? 'bg-[#2563EB]/30' : 'bg-white/8 group-hover:bg-white/12'}`}
      >
        <Icon size={15} className={active ? 'text-blue-300' : item.iconCls || 'text-slate-400'} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold truncate ${active ? 'text-white' : 'text-slate-200'}`}>
          {query ? <Highlight text={item.label} query={query} /> : item.label}
        </p>
        {item.desc && (
          <p className={`text-[11px] truncate mt-0.5 ${active ? 'text-blue-300/80' : 'text-slate-500'}`}>
            {query ? <Highlight text={item.desc} query={query} /> : item.desc}
          </p>
        )}
      </div>

      {/* Badge */}
      {item.badge && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${item.badgeCls ?? 'bg-slate-700/60 text-slate-400 border-slate-600/50'}`}>
          {item.badge}
        </span>
      )}

      {/* Arrow */}
      <ChevronRight size={13} className={`shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
    </button>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────
function GroupLabel({ label }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery]          = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [loading, setLoading]      = useState(false);
  const [activeIdx, setActiveIdx]  = useState(0);
  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setApiResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced API search
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) {
      setApiResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await reconApi.getResults({ limit: 20, search: q });
      const items = (res.results || res.data || []).map((r) => {
        const sm = STATUS_META[r.status] ?? STATUS_META.Partial;
        const formatINR = (v) =>
          v != null
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
            : '—';
        return {
          id:       `api-${r.id}-${r.gstin}`,
          label:    r.id || r.supplier || r.gstin,
          desc:     [r.supplier, r.gstin, formatINR(r.prTax)].filter(Boolean).join(' · '),
          icon:     sm.icon,
          iconCls:  '',
          badge:    r.status,
          badgeCls: sm.badge,
          path:     '/dashboard/reconciliation',
          group:    'Invoices',
        };
      });
      setApiResults(items);
    } catch {
      setApiResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      setLoading(true);
      debounceRef.current = setTimeout(() => doSearch(query), 300);
    } else {
      setApiResults([]);
      setLoading(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Filtered nav items
  const filteredNav = query.trim()
    ? NAV_ITEMS.filter(
        (n) =>
          n.label.toLowerCase().includes(query.toLowerCase()) ||
          n.desc.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  // Flat result list for keyboard nav
  const allResults = [...filteredNav, ...apiResults];

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0); }, [query, apiResults.length]);

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[activeIdx]) handleSelect(allResults[activeIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const hasNavResults = filteredNav.length > 0;
  const hasApiResults = apiResults.length > 0;
  const hasAny        = hasNavResults || hasApiResults;
  const navLen        = filteredNav.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onMouseDown={onClose}
      />

      {/* Palette panel */}
      <div
        className="fixed top-[12%] left-1/2 -translate-x-1/2 z-[61] w-[calc(100vw-24px)] sm:w-full sm:max-w-[620px]"
        style={{ maxHeight: '76vh', animation: 'scaleIn 0.15s ease' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl overflow-hidden flex flex-col border border-slate-700/60"
          style={{
            background: 'linear-gradient(180deg, #161d2d 0%, #111827 100%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            maxHeight: '76vh',
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/50">
            {loading
              ? <Loader2 size={17} className="text-blue-400 animate-spin shrink-0" />
              : <Search size={17} className="text-slate-500 shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search GSTIN, supplier, invoice, case ID…"
              className="flex-1 bg-transparent text-[14px] text-slate-100 placeholder-slate-500 outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 shrink-0">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <kbd className="text-[10px] font-medium text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                Esc
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1 py-1" style={{ maxHeight: 'calc(76vh - 110px)' }}>

            {/* No query: show all nav pages */}
            {!query.trim() && (
              <>
                <GroupLabel label="Quick Navigation" />
                {NAV_ITEMS.map((item, i) => (
                  <ResultRow
                    key={item.id} item={item} query=""
                    active={activeIdx === i}
                    onSelect={handleSelect}
                  />
                ))}
                <div className="px-4 py-3 text-[11px] text-slate-600 text-center border-t border-slate-700/40 mt-1">
                  Type to search suppliers, invoices, GSTINs, or case IDs…
                </div>
              </>
            )}

            {/* With query */}
            {query.trim() && (
              <>
                {/* Pages */}
                {hasNavResults && (
                  <>
                    <GroupLabel label="Pages" />
                    {filteredNav.map((item, i) => (
                      <ResultRow
                        key={item.id} item={item} query={query}
                        active={activeIdx === i}
                        onSelect={handleSelect}
                      />
                    ))}
                  </>
                )}

                {/* API invoices / suppliers */}
                {hasApiResults && (
                  <>
                    <GroupLabel label={`Invoices & Suppliers (${apiResults.length})`} />
                    {apiResults.map((item, i) => (
                      <ResultRow
                        key={item.id} item={item} query={query}
                        active={activeIdx === navLen + i}
                        onSelect={handleSelect}
                      />
                    ))}
                  </>
                )}

                {/* Loading */}
                {loading && !hasApiResults && (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-[13px]">
                    <Loader2 size={14} className="animate-spin" />
                    Searching invoices…
                  </div>
                )}

                {/* No results */}
                {!loading && !hasAny && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <div className="w-11 h-11 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                      <Search size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-300">No results for "{query}"</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">Try GSTIN, invoice number, supplier, or case ID.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2 border-t border-slate-700/40"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono text-[10px] text-slate-400">↑</kbd>
                <kbd className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono text-[10px] text-slate-400">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 font-mono text-[10px] text-slate-400">↵</kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-400">Esc</kbd>
                Close
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Command size={10} />
              <span>GST ReconGraph</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: translate(-50%, -4px) scale(0.97); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
      `}</style>
    </>
  );
}
