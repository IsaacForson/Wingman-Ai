/**
 * Wingman AI - Theme Selector
 * UI for selecting and previewing themes
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Moon, Sun, Monitor } from 'lucide-react'
import { useThemeStore, themes, ThemeMode } from '../../store/themeStore'

interface ThemeSelectorProps {
  compact?: boolean
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false }) => {
  const { currentTheme, themeMode, setTheme, setThemeMode, getAllThemes } = useThemeStore()
  
  const allThemes = getAllThemes()
  
  const modeOptions: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { mode: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { mode: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' }
  ]

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {modeOptions.map(({ mode, icon }) => (
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className={`p-2 rounded-lg transition-colors ${
              themeMode === mode
                ? 'bg-wingman-500/20 text-wingman-400'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div>
        <p className="text-sm text-white/60 mb-3">Appearance Mode</p>
        <div className="flex gap-2">
          {modeOptions.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setThemeMode(mode)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                themeMode === mode
                  ? 'bg-wingman-500/20 border-2 border-wingman-500 text-white'
                  : 'bg-white/5 border-2 border-transparent text-white/60 hover:bg-white/10'
              }`}
            >
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Grid */}
      <div>
        <p className="text-sm text-white/60 mb-3">Color Theme</p>
        <div className="grid grid-cols-4 gap-3">
          {allThemes.map((theme) => (
            <motion.button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                currentTheme === theme.id
                  ? 'border-wingman-500'
                  : 'border-transparent hover:border-white/20'
              }`}
              style={{ backgroundColor: theme.colors.background }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Color Preview */}
              <div className="flex gap-1 mb-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.success }}
                />
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
              
              {/* Theme Name */}
              <p 
                className="text-xs font-medium truncate"
                style={{ color: theme.colors.text }}
              >
                {theme.name}
              </p>
              
              {/* Selected Indicator */}
              {currentTheme === theme.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-wingman-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <p className="text-sm text-white/60 mb-3">Preview</p>
        <div 
          className="p-4 rounded-xl border"
          style={{ 
            backgroundColor: themes[currentTheme]?.colors.background || '#000',
            borderColor: themes[currentTheme]?.colors.border || 'rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: themes[currentTheme]?.colors.primary }}
            >
              <span className="text-white text-sm">AI</span>
            </div>
            <div>
              <p 
                className="text-sm font-medium"
                style={{ color: themes[currentTheme]?.colors.text }}
              >
                Wingman AI
              </p>
              <p 
                className="text-xs"
                style={{ color: themes[currentTheme]?.colors.textMuted }}
              >
                Your AI assistant
              </p>
            </div>
          </div>
          
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: themes[currentTheme]?.colors.surface }}
          >
            <p 
              className="text-xs"
              style={{ color: themes[currentTheme]?.colors.textSecondary }}
            >
              This is how your content will look with the selected theme.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeSelector

