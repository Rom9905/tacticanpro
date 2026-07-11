import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Brain, ArrowRight, Star, Dumbbell, Swords, X, Plus, Trash2, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext';
import { trackEvent } from '@/hooks/useAnalytics';

const TACTICAL_TOPICS_HE = [
  'לחץ גבוה', 'בנייה מהגנה', 'מעברים התקפיים', 'מעברים הגנתיים',
  'תיאום הגנתי', 'מצבים נייחים', 'שחקן נגד שחקן', 'שליטה במרכז',
  'הגנה ארגונית', 'בנייה מהלחץ', 'יציאה מלחץ', 'משחק אורכי', 'כדורים גבוהים'
];

const TACTICAL_TOPICS_EN = [
  'High Press', 'Build-up from Defense', 'Attacking Transitions', 'Defensive Transitions',
  'Defensive Coordination', 'Set Pieces', 'Player vs Player', 'Central Control',
  'Organized Defense', 'Build-up under Pressure', 'Press Escape', 'Long Game', 'High Balls'
];

function TagButton({ label, active, color = '#2A7050', onToggle }) {
  return (
    <button onClick={onToggle}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? `${color}22` : 'rgba(139,115,85,0.06)',
        border: `1.5px solid ${active ? color + '66' : 'rgba(139,115,85,0.18)'}`,
        color: active ? color : '#7A6B57',
      }}>{label}</button>
  );
}

function Section({ icon: SectionIcon, title, color, children }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color }}>
        <SectionIcon className="w-4 h-4" /> {title}
      </label>
      {children}
    </div>
  );
}

export default function ProfessionalSummaryModal({ open, onClose, event, onSaved }) {
  const handleClose = () => {
    trackEvent(event?.parsedNotes?.type === 'training' ? 'training_summary_abandoned' : 'match_summary_abandoned');
    onClose();
  };
  const { t, lang, dir } = useLang();
  const ps = t.proSummary;

  const isTraining = event?.parsedNotes?.type === 'training';
  const TACTICAL_TOPICS = lang === 'en' ? TACTICAL_TOPICS_EN : TACTICAL_TOPICS_HE;

  const [topic, setTopic] = useState('');
  const [tacticalTopics, setTacticalTopics] = useState([]);
  const [whatWorked, setWhatWorked] = useState('');
  const [issuesFound, setIssuesFound] = useState('');
  const [tacticalInsights, setTacticalInsights] = useState('');
  const [decisionsNext, setDecisionsNext] = useState('');
  const [satisfaction, setSatisfaction] = useState(0);
  const [resultOur, setResultOur] = useState('');
  const [resultOpponent, setResultOpponent] = useState('');
  const [opponentFormation, setOpponentFormation] = useState('');
  const [opponentStyle, setOpponentStyle] = useState('');
  const [saving, setSaving] = useState(false);
  const [scorers, setScorers] = useState([]); // { playerId, type: 'שער'|'בישול', minute: '' }
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (open && event?.team_id) {
      base44.entities.Player.filter({ team_id: event.team_id }).then(setPlayers).catch(() => {});
    }
  }, [open, event?.team_id]);

  const addScorerRow = () => setScorers(prev => [...prev, { playerId: '', type: 'שער', minute: '' }]);
  const removeScorerRow = (idx) => setScorers(prev => prev.filter((_, i) => i !== idx));
  const updateScorerRow = (idx, field, value) => setScorers(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-1-4-1'];
  const ATTACK_STYLES = ['לחץ גבוה', 'בנייה מהגנה', 'כדורים ארוכים', 'קטנגות', 'התקפה מהירה', 'כדורים גבוהים', 'התקפה מהצדדים'];

  useEffect(() => {
    if (open) {
      setTopic(''); setTacticalTopics([]); setWhatWorked(''); setIssuesFound('');
      setTacticalInsights(''); setDecisionsNext(''); setSatisfaction(0);
      setResultOur(''); setResultOpponent('');
      setOpponentFormation(''); setOpponentStyle('');
      setScorers([]);
      // Track open
      trackEvent(isTraining ? 'training_summary_started' : 'match_summary_started');
    }
  }, [open]);

  const toggleTopic = (tp) => setTacticalTopics(prev => prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp]);

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    const d = new Date(event.game_date);
    const summaryData = {
      team_id: event.team_id,
      event_id: event.id,
      event_type: isTraining ? 'training' : 'match',
      event_date: d.toISOString().split('T')[0],
      event_label: isTraining ? `Training — ${d.toLocaleDateString('he-IL')}` : `vs ${event.opponent}`,
      duration_minutes: isTraining ? (event.parsedNotes?.duration || 90) : 90,
      topic: topic || '',
      tactical_topics: tacticalTopics,
      what_worked: whatWorked,
      issues_found: issuesFound,
      tactical_insights: tacticalInsights,
      decisions_next: decisionsNext,
      satisfaction,
      ...((!isTraining && resultOur !== '') ? { result_our: Number(resultOur), result_opponent: Number(resultOpponent) } : {}),
      ...((!isTraining && opponentFormation) ? { opponent_formation: opponentFormation } : {}),
      ...((!isTraining && opponentStyle) ? { opponent_attack_style: opponentStyle } : {}),
    };

    const savedSummary = await base44.entities.ProfessionalSummary.create(summaryData);
    await base44.entities.GameSchedule.update(event.id, { status: 'completed' });

    if (!isTraining && event.opponent) {
      const matchDate = d.toISOString().split('T')[0];
      const existingAnalyses = await base44.entities.MatchAnalysis.filter({ team_id: event.team_id });
      const linked = existingAnalyses.find(a => a.summary_id === savedSummary.id || (a.opponent === event.opponent && a.date === matchDate));
      const analysisData = {
        team_id: event.team_id, summary_id: savedSummary.id,
        opponent: event.opponent, date: matchDate,
        result: resultOur !== '' ? { our_score: Number(resultOur), opponent_score: Number(resultOpponent) } : undefined,
        free_notes: [whatWorked && `✓ ${whatWorked}`, issuesFound && `⚠ ${issuesFound}`, tacticalInsights && `💡 ${tacticalInsights}`, decisionsNext && `→ ${decisionsNext}`].filter(Boolean).join('\n\n'),
        key_phrases: tacticalTopics,
        report: {
          summary: topic || '',
          positives: whatWorked ? [whatWorked] : [],
          issues: issuesFound ? [issuesFound] : [],
          recommendations: decisionsNext ? [decisionsNext] : [],
        },
      };
      if (linked) {
        await base44.entities.MatchAnalysis.update(linked.id, {
          summary_id: savedSummary.id,
          result: analysisData.result || linked.result,
          ...(opponentFormation && { opponent_formation: opponentFormation }),
          ...(opponentStyle && { opponent_attack_style: opponentStyle }),
          free_notes: analysisData.free_notes,
          key_phrases: [...new Set([...(linked.key_phrases || []), ...tacticalTopics])],
          report: {
            summary: analysisData.report.summary || linked.report?.summary,
            positives: [...(linked.report?.positives || []), ...analysisData.report.positives],
            issues: [...(linked.report?.issues || []), ...analysisData.report.issues],
            recommendations: [...(linked.report?.recommendations || []), ...analysisData.report.recommendations],
          },
        });
      } else {
        await base44.entities.MatchAnalysis.create({
          ...analysisData,
          ...(opponentFormation && { opponent_formation: opponentFormation }),
          ...(opponentStyle && { opponent_attack_style: opponentStyle }),
        });
      }
    }

    // Update player stats for goals & assists
    const validScorers = scorers.filter(s => s.playerId);
    if (validScorers.length > 0) {
      const playerMap = {};
      validScorers.forEach(s => {
        if (!playerMap[s.playerId]) playerMap[s.playerId] = { goals: 0, assists: 0 };
        if (s.type === 'שער') playerMap[s.playerId].goals += 1;
        else playerMap[s.playerId].assists += 1;
      });
      await Promise.all(Object.entries(playerMap).map(async ([playerId, delta]) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;
        return base44.entities.Player.update(playerId, {
          season_goals: (player.season_goals || 0) + delta.goals,
          season_assists: (player.season_assists || 0) + delta.assists,
          games_played: (player.games_played || 0) + 1,
        });
      }));
    }

    // Create TacticalGoal entries from issues found
    if (issuesFound && issuesFound.trim()) {
      const issueItems = issuesFound.split(/[,،\n]/).map(s => s.trim()).filter(Boolean);
      for (const issue of issueItems) {
        try {
          await base44.entities.TacticalGoal.create({
            team_id: event.team_id,
            title: issue.substring(0, 80),
            description: issue,
            priority: 'medium',
            status: 'active',
            source: isTraining ? 'training' : 'match',
          });
        } catch {}
      }
    }

    trackEvent(isTraining ? 'training_summary_completed' : 'match_summary_completed');
    base44.functions.invoke('analyzeTeamProgress', { teamId: event.team_id }).catch(() => {});
    onSaved && onSaved();
    onClose();
    setSaving(false);
  };

  if (!open) return null;

  const eventLabel = isTraining
    ? `Training — ${new Date(event?.game_date || Date.now()).toLocaleDateString('he-IL')}`
    : `vs ${event?.opponent || ''}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} dir={dir}>
      <div className="absolute inset-0" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#2C2416' }}>
            {isTraining
              ? <Dumbbell className="w-4 h-4" style={{ color: '#2A7050' }} />
              : <Swords className="w-4 h-4" style={{ color: '#2A5FA8' }} />}
            {ps.titlePrefix} {eventLabel}
          </h2>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:opacity-70"
            style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#7A6B57' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <Section icon={Brain} title={isTraining ? ps.trainingTopic : ps.matchNote} color="#5C4E38">
            <input className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
              placeholder={isTraining ? ps.trainingTopicPlaceholder : ps.matchNotePlaceholder}
              value={topic} onChange={e => setTopic(e.target.value)} />
          </Section>

          {!isTraining && (
            <Section icon={Swords} title={ps.matchResult} color="#2A5FA8">
              <div className="flex items-center gap-3 mb-3">
                <input type="number" min="0" max="20"
                  className="w-16 rounded-lg px-2 py-2 text-sm text-center font-bold"
                  style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
                  placeholder={ps.ourScore} value={resultOur} onChange={e => setResultOur(e.target.value)} />
                <span className="text-sm font-semibold" style={{ color: '#9A8672' }}>:</span>
                <input type="number" min="0" max="20"
                  className="w-16 rounded-lg px-2 py-2 text-sm text-center font-bold"
                  style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416' }}
                  placeholder={ps.opponentScore} value={resultOpponent} onChange={e => setResultOpponent(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#7A6B57' }}>מערכת היריב</p>
                  <select value={opponentFormation} onChange={e => setOpponentFormation(e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: opponentFormation ? '#2C2416' : '#9A8672' }}>
                    <option value="">בחר...</option>
                    {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#7A6B57' }}>סגנון היריב</p>
                  <select value={opponentStyle} onChange={e => setOpponentStyle(e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: opponentStyle ? '#2C2416' : '#9A8672' }}>
                    <option value="">בחר...</option>
                    {ATTACK_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </Section>
          )}

          <Section icon={Brain} title={ps.tacticalTopics} color="#5C4E38">
            <div className="flex flex-wrap gap-2">
              {TACTICAL_TOPICS.map(tp => (
                <TagButton key={tp} label={tp} active={tacticalTopics.includes(tp)} onToggle={() => toggleTopic(tp)} />
              ))}
            </div>
          </Section>

          <Section icon={CheckCircle2} title={ps.whatWorked} color="#2A7050">
            <Textarea placeholder={ps.whatWorkedPlaceholder} value={whatWorked} onChange={e => setWhatWorked(e.target.value)}
              className="min-h-[70px] text-sm resize-none"
              style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
          </Section>

          <Section icon={XCircle} title={ps.issues} color="#B94040">
            <Textarea placeholder={ps.issuesPlaceholder} value={issuesFound} onChange={e => setIssuesFound(e.target.value)}
              className="min-h-[70px] text-sm resize-none"
              style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
          </Section>

          <Section icon={Brain} title={ps.tacticalInsights} color="#7A2A8A">
            <Textarea placeholder={ps.tacticalInsightsPlaceholder} value={tacticalInsights} onChange={e => setTacticalInsights(e.target.value)}
              className="min-h-[70px] text-sm resize-none"
              style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
          </Section>

          <Section icon={ArrowRight} title={ps.decisionsNext} color="#B97A2A">
            <Textarea placeholder={ps.decisionsNextPlaceholder} value={decisionsNext} onChange={e => setDecisionsNext(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              style={{ backgroundColor: '#F0EBE2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }} />
          </Section>

          {!isTraining && (
            <div>
              <label className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#2A5FA8' }}>
                <Trophy className="w-4 h-4" /> כבשנים ובישולים
              </label>
              <div className="space-y-2">
                {scorers.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={row.playerId}
                      onChange={e => updateScorerRow(idx, 'playerId', e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-sm"
                      style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: row.playerId ? '#2C2416' : '#9A8672' }}>
                      <option value="">בחר שחקן...</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select
                      value={row.type}
                      onChange={e => updateScorerRow(idx, 'type', e.target.value)}
                      className="rounded-lg px-2 py-1.5 text-sm"
                      style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416', width: 90 }}>
                      <option value="שער">שער</option>
                      <option value="בישול">בישול</option>
                    </select>
                    <input
                      type="number" min="1" max="120" placeholder="דקה"
                      value={row.minute}
                      onChange={e => updateScorerRow(idx, 'minute', e.target.value)}
                      className="rounded-lg px-2 py-1.5 text-sm text-center"
                      style={{ backgroundColor: '#F0EBE2', border: '1px solid rgba(139,115,85,0.25)', color: '#2C2416', width: 64 }} />
                    <button onClick={() => removeScorerRow(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ backgroundColor: 'rgba(185,64,64,0.10)', color: '#B94040' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addScorerRow}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: 'rgba(42,95,168,0.10)', color: '#2A5FA8', border: '1px solid rgba(42,95,168,0.20)' }}>
                <Plus className="w-3.5 h-3.5" /> הוסף
              </button>
            </div>
          )}

          <Section icon={Star} title={ps.satisfaction} color="#5C4E38">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setSatisfaction(n)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{
                    backgroundColor: satisfaction === n ? 'rgba(42,112,80,0.18)' : 'rgba(139,115,85,0.06)',
                    border: `1.5px solid ${satisfaction === n ? 'rgba(42,112,80,0.45)' : 'rgba(139,115,85,0.18)'}`,
                    color: satisfaction === n ? '#2A7050' : '#9A8672',
                  }}>{n}</button>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(139,115,85,0.15)' }}>
          <Button variant="ghost" onClick={handleClose} className="flex-1" style={{ color: '#7A6B57' }}>{ps.cancel}</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1"
            style={{ backgroundColor: '#2A7050', color: '#fff' }}>
            {saving ? ps.saving : ps.save}
          </Button>
        </div>
      </div>
    </div>
  );
}