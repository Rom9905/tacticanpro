import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Brain, 
  Target, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  ArrowLeft,
  Lightbulb,
  Clock,
  BarChart3
} from 'lucide-react';

export default function DecisionInstructionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('DecisionAnalysis')}>
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה לניתוח החלטות
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">מערכת ניתוח קבלת החלטות</h1>
              <p className="text-slate-400 mt-1">מדריך מלא לשימוש במערכת</p>
            </div>
          </div>
        </div>

        {/* What is this */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <Lightbulb className="w-6 h-6 text-emerald-500" />
              מה זה?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p className="leading-relaxed">
              הכלי עוזר לך <strong className="text-white">להבין איך שחקנים מקבלים החלטות</strong> במצבי משחק אמיתיים,
              על בסיס <strong className="text-emerald-400">תיעוד קבוצתי קצר</strong> שלוקח 3-5 דקות אחרי כל משחק.
            </p>
            <p className="leading-relaxed">
              במקום לעקוב אחרי כל שחקן בנפרד, את/ה מתעד/ת <strong className="text-white">מצבים קבוצתיים</strong>,
              והמערכת <strong className="text-violet-400">יוצרת אוטומטית</strong> פרופיל החלטות לכל שחקן.
            </p>
          </CardContent>
        </Card>

        {/* How to use */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <Target className="w-6 h-6 text-emerald-500" />
              איך משתמשים? (3 שלבים)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">הגדר מצבי משחק לקבוצה</h3>
                <p className="text-slate-400 mb-3">
                  פעם אחת (או עדכון מדי כמה חודשים), תגדיר את מצבי המשחק החשובים לקבוצה שלך.
                </p>
                <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-slate-300">דוגמאות למצבי משחק:</p>
                  <ul className="text-sm text-slate-400 space-y-1 mr-4">
                    <li>• יציאה מלחץ בשליש ראשון</li>
                    <li>• איבוד כדור → 5 שניות ראשונות</li>
                    <li>• קבלת כדור בין הקווים</li>
                    <li>• משחק אגפים</li>
                    <li>• מעבר מהגנה להתקפה</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">תעד משחקים בקצרה</h3>
                <p className="text-slate-400 mb-3">
                  אחרי כל משחק, תיכנס לטאב "תיעוד משחק" ותעבור על המצבים שהתרחשו.
                </p>
                <div className="bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-white">זמן תפעול: 3-5 דקות</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">לכל מצב שקרה במשחק תסמן:</p>
                  <ul className="text-sm text-slate-400 space-y-1 mr-4">
                    <li>• מי מהשחקנים היה מעורב (multi-select)</li>
                    <li>• התנהגות כללית (שמרני / מאוזן / אגרסיבי)</li>
                    <li>• תוצאה (מוצלח / ניטרלי / בעייתי)</li>
                    <li>• הערה קצרה (אופציונלי)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">צפה בפרופילי החלטות של שחקנים</h3>
                <p className="text-slate-400 mb-3">
                  המערכת תייצר אוטומטית פרופיל החלטות לכל שחקן. תוכל לראות את זה בפרופיל השחקן.
                </p>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
                  <p className="text-sm text-violet-300">
                    <strong>שים לב:</strong> הפרופיל יהיה זמין רק אחרי 3+ משחקים מתועדים,
                    כדי להבטיח אמינות של הנתונים.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What you DON'T need to do */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-red-500" />
              מה אתה לא צריך לעשות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-sm">✗</span>
                </div>
                <p className="text-slate-300">לא צריך לתעד כל שחקן בנפרד - הכל קבוצתי</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-sm">✗</span>
                </div>
                <p className="text-slate-300">לא צריך להזין סטטיסטיקות - רק תצפיות איכותיות</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-sm">✗</span>
                </div>
                <p className="text-slate-300">לא צריך לכתוב דוחות ארוכים - הערות קצרות מספיקות</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-sm">✗</span>
                </div>
                <p className="text-slate-300">לא צריך ליצור את הפרופילים ידנית - הכל אוטומטי</p>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* What you get */}
        <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-700/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              מה את/ה מקבל/ת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">הבנה התנהגותית של שחקנים</p>
                  <p className="text-sm text-slate-400 mt-1">
                    תדע בדיוק איך כל שחקן מגיב במצבי לחץ, מה רמת הסיכון שלו, ומה הפעולות המועדפות שלו
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">זיהוי חריגים מהקבוצה</p>
                  <p className="text-sm text-slate-400 mt-1">
                    המערכת תזהה אוטומטית שחקנים שמתנהגים בצורה שונה מהקבוצה - לטוב או לרע
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">בסיס לקבלת החלטות</p>
                  <p className="text-sm text-slate-400 mt-1">
                    תקבל נתונים להחליט מי משחק באיזה מערך, מה לאמן, ואיך לשפר
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-violet-500" />
              טיפים למימוש מוצלח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                <strong className="text-white">תעד באופן עקבי:</strong> ככל שתתעד יותר משחקים,
                הפרופילים יהיו מדויקים יותר. אחרי 5-6 משחקים תתחיל לראות דפוסים ברורים.
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                <strong className="text-white">הגדר מצבים רלוונטיים:</strong> בחר מצבים שבאמת חוזרים על עצמם
                במשחקים שלך, לא מצבים תיאורטיים.
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                <strong className="text-white">תסתכל על החריגים:</strong> הטאב "חריגים קבוצתיים" יעזור לך
                לזהות שחקנים שיכולים להיות מפתח או בעיה במערכת.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <Link to={createPageUrl('DecisionAnalysis')}>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <TrendingUp className="w-5 h-5 ml-2" />
              בוא נתחיל
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}