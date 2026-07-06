import { FolderLock } from 'lucide-react';

export default function Cases() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Fraud Cases</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Manage, assign, and track ongoing fraud investigations.
        </p>
      </div>

      <div className="bg-white rounded-[14px] border border-gray-200 shadow-soft overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 font-semibold text-gray-600">Case ID</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Primary Entity</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Risk Pattern</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-5 py-3 font-semibold text-gray-600">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-5 py-4 font-medium text-gray-900">#CAS-882</td>
              <td className="px-5 py-4 text-gray-700">TechCorp India Pvt Ltd</td>
              <td className="px-5 py-4 text-gray-700">Circular Trading Loop</td>
              <td className="px-5 py-4"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-semibold">Investigating</span></td>
              <td className="px-5 py-4 text-gray-700">John Smith</td>
            </tr>
            <tr className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="px-5 py-4 font-medium text-gray-900">#CAS-883</td>
              <td className="px-5 py-4 text-gray-700">Global Supplies Inc.</td>
              <td className="px-5 py-4 text-gray-700">Shared Bank Details</td>
              <td className="px-5 py-4"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-semibold">Open</span></td>
              <td className="px-5 py-4 text-gray-700">Unassigned</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
