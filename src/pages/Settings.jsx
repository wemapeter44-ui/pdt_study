import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  User,
  GraduationCap,
  Building2,
  Target,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const glass =
  'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] text-white';

const inputClass =
  'peer w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10 [color-scheme:dark]';

const labelClass = 'mb-2 block text-sm font-medium text-slate-200';

const optionClass = 'bg-[#0B1220] text-white';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.st-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.st-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, #000 30%, transparent 100%);
}
@keyframes st-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes st-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes st-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes st-skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.st-orb { animation: st-float 14s ease-in-out infinite; }
.st-rise { animation: st-rise .55s cubic-bezier(.2,.7,.2,1) both; }
.st-pop { animation: st-pop .25s ease both; }
.st-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.05) 75%);
  background-size: 200% 100%;
  animation: st-skel 1.6s ease-in-out infinite;
}
.st-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.st-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@media (prefers-reduced-motion: reduce) {
  .st-orb, .st-rise, .st-pop, .st-skel { animation: none !important; }
  .st-shine::before { transition: none; }
}
`;

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="st-grid absolute inset-0" />
      <div className="st-orb absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
      <div className="st-orb absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-600/20 blur-[120px]" style={{ animationDelay: '-5s' }} />
      <div className="st-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[120px]" style={{ animationDelay: '-9s' }} />
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden className={`st-skel block rounded-lg ${className}`} />;
}

function initialsOf(name) {
  return (name || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function Section({ icon: Icon, title, subtitle, tint, delay = 0, children }) {
  return (
    <section
      className="st-rise rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-px"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`${glass} overflow-hidden rounded-3xl`}>
        <div className="flex items-center gap-3.5 border-b border-white/10 px-5 py-4 sm:px-6">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tint}`}>
            <Icon size={19} />
          </span>

          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-300 sm:text-sm">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user, profile, loading, refreshProfile } = useAuth();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [form, setForm] = useState({
    full_name: '',
    institution: '',
    learning_goals: '',
    education_level: '',
  });

  useEffect(() => {
    if (!profile) return;

    setForm({
      full_name: profile.full_name || '',
      institution: profile.institution || '',
      learning_goals: profile.learning_goals || '',
      education_level: profile.education_level || '',
    });
  }, [profile]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save(e) {
    e.preventDefault();

    if (!user?.id) {
      setStatus({
        type: 'error',
        message: 'Unable to identify your account. Please sign in again.',
      });
      return;
    }

    setBusy(true);
    setStatus({ type: '', message: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          institution: form.institution.trim(),
          learning_goals: form.learning_goals.trim(),
          education_level: form.education_level,
        })
        .eq('id', user.id);

      if (error) throw error;

      setStatus({
        type: 'success',
        message: 'Your profile has been updated.',
      });

      // Keep the rest of the app (greeting, tutor, sidebar) in sync
      if (refreshProfile) await refreshProfile();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while saving.',
      });
    } finally {
      setBusy(false);
    }
  }

  const shownName = form.full_name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="st-root relative min-h-screen overflow-x-hidden bg-[#060B16] text-white">
      <style>{styles}</style>
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-3xl space-y-7 px-4 py-6 pb-24 sm:px-6 sm:py-8">

        {/* HEADER */}
        <div className="st-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-xs font-medium text-[#67E8F9]">
            <ShieldCheck size={13} />
            Account
          </p>

          <h1 className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Settings
          </h1>

          <p className="mt-3 text-slate-300">
            Manage your personal details and learning preferences.
          </p>
        </div>

        {loading ? (
          <div className="space-y-7" aria-busy="true" aria-label="Loading your settings">
            <div className={`${glass} flex items-center gap-4 rounded-3xl p-5 sm:p-6`}>
              <Skeleton className="h-16 w-16 shrink-0 !rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-3 w-56 max-w-full" />
              </div>
            </div>

            {[1, 2, 3].map((n) => (
              <div key={n} className={`${glass} overflow-hidden rounded-3xl`}>
                <div className="flex items-center gap-3.5 border-b border-white/10 px-5 py-4 sm:px-6">
                  <Skeleton className="h-10 w-10 !rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-2 h-3 w-48 max-w-full" />
                  </div>
                </div>
                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-3 h-11 w-full !rounded-xl" />
                  </div>
                  {n === 2 && (
                    <div>
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-3 h-11 w-full !rounded-xl" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={save} className="space-y-7">

            {/* Profile summary */}
            <div
              className="st-rise rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
              style={{ animationDelay: '60ms' }}
            >
              <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl sm:gap-5 sm:p-6">
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-[#22D3EE]/30 to-violet-500/30 blur-3xl" />

                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-[#22D3EE]/40 blur-lg" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 text-xl font-bold text-white shadow-lg shadow-[#22D3EE]/30">
                    {initialsOf(shownName)}
                  </div>
                </div>

                <div className="relative min-w-0">
                  <p className="truncate text-xl font-bold text-white">{shownName}</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-300">
                    <Mail size={14} className="shrink-0 text-slate-400" />
                    <span className="truncate">{user?.email || 'Not available'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Profile section */}
            <Section
              icon={User}
              title="Personal information"
              subtitle="Your basic account details."
              tint="border-[#22D3EE]/25 bg-[#22D3EE]/10 text-[#67E8F9]"
              delay={120}
            >
              <div className="space-y-5 p-5 sm:p-6">

                <div>
                  <label htmlFor="full_name" className={labelClass}>Full name</label>
                  <div className="relative">
                    <input
                      id="full_name"
                      type="text"
                      className={`${inputClass} pl-11`}
                      placeholder="Enter your full name"
                      value={form.full_name}
                      onChange={(e) => updateField('full_name', e.target.value)}
                    />
                    <User
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#22D3EE]"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-1.5 text-xs text-slate-400">
                    Account email
                  </p>
                  <p className="text-sm font-medium text-slate-100">
                    {user?.email || 'Not available'}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Your email is managed through your sign-in account.
                  </p>
                </div>

              </div>
            </Section>

            {/* Education section */}
            <Section
              icon={GraduationCap}
              title="Education"
              subtitle="Tell PDT Study about your academic level."
              tint="border-violet-400/25 bg-violet-400/10 text-violet-300"
              delay={180}
            >
              <div className="space-y-5 p-5 sm:p-6">

                <div>
                  <label htmlFor="education_level" className={labelClass}>Education level</label>
                  <div className="relative">
                    <select
                      id="education_level"
                      className={`${inputClass} appearance-none pr-10`}
                      value={form.education_level}
                      onChange={(e) => updateField('education_level', e.target.value)}
                    >
                      <option className={optionClass} value="">Select education level</option>
                      <option className={optionClass} value="cbc">CBC</option>
                      <option className={optionClass} value="kcse">KCSE</option>
                      <option className={optionClass} value="university">University</option>
                      <option className={optionClass} value="college">College</option>
                      <option className={optionClass} value="tvet">TVET</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="institution" className={labelClass}>Institution</label>
                  <div className="relative">
                    <input
                      id="institution"
                      type="text"
                      className={`${inputClass} pl-11`}
                      placeholder="School, college or university"
                      value={form.institution}
                      onChange={(e) => updateField('institution', e.target.value)}
                    />
                    <Building2
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#22D3EE]"
                    />
                  </div>
                </div>

              </div>
            </Section>

            {/* Learning goals */}
            <Section
              icon={Target}
              title="Learning preferences"
              subtitle="Define what you want to achieve."
              tint="border-amber-400/25 bg-amber-400/10 text-amber-300"
              delay={240}
            >
              <div className="p-5 sm:p-6">
                <label htmlFor="learning_goals" className={labelClass}>Learning goals</label>

                <textarea
                  id="learning_goals"
                  className={`${inputClass} min-h-[130px] resize-y leading-6`}
                  placeholder="What subjects or skills are you focusing on?"
                  value={form.learning_goals}
                  onChange={(e) => updateField('learning_goals', e.target.value)}
                />

                <p className="mt-2.5 text-xs text-slate-400">
                  These details can help organise your learning experience.
                </p>
              </div>
            </Section>

            {/* Feedback */}
            {status.message && (
              <div
                role="status"
                className={`st-pop flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                  status.type === 'success'
                    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-400/25 bg-rose-500/10 text-rose-200'
                }`}
              >
                {status.type === 'success'
                  ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                  : <AlertCircle size={18} className="shrink-0 text-rose-400" />
                }
                {status.message}
              </div>
            )}

            {/* Save */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="st-shine relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
              >
                {busy ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save changes
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}