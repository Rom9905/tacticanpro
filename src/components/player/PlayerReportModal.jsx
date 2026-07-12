import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, Copy, FileText, Star, Users } from 'lucide-react';

export default function PlayerReportModal({ open, onClose, player, matchAnalyses = [], teamPlayers = [] }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setReport(null);

    const skillRatings = player.skill_ratings || {};
    const matchHistory = (player.match_history || []).slice(-10);
    const relevantAnalyses = matchAnalyses.filter((a) =>
      a.player_ratings?.some((r) => r.player_id === player.id && !r.did_not_play)
    );

    const relevantWithRating = relevantAnalyses.filter((a) =>
      a.player_ratings?.some((r) => r.player_id === player.id && r.rating && !r.did_not_play)
    );
    const avgRating = relevantWithRating.length > 0 ?
      (relevantWithRating.reduce((sum, a) => {
        const r = a.player_ratings?.find((r) => r.player_id === player.id && !r.did_not_play);
        return sum + (r?.rating || 0);
      }, 0) / relevantWithRating.length).toFixed(1) :
      null;

    const skillText = Object.entries(skillRatings).
      filter(([, v]) => v != null).
      map(([k, v]) => `${k}: ${v}/5`).
      join(', ');

    const matchText = matchHistory.map((m) =>
      `${m.date} vs ${m.opponent || 'לא ידוע'}`
    ).join(', ');

    // Calculate overall player score
    const avgSkill = Object.values(skillRatings).filter(v => v != null).length > 0 ?
      (Object.values(skillRatings).filter(v => v != null).reduce((a, b) => a + b, 0) /
        Object.values(skillRatings).filter(v => v != null).length) * 20 :
      50;
    const overallScore = Math.round((avgSkill + (avgRating ? parseFloat(avgRating) * 10 : 50)) / 2);

    const prompt = `
אתה מנהל מקצועי בכיר בכדורגל. כתוב דוח שחקן מנוסח ברור וקצר.

נתוני השחקן:
שם: ${player.name}
עמדה: ${player.position || 'לא הוזנה'}
תפקיד: ${player.role || 'לא הוזן'}
משחקים: ${player.games_played || 0}
גולים: ${player.season_goals || 0}
בישולים: ${player.season_assists || 0}
ציון ממוצע: ${avgRating || 'לא מוגדר'}

יכולות (1-5):
${skillText || 'לא הוזנו'}

חוזקות: ${(player.strengths || []).join(', ') || 'לא הוזנו'}
שיפור: ${(player.improvements || []).join(', ') || 'לא הוזנו'}

---

כתוב דוח בפורמט הבא בדיוק (כל חלק קצר):

## תקציר מקצועי
(2-3 שורות בלבד, כלליות על תרומת השחקן וחוזקותיו העיקריות)

## חוזקות מרכזיות
(רשימת bullet points בלבד, 3-5 חוזקות, כל אחת שורה אחת עם סימן 🟢)

## נקודות לשיפור
(רשימת bullet points בלבד, 3-4 נקודות, כל אחת שורה אחת עם סימן 🔴 או 🟡)

## התאמה לסגנונות משחק
(לכל סגנון: שם ו-3 אפשרויות: 🟢 מתאים מאוד / 🟡 התאמה חלקית / 🔴 מתאים פחות)
סגנונות: לחץ גבוה, בלוק בינוני, משחק מעבר, שליטה בכדור

## תפקידים מומלצים
(עד 3 תפקידים: שם תפקיד, 🟢/🟡/🔴, הסבר קצר שורה אחת)

## המלצות אימון
(רשימת bullet points בלבד, 4 המלצות, כל אחת שורה אחת)

## המלצה טקטית
(משפט אחד עד 3: איך להשתמש בשחקן בצורה אופטימלית וברורה)
`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      if (result?.__ai_error) {
        setReport(result.__ai_error);
      } else {
        setReport(typeof result === 'string' ? result : result?.response || JSON.stringify(result));
      }
    } catch (e) {
      setReport('שגיאה בהפקת הדוח. נסה שוב.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate overall score
  const skillRatings = player.skill_ratings || {};
  const avgSkill = Object.values(skillRatings).filter(v => v != null).length > 0 ?
    (Object.values(skillRatings).filter(v => v != null).reduce((a, b) => a + b, 0) /
      Object.values(skillRatings).filter(v => v != null).length) * 20 :
    50;
  const relevantAnalyses = matchAnalyses.filter((a) =>
    a.player_ratings?.some((r) => r.player_id === player.id && !r.did_not_play)
  );
  const relevantWithRating = relevantAnalyses.filter((a) =>
    a.player_ratings?.some((r) => r.player_id === player.id && r.rating && !r.did_not_play)
  );
  const avgRating = relevantWithRating.length > 0 ?
    (relevantWithRating.reduce((sum, a) => {
      const r = a.player_ratings?.find((r) => r.player_id === player.id && !r.did_not_play);
      return sum + (r?.rating || 0);
    }, 0) / relevantWithRating.length) :
    null;
  const overallScore = Math.round((avgSkill + (avgRating ? parseFloat(avgRating) * 10 : 50)) / 2);

  return (
    <Dialog open={open} onOpenChange={(v) => {if (!v) {onClose();}}}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.25)', color: '#2C2416' }}
        dir="rtl">

        <DialogHeader>
          <DialogTitle style={{ color: '#2C2416' }}>דוח שחקן</DialogTitle>
        </DialogHeader>

        {loading &&
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A7050' }} />
            <p style={{ color: '#7A6B57' }}>מייצר דוח מקצועי...</p>
          </div>
        }

        {!loading && !report ? (
          <div className="space-y-6">
            {/* Player Card */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(42,112,80,0.10)', border: '2px solid rgba(42,112,80,0.25)' }}>
              <div className="flex items-start gap-4">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(139,115,85,0.20)' }}>
                    <Users className="w-10 h-10" style={{ color: '#9A8672' }} />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-1" style={{ color: '#2C2416' }}>{player.name}</h2>
                  <p className="text-sm mb-4" style={{ color: '#7A6B57' }}>
                    {player.position}{player.role ? ` • ${player.role}` : ''}
                  </p>
                  
                  {/* Overall Score */}
                  <div className="mb-3">
                    <div className="text-xs font-bold mb-1" style={{ color: '#2A7050' }}>מד שחקן כללי</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(139,115,85,0.20)' }}>
                        <div className="h-full rounded-full" style={{ width: `${overallScore}%`, backgroundColor: '#2A7050' }} />
                      </div>
                      <span className="font-bold text-lg" style={{ color: '#2A7050' }}>{overallScore}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    <div style={{ backgroundColor: 'rgba(42,112,80,0.15)', borderRadius: '8px', padding: '8px' }} className="text-center">
                      <div className="text-xs" style={{ color: '#7A6B57' }}>⭐ ציון</div>
                      <div className="font-bold" style={{ color: '#2A7050' }}>{avgRating || '-'}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(42,112,80,0.15)', borderRadius: '8px', padding: '8px' }} className="text-center">
                      <div className="text-xs" style={{ color: '#7A6B57' }}>⚽ משחקים</div>
                      <div className="font-bold" style={{ color: '#2A7050' }}>{player.games_played || 0}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(42,112,80,0.15)', borderRadius: '8px', padding: '8px' }} className="text-center">
                      <div className="text-xs" style={{ color: '#7A6B57' }}>🎯 גולים</div>
                      <div className="font-bold" style={{ color: '#2A7050' }}>{player.season_goals || 0}</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(42,112,80,0.15)', borderRadius: '8px', padding: '8px' }} className="text-center">
                      <div className="text-xs" style={{ color: '#7A6B57' }}>🎮 בישולים</div>
                      <div className="font-bold" style={{ color: '#2A7050' }}>{player.season_assists || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <Button onClick={generateReport} style={{ backgroundColor: '#2A7050', color: '#fff', padding: '10px 24px' }}>
                <FileText className="w-4 h-4 ml-2" />
                הפק דוח מלא
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && report && (
          <div className="mt-2 space-y-5">
            <ReportDisplay content={report} />
            
            <div className="pt-4 flex gap-2" style={{ borderTop: '1px solid rgba(139,115,85,0.2)' }}>
              <Button
              variant="outline"
              onClick={generateReport}
              style={{ borderColor: 'rgba(139,115,85,0.3)', color: '#7A6B57' }}>
                הפק מחדש
              </Button>
              <Button onClick={handleCopy} style={{ backgroundColor: '#2A7050', color: '#fff' }}>
                <Copy className="w-3.5 h-3.5 ml-1.5" />
                {copied ? 'הועתק!' : 'העתק דוח'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportDisplay({ content }) {
  const sections = content.split(/(?=##\s)/);

  return (
    <div className="space-y-5">
      {sections.map((section, idx) => {
        const lines = section.split('\n').filter(l => l.trim());
        const headerMatch = lines[0]?.match(/^##\s+(.+?)$/);
        const header = headerMatch ? headerMatch[1] : null;
        const body = lines.slice(headerMatch ? 1 : 0).filter(l => l.trim());

        if (!body.length) return null;

        const isStrengths = header?.includes('חוזקות');
        const isWeaknesses = header?.includes('נקודות לשיפור');
        const isStyleFit = header?.includes('התאמה');
        const isRoles = header?.includes('תפקידים');
        const isTraining = header?.includes('המלצות אימון');
        const isTactical = header?.includes('טקטית');
        const isSummary = header?.includes('תקציר');

        let bgColor = 'rgba(139,115,85,0.06)';
        let headerColor = '#2A7050';

        if (isSummary) {
          bgColor = 'rgba(122,79,160,0.08)';
          headerColor = '#7A4FA0';
        } else if (isStrengths) {
          bgColor = 'rgba(42,112,80,0.08)';
          headerColor = '#2A7050';
        } else if (isWeaknesses) {
          bgColor = 'rgba(220,38,38,0.08)';
          headerColor = '#B94040';
        }

        return (
          <div key={idx} className="p-4 rounded-xl"
            style={{ backgroundColor: bgColor, border: `1px solid rgba(139,115,85,0.18)` }}>
            {header && (
              <h3 className="font-bold text-sm mb-3" style={{ color: headerColor }}>
                {header}
              </h3>
            )}
            <div className={`space-y-2 text-sm`} style={{ color: '#2C2416' }}>
              {body.map((line, i) => (
                <p key={i} className="leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}