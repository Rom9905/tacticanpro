import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, Users, Trophy, Activity, LogOut, Trash2, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AddEventModal from '@/components/calendar/AddEventModal';
import { useLang } from '@/lib/LanguageContext';

export default function DashboardTopBar({ user, teams, selectedTeamId, onSelectTeam, onNewTeam, teamId, onTeamDeleted }) {
  const { t, dir } = useLang();
  const [teamOpen, setTeamOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addOpen2, setAddOpen2] = useState(false);
  const [addType, setAddType] = useState('training');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteTeam = async (tid) => {
    setDeleting(true);
    try {
      const players = await base44.entities.Player.filter({ team_id: tid });
      await Promise.all(players.map(p => base44.entities.Player.delete(p.id)));
      await base44.entities.Team.delete(tid);
      setConfirmDeleteId(null);
      setTeamOpen(false);
      onTeamDeleted?.();
    } catch (e) {
      console.error(e);
    }
    setDeleting(false);
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const openAdd = (type) => {
    setAddType(type);
    setAddOpen2(false);
    setAddOpen(true);
  };

  return (
    <>
      {/* ── Dark brand header ── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-3"
        dir={dir}
        style={{ height: '64px', backgroundColor: '#0D1A12', borderBottom: '1px solid rgba(74,222,128,.12)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="rounded-xl flex items-center justify-center" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4ADE80, #16A34A)' }}>
            <span style={{ color: '#0D1A12', fontWeight: 'bold', fontSize: '14px' }}>T</span>
          </div>
          <span className="font-bold text-sm hidden sm:block" style={{ color: '#fff' }}>
            TACTICAN<span style={{ color: '#4ADE80' }}>PRO</span>
          </span>
        </div>

        {/* Team selector — dark pill */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <button
              onClick={() => setTeamOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{ maxWidth: '180px', backgroundColor: '#13241A', border: '1px solid rgba(74,222,128,.25)', color: '#fff' }}
            >
              <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4ADE80' }} />
              <span className="truncate">{selectedTeam?.name || t.nav.selectTeam}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,.5)' }} />
            </button>
            {teamOpen && (
              <div className={`absolute top-full ${dir === 'rtl' ? 'right-0' : 'left-0'} mt-1 w-48 rounded-xl z-50 overflow-hidden premium-fade-in`} style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(13,26,18,.10)', boxShadow: 'var(--shadow-card-hover)' }}>
                {teams.map(tm => (
                  <div key={tm.id} className="flex items-center group">
                    <button onClick={() => { onSelectTeam(tm.id); setTeamOpen(false); }}
                      className={`flex-1 ${dir === 'rtl' ? 'text-right' : 'text-left'} px-4 py-2.5 text-sm transition-all hover:bg-slate-50`}
                      style={{ color: tm.id === selectedTeamId ? '#16A34A' : '#14231A', fontWeight: tm.id === selectedTeamId ? '600' : '400' }}>
                      {tm.name}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tm.id); }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-2.5 transition-all"
                      style={{ color: '#94A39A' }}
                      title={t.nav.deleteTeam}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(13,26,18,.08)' }}>
                  <button onClick={() => { onNewTeam(); setTeamOpen(false); }}
                    className={`w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} px-4 py-2.5 text-sm flex items-center gap-2 transition-all hover:bg-slate-50`}
                    style={{ color: '#16A34A' }}>
                    <Plus className="w-3.5 h-3.5" /> {t.nav.newTeam}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match file analysis — green outline on dark */}
        <Link to="/match-file-analysis" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
          style={{ border: '1px solid rgba(74,222,128,.35)', color: '#4ADE80', backgroundColor: 'rgba(74,222,128,.06)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(74,222,128,.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(74,222,128,.06)'; }}
          title="ניתוח קובץ משחק"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:block">ניתוח קובץ</span>
        </Link>

        {/* Add button — green solid */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setAddOpen2(o => !o)}
            className="premium-btn-green flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">{t.nav.add}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {addOpen2 && (
            <div className={`absolute top-full ${dir === 'rtl' ? 'left-0' : 'right-0'} mt-1 w-40 rounded-xl z-50 overflow-hidden premium-fade-in`} style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(13,26,18,.10)', boxShadow: 'var(--shadow-card-hover)' }}>
              <button onClick={() => openAdd('training')}
                className={`w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50`}
                style={{ color: '#16A34A' }}>
                <Activity className="w-3.5 h-3.5" /> {t.nav.newTraining}
              </button>
              <button onClick={() => openAdd('game')}
                className={`w-full ${dir === 'rtl' ? 'text-right' : 'text-left'} px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50`}
                style={{ color: '#2563EB' }}>
                <Trophy className="w-3.5 h-3.5" /> {t.nav.newGame}
              </button>
            </div>
          )}
        </div>

        {/* Pricing + Logout — white 70% → 100% */}
        <Link to="/pricing-plans" className="flex-shrink-0 p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,.7)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}
          title="תמחור"
        >
          <CreditCard className="w-4 h-4" />
        </Link>
        {user && (
          <button onClick={() => base44.auth.logout()} className="flex-shrink-0 p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,.7)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}
            title={t.nav.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(teamOpen || addOpen2) && (
        <div className="fixed inset-0 z-40" onClick={() => { setTeamOpen(false); setAddOpen2(false); }} />
      )}

      {/* Confirm delete dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" dir={dir} style={{ backgroundColor: 'rgba(13,26,18,.5)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4 premium-fade-in" style={{ backgroundColor: '#FFFFFF', boxShadow: 'var(--shadow-modal)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(220,38,38,.10)' }}>
                <Trash2 className="w-5 h-5" style={{ color: '#DC2626' }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#14231A' }}>{t.nav.deleteTeam}</h3>
            </div>
            <p className="text-sm mb-1" style={{ color: '#5C6B61' }}>
              {t.nav.deleteTeamConfirm} <span className="font-semibold" style={{ color: '#14231A' }}>"{teams.find(tm => tm.id === confirmDeleteId)?.name}"</span>?
            </p>
            <p className="text-xs mb-5" style={{ color: '#DC2626' }}>{t.nav.deleteTeamWarning}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} style={{ color: '#5C6B61' }} disabled={deleting}>
                {t.nav.cancel}
              </Button>
              <Button
                size="sm"
                onClick={() => handleDeleteTeam(confirmDeleteId)}
                disabled={deleting}
                className="text-white"
                style={{ backgroundColor: '#DC2626' }}
              >
                {deleting ? t.nav.deleting : t.nav.confirmDelete}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddEventModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        teamId={teamId}
        defaultType={addType}
        onSaved={() => { setAddOpen(false); }}
      />
    </>
  );
}