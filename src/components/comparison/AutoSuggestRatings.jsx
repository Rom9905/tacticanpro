// Goalkeeper-specific skill definitions
export const goalkeeperSkills = [
  { key: 'reflexes', label: 'רפלקסים' },
  { key: 'shot_stopping', label: 'עצירות קו' },
  { key: 'one_on_one', label: 'אחד על אחד' },
  { key: 'high_balls', label: 'יציאה לכדורי גובה' },
  { key: 'positioning', label: 'מיקום הגנתי' },
  { key: 'timing', label: 'תזמון יציאה' },
  { key: 'box_control', label: 'שליטה ברחבה' },
  { key: 'short_passing', label: 'מסירה קצרה' },
  { key: 'long_passing', label: 'מסירה ארוכה/דיוק פתיחה' },
  { key: 'decision_under_pressure', label: 'קבלת החלטות תחת לחץ' },
  { key: 'agility', label: 'זריזות' },
  { key: 'jumping', label: 'קפיצה' },
  { key: 'physical_strength', label: 'כוח גוף' },
];

// Field player skill definitions
export const fieldPlayerSkills = [
  { key: 'passing', label: 'מסירה' },
  { key: 'dribbling', label: 'דריבל' },
  { key: 'finishing', label: 'סיומת' },
  { key: 'tackling', label: 'תיקול' },
  { key: 'defensive_positioning', label: 'מיקום הגנתי' },
  { key: 'speed', label: 'מהירות' },
  { key: 'strength', label: 'כוח' },
  { key: 'heading', label: 'משחק ראש' },
  { key: 'vision', label: 'ראייה' },
  { key: 'decision_making', label: 'קבלת החלטות' },
];

// Check if player is a goalkeeper
export function isGoalkeeper(player) {
  return player.position === 'שוער';
}

// Get relevant skills for player
export function getRelevantSkills(player) {
  return isGoalkeeper(player) ? goalkeeperSkills : fieldPlayerSkills;
}

// Auto-suggest skill ratings based on strengths and improvements
export function suggestRatingsFromSkills(player) {
  const ratings = {};
  const isGK = isGoalkeeper(player);
  
  // Skill mapping for field players
  const fieldPlayerMapping = {
    passing: ['מסירות קצרות', 'מסירות ארוכות', 'מסירה', 'פתיחת קווי מסירה'],
    dribbling: ['דריבלים', 'שליטה תחת לחץ', '1 על 1 התקפי'],
    finishing: ['בעיטות', 'סיומת'],
    tackling: ['תיקולים', '1 על 1 הגנתי'],
    defensive_positioning: ['מיקום הגנתי', 'חיפוי הגנתי', 'שמירה על מבנה', 'אחריות טקטית'],
    speed: ['מהירות', 'ריצות עומק'],
    strength: ['כוח פיזי', 'משחק גב'],
    heading: ['משחק ראש', 'כותרות'],
    vision: ['ראיית משחק', 'ראייה', 'קריאת מסירה', 'זיהוי יתרון מספרי'],
    decision_making: ['החלטות', 'קבלת החלטות תחת לחץ', 'קבלת החלטות'],
  };

  // Skill mapping for goalkeepers
  const goalkeeperMapping = {
    reflexes: ['רפלקסים', 'זריזות'],
    shot_stopping: ['עצירות', 'הגנה'],
    one_on_one: ['1 על 1', 'אחד על אחד'],
    high_balls: ['כדורי גובה', 'משחק ראש', 'קפיצה'],
    positioning: ['מיקום', 'מיקום הגנתי'],
    timing: ['תזמון', 'יציאה'],
    box_control: ['שליטה ברחבה', 'שליטה'],
    short_passing: ['מסירות קצרות', 'בנייה משוער'],
    long_passing: ['מסירות ארוכות', 'פתיחות'],
    decision_under_pressure: ['החלטות', 'קבלת החלטות תחת לחץ', 'שליטה תחת לחץ'],
    agility: ['זריזות', 'מהירות'],
    jumping: ['קפיצה'],
    physical_strength: ['כוח פיזי', 'כוח גוף'],
  };

  const skillMapping = isGK ? goalkeeperMapping : fieldPlayerMapping;

  // Start with base rating of 3 for all
  Object.keys(skillMapping).forEach(skill => {
    ratings[skill] = 3;
  });

  // Increase rating if in strengths
  const strengths = player.strengths || [];
  const improvements = player.improvements || [];

  Object.keys(skillMapping).forEach(skillKey => {
    const relatedTerms = skillMapping[skillKey];
    
    // Check strengths
    const hasStrength = strengths.some(s => 
      relatedTerms.some(term => s.includes(term) || term.includes(s))
    );
    
    // Check improvements
    const hasImprovement = improvements.some(s => 
      relatedTerms.some(term => s.includes(term) || term.includes(s))
    );

    if (hasStrength && !hasImprovement) {
      ratings[skillKey] = 4; // Good at this
    } else if (hasStrength && hasImprovement) {
      ratings[skillKey] = 3; // Mixed
    } else if (hasImprovement) {
      ratings[skillKey] = 2; // Needs work
    }
  });

  return ratings;
}