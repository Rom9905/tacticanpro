import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, ShieldCheck, LogOut } from 'lucide-react';
import InfoPageHeader from '@/components/InfoPageHeader';
import SiteFooter from '@/components/SiteFooter';

const STATUS_LABELS = {
  paid: 'שילם',
  manual_access: 'גישה ידנית',
  no_access: 'ללא גישה',
};

const STATUS_COLORS = {
  paid: { bg: 'rgba(74,222,128,0.12)', text: '#22C55E' },
  manual_access: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
  no_access: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' },
};

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u?.role !== 'admin') return;
        const allUsers = await base44.entities.User.list('-created_date', 200);
        setUsers(allUsers);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleStatusChange = async (userId, newStatus) => {
    setUpdatingId(userId);
    try {
      await base44.entities.User.update(userId, { access_status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, access_status: newStatus } : u));
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF7F0' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#22C55E' }} />
    </div>
  );

  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF7F0', fontFamily: 'Assistant, sans-serif' }}>
      <InfoPageHeader showLogin={false} />

      <main className="flex-1 px-6 py-12">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck style={{ width: 28, height: 28, color: '#22C55E' }} />
            <h1 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 28, color: '#0D1A12', margin: 0 }}>
              ניהול גישות משתמשים
            </h1>
          </div>
          <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 24 }}>
            סה"כ {users.length} משתמשים רשומים
          </p>

          {/* Search */}
          <div className="relative mb-6">
            <Search style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או אימייל..."
              style={{
                width: '100%',
                padding: '10px 40px 10px 16px',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 15,
                fontFamily: 'Assistant, sans-serif',
                outline: 'none',
              }}
            />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block" style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6B7280', fontFamily: 'Heebo, sans-serif' }}>שם</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6B7280', fontFamily: 'Heebo, sans-serif' }}>אימייל</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6B7280', fontFamily: 'Heebo, sans-serif' }}>תאריך הרשמה</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6B7280', fontFamily: 'Heebo, sans-serif' }}>סטטוס גישה</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const status = u.access_status || 'no_access';
                  const colors = STATUS_COLORS[status];
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#1F2937', fontWeight: 500 }}>
                        {u.full_name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#6B7280' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#6B7280' }}>
                        {u.created_date ? new Date(u.created_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.role === 'admin' ? (
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', padding: '4px 12px', borderRadius: 9999, backgroundColor: 'rgba(124,58,237,0.12)' }}>
                            אדמין
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, padding: '4px 12px', borderRadius: 9999, backgroundColor: colors.bg }}>
                              {STATUS_LABELS[status]}
                            </span>
                            <select
                              value={status}
                              onChange={e => handleStatusChange(u.id, e.target.value)}
                              disabled={updatingId === u.id}
                              style={{
                                fontSize: 13,
                                padding: '4px 8px',
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                backgroundColor: '#FFFFFF',
                                color: '#374151',
                                cursor: 'pointer',
                                fontFamily: 'Assistant, sans-serif',
                              }}
                            >
                              <option value="paid">שילם</option>
                              <option value="manual_access">גישה ידנית</option>
                              <option value="no_access">ללא גישה</option>
                            </select>
                            {updatingId === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#9CA3AF' }} />}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map(u => {
              const status = u.access_status || 'no_access';
              const colors = STATUS_COLORS[status];
              return (
                <div key={u.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{u.full_name || '—'}</span>
                    {u.role === 'admin' ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', padding: '3px 10px', borderRadius: 9999, backgroundColor: 'rgba(124,58,237,0.12)' }}>אדמין</span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, padding: '3px 10px', borderRadius: 9999, backgroundColor: colors.bg }}>
                        {STATUS_LABELS[status]}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{u.email}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                    {u.created_date ? new Date(u.created_date).toLocaleDateString('he-IL') : '—'}
                  </p>
                  {u.role !== 'admin' && (
                    <select
                      value={status}
                      onChange={e => handleStatusChange(u.id, e.target.value)}
                      disabled={updatingId === u.id}
                      style={{
                        width: '100%',
                        fontSize: 14,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        fontFamily: 'Assistant, sans-serif',
                      }}
                    >
                      <option value="paid">שילם</option>
                      <option value="manual_access">גישה ידנית</option>
                      <option value="no_access">ללא גישה</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 15, color: '#9CA3AF', padding: 48 }}>
              לא נמצאו משתמשים
            </p>
          )}

          {/* Logout */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <button
              onClick={() => base44.auth.logout()}
              className="inline-flex items-center gap-2"
              style={{ fontSize: 14, color: '#6B7280', padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', cursor: 'pointer', fontFamily: 'Assistant, sans-serif' }}
            >
              <LogOut className="w-4 h-4" />
              יציאה
            </button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}