import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: 'dark' | 'light'; // The resolved theme based on system preference
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Try to get from localStorage, default to 'system'
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('deguste-theme') as Theme;
        return saved || 'system';
    });

    const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        let resolvedTheme: 'dark' | 'light' = 'dark';

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            resolvedTheme = systemTheme;
        } else {
            resolvedTheme = theme;
        }

        root.classList.add(resolvedTheme);
        setActualTheme(resolvedTheme);

        // Save preference
        localStorage.setItem('deguste-theme', theme);
    }, [theme]);

    // Listen for system preference changes if 'system' is selected
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(newSystemTheme);
            setActualTheme(newSystemTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
