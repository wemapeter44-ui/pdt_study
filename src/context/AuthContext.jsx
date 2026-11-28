import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo
} from 'react';

import { supabase } from '../lib/supabase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  // Which user the current `profile` value belongs to (null = nobody / not fetched yet).
  // This lets `loading` stay true from the moment a user signs in until THEIR profile
  // has really been fetched, so guards never see "signed in, profile = null" for a frame
  // and the skeleton never flashes away early.
  const [profileUserId, setProfileUserId] = useState(null);

  const userId = session?.user?.id ?? null;

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
      if (!userId) {
        setProfile(null);
        setProfileUserId(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
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
        // Done for this user, whether it worked or not
        if (!cancelled) {
          setProfileUserId(userId);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Re-read the profile after it is edited (for example in Settings),
  // without showing the loading skeleton again.
  const refreshProfile = useCallback(async () => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile refresh error:', error);
      return null;
    }

    setProfile(data ?? null);
    return data ?? null;
  }, [userId]);

  // Sign out.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const profileLoading = Boolean(userId) && profileUserId !== userId;

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileLoading,
      loading: session === undefined || profileLoading,
      refreshProfile,
      signOut
    }),
    [session, profile, profileLoading, refreshProfile, signOut]
  );

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