import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, Shield, Zap, AlertCircle, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { POSITION_MAPPING } from './PositionRules';
import { 
  buildRecommendedLineup, 
  calculateAttackingIndex, 
  calculateDefensiveIndex,
  calculateAverageFit,
  countChanges 
} from './SmartLineupEngine';

export default function LineupRecommendations({ players, positions, onApply, onClose, currentLineup = [], activeSnapshot }) {
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // DEBUG: Verify snapshot received
  console.log('🎯 LineupRecommendations received snapshot:', activeSnapshot);

  // Generate 3 different lineup strategies
  const generateLineups = () => {
    console.log('🔧 Building recommendations from snapshot...');
    // Balanced mode
    const balancedResult = buildRecommendedLineup(positions, players, 'balanced');
    const balancedChanges = countChanges(currentLineup, balancedResult.lineup);
    const balancedFit = calculateAverageFit(balancedResult.lineup, positions, 'balanced');
    
    // Attacking mode
    const attackingResult = buildRecommendedLineup(positions, players, 'attacking');
    const attackingChanges = countChanges(currentLineup, attackingResult.lineup);
    const attackingIndex = calculateAttackingIndex(attackingResult.lineup);
    const attackingFit = calculateAverageFit(attackingResult.lineup, positions, 'attacking');
    
    // Solid mode
    const solidResult = buildRecommendedLineup(positions, players, 'solid');
    const solidChanges = countChanges(currentLineup, solidResult.lineup);
    const solidIndex = calculateDefensiveIndex(solidResult.lineup);
    const solidFit = calculateAverageFit(solidResult.lineup, positions, 'solid');

    // DEBUG: Verify recommendations are different
    console.log('✅ Recommendations generated:', {
      balanced: balancedResult.lineup.map((p, i) => `${i}: ${p?.name || 'ריק'}`),
      attacking: attackingResult.lineup.map((p, i) => `${i}: ${p?.name || 'ריק'}`),
      solid: solidResult.lineup.map((p, i) => `${i}: ${p?.name || 'ריק'}`),
    });
    
    // Verify they're actually different
    const balancedIds = balancedResult.lineup.map(p => p?.id).join(',');
    const attackingIds = attackingResult.lineup.map(p => p?.id).join(',');
    const solidIds = solidResult.lineup.map(p => p?.id).join(',');
    
    if (balancedIds === attackingIds && attackingIds === solidIds) {
      console.warn('⚠️ WARNING: All three recommendations are IDENTICAL!');
    } else {
      console.log('✓ Recommendations are different');
    }

    return [
      {
        id: 'balanced',
        name: 'הרכב מאוזן',
        description: 'יציבות כללית ואיזון בין הגנה להתקפה',
        icon: Sparkles,
        color: 'blue',
        result: balancedResult,
        stats: {
          changes: balancedChanges,
          fit: balancedFit,
          attackingIndex: calculateAttackingIndex(balancedResult.lineup),
          defensiveIndex: calculateDefensiveIndex(balancedResult.lineup)
        },
        advantages: [
          'איזון טוב בין הגנה להתקפה',
          'מתאים למרבית המצבים',
          'מינימום סיכונים'
        ],
        risks: [
          'לא מקסימלי בשום כיוון',
          'פחות יצירתיות בהתקפה'
        ]
      },
      {
        id: 'attacking',
        name: 'הרכב התקפי',
        description: 'מקסימום כוח התקפי ולחץ',
        icon: Zap,
        color: 'red',
        result: attackingResult,
        stats: {
          changes: attackingChanges,
          fit: attackingFit,
          attackingIndex,
          defensiveIndex: calculateDefensiveIndex(attackingResult.lineup)
        },
        advantages: [
          `כוח התקפי גבוה (${attackingIndex} נק')`,
          'לחץ ויצירת סיכויים',
          'מהירות ודינמיות'
        ],
        risks: [
          'פגיעות הגנתית אפשרית',
          'דורש עבודה קשה בלי כדור'
        ]
      },
      {
        id: 'solid',
        name: 'הרכב סולידי',
        description: 'שמירה על יתרון ויציבות הגנתית',
        icon: Shield,
        color: 'green',
        result: solidResult,
        stats: {
          changes: solidChanges,
          fit: solidFit,
          attackingIndex: calculateAttackingIndex(solidResult.lineup),
          defensiveIndex: solidIndex
        },
        advantages: [
          `יציבות הגנתית (${solidIndex} נק')`,
          'שליטה במשחק',
          'מינימום טעויות'
        ],
        risks: [
          'פחות כוח התקפי',
          'קושי ליצור סיכויים'
        ]
      }
    ];
  };

  const strategies = generateLineups();

  const handleApplyClick = (strategy) => {
    setSelectedResult(strategy);
    setShowConfirmation(true);
  };

  const confirmApply = () => {
    if (selectedResult) {
      onApply(selectedResult.result.lineup);
    }
    setShowConfirmation(false);
  };

  const getChangesList = (currentLineup, proposedLineup) => {
    const changes = [];
    for (let i = 0; i < 11; i++) {
      const current = currentLineup[i];
      const proposed = proposedLineup[i];
      
      if (!proposed) {
        if (current) {
          changes.push({ type: 'remove', player: current, index: i });
        }
        continue;
      }
      
      if (!current) {
        changes.push({ type: 'add', player: proposed, index: i });
      } else if (current.id !== proposed.id) {
        changes.push({ type: 'replace', out: current, in: proposed, index: i });
      }
    }
    return changes;
  };

  if (showConfirmation && selectedResult) {
    const changes = getChangesList(currentLineup, selectedResult.result.lineup);
    
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <Card 
          className="w-full max-w-2xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader>
            <CardTitle style={{ color: 'var(--text-primary)' }}>
              אישור שינויים - {selectedResult.name}
            </CardTitle>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              סקור את השינויים המוצעים לפני אישור
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {changes.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {changes.map((change, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
                    {change.type === 'add' ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          חדש
                        </Badge>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {change.player.name} → {POSITION_MAPPING[change.index] || `עמדה ${change.index + 1}`}
                        </p>
                      </div>
                    ) : change.type === 'remove' ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          הוסר
                        </Badge>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {change.player.name} הוסר מ{POSITION_MAPPING[change.index] || `עמדה ${change.index + 1}`}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          החלפה
                        </Badge>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {POSITION_MAPPING[change.index] || `עמדה ${change.index + 1}`}: {change.out.name} → {change.in.name}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                אין שינויים - ההרכב זהה לנוכחי
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                חזור
              </Button>
              <Button
                onClick={confirmApply}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                אשר שינויים ({changes.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card 
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-5 h-5 text-emerald-400" />
            המלצות מערכת - הרכבים מומלצים
          </CardTitle>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            3 אסטרטגיות מבוססות נתוני שחקנים, חוזקות, והתאמה מדויקת לעמדות
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              const filledCount = strategy.result.lineup.filter(Boolean).length;
              const isComplete = filledCount === 11;
              
              return (
                <Card 
                  key={strategy.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  style={{
                    backgroundColor: strategy.color === 'blue' ? 'var(--state-note-bg)' :
                                     strategy.color === 'red' ? 'rgba(239, 68, 68, 0.08)' :
                                     'var(--state-good-bg)',
                    border: `1px solid ${strategy.color === 'blue' ? 'var(--state-note-border)' :
                                        strategy.color === 'red' ? 'rgba(239, 68, 68, 0.2)' :
                                        'var(--state-good-border)'}`
                  }}
                  onClick={() => setSelectedStrategy(strategy.id === selectedStrategy ? null : strategy.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Icon className={`w-4 h-4 ${
                            strategy.color === 'blue' ? 'text-blue-400' :
                            strategy.color === 'red' ? 'text-red-400' :
                            'text-green-400'
                          }`} />
                          {strategy.name}
                        </CardTitle>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {strategy.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}>
                        {strategy.stats.changes} שינויים
                      </Badge>
                      <Badge variant="outline" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-default)' }}>
                        התאמה: {strategy.stats.fit}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Advantages */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                        <TrendingUp className="w-3 h-3" />
                        יתרונות:
                      </p>
                      {strategy.advantages.slice(0, 2).map((adv, i) => (
                        <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          • {adv}
                        </p>
                      ))}
                    </div>
                    
                    {/* Risks */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold flex items-center gap-1 text-amber-400">
                        <TrendingDown className="w-3 h-3" />
                        סיכונים:
                      </p>
                      {strategy.risks.map((risk, i) => (
                        <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          • {risk}
                        </p>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {filledCount}/11 שחקנים
                      </span>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(strategy);
                        }}
                        disabled={!isComplete}
                        className="h-7 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                      >
                        החל
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed View */}
          {selectedStrategy && (() => {
            const strategy = strategies.find(s => s.id === selectedStrategy);
            if (!strategy) return null;
            
            return (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  פירוט הרכב: {strategy.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {strategy.result.lineup.map((player, index) => {
                    const explanation = strategy.result.explanations[index];
                    const hasWarnings = explanation?.risks?.length > 0;
                    const isEmergency = !player;
                    
                    return (
                      <div 
                        key={index} 
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: isEmergency ? 'var(--state-fix-bg)' : 
                                         hasWarnings ? 'rgba(251, 191, 36, 0.08)' :
                                         'var(--surface-card)',
                          border: `1px solid ${isEmergency ? 'var(--state-fix-border)' :
                                              hasWarnings ? 'rgba(251, 191, 36, 0.2)' :
                                              'var(--border-default)'}`
                        }}
                      >
                        {isEmergency ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-4 h-4" style={{ color: 'var(--state-fix-text)' }} />
                              <p className="text-sm font-semibold" style={{ color: 'var(--state-fix-text)' }}>
                                {POSITION_MAPPING[index] || `עמדה ${index + 1}`} - אין כיסוי
                              </p>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {(explanation?.why && explanation.why[0]) || 'אין שחקן מתאים זמין'}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                                {player.number || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                  {player.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {POSITION_MAPPING[index] || `עמדה ${index + 1}`}
                                </p>
                              </div>
                            </div>
                            {explanation?.why && explanation.why.length > 0 && (
                              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                ✓ {explanation.why.join(' • ')}
                              </p>
                            )}
                            {explanation?.risks && explanation.risks.length > 0 && (
                              <p className="text-xs text-amber-400">
                                ⚠ {explanation.risks.join(' • ')}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            סגור
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}