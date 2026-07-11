import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProgramTrendsWidget({ programs, players }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  // Aggregate work topics across all active programs
  const topicCounts = {};
  const playersByTopic = {};

  programs.filter(p => p.status === 'active').forEach(prog => {
    prog.work_topics?.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      if (!playersByTopic[topic]) playersByTopic[topic] = [];
      playersByTopic[topic].push({
        player_id: prog.player_id,
        player_name: players.find(pl => pl.id === prog.player_id)?.name || 'לא ידוע'
      });
    });
  });

  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (sortedTopics.length === 0) {
    return (
      <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
        <CardContent className="py-8 text-center">
          <p className="text-sm" style={{ color: '#9A8672' }}>אין תוכניות אישיות פעילות</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: '#FAF7F2', borderColor: 'rgba(139,115,85,0.18)' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: '#2C2416' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#2A7050' }} />
          מגמות בתוכניות האישיות
        </CardTitle>
        <p className="text-xs mt-1" style={{ color: '#9A8672' }}>
          נושאים שחוזרים אצל שחקנים במערכת
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-xs font-semibold mb-3" style={{ color: '#7A6B57' }}>
            נושאים שחוזרים אצל שחקנים:
          </p>
          {sortedTopics.map(([topic, count]) => {
            const isExpanded = expandedPlayer === topic;
            const playersForTopic = playersByTopic[topic] || [];
            
            return (
              <div key={topic}>
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : topic)}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: isExpanded ? 'rgba(42,112,80,0.08)' : 'rgba(139,115,85,0.06)',
                    border: `1px solid ${isExpanded ? 'rgba(42,112,80,0.22)' : 'rgba(139,115,85,0.14)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 text-right">
                    <Badge
                      style={{
                        backgroundColor: 'rgba(42,112,80,0.15)',
                        color: '#2A7050',
                        border: '1px solid rgba(42,112,80,0.30)',
                        fontSize: '10px'
                      }}
                    >
                      {count} שחקנים
                    </Badge>
                    <span className="text-sm font-medium" style={{ color: '#2C2416' }}>
                      {topic}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: '#7A6B57' }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: '#7A6B57' }} />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 mr-3 pr-3 space-y-1"
                    style={{ borderRight: '2px solid rgba(42,112,80,0.25)' }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: '#7A6B57' }}>
                      שחקנים:
                    </p>
                    {playersForTopic.map((pl, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'rgba(139,115,85,0.06)', color: '#5C4E38' }}>
                        {pl.player_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(41,82,168,0.08)', border: '1px solid rgba(41,82,168,0.22)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#2A5FA8' }}>
            💡 המלצה לאימון קבוצתי הבא
          </p>
          <p className="text-xs" style={{ color: '#5C4E38' }}>
            כדאי לעבוד על: {sortedTopics.slice(0, 3).map(([t]) => t).join(', ')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}