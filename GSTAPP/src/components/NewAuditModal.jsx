import { X, History } from 'lucide-react';
import { useState } from 'react';

export default function NewAuditModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Internal Audit',
    fy: 'FY 24-25',
    quarter: 'Q1',
    scope: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission
    if (onSubmit) onSubmit(formData);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[92vw] bg-white rounded-2xl shadow-modal z-[100] animate-slide-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">Create New Audit</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Initialize a new audit workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form id="new-audit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Audit Title</label>
              <input
                required
                type="text"
                placeholder="e.g. FY24-25 Q1 Comprehensive Review"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Audit Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Internal Audit</option>
                  <option>Statutory Audit</option>
                  <option>Tax Audit</option>
                  <option>Compliance Check</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Financial Year</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.fy}
                  onChange={(e) => setFormData({ ...formData, fy: e.target.value })}
                >
                  <option>FY 24-25</option>
                  <option>FY 23-24</option>
                  <option>FY 22-23</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Scope & Remarks (Optional)</label>
              <textarea
                placeholder="Define the scope or key focus areas of this audit..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              ></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-audit-form"
            className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
          >
            Create Audit
          </button>
        </div>
      </div>
    </div>
  );
}
