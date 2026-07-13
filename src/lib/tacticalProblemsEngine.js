/**
 * Rules-based tactical problems engine.
 * Analyzes match data and generates structured tactical problems
 * mapped to the 9 heatmap categories. No AI/LLM calls.
 *
 * Each problem includes: category (heatmap bucket), phase (game phase),
 * severity, text (what happened + why), root_cause, and training_action.
 */

const CATEGORIES = {
  BUILD_UP: 'בנייה מאחור',
  DEF_TRANSITION: 'מעבר הגנתי',
  ATK_TRANSITION: 'מעבר התקפי',
  PRESSING: 'לחץ',
  FINAL_THIRD: 'שליש אחרון',
  SET_PIECES: 'כדור קבוע',
  COUNTER: 'קונטרה',
  BALL_LOSS: 'אובדן כדור',
  GAME_MGMT: 'ניהול משחק',
};

function generateTacticalProblems(analysis) {
  const problems = [];
  const stats = analysis.stats || {};
  const result = analysis.result || {};
  const ratings = analysis.player_ratings || [];
  const phases = analysis.phase_analysis || {};
  const report = analysis.report || {};
  const notes = analysis.free_notes || '';
  const opponent = analysis.opponent || 'היריבה';

  const scored = result.our_score ?? 0;
  const conceded = result.opponent_score ?? 0;
  const isLoss = conceded > scored;
  const isDraw = conceded === scored;
  const allText = [notes, ...(report.positives || []), ...(report.issues || [])].join(' ');

  const push = (category, phase, severity, text, root_cause, training_action) => {
    problems.push({ category, phase, severity, text, root_cause, training_action });
  };

  // ═══════════════════════════════════════════
  // בנייה מאחור — buildup from back
  // ═══════════════════════════════════════════

  if (stats.possession != null && stats.possession < 42) {
    push(
      CATEGORIES.BUILD_UP, 'buildup', 'high',
      `הקבוצה החזיקה רק ${stats.possession}% חזקה מול ${opponent} — הבנייה מאחור התפרקה תחת לחץ היריבה, הכדור הועבר ישיר קדימה במקום בסבלנות, והקבוצה ויתרה על שליטה בקצב המשחק.`,
      `חוסר אופציות קבלה לבלמים ולאנקר תחת לחץ גבוה. השחקנים לא יורדים לקבל כדור, והמרכז נשאר ריק.`,
      `תרגול rondos 6v2 ו-8v4 עם דגש על יציאה מלחץ דרך מסירות קצרות ותנועת תמיכה של קשרים.`
    );
  }

  if (stats.pass_accuracy != null && stats.pass_accuracy < 78) {
    push(
      CATEGORIES.BUILD_UP, 'buildup', 'high',
      `דיוק מסירות של ${stats.pass_accuracy}% בלבד מול ${opponent} — כמעט מסירה מכל חמש הולכת ליריבה. הבנייה מתפרקת כבר בשליש הראשון, מה שמשאיר את ההגנה חשופה לקאונטרים חוזרים.`,
      `קבלת החלטות איטית בלחץ: השחקנים מחזיקים יותר מדי ומוסרים באיחור, או מנסים מסירות מורכבות כשיש אופציה פשוטה.`,
      `תרגול בנייה מאחור 4+GK נגד 3 לוחצים. דגש על מסירה בנגיעה אחת ותנועה אחרי מסירה.`
    );
  } else if (stats.pass_accuracy != null && stats.pass_accuracy < 82) {
    push(
      CATEGORIES.BUILD_UP, 'buildup', 'low',
      `דיוק מסירות ${stats.pass_accuracy}% מול ${opponent} — סביר אך לא מספיק עבור קבוצה ששואפת לשלוט. כל אחוז שחסר הוא עוד החלפת חזקה שנותנת ליריבה הזדמנות להתקיף.`,
      `חוסר עקביות בבחירת המסירה — בחלק מהמקרים מנסים פתרון יצירתי כשפשוט עדיף.`,
      `משחקוני חזקה (possession games) עם מגבלת נגיעות — שתי נגיעות בשליש ראשון, חופשי קדימה.`
    );
  }

  if (stats.possession != null && stats.possession > 62 && scored <= 1) {
    push(
      CATEGORIES.BUILD_UP, 'buildup', 'medium',
      `${stats.possession}% חזקה מול ${opponent} אבל רק ${scored} ${scored === 1 ? 'גול' : 'גולים'} — חזקה סטרילית. הכדור מסתובב רוחבית בשליש האמצעי בלי לחדור קדימה. ${opponent} ויתרו על הכדור בכוונה וחיכו במבנה נמוך.`,
      `חוסר תנועה אנכית של קשרים ומגנים: אף אחד לא פורץ קו ומשנה את הזווית. העברות רוחביות לא מפרקות בלוק נמוך.`,
      `תרגול חדירה לבלוק נמוך: 7v7+2 חצי מגרש, חובה לשחק קדימה תוך 6 שניות או שהחזקה עוברת.`
    );
  }

  // ═══════════════════════════════════════════
  // אובדן כדור — ball loss
  // ═══════════════════════════════════════════

  if (stats.turnovers != null && stats.turnovers >= 15) {
    push(
      CATEGORIES.BALL_LOSS, 'transitions', 'high',
      `${stats.turnovers} איבודי כדור מול ${opponent} — כל איבוד הוא הזמנה לקאונטר. ${stats.turnovers} זה מספר שמעיד על בעיה מערכתית: השחקנים מנסים מסירות מסוכנות תחת לחץ במקום לשמור על הכדור.`,
      `קבלת החלטות לקויה ברגעי לחץ — ניסיון לכדור ארוך או מסירה חודרנית כשיש אופציה בטוחה לשמירת חזקה.`,
      `תרגול שמירת כדור 5v5+2 ג׳וקרים עם מגבלת זמן: 10 מסירות רצופות = נקודה. איבוד = ריצת עונשין.`
    );
  } else if (stats.turnovers != null && stats.turnovers >= 11) {
    push(
      CATEGORIES.BALL_LOSS, 'transitions', 'medium',
      `${stats.turnovers} איבודי כדור מול ${opponent} — רמה שדורשת תשומת לב. צריך לזהות באיזה אזור המגרש רוב האיבודים קורים ולהבין אם זה בגלל לחץ של ${opponent} או בחירות שגויות.`,
      `ייתכן שהאיבודים מרוכזים באזור ספציפי — לדוגמה בשליש אמצעי, שם הלחץ הכי גבוה.`,
      `ניתוח וידאו של 5 איבודים עיקריים + תרגול מצבי לחץ ממוקדים באזור הבעייתי.`
    );
  }

  // ═══════════════════════════════════════════
  // שליש אחרון — final third
  // ═══════════════════════════════════════════

  if (stats.xg != null && stats.xg < 0.8) {
    push(
      CATEGORIES.FINAL_THIRD, 'organized_attack', 'high',
      `xG של ${stats.xg} בלבד מול ${opponent} — הקבוצה כמעט לא הצליחה ליצור מצבים מסוכנים ברחבה. הבעיטות שהיו הגיעו ממרחק או מזוויות סגורות, בלי חדירה אמיתית לאזורים מסוכנים.`,
      `חוסר ריצות עומק וחפיפות בשליש האחרון. הכנפיים לא חותכים פנימה, החלוץ לא יורד לקבל, ואין מי שפורץ את הקו האחרון.`,
      `תרגול 4v3 בשליש אחרון עם דגש על תזמון ריצות עומק מאחורי הקו. חובה לסיים בבעיטה תוך 8 שניות.`
    );
  }

  if (stats.shots > 0 && stats.xg != null && stats.shots >= 8 && stats.xg / stats.shots < 0.1) {
    push(
      CATEGORIES.FINAL_THIRD, 'organized_attack', 'medium',
      `${stats.shots} בעיטות עם xG ממוצע של ${(stats.xg / stats.shots).toFixed(2)} לבעיטה מול ${opponent} — הבעיטות הגיעו ממרחק גדול או מזוויות בלתי אפשריות. הקבוצה בועטת מתסכול במקום ליצור מצב נקי ברחבה.`,
      `חוסר סבלנות בשליש האחרון — השחקנים מעדיפים לבעוט במקום לחפש מסירה אחת נוספת שתפתח זווית טובה יותר.`,
      `תרגול סיומים עם חובת מסירה אחת לפחות ברחבה לפני בעיטה. משחקון 6v4 ברחבה מורחבת.`
    );
  }

  if (stats.shots > 0 && stats.shots_on_target != null) {
    const onTargetPct = (stats.shots_on_target / stats.shots) * 100;
    if (onTargetPct < 30 && stats.shots >= 8) {
      push(
        CATEGORIES.FINAL_THIRD, 'organized_attack', 'medium',
        `רק ${stats.shots_on_target} מתוך ${stats.shots} בעיטות למסגרת (${onTargetPct.toFixed(0)}%) מול ${opponent} — יותר מ-70% מהבעיטות לא איימו על השער. הבעיטות מגיעות תחת לחץ, מזוויות צרות, או ממרחק גדול מדי.`,
        `השחקנים לא מייצרים מספיק מרחב לפני הבעיטה — חסרה תנועה של שחקנים סמוכים שתמשוך מגנים ותפתח זווית.`,
        `תרגול סיומים ממצבים ריאליסטיים: 2v1 ו-3v2 ברחבה עם שוער. דגש על מיקום גוף וזווית לפני הבעיטה.`
      );
    }
  }

  if (stats.xg != null && stats.xg >= 2.0 && scored === 0) {
    push(
      CATEGORIES.FINAL_THIRD, 'organized_attack', 'high',
      `xG של ${stats.xg} בלי אף גול מול ${opponent} — בעיית גמירה חריפה. הקבוצה יצרה מספיק הזדמנויות אבל לא ניצלה אף אחת. זה לא עניין של מזל — זה חוסר קור רוח ותרגול ברגע ההכרעה.`,
      `לחץ פסיכולוגי ברגע הסיום, חוסר תרגול מספיק של מצבי 1v1 מול שוער, ובחירה שגויה של סוג הבעיטה.`,
      `תרגול סיומים אינטנסיבי: 50 בעיטות ממצבים שונים לכל שחקן התקפי. דגש על 1v1 עם שוער ומצבי ריבאונד.`
    );
  }

  // ═══════════════════════════════════════════
  // כדור קבוע — set pieces
  // ═══════════════════════════════════════════

  if (scored > 0) {
    const setPieceMentions = (allText.match(/קורנר|סט[- ]?פיס|בעיטה חופשית|נגיח/g) || []).length;
    if (setPieceMentions >= 2 && stats.xg != null && stats.xg < 1.5) {
      push(
        CATEGORIES.SET_PIECES, 'set_pieces', 'medium',
        `רוב הסכנה ההתקפית מול ${opponent} הגיעה מכדורים קבועים (קורנרים ובעיטות חופשיות), בעוד ה-xG ממשחק פתוח עמד על ${stats.xg} בלבד. תלות מוגזמת בסט-פיסים מסוכנת — ביום שהם לא נכנסים, אין חלופה.`,
        `ההתקפה ממשחק פתוח לא מייצרת מספיק סכנה, ולכן הקבוצה תלויה בקורנרים ובעיטות חופשיות כמקור הגולים העיקרי.`,
        `תרגול פריצה ממשחק פתוח: 8v8 חצי מגרש, הגול מקורנר/חתך לא נספר. חובה לכבוש ממשחק חי.`
      );
    }
  }

  if (conceded > 0 && /ספג.*(קורנר|חופשית|נגיח|הגבה|הורם|קבוע)|(קורנר|חופשית|נגיח|הגבה|הורם|קבוע).*ספג/.test(allText)) {
    push(
      CATEGORIES.SET_PIECES, 'set_pieces', 'high',
      `ספגנו מכדור קבוע מול ${opponent} — בעיה בארגון ההגנתי במצבים נייחים. סימון אישי לא הצליח, או שהחומה/אזור לא כיסו את האיום.`,
      `חוסר תקשורת בסימון, או שחקנים שלא אחראיים על האזור הנכון. ייתכן גם בעיית גובה או עיתוי קפיצה.`,
      `תרגול הגנה בקורנרים: 5 סטים של הגנה אישית + אזורית. כל שחקן יודע בדיוק את האיש/האזור שלו.`
    );
  }

  // ═══════════════════════════════════════════
  // מעבר הגנתי — defensive transition
  // ═══════════════════════════════════════════

  if (conceded > 0 && stats.tackles != null && stats.interceptions != null) {
    const defActions = stats.tackles + stats.interceptions;
    if (defActions < 15) {
      push(
        CATEGORIES.DEF_TRANSITION, 'transitions', 'medium',
        `רק ${defActions} פעולות הגנתיות (${stats.tackles} חטיפות, ${stats.interceptions} יירוטים) מול ${opponent} שספגנו ממנו ${conceded} ${conceded === 1 ? 'שער' : 'שערים'}. ההגנה פסיבית מדי ברגע איבוד הכדור — ממתינה ליריבה במקום ללחוץ ולחטוף מיד.`,
        `חוסר תגובה מיידית לאיבוד כדור — השחקנים לא לוחצים ב-5 השניות הראשונות אחרי האיבוד, ונותנים ליריבה זמן להרים את הראש.`,
        `תרגול מעברים הגנתיים: 4v4+4 עם כלל "5 שניות" — חובה לגעת בכדור תוך 5 שניות מאיבוד או שהתוקפים מקבלים נקודה.`
      );
    }
  }

  if (stats.critical_errors != null && stats.critical_errors > 0) {
    push(
      CATEGORIES.DEF_TRANSITION, 'transitions', 'high',
      `${stats.critical_errors} שגיאות קריטיות מול ${opponent} שהובילו למצבי סכנה ישירים. ${stats.critical_errors > 1 ? `${stats.critical_errors} שגיאות מצביעות על בעיה מערכתית בתקשורת בין הבלמים ובמעבר מהתקפה להגנה.` : 'שגיאה בודדת, אבל צריך לנתח האם היא תוצאה של לחץ יריבה מובנה או חוסר ריכוז רגעי.'}`,
      `תקשורת לקויה בקו ההגנה ברגע המעבר, או שחקן שלא חזר למיקום בזמן אחרי שהכדור אבד.`,
      `תרגול מצבי מעבר 6v4: הצד המגן מתחיל בהתקפה, מאבד כדור, וצריך להתארגן תוך 3 שניות. דגש על תקשורת מילולית.`
    );
  }

  // ═══════════════════════════════════════════
  // מעבר התקפי — attacking transition
  // ═══════════════════════════════════════════

  if (stats.offsides != null && stats.offsides >= 4) {
    push(
      CATEGORIES.ATK_TRANSITION, 'transitions', 'low',
      `${stats.offsides} נבדלים מול ${opponent} — חוסר סנכרון בין הריצה קדימה לרגע המסירה. ריצות עומק חיוניות, אבל ${stats.offsides} נבדלים מעידים שהתזמון בין המוסר לרץ לא מתואם.`,
      `השחקנים ההתקפיים יוצאים מוקדם מדי, או שהמוסר מאחר ברגע ההחלטה. חוסר קשר עין בין השניים.`,
      `תרגול תזמון ריצות: 3v2 עם קו נבדלים נע. המוסר חייב לשחרר ברגע שהרץ פורץ — לא לפני, לא אחרי.`
    );
  }

  if (isLoss && stats.possession != null && stats.possession > 55) {
    push(
      CATEGORIES.ATK_TRANSITION, 'transitions', 'high',
      `הפסד ${scored}-${conceded} למרות ${stats.possession}% חזקה מול ${opponent} — הקבוצה שלטה בכדור אבל לא הצליחה להפוך שליטה להתקפות מסוכנות. ${opponent} ויתרו על הכדור בכוונה וחיכו לרגע הנכון לקאונטר.`,
      `המעבר מחזקה להתקפה חדה לא מתרחש — הקבוצה ממשיכה לשחק באותו קצב גם כשנפתח חלל, במקום להאיץ ברגע שיש הזדמנות.`,
      `תרגול מעברים מהירים: משחקון עם "טריגר" — ברגע שהכדור נחטף, חובה לסיים מהתקפה תוך 8 שניות.`
    );
  }

  // ═══════════════════════════════════════════
  // לחץ — pressing
  // ═══════════════════════════════════════════

  if (stats.possession != null && stats.possession < 42 && stats.turnovers != null && stats.turnovers < 10) {
    push(
      CATEGORIES.PRESSING, 'organized_defense', 'medium',
      `${stats.possession}% חזקה ורק ${stats.turnovers || 0} כדורים שנחטפו מ${opponent} — הלחץ לא היה אפקטיבי. ${opponent} בנו בנוחות בלי שהופעל עליהם לחץ אמיתי שגרם לאיבודים.`,
      `הלחץ לא מתואם — שחקן אחד לוחץ אבל השאר לא סוגרים קווי מסירה, מה שמאפשר ליריבה לצאת בקלות.`,
      `תרגול לחץ מתואם: 3v3+3 עם כלל שהכדור חייב להישאר באזור מסוים. הצוות הלוחץ מתרגל סגירת קווי מסירה.`
    );
  }

  // ═══════════════════════════════════════════
  // קונטרה — counter attack
  // ═══════════════════════════════════════════

  if (conceded > 0 && stats.turnovers != null && stats.turnovers >= 12 && stats.possession != null && stats.possession > 55) {
    push(
      CATEGORIES.COUNTER, 'transitions', 'high',
      `ספגנו מול ${opponent} למרות ${stats.possession}% חזקה, עם ${stats.turnovers} איבודים שחשפו את ההגנה לקאונטרים. כשהקבוצה מחזיקה גבוה ומאבדת — המרחבים מאחורי הקו פתוחים לגמרי.`,
      `הקבוצה עולה גבוה עם מגנים צדדיים וקשרים, אבל לא משאירה מספיק שחקנים מאחורי הכדור. איבוד = קאונטר של 3v2.`,
      `תרגול שמירת איזון: 8v8 עם כלל שתמיד חייבים להיות 3 שחקנים מאחורי קו הכדור. איבוד עם פחות מ-3 = נקודה ליריבה.`
    );
  }

  // ═══════════════════════════════════════════
  // ניהול משחק — game management
  // ═══════════════════════════════════════════

  if (stats.fouls != null && stats.fouls >= 14) {
    push(
      CATEGORIES.GAME_MGMT, 'general', 'low',
      `${stats.fouls} עבירות מול ${opponent} — רמת תוקפנות גבוהה שמסכנת בכרטיסים ובעיטות חופשיות באזורים מסוכנים. כשהעבירות כל כך גבוהות, הלחץ הופך לתסכול ולא לחטיפות אפקטיביות.`,
      `חוסר סבלנות הגנתית — שחקנים עוצרים ביריבה בפאול במקום לנהל את המרחב ולדחוק אותו לאזור לא מסוכן.`,
      `תרגול הגנה 1v1 ללא מגע: השחקן המגן מנחה את התוקף לצדדים בלי לגעת. עבירה = נקודה לתוקף.`
    );
  }

  if (isLoss && stats.xg != null && stats.xg > (conceded - 0.3)) {
    push(
      CATEGORIES.GAME_MGMT, 'general', 'low',
      `xG שלנו (${stats.xg}) קרוב ל-${conceded} שערים שספגנו מול ${opponent} — ההפסד לא משקף שליטה מוחלטת של היריבה. המשחק הוכרע ברגעים בודדים, והבדלים קטנים בריכוז ובניהול רגעי מפתח.`,
      `חוסר ניהול של רגעים קריטיים — ספגנו ברגע שלא הייתה סיבה טקטית לספוג, אלא ירידה בריכוז או ניהול שגוי של הדקות.`,
      `תרגול מצבים תחת לחץ זמן: משחקונים עם תוצאה צמודה ו-5 דקות אחרונות. דגש על ניהול קצב, שמירת כדור, וצמצום סיכונים.`
    );
  }

  const activePlayers = ratings.filter(r => !r.did_not_play && r.rating != null);
  if (activePlayers.length >= 5) {
    const avgRating = activePlayers.reduce((s, r) => s + r.rating, 0) / activePlayers.length;
    const lowRated = activePlayers.filter(r => r.rating < 6);

    if (lowRated.length >= 3) {
      const names = lowRated.slice(0, 3).map(r => r.player_name).join(', ');
      push(
        CATEGORIES.GAME_MGMT, 'general', 'medium',
        `${lowRated.length} שחקנים עם ציון מתחת ל-6 מול ${opponent} (${names}) — כשיותר משליש מהסגל בביצוע נמוך, הבעיה היא קולקטיבית ולא אישית. יש לבדוק אם ההכנה הטקטית התאימה ליריבה.`,
        `ייתכן שהתוכנית הטקטית לא התאימה ליריבה, או שהשחקנים לא הבינו את התפקיד שלהם במערך.`,
        `סקירת וידאו קבוצתית של המשחק + שיחה טקטית: מה התוכנית הייתה, מה באמת קרה, ואיפה הפער.`
      );
    }

    if (avgRating < 6.0) {
      push(
        CATEGORIES.GAME_MGMT, 'general', 'high',
        `ממוצע ציונים ${avgRating.toFixed(1)} מול ${opponent} — ביצוע קבוצתי חלש שמעיד על חוסר מוכנות מנטלית או טקטית. כשכל ההרכב נמוך, הבעיה היא תמיד מערכתית ולא של שחקן בודד.`,
        `בעיה מערכתית — ייתכן שהכנה לא מספקת, עייפות מצטברת, או ירידה במוטיבציה.`,
        `שיחה אישית עם 3 הסגנים + שיחה קבוצתית. בדיקת עומס אימונים בשבוע שלפני. התאמת אינטנסיביות.`
      );
    }
  }

  // ═══════════════════════════════════════════
  // phase_analysis issues — import from existing data
  // ═══════════════════════════════════════════

  const phaseMapping = [
    { key: 'buildup', cat: CATEGORIES.BUILD_UP, phase: 'buildup' },
    { key: 'organized_defense', cat: CATEGORIES.PRESSING, phase: 'organized_defense' },
  ];

  for (const { key, cat, phase: phaseName } of phaseMapping) {
    const phaseData = phases[key];
    if (phaseData?.issues?.length > 0) {
      for (const issue of phaseData.issues) {
        if (issue && issue.length >= 15 && !problems.some(p => p.text.includes(issue.slice(0, 20)))) {
          push(cat, phaseName, 'medium', `${issue} (מול ${opponent})`, '', '');
        }
      }
    }
  }

  if (phases.transitions) {
    const transMapping = [
      { dir: 'attack', cat: CATEGORIES.ATK_TRANSITION },
      { dir: 'defense', cat: CATEGORIES.DEF_TRANSITION },
    ];
    for (const { dir, cat } of transMapping) {
      const transData = phases.transitions[dir];
      if (transData?.issues?.length > 0) {
        for (const issue of transData.issues) {
          if (issue && issue.length >= 15 && !problems.some(p => p.text.includes(issue.slice(0, 20)))) {
            push(cat, 'transitions', 'medium', `${issue} (מול ${opponent})`, '', '');
          }
        }
      }
    }
  }

  if (phases.set_pieces?.issues?.length > 0) {
    for (const issue of phases.set_pieces.issues) {
      if (issue && issue.length >= 15 && !problems.some(p => p.text.includes(issue.slice(0, 20)))) {
        push(CATEGORIES.SET_PIECES, 'set_pieces', 'medium', `${issue} (מול ${opponent})`, '', '');
      }
    }
  }

  // ═══════════════════════════════════════════
  // Filter, deduplicate, sort
  // ═══════════════════════════════════════════

  const filtered = problems
    .filter(p => p.text.length >= 15)
    .filter((p, i, arr) => arr.findIndex(q => q.text === p.text) === i);

  const severityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));

  return filtered;
}

export { generateTacticalProblems };
