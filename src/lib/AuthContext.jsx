import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'local', public_settings: {} });
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSubscriptionStatus(null); // don't leak the previous account's status
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    } catch (e) {
      console.error('Auth check failed:', e);
      setIsLoadingAuth(false);
    }
  };

  const loadProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        role: profile?.role || 'user',
        access_status: profile?.access_status || 'no_access',
        is_approved: profile?.is_approved ?? false,
        setup_complete: profile?.setup_complete ?? false,
        setup_team_id: profile?.setup_team_id || null,
      };

      setUser(userData);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Profile load failed:', e);
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        role: 'user',
        access_status: 'no_access',
        is_approved: false,
        setup_complete: false,
      });
      setIsAuthenticated(true);
    }

    // Fetch subscription separately so a missing row doesn't break auth
    try {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, end_date, cancelled_at, hk_id, next_charge_at')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // A trial that passed its end_date no longer grants access (covers a
      // trial cancelled before its first charge — the cron never touches it,
      // so the stored status stays 'trial' forever). An 'active' sub also
      // really ends at end_date when nothing will renew it: it was cancelled,
      // or it has no renewal instrument (no HK agreement and no pending token
      // charge — e.g. an upfront season pass after June 1). Uncancelled HK
      // subs are NOT expired here: HYP renews them autonomously and end_date
      // in our DB does not advance. Mirrors the charge-due-subscriptions
      // server sweep — this is only the instant client-side backstop.
      const now = new Date();
      const ended = sub?.end_date && new Date(sub.end_date) < now;
      const expiredTrial = sub?.status === 'trial' && ended;
      const lapsedActive = sub?.status === 'active' && ended
        && (sub?.cancelled_at || (!sub?.hk_id && !sub?.next_charge_at));
      setSubscriptionStatus((expiredTrial || lapsedActive) ? 'inactive' : (sub?.status || 'inactive'));
    } catch (e) {
      console.error('Subscription check failed:', e);
      setSubscriptionStatus('inactive');
    }
    setIsLoadingAuth(false);
  };

  const logout = async () => {
    // Drop per-account UI state so the next account signing in on this
    // browser doesn't inherit a team id it doesn't own (mirrors
    // base44.auth.logout — both paths are used).
    try { localStorage.removeItem('selectedTeamId'); } catch { /* private mode */ }
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setSubscriptionStatus(null); // don't leak this account's status to the next login
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      subscriptionStatus,
      logout,
      navigateToLogin,
      checkAppState: checkSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
