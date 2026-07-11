import React from 'react';
import {
  LayoutDashboard, Calendar, BarChart3, TrendingUp,
  MessageSquare, Clipboard, Users, Brain, Target
} from 'lucide-react';

export const VIEWS = [
  { id: 'summary',       label: 'סיכום',           icon: LayoutDashboard },
  { id: 'calendar',      label: 'לוז',              icon: Calendar },
  { id: 'decision',      label: 'ניתוח החלטות',    icon: Brain },
  { id: 'match',         label: 'ניתוח משחקים',    icon: BarChart3 },
  { id: 'trainingcenter',label: 'מרכז אימונים',    icon: Target },
  { id: 'training',      label: 'ניתוח אימונים',   icon: TrendingUp },
  { id: 'assistant',     label: 'עוזר מאמן',        icon: MessageSquare },
  { id: 'tactical',      label: 'לוח טקטי',         icon: Clipboard },
  { id: 'team',          label: 'ניהול קבוצה',      icon: Users },
];

export default function DashboardNav({ activeView, onSelect }) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-4 py-2"
      style={{ backgroundColor: '#F4EFE6', borderBottom: '1px solid rgba(139,115,85,0.16)' }}
      dir="rtl"
    >
      {VIEWS.map(v => {
        const Icon = v.icon;
        const isActive = activeView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{
              backgroundColor: isActive ? 'rgba(42,112,80,0.13)' : 'transparent',
              color: isActive ? '#2A7050' : '#7A6B57',
              border: isActive ? '1px solid rgba(42,112,80,0.30)' : '1px solid transparent',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}