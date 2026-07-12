import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { TeamProvider, useTeam } from '@/components/TeamContext';
import { ThemeProvider } from '@/components/ThemeContext';

import {
  Home,
  Users,
  TrendingUp,
  Brain,
  BarChart3,
  Clipboard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Calendar,
  Plus,
} from 'lucide-react';
import AddEventModal from '@/components/calendar/AddEventModal';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/LanguageContext';

const NAV_ITEMS_CONFIG = [
  { name: 'Home', key: 'home', icon: Home },
  { name: 'TeamManagement', key: 'teamManagement', icon: Users },
  { name: 'TrainingCenter', key: 'trainingCenter', icon: TrendingUp },
  { name: 'TrainingAnalytics', key: 'trainingAnalytics', icon: Brain },
  { name: 'DecisionAnalysis', key: 'decisionAnalysis', icon: BarChart3 },
  { name: 'TacticalBoard', key: 'tacticalBoard', icon: Clipboard },
  { name: 'MatchAnalysis', key: 'matchAnalysis', icon: BarChart3 },
];

const SIDEBAR_PAGES = [];

const creamTheme = `
  @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700&family=Heebo:wght@400;500;600;700;800;900&display=swap');

  * { 
    font-family: 'Assistant', 'Heebo', sans-serif;
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }

  /* ══════════════════════════════════════════════
     PREMIUM MATCH-DAY THEME — Token-based override
     Maps slate-* to brand tokens, eliminates all beige.
     ══════════════════════════════════════════════ */

  /* ── Backgrounds (was beige, now token-driven) ── */
  .bg-slate-950 { background-color: var(--bg-app) !important; }
  .bg-slate-900 { background-color: var(--bg-card-soft) !important; }
  .bg-slate-800 { background-color: var(--bg-card-soft) !important; }
  .bg-slate-700 { background-color: rgba(13,26,18,0.08) !important; }
  .bg-slate-800\\/50 { background-color: rgba(13,26,18,0.04) !important; }
  .bg-slate-800\\/30 { background-color: rgba(13,26,18,0.03) !important; }
  .bg-slate-800\\/40 { background-color: rgba(13,26,18,0.04) !important; }
  .bg-slate-800\\/70 { background-color: rgba(13,26,18,0.06) !important; }
  .bg-slate-900\\/50 { background-color: rgba(255,255,255,0.85) !important; }
  .bg-slate-900\\/70 { background-color: rgba(255,255,255,0.92) !important; }
  .bg-slate-900\\/30 { background-color: rgba(255,255,255,0.5) !important; }
  .bg-slate-900\\/80 { background-color: rgba(255,255,255,0.88) !important; }
  .bg-slate-950\\/80 { background-color: rgba(246,244,238,0.85) !important; }

  .from-slate-950, .via-slate-900, .to-slate-950,
  .from-slate-900, .to-slate-900,
  .from-slate-800, .to-slate-800 {
    --tw-gradient-stops: initial !important;
  }
  .bg-gradient-to-b, .bg-gradient-to-br {
    background-image: none !important;
    background-color: var(--bg-app) !important;
  }
  .bg-gradient-to-r {
    background-image: none !important;
    background-color: rgba(13,26,18,0.04) !important;
  }

  /* ── Text (was brown, now brand tokens) ── */
  .text-white { color: var(--text-primary) !important; }
  .text-slate-100, .text-slate-200 { color: var(--text-primary) !important; }
  .text-slate-300 { color: var(--text-secondary) !important; }
  .text-slate-400 { color: var(--text-secondary) !important; }
  .text-slate-500 { color: var(--text-muted) !important; }
  .text-slate-600 { color: var(--text-muted) !important; }
  .text-slate-700 { color: var(--text-muted) !important; }

  /* ── Borders (was brown, now neutral) ── */
  .border-slate-800 { border-color: rgba(13,26,18,0.10) !important; }
  .border-slate-700 { border-color: rgba(13,26,18,0.16) !important; }
  .border-slate-600 { border-color: rgba(13,26,18,0.24) !important; }

  /* ── Emerald → Brand green ── */
  .text-emerald-400 { color: var(--brand-green-dark) !important; }
  .text-emerald-500 { color: var(--brand-green-dark) !important; }
  .text-emerald-300 { color: var(--brand-green) !important; }
  .bg-emerald-500, .bg-emerald-600 { background-color: var(--brand-green) !important; }
  .hover\\:bg-emerald-600:hover, .hover\\:bg-emerald-700:hover { background-color: var(--brand-green-dark) !important; }
  .bg-emerald-500\\/10 { background-color: var(--success-bg) !important; }
  .bg-emerald-500\\/15 { background-color: var(--success-bg) !important; }
  .bg-emerald-500\\/20 { background-color: var(--success-bg) !important; }
  .border-emerald-500\\/20, .border-emerald-500\\/30, .border-emerald-500\\/40, .border-emerald-500\\/50 {
    border-color: rgba(22,163,74,0.28) !important;
  }
  .from-emerald-500, .to-emerald-700 { --tw-gradient-from: var(--brand-green); --tw-gradient-to: var(--brand-green-dark); }

  /* ── Blue → neutral (blue only for true info) ── */
  .text-blue-400, .text-blue-500, .text-blue-600 { color: var(--text-secondary) !important; }
  .bg-blue-500, .bg-blue-600 { background-color: rgba(13,26,18,0.06) !important; }
  .bg-blue-500\\/10, .bg-blue-500\\/20 { background-color: rgba(13,26,18,0.04) !important; }
  .border-blue-500\\/20, .border-blue-500\\/30, .border-blue-500\\/40 { border-color: rgba(13,26,18,0.12) !important; }
  .text-blue-300 { color: var(--brand-green-dark) !important; }

  /* ── Purple → neutral/green ── */
  .text-purple-400, .text-purple-500, .text-purple-600 { color: var(--text-secondary) !important; }
  .bg-purple-500, .bg-purple-600 { background-color: rgba(13,26,18,0.06) !important; }
  .bg-purple-500\\/10, .bg-purple-500\\/20 { background-color: rgba(13,26,18,0.04) !important; }
  .border-purple-500\\/20, .border-purple-500\\/30 { border-color: rgba(13,26,18,0.12) !important; }

  /* ── Red → danger only ── */
  .text-red-400, .text-red-500 { color: var(--danger) !important; }
  .bg-red-500\\/10, .bg-red-500\\/20 { background-color: var(--danger-bg) !important; }
  .border-red-500\\/20, .border-red-500\\/30 { border-color: rgba(220,38,38,0.20) !important; }

  /* ── Amber → warning ── */
  .text-amber-400, .text-amber-500, .text-amber-600 { color: var(--warning) !important; }
  .bg-amber-500\\/10, .bg-amber-500\\/20 { background-color: var(--warning-bg) !important; }
  .border-amber-500\\/20, .border-amber-500\\/30 { border-color: rgba(217,119,6,0.20) !important; }

  /* ── Inputs ── */
  input, textarea {
    background-color: var(--bg-card) !important;
    border-color: rgba(13,26,18,0.14) !important;
    color: var(--text-primary) !important;
    font-family: 'Assistant', sans-serif !important;
  }
  input:focus, textarea:focus {
    border-color: var(--brand-green) !important;
    box-shadow: 0 0 0 2px rgba(74,222,128,0.30) !important;
    outline: none !important;
  }
  input::placeholder, textarea::placeholder { color: var(--text-muted) !important; }

  /* ── Cards (was beige, now white) ── */
  .rounded-xl.bg-slate-900, .rounded-lg.bg-slate-900,
  [class*="bg-slate-900"][class*="border-slate-8"] {
    background-color: var(--bg-card) !important;
    border-color: rgba(13,26,18,0.08) !important;
  }

  /* Dropdown / Popover */
  [class*="bg-slate-800"][class*="border-slate-7"] {
    background-color: var(--bg-card) !important;
    border-color: rgba(13,26,18,0.12) !important;
    color: var(--text-primary) !important;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg-app); }
  ::-webkit-scrollbar-thumb { background: rgba(13,26,18,0.15); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(13,26,18,0.25); }
`;

function LayoutInner({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addEventType, setAddEventType] = useState('training');
  const { selectedTeamId } = useTeam();
  const { t, dir } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
    }).catch(() => {});
  }, [navigate]);

  const showSidebar = SIDEBAR_PAGES.includes(currentPageName);

  const navItems = NAV_ITEMS_CONFIG.map(item => ({ ...item, label: t.nav[item.key] }));

  if (!showSidebar) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col bg-slate-950 text-white">
        <style>{creamTheme}</style>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen flex bg-slate-950 text-white">
        <style>{creamTheme}</style>

        {/* Sidebar — desktop */}
        <aside
          className="hidden md:flex flex-col w-56 fixed top-0 right-0 h-full z-40 bg-slate-900 border-l border-slate-800"
        >
          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center gap-2 px-4 py-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2A7050, #1a4d35)' }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>T</span>
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-100">
              TACTICAN<span className="text-emerald-500">PRO</span>
            </span>
          </Link>

          {/* Nav items */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link key={item.name} to={createPageUrl(item.name)} onClick={() => setMobileOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all mb-0.5 ${
                      isActive 
                        ? 'bg-emerald-500/15 text-emerald-400' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick add buttons */}
          <div className="px-3 py-2 space-y-1 border-t border-slate-800">
            <p className="text-[10px] font-semibold px-1 mb-1 text-slate-500">{t.nav.quickAdd}</p>
            <button
              onClick={() => { setAddEventType('training'); setShowAddEvent(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15"
            >
              <Plus className="w-3.5 h-3.5" /> {t.nav.newTraining}
            </button>
            <button
              onClick={() => { setAddEventType('game'); setShowAddEvent(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15"
            >
              <Plus className="w-3.5 h-3.5" /> {t.nav.newGame}
            </button>
          </div>

          {/* User */}
          {user && (
            <div className="px-4 py-3 border-t border-slate-800">
              <div className="mb-3">
                <p className="text-xs truncate text-slate-400">{user.full_name || user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => base44.auth.logout()}
                className="w-full justify-start gap-2 px-0 text-slate-500 hover:text-slate-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs">{t.nav.logout}</span>
              </Button>
            </div>
          )}
        </aside>

        {showAddEvent && (
          <AddEventModal
            open={showAddEvent}
            onClose={() => setShowAddEvent(false)}
            teamId={selectedTeamId}
            defaultType={addEventType}
            onSaved={() => setShowAddEvent(false)}
          />
        )}

        {/* Mobile top bar */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 backdrop-blur-md bg-slate-900/70 border-b border-slate-800"
        >
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2A7050, #1a4d35)' }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>T</span>
            </div>
            <span className="font-bold text-sm text-slate-100">TACTICAN<span className="text-emerald-500">PRO</span></span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 backdrop-blur-sm bg-slate-950/80" onClick={() => setMobileOpen(false)}>
            <div className="absolute top-14 right-0 w-64 h-full bg-slate-900 border-l border-slate-800" onClick={e => e.stopPropagation()}>
              <nav className="py-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.name;
                  return (
                    <Link key={item.name} to={createPageUrl(item.name)} onClick={() => setMobileOpen(false)}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 transition-all ${
                          isActive 
                            ? 'bg-emerald-500/15 text-emerald-400' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              {user && (
                <div className="px-4 py-3 border-t border-slate-800">
                  <div className="mb-3">
                    <p className="text-sm text-slate-400">{user.full_name || user.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className="gap-2 text-slate-500 hover:text-slate-300">
                    <LogOut className="w-4 h-4" />יציאה
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:mr-56 mt-14 md:mt-0 min-h-screen overflow-auto">
          {children}
        </main>
        <SiteFooter />
      </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <TeamProvider>
      <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
    </TeamProvider>
  );
}