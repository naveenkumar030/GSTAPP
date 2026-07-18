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
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: '/dashboard',                icon: LayoutDashboard, label: 'Overview' },
      { id: '/dashboard/upload',         icon: UploadCloud,     label: 'Data Upload' },
      { id: '/dashboard/reconciliation', icon: GitCompare,      label: 'Reconciliation' },
      { id: '/dashboard/mismatch',       icon: FileWarning,     label: 'Mismatch Analysis' },
    ],
  },
  {
    title: 'INVESTIGATION',
    items: [
      { id: '/dashboard/fraud',  icon: ShieldAlert, label: 'Fraud Detection' },
      { id: '/dashboard/network-graph',  icon: Network,     label: 'Network Graph' },
      { id: '/dashboard/fraud-graph',  icon: Network,     label: 'Fraud Graph' },
      { id: '/dashboard/cases',  icon: FolderLock,  label: 'Fraud Cases' },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { id: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
      { id: '/dashboard/audit',   icon: History,   label: 'Audit Trail' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed, setMobileOpen, onNewAudit }) {
  const navigate = useNavigate();

  const handleLogout = () => navigate('/login');

  const storedName = localStorage.getItem('userName') || 'John Smith';
  const initials = storedName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JS';

  return (
    <aside
      className={`h-full flex flex-col bg-[#111827] text-white border-r border-[#1E2A3B] transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* ── Logo ── */}
      <div className={`h-16 flex items-center border-b border-[#1E2A3B] shrink-0 ${
        collapsed ? 'justify-center px-4' : 'px-4 gap-3'
      }`}>
        <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg object-cover" />
        {!collapsed && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className="text-[14px] font-bold text-white truncate leading-tight tracking-tight">
              GST Reconciliation
            </h1>
            <p className="text-[10px] text-[#6B7280] font-medium truncate mt-0.5">
              Reconciliation Intelligence
            </p>
          </div>
        )}
      </div>

      {/* ── New Audit CTA ── */}
      <div className={`px-3 py-3 border-b border-[#1E2A3B] shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="tooltip-container">
            <button
              onClick={onNewAudit}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
              aria-label="New Audit"
            >
              <Plus size={18} />
            </button>
            <span className="tooltip" style={{ left: '100%', bottom: 'auto', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }}>
              New Audit
            </span>
          </div>
        ) : (
          <button onClick={onNewAudit} className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Plus size={16} />
            New Audit
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={`${gi > 0 ? 'mt-5' : ''}`}>
            {!collapsed && (
              <div className="px-4 mb-1.5">
                <span className="label-caps text-[#4B5563]">{group.title}</span>
              </div>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 mb-3 h-px bg-[#1E2A3B]" />
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <div key={item.id} className="tooltip-container">
                  <NavLink
                    to={item.id}
                    end={item.id === '/dashboard'}
                    onClick={() => setMobileOpen && setMobileOpen(false)}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''} ${
                        collapsed ? 'justify-center px-0' : 'px-3 gap-[10px]'
                      }`
                    }
                  >
                    <item.icon size={18} className="shrink-0" aria-hidden="true" />
                    {!collapsed && (
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                    )}
                  </NavLink>
                  {collapsed && (
                    <span
                      className="tooltip"
                      style={{
                        left: '100%',
                        bottom: 'auto',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        marginLeft: '10px',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse Toggle (desktop only) ── */}
      {setCollapsed && (
        <div className={`px-3 py-2 border-t border-[#1E2A3B] shrink-0 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-7 h-7 rounded-md bg-[#1E2A3B] hover:bg-[#2D3748] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      )}

      {/* ── User Footer ── */}
      <div className={`p-3 border-t border-[#1E2A3B] shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 text-[12px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">{storedName}</p>
              <p className="text-[11px] text-[#6B7280] truncate">Senior Auditor</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="tooltip-container">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[12px] font-bold text-white cursor-pointer">
                {initials}
              </div>
              <span className="tooltip" style={{ left: '100%', bottom: 'auto', top: '50%', transform: 'translateY(-50%)', marginLeft: '10px' }}>
                {storedName}
              </span>
            </div>
            <div className="tooltip-container">
              <button
                onClick={handleLogout}
                className="w-8 h-8 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors flex items-center justify-center"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
              <span className="tooltip" style={{ left: '100%', bottom: 'auto', top: '50%', transform: 'translateY(-50%)', marginLeft: '10px' }}>
                Logout
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
