/**
 * Wingman AI - App Store
 * Main application state management with Zustand
 */

import { create } from 'zustand'

export type IslandState = 'nano' | 'mini' | 'normal' | 'expanded' | 'fullscreen'
export type OperatingMode = 'interview' | 'study' | 'work' | 'meeting' | 'research' | 'practice'

interface ConversationSummary {
  id: string
  title: string
  mode: OperatingMode
  created_at: string
  updated_at: string
  message_count: number
  is_active: boolean
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
export type AIProvider = 'groq' | 'gemini' | 'mistral'

interface TranscriptLine {
  id: string
  text: string
  speaker?: string
  timestamp: Date
  isFinal: boolean
}

interface Answer {
  id: string
  question: string
  answer: string
  isStreaming: boolean
  timestamp: Date
  source: 'audio' | 'screen' | 'manual'
  provider?: string
  model?: string
}

interface AppState {
  // Island state
  islandState: IslandState
  setIslandState: (state: IslandState) => void
  
  // Operating mode
  mode: OperatingMode
  setMode: (mode: OperatingMode) => void
  
  // Connection status
  isConnected: boolean
  setConnected: (connected: boolean) => void
  
  // Processing state
  isListening: boolean
  setListening: (listening: boolean) => void
  
  isProcessing: boolean
  setProcessing: (processing: boolean) => void
  
  isPaused: boolean
  setPaused: (paused: boolean) => void
  togglePause: () => void
  
  // Transcript
  transcript: TranscriptLine[]
  addTranscriptLine: (line: TranscriptLine) => void
  updateTranscriptLine: (id: string, text: string, isFinal: boolean) => void
  clearTranscript: () => void
  
  // Current answer
  currentAnswer: Answer | null
  setCurrentAnswer: (answer: Answer | null) => void
  appendToAnswer: (chunk: string) => void
  
  // Answer history
  answerHistory: Answer[]
  addToHistory: (answer: Answer) => void
  clearHistory: () => void
  
  // Current question
  currentQuestion: string | null
  setCurrentQuestion: (question: string | null) => void
  
  // Settings panel
  isSettingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  
  // Command palette
  isCommandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  
  // History panel
  isHistoryOpen: boolean
  setHistoryOpen: (open: boolean) => void
  
  // Analytics dashboard
  isAnalyticsOpen: boolean
  setAnalyticsOpen: (open: boolean) => void
  
  // Practice mode
  isPracticeOpen: boolean
  setPracticeOpen: (open: boolean) => void
  
  // Meeting HUD
  isMeetingOpen: boolean
  setMeetingOpen: (open: boolean) => void
  
  // Focus timer
  isFocusTimerOpen: boolean
  setFocusTimerOpen: (open: boolean) => void
  
  // Breathing exercise
  isBreathingOpen: boolean
  setBreathingOpen: (open: boolean) => void
  
  // Wellness panel
  isWellnessOpen: boolean
  setWellnessOpen: (open: boolean) => void
  
  // Achievements panel
  isAchievementsOpen: boolean
  setAchievementsOpen: (open: boolean) => void
  
  // Performance monitor
  isPerformanceOpen: boolean
  setPerformanceOpen: (open: boolean) => void
  
  // Session
  sessionId: string | null
  setSessionId: (id: string | null) => void
  questionsCount: number
  answersCount: number
  incrementQuestions: () => void
  incrementAnswers: () => void
  
  // AI Provider
  aiProvider: AIProvider
  aiModel: string
  availableProviders: AIProvider[]
  setAIProvider: (provider: AIProvider, model?: string) => void
  setAvailableProviders: (providers: AIProvider[]) => void
  
  // Conversation History
  conversations: ConversationSummary[]
  activeConversationId: string | null
  setConversations: (conversations: ConversationSummary[]) => void
  setActiveConversationId: (id: string | null) => void
  isConversationHistoryOpen: boolean
  setConversationHistoryOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Island state - Start with 'normal' so it's visible
  islandState: 'normal',
  setIslandState: (state) => {
    set({ islandState: state })
    // Also resize the Electron window
    window.wingman?.resizeWindow(state)
  },
  
  // Operating mode
  mode: 'interview',
  setMode: (mode) => set({ mode }),
  
  // Connection status
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
  
  // Processing state
  isListening: false,
  setListening: (listening) => set({ isListening: listening }),
  
  isProcessing: false,
  setProcessing: (processing) => set({ isProcessing: processing }),
  
  isPaused: false,
  setPaused: (paused) => set({ isPaused: paused }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  // Transcript
  transcript: [],
  addTranscriptLine: (line) => set((state) => ({
    transcript: [...state.transcript.slice(-50), line] // Keep last 50 lines
  })),
  updateTranscriptLine: (id, text, isFinal) => set((state) => ({
    transcript: state.transcript.map((line) =>
      line.id === id ? { ...line, text, isFinal } : line
    )
  })),
  clearTranscript: () => set({ transcript: [] }),
  
  // Current answer
  currentAnswer: null,
  setCurrentAnswer: (answer) => set({ currentAnswer: answer }),
  appendToAnswer: (chunk) => set((state) => {
    if (!state.currentAnswer) return state
    return {
      currentAnswer: {
        ...state.currentAnswer,
        answer: state.currentAnswer.answer + chunk
      }
    }
  }),
  
  // Answer history
  answerHistory: [],
  addToHistory: (answer) => set((state) => ({
    answerHistory: [...state.answerHistory.slice(-20), answer] // Keep last 20
  })),
  clearHistory: () => set({ answerHistory: [] }),
  
  // Current question
  currentQuestion: null,
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  
  // Settings panel
  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  
  // Command palette
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  
  // History panel
  isHistoryOpen: false,
  setHistoryOpen: (open) => set({ isHistoryOpen: open }),
  
  // Analytics dashboard
  isAnalyticsOpen: false,
  setAnalyticsOpen: (open) => set({ isAnalyticsOpen: open }),
  
  // Practice mode
  isPracticeOpen: false,
  setPracticeOpen: (open) => set({ isPracticeOpen: open }),
  
  // Meeting HUD
  isMeetingOpen: false,
  setMeetingOpen: (open) => set({ isMeetingOpen: open }),
  
  // Focus timer
  isFocusTimerOpen: false,
  setFocusTimerOpen: (open) => set({ isFocusTimerOpen: open }),
  
  // Breathing exercise
  isBreathingOpen: false,
  setBreathingOpen: (open) => set({ isBreathingOpen: open }),
  
  // Wellness panel
  isWellnessOpen: false,
  setWellnessOpen: (open) => set({ isWellnessOpen: open }),
  
  // Achievements panel
  isAchievementsOpen: false,
  setAchievementsOpen: (open) => set({ isAchievementsOpen: open }),
  
  // Performance monitor
  isPerformanceOpen: false,
  setPerformanceOpen: (open) => set({ isPerformanceOpen: open }),
  
  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  questionsCount: 0,
  answersCount: 0,
  incrementQuestions: () => set((state) => ({ questionsCount: state.questionsCount + 1 })),
  incrementAnswers: () => set((state) => ({ answersCount: state.answersCount + 1 })),
  
  // AI Provider
  aiProvider: 'groq',
  aiModel: 'llama-3.3-70b-versatile',
  availableProviders: ['groq', 'gemini', 'mistral'],
  setAIProvider: (provider, model) => set({ 
    aiProvider: provider,
    ...(model && { aiModel: model })
  }),
  setAvailableProviders: (providers) => set({ availableProviders: providers }),
  
  // Conversation History
  conversations: [],
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  isConversationHistoryOpen: false,
  setConversationHistoryOpen: (open) => set({ isConversationHistoryOpen: open })
}))

