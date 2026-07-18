
export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">System Settings</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Manage your organization profile, users, and reconciliation rules.
        </p>
      </div>

      <div className="bg-white rounded-[14px] border border-gray-200 shadow-soft overflow-hidden">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-[16px] font-semibold text-gray-900">Organization Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-gray-700">Company Name</label>
              <input type="text" defaultValue="GST ReconGraph Corp" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-gray-700">Primary GSTIN</label>
              <input type="text" defaultValue="27AAAAA0000A1Z5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
