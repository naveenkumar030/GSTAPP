import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, HelpCircle, ChevronDown, Menu, LogOut, User, Settings, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';

// ── Helpers ────────────────────────────────────────────────────
function generateFYOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? year : year - 1; // FY starts April
  const options = [];
  for (let y = startYear + 1; y >= startYear - 3; y--) {
    options.push(`FY ${y}-${String(y + 1).slice(-2)}`);
  }
  return options;
}

const PAGE_META = {
  dashboard:       { title: 'Overview',          breadcrumb: 'Workspace' },
  upload:          { title: 'Data Upload',        breadcrumb: 'Workspace' },
  reconciliation:  { title: 'Reconciliation',    breadcrumb: 'Workspace' },
  mismatch:        { title: 'Mismatch Analysis', breadcrumb: 'Workspace' },
  fraud:           { title: 'Fraud Detection',   breadcrumb: 'Investigation' },
  graph:           { title: 'Graph Explorer',    breadcrumb: 'Investigation' },
  cases:           { title: 'Fraud Cases',       breadcrumb: 'Investigation' },
  reports:         { title: 'Reports',           breadcrumb: 'Analytics' },
  audit:           { title: 'Audit Trail',       breadcrumb: 'Analytics' },
  settings:        { title: 'Settings',          breadcrumb: 'System' },
  profile:         { title: 'User Profile',      breadcrumb: 'System' },
};

export default function Header({ toggleMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [notifOpen, setNotifOpen]   = useState(false);
  const [fyOpen,    setFyOpen]      = useState(false);
  const [gstinOpen, setGstinOpen]   = useState(false);
  const avatarRef  = useRef(null);
  const notifRef   = useRef(null);
  const fyRef      = useRef(null);
  const gstinRef   = useRef(null);

  // Dynamic FY & GSTIN state — persisted in localStorage
  const FY_OPTIONS = useMemo(() => generateFYOptions(), []);
  const [selectedFY, setSelectedFY] = useState(
    () => localStorage.getItem('selectedFY') || FY_OPTIONS[1] || 'FY 2024-25'
  );

  // Build GSTIN list from stored user data (real app would fetch from API)
  const storedGstin = localStorage.getItem('userGstin') || '27AAAAA0000A1Z5';
  const GSTIN_OPTIONS = useMemo(() => {
    const primary = storedGstin;
    // In a real app this list comes from the backend; we expose the stored one
    return [primary];
  }, [storedGstin]);
  const [selectedGstin, setSelectedGstin] = useState(
    () => localStorage.getItem('selectedGstin') || GSTIN_OPTIONS[0]
  );

  const handleFYSelect = (fy) => {
    setSelectedFY(fy);
    localStorage.setItem('selectedFY', fy);
    setFyOpen(false);
  };

  const handleGstinSelect = (g) => {
    setSelectedGstin(g);
    localStorage.setItem('selectedGstin', g);
    setGstinOpen(false);
  };

  const shortGstin = selectedGstin.length > 10
    ? `${selectedGstin.slice(0, 5)}…${selectedGstin.slice(-3)}`
    : selectedGstin;

  const pathParts  = location.pathname.split('/').filter(Boolean);
  const currentKey = pathParts[pathParts.length - 1] || 'dashboard';
  const meta       = PAGE_META[currentKey] || { title: currentKey, breadcrumb: 'Workspace' };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (avatarRef.current  && !avatarRef.current.contains(e.target))  setAvatarOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (fyRef.current      && !fyRef.current.contains(e.target))      setFyOpen(false);
      if (gstinRef.current   && !gstinRef.current.contains(e.target))   setGstinOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ⌘K shortcut handled in Layout; nothing to do here

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const res = await dashboardApi.getAlerts();
        if (active && res && res.alerts) {
          const mapped = res.alerts.map((a, i) => {
            let type = 'info';
            if (a.severity === 'Critical' || a.severity === 'High') {
              type = 'danger';
            } else if (a.severity === 'Medium') {
              type = 'warning';
            }
            return {
              id: a.id || i,
              type,
              title: `${a.severity} Alert`,
              msg: a.reason,
              time: a.time || 'Just now',
            };
          });
          setNotifications(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    
    fetchNotifications();

    const timer = setInterval(fetchNotifications, 30000);
    window.addEventListener('reconciliation_completed', fetchNotifications);
    window.addEventListener('reconciliation_updated', fetchNotifications);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('reconciliation_completed', fetchNotifications);
      window.removeEventListener('reconciliation_updated', fetchNotifications);
    };
  }, []);

  const storedName = localStorage.getItem('userName') || 'John Smith';
  const storedEmail = localStorage.getItem('userEmail') || 'john@gstrecon.in';
  const initials = storedName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JS';

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] shrink-0">

      {/* ── Mobile hamburger ── */}
      <button
        onClick={toggleMobileOpen}
        className="md:hidden btn-icon border-0 p-2"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* ── Left: breadcrumb + title ── */}
      <div className="hidden md:flex flex-col justify-center min-w-0 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
          <span className="hover:text-blue-600 cursor-pointer transition-colors">{meta.breadcrumb}</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-semibold">{meta.title}</span>
        </div>
        <h2 className="text-[16px] font-bold text-gray-900 leading-tight truncate">
          {meta.title}
        </h2>
      </div>

      <div className="hidden md:block divider-v h-8 mx-1" />



      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">

        {/* Context selectors — tablet and above */}
        <div className="hidden sm:flex items-center gap-2">

          {/* ── FY Selector ── */}
          <div ref={fyRef} className="relative">
            <button
              onClick={() => { setFyOpen((o) => !o); setGstinOpen(false); }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors shadow-sm"
              aria-haspopup="listbox"
              aria-expanded={fyOpen}
            >
              {selectedFY}
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-200 ${fyOpen ? 'rotate-180' : ''}`} />
            </button>
            {fyOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-slide-in-up" role="listbox">
                {FY_OPTIONS.map((fy) => (
                  <button
                    key={fy}
                    role="option"
                    aria-selected={fy === selectedFY}
                    onClick={() => handleFYSelect(fy)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium transition-colors ${
                      fy === selectedFY
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {fy}
                    {fy === selectedFY && <Check size={11} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── GSTIN Selector ── */}
          <div ref={gstinRef} className="relative">
            <button
              onClick={() => { setGstinOpen((o) => !o); setFyOpen(false); }}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors shadow-sm"
              aria-haspopup="listbox"
              aria-expanded={gstinOpen}
            >
              <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">GSTIN</span>
              <span className="font-mono text-[11px]">{shortGstin}</span>
              <ChevronDown size={12} className={`text-blue-400 transition-transform duration-200 ${gstinOpen ? 'rotate-180' : ''}`} />
            </button>
            {gstinOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden animate-slide-in-up" role="listbox">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your GSTINs</p>
                </div>
                {GSTIN_OPTIONS.map((g) => (
                  <button
                    key={g}
                    role="option"
                    aria-selected={g === selectedGstin}
                    onClick={() => handleGstinSelect(g)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                      g === selectedGstin
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${
                      g === selectedGstin ? 'text-blue-700 font-bold' : 'text-gray-700'
                    }`}>{g}</span>
                    {g === selectedGstin && <Check size={11} className="text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="hidden sm:block divider-v h-6 mx-1" />

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            className="relative p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label={`Notifications (${notifications.length} unread)`}
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] sm:w-[340px] max-w-[340px] bg-white rounded-xl shadow-modal border border-gray-200 z-50 animate-slide-in-up overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900">Notifications</h3>
                  <p className="text-[11px] text-gray-500">
                    {notifications.length} unread alert{notifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  className="text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() => setNotifications([])}
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-[12px] font-medium">All clean! No alerts.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          n.type === 'danger'  ? 'bg-red-500' :
                          n.type === 'warning' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-gray-900">{n.title}</p>
                          <p className="text-[12px] text-gray-500 truncate" title={n.msg}>{n.msg}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100">
                <button className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 w-full text-center">
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors hidden sm:flex"
          aria-label="Help & documentation"
        >
          <HelpCircle size={18} />
        </button>

        {/* Avatar / User menu */}
        <div ref={avatarRef} className="relative">
          <button
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setAvatarOpen((o) => !o)}
            aria-label="User menu"
            aria-expanded={avatarOpen}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <ChevronDown size={12} className="text-gray-400 hidden md:block" />
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-xl shadow-modal border border-gray-200 z-50 animate-slide-in-up overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-gray-900">{storedName}</p>
                <p className="text-[11px] text-gray-500">{storedEmail}</p>
                <span className="inline-flex items-center mt-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Senior Auditor
                </span>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/dashboard/profile'); setAvatarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={14} className="text-gray-400" />
                  Profile
                </button>
                <button
                  onClick={() => { navigate('/dashboard/settings'); setAvatarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} className="text-gray-400" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
