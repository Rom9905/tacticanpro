import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'אימייל או סיסמה שגויים'
        : error.message);
    } else {
      window.location.href = '/';
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage('נרשמת בהצלחה! בדוק את האימייל לאישור החשבון.');
      setMode('login');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage('נשלח אימייל לאיפוס סיסמה. בדוק את תיבת הדואר.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-3xl font-bold text-white">TACTICAN<span className="text-emerald-500">PRO</span></span>
          </div>
          <p className="text-slate-400 text-sm">מערכת התובנות של המאמן</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {mode === 'login' && 'התחברות'}
            {mode === 'register' && 'הרשמה'}
            {mode === 'forgot' && 'איפוס סיסמה'}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
              <p className="text-emerald-400 text-sm">{message}</p>
            </div>
          )}

          {/* Google OAuth */}
          {mode !== 'forgot' && (
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium mb-4 h-11"
            >
              <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              המשך עם Google
            </Button>
          )}

          {mode !== 'forgot' && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-slate-900 text-slate-500">או</span>
              </div>
            </div>
          )}

          {/* Forms */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">אימייל</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">סיסמה</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'התחבר'}
              </Button>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); }} className="text-emerald-400 hover:text-emerald-300">
                  אין לך חשבון? הירשם
                </button>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="text-slate-400 hover:text-slate-300">
                  שכחת סיסמה?
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">שם מלא</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">אימייל</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">סיסמה (לפחות 6 תווים)</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'הירשם'}
              </Button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-xs text-emerald-400 hover:text-emerald-300 w-full text-center">
                יש לך חשבון? התחבר
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">אימייל</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלח קישור איפוס'}
              </Button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-xs text-slate-400 hover:text-slate-300 w-full text-center">
                חזרה להתחברות
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2026 TacticanPro. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  );
}
