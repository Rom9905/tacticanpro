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
        role: profile?.role || 'admin',
        access_status: profile?.access_status || 'paid',
        is_approved: profile?.is_approved ?? true,
        setup_complete: profile?.setup_complete ?? false,
        setup_team_id: profile?.setup_team_id || null,
      };

      // Check subscription status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', authUser.id)
        .single();

      const subStatus = sub?.status || 'inactive';
      setSubscriptionStatus(subStatus);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Profile load failed:', e);
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        role: 'admin',
        access_status: 'paid',
        is_approved: true,
        setup_complete: false,
      });
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
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
