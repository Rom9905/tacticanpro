// Smart Lineup Engine with position validation, scoring, and duplicate prevention
import { getAllowedPositions, POSITION_MAPPING } from './PositionRules';

// Position fit calculation with strict rules
export const calculatePositionFit = (player, slotPosition) => {
  // Perfect match
  if (player.position === slotPosition) return 40;
  
  // Secondary position match
  const allowedPositions = getAllowedPositions(player);
  if (allowedPositions.includes(slotPosition)) return 25;
  
  // Hard block for cross-family positions
  return -999;
};

// Role fit calculation
const calculateRoleFit = (player, slotPosition) => {
  let score = 0;
  
  const roleRequirements = {
    'שוער': ['בניה משוער', 'ריכוז', 'תיקולים'],
    'בלם': ['משחק גב', '1 על 1 הגנתי', 'כותרות', 'מיקום'],
    'מגן ימין': ['צלבות', 'ריצות עומק', '1 על 1 הגנתי'],
    'מגן שמאל': ['צלבות', 'ריצות עומק', '1 על 1 הגנתי'],
    'קשר הגנתי': ['תיקולים', 'יירוטים', 'מיקום', 'משמעת'],
    'קשר מרכזי': ['מסירות קצרות', 'ראייה', 'החלטות'],
    'קשר התקפי': ['מסירות מפתח', 'ראייה', 'בעיטות', 'ריצות עומק'],
    'כנף ימין': ['דריבלים', 'צלבות', 'מהירות', '1 על 1 התקפי'],
    'כנף שמאל': ['דריבלים', 'צלבות', 'מהירות', '1 על 1 התקפי'],
    'חלוץ': ['בעיטות', 'סיומת', 'משחק גב', 'מיקום']
  };
  
  const requirements = roleRequirements[slotPosition] || [];
  const strengths = player.strengths || [];
  const improvements = player.improvements || [];
  
  // Bonus for matching strengths
  requirements.forEach(req => {
    if (strengths.includes(req)) score += 10;
  });
  
  // Penalty for critical weaknesses
  requirements.forEach(req => {
    if (improvements.includes(req)) score -= 10;
  });
  
  return score;
};

// Style fit calculation based on mode
const calculateStyleFit = (player, mode) => {
  let score = 0;
  const strengths = player.strengths || [];
  const improvements = player.improvements || [];
  
  if (mode === 'attacking') {
    const attackingTraits = ['דריבלים', 'בעיטות', 'מהירות', '1 על 1 התקפי', 'ריצות עומק', 'צלבות'];
    attackingTraits.forEach(trait => {
      if (strengths.includes(trait)) score += 8;
    });
  } else if (mode === 'solid') {
    const defensiveTraits = ['תיקולים', 'יירוטים', 'מיקום', '1 על 1 הגנתי', 'משחק גב', 'כותרות'];
    defensiveTraits.forEach(trait => {
      if (strengths.includes(trait)) score += 8;
    });
    // Penalty for defensive weaknesses in solid mode
    defensiveTraits.forEach(trait => {
      if (improvements.includes(trait)) score -= 12;
    });
  } else { // balanced
    score += 3; // Small bonus for being available
  }
  
  return score;
};

// Fitness penalty calculation
const calculateFitnessPenalty = (player) => {
  const availability = player.availability || player.status || 'זמין';
  const fitnessStatus = player.fitness_status ?? 85;
  
  if (availability === 'פצוע' || availability === 'לא זמין') return -999;
  if (availability === 'מושעה') return -999;
  if (fitnessStatus < 50) return -25;
  if (fitnessStatus < 70) return -15;
  
  return 0;
};

// Squad status bonus
const calculateSquadBonus = (player) => {
  const squadStatus = player.squad_status || 'ספסל';
  if (squadStatus === 'הרכב') return 10;
  if (squadStatus === 'רוטציה') return 5;
  return 0;
};

// Main fit score computation
export const computeFitScore = (player, slotPosition, mode) => {
  const positionFit = calculatePositionFit(player, slotPosition);
  
  // Hard block for out of position
  if (positionFit < 0) return -999;
  
  const roleFit = calculateRoleFit(player, slotPosition);
  const styleFit = calculateStyleFit(player, mode);
  const fitnessPenalty = calculateFitnessPenalty(player);
  const squadBonus = calculateSquadBonus(player);
  
  return positionFit + roleFit + styleFit + fitnessPenalty + squadBonus;
};

// Build recommended lineup with duplicate prevention and MODE-BASED DIFFERENTIATION
export const buildRecommendedLineup = (positions, players, mode) => {
  console.log(`🏗️ Building ${mode} lineup...`);
  
  const lineup = new Array(11).fill(null);
  const usedPlayerIds = new Set(); // CRITICAL: Prevent duplicates
  const explanations = {};
  
  // CRITICAL: Deep clone to prevent reference issues
  const availablePlayers = JSON.parse(JSON.stringify(players));
  
  // Create candidate list for each position with MODE-SPECIFIC SCORING
  const positionCandidates = positions.map((pos, index) => {
    const slotPosition = POSITION_MAPPING[index];
    const candidates = availablePlayers
      .filter(p => {
        const availability = p.availability || p.status || 'זמין';
        return availability === 'זמין';
      })
      .map(p => ({
        player: p,
        score: computeFitScore(p, slotPosition, mode),
        index
      }))
      .filter(c => c.score > -999)
      .sort((a, b) => b.score - a.score);
    
    return { position: pos, index, candidates };
  });
  
  // MODE-SPECIFIC PRIORITY ORDERS - creates different lineups per mode
  let priorityOrder;
  if (mode === 'attacking') {
    // Attacking: prioritize forwards and wings first
    priorityOrder = [
      0,  // GK
      9,  // ST (most important for attacking)
      8, 10, // Wings
      7,  // CAM
      2, 3, // CB
      6,  // CM
      5,  // DM
      1, 4  // Fullbacks
    ];
  } else if (mode === 'solid') {
    // Solid: prioritize defensive positions
    priorityOrder = [
      0,  // GK
      2, 3, // CB (most important for solid)
      1, 4, // Fullbacks
      5,  // DM
      6,  // CM
      7,  // CAM
      8, 10, // Wings
      9   // ST
    ];
  } else {
    // Balanced: standard priority
    priorityOrder = [
      0,  // GK
      2, 3, // CB
      5,  // DM
      6,  // CM
      1, 4, // Fullbacks
      7,  // CAM
      8, 10, // Wings
      9   // ST
    ];
  }
  
  priorityOrder.forEach(slotIndex => {
    const slot = positionCandidates[slotIndex];
    if (!slot) return;
    
    const availableCandidate = slot.candidates.find(c => !usedPlayerIds.has(c.player.id));
    
    if (availableCandidate) {
      lineup[slot.index] = availableCandidate.player;
      usedPlayerIds.add(availableCandidate.player.id);
      console.log(`✓ Slot ${slot.index}: ${availableCandidate.player.name} (locked)`);
      
      // Generate explanation
      explanations[slot.index] = generateExplanation(
        availableCandidate.player,
        slot.position,
        mode,
        slot.candidates
      );
    } else {
      explanations[slot.index] = {
        why: [`אין כיסוי זמין ל${slot.position}`],
        risks: []
      };
    }
  });
  
  console.log(`✅ ${mode} lineup built:`, {
    filledSlots: lineup.filter(Boolean).length,
    players: lineup.map((p, i) => `${POSITION_MAPPING[i]}: ${p?.name || 'ריק'}`),
    usedPlayers: Array.from(usedPlayerIds)
  });
  
  // CRITICAL: Check for duplicates before returning
  const lineupIds = lineup.filter(Boolean).map(p => p.id);
  const hasDuplicates = lineupIds.length !== new Set(lineupIds).size;
  if (hasDuplicates) {
    console.error(`🚨 LINEUP HAS DUPLICATES IN ${mode} MODE!`, lineupIds);
  }
  
  // CRITICAL: Deep clone to prevent reference issues between modes
  return { 
    lineup: JSON.parse(JSON.stringify(lineup)),
    explanations: JSON.parse(JSON.stringify(explanations))
  };
};

// Generate explanation for player selection - CLEAR TEXT ONLY
const generateExplanation = (player, position, mode, _allCandidates) => {
  const why = [];
  const risks = [];
  
  const positionFit = calculatePositionFit(player, position);
  const fitnessStatus = player.fitness_status ?? 85;
  const mentalStatus = player.mental_status ?? 75;
  const strengths = player.strengths || [];
  const improvements = player.improvements || [];
  
  // Position fit explanation
  if (positionFit >= 40) {
    why.push(`זו העמדה הראשית של ${player.name}`);
  } else if (positionFit >= 25) {
    why.push(`${player.name} יכול לשחק ב${position} כעמדה משנית`);
  } else {
    risks.push(`${player.name} לא מוגדר לעמדה זו`);
  }
  
  // Fitness
  if (fitnessStatus >= 85) {
    why.push('מוכנות פיזית מלאה');
  } else if (fitnessStatus >= 70) {
    why.push('מוכנות פיזית טובה');
  } else if (fitnessStatus >= 60) {
    risks.push(`מוכנות פיזית בינונית (${fitnessStatus}%)`);
  } else {
    risks.push(`מוכנות פיזית נמוכה (${fitnessStatus}%)`);
  }
  
  // Mental status for critical positions
  const criticalPositions = ['שוער', 'בלם', 'קשר הגנתי'];
  if (criticalPositions.includes(position) && mentalStatus < 65) {
    risks.push(`מצב מנטלי נמוך (${mentalStatus}%) בעמדת אחריות`);
  }
  
  // Mode-specific reasoning
  if (mode === 'attacking') {
    const attackTraits = strengths.filter(s => ['דריבלים', 'בעיטות', 'מהירות', '1 על 1 התקפי', 'ריצות עומק'].includes(s));
    if (attackTraits.length >= 2) {
      why.push(`מתאים להרכב התקפי: ${attackTraits.slice(0, 2).join(', ')}`);
    } else if (attackTraits.length === 0 && ['כנף ימין', 'כנף שמאל', 'חלוץ', 'קשר התקפי'].includes(position)) {
      risks.push('חסרות יכולות התקפיות מרכזיות');
    }
  } else if (mode === 'solid') {
    const defenseTraits = strengths.filter(s => ['תיקולים', 'מיקום', '1 על 1 הגנתי', 'יירוטים', 'כותרות'].includes(s));
    if (defenseTraits.length >= 2) {
      why.push(`מתאים להרכב סולידי: ${defenseTraits.slice(0, 2).join(', ')}`);
    }
    const defenseWeaknesses = improvements.filter(s => ['תיקולים', 'מיקום', '1 על 1 הגנתי'].includes(s));
    if (defenseWeaknesses.length > 0 && ['בלם', 'מגן ימין', 'מגן שמאל', 'קשר הגנתי'].includes(position)) {
      risks.push(`חולשה הגנתית: ${defenseWeaknesses[0]}`);
    }
  }
  
  return { why, risks };
};

// Calculate attacking index for the lineup
export const calculateAttackingIndex = (lineup) => {
  let score = 0;
  const attackingTraits = ['דריבלים', 'בעיטות', 'מהירות', '1 על 1 התקפי', 'ריצות עומק'];
  
  lineup.forEach(player => {
    if (!player) return;
    const strengths = player.strengths || [];
    attackingTraits.forEach(trait => {
      if (strengths.includes(trait)) score += 1;
    });
  });
  
  return score;
};

// Calculate defensive index for the lineup
export const calculateDefensiveIndex = (lineup) => {
  let score = 0;
  const defensiveTraits = ['תיקולים', 'יירוטים', 'מיקום', '1 על 1 הגנתי', 'משחק גב'];
  
  lineup.forEach(player => {
    if (!player) return;
    const strengths = player.strengths || [];
    defensiveTraits.forEach(trait => {
      if (strengths.includes(trait)) score += 1;
    });
  });
  
  return score;
};

// Calculate average fit score
export const calculateAverageFit = (lineup, positions, mode) => {
  let total = 0;
  let count = 0;
  
  lineup.forEach((player, index) => {
    if (player && positions[index]) {
      const score = computeFitScore(player, positions[index], mode);
      if (score > -999) {
        total += score;
        count++;
      }
    }
  });
  
  return count > 0 ? Math.round(total / count) : 0;
};

// Count changes between two lineups
export const countChanges = (currentLineup, proposedLineup) => {
  let changes = 0;
  for (let i = 0; i < 11; i++) {
    const current = currentLineup[i];
    const proposed = proposedLineup[i];
    if (current?.id !== proposed?.id) {
      changes++;
    }
  }
  return changes;
};