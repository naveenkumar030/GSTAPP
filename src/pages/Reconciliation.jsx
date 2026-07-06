import { useState } from 'react';
import { 
  Filter, Search, SlidersHorizontal, Download, 
  Play, MoreVertical, X, CheckCircle2, AlertTriangle, 
  XCircle, Network, ShieldAlert, ArrowRight, Eye
} from 'lucide-react';

const MOCK_DATA = [
  { id: 'INV-001', supplier: 'TechCorp India Pvt Ltd', gstin: '27AADCT4321A1Z1', date: '12 May 2024', prTax: 125000.00, g2bTax: 125000.00, diff: 0, conf: 100, score: 5, status: 'Exact' },
  { id: 'INV-089', supplier: 'Global Supplies Inc.', gstin: '27BBBBT0000B2Z2', date: '14 May 2024', prTax: 450000.00, g2bTax: 350000.00, diff: 100000.00, conf: 65, score: 78, status: 'Partial' },
  { id: 'INV-112', supplier: 'Apex Manufacturing', gstin: '27CCCCT1111C3Z3', date: '15 May 2024', prTax: 85000.00, g2bTax: 0, diff: 85000.00, conf: 0, score: 92, status: 'Missing' },
  { id: 'INV-205', supplier: 'TradeNet Solutions', gstin: '27DDDDN2222D4Z4', date: '18 May 2024', prTax: 210000.00, g2bTax: 210000.00, diff: 0, conf: 95, score: 65, status: 'Duplicate' },
  { id: 'INV-301', supplier: 'Quality Logistics', gstin: '27EEEEQ3333E5Z5', date: '20 May 2024', prTax: 56000.50, g2bTax: 56000.00, diff: 0.50, conf: 99, score: 12, status: 'Under Review' },
];

const getStatusStyles = (status) => {
  switch(status) {
    case 'Exact': return 'bg-green-100 text-green-700 border-green-200';
    case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Missing': return 'bg-red-100 text-red-700 border-red-200';
    case 'Duplicate': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Under Review': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val);

export default function Reconciliation() {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const handleRunRecon = () => {
    setIsReconciling(true);
    setTimeout(() => setIsReconciling(false), 2000);
  };

  return (
    <div className="flex h-full relative">
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedInvoice ? 'mr-[400px]' : ''}`}>
        
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-t-[14px] border-x border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
              <Filter size={14} /> Filters <span className="bg-blue-100 text-blue-700 px-1.5 rounded-full text-[11px]">3</span>
            </button>
            <div className="h-5 w-px bg-gray-300 mx-1"></div>
            <select className="text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 outline-none hover:border-gray-300 focus:border-blue-500">
              <option>Filing Period: Q1 24-25</option>
            </select>
            <select className="text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 outline-none hover:border-gray-300 focus:border-blue-500">
              <option>Status: All</option>
            </select>
            <button className="text-[12px] font-medium text-blue-600 hover:text-blue-800 ml-1">Clear</button>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md" title="Export">
              <Download size={18} />
            </button>
            <button 
              onClick={handleRunRecon}
              disabled={isReconciling}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              <Play size={14} className={isReconciling ? 'animate-pulse' : ''} />
              {isReconciling ? 'Reconciling...' : 'Run Reconciliation'}
            </button>
          </div>
        </div>

        {/* Table Panel */}
        <div className="bg-white border border-gray-200 rounded-b-[14px] flex-1 overflow-hidden flex flex-col">
          
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-bold text-gray-900">Invoice Reconciliation</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">Compare purchase register invoices against GSTR-2B records.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search within results..." 
                  className="pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-64"
                />
              </div>
              <button className="p-1.5 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50" title="Columns">
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-200 w-10">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap cursor-pointer hover:bg-gray-100">Supplier & Invoice</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 text-right whitespace-nowrap">Purchase Tax</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 text-right whitespace-nowrap">GSTR-2B Tax</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 text-right whitespace-nowrap">Difference</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 text-center whitespace-nowrap">Match %</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 text-center whitespace-nowrap">Risk</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-600 border-b border-gray-200 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_DATA.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => setSelectedInvoice(row)}
                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedInvoice?.id === row.id ? 'bg-blue-50/50' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-gray-900">{row.supplier}</span>
                        <span className="text-[11px] text-gray-500">{row.gstin} • {row.id} • {row.date}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-mono text-gray-700 text-right">{formatCurrency(row.prTax)}</td>
                    <td className="px-4 py-3 text-[13px] font-mono text-gray-700 text-right">{formatCurrency(row.g2bTax)}</td>
                    <td className={`px-4 py-3 text-[13px] font-mono text-right font-medium ${row.diff > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatCurrency(row.diff)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[12px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{row.conf}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[12px] font-bold ${row.score > 80 ? 'text-red-600' : row.score > 50 ? 'text-amber-600' : 'text-green-600'}`}>
                        {row.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusStyles(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 text-gray-400 hover:text-gray-800" onClick={(e) => { e.stopPropagation(); }}>
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between bg-gray-50 rounded-b-[14px]">
            <span className="text-[12px] text-gray-500">Showing 1 to 5 of 12,450 entries</span>
            <div className="flex gap-1">
              <button className="px-2 py-1 text-[12px] font-medium text-gray-400 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50" disabled>Prev</button>
              <button className="px-2 py-1 text-[12px] font-medium text-white bg-blue-600 border border-blue-600 rounded">1</button>
              <button className="px-2 py-1 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50">2</button>
              <button className="px-2 py-1 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50">3</button>
              <span className="px-2 py-1 text-[12px] text-gray-400">...</span>
              <button className="px-2 py-1 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      <div 
        className={`fixed top-16 right-0 h-[calc(100vh-64px)] w-[400px] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${
          selectedInvoice ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedInvoice && (
          <>
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">{selectedInvoice.id}</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Details & Mismatch Analysis</p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              
              {/* Status Banner */}
              <div className={`p-3 rounded-lg border flex items-start gap-3 ${getStatusStyles(selectedInvoice.status)}`}>
                <div className="shrink-0 mt-0.5">
                  {selectedInvoice.status === 'Exact' ? <CheckCircle2 size={16} /> : 
                   selectedInvoice.status === 'Missing' ? <XCircle size={16} /> : 
                   <AlertTriangle size={16} />}
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold">{selectedInvoice.status} Match</h4>
                  <p className="text-[12px] mt-1 opacity-90">
                    {selectedInvoice.diff > 0 
                      ? `Tax difference of ${formatCurrency(selectedInvoice.diff)} found between PR and 2B.` 
                      : 'All values matched successfully.'}
                  </p>
                </div>
              </div>

              {/* Supplier Info */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Supplier Information</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-gray-500">Name</span>
                    <span className="text-[13px] font-medium text-gray-900">{selectedInvoice.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-gray-500">GSTIN</span>
                    <span className="text-[13px] font-mono text-gray-900">{selectedInvoice.gstin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-gray-500">Filing Status</span>
                    <span className="text-[12px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</span>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Field Comparison</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="p-2 font-medium text-gray-600">Field</th>
                        <th className="p-2 font-medium text-gray-600">Purchase Reg</th>
                        <th className="p-2 font-medium text-gray-600">GSTR-2B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      <tr>
                        <td className="p-2 text-gray-500 font-sans">Date</td>
                        <td className="p-2 text-gray-900">{selectedInvoice.date}</td>
                        <td className="p-2 text-gray-900">{selectedInvoice.date}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-500 font-sans">Taxable Val</td>
                        <td className="p-2 text-gray-900">₹10,00,000</td>
                        <td className="p-2 text-gray-900">₹10,00,000</td>
                      </tr>
                      <tr className={selectedInvoice.diff > 0 ? 'bg-red-50/50' : ''}>
                        <td className="p-2 text-gray-500 font-sans">Tax Amount</td>
                        <td className="p-2 text-gray-900">{formatCurrency(selectedInvoice.prTax)}</td>
                        <td className={`p-2 font-medium ${selectedInvoice.diff > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(selectedInvoice.g2bTax)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Intelligence */}
              {selectedInvoice.score > 50 && (
                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <ShieldAlert size={14} className="text-red-500" /> Intelligence
                  </h4>
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <p className="text-[12px] text-orange-800 font-medium mb-1">High Risk Score: {selectedInvoice.score}</p>
                    <p className="text-[12px] text-orange-700 opacity-90">Supplier has a history of late filings and recent mismatched invoices across 3 other buyers.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-white grid grid-cols-2 gap-3">
              <button className="py-2 px-4 bg-white border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Mark Reviewed
              </button>
              <button className="py-2 px-4 bg-red-600 border border-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <AlertTriangle size={16} /> Create Case
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
