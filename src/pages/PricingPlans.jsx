import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';
import LeadForm from '@/components/LeadForm';
import { useAuth } from '@/lib/AuthContext';

const pricingStyles = `
  .pricing-page { font-family: 'Assistant', sans-serif; }
  .pricing-page h1, .pricing-page h3 { font-family: 'Heebo', sans-serif; }

  @keyframes pricingFadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .pricing-card {
    animation: pricingFadeInUp 0.5s ease-out both;
    transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  }
  .pricing-card:hover { transform: translateY(-4px); }
  .pricing-card-monthly:hover { box-shadow: 0 8px 12px rgba(0,0,0,0.10), 0 20px 40px rgba(74,222,128,0.15); }
  .pricing-card-annual:hover { box-shadow: 0 8px 12px rgba(0,0,0,0.10), 0 20px 48px rgba(74,222,128,0.25); }

  .pricing-cta-outline { transition: all 200ms ease-out; }
  .pricing-cta-outline:hover { background-color: #4ADE80 !important; color: #0D1A12 !important; }

  .pricing-cta-solid { transition: all 200ms ease-out; }
  .pricing-cta-solid:hover { background-color: #5EEA94 !important; transform: scale(1.02); }

  .pricing-link { transition: color 200ms ease-out; }
  .pricing-link:hover { color: #4ADE80 !important; }

  @media (prefers-reduced-motion: reduce) {
    .pricing-card, .pricing-card:hover, .pricing-cta-outline, .pricing-cta-solid, .pricing-cta-solid:hover {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }
  }
`;

const MONTHLY_FEATURES = [
  'גישה מלאה לכל הכלים',
  'ניתוח משחקים ותובנות',
  'פרופילי שחקנים ומעקב התקדמות',
  'מרכז אימונים והכנה למשחק',
  'מתחדש אוטומטית כל חודש',
  'ביטול בכל עת',
];

const ANNUAL_FEATURES = [
  'כל מה שבמסלול החודשי',
  'חיסכון של 588₪ בשנה',
  'תשלום חודשי נוח של 150₪',
  'התחייבות ל-12 חודשים',
];

export default function PricingPlans() {
  const { user } = useAuth();
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  const handleCTA = (planName) => {
    if (user) {
      window.location.href = '/';
      return;
    }
    setSelectedPlan(planName);
    setLeadFormOpen(true);
  };

  const isBlocked = false;

  return (
    <div dir="rtl" className="pricing-page min-h-screen flex flex-col" style={{ backgroundColor: '#0D1A12', color: '#E8F5EC' }}>
      <style>{pricingStyles}</style>

      {/* Radial glow */}
      <div style={{
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        height: '700px',
        background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }} className="flex flex-col min-h-screen">
        <InfoPageHeader variant="dark" />

        <main className="flex-1 flex flex-col items-center px-6 py-16">
          {/* Personalized greeting for blocked users */}
          {isBlocked && (
            <p style={{ fontSize: 18, fontWeight: 500, color: '#4ADE80', textAlign: 'center', marginBottom: 32, fontFamily: 'Assistant, sans-serif' }}>
              היי {user.full_name || user.email}! כדי להיכנס למערכת — בחרו מסלול:
            </p>
          )}

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 900, color: '#FAF7F0', marginBottom: 12, textAlign: 'center' }}>
            בחרו את המסלול שלכם
          </h1>
          <p style={{ fontSize: 18, fontWeight: 400, color: 'rgba(232, 245, 236, 0.6)', textAlign: 'center', marginBottom: 48, fontFamily: 'Assistant, sans-serif' }}>
            גישה מלאה לכל הכלים. בלי הגבלות.
          </p>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 w-full" style={{ maxWidth: 1100 }}>
            {/* Monthly card */}
            <div className="pricing-card pricing-card-monthly" style={{
              backgroundColor: '#13241A',
              borderRadius: 24,
              padding: '40px 32px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 10px 24px rgba(0,0,0,0.10)',
              animationDelay: '0ms',
            }}>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#FAF7F0', marginBottom: 4 }}>חודשי</h3>
              <p style={{ fontSize: 15, color: 'rgba(232, 245, 236, 0.6)', marginBottom: 20, fontFamily: 'Assistant, sans-serif' }}>גמישות מלאה — בטלו בכל עת</p>

              <div className="flex items-baseline gap-2 mb-6">
                <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 56, color: '#FAF7F0', lineHeight: 1 }}>199₪</span>
                <span style={{ fontSize: 16, color: 'rgba(232, 245, 236, 0.6)' }}>/ לחודש</span>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, padding: 0, listStyle: 'none' }}>
                {MONTHLY_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ fontSize: 15, color: '#E8F5EC', fontFamily: 'Assistant, sans-serif' }}>
                    <Check style={{ color: '#4ADE80', marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCTA('חודשי')}
                className="pricing-cta-outline w-full font-bold rounded-full"
                style={{ backgroundColor: 'transparent', border: '1.5px solid #4ADE80', color: '#4ADE80', height: 52, fontSize: 16, fontFamily: 'Heebo, sans-serif', cursor: 'pointer' }}
              >
                התחילו עכשיו
              </button>
            </div>

            {/* Annual card — highlighted */}
            <div className="pricing-card pricing-card-annual" style={{
              backgroundColor: '#13241A',
              borderRadius: 24,
              padding: '40px 32px',
              border: '2px solid #4ADE80',
              boxShadow: '0 0 32px rgba(74,222,128,0.2)',
              animationDelay: '100ms',
              position: 'relative',
            }}>
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: -14,
                right: 32,
                backgroundColor: '#4ADE80',
                color: '#0D1A12',
                fontFamily: 'Heebo, sans-serif',
                fontWeight: 700,
                fontSize: 13,
                padding: '6px 16px',
                borderRadius: 9999,
              }}>
                הכי משתלם
              </div>

              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#FAF7F0', marginBottom: 4 }}>שנתי</h3>

              <div className="flex items-baseline gap-2" style={{ marginBottom: 4 }}>
                <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 900, fontSize: 56, color: '#4ADE80', lineHeight: 1 }}>150₪</span>
                <span style={{ fontSize: 16, color: 'rgba(232, 245, 236, 0.6)' }}>/ לחודש</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.5)', marginBottom: 4, fontFamily: 'Assistant, sans-serif' }}>
                במקום <span style={{ textDecoration: 'line-through' }}>199₪</span>
              </p>
              <p style={{ fontSize: 15, color: 'rgba(232, 245, 236, 0.6)', marginBottom: 20, fontFamily: 'Assistant, sans-serif' }}>חסכו 588₪ בשנה</p>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, padding: 0, listStyle: 'none' }}>
                {ANNUAL_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5" style={{ fontSize: 15, color: '#E8F5EC', fontFamily: 'Assistant, sans-serif' }}>
                    <Check style={{ color: '#4ADE80', marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCTA('שנתי')}
                className="pricing-cta-solid w-full font-bold rounded-full"
                style={{ backgroundColor: '#4ADE80', color: '#0D1A12', height: 52, fontSize: 16, fontFamily: 'Heebo, sans-serif', border: 'none', cursor: 'pointer' }}
              >
                התחילו עכשיו
              </button>
            </div>
          </div>

          {/* Bottom info */}
          <p style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.5)', marginTop: 40, textAlign: 'center', fontFamily: 'Assistant, sans-serif' }}>
            לשאלות: taactican@gmail.com · 053-620-0593
          </p>
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Link to="/terms" className="pricing-link" style={{ fontSize: 13, color: 'rgba(232, 245, 236, 0.4)', marginLeft: 12, textDecoration: 'none' }}>תקנון</Link>
            <Link to="/cancellation-policy" className="pricing-link" style={{ fontSize: 13, color: 'rgba(232, 245, 236, 0.4)', textDecoration: 'none' }}>מדיניות ביטולים</Link>
          </div>
        </main>

        <SiteFooter />
      </div>

      <LeadForm open={leadFormOpen} onClose={() => setLeadFormOpen(false)} planName={selectedPlan} user={user} />
    </div>
  );
}
