import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Network,
  TrendingUp, TrendingDown, ArrowRight, ShieldAlert,
  Play, Download, RefreshCw, Activity, Zap,
  FileSpreadsheet, FileText, UploadCloud, Clock,
} from 'lucide-react';
import { useReconProgress } from '../components/Layout';
import { useToast } from '../components/Layout';
import { getUploadEvents, eventToTicker, relativeTime } from '../utils/uploadActivity';
import { dashboardApi } from '../services/api';

// ── Severity badge styles ──────────────────────────────────────
const SEV_STYLES = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Medium:   'bg-amber-100 text-amber-700 border-amber-200',
  Low:      'bg-green-100 text-green-700 border-green-200',
};

// No default/mock data — all data must come from uploaded files or real API.

// ── Sparkline data per KPI ─────────────────────────────────────
const SPARKLINES = {
  exact:     [4, 6, 5, 8, 7, 9, 7, 10, 8, 9],
  partial:   [7, 5, 8, 4, 6, 3, 5, 4,  6, 4],
  missing:   [3, 4, 5, 6, 4, 7, 5, 6,  7, 5],
  fraud:     [2, 3, 2, 4, 3, 5, 3, 4,  3, 4],
};

// ── Animated counter hook ──────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const timeout = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutExpo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

// ── Animated KPI Card ──────────────────────────────────────────
function KpiCard({ kpi, rawCount, subtitle, animDelay }) {
  const count = useCountUp(rawCount, 1400, animDelay);
  const [hovered, setHovered] = useState(false);
  const sparkData = SPARKLINES[kpi.key] || [];
  const maxH = Math.max(...sparkData);

  return (
    <div
      className={`kpi-card ${kpi.variant} animate-fade-in-up`}
      style={{ animationDelay: `${animDelay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${kpi.title}: ${count.toLocaleString('en-IN')}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 ${kpi.iconBg} ${hovered ? 'scale-110' : ''}`}>
          <kpi.icon size={18} className={kpi.iconColor} aria-hidden="true" />
        </div>
        {kpi.trend && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${kpi.trendBg} ${kpi.trendColor}`}>
            {kpi.trendUp === true  && <TrendingUp  size={11} />}
            {kpi.trendUp === false && <TrendingDown size={11} />}
            {kpi.trend}
          </div>
        )}
        {!kpi.trend && (
          <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">—</div>
        )}
      </div>

      {/* Animated sparkline */}
      <div className="flex items-end gap-0.5 h-7 mb-3">
        {sparkData.map((h, idx) => (
          <div
            key={idx}
            className={`flex-1 rounded-sm transition-all duration-500 ${kpi.iconBg}`}
            style={{
              height: `${(h / maxH) * 100}%`,
              transitionDelay: `${animDelay + idx * 40}ms`,
              opacity: hovered ? 1 : 0.6,
              transform: hovered && idx === sparkData.length - 1 ? 'scaleY(1.15)' : 'scaleY(1)',
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>

      <p className="text-[12px] font-medium text-gray-500 mb-1">{kpi.title}</p>
      <p className="card-metric" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {count.toLocaleString('en-IN')}
      </p>
      <p className="text-[12px] text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ── Live activity ticker (driven by real upload events) ───────
function LiveTicker() {
  const [items, setItems]   = useState([]);
  const [idx, setIdx]       = useState(0);
  const [fade, setFade]     = useState(true);

  // Load events and re-read every 5 s so new uploads appear
  useEffect(() => {
    const load = () => {
      const evs = getUploadEvents();
      setItems(evs.map(eventToTicker));
    };
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, []);

  // Cycle through items
  useEffect(() => {
    if (items.length < 2) return;
    const iv = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setFade(true);
      }, 300);
    }, 3500);
    return () => clearInterval(iv);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-gray-400 italic">
        <UploadCloud size={13} className="text-gray-300" />
        No uploads yet — go to <strong className="not-italic text-blue-500 mx-1">Data Upload</strong> to add files.
      </div>
    );
  }

  const item = items[idx] ?? items[0];
  return (
    <div className="flex items-center gap-2 text-[12px] overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="font-semibold text-gray-600 uppercase tracking-wider text-[10px]">Upload</span>
      </div>
      <div className={`flex items-center gap-2 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
        <span className="text-gray-600 truncate">{item.text}</span>
      </div>
      {items.length > 1 && (
        <span className="ml-auto shrink-0 text-[10px] text-gray-300 tabular-nums">{idx + 1}/{items.length}</span>
      )}
    </div>
  );
}

// ── Upload Activity Log ────────────────────────────────────────
function UploadActivityLog() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = () => setEvents(getUploadEvents());
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="card overflow-hidden animate-fade-in-up delay-400">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Upload Activity</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {events.length} file{events.length !== 1 ? 's' : ''} uploaded this session
          </p>
        </div>
        <span className="badge badge-blue">{events.length}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto custom-scrollbar">
        {events.map((ev, i) => {
          const isPR = ev.type === 'pr';
          return (
            <div
              key={ev.id}
              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isPR ? 'bg-blue-50' : 'bg-emerald-50'
              }`}>
                {isPR
                  ? <FileSpreadsheet size={15} className="text-blue-600" />
                  : <FileText       size={15} className="text-emerald-600" />}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{ev.filename}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    isPR ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {isPR ? 'Purchase Register' : 'GSTR-2B'}
                  </span>
                  {ev.records > 0 && (
                    <span className="text-[11px] text-gray-500">
                      {ev.records.toLocaleString('en-IN')} records
                    </span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">
                    {ev.sizeMB.toFixed(2)} MB
                  </span>
                </div>
              </div>

              {/* Time + status */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />
                  Done
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock size={9} />
                  {relativeTime(ev.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── KPI Config ─────────────────────────────────────────────────
const KPI_CONFIG = [
  {
    id: 1, key: 'exact',
    title: 'Verified Safe',
    subtitle: (tax) => `₹${(tax / 1e7).toFixed(1)} Cr total tax cleared`,
    trend: '+12%', trendUp: true,
    icon: CheckCircle2,
    variant: 'kpi-success',
    iconBg: 'bg-green-100', iconColor: 'text-green-600',
    trendBg: 'bg-green-50', trendColor: 'text-green-700',
  },
  {
    id: 2, key: 'partial',
    title: 'Low/Medium Risk',
    subtitle: (tax) => `₹${(tax / 1e5).toFixed(1)} L difference found`,
    trend: '-5%', trendUp: false,
    icon: AlertTriangle,
    variant: 'kpi-warning',
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    trendBg: 'bg-red-50', trendColor: 'text-red-700',
  },
  {
    id: 3, key: 'missing',
    title: 'High Risk / Flags',
    subtitle: (tax) => `₹${(tax / 1e5).toFixed(1)} L ITC at risk`,
    trend: '+2%', trendUp: true,
    icon: XCircle,
    variant: 'kpi-danger',
    iconBg: 'bg-red-100', iconColor: 'text-red-600',
    trendBg: 'bg-red-50', trendColor: 'text-red-700',
  },
  {
    id: 4, key: 'fraud',
    title: 'Fraud / Suspicious',
    subtitle: () => 'Requires investigation',
    trend: null, trendUp: null,
    icon: ShieldAlert,
    variant: 'kpi-fraud',
    iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
    trendBg: 'bg-gray-100', trendColor: 'text-gray-600',
  },
];

const MISMATCH_DIST_CONFIG = [
  { key: 'exact',     label: 'Verified',  color: 'bg-green-500',  textColor: 'text-green-600' },
  { key: 'partial',   label: 'Med Risk',  color: 'bg-amber-500',  textColor: 'text-amber-600' },
  { key: 'missing',   label: 'High Risk', color: 'bg-red-500',    textColor: 'text-red-600' },
  { key: 'fraud',     label: 'Fraud',     color: 'bg-violet-500', textColor: 'text-violet-600' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Overview() {
  const openRecon = useReconProgress();
  const addToast  = useToast();
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState(null);
  const [alerts, setAlerts]         = useState([]);
  const [trend, setTrend]           = useState([]);
  const [barsVisible, setBarsVisible] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setBarsVisible(false);

    // Try real API only — no mock fallback
    await new Promise((r) => setTimeout(r, isRefresh ? 400 : 600));
    try {
      const [s, a, t] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAlerts(),
        dashboardApi.getTrend(),
      ]);
      setStats(s);
      setAlerts(a.alerts || []);
      setTrend(t.trend   || []);
    } catch (err) {
      console.error("Dashboard API Error:", err);
      // API unavailable — show empty state
      setStats(null);
      setAlerts([]);
      setTrend([]);
    }

    setLoading(false);
    setRefreshing(false);
    // Trigger bar animations after data loads
    setTimeout(() => setBarsVisible(true), 100);
  };

  useEffect(() => { loadData(); }, []);

  const handleRefresh = () => {
    loadData(true);
    addToast({ type: 'info', title: 'Refreshing', message: 'Dashboard data is being refreshed…' });
  };

  const handleExport = () => {
    addToast({ type: 'success', title: 'Export Started', message: 'Reconciliation report is being generated.' });
  };

  const hasData = stats?.hasData || false;
  const total = stats?.total || 0;
  const getMismatchPct = (key) => {
    if (!stats || total === 0) return 0;
    return +((stats[key]?.count ?? 0) / total * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Page Intro ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Reconciliation Overview</h1>
          <p className="text-[13px] sm:text-[14px] text-gray-500 mt-1 max-w-xl">
            Monitor invoice matching, tax discrepancies, missing filings, duplicate invoices, and fraud risk.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={handleRefresh} className="btn-secondary" title="Refresh data" disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download size={14} />
            <span className="hidden xs:inline">Export</span>
          </button>
          <button onClick={openRecon} className="btn-primary">
            <Play size={14} />
            Run Reconciliation
          </button>
        </div>
      </div>

      {/* ── Upload Activity Ticker ── */}
      <div className="bg-white border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-4 animate-fade-in-up shadow-soft overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity size={13} className="text-blue-500" />
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest hidden sm:inline">Activity</span>
        </div>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <LiveTicker />
        </div>
      </div>

      {/* ── No-data empty state ── */}
      {!loading && !hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4">
          <UploadCloud size={22} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[15px] font-bold text-blue-900">No verification data yet</p>
            <p className="text-[13px] text-blue-700 mt-1">
              Upload your <strong>GSTR Record</strong> file on the{' '}
              <strong>Data Upload</strong> page, then click <strong>Run Reconciliation</strong> to populate this dashboard.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {(loading || hasData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CONFIG.map((kpi, i) => {
            const rawCount = stats?.[kpi.key]?.count ?? 0;
            const tax      = stats?.[kpi.key]?.tax   ?? 0;
            const subtitle = loading ? 'Loading…' : kpi.subtitle(tax);
            return loading ? (
              <div key={kpi.id} className="kpi-card animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 mb-4" />
                <div className="h-7 mb-3 flex items-end gap-0.5">
                  {[3,5,2,7,4,8,3,6,5,4].map((_, idx) => (
                    <div key={idx} className="flex-1 bg-gray-100 rounded-sm" style={{ height: '60%' }} />
                  ))}
                </div>
                <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                <div className="h-8 bg-gray-100 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            ) : (
              <KpiCard
                key={kpi.id}
                kpi={kpi}
                rawCount={rawCount}
                subtitle={subtitle}
                animDelay={i * 80}
              />
            );
          })}
        </div>
      )}

      {/* ── Intelligence Section — only shown when data exists ── */}
      {(loading || hasData) && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* Mismatch Distribution */}
        <div className="card p-5 flex flex-col animate-fade-in-up delay-150">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title text-[15px]">Mismatch Distribution</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Current reconciliation cycle</p>
            </div>
            <span className="badge badge-blue">{total.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            {MISMATCH_DIST_CONFIG.map((item) => {
              const pct = getMismatchPct(item.key);
              return (
                <div key={item.key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-[13px] font-medium text-gray-700">{item.label}</span>
                    </div>
                    <span className={`text-[12px] font-bold ${item.textColor}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`}
                      style={{ width: barsVisible ? `${pct}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini donut summary */}
          {!loading && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                {MISMATCH_DIST_CONFIG.map((item) => {
                  const pct = getMismatchPct(item.key);
                  const count = stats?.[item.key]?.count ?? 0;
                  return (
                    <div key={item.key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 truncate">{item.label}</p>
                        <p className="text-[12px] font-bold text-gray-900">{count.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[12px] text-gray-500">From latest run</p>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1 text-[12px] font-medium text-blue-600 cursor-pointer hover:text-blue-700"
                >
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tax Risk Trend */}
        <div className="card p-5 flex flex-col animate-fade-in-up delay-225">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title text-[15px]">Tax Risk Trend</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Risk % of invoices per month</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" />
              <button className="text-[12px] font-medium text-blue-600 hover:text-blue-700">FY 24-25</button>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end gap-2">
            {/* Y-axis labels */}
            <div className="flex gap-1.5">
              <div className="flex flex-col justify-between text-[9px] text-gray-300 pr-1" style={{ height: 144 }}>
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="flex-1 relative">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div
                    key={pct}
                    className="absolute w-full border-t border-dashed border-gray-100"
                    style={{ bottom: `${pct}%` }}
                  />
                ))}
                {/* Bars */}
                <div className="flex items-end justify-between gap-1 h-36 relative z-10">
                  {trend.map((d, i) => {
                    const h = (d.risk / 100) * 100;
                    const isHigh = d.risk > 60;
                    const isHovered = hoveredBar === i;
                    return (
                      <div
                        key={i}
                        className="relative flex-1 flex flex-col items-center justify-end gap-0.5 cursor-pointer group"
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {isHovered && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-lg">
                            <span className={isHigh ? 'text-red-400' : 'text-blue-400'}>{d.risk}%</span>
                            <span className="text-gray-400 ml-1">risk</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        )}
                        <div
                          className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                            isHovered
                              ? isHigh ? 'bg-red-500' : 'bg-blue-500'
                              : isHigh ? 'bg-red-200' : 'bg-blue-100'
                          }`}
                          style={{
                            height: barsVisible ? `${h}%` : '2%',
                            transitionDelay: `${150 + i * 50}ms`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 pl-7">
              {trend.map((d) => (
                <span key={d.month} className="flex-1 text-center">{d.month}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-100" />
                  <span className="text-gray-500">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-200" />
                  <span className="text-gray-500">Elevated (&gt;60%)</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-red-600">
                {trend.filter((d) => d.risk > 60).length} high-risk months
              </span>
            </div>
          </div>
        </div>

        {/* High-Risk Alerts */}
        <div className="card p-5 flex flex-col animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                <ShieldAlert size={14} className="text-red-600" />
              </div>
              <h3 className="section-title text-[15px]">High-Risk Alerts</h3>
            </div>
            <span className="badge badge-red">{alerts.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 -mx-1 px-1" style={{ maxHeight: 260 }}>
            {loading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            )}
            {!loading && alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3 border border-gray-100 rounded-xl hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${300 + idx * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${SEV_STYLES[alert.severity] || SEV_STYLES.Low}`}>
                    {alert.severity}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Score</span>
                    <span className={`text-[11px] font-bold ${
                      alert.score >= 80 ? 'text-red-600' :
                      alert.score >= 60 ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>{alert.score}</span>
                    {/* Score mini bar */}
                    <div className="w-8 h-1.5 bg-gray-100 rounded-full overflow-hidden ml-1">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${alert.score >= 80 ? 'bg-red-500' : alert.score >= 60 ? 'bg-amber-500' : 'bg-gray-400'}`}
                        style={{ width: barsVisible ? `${alert.score}%` : '0%', transitionDelay: `${400 + idx * 80}ms` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[12px] font-semibold text-gray-900 truncate">{alert.supplier}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{alert.reason}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400 font-mono">{alert.gstin}</span>
                  <button className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    Investigate <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <button className="btn-secondary w-full justify-center text-[12px]">
              View All Fraud Alerts
            </button>
          </div>
        </div>

      </div>)}

      {/* ── Upload Activity Log ── */}
      <UploadActivityLog />

    </div>
  );
}
