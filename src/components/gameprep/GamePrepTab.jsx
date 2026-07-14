import React, { useState } from 'react';
import GamePrepList from './GamePrepList';
import MatchdayHub from './MatchdayHub';

export default function GamePrepTab({ teamId, players, matchAnalyses, onRefresh }) {
  const [selectedPrep, setSelectedPrep] = useState(null);

  if (selectedPrep) {
    return (
      <MatchdayHub
        prep={selectedPrep}
        players={players}
        matchAnalyses={matchAnalyses}
        onBack={() => setSelectedPrep(null)}
        onRefresh={() => { onRefresh?.(); }}
      />
    );
  }

  return <GamePrepList teamId={teamId} players={players} onRefresh={onRefresh} onSelectPrep={setSelectedPrep} />;
}
