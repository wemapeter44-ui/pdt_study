import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, StickyNote, Layers, ListChecks, Calendar, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/tutor', label: 'Tutor', icon: BookOpen },
  { path: '/subjects', label: 'Subjects', icon: Layers },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { signOut } = useAuth();
  const location = useLocation();
  
  const isFullScreen = location.pathname === '/tutor' || location.pathname === '/';

  return (
    <div className="min-h-[100dvh] flex bg-[#060B16]">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#060B16] fixed inset-y-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <BrandLogo />
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-1">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 md:ml-64 flex flex-col min-h-[100dvh] ${isFullScreen ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        {!isFullScreen && (
          <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-white/10 bg-[#060B16]/90 backdrop-blur-md sticky top-0 z-20">
            <BrandLogo size="text-lg" iconSize="w-7 h-7" />
          </header>
        )}
        <div className={`flex-1 w-full ${isFullScreen ? '' : 'max-w-5xl mx-auto p-4 sm:p-6 md:p-8'}`}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {!isFullScreen && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#060B16]/95 backdrop-blur-md border-t border-white/10 z-30 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16 px-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white/10' : ''}`}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
