// Syncs player ratings from a match analysis into each player's profile:
// appends/updates players.match_history and triggers the AI attribute
// evaluation edge function every 5th recorded match.
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabaseClient';

export async function syncMatchRatingsToPlayers(analysis, ratings) {
  if (!analysis?.id || !Array.isArray(ratings)) return;

  const rated = ratings.filter(r => r.player_id && !r.did_not_play && r.rating != null);
  if (rated.length === 0) return;

  await Promise.all(rated.map(async (r) => {
    try {
      const players = await base44.entities.Player.filter({ id: r.player_id });
      const player = players[0];
      if (!player) return;

      const history = [...(player.match_history || [])];
      const entry = {
        match_id: analysis.id,
        opponent: analysis.opponent || '',
        date: analysis.date || new Date().toISOString().split('T')[0],
        rating: Number(r.rating),
        note: r.note || '',
        trend: 'ללא שינוי',
      };
      const idx = history.findIndex(h => h.match_id === analysis.id);
      if (idx >= 0) {
        history[idx] = { ...history[idx], ...entry };
      } else {
        history.push(entry);
      }

      await base44.entities.Player.update(player.id, { match_history: history });

      // Trigger AI attribute evaluation every 5th recorded match
      if (idx < 0 && history.length >= 5 && history.length % 5 === 0) {
        supabase.functions.invoke('evaluate-player-attributes', {
          body: { player_id: player.id },
        }).catch(e => console.warn('AI evaluation failed:', e));
      }
    } catch (e) {
      console.error('Failed to sync rating for player', r.player_id, e);
    }
  }));
}
