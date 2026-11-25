
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
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const { user, profile } = useAuth();

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
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong while saving.',
      });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-[#263244] bg-[#0B1422] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]';

  const labelClass =
    'mb-2 block text-sm font-medium text-[#D1D5DB]';

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">

      {/* Page heading */}
      <div className="border-b border-[#263244] pb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#22D3EE]">
          Account
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Settings
        </h1>

        <p className="mt-2 text-sm text-[#94A3B8]">
          Manage your personal details and learning preferences.
        </p>
      </div>

      <form onSubmit={save} className="space-y-7">

        {/* Profile section */}
        <section className="overflow-hidden rounded-lg border border-[#263244] bg-[#111B2B]">

          <div className="flex items-center gap-3 border-b border-[#263244] px-5 py-4">
            <User size={19} className="text-[#22D3EE]" />

            <div>
              <h2 className="text-sm font-semibold text-white">
                Personal information
              </h2>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Your basic account details.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">

            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Enter your full name"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
              />
            </div>

            <div className="border-t border-[#263244] pt-5">
              <p className="mb-2 text-xs text-[#64748B]">
                Account email
              </p>
              <p className="text-sm text-[#D1D5DB]">
                {user?.email || 'Not available'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Your email is managed through your sign-in account.
              </p>
            </div>

          </div>
        </section>

        {/* Education section */}
        <section className="overflow-hidden rounded-lg border border-[#263244] bg-[#111B2B]">

          <div className="flex items-center gap-3 border-b border-[#263244] px-5 py-4">
            <GraduationCap size={20} className="text-[#22D3EE]" />

            <div>
              <h2 className="text-sm font-semibold text-white">
                Education
              </h2>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Tell PDT Study about your academic level.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">

            <div>
              <label className={labelClass}>Education level</label>
              <select
                className={inputClass}
                value={form.education_level}
                onChange={(e) => updateField('education_level', e.target.value)}
              >
                <option value="">Select education level</option>
                <option value="cbc">CBC</option>
                <option value="kcse">KCSE</option>
                <option value="university">University</option>
                <option value="college">College</option>
                <option value="tvet">TVET</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Institution</label>
              <div className="relative">
                <Building2
                  size={17}
                  className="absolute left-3 top-3 text-[#64748B]"
                />
                <input
                  type="text"
                  className={`${inputClass} pl-10`}
                  placeholder="School, college or university"
                  value={form.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                />
              </div>
            </div>

          </div>
        </section>

        {/* Learning goals */}
        <section className="overflow-hidden rounded-lg border border-[#263244] bg-[#111B2B]">

          <div className="flex items-center gap-3 border-b border-[#263244] px-5 py-4">
            <Target size={19} className="text-[#22D3EE]" />

            <div>
              <h2 className="text-sm font-semibold text-white">
                Learning preferences
              </h2>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Define what you want to achieve.
              </p>
            </div>
          </div>

          <div className="p-5">
            <label className={labelClass}>Learning goals</label>

            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              placeholder="What subjects or skills are you focusing on?"
              value={form.learning_goals}
              onChange={(e) => updateField('learning_goals', e.target.value)}
            />

            <p className="mt-2 text-xs text-[#64748B]">
              These details can help organise your learning experience.
            </p>
          </div>
        </section>

        {/* Feedback */}
        {status.message && (
          <div
            role="status"
            className={`flex items-center gap-3 rounded-md border p-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {status.type === 'success'
              ? <CheckCircle2 size={18} />
              : <AlertCircle size={18} />
            }
            {status.message}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end border-t border-[#263244] pt-5">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#08111F] transition hover:bg-[#67E8F9] disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}
