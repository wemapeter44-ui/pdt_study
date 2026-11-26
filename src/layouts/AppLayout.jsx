
import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import {
  LayoutDashboard,
  BookOpen,
  Book,
  StickyNote,
  Layers,
  ListChecks,
  Calendar,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
  Download,
  Smartphone,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      { path: '/', label: 'Home', icon: LayoutDashboard, end: true },
      { path: '/tutor', label: 'Tutor', icon: BookOpen },
      { path: '/subjects', label: 'Subjects', icon: Book }
    ]
  },
  {
    label: 'Practice',
    items: [
      { path: '/notes', label: 'Notes', icon: StickyNote },
      { path: '/flashcards', label: 'Flashcards', icon: Layers },
      { path: '/quizzes', label: 'Quizzes', icon: ListChecks },
      { path: '/planner', label: 'Planner', icon: Calendar }
    ]
  }
];

const MOBILE_PRIMARY = ['/', '/tutor', '/notes', '/flashcards'];

const ALL_ITEMS = NAV_GROUPS.flatMap(group => group.items);

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080F1C]';

function initialsOf(name) {
  return (name || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

export default function AppLayout() {
  const { signOut, profile, user } = useAuth();
  const location = useLocation();

  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isTutorPage = location.pathname === '/tutor';

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsInstalled(standalone);

    function handleInstallAvailable(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleInstallAvailable
    );

    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleInstallAvailable
      );

      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const displayName =
    profile?.full_name ||
    profile?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const email = user?.email;

  const desktopLink = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} ${
      isActive
        ? 'bg-[#172438] text-white'
        : 'text-[#94A3B8] hover:bg-[#111B2B] hover:text-white'
    }`;

  const primaryItems = ALL_ITEMS.filter(item =>
    MOBILE_PRIMARY.includes(item.path)
  );

  const moreItems = ALL_ITEMS.filter(item =>
    !MOBILE_PRIMARY.includes(item.path)
  );

  const moreActive =
    moreItems.some(item => location.pathname.startsWith(item.path)) ||
    location.pathname.startsWith('/settings');

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const result = await installPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  const InstallButton = ({ mobile = false }) => {
    if (isInstalled || !installPrompt) return null;

    return (
      <button
        type="button"
        onClick={handleInstall}
        className={`flex items-center justify-center gap-2 rounded-md bg-[#22D3EE] font-semibold text-[#080F1C] transition hover:bg-[#67E8F9] ${focusRing} ${
          mobile
            ? 'h-9 px-3 text-xs'
            : 'w-full px-3 py-2.5 text-sm'
        }`}
      >
        <Download size={mobile ? 15 : 17} />
        Install App
      </button>
    );
  };

  return (
    <div className="flex min-h-[100dvh] bg-[#080F1C] text-[#E2E8F0]">

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 z-20 hidden w-64 flex-col border-r border-[#263244] bg-[#080F1C] md:flex">

        <div className="flex h-16 shrink-0 items-center border-b border-[#263244] px-5">
          <BrandLogo />
        </div>

        <nav
          className="flex-1 space-y-7 overflow-y-auto px-3 py-6"
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map(({ path, label, icon: Icon, end }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={end}
                    className={desktopLink}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#22D3EE]" />
                        )}

                        <Icon
                          size={17}
                          className={
                            isActive
                              ? 'text-[#22D3EE]'
                              : 'text-[#64748B] group-hover:text-[#CBD5E1]'
                          }
                        />

                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Account section */}
        <div className="shrink-0 space-y-2 border-t border-[#263244] p-3">

          <InstallButton />

          <NavLink to="/settings" className={desktopLink}>
            <Settings size={17} className="text-[#64748B]" />
            Settings
          </NavLink>

          <div className="flex items-center gap-3 rounded-md px-3 py-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#334155] bg-[#111B2B] text-xs font-semibold text-[#22D3EE]">
              {initialsOf(displayName)}
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">
                {displayName}
              </p>

              {email && (
                <p className="mt-1 truncate text-xs text-[#64748B]">
                  {email}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
              className={`rounded-md p-2 text-[#64748B] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 ${focusRing}`}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex min-h-[100dvh] min-w-0 flex-1 flex-col md:ml-64 ${
          isTutorPage ? '' : 'pb-16 md:pb-0'
        }`}
      >

        {/* Mobile header */}
        {!isTutorPage && (
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#263244] bg-[#080F1C]/95 px-4 backdrop-blur-md md:hidden">

            <BrandLogo size="text-lg" iconSize="w-7 h-7" />

            <div className="flex items-center gap-2">
              <InstallButton mobile />

              <NavLink
                to="/settings"
                aria-label="Account and settings"
                className={`flex h-9 w-9 items-center justify-center rounded-md border border-[#263244] bg-[#111B2B] text-xs font-semibold text-[#22D3EE] ${focusRing}`}
              >
                {initialsOf(displayName)}
              </NavLink>
            </div>
          </header>
        )}

        {/* Page content */}
        <div
          className={`w-full flex-1 ${
            isTutorPage
              ? ''
              : 'mx-auto max-w-6xl p-4 sm:p-6 md:p-8'
          }`}
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile navigation */}
      {!isTutorPage && (
        <>
          <nav
            aria-label="Mobile navigation"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-[#263244] bg-[#080F1C]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          >
            <div className="flex h-16 items-stretch justify-around px-1">

              {primaryItems.map(({ path, label, icon: Icon, end }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  className={({ isActive }) =>
                    `flex w-full flex-col items-center justify-center gap-1 transition-colors ${focusRing} ${
                      isActive
                        ? 'text-white'
                        : 'text-[#64748B] hover:text-[#CBD5E1]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.25 : 1.75}
                        className={isActive ? 'text-[#22D3EE]' : ''}
                      />

                      <span className="text-[11px] font-medium">
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}

              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                className={`flex w-full flex-col items-center justify-center gap-1 transition-colors ${focusRing} ${
                  moreActive
                    ? 'text-white'
                    : 'text-[#64748B] hover:text-[#CBD5E1]'
                }`}
              >
                <MoreHorizontal
                  size={20}
                  className={moreActive ? 'text-[#22D3EE]' : ''}
                />

                <span className="text-[11px] font-medium">
                  More
                </span>
              </button>
            </div>
          </nav>

          {/* More menu */}
          {moreOpen && (
            <div
              className="fixed inset-0 z-40 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation options"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="absolute inset-0 bg-black/60"
              />

              <div className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-[#263244] bg-[#111B2B] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">

                <div className="flex items-center justify-between px-3 py-3">
                  <p className="text-sm font-semibold text-white">
                    More
                  </p>

                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close"
                    className={`rounded-md p-2 text-[#94A3B8] hover:bg-[#263244] hover:text-white ${focusRing}`}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-1">

                  <InstallButton />

                  {[...moreItems, {
                    path: '/settings',
                    label: 'Settings',
                    icon: Settings
                  }].map(({ path, label, icon: Icon }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition ${focusRing} ${
                          isActive
                            ? 'bg-[#172438] text-white'
                            : 'text-[#CBD5E1] hover:bg-[#172438]'
                        }`
                      }
                    >
                      <Icon size={18} className="text-[#94A3B8]" />
                      {label}
                    </NavLink>
                  ))}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 ${focusRing}`}
                  >
                    <LogOut size={18} />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
