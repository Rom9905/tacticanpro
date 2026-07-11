import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';

export default function ContextSummary({ context }) {
  if (!context) return null;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {/* Next Game */}
          {context.nextGame && (
            <Link to={createPageUrl('Home')}>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30">
                <div className="p-1 rounded bg-emerald-500/10">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400">המשחק הבא</p>
                  <p className="text-xs font-bold text-white truncate">
                    {context.nextGame.opponent}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Open Issues */}
          <Link to={createPageUrl('DecisionAnalysis')}>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-red-500/30">
              <div className="p-1 rounded bg-red-500/10">
                <AlertCircle className="w-3 h-3 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-400">בעיות פתוחות</p>
                <p className="text-lg font-bold text-white leading-none">
                  {context.openIssuesCount || 0}
                </p>
              </div>
            </div>
          </Link>

          {/* Recurring Patterns */}
          <Link to={createPageUrl('DecisionAnalysis')}>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-orange-500/30">
              <div className="p-1 rounded bg-orange-500/10">
                <TrendingUp className="w-3 h-3 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-400">דפוסים חוזרים</p>
                <p className="text-lg font-bold text-white leading-none">
                  {context.recurringPatterns || 0}
                </p>
              </div>
            </div>
          </Link>

          {/* Pending Training */}
          <Link to={createPageUrl('TrainingCenter')}>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-blue-500/30">
              <div className="p-1 rounded bg-blue-500/10">
                <Target className="w-3 h-3 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-400">אימונים ממתינים</p>
                <p className="text-lg font-bold text-white leading-none">
                  {context.pendingTraining || 0}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Top Issues */}
        {context.topIssues && context.topIssues.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">בעיות מרכזיות:</p>
            <div className="flex flex-wrap gap-0.5">
              {context.topIssues.slice(0, 4).map((issue, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-medium text-slate-200 border-slate-600 px-1.5 py-0.5">
                  {issue.name} ({issue.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}