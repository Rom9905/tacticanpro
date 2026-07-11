import React from 'react';
import { Link } from 'react-router-dom';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';

export default function AccessibilityStatement() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F0', fontFamily: 'Assistant, sans-serif' }}>
      <InfoPageHeader />

      <main className="flex-1 px-6 py-16">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 36, color: '#0D1A12', marginBottom: 4 }}>
            הצהרת נגישות — TacticanPro
          </h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 16 }}>עדכון אחרון: יולי 2026</p>
          <div style={{ width: 48, height: 2, backgroundColor: '#4ADE80', marginBottom: 32 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <section>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', margin: 0 }}>
                TacticanPro מחויבת להנגשת האתר והשירותים שלה לכלל המשתמשים, כולל אנשים עם מוגבלויות. אנו משקיעים מאמצים רבים בהנגשת המערכת בהתאם לתקנות הנגישות ולתקן WCAG 2.2.
              </p>
            </section>

            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 12 }}>
                1. צעדי הנגשה שיושמו
              </h2>
              <ul style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>• ווידג'ט נגישות (Sienna) המאפשר התאמות תצוגה, ניגודיות, הגדלת טקסט ועוד.</li>
                <li>• תמיכה בניווט במקלדת.</li>
                <li>• מבנה סמנטי תקין ותוויות נגישות לרכיבים אינטראקטיביים.</li>
                <li>• שפה וכיווניות RTL מוגדרים נכון.</li>
                <li>• ניגודיות צבעים מותאמת לקריאות.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 12 }}>
                2. פניות בנושא נגישות
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', marginBottom: 8, margin: '0 0 8px 0' }}>
                אם נתקלתם בבעיית נגישות או שיש לכם בקשה להתאמה, נשמח לעזור:
              </p>
              <ul style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
                <li>• אימייל: taactican@gmail.com</li>
                <li>• טלפון: 053-620-0593</li>
              </ul>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', marginTop: 8, margin: '8px 0 0 0' }}>
                נשתדל לטפל בכל פנייה בהקדם האפשרי.
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}