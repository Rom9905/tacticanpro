import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomLine from '@/components/ui/BottomLine';
import { Lightbulb, ArrowRight, Target, Trophy, Zap, Dumbbell, CheckCircle2 } from 'lucide-react';
import { isGoalkeeper, goalkeeperSkills, fieldPlayerSkills } from './AutoSuggestRatings';

export default function ComparisonInsights({ players, teamStyle, onAddToLineup }) {
  const analysis = useMemo(() => {
    if (players.length !== 2) return null;

    const [player1, player2] = players;
    const hasGoalkeeper = players.some(p => isGoalkeeper(p));
    const skillAttrs = hasGoalkeeper ? goalkeeperSkills : fieldPlayerSkills;

    // Calculate overall skill average for each player
    const getSkillAverage = (player) => {
      const ratings = skillAttrs.map(skill => player.skill_ratings?.[skill.key] || 0);
      return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    };

    const p1Avg = getSkillAverage(player1);
    const p2Avg = getSkillAverage(player2);
    const betterPlayer = p1Avg > p2Avg ? player1 : player2;
    const otherPlayer = betterPlayer === player1 ? player2 : player1;
    
    // Find key skill differences
    const getTopSkills = (player) => {
      const skills = skillAttrs
        .map(skill => ({
          label: skill.label,
          key: skill.key,
          value: player.skill_ratings?.[skill.key] || 0
        }))
        .filter(s => s.value >= 4)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
      return skills;
    };

    const p1TopSkills = getTopSkills(player1);
    const p2TopSkills = getTopSkills(player2);

    // Determine when to use each player
    const getGameSituations = (player) => {
      const situations = [];
      const strengths = player.strengths || [];
      
      if (strengths.some(s => s.includes('מסירות') || s.includes('בנייה'))) {
        situations.push('משחקי שליטה בכדור');
      }
      if (strengths.some(s => s.includes('מהירות') || s.includes('ריצות'))) {
        situations.push('משחק מעבר מהיר');
      }
      if (strengths.some(s => s.includes('תיקול') || s.includes('הגנה'))) {
        situations.push('משחק הגנתי');
      }
      if (strengths.some(s => s.includes('לחץ') || s.includes('יציאה'))) {
        situations.push('לחץ גבוה');
      }
      if (strengths.some(s => s.includes('כוח') || s.includes('מאבק'))) {
        situations.push('משחק פיזי');
      }
      if (strengths.some(s => s.includes('בעיטות') || s.includes('סיום'))) {
        situations.push('השלמת התקפות');
      }
      
      return situations.length > 0 ? situations : ['משחק כללי'];
    };

    const p1Situations = getGameSituations(player1);
    const p2Situations = getGameSituations(player2);

    // Training focus
    const getTrainingNeeds = (player) => {
      const improvements = player.improvements || [];
      return improvements.slice(0, 3);
    };

    const p1Training = getTrainingNeeds(player1);
    const p2Training = getTrainingNeeds(player2);

    return {
      betterPlayer,
      otherPlayer,
      p1Avg: Math.round(p1Avg * 20), // Convert to percentage
      p2Avg: Math.round(p2Avg * 20),
      p1TopSkills,
      p2TopSkills,
      p1Situations,
      p2Situations,
      p1Training,
      p2Training,
      player1,
      player2
    };
  }, [players]);

  if (!analysis) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-8 text-center text-slate-400">
          יש לבחור בדיוק 2 שחקנים להשוואה מפורטת
        </CardContent>
      </Card>
    );
  }

  const { betterPlayer, otherPlayer, p1Avg, p2Avg, p1TopSkills, p2TopSkills, 
          p1Situations, p2Situations, p1Training, p2Training, player1, player2 } = analysis;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          מה זה אומר למאמן?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <BottomLine
            dataForAI={{
              player1: { name: player1.name, position: player1.position, strengths: player1.strengths, improvements: player1.improvements, skill_avg_pct: p1Avg, top_skills: p1TopSkills.map(s => s.label), situations: p1Situations },
              player2: { name: player2.name, position: player2.position, strengths: player2.strengths, improvements: player2.improvements, skill_avg_pct: p2Avg, top_skills: p2TopSkills.map(s => s.label), situations: p2Situations },
              team_style: teamStyle?.playing_style || teamStyle?.tactical_focus,
            }}
            context="השוואה בין שני שחקני כדורגל"
            cacheKey={`compare-${player1.id}-${player2.id}`}
            color="#D97706"
          />
        </div>
        {/* Grid 2x2 */}
        <div className="grid md:grid-cols-2 gap-4">
          
          {/* 1. Who is better for the lineup */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Trophy className="w-4 h-4" />
                <h3 className="font-semibold text-sm">מי מתאים יותר להרכב</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{player1.name}</span>
                    <span className="text-xs font-bold text-emerald-400">{p1Avg}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${p1Avg}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{player2.name}</span>
                    <span className="text-xs font-bold text-slate-400">{p2Avg}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-500 rounded-full transition-all"
                      style={{ width: `${p2Avg}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-emerald-400 font-semibold mb-1">🟢 יתרון: {betterPlayer.name}</p>
                <div className="space-y-1">
                  <p className="text-xs text-slate-300 font-medium">יתרונות בולטים:</p>
                  {p1Avg > p2Avg ? (
                    p1TopSkills.map((skill, i) => (
                      <p key={i} className="text-xs text-slate-400">• {skill.label}</p>
                    ))
                  ) : (
                    p2TopSkills.map((skill, i) => (
                      <p key={i} className="text-xs text-slate-400">• {skill.label}</p>
                    ))
                  )}
                </div>
              </div>

              {onAddToLineup && (
                <Button
                  size="sm"
                  onClick={() => onAddToLineup(betterPlayer)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  העבר להרכב
                  <ArrowRight className="w-3 h-3 mr-2" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 2. When to use each player */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Zap className="w-4 h-4" />
                <h3 className="font-semibold text-sm">מתי להשתמש בכל שחקן</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white mb-2">{player1.name} מתאים יותר ל:</p>
                <div className="flex flex-wrap gap-1.5">
                  {p1Situations.map((sit, i) => (
                    <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                      {sit}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-sm font-semibold text-white mb-2">{player2.name} מתאים יותר ל:</p>
                <div className="flex flex-wrap gap-1.5">
                  {p2Situations.map((sit, i) => (
                    <Badge key={i} className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                      {sit}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 italic">
                  זה נותן למאמן כלי טקטי להחלטה מול כל יריב
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Training focus */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Dumbbell className="w-4 h-4" />
                <h3 className="font-semibold text-sm">נקודות עבודה באימונים</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white mb-2">{player1.name} צריך לעבוד על:</p>
                {p1Training.length > 0 ? (
                  <ul className="space-y-1">
                    {p1Training.map((item, i) => (
                      <li key={i} className="text-xs text-slate-300">• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">אין נקודות שיפור מזוהות</p>
                )}
              </div>

              <div className="border-t border-slate-700 pt-3">
                <p className="text-sm font-semibold text-white mb-2">{player2.name} צריך לעבוד על:</p>
                {p2Training.length > 0 ? (
                  <ul className="space-y-1">
                    {p2Training.map((item, i) => (
                      <li key={i} className="text-xs text-slate-300">• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">אין נקודות שיפור מזוהות</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 italic">
                  כך המאמן יודע מה לתרגל באימון
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. System recommendation */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="font-semibold text-sm">המלצת מערכת</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {p1Situations.some(s => s.includes('שליטה') || s.includes('בניה')) && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-slate-300 mb-1">אם המטרה היא <span className="font-semibold text-white">שליטה במשחק</span></p>
                  <p className="text-xs text-emerald-400">→ מומלץ לבחור ב{player1.name}</p>
                </div>
              )}

              {p2Situations.some(s => s.includes('מעבר') || s.includes('מהיר')) && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-slate-300 mb-1">אם המטרה היא <span className="font-semibold text-white">משחק מעבר מהיר</span></p>
                  <p className="text-xs text-blue-400">→ עדיף לבחור ב{player2.name}</p>
                </div>
              )}

              {p1Situations.some(s => s.includes('הגנתי') || s.includes('פיזי')) && (
                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <p className="text-xs text-slate-300 mb-1">אם המטרה היא <span className="font-semibold text-white">משחק הגנתי/פיזי</span></p>
                  <p className="text-xs text-violet-400">→ מומלץ לבחור ב{player1.name}</p>
                </div>
              )}

              {teamStyle && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-white">סגנון הקבוצה:</span> {teamStyle.playing_style || teamStyle.tactical_focus || 'לא מוגדר'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </CardContent>
    </Card>
  );
}