import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer style={{ backgroundColor: '#0D1A12', borderTop: '1px solid rgba(74,222,128,0.15)' }} dir="rtl">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4ADE80, #22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#0D1A12', fontWeight: 800, fontSize: 12 }}>T</span>
              </div>
              <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 16, color: '#FAF7F0' }}>
                Tactican<span style={{ color: '#4ADE80' }}>Pro</span>
              </span>
            </div>
            <p style={{ fontFamily: 'Assistant, sans-serif', fontSize: 13, color: 'rgba(232, 245, 236, 0.5)', lineHeight: 1.6, margin: '0 0 4px 0' }}>
              מערכת התובנות של המאמן
            </p>
            <p style={{ fontFamily: 'Assistant, sans-serif', fontSize: 12, color: 'rgba(232, 245, 236, 0.35)', lineHeight: 1.6, margin: 0 }}>
              Tactican · רחל אמנו 12, מודיעין
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 13, color: 'rgba(232, 245, 236, 0.6)', marginBottom: 12, margin: '0 0 12px 0' }}>יצירת קשר</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="tel:053-620-0593" className="flex items-center gap-2" style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.7)', transition: 'color 200ms ease-out', textDecoration: 'none' }}
                 onMouseEnter={e => e.currentTarget.style.color = '#4ADE80'}
                 onMouseLeave={e => e.currentTarget.style.color = 'rgba(232, 245, 236, 0.7)'}>
                <Phone style={{ width: 14, height: 14, flexShrink: 0, color: 'rgba(232, 245, 236, 0.4)' }} />
                <span dir="ltr">053-620-0593</span>
              </a>
              <a href="mailto:taactican@gmail.com" className="flex items-center gap-2" style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.7)', transition: 'color 200ms ease-out', textDecoration: 'none' }}
                 onMouseEnter={e => e.currentTarget.style.color = '#4ADE80'}
                 onMouseLeave={e => e.currentTarget.style.color = 'rgba(232, 245, 236, 0.7)'}>
                <Mail style={{ width: 14, height: 14, flexShrink: 0, color: 'rgba(232, 245, 236, 0.4)' }} />
                <span>taactican@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 600, fontSize: 13, color: 'rgba(232, 245, 236, 0.6)', marginBottom: 12, margin: '0 0 12px 0' }}>קישורים</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/pricing-plans', label: 'תמחור' },
                { to: '/terms', label: 'תקנון' },
                { to: '/cancellation-policy', label: 'מדיניות ביטולים' },
                { to: '/accessibility', label: 'הצהרת נגישות' },
              ].map(link => (
                <Link key={link.to} to={link.to} style={{ fontSize: 14, color: 'rgba(232, 245, 236, 0.7)', transition: 'color 200ms ease-out', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#4ADE80'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(232, 245, 236, 0.7)'}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(74,222,128,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(232, 245, 236, 0.4)', margin: 0 }}>© 2026 TacticanPro. כל הזכויות שמורות.</p>
          <p style={{ fontSize: 11, color: 'rgba(232, 245, 236, 0.3)', margin: 0 }}>האתר אינו קשור להימורים, פורנוגרפיה, או כל פעילות בלתי חוקית.</p>
        </div>
      </div>
    </footer>
  );
}