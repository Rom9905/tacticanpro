// Critical Issues Detection Engine
import { getAllowedPositions, POSITION_MAPPING } from './PositionRules';

// Position fit calculation - checks if player matches slot requirements
export const calculatePositionFit = (player, slotPosition) => {
  // Get all positions this player can play
  const allowedPositions = getAllowedPositions(player);
  
  // Perfect match - primary position
  if (player.position === slotPosition) return 1.0;
  
  // Good match - secondary or role-based position
  if (allowedPositions.includes(slotPosition)) return 0.75;
  
  // No match - player cannot play this slot
  return 0.0;
};

// Validate no duplicate players
export const validateNoDuplicatePlayers = (lineup) => {
  const used = new Set();
  const duplicates = [];
  
  lineup.forEach((player, index) => {
    if (!player) return;
    if (used.has(player.id)) {
      duplicates.push({ player, index });
    } else {
      used.add(player.id);
    }
  });
  
  return duplicates;
};

// Auto-fix duplicates by clearing them
export const autoFixDuplicates = (lineup) => {
  const used = new Set();
  const fixed = lineup.map((player) => {
    if (!player) return null;
    if (used.has(player.id)) return null; // Clear duplicate
    used.add(player.id);
    return player;
  });
  return fixed;
};

// CRITICAL: Generate issues ONLY from ActiveLineupSnapshot
export const generateCriticalIssues = (team, lineup, positions, activeSnapshot = null) => {
  const issues = [];
  
  // If no snapshot provided, build from lineup (fallback)
  const workingSnapshot = activeSnapshot || {
    slots: lineup.map((player, index) => ({
      slotIndex: index,
      positionCode: POSITION_MAPPING[index],
      player,
      playerId: player?.id || null
    }))
  };

  console.log('🔍 CriticalIssuesEngine - Working from snapshot:', workingSnapshot);

  // 1) Duplicate player check - FROM SNAPSHOT ONLY
  const playerIds = workingSnapshot.slots
    .filter(s => s.playerId)
    .map(s => s.playerId);
    
  const duplicateIds = playerIds.filter((id, idx) => playerIds.indexOf(id) !== idx);
  const uniqueDuplicates = [...new Set(duplicateIds)];

  uniqueDuplicates.forEach(dupId => {
    const slot = workingSnapshot.slots.find(s => s.playerId === dupId);
    if (slot?.player) {
      issues.push({
        severity: 'CRITICAL',
        type: 'duplicate',
        title: `כפילויות בהרכב: ${slot.player.name}`,
        whyThisMatters: 'אותו שחקן משובץ ביותר מעמדה אחת ולכן ההרכב לא חוקי.',
        evidence: {
          duplicateCount: workingSnapshot.slots.filter(s => s.playerId === dupId).length,
          player: slot.player.name
        },
        actionNow: [
          'לחץ "תקן אוטומטית" כדי לנקות כפילויות',
          'בחר מחליפים בעמדות שהתפנו'
        ],
        relatedPlayers: [dupId],
        relatedSlots: workingSnapshot.slots.filter(s => s.playerId === dupId).map(s => s.slotIndex),
        autoFixAvailable: true
      });
    }
  });
  
  // 2) Position fit checks - FROM SNAPSHOT ONLY
  workingSnapshot.slots.forEach((slot) => {
    if (!slot.player) return;
    
    const player = slot.player;
    const slotPosition = slot.positionCode;
    const allowedPositions = getAllowedPositions(player);
    
    console.log(`🔎 Slot ${slot.slotIndex} (${slotPosition}): ${player.name}`, {
      primaryPos: player.position,
      secondaryPos: player.position_secondary,
      allowedPositions,
      canPlay: allowedPositions.includes(slotPosition)
    });
    
    // Check if player can play this slot at all
    const canPlay = allowedPositions.includes(slotPosition);
    
    if (!canPlay) {
      // This is a true mismatch - player cannot play this position
      const playerPrimaryPos = player.position || 'לא מוגדר';
      const playerSecondaryPos = player.position_secondary ? `, ${player.position_secondary}` : '';
      
      issues.push({
        severity: 'CRITICAL',
        type: 'position_mismatch',
        title: `שיבוץ בלתי אפשרי: ${player.name}`,
        whyThisMatters: `השחקן מוצב כ${slotPosition}, אך כל העמדות שהוגדרו לו הן: ${playerPrimaryPos}${playerSecondaryPos}. זהו שיבוץ מחוץ לעמדה לחלוטין.`,
        evidence: {
          playerPositions: `${playerPrimaryPos}${playerSecondaryPos}`,
          slotRequired: slotPosition,
          playerRole: player.role || 'לא מוגדר',
          slotIndex: slot.slotIndex
        },
        actionNow: [
          `החלף ${player.name} לשחקן שיכול לשחק ${slotPosition}`,
          `או הזז את ${player.name} לאחת מעמדותיו: ${allowedPositions.join(', ')}`
        ],
        relatedPlayers: [player.id],
        relatedSlots: [slot.slotIndex],
        autoFixAvailable: false
      });
    }
  });
  
  // 3) Readiness checks - FROM SNAPSHOT ONLY
  workingSnapshot.slots.forEach((slot) => {
    if (!slot.player) return;
    
    const player = slot.player;
    const positionName = slot.positionCode;
    const fitnessStatus = player.fitness_status ?? 85;
    const mentalStatus = player.mental_status ?? 75;
    const availability = player.availability || player.status || 'זמין';
    
    // Fitness check
    if (fitnessStatus < 60) {
      issues.push({
        severity: 'HIGH',
        type: 'low_fitness',
        title: `מוכנות פיזית נמוכה: ${player.name}`,
        whyThisMatters: 'שחקן בכושר נמוך בהרכב מעלה סיכון לירידה חדה בביצועים ופציעה.',
        evidence: {
          fitnessStatus,
          position: positionName,
          squadStatus: player.squad_status || 'לא מוגדר'
        },
        actionNow: [
          'הגדר דקות מוגבלות או חילוף מתוכנן',
          'שקול אלטרנטיבה מהסגל'
        ],
        relatedPlayers: [player.id],
        relatedSlots: [slot.slotIndex],
        autoFixAvailable: false
      });
    }
    
    // Mental check for critical positions
    const criticalPositions = ['שוער', 'בלם', 'קשר הגנתי'];
    if (mentalStatus < 55 && criticalPositions.includes(positionName)) {
      issues.push({
        severity: 'HIGH',
        type: 'low_mental',
        title: `מצב מנטלי נמוך בעמדה קריטית: ${player.name}`,
        whyThisMatters: 'מצב מנטלי נמוך בעמדת אחריות עלול להוביל להחלטות לא נכונות במצבי לחץ.',
        evidence: {
          mentalStatus,
          position: positionName
        },
        actionNow: [
          'הורד סיכון בקבלת החלטות (הוראות)',
          'תרגיל ייעודי לבניית ביטחון'
        ],
        relatedPlayers: [player.id],
        relatedSlots: [slot.slotIndex],
        autoFixAvailable: false
      });
    }
    
    // Availability check
    if (availability !== 'זמין') {
      issues.push({
        severity: 'CRITICAL',
        type: 'unavailable',
        title: `שחקן לא זמין בהרכב: ${player.name}`,
        whyThisMatters: `השחקן מסומן כ"${availability}" ולא יכול לשחק.`,
        evidence: {
          availability,
          position: positionName
        },
        actionNow: [
          'החלף לשחקן זמין',
          'עדכן סטטוס אם השחקן חזר לזמינות'
        ],
        relatedPlayers: [player.id],
        relatedSlots: [slot.slotIndex],
        autoFixAvailable: false
      });
    }
  });
  
  // 4) Match logs evidence (if available) - FROM SNAPSHOT ONLY
  workingSnapshot.slots.forEach((slot) => {
    if (!slot.player || !slot.player.match_history) return;
    
    const player = slot.player;
    const last3 = player.match_history.slice(-3);
    if (last3.length < 2) return;
    
    // Check for recurring weaknesses
    const improvements = player.improvements || [];
    const badNotes = last3.map(m => m.note || '').join(' ').toLowerCase();
    
    improvements.forEach(weakness => {
      const hits = (badNotes.match(new RegExp(weakness.toLowerCase(), 'g')) || []).length;
      if (hits >= 2) {
        issues.push({
          severity: 'HIGH',
          type: 'recurring_weakness',
          title: `חולשה חוזרת: ${player.name} – ${weakness}`,
          whyThisMatters: 'מה שתועד בפועל תואם חולשה מסומנת ולכן זה כרגע גורם ביצוע משמעותי.',
          evidence: {
            weakness,
            occurrences: hits,
            lastMatches: last3.map(m => m.date || 'לא ידוע').slice(0, 3)
          },
          actionNow: [
            'עדכן/צור תוכנית אימונים ישירה לחולשה זו',
            'במשחק הקרוב: הוראה שמפחיתה חשיפה לסיטואציה'
          ],
          relatedPlayers: [player.id],
          relatedSlots: [slot.slotIndex],
          autoFixAvailable: false
        });
      }
    });
  });
  
  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
};

// Generate readiness report
export const generateReadinessReport = (team, lineup, positions, activeSnapshot = null) => {
  const issues = generateCriticalIssues(team, lineup, positions, activeSnapshot);
  
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  
  const legalityOk = criticalIssues.length === 0;
  const topFixes = issues.slice(0, 3).map(i => i.title);
  
  return {
    legalityOk,
    criticalCount: criticalIssues.length,
    highCount: highIssues.length,
    mediumCount: issues.filter(i => i.severity === 'MEDIUM').length,
    topFixes,
    issues,
    summary: legalityOk ? 
      (highIssues.length > 0 ? 'ההרכב חוקי אך יש סיכונים' : 'ההרכב מוכן למשחק') :
      'יש בעיות קריטיות שחוסמות את ההרכב'
  };
};