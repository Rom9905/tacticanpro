import React from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function LayerManager({ layers, onToggleLayer }) {
  const layerTypes = [
    { 
      id: 'buildup', 
      label: 'Build Up', 
      color: 'cyan', 
      icon: '⚡',
      description: 'מסלולי מסירה ואזורי הנעת כדור'
    },
    { 
      id: 'pressing', 
      label: 'Pressing', 
      color: 'red', 
      icon: '🔥',
      description: 'אזורי לחץ, חסימות ומלכודות'
    },
    { 
      id: 'restDefense', 
      label: 'Rest Defense', 
      color: 'purple', 
      icon: '🛡️',
      description: 'מבנה הגנתי, קומפקטיות ואיזון'
    },
    { 
      id: 'setPieces', 
      label: 'מצבים נייחים', 
      color: 'amber', 
      icon: '⚽',
      description: 'מסלולי ריצה ואזורי יעד'
    },
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;
  const hasOverload = activeCount > 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-500 font-medium">שכבות טקטיות</div>
        {hasOverload && (
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>עומס ויזואלי</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        {layerTypes.map((layer) => {
          const isActive = layers[layer.id];
          const colorMap = {
            cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-300' },
            red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300' },
            purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-300' },
            amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
          };
          const colors = colorMap[layer.color];
          
          return (
            <div key={layer.id} className="space-y-1">
              <button
                onClick={() => onToggleLayer(layer.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                  ${isActive 
                    ? `${colors.bg} border ${colors.border} ${colors.text}` 
                    : 'bg-slate-800/50 border border-slate-700 text-slate-400'
                  }
                  hover:bg-opacity-80
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{layer.icon}</span>
                  <span className="font-medium">{layer.label}</span>
                </div>
                {isActive ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {isActive && (
                <div className="px-3 text-xs text-slate-400 italic">
                  {layer.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}