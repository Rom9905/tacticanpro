import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { subDays, isWithinInterval } from 'date-fns';
import { useLang } from '@/lib/LanguageContext';

export default function WeeklySummary({ analyses, teamId }) {
  const { t: langT } = useLang();
  const isHe = langT.lang === 'he';
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState(7);

  const getRecentAnalyses = () => {
    const now = new Date();
    const start = subDays(now, timeRange);
    return analyses.filter(a => {
      const matchDate = new Date(a.date);
      return isWithinInterval(matchDate, { start, end: now });
    });
  };

  const generateSummary = async () => {
    setGenerating(true);
    const recentGames = getRecentAnalyses();

    if (recentGames.length === 0) {
      setSummary({
        message: isHe
          ? `לא נמצאו משחקים ב-${timeRange} הימים האחרונים`
          : `No matches found in the last ${timeRange} days`,
        improvements: [], stuck_areas: [], recommendations: []
      });
      setGenerating(false);
      return;
    }

    const gamesText = recentGames.map((a, i) => {
      const issues = a.report?.issues || [];
      const positives = a.report?.positives || [];
      return `Match ${i+1}: vs ${a.opponent} (${a.result.our_score}-${a.result.opponent_score})\nPositives: ${positives.join(', ')}\nIssues: ${issues.join(', ')}`;
    }).join('\n\n');

    const prompt = `You are a professional football analyst. Summarize the team's last ${timeRange} days:

${gamesText}

Create a summary that includes:
1. What improved compared to the previous period (2-3 points)
2. What is stuck and hasn't changed (2-3 points)
3. Specific recommendations for next week (3-4 actions)
4. Is there a recurring issue appearing in all matches?

Be concise and specific. Focus on patterns, not individual games. Reply in ${isHe ? 'Hebrew' : 'English'}.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          improvements: { type: 'array', items: { type: 'string' } },
          stuck_areas: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          recurring_issue: { type: 'string' },
        },
      },
    });

    if (response?.__ai_error) {
      alert(response.__ai_error);
      setSummary(null);
    } else {
      setSummary(response);
      if (teamId) {
        try {
          await base44.entities.Team.update(teamId, {
            weekly_summary_cache: { data: response, timeRange, analysis_count: recentGames.length, updated_at: new Date().toISOString() }
          });
        } catch (e) { console.warn('Failed to cache weekly summary:', e); }
      }
    }
    setGenerating(false);
  };

  useEffect(() => {
    setSummary(null);
    // Load cached summary
    if (teamId) {
      base44.entities.Team.filter({ id: teamId }).then(teams => {
        const cache = teams[0]?.weekly_summary_cache;
        const recentCount = getRecentAnalyses().length;
        if (cache?.data && cache.timeRange === timeRange && cache.analysis_count === recentCount) {
          setSummary(cache.data);
        }
      }).catch(() => {});
    }
  }, [timeRange, analyses]);

  const recentGames = getRecentAnalyses();

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-3">
        {[7, 14, 30].map(days => (
          <Button key={days}
            variant={timeRange === days ? 'default' : 'outline'}
            onClick={() => setTimeRange(days)}
            className={timeRange === days ? 'bg-emerald-600' : ''}>
            {days} {isHe ? 'ימים' : 'days'}
          </Button>
        ))}
        <div className="mr-auto">
          <Button
            onClick={generateSummary}
            disabled={generating || recentGames.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700">
            {generating ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" />{isHe ? 'מייצר סיכום...' : 'Generating...'}</>
            ) : (
              <><Sparkles className="w-4 h-4 ml-2" />{isHe ? 'צור סיכום אוטומטי' : 'Generate Auto Summary'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Games in Range */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">{recentGames.length}</div>
            <div className="text-sm text-slate-400">
              {isHe ? `משחקים ב-${timeRange} הימים האחרונים` : `matches in the last ${timeRange} days`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <div className="space-y-4">
          {summary.improvements?.length > 0 && (
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {isHe ? 'מה השתפר' : 'What Improved'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">{summary.improvements.map((item, i) => <li key={i} className="text-slate-300">• {item}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          {summary.stuck_areas?.length > 0 && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400 flex items-center gap-2">
                  <Minus className="w-5 h-5" />
                  {isHe ? 'מה נתקע' : 'What Is Stuck'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">{summary.stuck_areas.map((item, i) => <li key={i} className="text-slate-300">• {item}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          {summary.recurring_issue && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  {isHe ? 'אזהרה: בעיה חוזרת' : 'Warning: Recurring Issue'}
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-slate-300">{summary.recurring_issue}</p></CardContent>
            </Card>
          )}

          {summary.recommendations?.length > 0 && (
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-400">
                  {isHe ? 'המלצות לשבוע הבא' : 'Recommendations for Next Week'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">{summary.recommendations.map((item, i) => <li key={i} className="text-slate-300">• {item}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          {summary.message && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-12 text-center"><p className="text-slate-400">{summary.message}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {!summary && !generating && recentGames.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              {isHe ? 'לחץ על "צור סיכום אוטומטי" לקבלת תובנות' : 'Click "Generate Auto Summary" to get insights'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}