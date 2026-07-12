import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, UserCheck, UserX } from 'lucide-react';

const ADMIN_EMAIL = 'romfranko99@gmail.com';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">גישה נדחתה</h1>
          <p className="text-slate-400">אין לך הרשאה לגשת לדף זה.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at');

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, status, plan, start_date, end_date');

    const subMap = {};
    (subscriptions || []).forEach(s => { subMap[s.user_id] = s; });

    const merged = (profiles || []).map(p => ({
      ...p,
      subscription: subMap[p.id] || { status: 'inactive', plan: 'monthly' },
    }));

    setUsers(merged);
    setLoading(false);
  };

  const toggleAccess = async (userId, currentStatus) => {
    setToggling(userId);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: newStatus,
        plan: 'monthly',
        start_date: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (!error) {
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, subscription: { ...u.subscription, status: newStatus } }
          : u
      ));
    }
    setToggling(null);
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-emerald-500" />
          <h1 className="text-3xl font-bold text-white">ניהול משתמשים</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-right text-sm text-slate-400 font-medium p-4">משתמש</th>
                  <th className="text-right text-sm text-slate-400 font-medium p-4">אימייל</th>
                  <th className="text-right text-sm text-slate-400 font-medium p-4">תאריך הצטרפות</th>
                  <th className="text-right text-sm text-slate-400 font-medium p-4">סטטוס</th>
                  <th className="text-right text-sm text-slate-400 font-medium p-4">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-4 text-white">{u.full_name || '—'}</td>
                    <td className="p-4 text-slate-300 text-sm">{u.email}</td>
                    <td className="p-4 text-slate-400 text-sm">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="p-4">
                      {u.subscription.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                          <UserCheck className="w-4 h-4" /> פעיל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                          <UserX className="w-4 h-4" /> לא פעיל
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button
                        size="sm"
                        variant={u.subscription.status === 'active' ? 'destructive' : 'default'}
                        className={u.subscription.status === 'active'
                          ? 'bg-red-600 hover:bg-red-700 text-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-xs'}
                        disabled={toggling === u.id}
                        onClick={() => toggleAccess(u.id, u.subscription.status)}
                      >
                        {toggling === u.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.subscription.status === 'active' ? 'השבת' : 'הפעל'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center text-slate-500 py-8">אין משתמשים רשומים.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
