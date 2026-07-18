import { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  FileWarning, UploadCloud, RefreshCw, ChevronRight,
  Hash,
} from 'lucide-react';
import { fraudApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const SEV_STYLES = {
  Critical: 'bg-red-100 text-red-700 border border-red-200',
  High:     'bg-orange-100 text-orange-700 border border-orange-200',
  Medium:   'bg-amber-100 text-amber-700 border border-amber-200',
  Low:      'bg-green-100 text-green-700 border border-green-200',
};

const STATUS_ICON = {
  Missing:   { icon: XCircle,      cls: 'text-red-500'    },
  Partial:   { icon: AlertTriangle, cls: 'text-amber-500'  },
  Duplicate: { icon: FileWarning,   cls: 'text-violet-500' },
  Exact:     { icon: CheckCircle2,  cls: 'text-green-500'  },
};

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
        <ShieldAlert size={26} className="text-gray-400" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-gray-800">No fraud cases found</p>
        <p className="text-[13px] text-gray-500 mt-1 max-w-sm">
          Cases are generated from reconciliation results. Upload your files and run reconciliation first.
        </p>
      </div>
      <button
        onClick={() => navigate('/dashboard/upload')}
        className="btn-primary mt-2"
      >
        <UploadCloud size={14} />
        Go to Data Upload
      </button>
    </div>
  );
}

export default function Cases() {
  const [cases, setCases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const LIMIT = 20;

  const loadCases = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fraudApi.getCases({ page: p, limit: LIMIT });
      setCases(res.cases || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch (err) {
      setError('Failed to load fraud cases. Please try again.');
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCases(1); }, []);

  // Auto-refresh when reconciliation completes
  useEffect(() => {
    const handler = () => loadCases(1);
    window.addEventListener('reconciliation_completed', handler);
    window.addEventListener('reconciliation_updated', handler);
    return () => {
      window.removeEventListener('reconciliation_completed', handler);
      window.removeEventListener('reconciliation_updated', handler);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Fraud Cases</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {total > 0
              ? `${total} flagged supplier${total !== 1 ? 's' : ''} from reconciliation results`
              : 'Manage, assign, and track ongoing fraud investigations.'}
          </p>
        </div>
        <button
          onClick={() => loadCases(page)}
          className="btn-secondary"
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-soft overflow-hidden">
        {loading ? (
          /* Skeleton */
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                <div className="w-24 h-4 bg-gray-100 rounded" />
                <div className="flex-1 h-4 bg-gray-100 rounded" />
                <div className="w-32 h-4 bg-gray-100 rounded" />
                <div className="w-20 h-6 bg-gray-100 rounded-full" />
                <div className="w-16 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[13px] text-red-600 font-medium">{error}</p>
            <button onClick={() => loadCases(1)} className="btn-secondary mt-3">Retry</button>
          </div>
        ) : cases.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-600">GSTIN</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Supplier</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Risk Pattern</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Severity</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Score</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Invoices</th>
                  <th className="px-5 py-3 font-semibold text-gray-600">Tax Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c, i) => {
                  const statuses = c.statuses || [];
                  const primaryStatus = statuses.includes('Duplicate') ? 'Duplicate'
                    : statuses.includes('Missing') ? 'Missing'
                    : statuses.includes('Partial') ? 'Partial'
                    : 'Exact';
                  const si = STATUS_ICON[primaryStatus] || STATUS_ICON.Partial;
                  const Icon = si.icon;

                  return (
                    <tr key={c.gstin || i} className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-4 font-mono text-[12px] text-gray-600">{c.gstin || '—'}</td>
                      <td className="px-5 py-4 font-medium text-gray-900 max-w-[180px] truncate">{c.supplier}</td>
                      <td className="px-5 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} className={si.cls} />
                          {c.reason}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${SEV_STYLES[c.severity] || SEV_STYLES.Medium}`}>
                          {c.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900">{c.score}</span>
                        <span className="text-gray-400 text-[11px]">/100</span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{c.invoice_count}</td>
                      <td className="px-5 py-4 text-red-600 font-medium">
                        {c.total_diff > 0 ? `₹${c.total_diff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12px] text-gray-500">
                <span>Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadCases(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => loadCases(page + 1)}
                    disabled={page * LIMIT >= total}
                    className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
