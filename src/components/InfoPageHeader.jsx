import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function InfoPageHeader({ showLogin = true, variant = 'light' }) {
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();

  const handleLogin = () => {
    navigateToLogin();
  };

  const handleLogout = () => {
    logout(true);
  };

  const isDark = variant === 'dark';
  const bgColor = isDark ? 'rgba(13, 26, 18, 0.8)' : 'rgba(250, 247, 240, 0.8)';
  const borderColor = isDark ? 'rgba(74,222,128,0.15)' : 'rgba(139,115,85,0.12)';
  const textColor = isDark ? '#FAF7F0' : '#2C2416';
  const mutedColor = isDark ? 'rgba(232, 245, 236, 0.5)' : '#7A6B57';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}` }} dir="rtl">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4ADE80, #22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#0D1A12', fontWeight: 800, fontSize: 12 }}>T</span>
          </div>
          <span style={{ fontFamily: 'Heebo, sans-serif', fontWeight: 800, fontSize: 14, color: textColor }}>
            Tactican<span style={{ color: '#4ADE80' }}>Pro</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/pricing-plans" style={{ fontSize: 14, color: mutedColor, transition: 'color 200ms ease-out', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#4ADE80'}
                onMouseLeave={e => e.currentTarget.style.color = mutedColor}>
            תמחור
          </Link>
          {showLogin && (
            isAuthenticated && user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5"
                style={{ fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 8, backgroundColor: 'transparent', color: mutedColor, border: `1px solid ${borderColor}`, cursor: 'pointer', fontFamily: 'Heebo, sans-serif', transition: 'all 200ms ease-out' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = mutedColor; e.currentTarget.style.borderColor = borderColor; }}
              >
                <LogOut className="w-3.5 h-3.5" />
                התנתק
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{ fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 8, backgroundColor: '#4ADE80', color: '#0D1A12', border: 'none', cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
              >
                התחבר / הצטרף
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
