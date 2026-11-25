import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-5 bg-[#09090B]">
      <div className="card p-6 sm:p-8 w-full max-w-[400px] space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome to PDT Study</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Tell us a bit about yourself to personalize your experience.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Education Level</label>
            <select 
              required
              className="input"
              value={form.education_level}
              onChange={(e) => setForm({ ...form, education_level: e.target.value })}
            >
              <option value="" disabled>Select level</option>
              <option value="cbc">CBC</option>
              <option value="kcse">KCSE</option>
              <option value="university">University</option>
              <option value="college">College</option>
              <option value="tvet">TVET</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Institution (Optional)</label>
            <input 
              className="input" 
              placeholder="e.g. University of Nairobi"
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A1A1AA] mb-1">Learning Goals</label>
            <textarea 
              className="input min-h-[100px] py-3" 
              placeholder="What are you trying to achieve?"
              value={form.learning_goals}
              onChange={(e) => setForm({ ...form, learning_goals: e.target.value })}
            />
          </div>

          {errorMsg && (
            <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
