
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react';

import { supabase } from '../lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Initialise authentication and listen for auth changes.
  useEffect(() => {
    let mounted = true;

    async function initialiseAuth() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('Session initialization error:', error);
      }

      setSession(data?.session ?? null);
    }

    initialiseAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch the logged-in user's profile.
  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!session?.user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setProfile(data ?? null);
        }
      } catch (error) {
        console.error('Profile loading error:', error);

        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Sign out.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    profileLoading,
    loading: session === undefined || profileLoading,
    signOut
  };

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}
