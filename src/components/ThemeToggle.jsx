import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1"
      style={{
        backgroundColor: isDark ? '#1E293B' : 'rgba(139,115,85,0.20)',
        border: isDark ? '1px solid #334155' : '1px solid rgba(139,115,85,0.25)'
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div
        className="absolute w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center"
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FAF7F2',
          transform: isDark ? 'translateX(28px)' : 'translateX(0)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {isDark ? (
          <Moon className="w-3 h-3" style={{ color: '#94A3B8' }} />
        ) : (
          <Sun className="w-3 h-3" style={{ color: '#F59E0B' }} />
        )}
      </div>
    </button>
  );
}