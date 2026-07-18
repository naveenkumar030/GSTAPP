import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { fraudApi } from '../services/api';

export default function Fraud() {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fraudApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load fraud data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const high   = summary?.high_risk   ?? 0;
  const medium = summary?.medium_risk ?? 0;
  const safe   = summary?.safe        ?? 0;
  const hasData = summary?.hasData    ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Fraud Detection Engine</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Automated risk scoring and pattern recognition across all registered entities.
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary shrink-0"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-[13px] font-medium rounded-xl border border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* No Data Banner */}
      {!loading && !error && !hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-blue-900">No fraud data yet</p>
            <p className="text-[12px] text-blue-700 mt-0.5">
              Upload files and run reconciliation to generate entity risk scores.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <ShieldAlert size={20} className="text-red-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">High Risk Signals</h3>
          <p className="text-[32px] font-bold text-red-600 mb-2">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-gray-100 rounded animate-pulse" />
            ) : high.toLocaleString('en-IN')}
          </p>
          <p className="text-[13px] text-gray-500">Entities flagged for immediate review</p>
        </div>

        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">Medium Risk</h3>
          <p className="text-[32px] font-bold text-amber-600 mb-2">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-gray-100 rounded animate-pulse" />
            ) : medium.toLocaleString('en-IN')}
          </p>
          <p className="text-[13px] text-gray-500">Requires monitoring in next cycle</p>
        </div>

        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">Safe Entities</h3>
          <p className="text-[32px] font-bold text-green-600 mb-2">
            {loading ? (
              <span className="inline-block w-12 h-8 bg-gray-100 rounded animate-pulse" />
            ) : safe.toLocaleString('en-IN')}
          </p>
          <p className="text-[13px] text-gray-500">Verified and trusted suppliers</p>
        </div>
      </div>
    </div>
  );
}
