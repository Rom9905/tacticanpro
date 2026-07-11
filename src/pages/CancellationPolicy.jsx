import React from 'react';
import { Link } from 'react-router-dom';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';

function HighlightedBox({ children }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderRight: '3px solid #4ADE80',
      padding: '16px 20px',
      marginTop: 8,
    }}>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', margin: 0, fontWeight: 600 }}>
        {children}
      </p>
    </div>
  );
}

export default function CancellationPolicy() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F0', fontFamily: 'Assistant, sans-serif' }}>
      <InfoPageHeader />

      <main className="flex-1 px-6 py-16">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 36, color: '#0D1A12', marginBottom: 4 }}>
            מדיניות ביטולים והחזרים — TacticanPro
          </h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 16 }}>עדכון אחרון: יולי 2026</p>
          <div style={{ width: 48, height: 2, backgroundColor: '#4ADE80', marginBottom: 32 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Monthly */}
            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 12 }}>
                1. מנוי חודשי (199₪/חודש)
              </h2>
              <ul style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>• המנוי מתחדש אוטומטית בתחילת כל חודש.</li>
                <li>• ניתן לבטל בכל עת — כולל ביום הרכישה.</li>
                <li>• לאחר ביטול, המנוי יישאר פעיל עד סוף תקופת החיוב הנוכחית ולא יתחדש.</li>
              </ul>
              <HighlightedBox>לא יינתן החזר כספי על חודש שכבר חויב.</HighlightedBox>
            </section>

            {/* Annual */}
            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 12 }}>
                2. מנוי שנתי (150₪/חודש, התחייבות ל-12 חודשים)
              </h2>
              <ul style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>• המנוי כולל התחייבות ל-12 חודשים. התשלום נגבה מדי חודש (150₪).</li>
                <li>• ניתן להודיע על ביטול בכל עת, אך החיוב החודשי ימשיך עד תום תקופת ההתחייבות (12 חודשים מיום ההרשמה). המערכת תישאר פתוחה לשימוש עד סוף התקופה.</li>
                <li>• ללא הודעת ביטול — המנוי מתחדש אוטומטית ל-12 חודשים נוספים.</li>
              </ul>
              <HighlightedBox>לא יינתן החזר כספי על חודשים שכבר חויבו.</HighlightedBox>
            </section>

            {/* How to cancel */}
            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 12 }}>
                3. איך מבטלים?
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', marginBottom: 8, margin: '0 0 8px 0' }}>
                ביטול מתבצע דרך הגדרות החשבון במערכת, או בפנייה ישירה אלינו:
              </p>
              <ul style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>• אימייל: taactican@gmail.com</li>
                <li>• טלפון: 053-620-0593</li>
              </ul>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', marginTop: 8, margin: '8px 0 0 0' }}>
                הביטול ייכנס לתוקף תוך יום עסקים אחד מרגע הפנייה.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 8 }}>
                4. שינויים במדיניות
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', margin: 0 }}>
                החברה רשאית לעדכן מדיניות זו. שינויים יפורסמו באתר.
              </p>
            </section>
          </div>

          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
            <Link to="/pricing-plans" style={{
              fontSize: 15,
              fontWeight: 500,
              color: '#22C55E',
              textDecoration: 'none',
              padding: '10px 24px',
              borderRadius: 9999,
              border: '1.5px solid #22C55E',
              fontFamily: 'Heebo, sans-serif',
            }}>
              ← חזרה
            </Link>
          </div>
          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
            לשאלות: taactican@gmail.com · 053-620-0593
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}