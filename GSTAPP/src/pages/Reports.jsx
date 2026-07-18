import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, FileText, BarChart3, ShieldCheck, TrendingUp,
  RefreshCw, CheckCircle2, AlertTriangle,
  XCircle, ChevronRight,
  ArrowUpRight, ArrowDownRight, Users, UploadCloud,
  Clock,
} from 'lucide-react';
import { useToast } from '../components/Layout';
import { getAnalyticsSnapshot, subscribeToUploads } from '../utils/analyticsStore';

// ── FY options ─────────────────────────────────────────────────
const FY_OPTIONS = ['FY 26-27', 'FY 25-26', 'FY 24-25', 'FY 23-24', 'FY 22-23'];

// ── Report templates (static config) ───────────────────────────
const REPORT_TEMPLATES = [
  {
    id: 'recon-summary',
    title: 'Reconciliation Summary',
    desc: 'High-level overview of matched, mismatched, and missing invoices across all suppliers.',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    tag: 'Popular',
    tagColor: 'bg-blue-100 text-blue-700',
    pages: '4–6 pages',
  },
  {
    id: 'supplier-risk',
    title: 'Supplier Risk Profile',
    desc: 'Detailed risk assessment and discrepancy history for each tracked GSTIN.',
    icon: ShieldCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    tag: 'Compliance',
    tagColor: 'bg-violet-100 text-violet-700',
    pages: '8–12 pages',
  },
  {
    id: 'itc-report',
    title: 'ITC Eligibility Report',
    desc: 'Full breakdown of eligible, ineligible, and at-risk Input Tax Credit for the period.',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    tag: 'Filing',
    tagColor: 'bg-green-100 text-green-700',
    pages: '3–5 pages',
  },
  {
    id: 'mismatch-detail',
    title: 'Mismatch Detail Report',
    desc: 'Invoice-level analysis of all partial matches and discrepancy amounts.',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    tag: 'Detailed',
    tagColor: 'bg-amber-100 text-amber-700',
    pages: '10–20 pages',
  },
  {
    id: 'fraud-summary',
    title: 'Fraud Detection Summary',
    desc: 'Circular chain analysis, duplicate flags, and high-risk GSTIN activity report.',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    tag: 'Enforcement',
    tagColor: 'bg-red-100 text-red-700',
    pages: '5–8 pages',
  },
  {
    id: 'trend-analysis',
    title: 'Monthly Trend Analysis',
    desc: 'FY-level trends for ITC, reconciliation rates, and tax discrepancy patterns.',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    tag: 'Analytics',
    tagColor: 'bg-indigo-100 text-indigo-700',
    pages: '6–10 pages',
  },
];

const RISK_COLORS = {
  Low:      'bg-green-100 text-green-700 border-green-200',
  Medium:   'bg-amber-100 text-amber-700 border-amber-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-red-100 text-red-700 border-red-200',
};

// ── Animated counter ────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(2, -10 * p);
      setVal(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ── Skeleton placeholder ────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

// ── Bar chart row ───────────────────────────────────────────────
function MonthBar({ d, max, visible }) {
  const [hov, setHov] = useState(false);
  const total = (d.matched || 0) + (d.partial || 0) + (d.missing || 0);
  const safeMax = max || 1;
  const mPct  = ((d.matched  || 0) / safeMax) * 100;
  const pPct  = ((d.partial  || 0) / safeMax) * 100;
  const miPct = ((d.missing  || 0) / safeMax) * 100;

  return (
    <div
      className="flex items-center gap-3 group cursor-default"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <span className="w-7 text-[10px] text-gray-400 font-medium shrink-0">{d.month}</span>
      <div className="flex-1 flex gap-0.5 h-5 rounded overflow-hidden bg-gray-50">
        <div
          className="bg-green-400 rounded-l transition-all duration-700 ease-out"
          style={{ width: visible ? `${mPct}%` : '0%' }}
          title={`Matched: ${d.matched}`}
        />
        <div
          className="bg-amber-400 transition-all duration-700 ease-out"
          style={{ width: visible ? `${pPct}%` : '0%', transitionDelay: '80ms' }}
          title={`Partial: ${d.partial}`}
        />
        <div
          className="bg-red-400 rounded-r transition-all duration-700 ease-out"
          style={{ width: visible ? `${miPct}%` : '0%', transitionDelay: '160ms' }}
          title={`Missing: ${d.missing}`}
        />
      </div>
      <span className={`w-10 text-right text-[11px] font-semibold transition-colors ${hov ? 'text-blue-600' : 'text-gray-500'}`}>
        {total}
      </span>
    </div>
  );
}

// ── Data source badge ───────────────────────────────────────────
function DataSourceBadge({ source }) {
  if (source === 'api') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
      Live Data
    </span>
  );
  if (source === 'local') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />
      From Uploads
    </span>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const addToast  = useToast();
  const navigate  = useNavigate();

  const [fyFilter, setFyFilter]     = useState('FY 26-27');
  const [generating, setGenerating] = useState(null);
  const [activeTab, setActiveTab]   = useState('overview');
  const [visible, setVisible]       = useState(false);

  // ── Data states ──────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [dataSource, setDataSource] = useState(null); // 'api' | 'local' | null
  const [hasData, setHasData]       = useState(false);
  const [summary, setSummary]       = useState(null);
  const [monthly, setMonthly]       = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Animated counters ────────────────────────────────────────
  const totalITCRaw    = summary?.totalITC    ?? 0;
  const riskITCRaw     = summary?.riskITC     ?? 0;
  const invoicesCount  = summary?.invoicesReconciled ?? 0;
  const suppliersCount = summary?.suppliersTracked   ?? 0;

  const totalITCVal    = useCountUp(Math.round(totalITCRaw / 10000), 1400); // in ₹ Crore ×100
  const riskITCVal     = useCountUp(Math.round(riskITCRaw  / 10000), 1300);
  const invoicesVal    = useCountUp(invoicesCount, 1200);
  const suppliersVal   = useCountUp(suppliersCount, 1100);

  // ── Load analytics data ──────────────────────────────────────
  const loadData = useCallback((fy = fyFilter) => {
    setLoading(true);
    setVisible(false);

    // Derive analytics directly from uploaded file data in localStorage.
    // No backend required — all computations are done client-side from
    // the upload events saved by Upload.jsx via addUploadEvent().
    const snap = getAnalyticsSnapshot(fy);
    setSummary(snap.summary);
    setMonthly(snap.monthly  || []);
    setSuppliers(snap.suppliers || []);
    setDataSource(snap.hasData ? 'local' : null);
    setHasData(snap.hasData);
    setLoading(false);
    setLastRefresh(new Date());
    setTimeout(() => setVisible(true), 100);
  }, [fyFilter]);

  // Initial load
  useEffect(() => {
    loadData(fyFilter);
  }, [fyFilter]);

  // Auto-refresh when new uploads arrive (same tab or cross-tab storage event)
  useEffect(() => {
    const unsub = subscribeToUploads(() => loadData(fyFilter));
    return unsub;
  }, [fyFilter, loadData]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleGenerate = (id) => {
    if (!hasData) {
      addToast({ type: 'warning', title: 'No Data', message: 'Upload files first to generate reports.' });
      return;
    }
    setGenerating(id);
    setTimeout(() => {
      setGenerating(null);
      addToast({ type: 'success', title: 'Report Ready', message: 'Your PDF has been generated and is ready to download.' });
    }, 2000);
  };

  const handleExportAll = () => {
    if (!hasData) {
      addToast({ type: 'warning', title: 'No Data', message: 'Upload files first to export analytics.' });
      return;
    }
    addToast({ type: 'info', title: 'Export Started', message: 'Compiling all reports into a ZIP archive…' });
  };

  const handleRefresh = () => loadData(fyFilter);

  // ── Derived values ────────────────────────────────────────────
  const maxMonthTotal = monthly.length
    ? Math.max(...monthly.map((d) => (d.matched || 0) + (d.partial || 0) + (d.missing || 0)), 1)
    : 1;

  const matchRate = summary?.matchRatePct ?? 0;
  const partialPct = summary?.partialPct  ?? 0;
  const missingPct = summary?.missingPct  ?? 0;
  const dupPct     = summary?.duplicatePct ?? 0;

  const TABS = [
    { id: 'overview',  label: 'Overview'          },
    { id: 'suppliers', label: 'Suppliers'          },
    { id: 'reports',   label: 'Report Templates'   },
  ];

  const summaryCards = [
    {
      label: 'Total ITC Claimed',
      displayVal: summary?.totalITCDisplay ?? `₹${(totalITCVal / 100).toFixed(2)} Cr`,
      change: summary?.changes?.itc ?? '+0%',
      up: true,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      label: 'ITC at Risk',
      displayVal: summary?.riskITCDisplay ?? `₹${(riskITCVal / 100).toFixed(2)} Cr`,
      change: summary?.changes?.riskITC ?? '+0%',
      up: false,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      label: 'Invoices Reconciled',
      displayVal: invoicesVal.toLocaleString('en-IN'),
      change: summary?.changes?.invoices ?? '+0 vs last run',
      up: true,
      icon: CheckCircle2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      label: 'Suppliers Tracked',
      displayVal: suppliersVal.toLocaleString('en-IN'),
      change: summary?.changes?.suppliers ?? '+0 new',
      up: true,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
    },
  ];

  // ── Empty state ───────────────────────────────────────────────
  const EmptyState = () => (
    <div className="card p-10 flex flex-col items-center justify-center text-center gap-5 animate-fade-in-up border-dashed border-2 border-gray-200">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
        <UploadCloud size={28} className="text-blue-500" />
      </div>
      <div>
        <h3 className="text-[16px] font-bold text-gray-900 mb-1">No Data Yet</h3>
        <p className="text-[13px] text-gray-500 max-w-sm">
          Upload your Purchase Register and GSTR-2B files to see live analytics, ITC insights, and supplier risk reports.
        </p>
      </div>
      <button
        onClick={() => navigate('/upload')}
        className="btn-primary"
      >
        <UploadCloud size={15} />
        Go to Upload
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics &amp; Reports</h1>
          <p className="text-[14px] text-gray-500 mt-1 max-w-xl">
            In-depth GST reconciliation analytics, ITC insights, and exportable compliance reports.
          </p>
          {lastRefresh && (
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              {dataSource && <DataSourceBadge source={dataSource} />}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="input-base select-base text-[12px] py-2 w-32"
          >
            {FY_OPTIONS.map((fy) => <option key={fy}>{fy}</option>)}
          </select>
          <button onClick={handleExportAll} className="btn-secondary">
            <Download size={14} />
            Export All
          </button>
        </div>
      </div>

      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 border border-gray-100">
                <Skeleton className="w-9 h-9 mb-3" />
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          : summaryCards.map((s, i) => (
              <div
                key={i}
                className={`card p-4 border ${s.border} animate-fade-in-up`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${s.up ? 'text-green-600' : 'text-red-600'}`}>
                    {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {s.change}
                  </span>
                </div>
                <p className="text-[22px] font-bold text-gray-900 leading-tight tabular-nums">
                  {hasData ? s.displayVal : '—'}
                </p>
                <p className="text-[12px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))
        }
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              activeTab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fade-in-up">

          {!loading && !hasData && <EmptyState />}

          {/* Monthly stacked bar chart + ITC columns */}
          {(loading || hasData) && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-5">

              {/* Bar chart */}
              <div className="card p-4 sm:p-5 md:col-span-3">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="section-title text-[15px]">Monthly Reconciliation Volume</h3>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      Stacked by match status — {fyFilter}
                      {dataSource && <span className="ml-2"><DataSourceBadge source={dataSource} /></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />Matched</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Partial</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400  inline-block" />Missing</span>
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-7 h-3" />
                        <Skeleton className="flex-1 h-5" />
                        <Skeleton className="w-10 h-3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {monthly.map((d) => (
                      <MonthBar key={d.month} d={d} max={maxMonthTotal} visible={visible} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right column: ITC bars + Match Rate */}
              <div className="md:col-span-2 flex flex-col gap-4 sm:gap-5">

                {/* ITC monthly */}
                <div className="card p-5 flex-1">
                  <h3 className="section-title text-[15px] mb-1">ITC Availed (₹ L)</h3>
                  <p className="text-[12px] text-gray-500 mb-4">Monthly credit utilisation</p>
                  {loading ? (
                    <Skeleton className="h-28 w-full" />
                  ) : (
                    <>
                      <div className="flex items-end gap-1.5 h-28">
                        {monthly.map((d, i) => {
                          const maxITC = Math.max(...monthly.map((x) => x.itc || 0), 0.1);
                          const pct = ((d.itc || 0) / maxITC) * 100;
                          return (
                            <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 group cursor-default">
                              <div
                                className="w-full rounded-t-md bg-blue-100 hover:bg-blue-500 transition-all duration-700 ease-out"
                                style={{ height: visible ? `${pct}%` : '2%', minHeight: pct > 0 ? '4px' : '0', transitionDelay: `${150 + i * 40}ms` }}
                                title={`₹${d.itc || 0} L`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                        {monthly.map((d) => <span key={d.month}>{d.month}</span>)}
                      </div>
                    </>
                  )}
                </div>

                {/* Match rate bars */}
                <div className="card p-5">
                  <h3 className="section-title text-[15px] mb-4">Match Rate</h3>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                          <Skeleton className="h-3 w-1/2 mb-1" />
                          <Skeleton className="h-2 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: 'Exact Match',   pct: matchRate,  color: 'bg-green-500'  },
                        { label: 'Partial Match', pct: partialPct, color: 'bg-amber-400'  },
                        { label: 'Missing',       pct: missingPct, color: 'bg-red-400'    },
                        { label: 'Duplicate',     pct: dupPct,     color: 'bg-violet-400' },
                      ].map((r) => (
                        <div key={r.label}>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-gray-600 font-medium">{r.label}</span>
                            <span className="font-bold text-gray-900">{r.pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.color} transition-all duration-1000 ease-out`}
                              style={{ width: visible ? `${r.pct}%` : '0%' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Quick stats row */}
          {(loading || hasData) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card p-4">
                      <Skeleton className="h-7 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))
                : [
                    {
                      label: 'Avg. Match Rate',
                      value: `${matchRate}%`,
                      sub: matchRate > 60 ? 'Good — above 60% threshold' : 'Below threshold — review mismatches',
                      good: matchRate > 60,
                    },
                    {
                      label: 'Suppliers at Risk',
                      value: suppliers.filter((s) => s.risk === 'High' || s.risk === 'Critical').length.toString(),
                      sub: 'High or Critical risk rating',
                      good: suppliers.filter((s) => s.risk === 'High' || s.risk === 'Critical').length === 0,
                    },
                    {
                      label: 'ITC Recovery Rate',
                      value: `${matchRate > 0 ? (100 - missingPct).toFixed(1) : '0'}%`,
                      sub: 'Invoices with ITC recoverable',
                      good: matchRate > 70,
                    },
                    {
                      label: 'Data Source',
                      value: dataSource === 'api' ? 'API' : dataSource === 'local' ? 'Uploads' : '—',
                      sub: dataSource === 'api' ? 'Backend connected' : 'From local upload events',
                      good: dataSource === 'api',
                    },
                  ].map((s, i) => (
                    <div key={i} className="card p-4 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <p className="text-[22px] font-bold text-gray-900 tabular-nums">{s.value}</p>
                      <p className="text-[12px] font-medium text-gray-700 mt-0.5">{s.label}</p>
                      <p className={`text-[11px] mt-0.5 ${s.good ? 'text-green-600' : 'text-red-500'}`}>{s.sub}</p>
                    </div>
                  ))
              }
            </div>
          )}

        </div>
      )}

      {/* ══ SUPPLIERS TAB ═════════════════════════════════════════ */}
      {activeTab === 'suppliers' && (
        <div className="animate-fade-in-up">
          {!loading && !hasData && <EmptyState />}
          {(loading || hasData) && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">Top Suppliers by ITC Volume</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {loading ? 'Loading…' : `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} · ${fyFilter}`}
                    {dataSource && !loading && <span className="ml-2"><DataSourceBadge source={dataSource} /></span>}
                  </p>
                </div>
                <button
                  className="btn-secondary text-[12px]"
                  onClick={() => addToast({ type: 'info', title: 'Export', message: 'Exporting supplier data as CSV…' })}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Supplier</th>
                      <th className="text-left">GSTIN</th>
                      <th className="text-right">Invoices</th>
                      <th className="text-right">Matched</th>
                      <th className="text-right">Match%</th>
                      <th className="text-center">Risk</th>
                      <th className="text-right">ITC Value</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((__, j) => (
                              <td key={j}><Skeleton className="h-4 w-full" /></td>
                            ))}
                          </tr>
                        ))
                      : suppliers.map((s, i) => {
                          const pct = s.invoices > 0 ? Math.round((s.matched / s.invoices) * 100) : 0;
                          return (
                            <tr key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                              <td>
                                <p className="text-[13px] font-semibold text-gray-900 max-w-[200px] truncate capitalize">{s.name}</p>
                              </td>
                              <td>
                                <span className="text-[11px] font-mono text-gray-500">{s.gstin || '—'}</span>
                              </td>
                              <td className="text-right tabular-nums text-[13px]">{s.invoices}</td>
                              <td className="text-right tabular-nums text-[13px] text-green-700 font-medium">{s.matched}</td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                                      style={{ width: visible ? `${pct}%` : '0%', transitionDelay: `${i * 60}ms` }}
                                    />
                                  </div>
                                  <span className={`text-[12px] font-bold tabular-nums ${pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${RISK_COLORS[s.risk] || RISK_COLORS.Medium}`}>
                                  {s.risk}
                                </span>
                              </td>
                              <td className="text-right text-[13px] font-semibold text-gray-900 tabular-nums">{s.itc}</td>
                              <td>
                                <button className="text-gray-300 hover:text-blue-500 transition-colors">
                                  <ChevronRight size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
                {!loading && suppliers.length === 0 && hasData && (
                  <div className="px-5 py-8 text-center text-[13px] text-gray-400">
                    No supplier data available for {fyFilter}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ REPORT TEMPLATES TAB ══════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in-up space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-500">{REPORT_TEMPLATES.length} templates available · PDF &amp; Excel export</p>
            {!hasData && !loading && (
              <span className="text-[12px] text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle size={12} /> Upload data first to generate reports
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map((r, i) => (
              <div
                key={r.id}
                className={`card p-5 border ${r.border} hover:shadow-hover transition-all duration-200 group animate-fade-in-up ${!hasData ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${r.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <r.icon size={18} className={r.color} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.tagColor}`}>
                    {r.tag}
                  </span>
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 mb-1">{r.title}</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed mb-4">{r.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <FileText size={11} />
                    {r.pages}
                  </span>
                  <button
                    onClick={() => handleGenerate(r.id)}
                    disabled={generating === r.id || !hasData}
                    className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      generating === r.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : !hasData
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : `${r.bg} ${r.color} hover:opacity-80`
                    }`}
                  >
                    {generating === r.id ? (
                      <><RefreshCw size={12} className="animate-spin" />Generating…</>
                    ) : (
                      <><Download size={12} />Generate</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
