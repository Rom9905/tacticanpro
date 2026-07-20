import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Users, Activity, Trophy, AlertTriangle, TrendingUp, Star, Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const EVENT_LABELS = {
  login: 'כניסה למערכת',
  open_dashboard: 'פתיחת תמונת מצב',
  open_input: 'פתיחת הזנה',
  open_insights: 'פתיחת תובנות',
  open_player_profile: 'פרופיל שחקן',
  open_game_prep: 'הכנה למשחק',
  open_game_style: 'שיטת משחק',
  open_match_analysis: 'ניתוח משחק',
  open_training_analytics: 'ניתוח אימונים',
  open_team_management: 'ניהול קבוצה',
  open_training_center: 'מרכז אימונים',
  match_summary_started: 'הזנת משחק - התחיל',
  match_summary_completed: 'הזנת משחק - הושלם',
  match_summary_abandoned: 'הזנת משחק - ננטש',
  training_summary_started: 'הזנת אימון - התחיל',
  training_summary_completed: 'הזנת אימון - הושלם',
  training_summary_abandoned: 'הזנת אימון - ננטש',
  generate_insights: 'הפקת תובנות',
};

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.role !== 'admin') { setForbidden(true); setLoading(false); return; }
        const [evts, usrs] = await Promise.all([
          base44.entities.AnalyticsEvent.list('-created_date', 2000),
          base44.entities.User.list(),
        ]);
        setEvents(evts);
        setUsers(usrs);
      } catch {
        setForbidden(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUserUpdate = async (userId, updates) => {
    setSaving(userId);
    await base44.entities.User.update(userId, updates);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    setSaving(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2A7050' }} />
    </div>
  );

  if (forbidden) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EFE6' }}>
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: '#B94040' }} />
        <p className="font-bold text-lg" style={{ color: '#2C2416' }}>אין הרשאת גישה</p>
        <p className="text-sm mt-1" style={{ color: '#7A6B57' }}>דף זה זמין לאדמין בלבד</p>
      </div>
    </div>
  );

  // ── Compute per-user stats ──────────────────────────────────────────────
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);

  const userStatsMap = {};
  for (const u of users) {
    userStatsMap[u.email] = {
      email: u.email,
      name: u.full_name || u.email,
      role: u.role,
      registered: u.created_date,
      firstActive: null,
      firstMatch: null,
      lastLogin: null,
      activeDaysThisWeek: new Set(),
      eventCounts: {},
    };
  }

  for (const ev of events) {
    const email = ev.user_email;
    if (!userStatsMap[email]) {
      userStatsMap[email] = {
        email,
        name: ev.user_name || email,
        role: 'user',
        registered: null,
        firstActive: null,
        firstMatch: null,
        lastLogin: null,
        activeDaysThisWeek: new Set(),
        eventCounts: {},
      };
    }
    const s = userStatsMap[email];
    const evDate = ev.session_date || ev.created_date?.split('T')[0];
    const evTs = new Date(ev.created_date || evDate);

    // first active
    if (!s.firstActive || evTs < new Date(s.firstActive)) s.firstActive = evTs.toISOString().split('T')[0];
    // last login
    if (ev.event_type === 'login') {
      if (!s.lastLogin || evTs > new Date(s.lastLogin)) s.lastLogin = evTs.toISOString();
    }
    // first match completed
    if (ev.event_type === 'match_summary_completed') {
      if (!s.firstMatch || evTs < new Date(s.firstMatch)) s.firstMatch = evTs.toISOString().split('T')[0];
    }
    // active days this week
    if (evTs >= weekAgo) s.activeDaysThisWeek.add(evDate);
    // event counts
    s.eventCounts[ev.event_type] = (s.eventCounts[ev.event_type] || 0) + 1;
  }

  const userStats = Object.values(userStatsMap).sort((a, b) => {
    const ad = daysAgo(a.lastLogin);
    const bd = daysAgo(b.lastLogin);
    return (ad ?? 9999) - (bd ?? 9999);
  });

  // ── Summary stats ────────────────────────────────────────────────────────
  const activeThisWeek = userStats.filter(u => u.activeDaysThisWeek.size > 0).length;
  const featureCounts = {};
  for (const ev of events) {
    featureCounts[ev.event_type] = (featureCounts[ev.event_type] || 0) + 1;
  }
  const topFeature = Object.entries(featureCounts).sort((a, b) => b[1] - a[1])[0];

  const regToMatchDays = userStats
    .map(u => daysBetween(u.registered, u.firstMatch))
    .filter(d => d !== null && d >= 0);
  const avgDaysToMatch = regToMatchDays.length
    ? Math.round(regToMatchDays.reduce((a, b) => a + b, 0) / regToMatchDays.length)
    : null;

  const matchCompletions = featureCounts['match_summary_completed'] || 0;
  const matchStarts = featureCounts['match_summary_started'] || 0;
  const _matchCompletionRate = matchStarts ? Math.round((matchCompletions / matchStarts) * 100) : null;

  const S = ({ children, className = '' }) => (
    <div className={`rounded-xl p-5 ${className}`} style={{ backgroundColor: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EFE6' }} dir="rtl">
      <div className="w-full px-4 lg:px-8 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(42,112,80,0.12)' }}>
            <Activity className="w-5 h-5" style={{ color: '#2A7050' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2C2416' }}>Analytics Dashboard</h1>
            <p className="text-sm" style={{ color: '#7A6B57' }}>מעקב שימוש ו-Retention — אדמין בלבד</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'משתמשים רשומים', value: users.length, color: '#2A5FA8' },
            { icon: TrendingUp, label: 'פעילים השבוע', value: activeThisWeek, color: '#2A7050' },
            { icon: Star, label: 'פיצ\'ר הכי פופולרי', value: topFeature ? (EVENT_LABELS[topFeature[0]] || topFeature[0]) : '—', small: true, color: '#9A6A10' },
            { icon: Calendar, label: 'ממוצע ימים לרישום→משחק', value: avgDaysToMatch !== null ? `${avgDaysToMatch} ימים` : '—', color: '#7A2A8A' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <S key={i}>
                <Icon className="w-5 h-5 mb-2" style={{ color: card.color }} />
                <div className={`font-bold mb-0.5 ${card.small ? 'text-sm' : 'text-2xl'}`} style={{ color: '#2C2416' }}>
                  {card.value}
                </div>
                <div className="text-xs" style={{ color: '#9A8672' }}>{card.label}</div>
              </S>
            );
          })}
        </div>

        {/* Feature usage */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <S>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#2C2416' }}>
              <Trophy className="w-4 h-4" style={{ color: '#9A6A10' }} /> שימוש לפי פיצ'ר
            </h3>
            <div className="space-y-2">
              {Object.entries(featureCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([type, count]) => {
                  const max = Object.values(featureCounts).reduce((a, b) => Math.max(a, b), 1);
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-0.5" style={{ color: '#5C4E38' }}>
                        <span>{EVENT_LABELS[type] || type}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(139,115,85,0.15)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: '#2A7050' }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </S>

          <S>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#2C2416' }}>
              <Activity className="w-4 h-4" style={{ color: '#2A5FA8' }} /> סיכום המרות הזנה
            </h3>
            <div className="space-y-3">
              {[
                { label: 'משחקים', started: featureCounts['match_summary_started'] || 0, completed: featureCounts['match_summary_completed'] || 0, abandoned: featureCounts['match_summary_abandoned'] || 0 },
                { label: 'אימונים', started: featureCounts['training_summary_started'] || 0, completed: featureCounts['training_summary_completed'] || 0, abandoned: featureCounts['training_summary_abandoned'] || 0 },
              ].map(row => {
                const rate = row.started ? Math.round((row.completed / row.started) * 100) : 0;
                return (
                  <div key={row.label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(139,115,85,0.06)', border: '1px solid rgba(139,115,85,0.12)' }}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#2C2416' }}>{row.label}</span>
                      <span className="text-sm font-bold" style={{ color: rate >= 60 ? '#2A7050' : '#B94040' }}>{rate}% הושלמו</span>
                    </div>
                    <div className="flex gap-3 text-xs" style={{ color: '#7A6B57' }}>
                      <span>התחיל: {row.started}</span>
                      <span>הושלם: {row.completed}</span>
                      <span>ננטש: {row.abandoned}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </S>
        </div>

        {/* Users Management - Mobile Friendly */}
        <S>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#2C2416' }}>
            <Users className="w-4 h-4" style={{ color: '#2A5FA8' }} /> ניהול משתמשים ({users.length})
          </h3>
          <div className="space-y-3">
            {users.map(user => {
              const stats = userStatsMap[user.email] || {};
              const lastLoginDays = daysAgo(stats.lastLogin);
              const isInactive = lastLoginDays === null || lastLoginDays > 7;
              const isExpanded = expandedUser === user.id;
              const totalEvents = Object.values(stats.eventCounts || {}).reduce((a, b) => a + b, 0);
              
              return (
                <div 
                  key={user.id}
                  className="rounded-xl overflow-hidden"
                  style={{ 
                    backgroundColor: isInactive ? 'rgba(185,64,64,0.04)' : 'rgba(139,115,85,0.04)',
                    border: '1px solid rgba(139,115,85,0.15)'
                  }}
                >
                  {/* Header - always visible */}
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    className="w-full p-4 flex items-center justify-between text-right"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isInactive && <span style={{ color: '#B94040' }}>●</span>}
                        <span className="font-semibold text-sm" style={{ color: '#2C2416' }}>
                          {user.full_name || user.email}
                        </span>
                        {/* Badges */}
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ 
                            backgroundColor: user.role === 'admin' ? 'rgba(122,79,160,0.15)' : 'rgba(42,95,168,0.12)',
                            color: user.role === 'admin' ? '#7A4FA0' : '#2A5FA8'
                          }}
                        >
                          {user.role === 'admin' ? 'אדמין' : 'משתמש'}
                        </span>
                        {user.plan && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ 
                              backgroundColor: user.plan === 'club' ? 'rgba(154,106,16,0.15)' : user.plan === 'pro' ? 'rgba(42,112,80,0.12)' : 'rgba(139,115,85,0.12)',
                              color: user.plan === 'club' ? '#9A6A10' : user.plan === 'pro' ? '#2A7050' : '#7A6B57'
                            }}
                          >
                            {user.plan}
                          </span>
                        )}
                        {user.is_approved === false && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: 'rgba(185,64,64,0.12)', color: '#B94040' }}
                          >
                            לא מאושר
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: '#7A6B57' }}>{user.email}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: '#9A8672' }} />
                    ) : (
                      <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: '#9A8672' }} />
                    )}
                  </button>
                  
                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(139,115,85,0.12)' }}>
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 pt-3">
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                          <div className="text-lg font-bold" style={{ color: '#2C2416' }}>{totalEvents}</div>
                          <div className="text-[10px]" style={{ color: '#9A8672' }}>אירועים</div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                          <div className="text-lg font-bold" style={{ color: '#2A7050' }}>{stats.activeDaysThisWeek?.size || 0}</div>
                          <div className="text-[10px]" style={{ color: '#9A8672' }}>ימים השבוע</div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(139,115,85,0.06)' }}>
                          <div className="text-sm font-bold" style={{ color: isInactive ? '#B94040' : '#2A7050' }}>
                            {lastLoginDays !== null ? `${lastLoginDays}d` : '—'}
                          </div>
                          <div className="text-[10px]" style={{ color: '#9A8672' }}>כניסה אחרונה</div>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="space-y-3">
                        {/* Role */}
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>תפקיד</label>
                          <div className="flex gap-2">
                            {['user', 'admin'].map(role => (
                              <button
                                key={role}
                                onClick={() => handleUserUpdate(user.id, { role })}
                                disabled={saving === user.id}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                  backgroundColor: user.role === role ? (role === 'admin' ? '#7A4FA0' : '#2A5FA8') : 'rgba(139,115,85,0.08)',
                                  color: user.role === role ? '#fff' : '#7A6B57',
                                  border: `1px solid ${user.role === role ? 'transparent' : 'rgba(139,115,85,0.2)'}`,
                                  opacity: saving === user.id ? 0.6 : 1
                                }}
                              >
                                {role === 'admin' ? 'אדמין' : 'משתמש'}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Plan */}
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>תוכנית</label>
                          <div className="flex gap-2">
                            {['starter', 'pro', 'club'].map(plan => (
                              <button
                                key={plan}
                                onClick={() => handleUserUpdate(user.id, { plan })}
                                disabled={saving === user.id}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                  backgroundColor: user.plan === plan 
                                    ? (plan === 'club' ? '#9A6A10' : plan === 'pro' ? '#2A7050' : '#7A6B57') 
                                    : 'rgba(139,115,85,0.08)',
                                  color: user.plan === plan ? '#fff' : '#7A6B57',
                                  border: `1px solid ${user.plan === plan ? 'transparent' : 'rgba(139,115,85,0.2)'}`,
                                  opacity: saving === user.id ? 0.6 : 1
                                }}
                              >
                                {plan}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Approval */}
                        <div>
                          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5C4E38' }}>אישור גישה</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUserUpdate(user.id, { is_approved: true })}
                              disabled={saving === user.id}
                              className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                              style={{
                                backgroundColor: user.is_approved !== false ? '#2A7050' : 'rgba(139,115,85,0.08)',
                                color: user.is_approved !== false ? '#fff' : '#7A6B57',
                                border: `1px solid ${user.is_approved !== false ? 'transparent' : 'rgba(139,115,85,0.2)'}`,
                                opacity: saving === user.id ? 0.6 : 1
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4" /> מאושר
                            </button>
                            <button
                              onClick={() => handleUserUpdate(user.id, { is_approved: false })}
                              disabled={saving === user.id}
                              className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                              style={{
                                backgroundColor: user.is_approved === false ? '#B94040' : 'rgba(139,115,85,0.08)',
                                color: user.is_approved === false ? '#fff' : '#7A6B57',
                                border: `1px solid ${user.is_approved === false ? 'transparent' : 'rgba(139,115,85,0.2)'}`,
                                opacity: saving === user.id ? 0.6 : 1
                              }}
                            >
                              <XCircle className="w-4 h-4" /> חסום
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Extra info */}
                      <div className="text-xs space-y-1 pt-2" style={{ color: '#9A8672', borderTop: '1px solid rgba(139,115,85,0.10)' }}>
                        <div>נרשם: {user.created_date ? new Date(user.created_date).toLocaleDateString('he-IL') : '—'}</div>
                        <div>משחק ראשון: {stats.firstMatch ? new Date(stats.firstMatch).toLocaleDateString('he-IL') : '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: '#9A8672' }}>
            ● אדום = לא נכנס יותר מ-7 ימים • לחץ על משתמש לעריכה
          </p>
        </S>
      </div>
    </div>
  );
}