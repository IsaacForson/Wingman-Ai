/**
 * Wingman AI - TypeScript Type Definitions
 */

// Window API from preload
export interface WingmanAPI {
  resizeWindow: (state: 'nano' | 'mini' | 'normal' | 'expanded' | 'fullscreen') => Promise<void>
  getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  moveWindow: (x: number, y: number) => Promise<void>
  setAlwaysOnTop: (flag: boolean) => Promise<void>
  setIgnoreMouse: (ignore: boolean) => Promise<void>
  getScreenInfo: () => Promise<{ width: number; height: number; scaleFactor: number }>
  onSetMode: (callback: (mode: string) => void) => () => void
  onTogglePause: (callback: () => void) => () => void
  onCaptureScreen: (callback: () => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
  onOpenCommandPalette: (callback: () => void) => () => void
  onEmergencyHide: (callback: () => void) => () => void
  platform: string
  version: string
}

// Extend Window interface
declare global {
  interface Window {
    wingman: WingmanAPI
  }
}

// Island states
export type IslandState = 'nano' | 'mini' | 'normal' | 'expanded' | 'fullscreen'

// Operating modes
export type OperatingMode = 'interview' | 'study' | 'work' | 'meeting' | 'research' | 'practice'

// Transcript line
export interface TranscriptLine {
  id: string
  text: string
  speaker?: string
  timestamp: Date
  isFinal: boolean
}

// Answer
export interface Answer {
  id: string
  question: string
  answer: string
  isStreaming: boolean
  timestamp: Date
  source: 'audio' | 'screen' | 'manual'
}

// Question classification
export interface QuestionClassification {
  type: 'technical' | 'behavioral' | 'coding' | 'mcq' | 'conceptual' | 'general'
  confidence: number
  keywords: string[]
  isFollowUp: boolean
}

// Session info
export interface SessionInfo {
  id: string
  mode: OperatingMode
  startedAt: Date
  questionsCount: number
  answersCount: number
  isRecording: boolean
}

// WebSocket events
export interface WSEventData {
  data: Record<string, any>
  timestamp: string
  source: string
}

// Settings
export interface Settings {
  // General
  launchAtStartup: boolean
  showInDock: boolean
  alwaysOnTop: boolean
  
  // Audio
  audioEnabled: boolean
  inputDevice: string | null
  vadSensitivity: number
  
  // Screen
  screenCaptureEnabled: boolean
  captureInterval: number
  
  // AI
  defaultModel: string
  temperature: number
  maxTokens: number
  
  // Appearance
  theme: 'dark' | 'light' | 'system'
  islandPosition: 'top' | 'top-left' | 'top-right'
  opacity: number
  
  // Hotkeys
  toggleVisibility: string
  commandPalette: string
  togglePause: string
  captureScreen: string
  emergencyHide: string
}

// Mode configuration
export interface ModeConfig {
  name: string
  icon: string
  color: string
  description: string
  enabledFeatures: string[]
}

export const MODE_CONFIGS: Record<OperatingMode, ModeConfig> = {
  interview: {
    name: 'Interview',
    icon: '🎯',
    color: 'blue',
    description: 'Technical and behavioral interview assistance',
    enabledFeatures: ['audio', 'screen', 'knowledge']
  },
  study: {
    name: 'Study',
    icon: '📚',
    color: 'green',
    description: 'Learning and study assistance',
    enabledFeatures: ['audio', 'screen', 'knowledge']
  },
  work: {
    name: 'Work',
    icon: '💼',
    color: 'purple',
    description: 'Productivity and coding assistance',
    enabledFeatures: ['screen', 'clipboard']
  },
  meeting: {
    name: 'Meeting',
    icon: '🤝',
    color: 'yellow',
    description: 'Meeting intelligence and notes',
    enabledFeatures: ['audio', 'transcript']
  },
  research: {
    name: 'Research',
    icon: '🔬',
    color: 'orange',
    description: 'Deep research and fact-checking',
    enabledFeatures: ['screen', 'search']
  },
  practice: {
    name: 'Practice',
    icon: '🏋️',
    color: 'red',
    description: 'Mock interview practice',
    enabledFeatures: ['audio', 'evaluation']
  }
}

