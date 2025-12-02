/**
 * Wingman AI - Theme Store
 * Multi-theme support with customization
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan'

export interface Theme {
  id: string
  name: string
  mode: 'dark' | 'light'
  colors: {
    primary: string
    primaryHover: string
    background: string
    backgroundSecondary: string
    surface: string
    surfaceHover: string
    border: string
    text: string
    textSecondary: string
    textMuted: string
    success: string
    warning: string
    error: string
    accent: string
  }
}

// Built-in themes
export const themes: Record<string, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    mode: 'dark',
    colors: {
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      background: '#000000',
      backgroundSecondary: '#0a0a0a',
      surface: 'rgba(255, 255, 255, 0.05)',
      surfaceHover: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      accent: '#6366f1'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    mode: 'light',
    colors: {
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      background: '#ffffff',
      backgroundSecondary: '#f8fafc',
      surface: 'rgba(0, 0, 0, 0.03)',
      surfaceHover: 'rgba(0, 0, 0, 0.06)',
      border: 'rgba(0, 0, 0, 0.1)',
      text: '#0f172a',
      textSecondary: 'rgba(15, 23, 42, 0.7)',
      textMuted: 'rgba(15, 23, 42, 0.4)',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      accent: '#4f46e5'
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      background: '#0c1222',
      backgroundSecondary: '#111827',
      surface: 'rgba(59, 130, 246, 0.1)',
      surfaceHover: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.2)',
      text: '#f1f5f9',
      textSecondary: 'rgba(241, 245, 249, 0.7)',
      textMuted: 'rgba(241, 245, 249, 0.4)',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      accent: '#3b82f6'
    }
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    mode: 'dark',
    colors: {
      primary: '#22c55e',
      primaryHover: '#16a34a',
      background: '#0a0f0a',
      backgroundSecondary: '#111811',
      surface: 'rgba(34, 197, 94, 0.1)',
      surfaceHover: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.2)',
      text: '#f0fdf4',
      textSecondary: 'rgba(240, 253, 244, 0.7)',
      textMuted: 'rgba(240, 253, 244, 0.4)',
      success: '#4ade80',
      warning: '#facc15',
      error: '#fb7185',
      accent: '#22c55e'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    mode: 'dark',
    colors: {
      primary: '#f97316',
      primaryHover: '#ea580c',
      background: '#18120a',
      backgroundSecondary: '#1c1610',
      surface: 'rgba(249, 115, 22, 0.1)',
      surfaceHover: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.2)',
      text: '#fff7ed',
      textSecondary: 'rgba(255, 247, 237, 0.7)',
      textMuted: 'rgba(255, 247, 237, 0.4)',
      success: '#a3e635',
      warning: '#fde047',
      error: '#f87171',
      accent: '#f97316'
    }
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    mode: 'dark',
    colors: {
      primary: '#a855f7',
      primaryHover: '#9333ea',
      background: '#120a18',
      backgroundSecondary: '#1a1025',
      surface: 'rgba(168, 85, 247, 0.1)',
      surfaceHover: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.2)',
      text: '#faf5ff',
      textSecondary: 'rgba(250, 245, 255, 0.7)',
      textMuted: 'rgba(250, 245, 255, 0.4)',
      success: '#4ade80',
      warning: '#fcd34d',
      error: '#fb7185',
      accent: '#a855f7'
    }
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    colors: {
      primary: '#88c0d0',
      primaryHover: '#81a1c1',
      background: '#2e3440',
      backgroundSecondary: '#3b4252',
      surface: 'rgba(136, 192, 208, 0.1)',
      surfaceHover: 'rgba(136, 192, 208, 0.15)',
      border: 'rgba(136, 192, 208, 0.2)',
      text: '#eceff4',
      textSecondary: 'rgba(236, 239, 244, 0.7)',
      textMuted: 'rgba(236, 239, 244, 0.4)',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      accent: '#88c0d0'
    }
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    mode: 'light',
    colors: {
      primary: '#e11d48',
      primaryHover: '#be123c',
      background: '#fff1f2',
      backgroundSecondary: '#ffe4e6',
      surface: 'rgba(225, 29, 72, 0.08)',
      surfaceHover: 'rgba(225, 29, 72, 0.12)',
      border: 'rgba(225, 29, 72, 0.2)',
      text: '#881337',
      textSecondary: 'rgba(136, 19, 55, 0.7)',
      textMuted: 'rgba(136, 19, 55, 0.4)',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      accent: '#e11d48'
    }
  }
}

interface ThemeState {
  currentTheme: string
  themeMode: ThemeMode
  customThemes: Record<string, Theme>
  
  setTheme: (themeId: string) => void
  setThemeMode: (mode: ThemeMode) => void
  addCustomTheme: (theme: Theme) => void
  removeCustomTheme: (themeId: string) => void
  getActiveTheme: () => Theme
  getAllThemes: () => Theme[]
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'dark',
      themeMode: 'dark',
      customThemes: {},
      
      setTheme: (themeId) => {
        const allThemes = { ...themes, ...get().customThemes }
        if (allThemes[themeId]) {
          set({ currentTheme: themeId })
          applyTheme(allThemes[themeId])
        }
      },
      
      setThemeMode: (mode) => {
        set({ themeMode: mode })
        if (mode === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const themeId = prefersDark ? 'dark' : 'light'
          set({ currentTheme: themeId })
          applyTheme(themes[themeId])
        }
      },
      
      addCustomTheme: (theme) => {
        set((state) => ({
          customThemes: { ...state.customThemes, [theme.id]: theme }
        }))
      },
      
      removeCustomTheme: (themeId) => {
        set((state) => {
          const { [themeId]: _, ...rest } = state.customThemes
          return { customThemes: rest }
        })
      },
      
      getActiveTheme: () => {
        const { currentTheme, customThemes } = get()
        return { ...themes, ...customThemes }[currentTheme] || themes.dark
      },
      
      getAllThemes: () => {
        const { customThemes } = get()
        return [...Object.values(themes), ...Object.values(customThemes)]
      }
    }),
    {
      name: 'wingman-theme'
    }
  )
)

// Apply theme to CSS variables
function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
  })
  
  // Set data attribute for conditional styling
  root.setAttribute('data-theme', theme.mode)
}

// Initialize theme on load
export function initializeTheme() {
  const store = useThemeStore.getState()
  const theme = store.getActiveTheme()
  applyTheme(theme)
  
  // Listen for system theme changes
  if (store.themeMode === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const themeId = e.matches ? 'dark' : 'light'
      useThemeStore.getState().setTheme(themeId)
    })
  }
}

