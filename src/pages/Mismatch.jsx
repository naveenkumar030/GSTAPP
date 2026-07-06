import { FileWarning, Search, Filter } from 'lucide-react';

export default function Mismatch() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Mismatch Analysis</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Deep dive into partial and completely mismatched invoices.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-gray-200 shadow-soft h-[600px] flex items-center justify-center flex-col text-center p-6">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <FileWarning size={32} className="text-amber-500" />
        </div>
        <h2 className="text-[18px] font-semibold text-gray-900 mb-2">No active mismatch filters applied</h2>
        <p className="text-[14px] text-gray-500 max-w-sm mb-6">
          Use the reconciliation table to select specific mismatched invoices for detailed field-level comparison.
        </p>
        <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
          Go to Reconciliation
        </button>
      </div>
    </div>
  );
}
