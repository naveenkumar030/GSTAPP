import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  GitCompare, 
  FileWarning, 
  ShieldAlert, 
  Network, 
  FolderLock, 
  BarChart3, 
  History, 
  Settings,
  Plus,
  LogOut
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { id: '/dashboard/upload', icon: UploadCloud, label: 'Data Upload' },
      { id: '/dashboard/reconciliation', icon: GitCompare, label: 'Reconciliation' },
      { id: '/dashboard/mismatch', icon: FileWarning, label: 'Mismatch Analysis' },
    ]
  },
  {
    title: 'INVESTIGATION',
    items: [
      { id: '/dashboard/fraud', icon: ShieldAlert, label: 'Fraud Detection' },
      { id: '/dashboard/graph', icon: Network, label: 'Graph Explorer' },
      { id: '/dashboard/cases', icon: FolderLock, label: 'Fraud Cases' },
    ]
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
      { id: '/dashboard/audit', icon: History, label: 'Audit Trail' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { id: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ]
  }
];

export default function Sidebar({ collapsed, setMobileOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <aside 
      className={`h-full flex flex-col bg-[#111827] text-white transition-all duration-300 ease-in-out border-r border-[#1f2937] ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Header Area */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-4`}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-soft">
          <Network size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className="text-[15px] font-bold text-white truncate leading-tight">GST ReconGraph</h1>
            <p className="text-[11px] text-gray-400 font-medium truncate">Reconciliation Intelligence</p>
          </div>
        )}
      </div>

      {/* Primary Action */}
      <div className={`px-4 mb-6 ${collapsed ? 'flex justify-center' : ''}`}>
        <button 
          title={collapsed ? "New Audit" : ""}
          className={`bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center rounded-lg shadow-soft ${
            collapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-4 gap-2 text-[14px] font-medium'
          }`}
        >
          <Plus size={18} />
          {!collapsed && "New Audit"}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[11px] font-semibold text-gray-500 tracking-wider mb-2">
                {group.title}
              </h3>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.id}
                end={item.id === '/dashboard'}
                title={collapsed ? item.label : ""}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={({ isActive }) =>
                  `nav-link flex items-center rounded-lg min-h-[44px] ${
                    isActive 
                      ? 'bg-[rgba(37,99,235,0.15)] text-blue-400 font-medium' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  } ${collapsed ? 'justify-center px-0' : 'px-3 gap-[12px]'}`
                }
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-[14px] truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-gray-800 mt-2">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-[14px] font-medium text-white">
              JS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">John Smith</p>
              <p className="text-[11px] text-gray-400 truncate">Auditor</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
             <div 
               className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-[14px] font-medium text-white cursor-pointer hover:ring-2 hover:ring-gray-500 transition-all"
               title="John Smith"
             >
               JS
             </div>
             <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
          </div>
        )}
      </div>
    </aside>
  );
}
