import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Brain, Target, Clock, CheckCircle2, 
  AlertTriangle, TrendingUp, Users, BarChart3, 
  Clipboard, GitMerge, Zap, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' } })
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">

      {/* Sticky Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/95 backdrop-blur border-b border-slate-800' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight">TACTICAN<span className="text-emerald-500">PRO</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/pricing-plans" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
              תמחור
            </Link>
            <Button onClick={handleLogin} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              התחבר / הצטרף
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* bg glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-3xl" />
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
          className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 text-emerald-400 text-sm mb-8">
          <Zap className="w-3.5 h-3.5" />
          מערכת ניהול טקטי לכדורגל
        </motion.div>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="text-4xl md:text-6xl font-black leading-tight mb-6 max-w-3xl">
          אתה מתעד משחקים –<br />
          <span className="text-emerald-400">אבל אתה באמת מתקדם?</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
          className="text-slate-300 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          TacticanPRO הופכת תיעוד, החלטות ותרגילים למערכת עבודה מסודרת עם דדליינים, מעקב אמיתי, ותוצאות נמדדות עד המשחק הבא.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleLogin} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-lg font-bold">
            התחל עכשיו – בחינם
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="mt-16 text-slate-500 text-sm flex flex-col items-center gap-1 animate-bounce">
          <span>גלול למטה</span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </section>

      {/* ─── PROBLEM ─── */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 text-center">הבעיה</p>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
              רוב המאמנים עובדים אינטואיטיבית
            </h2>
            <p className="text-slate-400 text-lg text-center mb-14 max-w-2xl mx-auto">
              מחברת, קובץ אקסל, צ'אט GPT – אבל אין מערכת שמחברת בין בעיה שזוהתה לבין פעולה ממוקדת עם דדליין ומעקב.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: AlertTriangle,
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20',
                title: 'בעיה מזוהה – נשכחת',
                desc: 'ראית שהקבוצה מאבדת כדור מלחץ גבוה? כתבת, שכחת. הבעיה חזרה במשחק הבא.'
              },
              {
                icon: GitMerge,
                color: 'text-orange-400',
                bg: 'bg-orange-500/10 border-orange-500/20',
                title: 'תרגיל לא מדויק',
                desc: 'נתת תרגיל כללי באימון. אבל האם הוא טיפל בדיוק בבעיה שזוהתה? לא ברור.'
              },
              {
                icon: Clock,
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                title: 'אין דדליין, אין מעקב',
                desc: 'אין תאריך יעד. אין שאלה "האם זה השתפר?". כל משחק מתחיל מאפס.'
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className={`rounded-xl border p-6 ${item.bg}`}>
                <item.icon className={`w-7 h-7 ${item.color} mb-4`} />
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOLUTION – 3 STEPS ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 text-center">הפתרון</p>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">שלושה שלבים. תהליך עבודה אמיתי.</h2>
            <p className="text-slate-400 text-center mb-14 max-w-xl mx-auto">לא "עוד כלי" – מערכת שמובילה אותך מבעיה לשיפור מדיד.</p>
          </motion.div>

          <div className="relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-12 right-[16.6%] left-[16.6%] h-0.5 bg-gradient-to-l from-emerald-500/30 via-violet-500/30 to-emerald-500/30" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  icon: Brain,
                  color: 'from-emerald-500 to-emerald-700',
                  title: 'תיעד',
                  desc: 'תעד מצבי משחק, החלטות, אימונים ושחקנים. הכל במקום אחד, עם הקשר ותאריך.'
                },
                {
                  step: '02',
                  icon: BarChart3,
                  color: 'from-violet-500 to-violet-700',
                  title: 'קבל תובנות',
                  desc: 'המערכת מזהה דפוסים חוזרים, ממפה בעיות לפי חומרה ומציעה תרגילים ממוקדים.'
                },
                {
                  step: '03',
                  icon: Target,
                  color: 'from-blue-500 to-blue-700',
                  title: 'עקוב עד המשחק',
                  desc: 'כל המלצה הופכת למשימה עם דדליין ברור לפני המשחק הבא. אתה יודע מה עשית ומה השתפר.'
                }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                  className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <item.icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="text-xs font-bold text-slate-600 mb-2">{item.step}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── REAL EXAMPLE ─── */}
      <section className="py-24 px-6 bg-slate-900/60">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 text-center">דוגמה אמיתית</p>
            <h2 className="text-3xl font-bold text-center mb-14">כך זה נראה בפועל</h2>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 font-bold text-sm">בעיה שזוהתה – 3 פעמים בשלושת המשחקים האחרונים</p>
                <p className="text-red-400/70 text-xs">אובדן כדור תחת לחץ גבוה בשליש האחורי</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Suggestion */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">המלצת מערכת</p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    תרגיל קבוצתי: <span className="text-emerald-400 font-medium">Build-Up Under Pressure 4v4</span> – אימון יציאה מלחץ עם קצב גבוה. 3 סטים × 8 דקות. מיקוד: קבלת החלטות מהירה בשליש האחורי.
                  </p>
                </div>
              </div>

              {/* Success metric */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">מדד הצלחה</p>
                  <p className="text-slate-300 text-sm">פחות מ-2 אובדני כדור תחת לחץ במשחק הבא (לעומת ממוצע 4.5 נוכחי)</p>
                </div>
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-300 font-bold text-sm">דדליין: 4 ימים</p>
                  <p className="text-amber-400/70 text-xs">לפני המשחק מול הפועל חיפה – יום שישי 20:00</p>
                </div>
                <div className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">דחוף</div>
              </div>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center text-slate-500 text-sm mt-6">
            זה לא צ'אט שנותן עצות. זה תהליך עבודה שמוביל לתוצאות.
          </motion.p>
        </div>
      </section>

      {/* ─── DIFFERENTIATORS ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 text-center">למה לא אקסל / מחברת / GPT?</p>
            <h2 className="text-3xl font-bold text-center mb-14">הבדל אחד שמשנה הכל</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Old way */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
              className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
              <p className="text-slate-500 font-bold text-sm mb-5 uppercase tracking-wide">הדרך הישנה</p>
              <div className="space-y-4">
                {['רושם הערות – שוכח להמשיך', 'נותן תרגיל – לא בודק אם עזר', 'כל משחק מתחיל מאפס', 'אין קשר בין ניתוח לאימון לשחקן'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <span className="text-red-400 text-xs">✕</span>
                    </div>
                    <span className="text-slate-400 text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* New way */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6">
              <p className="text-emerald-400 font-bold text-sm mb-5 uppercase tracking-wide">עם TacticanPRO</p>
              <div className="space-y-4">
                {['ניתוח → המלצה → משימה → מעקב', 'תרגיל ממוקד בדיוק לבעיה שזוהתה', 'כל מה שבניית מושך קדימה', 'ניתוח, שחקנים, אימון, טקטיקה – יחד'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 text-xs">✓</span>
                    </div>
                    <span className="text-white text-sm">{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Brain, label: 'ניתוח החלטות' },
              { icon: Users, label: 'תוכניות אישיות לשחקנים' },
              { icon: Target, label: 'מרכז אימונים' },
              { icon: Clipboard, label: 'לוח טקטי' },
              { icon: BarChart3, label: 'השוואת שחקנים' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                <f.icon className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-slate-300">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IT'S FOR ─── */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3 text-center">למי זה מתאים</p>
            <h2 className="text-3xl font-bold text-center mb-14">המאמן הנכון מכיר את עצמו כאן</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🏆',
                title: 'מאמן ליגות נמוכות',
                desc: 'רוצה לעבוד בצורה מקצועית גם בלי מחלקת ניתוח ענפה. TacticanPRO נותנת לך כלים של קבוצות גדולות.'
              },
              {
                emoji: '🚀',
                title: 'מאמן צעיר שרוצה לבלוט',
                desc: 'מנהל תהליך מסודר, מביא מסמכי ניתוח, מתקדם עם שחקנים – זה הדרך להוכיח שאתה שונה.'
              },
              {
                emoji: '🏟️',
                title: 'מועדון שרוצה שפה אחידה',
                desc: 'כשכל המאמנים עובדים על אותה מערכת, הידע לא הולך לאיבוד כשמאמן עוזב.'
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="text-white font-bold text-lg mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING (simple) ─── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">תוכניות</p>
            <h2 className="text-3xl font-bold mb-4">התחל בחינם. שדרג כשאתה מוכן.</h2>
            <p className="text-slate-400 mb-12">כל הפיצ'רים פתוחים בניסיון. ללא כרטיס אשראי.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: 'ניסיון',
                price: 'חינם',
                period: 'לתמיד',
                features: ['קבוצה אחת', 'עד 20 שחקנים', 'ניתוח משחקים', 'לוח טקטי'],
                cta: 'התחל עכשיו',
                highlighted: false
              },
              {
                name: 'מקצועי',
                price: '₪99',
                period: 'לחודש',
                features: ['קבוצות ללא הגבלה', 'שחקנים ללא הגבלה', 'תוכניות אישיות לשחקנים', 'דוחות מתקדמים', 'תמיכה עדיפות'],
                cta: 'התחל ניסיון חינם',
                highlighted: true
              }
            ].map((plan, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className={`rounded-2xl border p-8 text-right ${plan.highlighted ? 'bg-emerald-600/10 border-emerald-500/40' : 'bg-slate-900 border-slate-700'}`}>
                <p className={`font-bold text-sm mb-2 ${plan.highlighted ? 'text-emerald-400' : 'text-slate-400'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500 text-sm">/ {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.highlighted ? 'text-emerald-400' : 'text-slate-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleLogin}
                  className={`w-full ${plan.highlighted ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/6 rounded-full blur-3xl" />
        </div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto relative">
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            השאלה היא לא אם אתה מנתח –<br />
            <span className="text-emerald-400">השאלה היא אם אתה מתקדם.</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            תהליך עבודה מסודר לא דורש מחלקת ניתוח. הוא דורש את הכלי הנכון.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-xl font-bold shadow-lg shadow-emerald-500/20">
            הצטרף עכשיו – ללא עלות
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
        </motion.div>
      </section>

    </div>
  );
}