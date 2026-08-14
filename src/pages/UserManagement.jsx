import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, Search, ShieldCheck, KeyRound, Trash2, UserCheck, UserX } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';

// Real access state = subscriptions.status (what App.jsx gates on).
const STATUS_META = {
  active: { label: 'פעיל', bg: 'rgba(34,197,94,0.12)', text: '#16A34A' },
  trial: { label: 'ניסיון', bg: 'rgba(59,130,246,0.12)', text: '#2563EB' },
  past_due: { label: 'חיוב נכשל', bg: 'rgba(234,179,8,0.14)', text: '#B45309' },
  inactive: { label: 'ללא גישה', bg: 'rgba(239,68,68,0.12)', text: '#DC2626' },
};

async function callAdmin(payload) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
  // supabase-js throws its own error on non-2xx; surface the function's Hebrew message when present.
  if (error) {
    let msg = 'הפעולה נכשלה';
    try { msg = (await error.context?.json())?.error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null); // { kind: 'ok'|'err', text }
  const [pwFor, setPwFor] = useState(null); // userId whose password panel is open
  const [pwValue, setPwValue] = useState('');
  const [delFor, setDelFor] = useState(null); // userId pending delete confirm
  const [delConfirm, setDelConfirm] = useState('');

  const isAdmin = user?.role === 'admin' || user?.email === 'romfranko99@gmail.com';

  const flash = (kind, text) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await callAdmin({ action: 'list' });
      setUsers(data.users || []);
    } catch (e) {
      setLoadError(e.message || 'שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (user && !isAdmin) return <Navigate to="/" replace />;

  const setAccess = async (u, grant) => {
    setBusyId(u.id);
    try {
      await callAdmin({ action: 'set_access', userId: u.id, grant });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: grant ? 'active' : 'inactive', billing_key: grant ? 'manual' : x.billing_key } : x));
      flash('ok', grant ? 'הגישה הופעלה' : 'הגישה הושבתה');
    } catch (e) { flash('err', e.message); }
    finally { setBusyId(null); }
  };

  const savePassword = async (u) => {
    if (pwValue.length < 6) { flash('err', 'הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    setBusyId(u.id);
    try {
      await callAdmin({ action: 'set_password', userId: u.id, password: pwValue });
      flash('ok', `הסיסמה של ${u.email} עודכנה`);
      setPwFor(null); setPwValue('');
    } catch (e) { flash('err', e.message); }
    finally { setBusyId(null); }
  };

  const deleteUser = async (u) => {
    setBusyId(u.id);
    try {
      await callAdmin({ action: 'delete_user', userId: u.id });
      setUsers(prev => prev.filter(x => x.id !== u.id));
      flash('ok', `${u.email} נמחק`);
      setDelFor(null); setDelConfirm('');
    } catch (e) { flash('err', e.message); }
    finally { setBusyId(null); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F0', fontFamily: 'Assistant, sans-serif' }}>
      <InfoPageHeader showLogin={false} />

      {toast && (
        <div style={{
          position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
          padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff',
          backgroundColor: toast.kind === 'ok' ? '#16A34A' : '#DC2626', boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        }}>{toast.text}</div>
      )}

      <main className="flex-1 px-4 md:px-6 py-10">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck style={{ width: 28, height: 28, color: '#22C55E' }} />
            <h1 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 28, color: '#0D1A12', margin: 0 }}>
              ניהול משתמשים
            </h1>
          </div>
          <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>
            מתן גישה ידנית, שינוי סיסמה ומחיקת משתמשים · סה"כ {users.length} משתמשים
          </p>

          <div className="relative mb-6">
            <Search style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או אימייל..."
              style={{ width: '100%', padding: '10px 40px 10px 16px', borderRadius: 12, border: '1px solid #E5E7EB', backgroundColor: '#FFF', fontSize: 15, outline: 'none', fontFamily: 'Assistant, sans-serif' }}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#22C55E' }} /></div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>{loadError}</p>
              <button onClick={load} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#FFF', cursor: 'pointer' }}>נסה שוב</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => {
                const meta = STATUS_META[u.status] || STATUS_META.inactive;
                const isSelf = u.id === user?.id;
                const isSuperAdmin = u.email === 'romfranko99@gmail.com';
                const hasAccess = u.status === 'active' || u.status === 'trial';
                const busy = busyId === u.id;
                return (
                  <div key={u.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, border: '1px solid #E5E7EB' }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{u.full_name || '—'}</span>
                          {u.role === 'admin' && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', padding: '2px 9px', borderRadius: 9999, backgroundColor: 'rgba(124,58,237,0.12)' }}>אדמין</span>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta.text, padding: '2px 10px', borderRadius: 9999, backgroundColor: meta.bg }}>{meta.label}</span>
                          {u.billing_key === 'manual' && u.status === 'active' && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', padding: '2px 9px', borderRadius: 9999, backgroundColor: 'rgba(37,99,235,0.10)' }}>גישה ידנית</span>
                          )}
                          {!u.email_confirmed && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', padding: '2px 9px', borderRadius: 9999, backgroundColor: 'rgba(234,179,8,0.12)' }}>מייל לא אומת</span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{u.email}</p>
                        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                          נרשם: {u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : '—'}
                          {u.last_sign_in_at ? ` · כניסה אחרונה: ${new Date(u.last_sign_in_at).toLocaleDateString('he-IL')}` : ' · טרם התחבר'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#9CA3AF' }} />}
                        <button
                          onClick={() => setAccess(u, !hasAccess)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5"
                          style={{ fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: busy ? 'default' : 'pointer',
                            backgroundColor: hasAccess ? 'rgba(239,68,68,0.08)' : '#16A34A', color: hasAccess ? '#DC2626' : '#fff',
                            border: hasAccess ? '1px solid rgba(239,68,68,0.3)' : 'none', opacity: busy ? 0.6 : 1 }}
                        >
                          {hasAccess ? <><UserX className="w-3.5 h-3.5" /> השבת גישה</> : <><UserCheck className="w-3.5 h-3.5" /> תן גישה</>}
                        </button>
                        <button
                          onClick={() => { setPwFor(pwFor === u.id ? null : u.id); setPwValue(''); setDelFor(null); }}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5"
                          style={{ fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', backgroundColor: 'rgba(139,115,85,0.08)', color: '#374151', border: '1px solid #E5E7EB' }}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> סיסמה
                        </button>
                        {!isSelf && !isSuperAdmin && (
                          <button
                            onClick={() => { setDelFor(delFor === u.id ? null : u.id); setDelConfirm(''); setPwFor(null); }}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', backgroundColor: 'rgba(239,68,68,0.06)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> מחק
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password panel */}
                    {pwFor === u.id && (
                      <div style={{ marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                          סיסמה חדשה עבור {u.email}
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={pwValue}
                            onChange={e => setPwValue(e.target.value)}
                            placeholder="לפחות 6 תווים"
                            style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14, outline: 'none', fontFamily: 'Assistant, sans-serif' }}
                          />
                          <button onClick={() => savePassword(u)} disabled={busy}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#16A34A', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                            שמור
                          </button>
                          <button onClick={() => { setPwFor(null); setPwValue(''); }}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFF', color: '#6B7280', cursor: 'pointer' }}>
                            ביטול
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>הסיסמה תשתנה מיד. מסור אותה למשתמש בערוץ מאובטח.</p>
                      </div>
                    )}

                    {/* Delete confirm panel */}
                    {delFor === u.id && (
                      <div style={{ marginTop: 14, padding: 14, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>מחיקת {u.email} לצמיתות</p>
                        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
                          פעולה בלתי הפיכה — כל הנתונים שלו (קבוצה, שחקנים, ניתוחים, אימונים) יימחקו. להמשך, הקלד <b>מחק</b> בתיבה.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            value={delConfirm}
                            onChange={e => setDelConfirm(e.target.value)}
                            placeholder="הקלד: מחק"
                            style={{ flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 8, border: '1px solid #FCA5A5', fontSize: 14, outline: 'none', fontFamily: 'Assistant, sans-serif' }}
                          />
                          <button onClick={() => deleteUser(u)} disabled={busy || delConfirm.trim() !== 'מחק'}
                            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: delConfirm.trim() === 'מחק' ? '#DC2626' : '#FCA5A5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: delConfirm.trim() === 'מחק' ? 'pointer' : 'not-allowed' }}>
                            מחק לצמיתות
                          </button>
                          <button onClick={() => { setDelFor(null); setDelConfirm(''); }}
                            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFF', color: '#6B7280', cursor: 'pointer' }}>
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: 15, color: '#9CA3AF', padding: 48 }}>לא נמצאו משתמשים</p>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
