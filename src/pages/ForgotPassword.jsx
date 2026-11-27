import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  Loader2,
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();

    setErr('');
    setMsg('');
    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: window.location.origin + '/login',
        }
      );

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg('If an account exists with this email, a password reset link will be sent.');
    } catch (error) {
      setErr('Unable to send the reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lg-root relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060B16] px-4 py-10 text-white">
      <style>{styles}</style>

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="lg-grid absolute inset-0" />
        <div className="lg-orb absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
        <div className="lg-orb absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-600/25 blur-[120px]" style={{ animationDelay: '-5s' }} />
        <div className="lg-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]" style={{ animationDelay: '-9s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* BRAND */}
        <div className="lg-rise mb-8 text-center">
          <div className="relative mx-auto mb-5 h-14 w-14">
            <div className="absolute inset-0 rounded-2xl bg-[#22D3EE]/40 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/30">
              <LockKeyhole size={25} strokeWidth={1.8} className="text-white" />
            </div>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white">
            PDT <span className="text-[#22D3EE]">Study</span>
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Student Learning Platform
          </p>
        </div>

        {/* FORM */}
        <section
          className="lg-rise rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
          style={{ animationDelay: '100ms' }}
        >
          <div className="rounded-3xl bg-[#0B1220]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">

            <Link
              to="/login"
              className="group mb-7 inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all group-hover:-translate-x-0.5 group-hover:bg-white/10">
                <ArrowLeft size={15} />
              </span>
              Back to sign in
            </Link>

            <div className="mb-7">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Forgot password?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Enter your registered email address and we'll send you
                instructions to reset your password.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>

                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="peer w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all [color-scheme:dark] placeholder:text-slate-500 focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10"
                  />
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#22D3EE]"
                  />
                </div>
              </div>

              {/* ERROR */}
              {err && (
                <div
                  role="alert"
                  className="lg-pop flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                  {err}
                </div>
              )}

              {/* SUCCESS */}
              {msg && (
                <div
                  role="status"
                  className="lg-pop flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3.5"
                >
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />

                  <p className="text-sm leading-5 text-emerald-200">
                    {msg}
                  </p>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={busy}
                className="lg-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {busy ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

            </form>
          </div>
        </section>

        {/* FOOTER */}
        <p className="mt-7 text-center text-xs text-slate-400">
          PDT Study · Learn. Practice. Excel.
        </p>

      </div>
    </main>
  );
}
