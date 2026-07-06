import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Handle responsive sidebar collapsing based on window width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen w-full flex bg-[#F8FAFC] text-[#0F172A] antialiased overflow-hidden">
      
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:block shrink-0 z-40">
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-[240px] transform transition-transform duration-250 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar collapsed={false} setMobileOpen={setMobileOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <Header toggleMobileOpen={() => setMobileOpen(true)} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-auto bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto p-4 md:p-5 lg:p-6 pb-24">
            <Outlet />
          </div>
        </main>
      </div>
      
    </div>
  );
}
