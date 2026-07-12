import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function SubscriptionBlocked() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
      <div className="text-center max-w-md">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-3">המנוי שלך אינו פעיל</h1>
        <p className="text-slate-400 mb-6">
          אין לך מנוי פעיל במערכת. צור קשר עם מנהל המערכת כדי להפעיל את חשבונך.
        </p>
        <Button onClick={logout} className="bg-slate-700 hover:bg-slate-600">
          התנתק
        </Button>
      </div>
    </div>
  );
}
