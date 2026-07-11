import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Calendar, 
  FileText, 
  User,
  Target
} from 'lucide-react';

export default function ModeSelector({ selectedMode, onSelectMode }) {
  const modes = [
    {
      id: 'quick',
      label: 'תשובה מהירה',
      icon: Zap,
      description: 'תשובה ממוקדת וקצרה',
      color: 'emerald'
    },
    {
      id: 'weekly',
      label: 'תכנון שבועי',
      icon: Calendar,
      description: 'בניית מיקרו-מחזור אימונים',
      color: 'blue'
    },
    {
      id: 'match_analysis',
      label: 'ניתוח משחק',
      icon: FileText,
      description: 'חיבור למשחק אחרון',
      color: 'amber'
    },
    {
      id: 'player_development',
      label: 'פיתוח שחקן',
      icon: User,
      description: 'תוכנית אישית לשחקן',
      color: 'purple'
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <Button
            key={mode.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectMode(mode.id)}
            className={`
              flex items-center gap-2 transition-all
              ${isSelected 
                ? `bg-${mode.color}-600 hover:bg-${mode.color}-700 text-white border-${mode.color}-500` 
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <div className="text-right">
              <div className="text-xs font-medium">{mode.label}</div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}