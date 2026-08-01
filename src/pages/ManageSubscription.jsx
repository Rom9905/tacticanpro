import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, CalendarDays, CreditCard } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL = 'https://jtixfrsetegimecbkkas.supabase.co';

const PLAN_LABELS = { monthly: 'מנוי חודשי', annual: 'מנוי עונתי' };

export default function ManageSubscription() {
  const { user, checkAppState } = useAuth();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState(null); // { manual } after successful cancel
  const [error, setError] = useState(null);

  const loadSubscription = async () => {
    setLoading(true);
    // Explicit user filter: the admin RLS policy can see ALL rows, so relying
    // on RLS alone would return multiple rows and break maybeSingle().
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) { setSub(null); setLoading(false); return; }
    const { data } = await supabase
      .from('subscriptions')
      .select('status, plan, start_date, end_date, hk_id, cancelled_at')
      .eq('user_id', uid)
      .maybeSingle();
    setSub(data || null);
    setLoading(false);
  };

  useEffect(() => { loadSubscription(); }, []);

  const cancelSubscription = async () => {
    setCancelling(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'הביטול נכשל — נסה שוב או פנה לתמיכה');
      } else {
        setResult({ manual: !!data.manual });
        await loadSubscription();
        checkAppState?.();
      }
    } catch {
      setError('שגיאת תקשורת — בדוק את החיבור ונסה שוב');
    }
    setCancelling(false);
    setConfirming(false);
  };

  const endDateStr = sub?.end_date ? new Date(sub.end_date).toLocaleDateString('he-IL') : null;
  const isActive = sub?.status === 'active';
  const isCancelled = !!sub?.cancelled_at;
  const isRecurring = !!sub?.hk_id; // recurring standing order we can stop automatically

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D1A12', color: '#E8F5EC', fontFamily: 'Assistant, sans-serif' }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col min-h-screen">
        <InfoPageHeader variant="dark" />

        <main className="flex-1 flex flex-col items-center px-6 py-16">
          <h1 style={{ fontFamily: 'Heebo, sans-serif', fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, color: '#FAF7F0', marginBottom: 8, textAlign: 'center' }}>
            ניהול מנוי
          </h1>
          {user?.email && (
            <p style={{ fontSize: 14, color: 'rgba(232,245,236,0.5)', marginBottom: 36, textAlign: 'center' }}>{user.email}</p>
          )}

          <div style={{
            maxWidth: 560, width: '100%', borderRadius: 24, padding: '36px 32px',
            backgroundColor: '#13241A', border: '1px solid rgba(74,222,128,.15)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
          }}>
            {loading ? (
              <div className="flex items-center justify-center" style={{ padding: 40 }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4ADE80' }} />
              </div>
            ) : !sub || !isActive ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, color: 'rgba(232,245,236,0.7)', marginBottom: 24 }}>אין מנוי פעיל כרגע.</p>
                <Link to="/payment" style={{
                  display: 'inline-block', backgroundColor: '#4ADE80', color: '#0D1A12',
                  fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 15,
                  padding: '12px 32px', borderRadius: 9999, textDecoration: 'none',
                }}>
                  לרכישת מנוי
                </Link>
              </div>
            ) : (
              <>
                {/* Subscription details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                  <div className="flex items-center gap-3">
                    <CreditCard style={{ width: 18, height: 18, color: '#4ADE80', flexShrink: 0 }} />
                    <span style={{ fontSize: 16, color: '#FAF7F0', fontWeight: 600 }}>
                      {PLAN_LABELS[sub.plan] || 'מנוי'}
                      {isCancelled && (
                        <span style={{
                          marginRight: 10, fontSize: 12, fontWeight: 700, color: '#F3B95F',
                          background: 'rgba(243,185,95,0.12)', border: '1px solid rgba(243,185,95,0.35)',
                          borderRadius: 9999, padding: '3px 10px',
                        }}>בוטל — לא יתחדש</span>
                      )}
                    </span>
                  </div>
                  {endDateStr && (
                    <div className="flex items-center gap-3">
                      <CalendarDays style={{ width: 18, height: 18, color: '#4ADE80', flexShrink: 0 }} />
                      <span style={{ fontSize: 15, color: 'rgba(232,245,236,0.75)' }}>
                        {isCancelled ? `הגישה פעילה עד ${endDateStr}` : `בתוקף עד ${endDateStr}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Post-cancel confirmation */}
                {result && (
                  <div style={{ borderRadius: 14, padding: '16px 18px', marginBottom: 20, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.3)' }}>
                    <p className="flex items-start gap-2" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#E8F5EC' }}>
                      <CheckCircle2 style={{ width: 17, height: 17, color: '#4ADE80', flexShrink: 0, marginTop: 2 }} />
                      <span>
                        המנוי בוטל בהצלחה. לא יבוצעו חיובים נוספים, והגישה תישאר פעילה עד {endDateStr}.
                        {result.manual && ' אם המנוי שלך בתשלום חודשי, נעצור את הוראת הקבע ידנית ונאשר לך במייל תוך יום עסקים.'}
                      </span>
                    </p>
                  </div>
                )}

                {error && (
                  <div style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 20, background: 'rgba(239,139,139,.12)', border: '1px solid rgba(239,139,139,.35)' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#EF8B8B' }}>{error}</p>
                  </div>
                )}

                {/* Cancel flow */}
                {!isCancelled && !result && (
                  confirming ? (
                    <div style={{ borderRadius: 14, padding: '18px 20px', background: 'rgba(243,185,95,0.07)', border: '1px solid rgba(243,185,95,0.3)' }}>
                      <p className="flex items-start gap-2" style={{ margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.65, color: '#E8F5EC' }}>
                        <AlertTriangle style={{ width: 17, height: 17, color: '#F3B95F', flexShrink: 0, marginTop: 2 }} />
                        <span>
                          {isRecurring
                            ? 'הביטול יעצור את החיובים הבאים. החודש הנוכחי ששולם — נשאר שלך, והגישה תישאר פעילה עד סופו. להמשיך?'
                            : 'הביטול יימנע חידוש של המנוי לעונה הבאה. הגישה תישאר פעילה עד תום התקופה ששולמה. להמשיך?'}
                        </span>
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={cancelSubscription} disabled={cancelling}
                          className="flex items-center justify-center gap-2"
                          style={{
                            flex: 1, minWidth: 150, height: 46, borderRadius: 9999, border: 'none',
                            background: '#E5484D', color: '#FFF', fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 15,
                            cursor: cancelling ? 'wait' : 'pointer', opacity: cancelling ? 0.7 : 1,
                          }}>
                          {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> מבטל...</> : 'כן, בטלו את המנוי'}
                        </button>
                        <button onClick={() => setConfirming(false)} disabled={cancelling}
                          style={{
                            flex: 1, minWidth: 150, height: 46, borderRadius: 9999,
                            border: '1.5px solid rgba(232,245,236,0.25)', background: 'transparent',
                            color: 'rgba(232,245,236,0.85)', fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                          }}>
                          התחרטתי — השאירו אותו
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirming(true)}
                      style={{
                        width: '100%', height: 48, borderRadius: 9999,
                        border: '1.5px solid rgba(229,72,77,0.5)', background: 'transparent',
                        color: '#EF8B8B', fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                      }}>
                      ביטול המנוי
                    </button>
                  )
                )}
              </>
            )}
          </div>

          <p style={{ fontSize: 13, color: 'rgba(232,245,236,0.5)', marginTop: 24, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 15, height: 15, color: '#4ADE80' }} />
            שאלות? taactican@gmail.com · 053-620-0593
          </p>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Link to="/terms" style={{ fontSize: 13, color: 'rgba(232,245,236,0.4)', marginLeft: 12, textDecoration: 'none' }}>תקנון</Link>
            <Link to="/cancellation-policy" style={{ fontSize: 13, color: 'rgba(232,245,236,0.4)', textDecoration: 'none' }}>מדיניות ביטולים</Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
