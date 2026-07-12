// The data pipeline (players.match_history + player_attribute_history) is
// maintained by DB triggers on match_analyses and training_session_evaluations
// (see supabase/migrations/20260713020000_rating_pipeline.sql), so it works for
// every write path. This helper only decides when to fire the AI attribute
// evaluation: after every 5th recorded match for a player.
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';

export async function syncMatchRatingsToPlayers(analysis, ratings) {
  if (!analysis?.id || !Array.isArray(ratings)) return;

  const rated = ratings.filter(r => r.player_id && !r.did_not_play && r.rating != null);
  if (rated.length === 0) return;

  await Promise.all(rated.map(async (r) => {
    try {
      // Fetch fresh state — the DB trigger already updated match_history
      const players = await base44.entities.Player.filter({ id: r.player_id });
      const player = players[0];
      if (!player) return;

      const history = player.match_history || [];
      const len = history.length;
      const lastEntry = history[len - 1];

      // Fire only when THIS match is the newest entry and the count hit a
      // multiple of 5 — avoids re-evaluating on every edit of old ratings.
      if (len >= 5 && len % 5 === 0 && lastEntry?.match_id === String(analysis.id)) {
        supabase.functions.invoke('evaluate-player-attributes', {
          body: { player_id: player.id },
        }).catch(e => console.warn('AI evaluation failed:', e));
      }
    } catch (e) {
      console.error('Failed to check AI evaluation trigger for player', r.player_id, e);
    }
  }));
}
