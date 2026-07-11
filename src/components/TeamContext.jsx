import React, { createContext, useContext, useState, useEffect } from 'react';

const TeamContext = createContext();

export function TeamProvider({ children }) {
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTeamId') || null;
    }
    return null;
  });

  const selectTeam = (teamId) => {
    setSelectedTeamId(teamId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTeamId', teamId);
    }
  };

  return (
    <TeamContext.Provider value={{ selectedTeamId, selectTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
}