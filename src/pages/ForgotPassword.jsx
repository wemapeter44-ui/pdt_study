
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, LockKeyhole, CheckCircle2 } from 'lucide-react';

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
    <main className="min-h-screen bg-[#080F1C] flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg border border-[#263244] bg-[#111B2B] text-[#22D3EE] mb-4">
            <LockKeyhole size={23} strokeWidth={1.7} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white">
            PDT <span className="text-[#22D3EE]">Study</span>
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Student Learning Platform
          </p>
        </div>

        {/* FORM */}
        <div className="rounded-xl border border-[#263244] bg-[#111B2B] p-6 sm:p-8">

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-7"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Forgot password?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter your registered email address and we'll send you
              instructions to reset your password.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#334155] bg-[#080F1C] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]"
                />
              </div>
            </div>

            {/* ERROR */}
            {err && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
              >
                {err}
              </div>
            )}

            {/* SUCCESS */}
            {msg && (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />

                  <p className="text-sm leading-5 text-emerald-400">
                    {msg}
                  </p>
                </div>
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#0891B2] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0E7490] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Sending reset link...' : 'Send reset link'}
            </button>

          </form>
        </div>

        {/* FOOTER */}
        <p className="mt-6 text-center text-xs text-slate-500">
          PDT Study · Learn. Practice. Excel.
        </p>

      </div>
    </main>
  );
}
