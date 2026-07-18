import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileWarning, ShieldAlert, FileMinus, Search, Download,
  RefreshCw, ChevronDown, ChevronUp, X, AlertTriangle,
  XCircle, CheckCircle2, ArrowUpDown, Filter, TrendingUp,
  BarChart3, Zap, Eye, Copy, ExternalLink,
} from 'lucide-react';
import { reconApi } from '../services/api';
import { formatCurrency, getStatusStyles, getRiskCategory } from '../utils/taxUtils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const RISK_STYLES = {
  High:   'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low:    'bg-green-100 text-green-700 border border-green-200',
};

const STATUS_CONFIG = {
  Partial:   { icon: FileWarning, color: 'amber',  label: 'Partial Match',     desc: 'Invoice matched but tax amounts differ' },
  Missing:   { icon: FileMinus,   color: 'red',    label: 'Missing in GSTR-2B',desc: 'Invoice in your records, absent in GSTR-2B' },
  Duplicate: { icon: Copy,        color: 'violet', label: 'Duplicate Invoice',  desc: 'Same invoice number filed more than once' },
};

const COLOR_MAP = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500'  },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    badge: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500'    },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200',text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
};

// ── Mini sparkline ─────────────────────────────────────────────────────────────
function MiniBar({ pct, color = '#f59e0b' }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, count, totalTax, color, active, onClick }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.amber;
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-white rounded-[14px] border p-4 transition-all duration-200 hover:shadow-md group
        ${active ? `${c.border} shadow-md ring-2 ring-offset-1 ring-${color}-200` : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${active ? c.bg : 'bg-gray-50'} transition-colors group-hover:${c.bg}`}>
          <Icon size={18} className={active ? c.text : 'text-gray-500'} />
        </div>
        {active && <div className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />}
      </div>
      <div className={`text-[26px] font-bold tracking-tight ${active ? c.text : 'text-gray-900'}`}>
        {count.toLocaleString('en-IN')}
      </div>
      <div className="text-[12px] font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{formatCurrency(totalTax)} at risk</div>
    </button>
  );
}

// ── Diff visual bar ───────────────────────────────────────────────────────────
function DiffBar({ prTax, g2bTax }) {
  const max = Math.max(prTax, g2bTax, 1);
  const prPct  = (prTax  / max) * 100;
  const g2bPct = (g2bTax / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 w-14 shrink-0">Your PR</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${prPct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-gray-600 w-20 text-right">{formatCurrency(prTax)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 w-14 shrink-0">GSTR-2B</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${g2bPct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-gray-600 w-20 text-right">{formatCurrency(g2bTax)}</span>
      </div>
    </div>
  );
}

// ── Invoice Detail Drawer ────────────────────────────────────────────────────
function DetailDrawer({ invoice, onClose }) {
  const cfg = STATUS_CONFIG[invoice?.status] ?? STATUS_CONFIG.Partial;
  const c   = COLOR_MAP[cfg.color] ?? COLOR_MAP.amber;
  const Icon = cfg.icon;
  const risk = getRiskCategory(invoice?.score ?? 0);
  const diffPct = invoice?.prTax
    ? ((invoice.diff / invoice.prTax) * 100).toFixed(1)
    : '0.0';

  return (
    <div
      className={`fixed top-14 sm:top-16 right-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] w-full sm:w-[400px] bg-white border-l border-gray-200 shadow-2xl
        transform transition-transform duration-300 ease-in-out z-30 flex flex-col
        ${invoice ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {invoice && (
        <>
          {/* Header */}
          <div className={`px-5 py-4 border-b border-gray-200 flex items-center justify-between ${c.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${c.border} bg-white`}>
                <Icon size={16} className={c.text} />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">{invoice.id}</h3>
                <p className={`text-[11px] font-medium ${c.text}`}>{cfg.label}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white/70 rounded-md transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Risk badge + conf */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${RISK_STYLES[risk]}`}>
                {risk} Risk · Score {invoice.score}
              </span>
              <span className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                Confidence {invoice.conf}%
              </span>
            </div>

            {/* Supplier */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Supplier</p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
                {[
                  ['Name',     invoice.supplier],
                  ['GSTIN',    invoice.gstin],
                  ['Inv Date', invoice.date || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[12px] text-gray-500">{k}</span>
                    <span className="text-[12px] font-medium text-gray-900 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diff visual */}
            {invoice.status !== 'Missing' && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tax Comparison</p>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <DiffBar prTax={invoice.prTax} g2bTax={invoice.g2bTax} />
                  <div className={`mt-3 pt-3 border-t ${c.border} flex justify-between items-center`}>
                    <span className="text-[11px] text-gray-500">Difference</span>
                    <span className={`text-[13px] font-bold ${c.text}`}>
                      {formatCurrency(invoice.diff)} ({diffPct}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Full field comparison table */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Field Comparison</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-[12px]">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-2.5 text-left font-semibold text-gray-600">Field</th>
                      <th className="p-2.5 text-right font-semibold text-blue-600">PR</th>
                      <th className="p-2.5 text-right font-semibold text-amber-600">GSTR-2B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    <tr className="hover:bg-gray-50">
                      <td className="p-2.5 font-sans text-gray-500">Date</td>
                      <td className="p-2.5 text-right text-gray-800">{invoice.date || '—'}</td>
                      <td className="p-2.5 text-right text-gray-800">{invoice.date || '—'}</td>
                    </tr>
                    <tr className={`hover:bg-gray-50 ${invoice.diff > 0 ? c.bg : ''}`}>
                      <td className="p-2.5 font-sans text-gray-500">Tax Amount</td>
                      <td className="p-2.5 text-right text-blue-700 font-bold">{formatCurrency(invoice.prTax)}</td>
                      <td className={`p-2.5 text-right font-bold ${invoice.diff > 0 ? c.text : 'text-gray-800'}`}>{formatCurrency(invoice.g2bTax)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-2.5 font-sans text-gray-500">Difference</td>
                      <td colSpan={2} className={`p-2.5 text-right font-bold ${invoice.diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(invoice.diff)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk intelligence */}
            {invoice.score > 40 && (
              <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldAlert size={14} className={c.text} />
                  <span className={`text-[12px] font-bold ${c.text}`}>Risk Intelligence</span>
                </div>
                <p className="text-[12px] text-gray-700">
                  {invoice.status === 'Missing'   && 'Invoice present in your Purchase Register but absent in GSTR-2B. You may not be able to claim ITC on this invoice.'}
                  {invoice.status === 'Partial'   && `Tax mismatch of ${formatCurrency(invoice.diff)} detected. Discrepancy may indicate data entry error or supplier under-reporting.`}
                  {invoice.status === 'Duplicate' && 'Duplicate invoice number detected in your Purchase Register. This could inflate ITC claims.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 grid grid-cols-2 gap-3">
            <button className="py-2 px-4 bg-white border border-gray-300 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <CheckCircle2 size={15} /> Mark Reviewed
            </button>
            <button className="py-2 px-4 bg-red-600 text-white text-[13px] font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <AlertTriangle size={15} /> Create Case
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Table row ──────────────────────────────────────────────────────────────────
function InvoiceRow({ inv, selected, onClick }) {
  const risk = getRiskCategory(inv.score);
  const cfg  = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.Partial;
  const c    = COLOR_MAP[cfg.color] ?? COLOR_MAP.amber;
  const Icon = cfg.icon;

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors border-b border-gray-100 ${
        selected ? `${c.bg}` : 'hover:bg-gray-50/60'
      }`}
    >
      {/* Status icon */}
      <td className="px-4 py-3.5 w-10">
        <div className={`p-1.5 rounded-lg inline-flex ${c.bg}`}>
          <Icon size={14} className={c.text} />
        </div>
      </td>
      {/* Invoice / Supplier */}
      <td className="px-4 py-3.5">
        <div className="text-[13px] font-bold text-gray-900">{inv.id}</div>
        <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[180px]">{inv.supplier}</div>
        <div className="text-[10px] text-gray-400 font-mono">{inv.gstin}</div>
      </td>
      {/* Date */}
      <td className="px-4 py-3.5 text-[12px] text-gray-600 whitespace-nowrap">{inv.date || '—'}</td>
      {/* PR Tax */}
      <td className="px-4 py-3.5 text-[13px] font-mono text-blue-700 text-right font-semibold">
        {formatCurrency(inv.prTax)}
      </td>
      {/* G2B Tax */}
      <td className="px-4 py-3.5 text-[13px] font-mono text-right text-gray-700">
        {inv.status === 'Missing' ? <span className="text-gray-400 italic text-[12px]">absent</span> : formatCurrency(inv.g2bTax)}
      </td>
      {/* Diff */}
      <td className="px-4 py-3.5 text-right">
        <span className={`text-[12px] font-bold px-2 py-1 rounded border ${
          inv.diff > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'
        }`}>
          {formatCurrency(inv.diff)}
        </span>
      </td>
      {/* Risk */}
      <td className="px-4 py-3.5 text-center">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${RISK_STYLES[risk]}`}>
          {risk}
        </span>
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${c.badge}`}>
          {inv.status}
        </span>
      </td>
      {/* Conf */}
      <td className="px-4 py-3.5 text-center">
        <div className="text-[11px] text-gray-500 mb-1">{inv.conf}%</div>
        <MiniBar pct={inv.conf} color={inv.conf > 80 ? '#22c55e' : inv.conf > 40 ? '#f59e0b' : '#ef4444'} />
      </td>
      {/* Eye */}
      <td className="px-4 py-3.5 text-right">
        <Eye size={14} className="text-gray-300 group-hover:text-gray-600 transition-colors inline-block" />
      </td>
    </tr>
  );
}

// ── Export helper ──────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ['Invoice No', 'Supplier', 'GSTIN', 'Date', 'PR Tax', 'GSTR-2B Tax', 'Difference', 'Status', 'Risk Score', 'Confidence'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.id, `"${r.supplier}"`, r.gstin, r.date,
      r.prTax, r.g2bTax, r.diff,
      r.status, r.score, r.conf,
    ].join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mismatch_analysis_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Mismatch() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [rows, setRows]                 = useState([]);
  const [summary, setSummary]           = useState({ partial: 0, missing: 0, duplicate: 0 });
  const [totalTax, setTotalTax]         = useState({ partial: 0, missing: 0, duplicate: 0 });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Partial' | 'Missing' | 'Duplicate'
  const [search, setSearch]             = useState('');
  const [sortField, setSortField]       = useState('diff');
  const [sortDir, setSortDir]           = useState('desc');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [selectedInv, setSelectedInv]   = useState(null);
  const PAGE_SIZE = 20;
  const searchRef = useRef(null);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, partialRes, missingRes, dupRes] = await Promise.all([
        reconApi.getSummary(),
        reconApi.getResults({ limit: 500, status: 'Partial' }),
        reconApi.getResults({ limit: 500, status: 'Missing' }),
        reconApi.getResults({ limit: 500, status: 'Duplicate' }),
      ]);

      setSummary({
        partial:   summaryRes.partial   ?? 0,
        missing:   summaryRes.missing   ?? 0,
        duplicate: summaryRes.duplicate ?? 0,
      });

      const allMismatches = [
        ...(partialRes.results  || partialRes.data  || []),
        ...(missingRes.results  || missingRes.data  || []),
        ...(dupRes.results      || dupRes.data      || []),
      ];

      // Compute at-risk tax by type
      const calcTax = (arr) => arr.reduce((s, r) => s + (r.diff || r.prTax || 0), 0);
      setTotalTax({
        partial:   calcTax(partialRes.results  || partialRes.data  || []),
        missing:   calcTax(missingRes.results  || missingRes.data  || []),
        duplicate: calcTax(dupRes.results      || dupRes.data      || []),
      });

      setRows(allMismatches);
      setTotal(allMismatches.length);
    } catch (err) {
      console.error(err);
      setError('Failed to load mismatch data. Please ensure reconciliation has been run.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtered + sorted rows ───────────────────────────────────────────────────
  const filtered = rows
    .filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.id?.toLowerCase().includes(q) ||
          r.supplier?.toLowerCase().includes(q) ||
          r.gstin?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'diff')     return mul * ((a.diff  ?? 0) - (b.diff  ?? 0));
      if (sortField === 'prTax')    return mul * ((a.prTax ?? 0) - (b.prTax ?? 0));
      if (sortField === 'score')    return mul * ((a.score ?? 0) - (b.score ?? 0));
      if (sortField === 'supplier') return mul * (a.supplier ?? '').localeCompare(b.supplier ?? '');
      return 0;
    });

  const pageRows    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const totalAtRisk = Object.values(totalTax).reduce((s, v) => s + v, 0);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => (
    <ArrowUpDown
      size={11}
      className={`inline ml-1 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`}
    />
  );

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div>
          <div className="h-7 bg-gray-200 rounded-lg w-48 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-80 mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-[14px] animate-pulse" />)}
        </div>
        <div className="bg-white rounded-[14px] border border-gray-200 h-96 animate-pulse" />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] text-center gap-4">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
          <ShieldAlert size={28} className="text-red-500" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-gray-900">Failed to Load Data</p>
          <p className="text-[13px] text-gray-500 mt-1 max-w-xs">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Mismatch Analysis</h1>
          <p className="text-[14px] text-gray-500 mt-1">Deep dive into partial and completely mismatched invoices.</p>
        </div>
        <div className="bg-white rounded-[14px] border border-gray-200 h-[500px] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <div className="text-center">
            <h2 className="text-[18px] font-bold text-gray-900">No Mismatches Found!</h2>
            <p className="text-[13px] text-gray-500 max-w-sm mt-1">
              Your Purchase Register perfectly aligns with the GSTR-2B filings. Run reconciliation first if you haven't already.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex h-full relative transition-all duration-300 ${selectedInv ? '' : ''}`}>
      <div className={`flex-1 min-w-0 space-y-5 pb-12 transition-all duration-300 ${selectedInv ? 'sm:mr-[408px]' : ''}`}>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-[20px] sm:text-[26px] font-bold text-gray-900 tracking-tight">Mismatch Analysis</h1>
            <p className="text-[14px] text-gray-500 mt-1">
              Review discrepancies between your Purchase Register and supplier-filed GSTR-2B data.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <button
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary banner */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-amber-200 rounded-[14px] px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">
                {filtered.length.toLocaleString('en-IN')} invoice{filtered.length !== 1 ? 's' : ''} with discrepancies detected
              </p>
              <p className="text-[12px] text-gray-500">
                Total at-risk tax amount: <span className="font-bold text-red-600">{formatCurrency(totalAtRisk)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {summary.partial} Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {summary.missing} Missing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
              {summary.duplicate} Duplicate
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={FileWarning} color="amber" label="Partial Matches"
            count={summary.partial} totalTax={totalTax.partial}
            active={statusFilter === 'Partial'}
            onClick={() => { setStatusFilter(f => f === 'Partial' ? 'all' : 'Partial'); setPage(1); }}
          />
          <KpiCard
            icon={FileMinus} color="red" label="Missing in GSTR-2B"
            count={summary.missing} totalTax={totalTax.missing}
            active={statusFilter === 'Missing'}
            onClick={() => { setStatusFilter(f => f === 'Missing' ? 'all' : 'Missing'); setPage(1); }}
          />
          <KpiCard
            icon={Copy} color="violet" label="Duplicate Invoices"
            count={summary.duplicate} totalTax={totalTax.duplicate}
            active={statusFilter === 'Duplicate'}
            onClick={() => { setStatusFilter(f => f === 'Duplicate' ? 'all' : 'Duplicate'); setPage(1); }}
          />
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="px-3 sm:px-5 py-3.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search invoice, supplier, GSTIN…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 pr-8 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-full sm:w-72 transition-all"
                />
                {search && (
                  <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                {['all', 'Partial', 'Missing', 'Duplicate'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-2.5 py-1 text-[12px] font-semibold rounded-md transition-all ${
                      statusFilter === s
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[12px] text-gray-500 shrink-0">
              {filtered.length.toLocaleString('en-IN')} result{filtered.length !== 1 ? 's' : ''}
              {search && <span className="text-blue-600 ml-1">for "{search}"</span>}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 w-10" />
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('supplier')}>
                    Invoice / Supplier <SortIcon field="supplier" />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none" onClick={() => toggleSort('prTax')}>
                    PR Tax <SortIcon field="prTax" />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">GSTR-2B Tax</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none" onClick={() => toggleSort('diff')}>
                    Difference <SortIcon field="diff" />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer select-none" onClick={() => toggleSort('score')}>
                    Risk <SortIcon field="score" />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Conf %</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-16 text-center text-[13px] text-gray-400">
                      No invoices match your search or filter.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((inv, i) => (
                    <InvoiceRow
                      key={`${inv.id}-${inv.gstin}-${i}`}
                      inv={inv}
                      selected={selectedInv?.id === inv.id && selectedInv?.gstin === inv.gstin}
                      onClick={() => setSelectedInv(prev =>
                        prev?.id === inv.id && prev?.gstin === inv.gstin ? null : inv
                      )}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-[12px] text-gray-500">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString('en-IN')}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-2.5 py-1 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2.5 py-1 text-[12px] font-medium rounded-lg border transition-colors ${
                        page === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}>
                      {p}
                    </button>
                  );
                })}
                {totalPages > 7 && <span className="px-1 text-[12px] text-gray-400">…</span>}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2.5 py-1 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <DetailDrawer invoice={selectedInv} onClose={() => setSelectedInv(null)} />

      {/* Backdrop */}
      {selectedInv && (
        <div
          className="fixed inset-0 z-20 bg-black/5 backdrop-blur-[1px]"
          onClick={() => setSelectedInv(null)}
        />
      )}
    </div>
  );
}
