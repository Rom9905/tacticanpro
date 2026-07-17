// Position and Role Fit Rules for Lineup Builder

export const POSITION_MAPPING = {
  0: 'שוער',
  1: 'בלם',
  2: 'מגן ימין',
  3: 'מגן שמאל',
  4: 'בלם',
  5: 'קשר הגנתי',
  6: 'קשר מרכזי',
  7: 'קשר התקפי',
  8: 'כנף ימין',
  9: 'חלוץ',
  10: 'כנף שמאל',
};

// Define allowed positions based on primary and secondary positions
export const getAllowedPositions = (player) => {
  const positions = new Set();
  
  if (player.position) positions.add(player.position);
  if (player.position_secondary) positions.add(player.position_secondary);
  
  // Add compatible positions based on role
  if (player.role) {
    const compatiblePositions = getRoleCompatiblePositions(player.role);
    compatiblePositions.forEach(pos => positions.add(pos));
  }
  
  return Array.from(positions);
};

// Map roles to compatible positions
const getRoleCompatiblePositions = (role) => {
  const roleMap = {
    // Goalkeeper
    'שוער יוזם': ['שוער'],
    'שוער שומר': ['שוער'],
    
    // Defenders
    'בלם מוביל': ['בלם', 'מגן ימין', 'מגן שמאל'],
    'בלם כיסוי': ['בלם'],
    'בלם מהיר': ['בלם', 'מגן ימין', 'מגן שמאל'],
    'מגן תומך': ['מגן ימין', 'מגן שמאל', 'בלם'],
    'מגן מכסה': ['מגן ימין', 'מגן שמאל'],
    
    // Midfielders
    'אנקר הגנתי': ['קשר הגנתי', 'בלם'],
    'קשר מאזן': ['קשר הגנתי', 'קשר מרכזי'],
    'קשר מחבר': ['קשר מרכזי', 'קשר התקפי'],
    'קשר עמוק': ['קשר התקפי', 'קשר מרכזי'],
    'בוקס טו בוקס': ['קשר מרכזי', 'קשר התקפי'],
    'יוצר משחק': ['קשר התקפי', 'כנף ימין', 'כנף שמאל'],
    'עשר קלאסי': ['קשר התקפי'],
    
    // Forwards
    'כנף רחב': ['כנף ימין', 'כנף שמאל'],
    'כנף חודרני': ['כנף ימין', 'כנף שמאל', 'קשר התקפי'],
    'כנף חותך': ['כנף ימין', 'כנף שמאל', 'חלוץ'],
    'חלוץ מסיים': ['חלוץ'],
    'חלוץ מטרה': ['חלוץ'],
    'חלוץ נופל': ['חלוץ', 'קשר התקפי'],
    'שני חודים': ['חלוץ'],
  };
  
  return roleMap[role] || [];
};

// Required traits for each position type
export const POSITION_REQUIREMENTS = {
  'שוער': {
    required: ['תיקולים', 'יירוטים', 'מיקום'],
    recommended: ['בנייה משוער', 'החלטות'],
    description: 'שומר שער - דורש כישורים הגנתיים בסיסיים'
  },
  'בלם': {
    required: ['תיקולים', 'כותרות', 'מיקום'],
    recommended: ['כוח פיזי', 'מסירות קצרות', 'החלטות'],
    description: 'מגן מרכזי - דורש יכולות הגנתיות חזקות'
  },
  'מגן ימין': {
    required: ['תיקולים', '1 על 1 הגנתי'],
    recommended: ['מהירות', 'סיבולת', 'צלבות', 'מיקום'],
    description: 'מגן צד - דורש הגנה + תמיכה התקפית'
  },
  'מגן שמאל': {
    required: ['תיקולים', '1 על 1 הגנתי'],
    recommended: ['מהירות', 'סיבולת', 'צלבות', 'מיקום'],
    description: 'מגן צד - דורש הגנה + תמיכה התקפית'
  },
  'קשר הגנתי': {
    required: ['תיקולים', 'מסירות קצרות', 'מיקום'],
    recommended: ['עבודה הגנתית', 'יירוטים', 'סיבולת', 'החלטות'],
    description: 'קשר הגנתי - דורש הגנה ובנייה'
  },
  'קשר מרכזי': {
    required: ['מסירות קצרות', 'ראיה', 'סיבולת'],
    recommended: ['מסירות ארוכות', 'החלטות', 'מיקום'],
    description: 'קשר מרכזי - דורש חיבור משחק'
  },
  'קשר התקפי': {
    required: ['ראיה', 'מסירות קצרות'],
    recommended: ['דריבלים', 'בעיטות', 'יצירתיות', 'החלטות'],
    description: 'קשר התקפי - דורש יצירתיות'
  },
  'כנף ימין': {
    required: ['מהירות', 'דריבלים'],
    recommended: ['צלבות', '1 על 1 התקפי', 'בעיטות', 'ריצות עומק'],
    description: 'כנף - דורש מהירות ויכולת התקפית'
  },
  'כנף שמאל': {
    required: ['מהירות', 'דריבלים'],
    recommended: ['צלבות', '1 על 1 התקפי', 'בעיטות', 'ריצות עומק'],
    description: 'כנף - דורש מהירות ויכולת התקפית'
  },
  'חלוץ': {
    required: ['בעיטות', 'מיקום'],
    recommended: ['כותרות', '1 על 1 התקפי', 'משחק גב', 'ריצות עומק'],
    description: 'חלוץ - דורש סיומת ותנועה'
  },
};

// Check if player fits position
export const checkPositionFit = (player, positionName) => {
  const allowedPositions = getAllowedPositions(player);
  
  // Check if position is allowed
  const isAllowed = allowedPositions.includes(positionName);
  
  if (!isAllowed) {
    return {
      allowed: false,
      severity: 'critical',
      message: `${player.name} לא מתאים לעמדת ${positionName}`,
      suggestion: `עמדות מתאימות: ${allowedPositions.join(', ')}`,
    };
  }
  
  // Check role fit
  const requirements = POSITION_REQUIREMENTS[positionName];
  if (!requirements) {
    return { allowed: true, fit: 'unknown' };
  }
  
  const playerStrengths = player.strengths || [];
  const missingRequired = requirements.required.filter(req => !playerStrengths.includes(req));
  const hasRecommended = requirements.recommended.filter(rec => playerStrengths.includes(rec));
  
  if (missingRequired.length > 0) {
    return {
      allowed: true,
      fit: 'poor',
      severity: 'warning',
      message: `${player.name} ב${positionName} - חסרות תכונות חובה`,
      missingTraits: missingRequired,
      suggestion: `נדרשות: ${missingRequired.join(', ')}`,
    };
  }
  
  if (hasRecommended.length >= 2) {
    return {
      allowed: true,
      fit: 'excellent',
      severity: 'none',
      message: `התאמה מצוינת`,
    };
  }
  
  if (hasRecommended.length === 1) {
    return {
      allowed: true,
      fit: 'good',
      severity: 'info',
      message: `התאמה טובה`,
      suggestion: `יכול להשתפר: ${requirements.recommended.filter(r => !playerStrengths.includes(r)).slice(0, 2).join(', ')}`,
    };
  }
  
  return {
    allowed: true,
    fit: 'acceptable',
    severity: 'info',
    message: `התאמה בסיסית`,
  };
};

// Validate entire lineup. `mapping` maps slot index → Hebrew position
// name for the active format/formation; defaults to the 11v11 mapping.
export const validateLineup = (lineup, _positions, mapping = POSITION_MAPPING) => {
  const issues = [];
  const warnings = [];
  const info = [];
  
  const usedPlayerIds = new Set();
  
  lineup.forEach((player, index) => {
    if (!player) return;
    
    // Check for duplicates
    if (usedPlayerIds.has(player.id)) {
      issues.push({
        type: 'duplicate',
        severity: 'critical',
        player: player.name,
        message: `${player.name} מופיע יותר מפעם אחת בהרכב`,
        positionIndex: index,
      });
      return;
    }
    usedPlayerIds.add(player.id);
    
    // Check position fit
    const positionName = mapping[index];
    const fitResult = checkPositionFit(player, positionName);
    
    if (!fitResult.allowed) {
      issues.push({
        type: 'position_mismatch',
        severity: 'critical',
        player: player.name,
        position: positionName,
        message: fitResult.message,
        suggestion: fitResult.suggestion,
        positionIndex: index,
      });
    } else if (fitResult.severity === 'warning') {
      warnings.push({
        type: 'poor_fit',
        severity: 'warning',
        player: player.name,
        position: positionName,
        message: fitResult.message,
        suggestion: fitResult.suggestion,
        missingTraits: fitResult.missingTraits,
        positionIndex: index,
      });
    } else if (fitResult.severity === 'info') {
      info.push({
        type: 'acceptable_fit',
        severity: 'info',
        player: player.name,
        position: positionName,
        message: fitResult.message,
        suggestion: fitResult.suggestion,
        positionIndex: index,
      });
    }
  });
  
  return { issues, warnings, info };
};