import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Users } from 'lucide-react';

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  { value: 'pro', label: 'Pro', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  { value: 'club', label: 'Club', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
];

function _PlanBadge({ plan }) {
  if (!plan) return <span className="text-sm" style={{ color: '#9A8672' }}>ללא תוכנית</span>;
  const opt = PLAN_OPTIONS.find(p => p.value === plan);
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${opt?.color}`}>
      {opt?.label || plan}
    </span>
  );
}

export default function Pricing() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      if (u?.role === 'admin') {
        base44.entities.User.list().then(list => {
          setUsers(list);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  const handlePlanChange = async (userId, plan) => {
    setSaving(userId);
    await base44.entities.User.update(userId, { plan });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4EFE6' }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: '#F4EFE6' }}>
        <div className="text-center p-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(185,64,64,0.1)', border: '1px solid rgba(185,64,64,0.25)' }}>
            <Shield className="w-6 h-6" style={{ color: '#b94040' }} />
          </div>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#2C2416' }}>אין גישה לדף זה</h2>
          <p className="text-sm" style={{ color: '#7A6B57' }}>דף זה מיועד למנהלי מערכת בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen p-6" style={{ background: '#F4EFE6' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(42,112,80,0.12)', border: '1px solid rgba(42,112,80,0.25)' }}>
            <Users className="w-5 h-5" style={{ color: '#2A7050' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#2C2416' }}>ניהול תוכניות משתמשים</h1>
            <p className="text-xs" style={{ color: '#7A6B57' }}>הגדר תוכנית מנוי לכל משתמש</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#FAF7F2', border: '1px solid rgba(139,115,85,0.18)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(139,115,85,0.15)', background: 'rgba(228,221,211,0.4)' }}>
                <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: '#7A6B57' }}>שם</th>
                <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: '#7A6B57' }}>אימייל</th>
                <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: '#7A6B57' }}>תפקיד</th>
                <th className="text-right px-5 py-3 text-xs font-semibold" style={{ color: '#7A6B57' }}>תוכנית</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: i < users.length - 1 ? '1px solid rgba(139,115,85,0.10)' : 'none',
                  }}
                >
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: '#2C2416' }}>{user.full_name || '—'}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#5C4E38' }}>{user.email}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{
                      background: user.role === 'admin' ? 'rgba(42,112,80,0.12)' : 'rgba(139,115,85,0.10)',
                      color: user.role === 'admin' ? '#2A7050' : '#7A6B57',
                      border: `1px solid ${user.role === 'admin' ? 'rgba(42,112,80,0.25)' : 'rgba(139,115,85,0.20)'}`,
                    }}>
                      {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={user.plan || ''}
                      onChange={e => handlePlanChange(user.id, e.target.value || null)}
                      disabled={saving === user.id}
                      className="text-sm rounded-lg px-2 py-1 outline-none cursor-pointer"
                      style={{
                        background: '#FAF7F2',
                        border: '1px solid rgba(139,115,85,0.30)',
                        color: '#2C2416',
                        opacity: saving === user.id ? 0.6 : 1,
                      }}
                    >
                      <option value="">ללא תוכנית</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="club">Club</option>
                    </select>
                    {saving === user.id && (
                      <span className="mr-2 text-xs" style={{ color: '#9A8672' }}>שומר...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: '#9A8672' }}>אין משתמשים</p>
          )}
        </div>
      </div>
    </div>
  );
}