import { BarChart3, Download } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Generate and export custom management reports and GST filing summaries.
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Download size={16} /> Export All Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <h3 className="text-[16px] font-bold text-gray-900 mb-2">Reconciliation Summary</h3>
          <p className="text-[13px] text-gray-500 mb-4">High-level overview of matched, mismatched, and missing invoices.</p>
          <button className="text-[13px] font-medium text-blue-600 hover:text-blue-700">Generate Report &rarr;</button>
        </div>
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <h3 className="text-[16px] font-bold text-gray-900 mb-2">Supplier Risk Profile</h3>
          <p className="text-[13px] text-gray-500 mb-4">Detailed risk assessment and discrepancy history per supplier.</p>
          <button className="text-[13px] font-medium text-blue-600 hover:text-blue-700">Generate Report &rarr;</button>
        </div>
      </div>
    </div>
  );
}
