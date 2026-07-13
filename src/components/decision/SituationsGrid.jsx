import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Archive, Shield, TrendingDown, TrendingUp, Zap, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SituationsGrid({ situations, summaries, onEdit, onArchive, onView }) {
  const getCategoryIcon = (category) => {
    const icons = {
      'בניה מאחור': Shield,
      'מעבר הגנתי': TrendingDown,
      'מעבר התקפי': TrendingUp,
      'לחץ': Zap,
      'שליש אחרון': Target,
      'ניהול משחק': Activity
    };
    return icons[category] || Activity;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'בניה מאחור': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'מעבר הגנתי': 'bg-red-500/20 text-red-300 border-red-500/30',
      'מעבר התקפי': 'bg-green-500/20 text-green-300 border-green-500/30',
      'לחץ': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'שליש אחרון': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'ניהול משחק': 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    return colors[category] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const getOccurrenceCount = (situationId) => {
    return summaries.filter(s => s.situation_id === situationId).length;
  };

  const getStatus = (situationId) => {
    const count = getOccurrenceCount(situationId);
    if (count === 0) return { label: 'חדש', color: 'bg-slate-600 text-slate-200' };
    if (count >= 3) return { label: 'חזר', color: 'bg-red-500 text-white' };
    return { label: 'בטיפול', color: 'bg-amber-500 text-white' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {situations.map((situation, i) => {
        const occurrences = getOccurrenceCount(situation.id);
        const status = getStatus(situation.id);
        const CategoryIcon = getCategoryIcon(situation.situation_category);
        
        return (
          <motion.div
            key={situation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card 
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/50 border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer"
              onClick={() => onView(situation)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-12 h-12 rounded-xl ${getCategoryColor(situation.situation_category)} flex items-center justify-center flex-shrink-0`}>
                      <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                        {situation.situation_name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getCategoryColor(situation.situation_category)}>
                          {situation.situation_category}
                        </Badge>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-slate-300">
                          {occurrences} הופעות
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {situation.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {situation.description}
                  </p>
                )}

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(situation)}
                    className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4 ml-2" />
                    ערוך
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onArchive(situation.id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}