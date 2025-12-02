/**
 * Wingman AI - App Store
 * Main application state management with Zustand
 */

import { create } from 'zustand'

export type IslandState = 'nano' | 'mini' | 'normal' | 'expanded' | 'fullscreen'
export type OperatingMode = 'interview' | 'study' | 'work' | 'meeting' | 'research' | 'practice'

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
  
  // Session
  sessionId: string | null
  setSessionId: (id: string | null) => void
  questionsCount: number
  answersCount: number
  incrementQuestions: () => void
  incrementAnswers: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Island state
  islandState: 'nano',
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
  
  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  questionsCount: 0,
  answersCount: 0,
  incrementQuestions: () => set((state) => ({ questionsCount: state.questionsCount + 1 })),
  incrementAnswers: () => set((state) => ({ answersCount: state.answersCount + 1 }))
}))

