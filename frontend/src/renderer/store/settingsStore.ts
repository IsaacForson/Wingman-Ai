/**
 * Wingman AI - Settings Store
 * Persistent settings management with backend sync
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import socketService from '../services/socket'
import { useAppStore, AIProvider, PROVIDER_MODELS } from './appStore'
import { loadTabs } from '../services/tabs'

export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large'
export type IslandPosition = 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'
export type HotkeyAction = 'toggleVisibility' | 'commandPalette' | 'pauseResume' | 'captureScreen' | 'screenshot' | 'emergencyHide' | 'startListening' | 'stopListening'
export type ListenSource = 'mic' | 'system' | 'both'

interface SettingsState {
  // General Settings
  launchAtStartup: boolean
  setLaunchAtStartup: (value: boolean) => void

  alwaysOnTop: boolean
  setAlwaysOnTop: (value: boolean) => void

  showInDock: boolean
  setShowInDock: (value: boolean) => void

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
  
  listenSource: ListenSource
  setListenSource: (source: ListenSource) => void
  
  // Profile: used as context for interview / practice answers
  resume: string
  setResume: (text: string) => void
  
  jobDescription: string
  setJobDescription: (text: string) => void

  // Screen Settings
  enableScreenCapture: boolean
  setEnableScreenCapture: (value: boolean) => void

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

  // API Keys (blank = use the backend .env). nvidia holds several keys, comma or newline separated
  apiKeys: {
    groq?: string
    nvidia?: string
  }
  setAPIKey: (provider: string, key: string) => void

  // Appearance Settings
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

  // Hotkeys (Electron accelerators)
  hotkeys: Record<HotkeyAction, string>
  setHotkey: (action: HotkeyAction, keys: string) => Promise<boolean>

  // Actions
  syncWithBackend: () => void
  applyLocalSettings: () => void
  resetToDefaults: () => void
  clearAllData: () => Promise<void>
}

const defaultSettings = {
  // General
  launchAtStartup: false,
  alwaysOnTop: true,
  showInDock: false,
  soundEffects: false,
  desktopNotifications: false,

  // Audio
  inputDevice: 'default',
  vadSensitivity: 2,
  autoStartListening: false,
  whisperModel: 'base' as WhisperModel,
  useLocalWhisper: false,
  silenceThreshold: 2000,
  listenSource: 'mic' as ListenSource,
  
  // Profile
  resume: '',
  jobDescription: '',

  // Screen
  enableScreenCapture: true,

  // AI
  aiProvider: 'groq' as AIProvider,
  aiModel: PROVIDER_MODELS.groq[0],
  temperature: 0.7,
  maxTokens: 2048,
  streamResponses: true,
  autoScrollAnswers: false,
  apiKeys: {},

  // Appearance
  islandPosition: 'top' as IslandPosition,
  windowOpacity: 100,
  accentColor: '#0ea5e9',
  compactMode: false,

  // Privacy
  hideFromScreenCapture: true,
  saveSessionHistory: true,

  // Hotkeys
  hotkeys: {
    toggleVisibility: 'CommandOrControl+Shift+W',
    commandPalette: 'CommandOrControl+Space',
    pauseResume: 'CommandOrControl+Shift+P',
    captureScreen: 'CommandOrControl+Shift+S',
    screenshot: 'CommandOrControl+Shift+X',
    emergencyHide: 'CommandOrControl+Shift+Escape',
    startListening: 'CommandOrControl+Shift+L',
    stopListening: 'CommandOrControl+Shift+K',
  } as Record<HotkeyAction, string>,
}

// Send one changed field to the backend
const syncField = (data: Record<string, unknown>) => socketService.emit('sync_settings', data)

// Tailwind's wingman-300..600 read these variables (see tailwind.config.js)
function applyAccent(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const rgb = [n >> 16, (n >> 8) & 255, n & 255]
  const mix = (target: number, amount: number) =>
    rgb.map((c) => Math.round(c + (target - c) * amount)).join(' ')
  const root = document.documentElement.style
  root.setProperty('--wingman-300', mix(255, 0.5))
  root.setProperty('--wingman-400', mix(255, 0.25))
  root.setProperty('--wingman-500', rgb.join(' '))
  root.setProperty('--wingman-600', mix(0, 0.15))
}

// Tailwind sizes are rem-based, so shrinking the root font scales the whole UI
const applyCompact = (compact: boolean) => {
  document.documentElement.style.fontSize = compact ? '14px' : ''
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

      setSoundEffects: (value) => set({ soundEffects: value }),
      setDesktopNotifications: (value) => {
        set({ desktopNotifications: value })
        if (value && 'Notification' in window) Notification.requestPermission()
      },

      // Audio setters (applied the next time listening starts)
      setInputDevice: (device) => {
        set({ inputDevice: device })
        syncField({ inputDevice: device })
      },

      setVadSensitivity: (value) => {
        set({ vadSensitivity: value })
        syncField({ vadSensitivity: value })
      },

      setAutoStartListening: (value) => set({ autoStartListening: value }),

      setWhisperModel: (model) => {
        set({ whisperModel: model })
        syncField({ whisperModel: model, useLocalWhisper: get().useLocalWhisper })
      },

      setUseLocalWhisper: (value) => {
        set({ useLocalWhisper: value })
        syncField({ whisperModel: get().whisperModel, useLocalWhisper: value })
      },

      setSilenceThreshold: (value) => {
        set({ silenceThreshold: value })
        syncField({ silenceThreshold: value })
      },

      setListenSource: (source) => {
        set({ listenSource: source })
        syncField({ listenSource: source })
      },
      
      // Profile setters
      setResume: (text) => {
        set({ resume: text })
        syncField({ resume: text })
      },
      
      setJobDescription: (text) => {
        set({ jobDescription: text })
        syncField({ jobDescription: text })
      },
      
      // Screen setters
      setEnableScreenCapture: (value) => set({ enableScreenCapture: value }),

      // AI setters
      setAIProvider: (provider) => {
        const model = PROVIDER_MODELS[provider][0]
        set({ aiProvider: provider, aiModel: model })
        useAppStore.getState().setAIProvider(provider, model)
        socketService.setAIProvider(provider, model)
      },

      setAIModel: (model) => {
        set({ aiModel: model })
        useAppStore.getState().setAIProvider(get().aiProvider, model)
        socketService.setAIProvider(get().aiProvider, model)
      },

      setTemperature: (value) => {
        set({ temperature: value })
        syncField({ temperature: value })
      },

      setMaxTokens: (value) => {
        set({ maxTokens: value })
        syncField({ maxTokens: value })
      },

      setStreamResponses: (value) => set({ streamResponses: value }),

      setAutoScrollAnswers: (value) => set({ autoScrollAnswers: value }),

      setAPIKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key }
        }))
        socketService.emit('set_api_key', { provider, key })
      },

      // Appearance setters
      setIslandPosition: (position) => set({ islandPosition: position }),

      setWindowOpacity: (value) => {
        set({ windowOpacity: value })
        window.wingman?.setWindowOpacity?.(value / 100)
      },

      setAccentColor: (color) => {
        set({ accentColor: color })
        applyAccent(color)
      },

      setCompactMode: (value) => {
        set({ compactMode: value })
        applyCompact(value)
      },

      // Privacy setters
      setHideFromScreenCapture: (value) => {
        set({ hideFromScreenCapture: value })
        window.wingman?.setHideFromScreenCapture?.(value)
      },

      setSaveSessionHistory: (value) => {
        set({ saveSessionHistory: value })
        syncField({ saveSessionHistory: value })
      },

      // Hotkeys setter: only saved if Electron could register it
      setHotkey: async (action, keys) => {
        const ok = (await window.wingman?.setHotkey?.(action, keys)) ?? true
        if (ok) {
          set((state) => ({ hotkeys: { ...state.hotkeys, [action]: keys } }))
        }
        return ok
      },

      // Actions
      syncWithBackend: () => {
        const state = get()
        syncField({
          aiProvider: state.aiProvider,
          aiModel: state.aiModel,
          temperature: state.temperature,
          maxTokens: state.maxTokens,
          inputDevice: state.inputDevice,
          vadSensitivity: state.vadSensitivity,
          silenceThreshold: state.silenceThreshold,
          listenSource: state.listenSource,
          resume: state.resume,
          jobDescription: state.jobDescription,
          whisperModel: state.whisperModel,
          useLocalWhisper: state.useLocalWhisper,
          saveSessionHistory: state.saveSessionHistory,
          apiKeys: state.apiKeys,
        })
      },

      // Re-apply window/look settings on startup (Electron doesn't remember them)
      applyLocalSettings: () => {
        const state = get()
        window.wingman?.setAlwaysOnTop?.(state.alwaysOnTop)
        window.wingman?.setShowInDock?.(state.showInDock)
        window.wingman?.setWindowOpacity?.(state.windowOpacity / 100)
        window.wingman?.setHideFromScreenCapture?.(state.hideFromScreenCapture)
        for (const [action, keys] of Object.entries(state.hotkeys)) {
          window.wingman?.setHotkey?.(action, keys)
        }
        applyAccent(state.accentColor)
        applyCompact(state.compactMode)
      },

      resetToDefaults: () => {
        set(defaultSettings)
        get().applyLocalSettings()
        get().syncWithBackend()
        useAppStore.getState().setAIProvider(defaultSettings.aiProvider, defaultSettings.aiModel)
      },

      clearAllData: async () => {
        localStorage.clear()
        useAppStore.getState().clearHistory()
        get().resetToDefaults()
        await fetch('http://localhost:8765/api/conversations', { method: 'DELETE' }).catch(() => {})
        useAppStore.setState({ tabs: [], activeConversationId: null })
        await loadTabs()  // starts one fresh chat
      },
    }),
    {
      name: 'wingman-settings',
      version: 2,
      // v1 had other AI providers, retired models and settings that did nothing (sound/notifications were "on" but silent)
      migrate: (persisted: any, version) => {
        if (version < 2 && persisted) {
          const provider = persisted.aiProvider === 'nvidia' ? 'nvidia' : 'groq'
          persisted.aiProvider = provider
          persisted.aiModel = PROVIDER_MODELS[provider][0]
          persisted.apiKeys = { groq: persisted.apiKeys?.groq }
          persisted.soundEffects = false
          persisted.desktopNotifications = false
          persisted.windowOpacity = 100
          // v1 stored browser mic IDs; the backend needs its own numeric device IDs
          if (!/^\d+$/.test(String(persisted.inputDevice))) persisted.inputDevice = 'default'
          // v1's 500ms was never applied; the real wait was ~2s, so keep that
          persisted.silenceThreshold = 2000
        }
        return persisted
      },
      // Saved hotkeys from older versions lack newer actions; keep the defaults for those
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        hotkeys: { ...current.hotkeys, ...persisted?.hotkeys },
      }),
      partialize: (state) => ({
        // Only persist these fields
        launchAtStartup: state.launchAtStartup,
        alwaysOnTop: state.alwaysOnTop,
        showInDock: state.showInDock,
        soundEffects: state.soundEffects,
        desktopNotifications: state.desktopNotifications,
        inputDevice: state.inputDevice,
        vadSensitivity: state.vadSensitivity,
        autoStartListening: state.autoStartListening,
        whisperModel: state.whisperModel,
        useLocalWhisper: state.useLocalWhisper,
        silenceThreshold: state.silenceThreshold,
        listenSource: state.listenSource,
        resume: state.resume,
        jobDescription: state.jobDescription,
        enableScreenCapture: state.enableScreenCapture,
        aiProvider: state.aiProvider,
        aiModel: state.aiModel,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        streamResponses: state.streamResponses,
        autoScrollAnswers: state.autoScrollAnswers,
        apiKeys: state.apiKeys,
        islandPosition: state.islandPosition,
        windowOpacity: state.windowOpacity,
        accentColor: state.accentColor,
        compactMode: state.compactMode,
        hideFromScreenCapture: state.hideFromScreenCapture,
        saveSessionHistory: state.saveSessionHistory,
        hotkeys: state.hotkeys,
      }),
    }
  )
)

// Capture button / hotkey: the Chrome extension grabs the active tab and the answer lands in the island
export function requestCapture() {
  if (!useSettingsStore.getState().enableScreenCapture) {
    toast.error('Screen capture is off (Settings → Screen)')
    return
  }
  socketService.requestCapture()
}

// Screenshot of the screen under the mouse -> vision model. Works outside Chrome and on images/PDFs.
export async function requestScreenshot() {
  if (!useSettingsStore.getState().enableScreenCapture) {
    toast.error('Screen capture is off (Settings → Screen)')
    return
  }
  const result = await window.wingman?.captureScreenshot?.()
  if (!result) {
    toast.error('Screenshots only work in the desktop app')
    return
  }
  if (result.error || !result.image) {
    toast.error(result.error || 'Screenshot failed', { duration: 10000 })
    return
  }
  const { activeConversationId, mode, setProcessing } = useAppStore.getState()
  setProcessing(true)
  socketService.emit('analyze_screenshot', {
    image: result.image,
    conversation_id: activeConversationId || undefined,
    mode
  })
}

// Sound + notification when an answer finishes (both off by default)
export function notifyAnswerReady(answer: string) {
  const { soundEffects, desktopNotifications } = useSettingsStore.getState()
  if (soundEffects) {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => ctx.close()
  }
  // Only when Wingman is hidden, otherwise the island already shows it
  if (desktopNotifications && document.hidden && 'Notification' in window) {
    new Notification('Wingman AI', { body: answer.slice(0, 140) })
  }
}
