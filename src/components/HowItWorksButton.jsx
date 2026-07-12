import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function HowItWorksButton({ page }) {
  const [open, setOpen] = useState(false);

  const content = {
    TeamManagement: {
      title: 'ניהול קבוצה',
      steps: [
        { icon: '👥', title: 'צור קבוצה', desc: 'לחץ על "קבוצה חדשה" ומלא את שם הקבוצה, קבוצת גיל, מערך ועוד.' },
        { icon: '🏃', title: 'הוסף שחקנים', desc: 'עבור ללשונית "סגל" ולחץ "הוסף שחקן". מלא שם, עמדה, כישורים וחוזקות.' },
        { icon: '📋', title: 'בנה הרכב', desc: 'עבור ללשונית "הרכב" וסמן 11 שחקנים פותחים. גרור שחקנים על המגרש.' },
        { icon: '📊', title: 'השוואת שחקנים', desc: 'בלשונית "השוואה" תוכל להשוות בין שחקנים לפי כישורים ולקבל המלצות הרכב.' },
      ]
    },
    MatchAnalysis: {
      title: 'ניתוח משחקים',
      steps: [
        { icon: '➕', title: 'התחל ניתוח חדש', desc: 'לחץ "ניתוח חדש" ובחר מסלול: סטטיסטיקה, וידאו, או מחברת חופשית.' },
        { icon: '📊', title: 'מסלול סטטיסטיקה', desc: 'הזן נתוני משחק (בעיטות, שליטה, מסירות) – המערכת מפיקה ניתוח מפורט.' },
        { icon: '🎥', title: 'מסלול וידאו', desc: 'תעד רגעים חשובים בזמן צפייה בסרט, תייג מצבים ומחרוזות.' },
        { icon: '✍️', title: 'מחברת חופשית', desc: 'כתוב הערות חופשיות, ציין שחקנים בולטים ותאר מה קרה בשטח.' },
        { icon: '📅', title: 'סיכום שבועי', desc: 'ראה סיכום מצטבר של כל המשחקים ומגמות לאוך זמן.' },
      ]
    },
    TrainingCenter: {
      title: 'חדר בקרה שבועי',
      steps: [
        { icon: '🔄', title: 'מידע ממקורות', desc: 'המערכת אוספת אוטומטית המלצות אימון מניתוח משחקים, תוכניות אישיות וניתוח החלטות.' },
        { icon: '📌', title: 'תקציר מנהלים', desc: 'בחלק העליון תוכל לראות 3 הבעיות המרכזיות, נושאים לשימור, ופוקוס השבוע.' },
        { icon: '🔍', title: 'סנן תרגילים', desc: 'השתמש בפילטרים לסנן לפי מקור, שחקן ספציפי, או עדיפות.' },
        { icon: '📖', title: 'פרטי תרגיל', desc: 'לחץ "פרטים" על כל תרגיל לקבל הוראות מפורטות, מדדי הצלחה, וסימני אזהרה.' },
        { icon: '💬', title: 'שאל שאלות', desc: 'בתוך פרטי התרגיל ניתן לשאול שאלות בזמן אמת על הביצוע.' },
      ]
    },
    DecisionAnalysis: {
      title: 'ניתוח קבלת החלטות',
      steps: [
        { icon: '🏷️', title: 'הגדר מצבי משחק', desc: 'עבור ל"הגדרת מצבי משחק" וצור עד 10 מצבים חוזרים כמו "בניה תחת לחץ" או "מעבר הגנתי".' },
        { icon: '📝', title: 'תעד אחרי משחקים', desc: 'לחץ "תעד מצב משחק" (או הכפתור הצף), בחר מצב, שחקנים, התנהגות ותוצאה.' },
        { icon: '📈', title: 'צפה בניתוח', desc: 'בלשונית "סקירת ביצועי משחק" ראה סטטיסטיקות, טעויות חוזרות וגרף מגמה.' },
        { icon: '🔁', title: 'זהה דפוסים', desc: 'אחרי 5+ תיעודים, הלשונית "דפוסים חוזרים" מציגה תבניות שחזרו על עצמן.' },
        { icon: '🎯', title: 'צור אימון מהתובנה', desc: 'מדפוסים בעייתיים תוכל ב-1 לחיצה להעביר לתוכנית אימון ב"תוכנית פעולה".' },
      ]
    },
    TacticalBoard: {
      title: 'לוח טקטי',
      steps: [
        { icon: '🗂️', title: 'בחר תבנית', desc: 'בחר תבנית קיימת (מערך, תרגיל, מצב קבוע) או פתח לוח ריק.' },
        { icon: '⚽', title: 'הזז שחקנים', desc: 'גרור שחקנים על המגרש. לחץ על שחקן לשנות שם, מספר ואחריות.' },
        { icon: '✏️', title: 'צייר חיצים', desc: 'השתמש בכלי ציור להוסיף חיצים, עיגולים ואזורי חום להמחשת תנועה.' },
        { icon: '🎬', title: 'הוסף פריימים', desc: 'צור מספר פריימים כדי לאנימציה שינויי עמדות בסדרת תנועה.' },
        { icon: '💾', title: 'שמור ושתף', desc: 'שמור את הלוח בשם, קשר אותו לניתוח משחק, או ייצא לאימון.' },
      ]
    },
  };

  const pageContent = content[page];
  if (!pageContent) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
        style={{ color: 'var(--brand-green-dark)', borderColor: 'rgba(22,163,74,0.30)' }}
      >
        <HelpCircle className="w-4 h-4 ml-2" />
        איך זה עובד?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-500" style={{ color: 'var(--brand-green)' }} />
              איך עובד {pageContent.title}?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {pageContent.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full" style={{ color: 'var(--brand-green-dark)', backgroundColor: 'var(--success-bg)' }}>
                      שלב {i + 1}
                    </span>
                    <h4 className="font-semibold text-white text-sm">{step.title}</h4>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <Button onClick={() => setOpen(false)} className="bg-emerald-600 hover:bg-emerald-700" style={{ backgroundColor: 'var(--brand-green)', color: 'var(--brand-dark)' }}>
              הבנתי, בואו נתחיל
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}