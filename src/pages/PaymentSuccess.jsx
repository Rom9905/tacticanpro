import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/lib/AuthContext';

const SUPABASE_URL = 'https://jtixfrsetegimecbkkas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aXhmcnNldGVnaW1lY2Jra2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzA1MDMsImV4cCI6MjA5OTM0NjUwM30.nKiVX5niATYsHaU1b_2d6EkqprSrEI7w4RZhlBqZGPw';

const PLAN_LABELS = { monthly: 'מנוי חודשי', annual: 'מנוי עונתי' };

export default function PaymentSuccess() {
  const { checkAppState } = useAuth();
  const [state, setState] = useState('verifying'); // verifying | success | failed
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      // Forward all HYP redirect params to the callback function for
      // server-side signature verification + subscription activation.
      const params = {};
      new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });

      if (!params.Id) {
        setState('failed');
        setErrorMsg('לא נמצאו נתוני תשלום בכתובת — אם שילמת, פנה לתמיכה');
        return;
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/hyp-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ params }),
        });
        const data = await res.json();
        if (data.ok) {
          setDetails(data);
          setState('success');
          // Refresh auth context so the app unlocks immediately
          checkAppState?.();
        } else {
          setState('failed');
          setErrorMsg(data.error || 'התשלום לא אושר');
        }
      } catch {
        setState('failed');
        setErrorMsg('שגיאת תקשורת באימות התשלום — אם שילמת, פנה לתמיכה');
      }
    })();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D1A12', color: '#E8F5EC', fontFamily: 'Assistant, sans-serif' }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col min-h-screen">
        <InfoPageHeader variant="dark" />

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div style={{
            maxWidth: 520, width: '100%', borderRadius: 24, padding: '48px 40px',
            backgroundColor: '#13241A', textAlign: 'center',
            border: state === 'success' ? '2px solid #4ADE80' : '1px solid rgba(74,222,128,.15)',
            boxShadow: state === 'success' ? '0 0 40px rgba(74,222,128,0.2)' : '0 10px 24px rgba(0,0,0,0.2)',
          }}>
            {state === 'verifying' && (
              <>
                <Loader2 className="w-14 h-14 mx-auto mb-5 animate-spin" style={{ color: '#4ADE80' }} />
                <h1 style={{ fontFamily: 'Heebo, sans-serif', fontSize: 26, fontWeight: 800, color: '#FAF7F0', marginBottom: 8 }}>
                  מאמת את התשלום...
                </h1>
                <p style={{ fontSize: 15, color: 'rgba(232,245,236,0.6)' }}>
                  רגע אחד, בודקים מול HYP שהכל עבר בהצלחה
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle2 className="w-16 h-16 mx-auto mb-5" style={{ color: '#4ADE80' }} />
                <h1 style={{ fontFamily: 'Heebo, sans-serif', fontSize: 28, fontWeight: 900, color: '#FAF7F0', marginBottom: 8 }}>
                  התשלום התקבל — המנוי פעיל!
                </h1>
                <p style={{ fontSize: 16, color: 'rgba(232,245,236,0.75)', marginBottom: 6 }}>
                  {PLAN_LABELS[details?.plan] || 'המנוי'} שלך הופעל בהצלחה
                </p>
                {details?.end_date && (
                  <p style={{ fontSize: 14, color: 'rgba(232,245,236,0.5)', marginBottom: 4 }}>
                    בתוקף עד {new Date(details.end_date).toLocaleDateString('he-IL')}
                  </p>
                )}
                {details?.transaction_id && (
                  <p style={{ fontSize: 12, color: 'rgba(232,245,236,0.35)', marginBottom: 28 }}>
                    מספר עסקה: {details.transaction_id}
                  </p>
                )}
                <Link to="/" style={{
                  display: 'inline-block', backgroundColor: '#4ADE80', color: '#0D1A12',
                  fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 16,
                  padding: '14px 40px', borderRadius: 9999, textDecoration: 'none',
                }}>
                  כניסה למערכת
                </Link>
              </>
            )}

            {state === 'failed' && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-5" style={{ color: '#EF8B8B' }} />
                <h1 style={{ fontFamily: 'Heebo, sans-serif', fontSize: 26, fontWeight: 800, color: '#FAF7F0', marginBottom: 8 }}>
                  התשלום לא הושלם
                </h1>
                <p style={{ fontSize: 15, color: 'rgba(232,245,236,0.65)', marginBottom: 28 }}>{errorMsg}</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/payment" style={{
                    display: 'inline-block', backgroundColor: '#4ADE80', color: '#0D1A12',
                    fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 15,
                    padding: '12px 32px', borderRadius: 9999, textDecoration: 'none',
                  }}>
                    נסה שוב
                  </Link>
                  <a href="mailto:taactican@gmail.com" style={{
                    display: 'inline-block', border: '1.5px solid rgba(74,222,128,.4)', color: '#4ADE80',
                    fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 15,
                    padding: '12px 32px', borderRadius: 9999, textDecoration: 'none',
                  }}>
                    פנייה לתמיכה
                  </a>
                </div>
              </>
            )}
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
