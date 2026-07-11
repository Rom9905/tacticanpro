import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle } from 'lucide-react';

export default function LeadForm({ open, onClose, planName, user }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.full_name || '');
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await base44.functions.invoke('sendLeadEmail', {
        name: name.trim(),
        phone: phone.trim(),
        plan: planName
      });
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשליחת הטופס. נסו שוב או צרו קשר ישירות.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setPhone('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22C55E' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0D1A12' }}>קיבלנו! 🟢</h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              נחזור אליכם בהקדם להשלמת ההרשמה.
            </p>
            <Button onClick={handleClose} style={{ backgroundColor: '#22C55E', color: '#0D1A12' }}>סגור</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle style={{ color: '#0D1A12' }}>עוד רגע ואתם בפנים!</DialogTitle>
              <DialogDescription>
                השאירו פרטים ונחזור אליכם להשלמת ההרשמה
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: '#374151' }}>שם מלא</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="שמכם המלא"
                  className="w-full px-3 py-2.5 rounded-lg border"
                  style={{ borderColor: '#D1D5DB', outline: 'none' }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: '#374151' }}>טלפון</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="מספר טלפון"
                  className="w-full px-3 py-2.5 rounded-lg border"
                  style={{ borderColor: '#D1D5DB', outline: 'none' }}
                  dir="ltr"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || !name.trim() || !phone.trim()}
                className="w-full"
                style={{ backgroundColor: '#22C55E', color: '#0D1A12', height: 44 }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שלחו פרטים'}
              </Button>
              <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                הפרטים נשלחים ישירות לצוות TacticanPro
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}