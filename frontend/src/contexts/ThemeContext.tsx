import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getGuildTheme } from '../constants/guilds';

interface ThemeContextType {
  applyGuildTheme: (guildId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userData } = useAuth();

  const applyGuildTheme = (guildId: string) => {
    const theme = getGuildTheme(guildId);
    const root = document.documentElement;
    
    // Apply CSS variables
    root.style.setProperty('--guild-primary', theme.primary);
    root.style.setProperty('--guild-secondary', theme.secondary);
    root.style.setProperty('--guild-accent', theme.accent);
    root.style.setProperty('--guild-background', theme.background);
    
    // Store current theme
    localStorage.setItem('currentGuild', guildId);
  };

  useEffect(() => {
    if (userData?.guild) {
      applyGuildTheme(userData.guild);
    } else {
      // Apply default theme if no guild
      const root = document.documentElement;
      root.style.setProperty('--guild-primary', '#FF4500');
      root.style.setProperty('--guild-secondary', '#FF6347');
      root.style.setProperty('--guild-accent', '#FFD700');
      root.style.setProperty('--guild-background', 'linear-gradient(135deg, #FF4500, #FF6347)');
    }
  }, [userData?.guild]);

  return (
    <ThemeContext.Provider value={{ applyGuildTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};