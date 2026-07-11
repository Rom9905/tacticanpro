// Utility functions for calculating dynamic deadlines based on next game

export function calculateDeadline(severity, nextGame) {
  if (!nextGame || !nextGame.game_date) {
    return null;
  }

  const gameDate = new Date(nextGame.game_date);
  const now = new Date();
  const daysUntilGame = Math.ceil((gameDate - now) / (1000 * 60 * 60 * 24));

  // Critical: Before last training (assume 1 day before game)
  if (severity === 'critical') {
    const lastTrainingDate = nextGame.last_training_before 
      ? new Date(nextGame.last_training_before)
      : new Date(gameDate.getTime() - (24 * 60 * 60 * 1000));
    return lastTrainingDate;
  }

  // High: Within reasonable window (3-4 days before game, or 75% of time left)
  if (severity === 'high') {
    const targetDays = Math.max(3, Math.floor(daysUntilGame * 0.75));
    return new Date(gameDate.getTime() - (targetDays * 24 * 60 * 60 * 1000));
  }

  // Medium: Mid-range (5-7 days before, or 50% of time left)
  if (severity === 'medium') {
    const targetDays = Math.max(5, Math.floor(daysUntilGame * 0.5));
    return new Date(gameDate.getTime() - (targetDays * 24 * 60 * 60 * 1000));
  }

  // Low: Long range (unless game is very close)
  if (severity === 'low') {
    if (daysUntilGame <= 7) {
      // If game is close, bump up urgency
      return new Date(gameDate.getTime() - (Math.floor(daysUntilGame * 0.3) * 24 * 60 * 60 * 1000));
    }
    return new Date(gameDate.getTime() - (10 * 24 * 60 * 60 * 1000));
  }

  return null;
}

export function getDeadlineStatus(deadline) {
  if (!deadline) {
    return { status: 'none', color: 'slate', label: 'ללא דד-ליין' };
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60);
  const daysUntilDeadline = Math.ceil(hoursUntilDeadline / 24);

  if (hoursUntilDeadline < 0) {
    return { 
      status: 'overdue', 
      color: 'red', 
      label: 'חרג מהדד-ליין',
      days: Math.abs(daysUntilDeadline)
    };
  }

  if (hoursUntilDeadline <= 24) {
    return { 
      status: 'urgent', 
      color: 'red', 
      label: 'דחוף - עד מחר',
      hours: Math.ceil(hoursUntilDeadline)
    };
  }

  if (daysUntilDeadline <= 3) {
    return { 
      status: 'soon', 
      color: 'orange', 
      label: `${daysUntilDeadline} ימים`,
      days: daysUntilDeadline
    };
  }

  if (daysUntilDeadline <= 7) {
    return { 
      status: 'approaching', 
      color: 'yellow', 
      label: `${daysUntilDeadline} ימים`,
      days: daysUntilDeadline
    };
  }

  return { 
    status: 'future', 
    color: 'green', 
    label: `${daysUntilDeadline} ימים`,
    days: daysUntilDeadline
  };
}

export function updateDeadlinesForGame(issues, nextGame) {
  return issues.map(issue => {
    const deadline = calculateDeadline(issue.severity, nextGame);
    return {
      ...issue,
      deadline,
      related_game_id: nextGame?.id,
      deadline_status: getDeadlineStatus(deadline)
    };
  });
}