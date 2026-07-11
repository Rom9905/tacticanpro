import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load theme preference from localStorage
    const loadTheme = () => {
      try {
        const savedTheme = localStorage.getItem('theme_preference') || 'light';
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.style.backgroundColor = '#0F172A';
          document.body.style.color = '#F1F5F9';
        } else {
          document.documentElement.classList.remove('dark');
          document.body.style.backgroundColor = '#F4EFE6';
          document.body.style.color = '#2C2416';
        }
      } catch (error) {
        setTheme('light');
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#F4EFE6';
        document.body.style.color = '#2C2416';
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0F172A';
      document.body.style.color = '#F1F5F9';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#F4EFE6';
      document.body.style.color = '#2C2416';
    }

    // Save to localStorage instead of base44
    try {
      localStorage.setItem('theme_preference', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
