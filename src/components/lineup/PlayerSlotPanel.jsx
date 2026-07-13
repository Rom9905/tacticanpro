import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, User, TrendingUp, AlertCircle } from 'lucide-react';

export default function PlayerSlotPanel({ player, onClose, onRemove, onReplace }) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card 
        className="bg-slate-900 border-slate-800 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                {player.number || '?'}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{player.name}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {player.position}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Strengths */}
          {player.strengths && player.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrendingUp className="w-4 h-4" />
                חוזקות
              </h4>
              <div className="flex flex-wrap gap-2">
                {player.strengths.slice(0, 3).map((strength, i) => (
                  <Badge 
                    key={i} 
                    style={{ 
                      backgroundColor: 'var(--state-good-bg)',
                      color: 'var(--state-good-text)',
                      border: '1px solid var(--state-good-border)'
                    }}
                  >
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {player.improvements && player.improvements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <AlertCircle className="w-4 h-4" />
                נקודות לשיפור
              </h4>
              <div className="flex flex-wrap gap-2">
                {player.improvements.slice(0, 2).map((improvement, i) => (
                  <Badge 
                    key={i}
                    style={{ 
                      backgroundColor: 'var(--state-fix-bg)',
                      color: 'var(--state-fix-text)',
                      border: '1px solid var(--state-fix-border)'
                    }}
                  >
                    {improvement}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="space-y-2 mb-4">
            <Link to={createPageUrl(`PlayerProfile?id=${player.id}`)}>
              <Button variant="outline" className="w-full justify-start text-right" style={{ color: 'var(--link)' }}>
                <User className="w-4 h-4 ml-2" />
                פרופיל שחקן מלא
              </Button>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onReplace}
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              החלף שחקן
            </Button>
            <Button
              variant="outline"
              onClick={onRemove}
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              הסר מההרכב
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}