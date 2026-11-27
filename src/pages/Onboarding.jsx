import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  BookOpen,
  School,
  GraduationCap,
  Building2,
  Wrench,
  Target,
  Loader2,
  ArrowRight,
  AlertCircle,
  Check,
} from 'lucide-react';

/* ---------- local styles (self-contained, no extra files needed) ---------- */
// Colours use exact hex values so they work even if the Tailwind cyan palette is customised.
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.ob-root { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
.ob-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 75% 60% at 50% 20%, #000 30%, transparent 100%);
          mask-image: radial-gradient(ellipse 75% 60% at 50% 20%, #000 30%, transparent 100%);
}
@keyframes ob-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-24px,0) scale(1.08); } }
@keyframes ob-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes ob-pop { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.ob-orb { animation: ob-float 14s ease-in-out infinite; }
.ob-rise { animation: ob-rise .65s cubic-bezier(.2,.7,.2,1) both; }
.ob-pop { animation: ob-pop .25s ease both; }
.ob-shine::before {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
  transform: translateX(-130%) skewX(-18deg); transition: transform .7s ease;
}
.ob-shine:hover::before { transform: translateX(330%) skewX(-18deg); }
@media (prefers-reduced-motion: reduce) {
  .ob-orb, .ob-rise, .ob-pop { animation: none !important; }
  .ob-shine::before { transition: none; }
}
`;

const inputClass =
  'peer w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-sm text-white outline-none transition-all [color-scheme:dark] placeholder:text-slate-500 focus:border-[#22D3EE]/70 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#22D3EE]/10';

// Same values as before; only the way they are chosen is different
const LEVELS = [
  { value: 'cbc', label: 'CBC', icon: BookOpen },
  { value: 'kcse', label: 'KCSE', icon: School },
  { value: 'university', label: 'University', icon: GraduationCap },
  { value: 'college', label: 'College', icon: Building2 },
  { value: 'tvet', label: 'TVET', icon: Wrench },
];

export default function Onboarding() {
  const nav = useNavigate();
  const { profile, loading, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    education_level: '',
    institution: '',
    learning_goals: '',
  });

  useEffect(() => {
    if (!loading && profile?.education_level) {
      nav('/', { replace: true });
    }
  }, [profile, loading, nav]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg('');

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setErrorMsg("Authentication error. Please log in again.");
      setBusy(false);
      return;
    }

    // Using upsert to ensure the row is created if the trigger missed it
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || 'Student',
        education_level: form.education_level,
        institution: form.institution,
        learning_goals: form.learning_goals,
        updated_at: new Date().toISOString(),
      });

    setBusy(false);

    if (error) {
      console.error("Supabase Update Error:", error);
      setErrorMsg(error.message);
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="ob-root relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#060B16] p-5 py-10 text-white">
      <style>{styles}</style>

      {/* ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ob-grid absolute inset-0" />
        <div className="ob-orb absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#22D3EE]/20 blur-[120px]" />
        <div className="ob-orb absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-violet-600/25 blur-[120px]" style={{ animationDelay: '-5s' }} />
        <div className="ob-orb absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]" style={{ animationDelay: '-9s' }} />
      </div>

      <div
        className="ob-rise relative z-10 w-full max-w-lg rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-white/0 p-px"
      >
        <div className="space-y-7 rounded-3xl bg-[#0B1220]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-9">

          <div>
            <div className="relative mb-5 h-14 w-14">
              <div className="absolute inset-0 rounded-2xl bg-[#22D3EE]/40 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22D3EE] to-violet-500 shadow-lg shadow-[#22D3EE]/30">
                <Sparkles size={25} className="text-white" />
              </div>
            </div>

            <h1 className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Welcome to PDT Study
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Tell us a bit about yourself to personalize your experience.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">

            {/* EDUCATION LEVEL */}
            <fieldset>
              <legend className="mb-3 block text-sm font-medium text-slate-200">
                Education level
              </legend>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {LEVELS.map(({ value, label, icon: Icon }, i) => {
                  const selected = form.education_level === value;

                  return (
                    <label
                      key={value}
                      className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all duration-200 focus-within:ring-2 focus-within:ring-[#22D3EE] ${
                        selected
                          ? 'border-[#22D3EE]/70 bg-[#22D3EE]/10 shadow-[0_0_28px_rgba(34,211,238,0.15)] -translate-y-0.5'
                          : 'border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]'
                      } ${i === LEVELS.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
                    >
                      <input
                        type="radio"
                        name="education_level"
                        value={value}
                        required
                        checked={selected}
                        onChange={(e) => setForm({ ...form, education_level: e.target.value })}
                        className="sr-only"
                      />

                      {selected && (
                        <span className="ob-pop absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#22D3EE] text-[#06101C]">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}

                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                          selected
                            ? 'border-[#22D3EE]/30 bg-[#22D3EE]/20 text-[#67E8F9]'
                            : 'border-white/10 bg-white/[0.05] text-slate-300'
                        }`}
                      >
                        <Icon size={19} />
                      </span>

                      <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-200'}`}>
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* INSTITUTION */}
            <div>
              <label htmlFor="institution" className="mb-2 block text-sm font-medium text-slate-200">
                Institution <span className="font-normal text-slate-400">(Optional)</span>
              </label>

              <div className="relative">
                <input
                  id="institution"
                  className={`${inputClass} pl-11 pr-4`}
                  placeholder="e.g. University of Nairobi"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                />
                <Building2
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-[#22D3EE]"
                />
              </div>
            </div>

            {/* LEARNING GOALS */}
            <div>
              <label htmlFor="goals" className="mb-2 block text-sm font-medium text-slate-200">
                Learning goals
              </label>

              <div className="relative">
                <textarea
                  id="goals"
                  className={`${inputClass} min-h-[110px] resize-none py-3.5 pl-11 pr-4 leading-6`}
                  placeholder="What are you trying to achieve?"
                  value={form.learning_goals}
                  onChange={(e) => setForm({ ...form, learning_goals: e.target.value })}
                />
                <Target
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-4 text-slate-400 transition-colors peer-focus:text-[#22D3EE]"
                />
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="ob-pop flex items-start gap-2.5 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3.5 text-sm text-rose-200"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="ob-shine relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#22D3EE] via-sky-500 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#22D3EE]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#22D3EE]/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}