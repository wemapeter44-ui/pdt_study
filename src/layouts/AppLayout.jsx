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

// Items shown directly in the mobile bottom bar. Everything else goes under "More".
const MOBILE_PRIMARY = ['/', '/tutor', '/subjects', '/quizzes'];

const ALL_ITEMS = NAV_GROUPS.flatMap(group => group.items);

/* ---------- local styles (self-contained, no extra files needed) ---------- */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.al-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
@keyframes al-sheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes al-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes al-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.al-sheet { animation: al-sheet .32s cubic-bezier(.2,.8,.2,1) both; }
.al-fade { animation: al-fade .2s ease both; }
.al-rise { animation: al-rise .35s cubic-bezier(.2,.7,.2,1) both; }
.al-scroll::-webkit-scrollbar { width: 6px; }
.al-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 6px; }
@media (prefers-reduced-motion: reduce) {
  .al-sheet, .al-fade, .al-rise { animation: none !important; }
}
`;

// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060B16]';

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
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${focusRing} ${
      isActive
        ? 'bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white ring-1 ring-inset ring-white/10'
        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
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
        className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 ${focusRing} ${
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
    <div className="al-root relative flex min-h-[100dvh] bg-[#060B16] text-slate-200">
      <style>{styles}</style>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-[#060B16]/80 backdrop-blur-xl md:flex">

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#22D3EE]/10 to-transparent" />

        <div className="relative flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <BrandLogo />
        </div>

        <nav
          className="al-scroll relative flex-1 space-y-7 overflow-y-auto px-3 py-6"
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-xs font-semibold text-slate-400">
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
                          <span className="absolute inset-y-2.5 -left-3 w-1 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                        )}

                        <Icon
                          size={18}
                          className={
                            isActive
                              ? 'text-[#22D3EE]'
                              : 'text-slate-400 transition-colors group-hover:text-slate-200'
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
        <div className="relative shrink-0 space-y-2 border-t border-white/10 p-3">

          <InstallButton />

          <NavLink to="/settings" className={desktopLink}>
            {({ isActive }) => (
              <>
                <Settings
                  size={18}
                  className={
                    isActive
                      ? 'text-[#22D3EE]'
                      : 'text-slate-400 transition-colors group-hover:text-slate-200'
                  }
                />
                Settings
              </>
            )}
          </NavLink>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-xs font-bold text-white shadow-lg shadow-[#22D3EE]/20">
              {initialsOf(displayName)}
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>

              {email && (
                <p className="mt-1 truncate text-xs text-slate-400">
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
              className={`rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 ${focusRing}`}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex min-h-[100dvh] min-w-0 flex-1 flex-col md:ml-64 ${
          isTutorPage ? '' : 'pb-24 md:pb-0'
        }`}
      >

        {/* Mobile header */}
        {!isTutorPage && (
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#060B16] px-4 md:hidden">

            <BrandLogo size="text-lg" iconSize="w-7 h-7" />

            <div className="flex items-center gap-2">
              <InstallButton mobile />

              <NavLink
                to="/settings"
                aria-label="Account and settings"
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-xs font-bold text-white shadow-lg shadow-[#22D3EE]/20 ${focusRing}`}
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
            className="fixed inset-x-3 z-50 md:hidden"
            style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex h-16 items-stretch justify-around rounded-2xl border border-white/10 bg-[#0B1220] px-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">

              {primaryItems.map(({ path, label, icon: Icon, end }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  className={({ isActive }) =>
                    `group relative flex w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors ${focusRing} ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                      )}

                      <span
                        className={`flex h-8 w-12 items-center justify-center rounded-xl transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-[#22D3EE]/25 to-violet-500/20'
                            : 'group-active:scale-90'
                        }`}
                      >
                        <Icon
                          size={20}
                          strokeWidth={isActive ? 2.25 : 1.75}
                          className={isActive ? 'text-[#22D3EE]' : ''}
                        />
                      </span>

                      <span className="text-[11px] font-medium leading-none">
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
                className={`group relative flex w-full flex-col items-center justify-center gap-1 rounded-xl transition-colors ${focusRing} ${
                  moreActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {moreActive && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                )}

                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-xl transition-all ${
                    moreActive
                      ? 'bg-gradient-to-br from-[#22D3EE]/25 to-violet-500/20'
                      : 'group-active:scale-90'
                  }`}
                >
                  <MoreHorizontal
                    size={20}
                    className={moreActive ? 'text-[#22D3EE]' : ''}
                  />
                </span>

                <span className="text-[11px] font-medium leading-none">
                  More
                </span>
              </button>
            </div>
          </nav>

          {/* More menu */}
          {moreOpen && (
            <div
              className="fixed inset-0 z-[60] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="More navigation options"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="al-fade absolute inset-0 bg-[#02050B]/70 backdrop-blur-sm"
              />

              <div className="al-sheet absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-[#0B1220] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">

                <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-white/20" />

                <div className="flex items-center justify-between px-3 py-3">
                  <p className="text-base font-semibold text-white">
                    More
                  </p>

                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close"
                    className={`rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white ${focusRing}`}
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
                  }].map(({ path, label, icon: Icon }, i) => (
                    <NavLink
                      key={path}
                      to={path}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={({ isActive }) =>
                        `al-rise flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${focusRing} ${
                          isActive
                            ? 'bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white ring-1 ring-inset ring-white/10'
                            : 'text-slate-200 hover:bg-white/[0.06]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 ${
                            isActive ? 'bg-[#22D3EE]/15 text-[#22D3EE]' : 'bg-white/[0.05] text-slate-300'
                          }`}>
                            <Icon size={18} />
                          </span>
                          {label}
                        </>
                      )}
                    </NavLink>
                  ))}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50 ${focusRing}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10">
                      <LogOut size={18} />
                    </span>
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