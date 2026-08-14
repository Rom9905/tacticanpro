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
  // A password-recovery email link lands here with a real session in the URL.
  // Without this flag the app would treat that session as a normal login and
  // drop the user straight into the dashboard instead of the reset-password
  // screen. Seed it from the URL hash (the token carries `type=recovery`) so
  // the very first render already knows, and confirm it via the
  // PASSWORD_RECOVERY auth event below.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery'),
  );

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
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
        .select('status, end_date, cancelled_at, billing_key')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // A trial that passed its end_date no longer grants access (covers a
      // trial cancelled before its first charge — the cron never touches it,
      // so the stored status stays 'trial' forever). An 'active' sub is
      // expired client-side only when it UNAMBIGUOUSLY will not renew: it was
      // cancelled, or it is an upfront one-time season pass past its end
      // (billing_key season_full). Everything else — recurring HK subs (HYP
      // bills them, our end_date never advances) and token subs the cron is
      // still working — is left to the server: charge-due-subscriptions flips
      // it to 'inactive' within the hour and we then read that directly. This
      // conservative mirror is the instant backstop and must never lock out a
      // paying customer.
      const now = new Date();
      const ended = sub?.end_date && new Date(sub.end_date) < now;
      const expiredTrial = sub?.status === 'trial' && ended;
      const lapsedActive = sub?.status === 'active' && ended
        && (sub?.cancelled_at || sub?.billing_key === 'season_full');
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
      isPasswordRecovery,
      endPasswordRecovery: () => setIsPasswordRecovery(false),
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
