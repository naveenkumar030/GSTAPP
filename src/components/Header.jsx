import { Search, Bell, HelpCircle, ChevronDown, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Header({ toggleMobileOpen }) {
  const location = useLocation();
  
  // Basic logic to generate title from path
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPath = pathParts[pathParts.length - 1] || 'dashboard';
  const pageTitle = currentPath.charAt(0).toUpperCase() + currentPath.slice(1);
  
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/80 backdrop-blur-md border-b border-gray-200">
      
      {/* Left: Mobile Toggle & Title/Breadcrumb */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <button 
          onClick={toggleMobileOpen}
          className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden md:flex flex-col">
          <div className="flex items-center text-[12px] font-medium text-gray-500 mb-0.5">
            <span className="hover:text-blue-600 cursor-pointer">Workspace</span>
            <span className="mx-1.5">/</span>
            <span className="text-gray-900">{pageTitle}</span>
          </div>
          <h2 className="text-[18px] font-semibold text-gray-900 leading-tight">
            {pageTitle === 'Dashboard' ? 'Reconciliation Dashboard' : pageTitle}
          </h2>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-xl mx-4 hidden lg:block">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 text-[13px] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block pl-9 pr-16 py-2 transition-all outline-none shadow-sm placeholder-gray-400"
            placeholder="Search GSTIN, supplier, invoice, or case ID..."
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
              ⌘ K
            </span>
          </div>
        </div>
      </div>

      {/* Right: Selectors & Actions */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        
        {/* Context Selectors (Hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-md px-3 py-1.5 shadow-sm hover:border-gray-300 transition-colors">
            FY 2024-25
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          
          <button className="flex items-center gap-1.5 text-[13px] font-medium text-gray-900 bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5 shadow-sm hover:bg-blue-100 transition-colors">
            GSTIN: 27AAAAA0000A1Z5
            <ChevronDown size={14} className="text-blue-400" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <button className="relative p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          
          <button className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors hidden sm:block">
            <HelpCircle size={18} />
          </button>
          
          {/* Avatar (Mobile simplified) */}
          <button className="ml-1 md:hidden w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[12px] font-medium text-white shadow-sm">
            JS
          </button>
        </div>
      </div>

    </header>
  );
}
