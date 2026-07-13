import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function PlayerDecisionProfile({ profile, situations: _situations, playerName }) {
  // Empty state - not enough data
  if (!profile || !profile.data_reliability || profile.data_reliability.based_on_matches < 2) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            ניתוח החלטות – תקציר שחקן
          </CardTitle>
          <p className="text-sm text-slate-400 mt-1">
            מבוסס על תיעוד מצבי משחק בהם השחקן היה מעורב
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-slate-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-400">
                נדרשים לפחות 2 תיעודי החלטות כדי ליצור פרופיל אמין.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                תיעודים: {profile?.data_reliability?.based_on_matches || 0}/2
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate the main pattern description
  const generatePatternDescription = () => {
    const topSituation = profile.related_situations?.[0];
    const situationName = topSituation?.situation_name || 'מצבי משחק מגוונים';
    const riskLevel = profile.decision_tendencies?.risk_level;
    const _preferredAction = profile.decision_tendencies?.preferred_action;
    
    let behaviorDescription = '';
    if (riskLevel === 'נמוך') {
      behaviorDescription = 'נוטה לבחור במסירה בטוחה לאחור או לרוחב, גם כאשר קיימת אפשרות למסירה קדימה';
    } else if (riskLevel === 'גבוה') {
      behaviorDescription = 'נוטה לבחור בפתרונות התקפיים ומסירות קדימה, לעיתים תוך נטילת סיכון';
    } else {
      behaviorDescription = 'מאזן בין בחירות בטוחות לבין פתרונות התקפיים בהתאם למצב';
    }
    
    return `ב${situationName}, ${playerName} ${behaviorDescription}.`;
  };

  // Generate context (when it happens)
  const generateContext = () => {
    const matchCount = profile.data_reliability.based_on_matches;
    const totalAppearances = profile.related_situations?.reduce((sum, s) => sum + s.involvement_count, 0) || 0;
    
    return {
      matchCount,
      totalAppearances,
      topSituations: profile.related_situations?.slice(0, 2).map(s => s.situation_name).join(', ') || ''
    };
  };

  // Generate impact points
  const generateImpactPoints = () => {
    const impacts = [];
    const riskLevel = profile.decision_tendencies?.risk_level;
    
    // Always include at least one positive and one cautionary
    if (riskLevel === 'נמוך') {
      impacts.push('מאפשר לקבוצה לשמור על יציבות ושליטה בכדור תחת לחץ');
      impacts.push('מאט את קצב ההתקפה ומקטין מספר כניסות לשליש האחרון');
    } else if (riskLevel === 'גבוה') {
      impacts.push('יוצר אפשרויות התקפיות ומואץ את קצב המשחק');
      impacts.push('עלול להוביל לאובדני כדור במצבים קריטיים');
    } else {
      impacts.push('תורם לגמישות טקטית של הקבוצה');
      impacts.push('יכול לשפר עוד יותר את קריאת המצב בזמן אמת');
    }
    
    return impacts;
  };

  const context = generateContext();
  const impactPoints = generateImpactPoints();
  const confidenceColors = {
    'נמוך': 'bg-slate-500/20 text-slate-400',
    'בינוני': 'bg-blue-500/20 text-blue-400',
    'גבוה': 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-lg">
              ניתוח החלטות – תקציר שחקן
            </CardTitle>
            <p className="text-sm text-slate-400 mt-1">
              מבוסס על תיעוד מצבי משחק בהם השחקן היה מעורב
            </p>
          </div>
          <Badge className={confidenceColors[profile.confidence_level]}>
            {profile.confidence_level}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Pattern - The Most Important Section */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">דפוס החלטה בולט</h3>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
            <p className="text-sm text-white leading-relaxed">
              {generatePatternDescription()}
            </p>
          </div>
        </div>

        {/* Context - When this happens */}
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              הופיע ב־{context.matchCount} משחקים
            </span>
            {context.topSituations && (
              <span className="text-slate-500 text-xs">
                בולט ב: {context.topSituations}
              </span>
            )}
          </div>
        </div>

        {/* Impact on Team Play */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">השפעה על המשחק הקבוצתי</h3>
          <ul className="space-y-2">
            {impactPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-slate-500 text-xs mt-1">•</span>
                <span className="text-sm text-slate-300 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Connection to Team Analysis */}
        <div className="pt-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
            <p className="text-sm text-slate-400">
              הדפוס הזה מופיע גם בניתוח ההחלטות הקבוצתי
            </p>
          </div>
          <Link to={createPageUrl('DecisionAnalysis')}>
            <Button variant="outline" size="sm" className="w-full text-violet-400 border-violet-400/30 hover:bg-violet-500/10">
              <ExternalLink className="w-4 h-4 ml-2" />
              עבור לניתוח החלטות קבוצתי
            </Button>
          </Link>
        </div>

        {/* Meta Information */}
        <div className="pt-4 border-t border-slate-800 space-y-1">
          {profile.last_updated && (
            <p className="text-xs text-slate-500">
              תועד לאחרונה: {new Date(profile.last_updated).toLocaleDateString('he-IL')}
            </p>
          )}
          <p className="text-xs text-slate-500">
            מבוסס על: {profile.data_reliability.based_on_matches} מצבי משחק
          </p>
        </div>
      </CardContent>
    </Card>
  );
}