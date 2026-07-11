import React, { useState } from 'react';
import GamePrepList from './GamePrepList';
import GamePrepBalanceTab from './GamePrepBalanceTab';

const INNER_TABS = [
  { id: 'preps', label: 'הכנות' },
  { id: 'balance', label: 'מאזן מול מערכים' },
];

export default function GamePrepTab({ teamId, players, matchAnalyses, onRefresh }) {
  const [innerTab, setInnerTab] = useState('preps');

  return (
    <div>
      {/* Inner tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl"
        style={{ backgroundColor: 'rgba(139,115,85,0.08)', border: '1px solid rgba(139,115,85,0.15)' }}>
        {INNER_TABS.map(tab => (
          <button key={tab.id} onClick={() => setInnerTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: innerTab === tab.id ? '#2A5FA8' : 'transparent',
              color: innerTab === tab.id ? '#fff' : '#5C4E38',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {innerTab === 'preps' && (
        <GamePrepList teamId={teamId} players={players} onRefresh={onRefresh} />
      )}
      {innerTab === 'balance' && (
        <GamePrepBalanceTab teamId={teamId} matchAnalyses={matchAnalyses} />
      )}
    </div>
  );
}