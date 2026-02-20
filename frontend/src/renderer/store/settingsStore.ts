/**
 * Wingman AI - Settings Store
 * Persistent settings management with backend sync
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import socketService from '../services/socket'

export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'gemini' | 'together' | 'huggingface' | 'ollama'
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large'
export type OCREngine = 'tesseract' | 'easyocr'
export type Theme = 'dark' | 'light' | 'system'
export type IslandPosition = 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'

interface SettingsState {
  // General Settings
  launchAtStartup: boolean
  setLaunchAtStartup: (value: boolean) => void
  
  alwaysOnTop: boolean
  setAlwaysOnTop: (value: boolean) => void
  
  showInDock: boolean
  setShowInDock: (value: boolean) => void
  
  minimizeToTray: boolean
  setMinimizeToTray: (value: boolean) => void
  
  soundEffects: boolean
  setSoundEffects: (value: boolean) => void
  
  desktopNotifications: boolean
  setDesktopNotifications: (value: boolean) => void
  
  // Audio Settings
  inputDevice: string
  setInputDevice: (device: string) => void
  
  vadSensitivity: number
  setVadSensitivity: (value: number) => void
  
  autoStartListening: boolean
  setAutoStartListening: (value: boolean) => void
  
  whisperModel: WhisperModel
  setWhisperModel: (model: WhisperModel) => void
  
  useLocalWhisper: boolean
  setUseLocalWhisper: (value: boolean) => void
  
  silenceThreshold: number
  setSilenceThreshold: (value: number) => void
  
  // Screen Settings
  enableScreenCapture: boolean
  setEnableScreenCapture: (value: boolean) => void
  
  captureInterval: number
  setCaptureInterval: (value: number) => void
  
  ocrEngine: OCREngine
  setOcrEngine: (engine: OCREngine) => void
  
  detectCodeBlocks: boolean
  setDetectCodeBlocks: (value: boolean) => void
  
  detectMCQs: boolean
  setDetectMCQs: (value: boolean) => void
  
  // AI Settings
  aiProvider: AIProvider
  setAIProvider: (provider: AIProvider) => void
  
  aiModel: string
  setAIModel: (model: string) => void
  
  temperature: number
  setTemperature: (value: number) => void
  
  maxTokens: number
  setMaxTokens: (value: number) => void
  
  streamResponses: boolean
  setStreamResponses: (value: boolean) => void
  
  autoScrollAnswers: boolean
  setAutoScrollAnswers: (value: boolean) => void
  
  // API Keys (stored securely)
  apiKeys: {
    openai?: string
    anthropic?: string
    groq?: string
    google?: string
    together?: string
    huggingface?: string
  }
  setAPIKey: (provider: string, key: string) => void
  
  ollamaBaseUrl: string
  setOllamaBaseUrl: (url: string) => void
  
  // Appearance Settings
  theme: Theme
  setTheme: (theme: Theme) => void
  
  islandPosition: IslandPosition
  setIslandPosition: (position: IslandPosition) => void
  
  windowOpacity: number
  setWindowOpacity: (value: number) => void
  
  accentColor: string
  setAccentColor: (color: string) => void
  
  compactMode: boolean
  setCompactMode: (value: boolean) => void
  
  // Privacy Settings
  hideFromScreenCapture: boolean
  setHideFromScreenCapture: (value: boolean) => void
  
  saveSessionHistory: boolean
  setSaveSessionHistory: (value: boolean) => void
  
  anonymousAnalytics: boolean
  setAnonymousAnalytics: (value: boolean) => void
  
  // Hotkeys
  hotkeys: {
    toggleVisibility: string
    commandPalette: string
    pauseResume: string
    captureScreen: string
    emergencyHide: string
    startListening: string
    stopListening: string
  }
  setHotkey: (action: string, keys: string) => void
  
  // Actions
  syncWithBackend: () => void
  resetToDefaults: () => void
  clearAllData: () => void
}

const defaultSettings = {
  // General
  launchAtStartup: false,
  alwaysOnTop: true,
  showInDock: false,
  minimizeToTray: true,
  soundEffects: true,
  desktopNotifications: true,
  
  // Audio
  inputDevice: 'default',
  vadSensitivity: 2,
  autoStartListening: false,
  whisperModel: 'base' as WhisperModel,
  useLocalWhisper: false,
  silenceThreshold: 500,
  
  // Screen
  enableScreenCapture: true,
  captureInterval: 2,
  ocrEngine: 'tesseract' as OCREngine,
  detectCodeBlocks: true,
  detectMCQs: true,
  
  // AI
  aiProvider: 'groq' as AIProvider,
  aiModel: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 2048,
  streamResponses: true,
  autoScrollAnswers: false,
  apiKeys: {},
  ollamaBaseUrl: 'http://localhost:11434',
  
  // Appearance
  theme: 'dark' as Theme,
  islandPosition: 'top' as IslandPosition,
  windowOpacity: 85,
  accentColor: '#0ea5e9',
  compactMode: false,
  
  // Privacy
  hideFromScreenCapture: true,
  saveSessionHistory: true,
  anonymousAnalytics: false,
  
  // Hotkeys
  hotkeys: {
    toggleVisibility: 'CommandOrControl+Shift+W',
    commandPalette: 'CommandOrControl+Space',
    pauseResume: 'CommandOrControl+Shift+P',
    captureScreen: 'CommandOrControl+Shift+S',
    emergencyHide: 'CommandOrControl+Shift+Escape',
    startListening: 'CommandOrControl+Shift+L',
    stopListening: 'CommandOrControl+Shift+K',
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      // General setters
      setLaunchAtStartup: (value) => {
        set({ launchAtStartup: value })
        window.wingman?.setLaunchAtStartup?.(value)
      },
      
      setAlwaysOnTop: (value) => {
        set({ alwaysOnTop: value })
        window.wingman?.setAlwaysOnTop?.(value)
      },
      
      setShowInDock: (value) => {
        set({ showInDock: value })
        window.wingman?.setShowInDock?.(value)
      },
      
      setMinimizeToTray: (value) => set({ minimizeToTray: value }),
      setSoundEffects: (value) => set({ soundEffects: value }),
      setDesktopNotifications: (value) => set({ desktopNotifications: value }),
      
      // Audio setters
      setInputDevice: (device) => {
        set({ inputDevice: device })
        socketService.emit('set_audio_device', { device })
      },
      
      setVadSensitivity: (value) => {
        set({ vadSensitivity: value })
        socketService.emit('set_vad_sensitivity', { sensitivity: value })
      },
      
      setAutoStartListening: (value) => set({ autoStartListening: value }),
      
      setWhisperModel: (model) => {
        set({ whisperModel: model })
        socketService.emit('set_whisper_model', { model })
      },
      
      setUseLocalWhisper: (value) => {
        set({ useLocalWhisper: value })
        socketService.emit('set_use_local_whisper', { value })
      },
      
      setSilenceThreshold: (value) => set({ silenceThreshold: value }),
      
      // Screen setters
      setEnableScreenCapture: (value) => {
        set({ enableScreenCapture: value })
        socketService.emit('set_screen_capture', { enabled: value })
      },
      
      setCaptureInterval: (value) => {
        set({ captureInterval: value })
        socketService.emit('set_capture_interval', { interval: value })
      },
      
      setOcrEngine: (engine) => {
        set({ ocrEngine: engine })
        socketService.emit('set_ocr_engine', { engine })
      },
      
      setDetectCodeBlocks: (value) => set({ detectCodeBlocks: value }),
      setDetectMCQs: (value) => set({ detectMCQs: value }),
      
      // AI setters
      setAIProvider: (provider) => {
        set({ aiProvider: provider })
        socketService.setAIProvider(provider, get().aiModel)
      },
      
      setAIModel: (model) => {
        set({ aiModel: model })
        socketService.setAIProvider(get().aiProvider, model)
      },
      
      setTemperature: (value) => {
        set({ temperature: value })
        socketService.emit('set_temperature', { temperature: value })
      },
      
      setMaxTokens: (value) => {
        set({ maxTokens: value })
        socketService.emit('set_max_tokens', { maxTokens: value })
      },
      
      setStreamResponses: (value) => set({ streamResponses: value }),
      
      setAutoScrollAnswers: (value) => set({ autoScrollAnswers: value }),
      
      setAPIKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key }
        }))
        socketService.emit('set_api_key', { provider, key })
      },
      
      setOllamaBaseUrl: (url) => {
        set({ ollamaBaseUrl: url })
        socketService.emit('set_ollama_url', { url })
      },
      
      // Appearance setters
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
      },
      
      setIslandPosition: (position) => {
        set({ islandPosition: position })
        window.wingman?.setIslandPosition?.(position)
      },
      
      setWindowOpacity: (value) => {
        set({ windowOpacity: value })
        window.wingman?.setWindowOpacity?.(value / 100)
      },
      
      setAccentColor: (color) => {
        set({ accentColor: color })
        document.documentElement.style.setProperty('--accent-color', color)
      },
      
      setCompactMode: (value) => set({ compactMode: value }),
      
      // Privacy setters
      setHideFromScreenCapture: (value) => {
        set({ hideFromScreenCapture: value })
        window.wingman?.setHideFromScreenCapture?.(value)
      },
      
      setSaveSessionHistory: (value) => set({ saveSessionHistory: value }),
      setAnonymousAnalytics: (value) => set({ anonymousAnalytics: value }),
      
      // Hotkeys setter
      setHotkey: (action, keys) => {
        set((state) => ({
          hotkeys: { ...state.hotkeys, [action]: keys }
        }))
        window.wingman?.setHotkey?.(action, keys)
      },
      
      // Actions
      syncWithBackend: () => {
        const state = get()
        socketService.emit('sync_settings', {
          aiProvider: state.aiProvider,
          aiModel: state.aiModel,
          temperature: state.temperature,
          maxTokens: state.maxTokens,
          vadSensitivity: state.vadSensitivity,
          whisperModel: state.whisperModel,
          useLocalWhisper: state.useLocalWhisper,
          enableScreenCapture: state.enableScreenCapture,
          captureInterval: state.captureInterval,
          ocrEngine: state.ocrEngine,
          apiKeys: state.apiKeys,
          ollamaBaseUrl: state.ollamaBaseUrl,
        })
      },
      
      resetToDefaults: () => {
        set(defaultSettings)
        get().syncWithBackend()
      },
      
      clearAllData: () => {
        localStorage.clear()
        set(defaultSettings)
      },
    }),
    {
      name: 'wingman-settings',
      partialize: (state) => ({
        // Only persist these fields
        launchAtStartup: state.launchAtStartup,
        alwaysOnTop: state.alwaysOnTop,
        showInDock: state.showInDock,
        minimizeToTray: state.minimizeToTray,
        soundEffects: state.soundEffects,
        desktopNotifications: state.desktopNotifications,
        inputDevice: state.inputDevice,
        vadSensitivity: state.vadSensitivity,
        autoStartListening: state.autoStartListening,
        whisperModel: state.whisperModel,
        useLocalWhisper: state.useLocalWhisper,
        silenceThreshold: state.silenceThreshold,
        enableScreenCapture: state.enableScreenCapture,
        captureInterval: state.captureInterval,
        ocrEngine: state.ocrEngine,
        detectCodeBlocks: state.detectCodeBlocks,
        detectMCQs: state.detectMCQs,
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        streamResponses: state.streamResponses,
        autoScrollAnswers: state.autoScrollAnswers,
        apiKeys: state.apiKeys,
        ollamaBaseUrl: state.ollamaBaseUrl,
        theme: state.theme,
        islandPosition: state.islandPosition,
        windowOpacity: state.windowOpacity,
        accentColor: state.accentColor,
        compactMode: state.compactMode,
        hideFromScreenCapture: state.hideFromScreenCapture,
        saveSessionHistory: state.saveSessionHistory,
        anonymousAnalytics: state.anonymousAnalytics,
        hotkeys: state.hotkeys,
      }),
    }
  )
)

