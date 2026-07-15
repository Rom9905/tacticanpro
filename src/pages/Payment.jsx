import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_URL = 'https://jtixfrsetegimecbkkas.supabase.co';

const paymentStyles = `
  .payment-page { font-family: 'Assistant', sans-serif; }
  .payment-page h1, .payment-page h3 { font-family: 'Heebo', sans-serif; }
  @keyframes payFadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .payment-card { animation: payFadeInUp 0.5s ease-out both; transition: transform 200ms ease-out, box-shadow 200ms ease-out; }
  .payment-card:hover { transform: translateY(-4px); }
  .payment-cta-outline { transition: all 200ms ease-out; }
  .payment-cta-outline:hover:not(:disabled) { background-color: #4ADE80 !important; color: #0D1A12 !important; }
  .payment-cta-solid { transition: all 200ms ease-out; }
  .payment-cta-solid:hover:not(:disabled) { background-color: #5EEA94 !important; transform: scale(1.02); }
  @media (prefers-reduced-motion: reduce) {
    .payment-card, .payment-card:hover { animation: none !important; transition: none !important; transform: none !important; }
  }
`;

const MONTHLY_FEATURES = [
  'גישה מלאה לכל הכלים',
  'ניתוח משחקים ותובנות AI',
  'מרכז אימונים והכנה למשחק',
  'מתחדש אוטומטית כל חודש',
  'ביטול בכל עת',
];

const SEASON_FEATURES = [
  'כל מה שבמסלול החודשי',
  'רק 150₪ לחודש — המחיר המשתלם ביותר',
  'בחירה בין תשלום חודשי לתשלום מלא מראש',
  'תשלום מלא מראש: 1,800₪ עד תום העונה',
  'התחייבות לעונה — ניתן לבטל לפי התקנון',
];

export default function Payment() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [seasonMode, setSeasonMode] = useState('monthly'); // 'monthly' (150/mo) | 'full' (1800)
  const [termsAccepted, setTermsAccepted] = useState(false);

  const startPayment = async (plan) => {
    if (!termsAccepted) {
      setError('יש לקרוא ולאשר את תקנון השימוש ומדיניות הביטולים כדי להמשיך');
      return;
    }
    setLoadingPlan(plan);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hyp-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'שגיאה ביצירת עמוד התשלום — נסה שוב');
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.url; // → HYP secure payment page
    } catch {
      setError('שגיאת תקשורת — בדוק את החיבור ונסה שוב');
      setLoadingPlan(null);
    }
  };

  return (
    <div dir="rtl" className="payment-page min-h-screen flex flex-col" style={{ backgroundColor: '#0D1A12', color: '#E8F5EC' }}>
      <style>{paymentStyles}</style>

      <div style={{
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col min-h-screen">
        <InfoPageHeader variant="dark" />

        <main className="flex-1 flex flex-col items-center px-6 py-16">
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 900, color: '#FAF7F0', marginBottom: 12, textAlign: 'center' }}>
            בחרו את המסלול שלכם
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(232,245,236,0.6)', textAlign: 'center', marginBottom: 12 }}>
            תשלום מאובטח דרך HYP · גישה מיידית לאחר התשלום
          </p>
          {user?.email && (
            <p style={{ fontSize: 14, color: '#4ADE80', textAlign: 'center', marginBottom: 40 }}>
              המנוי יופעל עבור {user.email}
            </p>
          )}

          {error && (
            <div style={{ maxWidth: 560, width: '100%', marginBottom: 24, borderRadius: 12, padding: '12px 18px', background: 'rgba(239,139,139,.12)', border: '1px solid rgba(239,139,139,.35)' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#EF8B8B', textAlign: 'center' }}>{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 w-full" style={{ maxWidth: 1100 }}>
            {/* Monthly */}
            <div className="payment-card" style={{
              backgroundColor: '#13241A', borderRadius: 24, padding: '40px 32px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 10px 24px rgba(0,0,0,0.10)',
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#FAF7F0', marginBottom: 4 }}>חודשי</h3>
              <p style={{ fontSize: 15, color: 'rgba(232,245,236,0.6)', marginBottom: 20 }}>גמישות מלאה — בטלו בכל עת</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 56, color: '#FAF7F0', lineHeight: 1 }}>199₪</span>
                <span style={{ fontSize: 16, color: 'rgba(232,245,236,0.6)' }}>/ לחודש</span>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, padding: 0, listStyle: 'none' }}>
                {MONTHLY_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ fontSize: 15, color: '#E8F5EC' }}>
                    <Check style={{ color: '#4ADE80', marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => startPayment('monthly')} disabled={!!loadingPlan}
                className="payment-cta-outline w-full font-bold rounded-full flex items-center justify-center gap-2"
                style={{ backgroundColor: 'transparent', border: '1.5px solid #4ADE80', color: '#4ADE80', height: 52, fontSize: 16, fontFamily: 'Heebo, sans-serif', cursor: loadingPlan ? 'wait' : 'pointer', opacity: (!termsAccepted || (loadingPlan && loadingPlan !== 'monthly')) ? 0.55 : 1 }}>
                {loadingPlan === 'monthly' ? <><Loader2 className="w-4 h-4 animate-spin" /> מעביר לתשלום...</> : 'לתשלום מאובטח'}
              </button>
            </div>

            {/* Season pass */}
            <div className="payment-card" style={{
              backgroundColor: '#13241A', borderRadius: 24, padding: '40px 32px',
              border: '2px solid #4ADE80', boxShadow: '0 0 32px rgba(74,222,128,0.2)',
              position: 'relative', animationDelay: '100ms',
            }}>
              <div style={{
                position: 'absolute', top: -14, right: 32, backgroundColor: '#4ADE80', color: '#0D1A12',
                fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 13, padding: '6px 16px', borderRadius: 9999,
              }}>הכי משתלם</div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#FAF7F0', marginBottom: 4 }}>עונתי</h3>
              <p style={{ fontSize: 15, color: 'rgba(232,245,236,0.6)', marginBottom: 16 }}>כל העונה במחיר המשתלם ביותר</p>

              {/* Billing mode toggle: monthly 150 vs full 1,800 upfront */}
              <div style={{ display: 'flex', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                {[
                  { key: 'monthly', label: 'תשלום חודשי' },
                  { key: 'full', label: 'תשלום מלא' },
                ].map(opt => (
                  <button key={opt.key} type="button" onClick={() => setSeasonMode(opt.key)}
                    style={{
                      flex: 1, height: 38, borderRadius: 9, border: 'none', cursor: 'pointer',
                      fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 14,
                      backgroundColor: seasonMode === opt.key ? '#4ADE80' : 'transparent',
                      color: seasonMode === opt.key ? '#0D1A12' : 'rgba(232,245,236,0.7)',
                      transition: 'all 150ms ease-out',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {seasonMode === 'monthly' ? (
                <>
                  <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 56, color: '#4ADE80', lineHeight: 1 }}>150₪</span>
                    <span style={{ fontSize: 16, color: 'rgba(232,245,236,0.6)' }}>/ לחודש</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(232,245,236,0.5)', marginBottom: 20 }}>
                    במקום <span style={{ textDecoration: 'line-through' }}>199₪</span> · חיוב חודשי מתחדש של 150₪
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 56, color: '#4ADE80', lineHeight: 1 }}>1,800₪</span>
                    <span style={{ fontSize: 16, color: 'rgba(232,245,236,0.6)' }}>מראש</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(232,245,236,0.5)', marginBottom: 20 }}>
                    תשלום אחד · שווה ערך ל-150₪ לחודש · תקף עד תום העונה
                  </p>
                </>
              )}
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, padding: 0, listStyle: 'none' }}>
                {SEASON_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ fontSize: 15, color: '#E8F5EC' }}>
                    <Check style={{ color: '#4ADE80', marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {(() => {
                const seasonPlan = seasonMode === 'full' ? 'season_full' : 'season_monthly';
                return (
                  <button onClick={() => startPayment(seasonPlan)} disabled={!!loadingPlan}
                    className="payment-cta-solid w-full font-bold rounded-full flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#4ADE80', color: '#0D1A12', height: 52, fontSize: 16, fontFamily: 'Heebo, sans-serif', border: 'none', cursor: loadingPlan ? 'wait' : 'pointer', opacity: (!termsAccepted || (loadingPlan && loadingPlan !== seasonPlan)) ? 0.55 : 1 }}>
                    {loadingPlan === seasonPlan ? <><Loader2 className="w-4 h-4 animate-spin" /> מעביר לתשלום...</> : 'לתשלום מאובטח'}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Terms acceptance — required before any payment can start */}
          <label htmlFor="terms-accept" style={{
            maxWidth: 560, width: '100%', marginTop: 36, display: 'flex', alignItems: 'flex-start', gap: 12,
            cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${termsAccepted ? 'rgba(74,222,128,.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 14, padding: '16px 18px', transition: 'border-color 150ms ease-out',
          }}>
            <input id="terms-accept" type="checkbox" checked={termsAccepted}
              onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setError(null); }}
              style={{ width: 20, height: 20, marginTop: 2, accentColor: '#4ADE80', flexShrink: 0, cursor: 'pointer' }} />
            <span style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(232,245,236,0.85)' }}>
              קראתי ואני מאשר/ת את{' '}
              <Link to="/terms" target="_blank" style={{ color: '#4ADE80', textDecoration: 'underline' }}>תקנון השימוש</Link>
              {' '}ואת{' '}
              <Link to="/cancellation-policy" target="_blank" style={{ color: '#4ADE80', textDecoration: 'underline' }}>מדיניות הביטולים</Link>
              , כולל תנאי המסלול, החיוב המתחדש וההתחייבות לתקופה.
            </span>
          </label>

          <p style={{ fontSize: 13, color: 'rgba(232,245,236,0.5)', marginTop: 20, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 15, height: 15, color: '#4ADE80' }} />
            התשלום מתבצע בדף מאובטח של HYP — פרטי האשראי לא עוברים דרך המערכת שלנו
          </p>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <Link to="/terms" style={{ fontSize: 13, color: 'rgba(232,245,236,0.4)', marginLeft: 12, textDecoration: 'none' }}>תקנון</Link>
            <Link to="/cancellation-policy" style={{ fontSize: 13, color: 'rgba(232,245,236,0.4)', textDecoration: 'none' }}>מדיניות ביטולים</Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
