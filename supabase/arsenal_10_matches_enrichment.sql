-- =============================================
-- Arsenal FC 2025/26 — Enrich 10 matches with stats, video, phase analysis
-- Run AFTER arsenal_10_matches.sql
-- Updates existing match_analyses rows with full three-layer analysis
-- =============================================

-- MATCH 1: Man United (A) 1-0 — 17 Aug 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-2-3-1',
  opponent_attack_style = $t$לחץ גבוה דרך הכנפיים עם מאונט ופרננדש מאחור$t$,
  stats = '{
    "possession": 44,
    "shots": 9,
    "shots_on_target": 3,
    "passes": 387,
    "pass_accuracy": 82,
    "turnovers": 14,
    "xg": 0.87,
    "corners": 7,
    "fouls": 11,
    "offsides": 2
  }',
  video_moments = $t$[
    {"timestamp": "04:00", "note": "יונייטד לוחצים גבוה — ארסנל מצליחים לצאת דרך זובימנדי שיורד בין הבלמים", "situation_tag": "בנייה"},
    {"timestamp": "22:00", "note": "דורגו עובר את סאקה ב-1 על 1 ומכניס — דורגו פוגע במשקוף. רגע מסוכן", "situation_tag": "הגנה"},
    {"timestamp": "35:00", "note": "רייס מכניס קורנר, ביינדיר לא מגיע, קלאפיורי נוגח — 1-0. ביצוע סט-פיס מושלם", "situation_tag": "סט-פיס"},
    {"timestamp": "55:00", "note": "ג׳וקרש מקבל כדור עומק מזובימנדי, מסובב את הבלם אבל בועט חלש — הוגוי עוצר", "situation_tag": "התקפה"},
    {"timestamp": "72:00", "note": "ראיה יוצא מהשער וחוסם בעיטה של גארנצ׳ו ב-1 על 1 — חילוץ קריטי", "situation_tag": "הגנה"},
    {"timestamp": "83:00", "note": "ארסנל יורדים לבלוק נמוך — יונייטד מחזיקים 68% חזקה ברבע שעה האחרון אבל לא יוצרים", "situation_tag": "הגנה מאורגנת"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["זובימנדי יורד בין הבלמים ויוצר עליונות מספרית בבנייה", "רייס ואודגארד יוצרים רוחב כשזובימנדי מושך את הלחץ"],
      "issues": ["קצב בנייה מהיר מדי — 2.02 מ׳ לשנייה, הוביל ל-14 איבודים", "חוסר סבלנות במעברים מהגנה להתקפה"],
      "recommendations": ["להוריד קצב בנייה ב-10-15% במשחקי חוץ גדולים", "תרגול יציאה מלחץ עם שלוש מסירות מינימום"]
    },
    "transitions": {
      "attack": {
        "strengths": ["ג׳וקרש מציע עומק שלא היה קודם — מושך בלמים ופותח מרחבים"],
        "issues": ["סאקה מבודד בצד ימין — דורגו סגר אותו יעיל"],
        "recommendations": ["פתרונות חלופיים לסאקה — חתכים פנימה או החלפות עמדה עם רייס"]
      },
      "defense": {
        "strengths": ["מעבר מהיר להגנה — ממוצע 3.2 שניות לחזרה למבנה"],
        "issues": ["רווח בין קו אמצע להגנה בדקות 50-65"],
        "recommendations": ["זובימנדי צריך להישאר עמוק יותר בפאזות מעבר"]
      }
    },
    "organized_defense": {
      "strengths": ["גבריאל וסליבא שלטו באוויר — 100% דו-קרבות אוויריים", "בלוק נמוך אפקטיבי ברבע שעה האחרון"],
      "issues": ["דורגו חדר 3 פעמים מהשמאל — חולשה בצד ימין ההגנתי"],
      "recommendations": ["טימבר צריך לצמצם מרחב לכנף השמאלית של היריב"]
    },
    "set_pieces": {
      "strengths": ["7 קורנרים — 3 מסוכנים. השער הגיע מקורנר מתורגל", "רייס מכניס בדיוק לאזור הקרוב"],
      "issues": ["חומה בבעיטות חופשיות לא מספיק גבוהה — בעיטה אחת עברה מעל"],
      "recommendations": ["להוסיף שחקן גבוה לחומה במשחקים גדולים"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "יציאה מלחץ גבוה", "drill_suggestion": "תרגול בנייה מאחור מול 3 לוחצים — דגש על סבלנות וקצב מסירות", "priority": "high", "completed": false},
    {"focus": "פתרונות לסאקה כשנחסם", "drill_suggestion": "עבודה על החלפות עמדה סאקה-רייס ועל חתכים פנימה כשהכנף נסגרת", "priority": "medium", "completed": false},
    {"focus": "הגנה על חלל בצד ימין", "drill_suggestion": "טימבר — תרגול צמצום מרחב מול כנף מהירה, שמירה על קו עם סליבא", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "איבודים מבנייה מהירה מדי", "frequency": "חוזר — גם מול לידס", "severity": "high"},
    {"pattern": "קטלניות מקורנרים", "frequency": "שער שני מקורנר בשני משחקים", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["סאקה מול דורגו", "זובימנדי מול פרננדש", "ג׳וקרש מול דה-ליכט"],
    "tactical_focus": "בנייה סבלנית דרך זובימנדי, ניצול קורנרים, בלוק נמוך ברבע שעה אחרון"
  }$t$
WHERE opponent = 'Manchester United' AND date = '2025-08-17'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 2: Leeds United (H) 5-0 — 23 Aug 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-4-2',
  opponent_attack_style = $t$ישיר עם כדורים ארוכים, ניסיון לחץ גבוה שנכשל$t$,
  stats = '{
    "possession": 67,
    "shots": 22,
    "shots_on_target": 9,
    "passes": 612,
    "pass_accuracy": 89,
    "turnovers": 7,
    "xg": 3.41,
    "corners": 11,
    "fouls": 8,
    "offsides": 1
  }',
  video_moments = $t$[
    {"timestamp": "12:00", "note": "טימבר עולה מהצד הימני לתוך הרחבה — נוגח מקורנר של רייס. 1-0. תנועה מתורגלת", "situation_tag": "סט-פיס"},
    {"timestamp": "28:00", "note": "ג׳וקרש מחמיץ מ-6 מטרים — בעיטה חלשה ישירות על השוער. רגע מביך", "situation_tag": "החמצה"},
    {"timestamp": "33:00", "note": "טימבר שוב! נוגח מקורנר שני. 2-0. לידס לא מסוגלים להתמודד עם הגובה שלנו", "situation_tag": "סט-פיס"},
    {"timestamp": "47:00", "note": "אזה נכנס מהשמאל ומוסר לג׳וקרש שמסיים מקרוב. 3-0. חיבור מיידי", "situation_tag": "התקפה"},
    {"timestamp": "63:00", "note": "סאקה חותך פנימה ובועט לפינה — 4-0. בעיטה טכנית מושלמת", "situation_tag": "התקפה"},
    {"timestamp": "78:00", "note": "ג׳וקרש מקבל כדור עומק, שולט ומסיים — דאבל! 5-0. תגובה אחרי ההחמצה", "situation_tag": "התקפה"},
    {"timestamp": "90+2", "note": "דאומן בן 15 נכנס כמחליף וזוכה בפנדל תוך 90 שניות — רגע היסטורי", "situation_tag": "מיוחד"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["89% דיוק מסירות — שליטה מוחלטת", "זובימנדי חילק 94 מסירות — שיא אישי", "בנייה סבלנית שפתחה את ההגנה של לידס שוב ושוב"],
      "issues": ["נטייה להאט קצב כשמובילים 3-0 — צריך לשמור על אינטנסיביות"],
      "recommendations": ["לשמר קצב בנייה גם בתוצאה גבוהה"]
    },
    "transitions": {
      "attack": {
        "strengths": ["מעברים מהירים — 4 מצבים מ-3 מסירות או פחות", "ג׳וקרש מציע עומק מיידי"],
        "issues": ["מעט מצבים מנגד — רוב ההתקפות מבנייה"],
        "recommendations": ["לנצל יותר מצבי נגד כשהיריב פתוח"]
      },
      "defense": {
        "strengths": ["לחץ גבוה חנק את הבנייה של לידס — 7 איבודים בלבד"],
        "issues": ["הלחץ ירד בחצי השני — לידס קיבלו יותר חזקה"],
        "recommendations": ["שמירה על לחץ גם כשמובילים"]
      }
    },
    "organized_defense": {
      "strengths": ["קלין שיט — לידס לא בעטו למסגרת", "סליבא וגבריאל שלטו בכל דו-קרב"],
      "issues": ["לא נבחן — קשה להעריך"],
      "recommendations": ["לשמור על ריכוז הגנתי גם במשחקים קלים"]
    },
    "set_pieces": {
      "strengths": ["שני שערים מקורנרים — טימבר דאבל!", "11 קורנרים, 4 מסוכנים", "37 שערי קורנר מאז 23-24 — שיא ליגה"],
      "issues": ["אין בעיות — סט-פיסים מושלמים"],
      "recommendations": ["להמשיך עם הווריאציות הנוכחיות"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "שמירת אינטנסיביות בתוצאה גבוהה", "drill_suggestion": "משחקונים עם יעדים — גם כשמובילים צריך להגיע ליעד מסירות/בעיטות", "priority": "medium", "completed": false},
    {"focus": "ניהול עומסים לפני ליברפול", "drill_suggestion": "אימון קל — ריצה קלה, מתיחות, תרגול סט-פיסים בלבד", "priority": "high", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "קטלניות מקורנרים", "frequency": "4 שערים מקורנרים בשני משחקים!", "severity": "positive"},
    {"pattern": "ג׳וקרש מחמיץ ואז מגיב", "frequency": "דפוס חדש — מראה אופי", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["טימבר מול כנף שמאלית", "ג׳וקרש מול בלמים", "סאקה מול מגן שמאלי"],
    "tactical_focus": "שליטה מוחלטת, ניצול קורנרים, דאומן מקבל דקות"
  }$t$
WHERE opponent = 'Leeds United' AND date = '2025-08-23'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 3: Liverpool (A) 0-1 — 31 Aug 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-3-3',
  opponent_attack_style = $t$לחץ אגרסיבי גבוה, בנייה מהירה דרך סלאח ודיאס$t$,
  stats = '{
    "possession": 40,
    "shots": 5,
    "shots_on_target": 1,
    "passes": 341,
    "pass_accuracy": 78,
    "turnovers": 16,
    "xg": 0.42,
    "corners": 3,
    "fouls": 13,
    "offsides": 3
  }',
  video_moments = $t$[
    {"timestamp": "04:00", "note": "סליבא נפצע אחרי דו-קרב עם נוניז — מוסקרה נכנס. שינוי תוכנית מיידי", "situation_tag": "פציעה"},
    {"timestamp": "18:00", "note": "ליברפול לוחצים גבוה — ארסנל לא מצליחים לצאת. 3 איבודים ב-5 דקות", "situation_tag": "בנייה"},
    {"timestamp": "35:00", "note": "מוסקרה חוסם בעיטה של סלאח מתוך הרחבה — בגרות מפתיעה", "situation_tag": "הגנה"},
    {"timestamp": "55:00", "note": "אזה נכנס במקום מאדואקה — ארטטה מחפש פתרון התקפי", "situation_tag": "החלפה"},
    {"timestamp": "72:00", "note": "ג׳וקרש מקבל כדור יחיד בתוך הרחבה — שומר עוצר. הכדור הראשון שלו ברחבה", "situation_tag": "התקפה"},
    {"timestamp": "83:00", "note": "סובוסלאי בועט חופשית מ-30 מטר ישירות לרשת. ראיה לא מגיע. 0-1", "situation_tag": "סט-פיס נגד"},
    {"timestamp": "88:00", "note": "ארסנל מנסים ללחוץ — ליברפול סוגרים מרחבים. אין פתרון", "situation_tag": "התקפה"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["מוסקרה השתלב בבנייה בלי טעויות — חלוקה נכונה"],
      "issues": ["78% דיוק מסירות — הנמוך ביותר העונה", "16 איבודים — שיא שלילי", "לא הצליחו לצאת מלחץ ליברפול"],
      "recommendations": ["תרגול יציאה מלחץ אגרסיבי — 4 על 3 בבנייה", "כדורים ארוכים כאופציה כשהלחץ גבוה מדי"]
    },
    "transitions": {
      "attack": {
        "strengths": ["שמרנות נכונה — לא לקחו סיכונים מיותרים"],
        "issues": ["0.42 xG — כמעט לא יצרנו", "ג׳וקרש בודד לגמרי — כדור אחד ברחבה ב-90 דקות"],
        "recommendations": ["תמיכת חלוץ — מישהו חייב לעלות לתמוך בג׳וקרש"]
      },
      "defense": {
        "strengths": ["מעברים מהירים להגנה — 82 דקות ללא שער"],
        "issues": ["לא יצרנו נגדים — 0 מצבי נגד"],
        "recommendations": ["לשחרר שחקן קדימה גם בהגנה"]
      }
    },
    "organized_defense": {
      "strengths": ["גבריאל ומוסקרה שותפות חירום יציבה", "82 דקות ללא שער מול ליברפול באנפילד"],
      "issues": ["ספגנו מבעיטה חופשית — החומה לא מספיק גבוהה", "סובוסלאי כמגן ימין בועט חופשיות — לא צפינו"],
      "recommendations": ["מיפוי בועטים חופשיות של היריב לפני משחק", "חומה גבוהה יותר — להוסיף סליבא/גבריאל"]
    },
    "set_pieces": {
      "strengths": ["לא ספגנו מקורנרים"],
      "issues": ["3 קורנרים בלבד — לא ניצלנו", "ספגנו מבעיטה חופשית — הגול היחיד"],
      "recommendations": ["תרגול הגנה על בעיטות חופשיות מ-25-35 מטר"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "יציאה מלחץ אגרסיבי", "drill_suggestion": "4 על 3 בבנייה מול לחץ — שימוש בכדורים ארוכים כאופציה", "priority": "high", "completed": false},
    {"focus": "תמיכת חלוץ במשחקי חוץ", "drill_suggestion": "אזה או אודגארד עולים לתמוך בג׳וקרש — לא להשאיר אותו לבד", "priority": "high", "completed": false},
    {"focus": "הגנה על בעיטות חופשיות", "drill_suggestion": "חומה גבוהה יותר, מיפוי בועטים של היריב", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "חוסר יצירתיות בחוץ מול גדולים", "frequency": "ראשון העונה — לעקוב", "severity": "high"},
    {"pattern": "ג׳וקרש בודד בחוץ", "frequency": "בעיה חוזרת מול יונייטד", "severity": "high"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3 → 4-5-1 בהגנה",
    "key_matchups": ["מוסקרה מול נוניז", "גבריאל מול סלאח", "זובימנדי מול מק-אליסטר"],
    "tactical_focus": "הגנה משמעתית, יציאות נגד כשאפשר, שמירה על 0-0 כמה שיותר"
  }$t$
WHERE opponent = 'Liverpool' AND date = '2025-08-31'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 4: Nottingham Forest (H) 3-0 — 13 Sep 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '3-4-3',
  opponent_attack_style = $t$משולש הגנתי עם כנפיים תוקפניות, נגדים מהירים$t$,
  stats = '{
    "possession": 63,
    "shots": 16,
    "shots_on_target": 7,
    "passes": 548,
    "pass_accuracy": 87,
    "turnovers": 9,
    "xg": 2.54,
    "corners": 8,
    "fouls": 9,
    "offsides": 1
  }',
  video_moments = $t$[
    {"timestamp": "17:00", "note": "אודגארד נפגע בכתף ימין אחרי דו-קרב — ירד מהמגרש. מרינו נכנס", "situation_tag": "פציעה"},
    {"timestamp": "23:00", "note": "זובימנדי מקבל כדור 25 מטר, מסתובב ובועט וולי מדהים לפינה העליונה — 1-0!", "situation_tag": "גול"},
    {"timestamp": "46:00", "note": "אזה מקבל בשמאל, חותך פנימה ומוסר לג׳וקרש שמסיים מ-8 מטר — 2-0. חיבור מיידי אחרי ההפסקה", "situation_tag": "גול"},
    {"timestamp": "58:00", "note": "מרינו יורד לעשר ואזה עובר שמאלה — הגמישות הטקטית עובדת", "situation_tag": "טקטיקה"},
    {"timestamp": "71:00", "note": "ראיה מגיע ל-100 הופעות — שומר על קלין שיט", "situation_tag": "מיוחד"},
    {"timestamp": "79:00", "note": "זובימנדי נוגח מקורנר של רייס — 3-0. דאבל ראשון בקריירה!", "situation_tag": "סט-פיס"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["87% דיוק מסירות — יציבות מעולה", "זובימנדי שלט בקצב — 548 מסירות קבוצתיות", "המעבר חלק אחרי יציאת אודגארד"],
      "issues": ["מעט איטי בבנייה בדקות 30-45"],
      "recommendations": ["לשמור על קצב גם כשהמשחק מתנהל"]
    },
    "transitions": {
      "attack": {
        "strengths": ["אזה מוסר לג׳וקרש תוך 2 שניות מהפסקה — מעבר חד", "זובימנדי בועט מחוץ לרחבה — איום חדש"],
        "issues": ["מעט מצבי נגד — רוב ההתקפות מבנייה"],
        "recommendations": ["לנצל יותר את המהירות של אזה בנגדים"]
      },
      "defense": {
        "strengths": ["מעברים מסודרים — פורסט לא יצרו"],
        "issues": ["אין בעיות משמעותיות"],
        "recommendations": ["להמשיך עם אותה משמעת"]
      }
    },
    "organized_defense": {
      "strengths": ["קלין שיט שביעי — מוסקרה ממשיך ליד גבריאל", "פורסט לא בעטו למסגרת"],
      "issues": ["לא נבחן אמיתית"],
      "recommendations": ["מוסקרה אופציה אמינה כשסליבא חסר"]
    },
    "set_pieces": {
      "strengths": ["שער שלישי מקורנר — זובימנדי נוגח", "8 קורנרים, 3 מסוכנים"],
      "issues": ["אין"],
      "recommendations": ["להמשיך עם הווריאציות"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "ניהול עומסים לאודגארד", "drill_suggestion": "תוכנית אישית — חיזוק כתף ימין, הפחתת עומס באימונים", "priority": "high", "completed": false},
    {"focus": "גמישות טקטית ללא אודגארד", "drill_suggestion": "תרגול מרינו בעשר + אזה בשמאל כתוכנית B קבועה", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "קטלניות מקורנרים", "frequency": "6 שערי קורנר ב-4 משחקים!", "severity": "positive"},
    {"pattern": "אודגארד נפצע שוב", "frequency": "פציעה שנייה — בעיה מבנית", "severity": "high"},
    {"pattern": "מוסקרה אמין בלב ההגנה", "frequency": "משחק שני מצוין", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3 → 4-3-3 (עם מרינו)",
    "key_matchups": ["מוסקרה מול אווניי", "זובימנדי מול יייטס", "אזה בכנף שמאלית"],
    "tactical_focus": "שליטה בקצב, ניצול סט-פיסים, גמישות טקטית אחרי פציעת אודגארד"
  }$t$
WHERE opponent = 'Nottingham Forest' AND date = '2025-09-13'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 5: Manchester City (H) 1-1 — 21 Sep 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-3-3',
  opponent_attack_style = $t$בנייה קצרה דרך רודרי, הלאנד כנקודת ייחוס, דה-ברויינה יוצר$t$,
  stats = '{
    "possession": 43,
    "shots": 8,
    "shots_on_target": 3,
    "passes": 378,
    "pass_accuracy": 80,
    "turnovers": 13,
    "xg": 1.12,
    "corners": 5,
    "fouls": 14,
    "offsides": 2
  }',
  video_moments = $t$[
    {"timestamp": "08:30", "note": "הלאנד מקבל כדור מדה-ברויינה, מסתובב על מוסקרה ובועט חזק לפינה — 0-1. השער ה-5 שלו ב-7 משחקים מול ארסנל", "situation_tag": "גול נגד"},
    {"timestamp": "15:00", "note": "סיטי שולטים — 65% חזקה ברבע שעה ראשון. ארסנל לא מצליחים לצאת", "situation_tag": "בנייה"},
    {"timestamp": "35:00", "note": "ג׳וקרש מקבל כדור יחיד — בועט חלש. המצב הראשון של ארסנל", "situation_tag": "התקפה"},
    {"timestamp": "55:00", "note": "ארסנל מעלים קצב — רייס עולה חופשי ובועט מעל המשקוף", "situation_tag": "התקפה"},
    {"timestamp": "70:00", "note": "מרטינלי נכנס במקום מאדואקה — ארטטה מחפש שער השוואה", "situation_tag": "החלפה"},
    {"timestamp": "90+3", "note": "אזה שולח כדור ארוך מעל ההגנה — מרטינלי חוטף את דונרומה ומשגר! 1-1! אמירייטס מתפוצץ", "situation_tag": "גול"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["השתפרו בהדרגה — מחצית שנייה טובה יותר"],
      "issues": ["80% דיוק — נמוך", "43% חזקה — סיטי שלטו", "לא מצאו דרך דרך הבלוק של סיטי"],
      "recommendations": ["כדורים ארוכים מעל ההגנה — עבד בגול ההשוואה!"]
    },
    "transitions": {
      "attack": {
        "strengths": ["גול ההשוואה הגיע מכדור ארוך של אזה — כלי חדש ויעיל", "מרטינלי מהספסל מביא מהירות ואנרגיה"],
        "issues": ["מעט מצבי נגד — סיטי שלטו"],
        "recommendations": ["להשתמש יותר בכדורים ארוכים מאזה כאופציה"]
      },
      "defense": {
        "strengths": ["מעברים מהירים אחרי דקה 15"],
        "issues": ["הפתיחה רכה — הלאנד קיבל מרחב", "מוסקרה לא הצליח לעמוד מול הלאנד"],
        "recommendations": ["גבריאל על הלאנד — לא מוסקרה"]
      }
    },
    "organized_defense": {
      "strengths": ["אחרי הגול ההגנה התארגנה מחדש", "גבריאל שלט מהדקה 15"],
      "issues": ["פתיחה לא ערוכה — הלאנד כבש אחרי 8.5 דקות", "מרחב בין הקווים"],
      "recommendations": ["תרגול התארגנות ב-5 דקות הראשונות — קו גבוה מול חלוצים פיזיים"]
    },
    "set_pieces": {
      "strengths": ["5 קורנרים — 2 מסוכנים"],
      "issues": ["לא כבשנו מקורנרים — סיטי מתגוננים טוב"],
      "recommendations": ["ווריאציות חדשות מול קבוצות שמגינות טוב על קורנרים"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "התארגנות בפתיחת משחק", "drill_suggestion": "5 דקות ראשונות — ריכוז מקסימלי, קו גבוה, לא לתת מרחב לחלוץ", "priority": "high", "completed": false},
    {"focus": "ניטרול חלוצים פיזיים", "drill_suggestion": "גבריאל אחראי על הלאנד — לא מוסקרה. תרגול 1 על 1 פיזי", "priority": "high", "completed": false},
    {"focus": "כדורים ארוכים כאופציה", "drill_suggestion": "אזה מתרגל כדורים מעל ההגנה — ג׳וקרש/מרטינלי רצים", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "פתיחה רכה", "frequency": "גם מול סיטי — ספגנו מוקדם", "severity": "high"},
    {"pattern": "מרטינלי מהספסל כובש", "frequency": "דפוס חדש — אקדח טעון", "severity": "positive"},
    {"pattern": "אזה כדורים ארוכים", "frequency": "כלי חדש — עבד מצוין", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["גבריאל מול הלאנד", "זובימנדי מול רודרי", "סאקה מול גרילישׁ"],
    "tactical_focus": "התארגנות מיידית בפתיחה, בנייה סבלנית, כדורים ארוכים כאופציה"
  }$t$
WHERE opponent = 'Manchester City' AND date = '2025-09-21'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 6: Newcastle United (A) 2-1 — 28 Sep 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-3-3',
  opponent_attack_style = $t$אגרסיבי עם מהירות בכנפיים, גורדון ווולטמדה תוקפניים$t$,
  stats = '{
    "possession": 47,
    "shots": 11,
    "shots_on_target": 4,
    "passes": 402,
    "pass_accuracy": 81,
    "turnovers": 12,
    "xg": 1.67,
    "corners": 9,
    "fouls": 15,
    "offsides": 1
  }',
  video_moments = $t$[
    {"timestamp": "12:00", "note": "ניוקאסל לוחצים גבוה — ארסנל מתקשים לצאת. 3 איבודים ב-10 דקות", "situation_tag": "בנייה"},
    {"timestamp": "34:00", "note": "וולטמדה חותך אלכסונית מימין, מושך את קלאפיורי ובועט לפינה — 0-1. תנועה חכמה", "situation_tag": "גול נגד"},
    {"timestamp": "60:00", "note": "ג׳וקרש מופל ברחבה — השופט נותן פנדל! VAR שולח לצפייה — פופ נגע בכדור. בוטל", "situation_tag": "VAR"},
    {"timestamp": "70:00", "note": "אודגארד נכנס! חוזר מפציעה. האצטדיון שוקט — הנוכחות שלו משנה הכל", "situation_tag": "החלפה"},
    {"timestamp": "84:00", "note": "רייס מכניס קורנר — מרינו נוגח להשוואה! 1-1. אנרגיה עצומה", "situation_tag": "סט-פיס"},
    {"timestamp": "90+1", "note": "אודגארד מכניס קורנר מושלם — גבריאל נוגח לפינה! 2-1! קאמבק!", "situation_tag": "סט-פיס"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["אחרי הכנסת אודגארד — בנייה מרכזית חזרה", "81% דיוק — סביר למשחק חוץ קשה"],
      "issues": ["מחצית ראשונה חלשה — לא מצאו דרך", "12 איבודים — גבוה"],
      "recommendations": ["אודגארד חייב להתחיל — הוא משנה את המשחק"]
    },
    "transitions": {
      "attack": {
        "strengths": ["אחרי דקה 70 עם אודגארד — המשחק השתנה"],
        "issues": ["לפני הכנסת אודגארד — 0 מצבים אמיתיים"],
        "recommendations": ["לוודא שאודגארד כשיר לפתיחה"]
      },
      "defense": {
        "strengths": ["מעברים מהירים ברבע שעה האחרון"],
        "issues": ["ספגנו מתנועה אלכסונית של וולטמדה — קלאפיורי נמשך החוצה"],
        "recommendations": ["תרגול הגנה על חתכים אלכסוניים — קלאפיורי לא יוצא מהקו"]
      }
    },
    "organized_defense": {
      "strengths": ["אחרי ההשוואה — ניוקאסל לא יצרו כלום"],
      "issues": ["קלאפיורי נמשך אחרי וולטמדה — פתח מרחב", "תנועות אלכסוניות — חולשה חוזרת"],
      "recommendations": ["קלאפיורי — תקשורת עם גבריאל לפני שיוצאים"]
    },
    "set_pieces": {
      "strengths": ["שני שערי נגיחה מקורנרים! מרינו + גבריאל", "9 קורנרים — 4 מסוכנים", "אודגארד מכניס קורנר מושלם"],
      "issues": ["אין — סט-פיסים הכריעו"],
      "recommendations": ["אודגארד כמכניס קורנרים — יותר מדויק מרייס"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "הגנה על תנועות אלכסוניות", "drill_suggestion": "תרגול ספציפי — כנף חותך פנימה, מגן לא יוצא מהקו, תקשורת עם בלם מרכזי", "priority": "high", "completed": false},
    {"focus": "חזרת אודגארד לתוכנית A", "drill_suggestion": "אודגארד פותח — מרינו מהספסל. לוודא כשירות מלאה", "priority": "high", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "תנועות אלכסוניות פוגעות בנו", "frequency": "ספגנו מזה גם מול ליברפול", "severity": "high"},
    {"pattern": "קאמבק מסט-פיסים", "frequency": "שני שערים מקורנרים ב-6 דקות!", "severity": "positive"},
    {"pattern": "אודגארד משנה מהספסל", "frequency": "דפוס ברור — הוא הכי חשוב שלנו", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["קלאפיורי מול וולטמדה", "גבריאל מול איזאק", "זובימנדי מול גימארייש"],
    "tactical_focus": "להישרד עד שאודגארד נכנס, קורנרים כנשק מכריע"
  }$t$
WHERE opponent = 'Newcastle United' AND date = '2025-09-28'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 7: West Ham United (H) 2-0 — 4 Oct 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-2-3-1',
  opponent_attack_style = $t$בלוק נמוך עם נגדים דרך בואן ופאקטה$t$,
  stats = '{
    "possession": 65,
    "shots": 14,
    "shots_on_target": 5,
    "passes": 571,
    "pass_accuracy": 88,
    "turnovers": 8,
    "xg": 1.89,
    "corners": 7,
    "fouls": 10,
    "offsides": 0
  }',
  video_moments = $t$[
    {"timestamp": "05:00", "note": "סליבא חוזר! שותפות סליבא-גבריאל שוב ביחד. ביטחון מיידי בהגנה", "situation_tag": "מיוחד"},
    {"timestamp": "20:00", "note": "ווסטהאם בבלוק נמוך — ארסנל מחזיקים 70% חזקה אבל לא פורצים", "situation_tag": "בנייה"},
    {"timestamp": "37:00", "note": "רייס מקבל מאודגארד, עולה חופשי ובועט מדויק מחוץ לרחבה — 1-0! גול יפהפה", "situation_tag": "גול"},
    {"timestamp": "55:00", "note": "ג׳וקרש מתנגש עם השוער — VAR בודק. פנדל!", "situation_tag": "פנדל"},
    {"timestamp": "66:00", "note": "סאקה ניגש לנקודה. קור רוח מושלם — 2-0. ביצוע ללא לחץ", "situation_tag": "גול"},
    {"timestamp": "80:00", "note": "ארסנל מורידים קצב — ניהול משחק בוגר. בן ווייט נכנס לצד ימין", "situation_tag": "ניהול"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["88% דיוק מסירות — מעולה", "65% חזקה — שליטה מלאה", "אודגארד חזר להתחלה — בנייה מרכזית חזרה"],
      "issues": ["37 דקות עד השער הראשון — קצב אטי מדי"],
      "recommendations": ["לפתוח משחקים חזק יותר — לא לחכות 37 דקות"]
    },
    "transitions": {
      "attack": {
        "strengths": ["רייס עולה חופשי — תפקיד חדש אפקטיבי", "אודגארד מנתב — רייס מסיים"],
        "issues": ["מעט נגדים — ווסטהאם לא תקפו"],
        "recommendations": ["רייס בתפקיד חופשי — להמשיך"]
      },
      "defense": {
        "strengths": ["ווסטהאם לא יצרו אף מצב רציני", "סליבא חזר — ביטחון מלא"],
        "issues": ["לא נבחנו"],
        "recommendations": ["שמירה על ריכוז גם כשלא מאותגרים"]
      }
    },
    "organized_defense": {
      "strengths": ["סליבא + גבריאל — שותפות הבלמים הטובה בליגה חזרה", "קלין שיט — ווסטהאם 0 בעיטות למסגרת"],
      "issues": ["אין — לא נבחנו"],
      "recommendations": ["להנות מהיציבות"]
    },
    "set_pieces": {
      "strengths": ["7 קורנרים — לחץ מתמיד", "פנדל — ג׳וקרש זכה"],
      "issues": ["לא כבשנו מקורנרים — 0 שערים"],
      "recommendations": ["לעבוד על ווריאציות מול בלוק נמוך"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "פתיחת משחקים חזקה", "drill_suggestion": "5 דקות ראשונות — אינטנסיביות מקסימלית, לחץ גבוה, ניסיון לכבוש מוקדם", "priority": "medium", "completed": false},
    {"focus": "פריצת בלוק נמוך", "drill_suggestion": "תרגול פריצה מול 5 בהגנה — שילובי קיר, חתכים, בעיטות מרחוק", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "פתיחה שמרנית", "frequency": "שער ראשון רק בדקה 37 — חוזר", "severity": "medium"},
    {"pattern": "רייס בתפקיד חופשי כובש", "frequency": "דפוס חדש ומבטיח", "severity": "positive"},
    {"pattern": "סאקה קר מפנדלים", "frequency": "100% הצלחה מהנקודה", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["סליבא מול פאקטה", "סאקה מול אמרסון", "רייס עולה חופשי"],
    "tactical_focus": "שליטה בחזקה, רייס חופשי, קור רוח מפנדלים"
  }$t$
WHERE opponent = 'West Ham United' AND date = '2025-10-04'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 8: Fulham (A) 1-0 — 18 Oct 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-2-3-1',
  opponent_attack_style = $t$בלוק נמוך מאורגן, נגדים דרך ווילסון וסמית'-רואו$t$,
  stats = '{
    "possession": 63,
    "shots": 12,
    "shots_on_target": 5,
    "passes": 534,
    "pass_accuracy": 86,
    "turnovers": 10,
    "xg": 1.54,
    "corners": 8,
    "fouls": 12,
    "offsides": 1
  }',
  video_moments = $t$[
    {"timestamp": "15:00", "note": "פולהאם בבלוק נמוך — ארסנל מחזיקים 67% חזקה אבל לא מוצאים פתח", "situation_tag": "בנייה"},
    {"timestamp": "33:00", "note": "סאקה הופל ברחבה על ידי קווין! השופט נותן פנדל. VAR שולח לצפייה — בוטל. קווין נגע בכדור", "situation_tag": "VAR"},
    {"timestamp": "42:00", "note": "רייס מכניס קורנר, גבריאל נוגח — טרוסארד מסיים מקרוב! 1-0. שוב מקורנר", "situation_tag": "סט-פיס"},
    {"timestamp": "55:00", "note": "סאקה חותך פנימה ובועט — דוברבקה עוצר ביד אחת. חילוץ מעולה", "situation_tag": "התקפה"},
    {"timestamp": "70:00", "note": "פולהאם מנסים ללחוץ — ארסנל מנהלים בביטחון. סליבא וגבריאל שולטים", "situation_tag": "הגנה מאורגנת"},
    {"timestamp": "85:00", "note": "ארסנל מנהלים את הזמן — החלפות טקטיות, איטיות. מקצועיות", "situation_tag": "ניהול"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["86% דיוק — יציב", "63% חזקה — שליטה"],
      "issues": ["לא מצאו דרך דרך הבלוק הנמוך של פולהאם", "1.54 xG — צריך ליצור יותר"],
      "recommendations": ["בעיטות מרחוק כאופציה מול בלוק נמוך"]
    },
    "transitions": {
      "attack": {
        "strengths": ["טרוסארד מהספסל — תגובה מיידית", "גבריאל עולה לקורנרים — נוכחות אווירית"],
        "issues": ["מעט מצבים ממשחק פתוח"],
        "recommendations": ["שילובי קיר בקצה הרחבה"]
      },
      "defense": {
        "strengths": ["פולהאם 0 בעיטות למסגרת — שליטה מוחלטת"],
        "issues": ["אין"],
        "recommendations": ["להמשיך"]
      }
    },
    "organized_defense": {
      "strengths": ["פולהאם 0 בעיטות למסגרת!", "סליבא + גבריאל — מושלמים", "קלין שיט שמיני"],
      "issues": ["לא נבחנו"],
      "recommendations": ["שמירה על ריכוז"]
    },
    "set_pieces": {
      "strengths": ["שער מקורנר — גבריאל נוגח, טרוסארד מסיים", "8 קורנרים — מסוכנים"],
      "issues": ["VAR ביטל פנדל — צריך לזכות בפנדלים ברורים יותר"],
      "recommendations": ["טרוסארד קרוב לשער בקורנרים — עמדה טובה"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "פריצת בלוק נמוך ממשחק פתוח", "drill_suggestion": "תרגול 6 על 5 ברחבה — שילובי קיר, חתכים, בעיטות מהקו", "priority": "high", "completed": false},
    {"focus": "ניצול מקסימלי של סט-פיסים", "drill_suggestion": "ווריאציות קורנר חדשות — טרוסארד בעמדת סיום קרובה", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "קורנרים קטלניים", "frequency": "7 שערים מקורנרים ב-8 משחקים", "severity": "positive"},
    {"pattern": "ניצחונות 1-0 צרים", "frequency": "3 מתוך 4 ניצחונות אחרונים — 1-0", "severity": "medium"},
    {"pattern": "מתקשים לפרוץ בלוק נמוך", "frequency": "חוזר — פולהאם, ווסטהאם", "severity": "medium"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["סליבא מול ווילסון", "סאקה מול קווין", "טרוסארד כאופציה מהספסל"],
    "tactical_focus": "שליטה, סבלנות, ניצול קורנרים, ניהול משחק"
  }$t$
WHERE opponent = 'Fulham' AND date = '2025-10-18'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 9: Crystal Palace (H) 1-0 — 26 Oct 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '3-4-3',
  opponent_attack_style = $t$בלוק נמוך-מאוד עם משולש הגנתי, נגדים דרך אולייסה ומאטטא$t$,
  stats = '{
    "possession": 71,
    "shots": 11,
    "shots_on_target": 3,
    "passes": 621,
    "pass_accuracy": 90,
    "turnovers": 6,
    "xg": 1.23,
    "corners": 9,
    "fouls": 9,
    "offsides": 0
  }',
  video_moments = $t$[
    {"timestamp": "10:00", "note": "פאלאס בבלוק נמוך-מאוד — 10 שחקנים מאחורי הכדור. ארסנל מסתובבים בלי חדירה", "situation_tag": "בנייה"},
    {"timestamp": "25:00", "note": "סאקה בועט מרחוק — עובר מעל. הבעיטה הראשונה של ארסנל אחרי 25 דקות", "situation_tag": "התקפה"},
    {"timestamp": "33:00", "note": "ארסנל סוף סוף בועטים — סאקה מ-20 מטר, השוער עוצר. 33 דקות ללא בעיטה", "situation_tag": "התקפה"},
    {"timestamp": "39:00", "note": "רייס מכניס אספקה, גבריאל נוגח לאחור — אזה מסיים בווליי אקרובטי! 1-0! גול ראשון בארסנל!", "situation_tag": "גול"},
    {"timestamp": "60:00", "note": "פאלאס מנסים להתקדם — אולייסה רץ 50 מטר אבל בועט לצד. לא מאיימים", "situation_tag": "הגנה"},
    {"timestamp": "82:00", "note": "ארסנל מנהלים — החלפות, ניהול זמן, שמירה על הכדור. מקצועיות מושלמת", "situation_tag": "ניהול"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["90% דיוק מסירות — הגבוה ביותר העונה!", "71% חזקה — דומיננטיות מוחלטת", "6 איבודים בלבד — שיא חיובי"],
      "issues": ["33 דקות ללא בעיטה — ההמתנה הארוכה ביותר מאז אפריל 2021", "לא מצאו דרך ממשחק פתוח"],
      "recommendations": ["בעיטות מרחוק מוקדם יותר כדי לפתוח את ההגנה"]
    },
    "transitions": {
      "attack": {
        "strengths": ["אזה עם גול ראשון — רגע מיוחד מול הקבוצה הישנה"],
        "issues": ["תלות בסט-פיסים — שוב הגול מקורנר"],
        "recommendations": ["לגוון דרכי הגעה — לא רק קורנרים"]
      },
      "defense": {
        "strengths": ["פאלאס 0 בעיטות למסגרת!", "ארסנל לא נתנו אף מצב נגד"],
        "issues": ["אין"],
        "recommendations": ["להמשיך"]
      }
    },
    "organized_defense": {
      "strengths": ["3 שערים בלבד ב-13 משחקים בכל המסגרות!", "קלין שיט עשירי", "פאלאס לא הגיעו לרחבה"],
      "issues": ["לא נבחנו אמיתית"],
      "recommendations": ["שמירה על ריכוז"]
    },
    "set_pieces": {
      "strengths": ["שער מקורנר — גבריאל נוגח, אזה מסיים", "9 קורנרים — דומיננטיות"],
      "issues": ["8 קורנרים בלי סכנה — רק אחד הסתיים בגול"],
      "recommendations": ["ווריאציות חדשות מקורנרים"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "פריצה מול בלוק נמוך-מאוד", "drill_suggestion": "תרגול פריצה מול 10 בהגנה — חילופי עמדות, שילובי קיר, בעיטות מרחוק", "priority": "high", "completed": false},
    {"focus": "יצירת מצבים ממשחק פתוח", "drill_suggestion": "חובה ליצור 2 מצבים ממשחק פתוח ב-15 דקות ראשונות", "priority": "high", "completed": false},
    {"focus": "גיוון דרכי הגעה לשער", "drill_suggestion": "לא רק קורנרים — בעיטות מרחוק, חתכים, שילובי 1-2", "priority": "medium", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "תלות בסט-פיסים", "frequency": "5 מתוך 7 ניצחונות — שער מקורנר", "severity": "medium"},
    {"pattern": "ניצחונות 1-0 צרים", "frequency": "4 מתוך 5 ניצחונות אחרונים", "severity": "medium"},
    {"pattern": "הגנה עולמית", "frequency": "3 שערים ב-13 משחקים", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["סליבא מול מאטטא", "אזה מול הקבוצה הישנה", "גבריאל עולה לקורנרים"],
    "tactical_focus": "סבלנות מול בלוק נמוך, קורנרים, ניהול משחק צר"
  }$t$
WHERE opponent = 'Crystal Palace' AND date = '2025-10-26'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';

-- MATCH 10: Burnley (A) 2-0 — 1 Nov 2025
UPDATE public.match_analyses
SET
  analysis_types = ARRAY['freeform', 'stats', 'video'],
  opponent_formation = '4-4-2',
  opponent_attack_style = $t$לחץ גבוה, כדורים ארוכים, פיזיות$t$,
  stats = '{
    "possession": 61,
    "shots": 15,
    "shots_on_target": 6,
    "passes": 502,
    "pass_accuracy": 85,
    "turnovers": 11,
    "xg": 2.31,
    "corners": 8,
    "fouls": 11,
    "offsides": 2
  }',
  video_moments = $t$[
    {"timestamp": "08:00", "note": "ברנלי לוחצים גבוה — ארסנל יוצאים דרך זובימנדי בביטחון. השיעור מליברפול נלמד", "situation_tag": "בנייה"},
    {"timestamp": "18:00", "note": "רייס מכניס קורנר — ג׳וקרש נוגח! 1-0. שוב מקורנר. DNA של ארסנל", "situation_tag": "סט-פיס"},
    {"timestamp": "32:00", "note": "סאקה בועט מ-20 מטר — דוברבקה עוצר ביד אחת. חילוץ מעולה. 1-0 בהפסקה", "situation_tag": "התקפה"},
    {"timestamp": "38:00", "note": "רייס מקבל מאודגארד, נוגח מקרוב — 2-0! נגיחה קלאסית מתנועה מתורגלת", "situation_tag": "גול"},
    {"timestamp": "55:00", "note": "סאקה בועט שוב — דוברבקה שוב עוצר! מנע 4-0", "situation_tag": "התקפה"},
    {"timestamp": "73:00", "note": "פלורנטינו לואיש נוגח — עובר מעל המשקוף. הבעיטה הראשונה של ברנלי למסגרת", "situation_tag": "הגנה"},
    {"timestamp": "85:00", "note": "ארסנל מנהלים בביטחון — ירידה מכוונת בקצב עם עין על צ׳מפיונס ליג ביום שלישי", "situation_tag": "ניהול"}
  ]$t$,
  phase_analysis = $t${
    "buildup": {
      "strengths": ["85% דיוק מסירות — יציב", "61% חזקה — שליטה", "2-0 בהפסקה — ניהול בוגר"],
      "issues": ["מחצית שנייה שאננה — ירידה בקצב"],
      "recommendations": ["לשמור על אינטנסיביות 70 דקות מינימום"]
    },
    "transitions": {
      "attack": {
        "strengths": ["ג׳וקרש + רייס כבשו — שני נשקי הסט-פיסים", "סאקה מסוכן — שתי בעיטות שנחסמו"],
        "issues": ["מחצית שנייה — 0 מצבים אמיתיים"],
        "recommendations": ["שמירה על לחץ התקפי גם ב-2-0"]
      },
      "defense": {
        "strengths": ["ברנלי לא בעטו למסגרת עד דקה 73"],
        "issues": ["פלורנטינו לואיש כמעט כבש — ריכוז ירד"],
        "recommendations": ["לא להוריד ריכוז"]
      }
    },
    "organized_defense": {
      "strengths": ["קלין שיט נוסף — למרות שברנלי ניסו", "סליבא שלט באוויר"],
      "issues": ["ברנלי כמעט כבשו מנגיחה — ריכוז ירד"],
      "recommendations": ["שמירה על ריכוז 90 דקות מלאות"]
    },
    "set_pieces": {
      "strengths": ["שני שערים מסט-פיסים! ג׳וקרש מקורנר + רייס מתנועה מתורגלת", "8 קורנרים — 3 מסוכנים"],
      "issues": ["אין — סט-פיסים מושלמים"],
      "recommendations": ["להמשיך עם הווריאציות הנוכחיות"]
    }
  }$t$,
  training_actions = $t$[
    {"focus": "ריכוז 90 דקות מלאות", "drill_suggestion": "משחקון עם יעד — לשמור על קלין שיט 90 דקות, לא 70", "priority": "medium", "completed": false},
    {"focus": "ניהול עומסים לצ׳מפיונס ליג", "drill_suggestion": "אימון קל ביום שני — ריצה קלה, תרגול סט-פיסים, מתיחות", "priority": "high", "completed": false}
  ]$t$,
  recurring_patterns = $t$[
    {"pattern": "קטלניות מקורנרים", "frequency": "9 שערים מקורנרים ב-10 משחקים!", "severity": "positive"},
    {"pattern": "מחצית שנייה שאננה", "frequency": "חוזר — גם מול לידס, ווסטהאם", "severity": "medium"},
    {"pattern": "9 ניצחונות רצופים", "frequency": "רצף מדהים!", "severity": "positive"}
  ]$t$,
  game_plan = $t${
    "formation": "4-3-3",
    "key_matchups": ["סליבא מול רודריגז", "ג׳וקרש מול בלמים", "סאקה מול מגן שמאלי"],
    "tactical_focus": "ניצחון מקצועי עם ניהול עומסים, סט-פיסים קטלניים"
  }$t$
WHERE opponent = 'Burnley' AND date = '2025-11-01'
  AND user_id = 'c8633898-5dd6-4695-a540-35240cdf6fe0';
