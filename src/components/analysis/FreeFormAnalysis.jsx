import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Star, Users, Sparkles } from 'lucide-react';

export default function FreeFormAnalysis({ isOpen, onClose, onSave, team, existingMatch }) {
  const [formData, setFormData] = useState({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    result: { our_score: 0, opponent_score: 0 },
    free_notes: '',
    player_ratings: {},
    team_structure_impact: '',
    key_phrases: [],
  });
  const [players, setPlayers] = useState([]);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && team) {
      loadPlayers();
    }
  }, [isOpen, team]);
  
  // Pre-fill from existing match when adding analysis
  useEffect(() => {
    if (existingMatch && isOpen) {
      setFormData(prev => ({
        ...prev,
        opponent: existingMatch.opponent,
        date: existingMatch.date,
        result: existingMatch.result,
      }));
    }
  }, [existingMatch, isOpen]);

  const loadPlayers = async () => {
    if (!team?.id) return;
    const data = await base44.entities.Player.filter({ team_id: team.id });
    setPlayers(data);
    const ratings = {};
    data.forEach(p => {
      ratings[p.id] = { name: p.name, score: 5 };
    });
    setFormData(prev => ({ ...prev, player_ratings: ratings }));
  };

  const updatePlayerRating = (playerId, score) => {
    setFormData(prev => ({
      ...prev,
      player_ratings: {
        ...prev.player_ratings,
        [playerId]: { ...prev.player_ratings[playerId], score }
      }
    }));
  };

  const updatePlayerNote = (playerId, note) => {
    setFormData(prev => ({
      ...prev,
      player_ratings: {
        ...prev.player_ratings,
        [playerId]: { ...prev.player_ratings[playerId], note }
      }
    }));
  };

  const toggleDidNotPlay = (playerId) => {
    setFormData(prev => ({
      ...prev,
      player_ratings: {
        ...prev.player_ratings,
        [playerId]: { ...prev.player_ratings[playerId], did_not_play: !prev.player_ratings[playerId]?.did_not_play }
      }
    }));
  };

  const addKeyPhrase = () => {
    if (currentPhrase.trim()) {
      setFormData(prev => ({
        ...prev,
        key_phrases: [...prev.key_phrases, currentPhrase.trim()]
      }));
      setCurrentPhrase('');
    }
  };

  const removeKeyPhrase = (index) => {
    setFormData(prev => ({
      ...prev,
      key_phrases: prev.key_phrases.filter((_, i) => i !== index)
    }));
  };

  const generateReport = async () => {
    setGenerating(true);
    
    const topPlayers = Object.entries(formData.player_ratings)
      .filter(([, p]) => !p.did_not_play)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 5)
      .map(([, p]) => `${p.name} (${p.score}/10)`)
      .join(', ');

    const bottomPlayers = Object.entries(formData.player_ratings)
      .filter(([, p]) => !p.did_not_play)
      .sort(([, a], [, b]) => a.score - b.score)
      .slice(0, 3)
      .map(([, p]) => `${p.name} (${p.score}/10)`)
      .join(', ');

    const prompt = `אתה מנתח כדורגל מקצועי מומחה. תפקידך לנתח משחקי כדורגל בלבד. כל הניתוח, התובנות וההמלצות חייבות להיות קשורות אך ורק לכדורגל - טקטיקה, מצבי משחק, ביצועי שחקנים על המגרש, שלבי משחק כדורגל. אל תתייחס לנושאים שאינם קשורים ישירות לכדורגל. נתח את המשחק על בסיס התובנות האיכותיות של המאמן, ארגן ופרש בחלוקה לפי שלבי משחק.

### הקשר
קבוצה: ${team?.name || 'הקבוצה שלנו'}
סגנון משחק: ${team?.playing_style || 'לא צוין'}
מערך: ${team?.formation || 'לא צוין'}
נגד: ${formData.opponent}
תוצאה: ${formData.result.our_score}-${formData.result.opponent_score}

### הערות המאמן
${formData.free_notes}

### משפטי מפתח
${formData.key_phrases.length > 0 ? formData.key_phrases.join('\n') : 'לא צוינו'}

### השפעה קבוצתית
${formData.team_structure_impact || 'לא צוין'}

### ציוני שחקנים
מצטיינים: ${topPlayers}
התקשו: ${bottomPlayers}

### משימתך
1. **תוכנית המשחק**: נסח את התמונה הכללית (מה רצינו לעשות, מה קרה בפועל, איפה זה השתבש, למה, ומה עושים עכשיו)
2. **ניתוח לפי שלבי משחק**: חלק את ההערות לפי בנייה מאחור, מעברים, הגנה מסודרת, מצבים נייחים
3. **המלצות לאימון**: כל המלצה מחוברת לדגש אימוני ברור
4. **דפוסים חוזרים**: האם יש בעיות שחוזרות על עצמן? האם יש שיפור לעומת משחקים קודמים?

השתמש במשפטי המפתח שהמאמן ציין. התמקד באיכות ולא בכמות.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          game_plan: {
            type: 'object',
            properties: {
              intended_strategy: { type: 'string' },
              what_happened: { type: 'string' },
              where_it_broke: { type: 'string' },
              why_it_broke: { type: 'string' },
              next_steps: { type: 'string' }
            }
          },
          phase_analysis: {
            type: 'object',
            properties: {
              buildup: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } },
              transitions: { type: 'object', properties: { attack: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } }, defense: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } } } },
              organized_defense: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } },
              set_pieces: { type: 'object', properties: { strengths: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } } }
            }
          },
          training_actions: { type: 'array', items: { type: 'object', properties: { focus: { type: 'string' }, drill_suggestion: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } }
        },
      },
    });

    setGenerating(false);
    
    // Convert player_ratings from object to array — include DNP players with did_not_play flag
    const playerRatingsArray = Object.entries(formData.player_ratings || {})
      .map(([player_id, data]) => ({
        player_id,
        player_name: data.name,
        rating: data.did_not_play ? null : (data.score || null),
        note: data.did_not_play ? '' : (data.note || ''),
        did_not_play: !!data.did_not_play,
      }));
    
    // Convert to legacy format
    const legacyReport = {
      summary: response.summary,
      positives: [...(response.phase_analysis?.buildup?.strengths || []), ...(response.phase_analysis?.transitions?.attack?.strengths || [])].slice(0, 5),
      issues: [...(response.phase_analysis?.buildup?.issues || []), ...(response.phase_analysis?.organized_defense?.issues || [])].slice(0, 5),
      recommendations: response.training_actions?.map(a => `${a.focus}: ${a.drill_suggestion}`).slice(0, 5) || [],
    };
    
    onSave({
      ...formData,
      player_ratings: playerRatingsArray,
      analysis_types: ['freeform'],
      game_plan: response.game_plan,
      phase_analysis: response.phase_analysis,
      training_actions: response.training_actions,
      report: legacyReport,
      analysis_mode: 'freeform',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            מחברת משחק חופשית
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-sm text-slate-300">
              כתוב בחופשיות את מחשבותיך על המשחק. המערכת תארגן ותפרש את התובנות שלך.
            </p>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>יריבה *</Label>
              <Input
                value={formData.opponent}
                onChange={(e) => setFormData(prev => ({ ...prev, opponent: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="שם הקבוצה היריבה"
              />
            </div>
            <div>
              <Label>תאריך *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Score */}
          <div>
            <Label>תוצאה *</Label>
            <div className="flex items-center gap-4 mt-1">
              <Input
                type="number"
                min="0"
                value={formData.result.our_score}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  result: { ...prev.result, our_score: parseInt(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white text-center flex-1"
                placeholder="אנחנו"
              />
              <span className="text-xl font-bold text-slate-500">-</span>
              <Input
                type="number"
                min="0"
                value={formData.result.opponent_score}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  result: { ...prev.result, opponent_score: parseInt(e.target.value) || 0 }
                }))}
                className="bg-slate-800 border-slate-700 text-white text-center flex-1"
                placeholder="יריבה"
              />
            </div>
          </div>

          {/* Free Notes */}
          <div>
            <Label>הערות חופשיות *</Label>
            <Textarea
              value={formData.free_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, free_notes: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white min-h-32"
              placeholder="כתוב בחופשיות על המשחק - מה קרה? מה עבד? מה לא? מה הרגשת?"
            />
          </div>

          {/* Key Phrases */}
          <div>
            <Label>משפטי מפתח (אופציונלי)</Label>
            <p className="text-xs text-slate-500 mb-2">
              משפטים שמגדירים את מהות המשחק - "שלטנו אבל לא סיימנו", "נפלנו אחרי השוויון", וכו׳
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentPhrase}
                onChange={(e) => setCurrentPhrase(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyPhrase()}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="הוסף משפט מפתח..."
              />
              <Button onClick={addKeyPhrase} variant="outline">הוסף</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.key_phrases.map((phrase, i) => (
                <div key={i} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm flex items-center gap-2">
                  {phrase}
                  <button onClick={() => removeKeyPhrase(i)} className="hover:text-purple-100">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Player Ratings */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-400" />
              ציוני שחקנים והערות (אופציונלי)
            </Label>
            <p className="text-xs mb-3" style={{ color: '#9A8672' }}>
              רשום ציון והערה אישית קצרה על כל שחקן (למשל: "לא שמר על מבנה", "מנהיג במגרש")
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto p-2">
              {players.map(player => {
                const dnp = formData.player_ratings[player.id]?.did_not_play;
                return (
                  <div key={player.id} className="p-3 rounded-lg bg-slate-800 space-y-2" style={{ opacity: dnp ? 0.6 : 1 }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{player.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5" style={{ opacity: dnp ? 0.4 : 1 }}>
                          <span className="text-xs text-slate-400">ציון:</span>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.player_ratings[player.id]?.score || 5}
                            onChange={(e) => updatePlayerRating(player.id, parseInt(e.target.value) || 5)}
                            className="w-14 bg-slate-700 border-slate-600 text-white text-center text-sm"
                            disabled={dnp}
                          />
                          <span className="text-xs text-slate-500">/10</span>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!dnp}
                            onChange={() => toggleDidNotPlay(player.id)}
                            className="w-3 h-3 rounded accent-slate-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-500">לא שיחק</span>
                        </label>
                      </div>
                    </div>
                    {!dnp && (
                      <Input
                        placeholder="הערת מאמן (למשל: 'שמר על מבנה', 'איבד ריכוז')"
                        value={formData.player_ratings[player.id]?.note || ''}
                        onChange={(e) => updatePlayerNote(player.id, e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Structure Impact */}
          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              השפעה על מבנה קבוצתי (אופציונלי)
            </Label>
            <Textarea
              value={formData.team_structure_impact}
              onChange={(e) => setFormData(prev => ({ ...prev, team_structure_impact: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="האם המשחק השפיע על הדינמיקה הקבוצתית? על המורל? על הביטחון?"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose}>
              ביטול
            </Button>
            <Button 
              onClick={generateReport}
              disabled={generating || !formData.opponent || !formData.free_notes}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  צור דו״ח ניתוח
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}