import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Target, Shield, Dumbbell, ChevronRight } from 'lucide-react';

export default function GamePrepAnalysis({ prep, players, onClose, onUpdated }) {
  const [analysis, setAnalysis] = useState(prep.ai_analysis || null);
  const [generating, setGenerating] = useState(!prep.ai_analysis);
  const [team, setTeam] = useState(null);
  const [basePrepData, setBasePrepData] = useState(null);
  const [matchAnalyses, setMatchAnalyses] = useState([]);

  useEffect(() => {
    // Load team + match history for context
    Promise.all([
      base44.entities.Team.filter({ id: prep.team_id }),
      base44.entities.MatchAnalysis.filter({ team_id: prep.team_id }, '-date', 20),
      prep.based_on_prep_id ? base44.entities.GamePrep.filter({ id: prep.based_on_prep_id }) : Promise.resolve([]),
    ]).then(([teams, matches, basePreps]) => {
      setTeam(teams[0] || null);
      setMatchAnalyses(matches);
      setBasePrepData(basePreps[0] || null);
      if (!prep.ai_analysis) generateAnalysis(teams[0], matches, basePreps[0]);
    });
  }, [prep.id]);

  const generateAnalysis = async (teamData, matches, basePrep) => {
    setGenerating(true);
    const t = teamData || team;
    const m = matches || matchAnalyses;
    const bp = basePrep !== undefined ? basePrep : basePrepData;

    const effectivePrepData = {
      formation: prep.opponent_formation || bp?.opponent_formation || '',
      attackStyle: prep.opponent_attack_style || bp?.opponent_attack_style || '',
      defenseStyle: prep.opponent_defense_style || bp?.opponent_defense_style || '',
      strengthLevel: prep.opponent_strength_level || '',
      keyStrength: prep.opponent_key_strength || '',
      keyWeakness: prep.opponent_key_weakness || '',
      dangerousPlayers: prep.opponent_dangerous_players || '',
      patterns: prep.opponent_patterns || '',
    };

    const teamGameStyle = t?.game_style ? JSON.stringify(t.game_style) : 'לא הוגדרה';
    const recentResults = m.slice(0, 5).map(ma => `${ma.opponent}: ${ma.result?.our_score ?? '?'}-${ma.result?.opponent_score ?? '?'}`).join(', ');

    // Find matches vs similar formation
    const similarMatches = m.filter(ma => ma.opponent_formation === effectivePrepData.formation || ma.opponent_attack_style === effectivePrepData.attackStyle);
    const vsFormationRecord = similarMatches.length > 0 
      ? `${similarMatches.filter(ma => (ma.result?.our_score||0) > (ma.result?.opponent_score||0)).length} נצ' מתוך ${similarMatches.length} נגד מערכת/סגנון דומה`
      : '';

    const prompt = `אתה מנטור בכיר — אנליסט עם שנים של ניסיון שמדבר בחום, ישיר, ומוכן להגיד את האמת.
לא כתיבה יבשה ברשימות — כתוב כמו שמנטור מסביר לפני משחק.

קבוצת המאמן:
- שיטת משחק: ${teamGameStyle}
- תוצאות אחרונות: ${recentResults || 'אין עדיין'}
${vsFormationRecord ? `- מאזן מול מערכת/סגנון דומה: ${vsFormationRecord}` : ''}

נתוני ההכנה:
- מערכת יריב: ${effectivePrepData.formation || 'לא ידוע'}
- סגנון התקפי: ${effectivePrepData.attackStyle || 'לא ידוע'}
- סגנון הגנתי: ${effectivePrepData.defenseStyle || 'לא ידוע'}
- עצמת: ${effectivePrepData.strengthLevel || 'לא ידוע'}
${effectivePrepData.keyStrength ? `- נקודת חוזק: ${effectivePrepData.keyStrength}` : ''}
${effectivePrepData.keyWeakness ? `- נקודת חולשה: ${effectivePrepData.keyWeakness}` : ''}
${effectivePrepData.dangerousPlayers ? `- שחקנים מסוכנים: ${effectivePrepData.dangerousPlayers}` : ''}
${effectivePrepData.patterns ? `- דפוסים חוזרים: ${effectivePrepData.patterns}` : ''}
${prep.additional_notes ? `- הערות: ${prep.additional_notes}` : ''}

צור ניתוח הכנה מלא בפורמט הבא (JSON):

{
  "mission": "משפט אחד — מה המשימה שלך במשחק הזה. כמו שמנטור אומר ברגע שנכנסת לחדר. לא כותרת — משפט ישיר ואמיתי.",
  "offensive_points": ["נקודה ספציפית 1 — לא כללית, ספציפית ממש", "נקודה 2", "נקודה 3"],
  "defensive_points": ["נקודה ספציפית הגנתית 1", "נקודה 2", "נקודה 3"],
  "training_topics": ["נושא אימון ספציפי לסגירה הקרובה 1", "נושא 2", "נושא 3"],
  "full_narrative": "פסקה אחת של 4-6 שורות — ניתוח מעמיק בקול של מנטור. חבר בין שיטת המשחק של הקבוצה לאיום הספציפי. לא לפחד לומר את האמת."
}

זכור: לא 'זוהתה בעיה' — אלא 'תראה, הבעיה כאן היא...'. לא 'מומלץ לעבוד על' — אלא 'הדבר הראשון שצריך לעשות הוא...'. עברית בלבד.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          mission: { type: 'string' },
          offensive_points: { type: 'array', items: { type: 'string' } },
          defensive_points: { type: 'array', items: { type: 'string' } },
          training_topics: { type: 'array', items: { type: 'string' } },
          full_narrative: { type: 'string' },
        }
      }
    });

    if (result?.__ai_error) {
      alert(result.__ai_error);
      setGenerating(false);
      return;
    }
    // Save to entity
    await base44.entities.GamePrep.update(prep.id, { ai_analysis: result });
    setAnalysis(result);
    setGenerating(false);
    onUpdated && onUpdated({ ...prep, ai_analysis: result });
  };

  const effectivePrepDisplay = prep.based_on_prep_id && basePrepData
    ? { ...basePrepData, ...prep }
    : prep;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: '#FAF7F2', borderBottom: '1px solid rgba(139,115,85,0.15)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#2C2416' }}>{prep.name}</h2>
            <p className="text-xs" style={{ color: '#9A8672' }}>
              {new Date(prep.date).toLocaleDateString('he-IL')} ·{' '}
              <span style={{ color: prep.prep_type === 'general' ? '#2A5FA8' : '#2A7050' }}>
                {prep.prep_type === 'general' ? 'הכנה כללית' : 'יריב ספציפי'}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#7A6B57' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A5FA8' }} />
              <p className="text-sm font-medium" style={{ color: '#5C4E38' }}>מכין ניתוח מקצועי...</p>
              <p className="text-xs text-center max-w-xs" style={{ color: '#9A8672' }}>המערכת מנתחת את נתוני הקבוצה, ההיסטוריה, ושיטת המשחק שלך מול האיום הספציפי</p>
            </div>
          ) : analysis ? (
            <>
              {/* Mission banner */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(42,112,80,0.12)', border: '2px solid rgba(42,112,80,0.35)' }}>
                <p className="text-[11px] font-bold mb-1 uppercase tracking-wide" style={{ color: '#2A7050' }}>המשימה שלך</p>
                <p className="text-sm font-semibold leading-relaxed" style={{ color: '#1a4a32' }}>{analysis.mission}</p>
              </div>

              {/* Offensive + Defensive cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(185,64,64,0.25)' }}>
                  <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#B94040' }}>
                    <Target className="w-3.5 h-3.5" /> מה לעשות התקפית
                  </p>
                  <div className="space-y-2.5">
                    {(analysis.offensive_points || []).map((pt, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: '#B94040' }}>{i + 1}.</span>
                        <p className="text-xs leading-relaxed" style={{ color: '#2C2416' }}>{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(42,95,168,0.25)' }}>
                  <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#2A5FA8' }}>
                    <Shield className="w-3.5 h-3.5" /> מה לעשות הגנתית
                  </p>
                  <div className="space-y-2.5">
                    {(analysis.defensive_points || []).map((pt, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: '#2A5FA8' }}>{i + 1}.</span>
                        <p className="text-xs leading-relaxed" style={{ color: '#2C2416' }}>{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Training topics */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.25)' }}>
                <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#D97706' }}>
                  <Dumbbell className="w-3.5 h-3.5" /> נושאי עבודה לאימון הסופי
                </p>
                <div className="space-y-2">
                  {(analysis.training_topics || []).map((tp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                      <p className="text-xs font-medium" style={{ color: '#2C2416' }}>{tp}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full narrative */}
              {analysis.full_narrative && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px solid rgba(139,115,85,0.18)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: '#5C4E38' }}>ניתוח מעמיק</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#2C2416' }}>{analysis.full_narrative}</p>
                </div>
              )}

              {/* Prep details table */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: '#5C4E38' }}>פרטי ההכנה שהוזנו</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['מערכת יריב', effectivePrepDisplay.opponent_formation],
                    ['סגנון התקפי', effectivePrepDisplay.opponent_attack_style],
                    ['סגנון הגנתי', effectivePrepDisplay.opponent_defense_style],
                    ['עצמת יריב', prep.opponent_strength_level],
                    ['נקודת חוזק', prep.opponent_key_strength],
                    ['נקודת חולשה', prep.opponent_key_weakness],
                    ['שחקנים מסוכנים', prep.opponent_dangerous_players],
                    ['דפוסים חוזרים', prep.opponent_patterns],
                    ['הערות', prep.additional_notes],
                  ].filter(([_, v]) => v).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <span style={{ color: '#9A8672' }}>{k}</span>
                      <span style={{ color: '#2C2416' }}>{v}</span>
                    </React.Fragment>
                  ))}
                  {prep.recommended_lineup?.length > 0 && (
                    <React.Fragment>
                      <span style={{ color: '#9A8672' }}>הרכב מומלץ</span>
                      <span style={{ color: '#2C2416' }}>
                        {prep.recommended_lineup.map(id => players.find(p => p.id === id)?.name || id).join(', ')}
                      </span>
                    </React.Fragment>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}