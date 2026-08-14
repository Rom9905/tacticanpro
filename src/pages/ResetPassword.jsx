import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

// Landing page of the password-recovery email link. Supabase redirects here
// with a recovery token in the URL hash; supabase-js exchanges it for a
// session automatically, after which updateUser({ password }) is allowed.
export default function ResetPassword() {
  const { endPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(null); // null = still checking

  useEffect(() => {
    // The recovery token exchange may still be in flight when the page mounts.
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setHasSession(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session) setHasSession(true);
    });
    // If no session shows up shortly, the link is invalid/expired.
    const timer = setTimeout(() => { if (active) setHasSession(prev => (prev === null ? false : prev)); }, 4000);
    return () => { active = false; subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const msg = String(error.message || '');
      if (msg.includes('should be different')) setError('הסיסמה החדשה חייבת להיות שונה מהקודמת');
      else if (msg.includes('rate limit') || msg.includes('For security purposes')) setError('בוצעו יותר מדי ניסיונות — המתן רגע ונסה שוב');
      else setError('עדכון הסיסמה נכשל — נסה שוב או בקש קישור איפוס חדש');
    } else {
      setDone(true);
      // Recovery is over — let the app route normally into the (now
      // authenticated) session after the confirmation message.
      endPasswordRecovery?.();
      setTimeout(() => { window.location.href = '/'; }, 2500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-3xl font-bold text-white">TACTICAN<span className="text-emerald-500">PRO</span></span>
          </div>
          <p className="text-slate-400 text-sm">בחירת סיסמה חדשה</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {done ? (
            <div className="text-center py-4">
              <p className="text-emerald-400 font-semibold mb-2">הסיסמה עודכנה בהצלחה!</p>
              <p className="text-slate-400 text-sm">מעבירים אותך לאפליקציה...</p>
            </div>
          ) : hasSession === false ? (
            <div className="text-center py-4">
              <p className="text-red-400 font-semibold mb-2">הקישור אינו תקף או שפג תוקפו</p>
              <p className="text-slate-400 text-sm mb-4">בקש קישור איפוס חדש מעמוד ההתחברות.</p>
              <Button onClick={() => { window.location.href = '/login'; }} className="bg-emerald-600 hover:bg-emerald-700">
                חזרה להתחברות
              </Button>
            </div>
          ) : hasSession === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-bold text-white text-center">איפוס סיסמה</h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-1 block">סיסמה חדשה (לפחות 6 תווים)</label>
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
              <div>
                <label className="text-xs text-slate-400 mb-1 block">אימות סיסמה</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'עדכן סיסמה'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
