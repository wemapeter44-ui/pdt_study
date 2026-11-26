import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandLogo from '../components/BrandLogo';
import BrandFooter from '../components/BrandFooter';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Layers,
  ClipboardList,
} from 'lucide-react';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.lg-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.lg-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 75% 60% at 50% 20%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 75% 60% at 50% 20%, #000 30%, transparent 100%);
}
@keyframes lg-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes lg-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes lg-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.lg-orb { animation: lg-float 14s ease-in-out infinite; }
.lg-rise { animation: lg-rise .65s cubic-bezier(.2,.7,.2,1) both; }
.lg-pop { animation: lg-pop .25s ease both; }
.lg-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.lg-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@media (prefers-reduced-motion: reduce) {
  .lg-orb, .lg-rise, .lg-pop { animation: none !important; }
  .lg-shine::before { transition: none; }
}
`;

const inputClass =
  'peer w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10 [color-scheme:dark]';

const iconClass =
  'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#22D3EE]';

const FEATURES = [
  { icon: BookOpen, title: 'AI study tutor', text: 'Ask anything and get clear, step-by-step explanations.' },
  { icon: ClipboardList, title: 'Smart quizzes', text: 'Generate practice quizzes and track your scores.' },
  { icon: Layers, title: 'Notes and flashcards', text: 'Keep everything you learn in one organised place.' },
];

// Visual-only hint; does not affect whether signup is allowed
function passwordStrength(password) {
  if (!password) return { score: 0, label: '', bar: '', text: '' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Too short', bar: 'bg-rose-400', text: 'text-rose-300' },
    { label: 'Weak', bar: 'bg-rose-400', text: 'text-rose-300' },
    { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-300' },
    { label: 'Good', bar: 'bg-sky-400', text: 'text-sky-300' },
    { label: 'Strong', bar: 'bg-emerald-400', text: 'text-emerald-300' },
  ];

  return { score, ...levels[score] };
}

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();

    setErr('');
    setMsg('');
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        nav('/', { replace: true });
      } else {
        setMsg('Your account has been created. Check your email to confirm your account.');
      }
    } catch (error) {
      setErr(error.message || 'Unable to create your account.');
    } finally {
      setBusy(false);
    }
  }

  async function loginWithGoogle() {
    setErr('');
    setGoogleBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error) {
      setErr(error.message || 'Google sign-up could not be started.');
      setGoogleBusy(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <main className="lg-root relative min-h-[100dvh] overflow-hidden bg-[#060B16] text-white">
      <style>{styles}</style>

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="lg-grid absolute inset-0" />
        <div className="lg-orb absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
        <div className="lg-orb absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-600/25 blur-[120px]" style={{ animationDelay: '-5s' }} />
        <div className="lg-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]" style={{ animationDelay: '-9s' }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-12 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:gap-16">

        {/* LEFT: brand story (desktop only) */}
        <section className="lg-rise hidden lg:block">
          <BrandLogo size="text-2xl" iconSize="w-12 h-12" />

          <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-xs font-medium text-[#67E8F9]">
            <Sparkles size={13} />
            Free to get started
          </p>

          <h1 className="mt-5 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-5xl font-bold leading-[1.1] tracking-tight text-transparent">
            Start learning
            <br />
            in minutes.
          </h1>

          <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">
            Create your account and set up your personal study workspace.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="lg-rise flex items-start gap-4"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#67E8F9] backdrop-blur-md">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* RIGHT: signup card */}
        <div className="mx-auto w-full max-w-md">

          {/* BRAND (mobile) */}
          <div className="lg-rise mb-7 flex flex-col items-center text-center lg:hidden">
            <BrandLogo size="text-2xl" iconSize="w-12 h-12" />

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Get started with PDT Study.
            </p>
          </div>

          <section
            className="lg-rise rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
            style={{ animationDelay: '100ms' }}
          >
            <div className="rounded-3xl bg-[#0B1220]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">

              <div className="mb-7 hidden lg:block">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Create your account
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Get started with PDT Study.
                </p>
              </div>

              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={googleBusy || busy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {googleBusy ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
                <span className="text-xs font-medium text-slate-400">OR</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
              </div>

              <form onSubmit={submit} className="space-y-4">

                <div>
                  <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-200">
                    Full name
                  </label>

                  <div className="relative">
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={100}
                      placeholder="Enter your full name"
                      className={inputClass}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <User size={18} className={iconClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                    Email address
                  </label>

                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail size={18} className={iconClass} />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      placeholder="Create a password"
                      className={`${inputClass} !pr-12`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock size={18} className={iconClass} />

                    <button
                      type="button"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* strength meter */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex flex-1 gap-1.5" aria-hidden>
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            strength.score >= n ? strength.bar : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`w-16 text-right text-xs font-medium ${strength.text || 'text-slate-400'}`}>
                      {strength.label || 'Min. 6'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use at least 6 characters. Longer passwords with mixed characters are stronger.
                  </p>
                </div>

                {err && (
                  <div role="alert" className="lg-pop flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200">
                    <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                    {err}
                  </div>
                )}

                {msg && (
                  <div role="status" className="lg-pop flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                    {msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || googleBusy}
                  className="lg-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

              </form>

              <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-300">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#22D3EE] transition-colors hover:text-white"
                >
                  Sign in
                </Link>
              </div>

            </div>
          </section>

          <div className="mt-7 text-center">
            <BrandFooter />
          </div>

        </div>
      </div>
    </main>
  );
}