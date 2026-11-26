
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
  CheckCircle2
} from 'lucide-react';

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

  const inputClass =
    'w-full rounded-md border border-[#263244] bg-[#0B1422] py-3 pl-11 pr-4 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#080F1C] px-4 py-10">

      <div className="w-full max-w-md">

        {/* Brand heading */}
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLogo
            size="text-2xl"
            iconSize="w-12 h-12"
          />

          <h1 className="mt-7 text-2xl font-semibold tracking-tight text-white">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-[#94A3B8]">
            Get started with PDT Study.
          </p>
        </div>

        {/* Signup form */}
        <div className="rounded-lg border border-[#263244] bg-[#111B2B] p-5 sm:p-7">

          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={googleBusy || busy}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-[#334155] bg-[#0B1422] px-4 py-3 text-sm font-medium text-white transition hover:border-[#64748B] disabled:opacity-60"
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

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#263244]" />
            <span className="text-xs text-[#64748B]">OR</span>
            <div className="h-px flex-1 bg-[#263244]" />
          </div>

          <form onSubmit={submit} className="space-y-4">

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                Full name
              </label>

              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Enter your full name"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                Email address
              </label>

              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D1D5DB]">
                Password
              </label>

              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />

                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  placeholder="Create a password"
                  className={`${inputClass} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p className="mt-2 text-xs text-[#64748B]">
                Use at least 6 characters.
              </p>
            </div>

            {err && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {err}
              </div>
            )}

            {msg && (
              <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || googleBusy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#22D3EE] px-4 py-3 text-sm font-semibold text-[#08111F] transition hover:bg-[#67E8F9] disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="mt-6 border-t border-[#263244] pt-5 text-center text-sm text-[#94A3B8]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[#22D3EE] hover:underline"
            >
              Sign in
            </Link>
          </div>

        </div>

        <div className="mt-6">
          <BrandFooter />
        </div>

      </div>
    </div>
  );
}
