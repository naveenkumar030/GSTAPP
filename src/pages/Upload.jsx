import { UploadCloud, FileType, CheckCircle2 } from 'lucide-react';

export default function Upload() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">Data Upload</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Upload Purchase Register and GSTR-2B JSON/Excel files for reconciliation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Purchase Register Upload */}
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileType size={18} className="text-blue-600" /> Purchase Register
          </h2>
          <div className="border-2 border-dashed border-gray-200 rounded-[12px] p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer group">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={24} className="text-blue-600" />
            </div>
            <p className="text-[14px] font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
            <p className="text-[12px] text-gray-500">Excel, CSV, or JSON (max. 50MB)</p>
          </div>
        </div>

        {/* GSTR-2B Upload */}
        <div className="bg-white p-6 rounded-[14px] border border-gray-200 shadow-soft">
          <h2 className="text-[16px] font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileType size={18} className="text-green-600" /> GSTR-2B Data
          </h2>
          <div className="border-2 border-dashed border-gray-200 rounded-[12px] p-8 flex flex-col items-center justify-center text-center hover:border-green-500 hover:bg-green-50/50 transition-colors cursor-pointer group">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={24} className="text-green-600" />
            </div>
            <p className="text-[14px] font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
            <p className="text-[12px] text-gray-500">JSON files directly from GST Portal (max. 50MB)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="px-6 py-2.5 bg-blue-600 text-white text-[14px] font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
          Process Files
        </button>
      </div>
    </div>
  );
}
