import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dashboard-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('dashboard-theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// =============================================================================
// Theme Colors - Consistent color palette for both themes
// =============================================================================

export const themeColors = {
  dark: {
    // Backgrounds
    bg: {
      primary: '#0a0a0f',
      secondary: '#0f0f14',
      tertiary: '#16162a',
      card: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
      cardSolid: '#1a1a2e',
      hover: 'rgba(255, 255, 255, 0.02)',
      elevated: '#1e1e2e',
    },
    // Text
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8', // slate-400
      tertiary: '#64748b', // slate-500
      muted: '#475569', // slate-600
    },
    // Borders
    border: {
      default: 'rgba(255, 255, 255, 0.05)',
      hover: 'rgba(255, 255, 255, 0.1)',
      active: 'rgba(255, 255, 255, 0.2)',
    },
    // Interactive
    interactive: {
      hover: 'rgba(255, 255, 255, 0.05)',
      active: 'rgba(59, 130, 246, 0.1)',
    },
  },
  light: {
    // Backgrounds
    bg: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      tertiary: '#f1f5f9',
      card: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      cardSolid: '#ffffff',
      hover: 'rgba(0, 0, 0, 0.02)',
      elevated: '#ffffff',
    },
    // Text
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#475569', // slate-600
      tertiary: '#64748b', // slate-500
      muted: '#94a3b8', // slate-400
    },
    // Borders
    border: {
      default: 'rgba(0, 0, 0, 0.06)',
      hover: 'rgba(0, 0, 0, 0.1)',
      active: 'rgba(0, 0, 0, 0.15)',
    },
    // Interactive
    interactive: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(59, 130, 246, 0.08)',
    },
  },
};

// Accent colors (same for both themes)
export const accentColors = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
};
