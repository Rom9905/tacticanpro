import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX, CreditCard } from 'lucide-react';

export default function SubscriptionBlocked() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0D1A12' }} dir="rtl">
      <div className="text-center max-w-md">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Heebo, sans-serif' }}>המנוי שלך אינו פעיל</h1>
        <p className="text-slate-400 mb-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
          כדי להמשיך להשתמש במערכת, בחר מסלול והפעל את המנוי — הגישה נפתחת מיד לאחר התשלום.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/payment')}
            className="gap-2 font-bold"
            style={{ backgroundColor: '#4ADE80', color: '#0D1A12', fontFamily: 'Heebo, sans-serif' }}>
            <CreditCard className="w-4 h-4" />
            לרכישת מנוי
          </Button>
          <Button onClick={logout} className="bg-slate-700 hover:bg-slate-600">
            התנתק
          </Button>
        </div>
      </div>
    </div>
  );
}
