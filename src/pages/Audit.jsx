import { History } from 'lucide-react';

export default function Audit() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Audit Trail</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Track all user actions, system events, and data modifications.
        </p>
      </div>

      <div className="bg-white rounded-[14px] border border-gray-200 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-[14px] font-semibold text-gray-700">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { action: 'Marked Invoice INV-301 as Reviewed', user: 'John Smith', time: '10 minutes ago' },
            { action: 'Ran automated reconciliation for FY 24-25 Q1', user: 'System', time: '2 hours ago' },
            { action: 'Exported Supplier Risk Report', user: 'Jane Doe', time: 'Yesterday at 4:30 PM' },
            { action: 'Uploaded GSTR-2B JSON file', user: 'John Smith', time: 'Yesterday at 10:15 AM' },
          ].map((log, idx) => (
            <div key={idx} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className="mt-1 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <History size={16} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-900">{log.action}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">by <span className="font-medium text-gray-700">{log.user}</span> • {log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
