/**
 * Rules-based tactical problems engine.
 * Analyzes match data (stats, result, player_ratings, phase_analysis, free_notes)
 * and generates professional Hebrew tactical insights — no AI/LLM calls.
 */

function generateTacticalProblems(analysis) {
  const problems = [];
  const stats = analysis.stats || {};
  const result = analysis.result || {};
  const ratings = analysis.player_ratings || [];
  const phase = analysis.phase_analysis || {};
  const report = analysis.report || {};
  const notes = analysis.free_notes || '';
  const opponent = analysis.opponent || 'היריבה';

  const goalsScored = result.our_score ?? 0;
  const goalsConceded = result.opponent_score ?? 0;
  const isLoss = goalsConceded > goalsScored;
  const isDraw = goalsConceded === goalsScored;

  // ── Possession rules ──
  if (stats.possession != null) {
    if (stats.possession < 42) {
      problems.push({
        category: 'possession',
        severity: 'high',
        text: `הקבוצה החזיקה רק ${stats.possession}% חזקה מול ${opponent} — סימן לבנייה סטטית ואיטית שמאפשרת ליריבה להתארגן בנוחות. כשאין שליטה בכדור, אין שליטה בקצב, ואז ההגנה נשחקת עם הזמן.`
      });
    }
    if (stats.possession > 62 && goalsScored <= 1) {
      problems.push({
        category: 'possession',
        severity: 'medium',
        text: `${stats.possession}% חזקה אבל רק ${goalsScored} ${goalsScored === 1 ? 'גול' : 'גולים'} — חזקה סטרילית. הכדור מסתובב הרבה אבל לא חודר. חסרה תנועה אנכית שתפרק את הבלוק של ${opponent}, וההעברות נשארות רוחביות.`
      });
    }
  }

  // ── xG rules ──
  if (stats.xg != null) {
    if (stats.xg < 0.8) {
      problems.push({
        category: 'chance-creation',
        severity: 'high',
        text: `xG של ${stats.xg} בלבד — הקבוצה כמעט לא יצרה מצבים מסוכנים. זה מעיד על קושי מבני בחדירה לרחבה: אין מספיק ריצות עומק, אין חפיפות, ו${opponent} סוגרים את המרכז בקלות.`
      });
    }
    if (stats.shots > 0 && stats.xg / stats.shots < 0.1 && stats.shots >= 8) {
      problems.push({
        category: 'shot-quality',
        severity: 'medium',
        text: `${stats.shots} בעיטות עם xG ממוצע של ${(stats.xg / stats.shots).toFixed(2)} לבעיטה — הבעיטות מגיעות ממרחק גדול או מזוויות סגורות. הקבוצה בועטת כשהיא לא צריכה, במקום להמתין לפריצה איכותית.`
      });
    }
    if (stats.xg >= 2.0 && goalsScored === 0) {
      problems.push({
        category: 'finishing',
        severity: 'high',
        text: `xG של ${stats.xg} בלי אף גול — בעיית גמירה חריפה. הקבוצה יצרה מספיק מצבים אבל לא מנצלת אותם. זה לא מזל רע, זה חוסר קור רוח ברגע האמת.`
      });
    }
  }

  // ── Shots efficiency ──
  if (stats.shots > 0 && stats.shots_on_target != null) {
    const onTargetPct = (stats.shots_on_target / stats.shots) * 100;
    if (onTargetPct < 30 && stats.shots >= 8) {
      problems.push({
        category: 'shooting',
        severity: 'medium',
        text: `רק ${stats.shots_on_target} מתוך ${stats.shots} בעיטות הגיעו למסגרת (${onTargetPct.toFixed(0)}%) — יותר מ-70% מהבעיטות הלכו לטריבונות. זה מצביע על חוסר סבלנות בהתקפה ובעיטות מאולצות מבלי ליצור זווית נקייה.`
      });
    }
  }

  // ── Pass accuracy ──
  if (stats.pass_accuracy != null) {
    if (stats.pass_accuracy < 78) {
      problems.push({
        category: 'passing',
        severity: 'high',
        text: `דיוק מסירות של ${stats.pass_accuracy}% בלבד — כמעט מסירה מכל חמש הולכת לרגל יריבה. ברמה הזו, הבנייה מתפרקת לפני שהיא מתחילה, והקבוצה מוותרת על החזקה בצורה פסיבית.`
      });
    }
    if (stats.pass_accuracy < 82 && stats.pass_accuracy >= 78) {
      problems.push({
        category: 'passing',
        severity: 'low',
        text: `דיוק מסירות של ${stats.pass_accuracy}% — סביר אבל לא מספיק טוב לקבוצה שרוצה לשלוט. כל אחוז שיורד פה הוא עוד מעבר שמגיע ליריבה ומאפשר קאונטר.`
      });
    }
  }

  // ── Turnovers ──
  if (stats.turnovers != null) {
    if (stats.turnovers >= 15) {
      problems.push({
        category: 'turnovers',
        severity: 'high',
        text: `${stats.turnovers} איבודים — כל איבוד הוא הזמנה לקאונטר. מספר כזה מצביע על קבלת החלטות לקויה תחת לחץ: שחקנים מנסים מסירות לא ריאליסטיות במקום לשחק פשוט ולשמור על חזקה.`
      });
    } else if (stats.turnovers >= 11) {
      problems.push({
        category: 'turnovers',
        severity: 'medium',
        text: `${stats.turnovers} איבודים במהלך המשחק — רמה שדורשת תשומת לב. צריך לזהות באיזה אזור המגרש רוב האיבודים קורים ולהבין אם זה בגלל לחץ יריבה או בחירה שגויה של השחקנים.`
      });
    }
  }

  // ── Set pieces dependency ──
  if (stats.corners != null && goalsScored > 0) {
    const reportText = (report.positives || []).join(' ') + ' ' + notes;
    const setPieceGoalMentions = (reportText.match(/קורנר|סט[- ]?פיס|בעיטה חופשית|נגיח/g) || []).length;
    if (setPieceGoalMentions >= 2 && stats.xg != null && stats.xg < 1.5) {
      problems.push({
        category: 'set-piece-dependency',
        severity: 'medium',
        text: `רוב הסכנה ההתקפית הגיעה מסט-פיסים, עם xG ממשחק פתוח של פחות מ-${stats.xg}. תלות מוגזמת בקורנרים וחתכים מסוכנת — ביום שהסט-פיסים לא נכנסים, אין תוכנית B.`
      });
    }
  }

  // ── Defensive issues when conceding ──
  if (goalsConceded > 0) {
    if (stats.tackles != null && stats.interceptions != null) {
      const defActions = stats.tackles + stats.interceptions;
      if (defActions < 15) {
        problems.push({
          category: 'defense',
          severity: 'medium',
          text: `רק ${defActions} פעולות הגנתיות (${stats.tackles} חטיפות, ${stats.interceptions} יירוטים) — מעט מדי עבור קבוצה שספגה ${goalsConceded} ${goalsConceded === 1 ? 'שער' : 'שערים'}. ההגנה פסיבית מדי, ממתינה ליריבה במקום ללחוץ ולחטוף.`
        });
      }
    }

    if (stats.critical_errors != null && stats.critical_errors > 0) {
      problems.push({
        category: 'errors',
        severity: 'high',
        text: `${stats.critical_errors} שגיאות קריטיות שהובילו למצבי סכנה — אלה רגעים שבהם ההגנה מתפרקת לגמרי. שגיאה קריטית אחת היא מקרית, ${stats.critical_errors > 1 ? `אבל ${stats.critical_errors} שגיאות מצביעות על בעיה מערכתית בתקשורת בין הבלמים` : 'אבל צריך לנתח אם היא תוצאה של לחץ יריבה או חוסר ריכוז'}.`
      });
    }
  }

  // ── Result-based composite rules ──
  if (isLoss && stats.possession != null && stats.possession > 55) {
    problems.push({
      category: 'control-without-result',
      severity: 'high',
      text: `הפסד למרות ${stats.possession}% חזקה — הקבוצה שלטה בכדור אבל לא באזורים שמשנים תוצאות. שליטה בלי חדירה היא אשליה: ${opponent} ויתרו על הכדור בכוונה וחיכו לרגע הנכון.`
    });
  }

  if (isLoss && stats.xg != null && stats.xg > (goalsConceded - 0.3)) {
    problems.push({
      category: 'margins',
      severity: 'low',
      text: `ה-xG שלנו (${stats.xg}) היה קרוב ל-${goalsConceded} שערים שספגנו — ההפסד לא משקף שליטה מוחלטת של ${opponent}. המשחק הוכרע ברגעים בודדים, ושם ההבדל הוא ריכוז והגנה על החללים.`
    });
  }

  // ── Player ratings analysis ──
  const activePlayers = ratings.filter(r => !r.did_not_play && r.rating != null);
  if (activePlayers.length >= 5) {
    const avgRating = activePlayers.reduce((s, r) => s + r.rating, 0) / activePlayers.length;
    const lowRated = activePlayers.filter(r => r.rating < 6);

    if (lowRated.length >= 3) {
      const names = lowRated.slice(0, 3).map(r => r.player_name).join(', ');
      problems.push({
        category: 'player-performance',
        severity: 'medium',
        text: `${lowRated.length} שחקנים קיבלו ציון מתחת ל-6 (${names}) — כשיותר משליש מהסגל נמוך, הבעיה היא קולקטיבית ולא אישית. צריך לבדוק אם ההכנה הטקטית הייתה מתאימה ליריבה.`
      });
    }

    if (avgRating < 6.0) {
      problems.push({
        category: 'team-level',
        severity: 'high',
        text: `ממוצע ציונים של ${avgRating.toFixed(1)} — ביצוע קבוצתי חלש שמעיד על חוסר מוכנות או בעיית מוטיבציה. כשכל ההרכב נמוך, הבעיה היא תמיד מערכתית.`
      });
    }
  }

  // ── Phase analysis issues (from existing data) ──
  const phaseCategories = [
    { key: 'buildup', label: 'בנייה' },
    { key: 'organized_defense', label: 'הגנה מאורגנת' },
  ];
  for (const { key, label } of phaseCategories) {
    const phaseData = phase[key];
    if (phaseData?.issues?.length > 0) {
      for (const issue of phaseData.issues) {
        if (issue && issue.length >= 15 && !problems.some(p => p.text.includes(issue.slice(0, 20)))) {
          problems.push({
            category: `phase-${key}`,
            severity: 'medium',
            text: issue
          });
        }
      }
    }
  }

  // ── Transition issues ──
  if (phase.transitions) {
    for (const dir of ['attack', 'defense']) {
      const transData = phase.transitions[dir];
      if (transData?.issues?.length > 0) {
        for (const issue of transData.issues) {
          if (issue && issue.length >= 15 && !problems.some(p => p.text.includes(issue.slice(0, 20)))) {
            problems.push({
              category: `transition-${dir}`,
              severity: 'medium',
              text: issue
            });
          }
        }
      }
    }
  }

  // ── Fouls / discipline ──
  if (stats.fouls != null && stats.fouls >= 14) {
    problems.push({
      category: 'discipline',
      severity: 'low',
      text: `${stats.fouls} עבירות במשחק — רמת תוקפנות גבוהה שמסכנת בכרטיסים ובעיטות חופשיות מסוכנות. כשהקבוצה עוצרת ב-${stats.fouls} עבירות, זה אומר שהלחץ נהפך לתסכול ולא לחטיפה נקייה.`
    });
  }

  // ── Offsides ──
  if (stats.offsides != null && stats.offsides >= 4) {
    problems.push({
      category: 'offsides',
      severity: 'low',
      text: `${stats.offsides} נבדלים — התזמון בין הקו ההתקפי לאספקה לא מתואם. ריצות עומק חיוניות, אבל ${stats.offsides} נבדלים מעידים על חוסר סנכרון בין המוסר לרץ.`
    });
  }

  // ── Filter and sort ──
  const filtered = problems
    .filter(p => p.text.length >= 15)
    .filter((p, i, arr) => arr.findIndex(q => q.text === p.text) === i);

  const severityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));

  return filtered;
}

export { generateTacticalProblems };
