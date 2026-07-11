import React from 'react';
import { Link } from 'react-router-dom';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';

const SECTIONS = [
  {
    num: 1,
    title: 'כללי',
    body: 'TacticanPro ("המערכת") היא מערכת תובנות וקבלת החלטות למאמני כדורגל, המופעלת על ידי Tactican ("החברה"). השימוש במערכת כפוף לתנאים המפורטים להלן. רישום ושימוש במערכת מהווים הסכמה לתנאים אלו.',
  },
  {
    num: 2,
    title: 'השירות',
    body: 'המערכת מספקת כלים לניתוח משחקים, מעקב אחר שחקנים, תכנון אימונים והכנה למשחקים. המערכת מבוססת על מידע שהמאמן מזין ואינה מחליפה שיקול דעת מקצועי.',
  },
  {
    num: 3,
    title: 'הרשמה וחשבון',
    body: 'המשתמש אחראי לשמור על פרטי הגישה שלו ולא להעבירם לאחרים. כל פעילות תחת החשבון היא באחריות בעל החשבון.',
  },
  {
    num: 4,
    title: 'תשלום ומנויים',
    body: 'המערכת מציעה שני מסלולים:\n- מנוי חודשי: 199₪ לחודש, מתחדש אוטומטית, ניתן לביטול בכל עת.\n- מנוי שנתי: 150₪ לחודש, התחייבות ל-12 חודשים. ניתן להודיע על ביטול בכל עת, אך החיוב ימשיך עד תום ההתחייבות. ללא הודעת ביטול, המנוי מתחדש אוטומטית.\nכל המחירים כוללים מע״ם. החברה רשאית לעדכן מחירים עם הודעה מראש של 30 יום.',
  },
  {
    num: 5,
    title: 'ביטולים והחזרים',
    body: 'ראו מדיניות ביטולים והחזרים בדף המיועד לכך.',
  },
  {
    num: 6,
    title: 'קניין רוחני',
    body: 'כל התכנים, העיצוב, הקוד והאלגוריתמים במערכת שייכים ל-TacticanPro. המשתמש רשאי להשתמש במערכת לצרכיו בלבד ולא להעתיק, לשכפל או להפיץ חלקים ממנה.',
  },
  {
    num: 7,
    title: 'מידע ופרטיות',
    body: 'המערכת שומרת מידע שהמשתמש מזין (נתוני שחקנים, משחקים, אימונים). מידע זה שייך למשתמש ולא יועבר לצדדים שלישיים ללא הסכמתו, למעט כנדרש בחוק.',
  },
  {
    num: 8,
    title: 'תוכן אסור',
    body: 'אסור להשתמש במערכת לכל מטרה בלתי חוקית. המערכת אינה קשורה בשום צורה להימורים, פורנוגרפיה, או כל פעילות בלתי חוקית אחרת.',
    highlighted: true,
  },
  {
    num: 9,
    title: 'הגבלת אחריות',
    body: 'המערכת מסופקת "כמות שהיא" (as is). החברה אינה אחראית לנזק שנגרם כתוצאה משימוש במערכת או מהסתמכות על התובנות שלה. המערכת היא כלי עזר — לא תחליף לשיקול דעת מקצועי של המאמן.',
  },
  {
    num: 10,
    title: 'שינויים בתקנון',
    body: 'החברה רשאית לעדכן תקנון זה. שינויים מהותיים יפורסמו למשתמשים עם הודעה מראש.',
  },
  {
    num: 11,
    title: 'יצירת קשר',
    body: 'לכל שאלה או בירור: taactican@gmail.com | 053-620-0593',
  },
];

export default function Terms() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F0', fontFamily: 'Assistant, sans-serif' }}>
      <InfoPageHeader />

      <main className="flex-1 px-6 py-16">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 36, color: '#0D1A12', marginBottom: 4 }}>
            תקנון שימוש — TacticanPro
          </h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 16 }}>עדכון אחרון: יולי 2026</p>
          <div style={{ width: 48, height: 2, backgroundColor: '#4ADE80', marginBottom: 32 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {SECTIONS.map(s => (
              <section key={s.num}>
                <h2 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 700, fontSize: 20, color: '#0D1A12', marginBottom: 8 }}>
                  {s.num}. {s.title}
                </h2>
                {s.highlighted ? (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    borderRight: '3px solid #4ADE80',
                    padding: '16px 20px',
                  }}>
                    <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', whiteSpace: 'pre-line', margin: 0 }}>
                      {s.body}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: 17, lineHeight: 1.7, color: '#1F2937', whiteSpace: 'pre-line', margin: 0 }}>
                    {s.body}
                  </p>
                )}
              </section>
            ))}
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