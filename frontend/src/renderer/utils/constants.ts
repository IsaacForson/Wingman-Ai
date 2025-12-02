/**
 * Wingman AI - Constants
 */

// Backend connection
export const BACKEND_URL = 'http://localhost:8765'
export const WS_URL = 'ws://localhost:8765'

// Island dimensions
export const ISLAND_SIZES = {
  nano: { width: 60, height: 40 },
  mini: { width: 140, height: 44 },
  normal: { width: 420, height: 64 },
  expanded: { width: 600, height: 400 },
  fullscreen: { width: 900, height: 600 }
} as const

// Animation durations (ms)
export const ANIMATION = {
  fast: 150,
  normal: 200,
  slow: 300,
  spring: {
    stiffness: 300,
    damping: 30
  }
} as const

// Hotkeys
export const HOTKEYS = {
  toggleVisibility: 'mod+shift+w',
  commandPalette: 'mod+space',
  togglePause: 'mod+shift+p',
  captureScreen: 'mod+shift+s',
  emergencyHide: 'mod+shift+escape'
} as const

// Mode colors (Tailwind classes)
export const MODE_COLORS = {
  interview: 'bg-blue-500',
  study: 'bg-green-500',
  work: 'bg-purple-500',
  meeting: 'bg-yellow-500',
  research: 'bg-orange-500',
  practice: 'bg-red-500'
} as const

// Status indicators
export const STATUS = {
  connected: 'text-green-400',
  disconnected: 'text-red-400',
  processing: 'text-yellow-400',
  idle: 'text-white/60'
} as const

// Local storage keys
export const STORAGE_KEYS = {
  settings: 'wingman-settings',
  history: 'wingman-history',
  theme: 'wingman-theme'
} as const

// Limits
export const LIMITS = {
  transcriptHistory: 50,
  answerHistory: 20,
  questionLength: 2000,
  answerLength: 10000
} as const

