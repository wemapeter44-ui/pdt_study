import {
  useState, useEffect, useRef, useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';

import {
  LayoutDashboard, BookOpen, Book, StickyNote, Layers, ListChecks,
  Calendar, Settings, LogOut, MoreHorizontal, X, Download,
  GraduationCap, PanelLeftClose, PanelLeftOpen, ChevronDown, Sparkles, AlertCircle,
  CheckCircle2, Info
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

/* ---------- confirm dialog (built into this file) ---------- */

const confirmStyles = `
@keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cd-pop { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes cd-sheet { from { transform: translateY(100%); } to { transform: none; } }
.cd-fade { animation: cd-fade .2s ease both; }
.cd-pop { animation: cd-pop .22s cubic-bezier(.2,.8,.2,1) both; }
@media (max-width: 639px) { .cd-pop { animation-name: cd-sheet; animation-duration: .3s; } }
@media (prefers-reduced-motion: reduce) { .cd-fade, .cd-pop { animation: none !important; } }
`;

// confirm({ title, message, confirmText, cancelText, tone: 'default' | 'danger' | 'success', hideCancel })
// resolves to true when the confirm button is pressed, false otherwise.
function ConfirmDialog({ dialog, onClose }) {
  const {
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone = 'default',
    hideCancel = false
  } = dialog;

  const danger = tone === 'danger';
  const success = tone === 'success';
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    // For destructive actions the safe button gets focus first
    (danger && !hideCancel ? cancelRef : confirmRef).current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(false);
        return;
      }

      if (event.key === 'Tab') {
        const order = [cancelRef.current, confirmRef.current].filter(Boolean);
        if (!order.length) return;

        event.preventDefault();

        const index = order.indexOf(document.activeElement);
        const next = event.shiftKey
          ? (index <= 0 ? order.length - 1 : index - 1)
          : (index === order.length - 1 ? 0 : index + 1);

        order[next].focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [danger, hideCancel, onClose]);

  const Icon = danger ? AlertCircle : success ? CheckCircle2 : Info;

  const iconStyle = danger
    ? 'border-rose-400/30 bg-rose-500/15 text-rose-300'
    : success
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
      : 'border-[#22D3EE]/30 bg-[#22D3EE]/15 text-[#67E8F9]';

  const glowStyle = danger ? 'bg-rose-500/40' : success ? 'bg-emerald-500/40' : 'bg-[#22D3EE]/40';

  const confirmStyle = danger
    ? 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/25 hover:shadow-rose-500/40'
    : success
      ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-emerald-500/25 hover:shadow-emerald-500/40'
      : 'bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 shadow-[#22D3EE]/25 hover:shadow-[#22D3EE]/40';

  return (
    <div
      className="cd-fade fixed inset-0 z-[100] flex items-end justify-center bg-[#02050B]/75 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <style>{confirmStyles}</style>

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby={message ? 'cd-message' : undefined}
        className="cd-pop w-full max-w-md rounded-t-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px sm:rounded-3xl"
      >
        <div className="rounded-t-3xl bg-[#0B1220] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:rounded-3xl sm:p-7">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className={`absolute inset-0 rounded-2xl blur-lg ${glowStyle}`} />
              <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border ${iconStyle}`}>
                <Icon size={22} />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="cd-title" className="text-lg font-bold text-white">
                {title}
              </h2>

              {message && (
                <p id="cd-message" className="mt-1.5 text-sm leading-6 text-slate-300">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className={`mt-7 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!hideCancel && (
              <button
                ref={cancelRef}
                type="button"
                onClick={() => onClose(false)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
              >
                {cancelText}
              </button>
            )}

            <button
              ref={confirmRef}
              type="button"
              onClick={() => onClose(true)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/70 active:translate-y-0 ${confirmStyle}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// const [confirm, confirmDialog] = useConfirm();
// ... render {confirmDialog} once in the component, then: if (await confirm({...})) { ... }
function useConfirm() {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback((result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      // A newer question replaces an unanswered older one (treated as "cancel")
      resolver.current?.(false);
      resolver.current = resolve;
      setDialog(typeof options === 'string' ? { message: options } : options || {});
    });
  }, []);

  const element = dialog
    ? createPortal(<ConfirmDialog dialog={dialog} onClose={close} />, document.body)
    : null;

  return [confirm, element];
}

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

// Pages that still rely on the layout for their outer spacing.
// Remove a route from this list once its page brings its own padding.
const PADDED_ROUTES = ['/flashcards'];

const ALL_ITEMS = NAV_GROUPS.flatMap(group => group.items);

/* ---------- local styles (self-contained, no extra files needed) ---------- */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.al-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
@keyframes al-sheet { from { transform: translateY(100%); } to { transform: none; } }
@keyframes al-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes al-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes al-menu { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.al-sheet { animation: al-sheet .32s cubic-bezier(.2,.8,.2,1) both; }
.al-fade { animation: al-fade .2s ease both; }
.al-rise { animation: al-rise .35s cubic-bezier(.2,.7,.2,1) both; }
.al-menu { animation: al-menu .18s cubic-bezier(.2,.8,.2,1) both; }
.al-scroll::-webkit-scrollbar { width: 6px; }
.al-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 6px; }
@media (prefers-reduced-motion: reduce) {
  .al-sheet, .al-fade, .al-rise, .al-menu { animation: none !important; }
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

function pageTitle(pathname) {
  if (pathname === '/') return 'Home';

  const item = ALL_ITEMS.find(
    entry => entry.path !== '/' && pathname.startsWith(entry.path)
  );

  if (item) return item.label;
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/topics')) return 'Topic';

  return 'PDT Study';
}

function readCollapsed() {
  try {
    return localStorage.getItem('pdt-sidebar') === 'collapsed';
  } catch {
    return false;
  }
}

function LayoutShell() {
  const { signOut, profile, user } = useAuth();
  const location = useLocation();
  const [confirm, confirmDialog] = useConfirm();

  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const menuRef = useRef(null);

  const pathname = location.pathname;

  // Full-screen chat pages draw their own header and composer
  const isFullScreen = pathname === '/tutor' || pathname.startsWith('/topics/');
  const padded = PADDED_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    setMoreOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem('pdt-sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* storage can be unavailable; the sidebar still works */
    }
  }, [collapsed]);

  // Close the account menu when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const displayName =
    profile?.full_name ||
    profile?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const email = user?.email;

  const primaryItems = ALL_ITEMS.filter(item =>
    MOBILE_PRIMARY.includes(item.path)
  );

  const moreItems = ALL_ITEMS.filter(item =>
    !MOBILE_PRIMARY.includes(item.path)
  );

  const moreActive =
    moreItems.some(item => pathname.startsWith(item.path)) ||
    pathname.startsWith('/settings');

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

    setMenuOpen(false);
    setMoreOpen(false);

    const confirmed = await confirm({
      title: 'Sign out of PDT Study?',
      message: 'You will need to sign in again to get back to your study workspace.',
      confirmText: 'Sign out',
      cancelText: 'Stay signed in'
    });

    if (!confirmed) return;

    setSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      confirm({
        title: 'Unable to sign out',
        message: 'Please try again.',
        confirmText: 'OK',
        hideCancel: true,
        tone: 'danger'
      });
    } finally {
      setSigningOut(false);
    }
  }

  // A plain function (not a component) so it never remounts on re-render
  function renderInstall(mobile = false) {
    if (isInstalled || !installPrompt) return null;

    return (
      <button
        type="button"
        onClick={handleInstall}
        className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 ${focusRing} ${
          mobile
            ? 'h-9 px-3 text-xs'
            : collapsed
              ? 'h-10 w-full'
              : 'w-full px-3 py-2.5 text-sm'
        }`}
        title="Install app"
      >
        <Download size={mobile ? 15 : 17} />
        {(mobile || !collapsed) && 'Install App'}
      </button>
    );
  }

  const desktopLink = ({ isActive }) =>
    `group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all ${focusRing} ${
      collapsed ? 'justify-center px-0' : 'gap-3 px-3'
    } ${
      isActive
        ? 'bg-gradient-to-r from-[#22D3EE]/15 to-violet-500/10 text-white ring-1 ring-inset ring-white/10'
        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
    }`;

  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-64';
  const contentOffset = collapsed ? 'md:ml-[76px]' : 'md:ml-64';

  return (
    <div className="al-root relative flex min-h-[100dvh] bg-[#060B16] text-slate-200">
      <style>{styles}</style>
      {confirmDialog}

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 z-20 hidden flex-col border-r border-white/10 bg-[#060B16]/80 backdrop-blur-xl transition-[width] duration-300 md:flex ${sidebarWidth}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#22D3EE]/10 to-transparent" />

        <div
          className={`relative flex h-16 shrink-0 items-center border-b border-white/10 ${
            collapsed ? 'justify-center px-0' : 'px-5'
          }`}
        >
          {collapsed ? (
            <Link
              to="/"
              aria-label="PDT Study home"
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-white shadow-lg shadow-[#22D3EE]/25 ${focusRing}`}
            >
              <GraduationCap size={20} />
            </Link>
          ) : (
            <BrandLogo />
          )}
        </div>

        <nav
          className="al-scroll relative flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-6"
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label}>
              {collapsed ? (
                groupIndex > 0 && <div className="mx-3 mb-4 h-px bg-white/10" />
              ) : (
                <p className="mb-2 px-3 text-xs font-semibold text-slate-400">
                  {group.label}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map(({ path, label, icon: Icon, end }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={end}
                    title={collapsed ? label : undefined}
                    aria-label={label}
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

                        {!collapsed && label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 space-y-2 border-t border-white/10 p-3">
          {renderInstall()}

          <NavLink
            to="/settings"
            title={collapsed ? 'Settings' : undefined}
            aria-label="Settings"
            className={desktopLink}
          >
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
                {!collapsed && 'Settings'}
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Main column */}
      <div
        className={`flex min-h-[100dvh] min-w-0 flex-1 flex-col transition-[margin] duration-300 ${contentOffset} ${
          isFullScreen ? '' : 'pb-24 md:pb-0'
        }`}
      >

        {/* Desktop top bar */}
        {!isFullScreen && (
          <header className="sticky top-0 z-20 hidden h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#060B16]/80 px-6 backdrop-blur-xl md:flex">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCollapsed(value => !value)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white ${focusRing}`}
              >
                {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
              </button>

              <p className="flex items-center gap-2 text-sm text-slate-400">
                PDT Study
                <span className="text-slate-600">/</span>
                <span className="font-semibold text-white">{pageTitle(pathname)}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/tutor"
                className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 ${focusRing}`}
              >
                <Sparkles size={16} />
                Ask the tutor
              </Link>

              {/* Account menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(value => !value)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition hover:bg-white/10 ${focusRing}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#22D3EE] to-violet-500 text-xs font-bold text-white">
                    {initialsOf(displayName)}
                  </span>
                  <span className="hidden max-w-[9rem] truncate text-sm font-medium text-white lg:block">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="al-menu absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                  >
                    <div className="border-b border-white/10 p-4">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      {email && (
                        <p className="mt-1 truncate text-xs text-slate-400">{email}</p>
                      )}
                    </div>

                    <div className="p-1.5">
                      <Link
                        to="/settings"
                        role="menuitem"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Settings size={17} className="text-slate-400" />
                        Settings
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <LogOut size={17} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Mobile header */}
        {!isFullScreen && (
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#060B16] px-4 md:hidden">
            <BrandLogo size="text-lg" iconSize="w-7 h-7" />

            <div className="flex items-center gap-2">
              {renderInstall(true)}

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
        <main
          className={`w-full flex-1 ${
            padded ? 'mx-auto max-w-6xl p-4 sm:p-6 md:p-8' : ''
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile navigation */}
      {!isFullScreen && (
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
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-sm font-bold text-white">
                      {initialsOf(displayName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      {email && <p className="truncate text-xs text-slate-400">{email}</p>}
                    </div>
                  </div>

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

                  {renderInstall()}

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

export default function AppLayout() {
  return <LayoutShell />;
}