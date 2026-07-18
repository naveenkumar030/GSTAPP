import { useState, useEffect } from 'react';
import {
  History, Search, Filter, Download, RefreshCw,
  UploadCloud, Play, FileText, ShieldAlert, Settings,
  User, CheckCircle2, AlertTriangle, XCircle, LogIn,
  ChevronDown, Calendar, Clock, Cpu,
} from 'lucide-react';
import { getUploadEvents, relativeTime } from '../utils/uploadActivity';

// ── Event type config ──────────────────────────────────────────
const EVENT_TYPES = {
  upload:        { icon: UploadCloud,  color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Upload'        },
  reconcile:     { icon: Play,         color: 'text-green-600',  bg: 'bg-green-50',  label: 'Reconciliation' },
  alert:         { icon: ShieldAlert,  color: 'text-red-600',    bg: 'bg-red-50',    label: 'Alert'          },
  report:        { icon: FileText,     color: 'text-violet-600', bg: 'bg-violet-50', label: 'Report'         },
  login:         { icon: LogIn,        color: 'text-gray-600',   bg: 'bg-gray-100',  label: 'Auth'           },
  settings:      { icon: Settings,     color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Settings'       },
  review:        { icon: CheckCircle2, color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Review'         },
  system:        { icon: Cpu,          color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'System'         },
};

// No static/default events — audit trail is built from real upload events only.

// ── Convert upload events from localStorage ────────────────────
function uploadEventsToAudit(evs) {
  return evs.map((ev) => ({
    id: ev.id,
    type: 'upload',
    title: ev.type === 'pr'
      ? 'Purchase Register Uploaded'
      : 'GSTR-2B File Uploaded',
    detail: `File: ${ev.filename} · ${ev.sizeMB.toFixed(2)} MB${ev.records > 0 ? ` · ${ev.records.toLocaleString('en-IN')} records parsed` : ''}`,
    user: localStorage.getItem('userName') || 'User',
    userType: 'user',
    timestamp: ev.timestamp,
    meta: ev.type === 'pr' ? 'Purchase Register' : 'GSTR-2B',
  }));
}

const ALL_TYPES = ['all', ...Object.keys(EVENT_TYPES)];

// ─────────────────────────────────────────────────────────────────────────────
export default function Audit() {
  const [events, setEvents]         = useState([]);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded]     = useState(null);
  const [loading, setLoading]       = useState(true);

  const loadEvents = () => {
    setLoading(true);
    const uploadAudit = uploadEventsToAudit(getUploadEvents());
    // Only real upload events — no static defaults
    const all = [...uploadAudit].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    setTimeout(() => {
      setEvents(all);
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    loadEvents();
    const poll = setInterval(loadEvents, 10000);
    return () => clearInterval(poll);
  }, []);

  // Filtered events
  const filtered = events.filter((ev) => {
    const matchType = typeFilter === 'all' || ev.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || ev.title.toLowerCase().includes(q) || ev.detail.toLowerCase().includes(q) || ev.user.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  // Stats
  const uploadCount  = events.filter((e) => e.type === 'upload').length;
  const systemCount  = events.filter((e) => e.userType === 'system').length;
  const userCount    = events.filter((e) => e.userType === 'user').length;
  const alertCount   = events.filter((e) => e.type === 'alert').length;

  const handleExport = () => {
    const rows = filtered.map((e) =>
      `${e.timestamp},${e.type},${e.user},${e.title},${e.detail}`
    );
    const csv = ['Timestamp,Type,User,Event,Detail', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit_trail.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="text-[14px] text-gray-500 mt-1 max-w-xl">
            Complete log of all user actions, file uploads, system events, and data changes.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadEvents} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Events',   value: events.length,  icon: History,     color: 'text-gray-600',   bg: 'bg-gray-50' },
          { label: 'File Uploads',   value: uploadCount,    icon: UploadCloud, color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'User Actions',   value: userCount,      icon: User,        color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'System Events',  value: systemCount,    icon: Cpu,         color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((s, i) => (
          <div
            key={i}
            className="card p-4 flex items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className="text-[20px] font-bold text-gray-900 tabular-nums leading-tight">{s.value}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, users, details…"
            className="input-base pl-9 text-[13px]"
          />
        </div>
        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
          {ALL_TYPES.map((t) => {
            const cfg = EVENT_TYPES[t];
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                  typeFilter === t
                    ? cfg
                      ? `${cfg.bg} ${cfg.color} border-transparent`
                      : 'bg-gray-900 text-white border-transparent'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {t === 'all' ? 'All Events' : (cfg?.label ?? t)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <span className="text-[12px] font-semibold text-gray-600">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''} {typeFilter !== 'all' ? `· ${EVENT_TYPES[typeFilter]?.label}` : ''}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Clock size={11} />
            All times in IST
          </span>
        </div>

        {loading && (
          <div className="space-y-0 divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-72" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="py-16 text-center">
            <History size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-gray-500">No audit events yet</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Upload files on the <strong>Data Upload</strong> page to start recording activity here.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center">
            <History size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-[13px] text-gray-400">No events match your filter.</p>
          </div>
        )}

        {!loading && (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filtered.map((ev, idx) => {
              const cfg  = EVENT_TYPES[ev.type] ?? EVENT_TYPES.system;
              const Icon = cfg.icon;
              const isExp = expanded === ev.id;
              const dt   = new Date(ev.timestamp);
              const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={ev.id}
                  className="group animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
                >
                  <button
                    className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 flex items-start gap-3 sm:gap-4 hover:bg-gray-50/60 transition-colors"
                    onClick={() => setExpanded(isExp ? null : ev.id)}
                    aria-expanded={isExp}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                      <Icon size={15} className={cfg.color} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {ev.meta && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                              {ev.meta}
                            </span>
                          )}
                          <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform ${isExp ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                      <p className="text-[12px] text-gray-500 truncate">{ev.detail}</p>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <User size={10} />
                          <span className={ev.userType === 'system' ? 'text-indigo-500 font-medium' : 'text-gray-600 font-medium'}>
                            {ev.user}
                          </span>
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar size={10} />
                          {dateStr}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={10} />
                          {timeStr}
                        </span>
                        <span className="text-[10px] text-gray-300 ml-auto">{relativeTime(ev.timestamp)}</span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  {isExp && (
                    <div className={`px-5 pb-4 animate-fade-in-up`}>
                      <div className={`ml-0 sm:ml-[52px] p-3 sm:p-4 rounded-xl border ${cfg.bg} border-opacity-60`} style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        <p className="text-[12px] font-semibold text-gray-700 mb-1">Event Detail</p>
                        <p className="text-[12px] text-gray-600 leading-relaxed">{ev.detail}</p>
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-black/5">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Event ID</p>
                            <p className="text-[11px] font-mono text-gray-600">{ev.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Type</p>
                            <p className="text-[11px] font-semibold capitalize text-gray-700">{cfg.label}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Exact Time</p>
                            <p className="text-[11px] font-mono text-gray-600">{new Date(ev.timestamp).toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Actor</p>
                            <p className={`text-[11px] font-semibold ${ev.userType === 'system' ? 'text-indigo-600' : 'text-gray-700'}`}>
                              {ev.user} {ev.userType === 'system' ? '(Automated)' : '(Human)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
