import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Fraud() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Fraud Detection Engine</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Automated risk scoring and pattern recognition across all registered entities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
            <ShieldAlert size={20} className="text-red-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">High Risk Signals</h3>
          <p className="text-[32px] font-bold text-red-600 mb-2">14</p>
          <p className="text-[13px] text-gray-500">Entities flagged for immediate review</p>
        </div>
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">Medium Risk</h3>
          <p className="text-[32px] font-bold text-amber-600 mb-2">42</p>
          <p className="text-[13px] text-gray-500">Requires monitoring in next cycle</p>
        </div>
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">Safe Entities</h3>
          <p className="text-[32px] font-bold text-green-600 mb-2">1,204</p>
          <p className="text-[13px] text-gray-500">Verified and trusted suppliers</p>
        </div>
      </div>
    </div>
  );
}
