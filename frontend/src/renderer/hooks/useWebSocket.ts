/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Wingman AI - WebSocket Hook
 * Manages real-time communication with the Python backend
 */

import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import socketService from '../services/socket'
import { useSettingsStore, notifyAnswerReady, requestScreenshot } from '../store/settingsStore'

let hasAutoStarted = false

export function useWebSocket() {
  const {
    setConnected,
    setListening,
    setProcessing,
    setIslandState,
    addTranscriptLine,
    setCurrentAnswer,
    appendToAnswer,
    addToHistory,
    setCurrentQuestion,
    setSessionId,
    incrementQuestions,
    incrementAnswers,
    setAIProvider,
    setAvailableProviders
  } = useAppStore()

  const connect = useCallback(() => {
    const socket = socketService.connect()

    socket.on('connect', () => {
      console.log('Connected to Wingman backend')
      setConnected(true)
      toast.success('Connected to Wingman AI')
      // Push saved settings (provider, keys, audio, ...) to the backend
      const settings = useSettingsStore.getState()
      settings.syncWithBackend()
      socketService.emit('get_ai_providers')
      if (settings.autoStartListening && !hasAutoStarted) {
        hasAutoStarted = true
        socketService.startAudio()
      }
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from Wingman backend')
      setConnected(false)
      toast.error('Disconnected from backend')
    })

    socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error)
      setConnected(false)
    })

    // System events
    socket.on('system_ready', (data: { data?: Record<string, unknown> }) => {
      console.log('System ready:', data)
      setIslandState('normal')
    })

    socket.on('session_started', (data: { data?: { session_id?: string } }) => {
      setSessionId(data.data?.session_id || null)
    })

    // Audio events - no toasts, UI shows listening state
    socket.on('audio_started', () => {
      console.log('[Socket] Audio started')
      setListening(true)
      // Only switch to normal if we're in nano/mini state, NOT if already expanded
      const currentState = useAppStore.getState().islandState
      if (currentState === 'nano' || currentState === 'mini') {
        setIslandState('normal')
      }
    })

    socket.on('audio_stopped', () => {
      console.log('[Socket] Audio stopped')
      setListening(false)
    })

    socket.on('audio_status', (data: { status?: string }) => {
      console.log('[Socket] Audio status:', data)
      if (data.status === 'started') {
        setListening(true)
      } else if (data.status === 'stopped') {
        setListening(false)
      }
    })

    // Transcript events
    socket.on('transcript_partial', (data: { data?: { text?: string } }) => {
      const lineId = `partial-${Date.now()}`
      addTranscriptLine({
        id: lineId,
        text: data.data?.text || '',
        timestamp: new Date(),
        isFinal: false
      })
    })

    socket.on('transcript_final', (data: { data?: { text?: string } }) => {
      const text = data.data?.text || ''
      const lineId = uuidv4()
      addTranscriptLine({
        id: lineId,
        text,
        timestamp: new Date(),
        isFinal: true
      })
    })

    // Question events
    socket.on('question_detected', (data: { data?: { text?: string; source?: 'audio' | 'screen' | 'manual' } }) => {
      const question = data.data?.text || ''
      setCurrentQuestion(question)
      incrementQuestions()
      
      // Don't minimize if already in expanded/fullscreen - stay in chat view
      const currentState = useAppStore.getState().islandState
      if (currentState !== 'expanded' && currentState !== 'fullscreen') {
        setIslandState('normal')
      }
      
      // Create new answer entry
      setCurrentAnswer({
        id: uuidv4(),
        question,
        answer: '',
        isStreaming: false,
        timestamp: new Date(),
        source: data.data?.source || 'audio'
      })
    })

    // Answer events - debounced to prevent flickering
    let isGenerating = false
    
    socket.on('answer_generating', () => {
      if (isGenerating) return // Prevent duplicate processing
      isGenerating = true
      
      console.log('[Socket] Answer generating started')
      setProcessing(true)
      setIslandState('expanded') // Show expanded view immediately
      
      const currentAnswer = useAppStore.getState().currentAnswer
      if (currentAnswer && !currentAnswer.isStreaming) {
        setCurrentAnswer({ ...currentAnswer, isStreaming: true })
      }
    })

    socket.on('answer_chunk', (data: { data?: { chunk?: string } }) => {
      const chunk = data.data?.chunk || ''
      // With streaming off the full answer appears on answer_complete
      if (chunk && useSettingsStore.getState().streamResponses) {
        appendToAnswer(chunk)
      }
    })

    socket.on('answer_complete', (data: { data?: { answer?: string; conversation_id?: string; provider?: string; model?: string } }) => {
      console.log('[Socket] Answer complete via', data.data?.provider)
      isGenerating = false
      setProcessing(false)
      
      const currentAnswer = useAppStore.getState().currentAnswer
      if (currentAnswer) {
        const finalAnswer = {
          ...currentAnswer,
          answer: data.data?.answer || currentAnswer.answer,
          isStreaming: false,
          provider: data.data?.provider,
          model: data.data?.model
        }
        // Add to history and clear currentAnswer to avoid duplicates
        addToHistory(finalAnswer)
        setCurrentAnswer(null) // Clear current - it's now in history
        incrementAnswers()
        notifyAnswerReady(finalAnswer.answer)
      }
      
      // Update active conversation if returned from backend
      if (data.data?.conversation_id) {
        useAppStore.getState().setActiveConversationId(data.data.conversation_id)
      }
    })

    socket.on('answer_error', (data: { data?: { error?: string } }) => {
      console.log('[Socket] Answer error:', data.data?.error)
      isGenerating = false
      setProcessing(false)
      
      const error = data.data?.error || 'Failed to generate answer'
      toast.error(error)
      
      const currentAnswer = useAppStore.getState().currentAnswer
      if (currentAnswer) {
        setCurrentAnswer({ ...currentAnswer, isStreaming: false })
      }
    })

    // Screen events
    socket.on('screen_text', (data: { data?: { text?: string } }) => {
      console.log('Screen text detected:', data.data?.text?.slice(0, 100))
    })

    socket.on('screen_code', (data: { data?: { code?: string; language?: string } }) => {
      console.log('Code detected:', data.data?.language)
    })

    socket.on('screen_mcq', (data: { data?: { question?: string; options?: string[] } }) => {
      console.log('MCQ detected:', data.data?.question)
    })

    // AI Provider events
    socket.on('ai_providers', (data: { current_provider?: string; current_model?: string; available_providers?: string[] }) => {
      if (data.available_providers) {
        setAvailableProviders(data.available_providers as any[])
      }
      if (data.current_provider) {
        setAIProvider(data.current_provider as any, data.current_model)
      }
    })

    socket.on('ai_provider_changed', (data: { provider?: string; model?: string }) => {
      if (data.provider) {
        setAIProvider(data.provider as any, data.model)
        // Keep the Settings panel in step when switching from the island
        useSettingsStore.setState({ aiProvider: data.provider as any, ...(data.model && { aiModel: data.model }) })
        toast.success(`Switched to ${data.provider}`)
      }
    })

    // ============================================
    // 🥷 EXTENSION CAPTURE EVENTS (Stealth Mode)
    // Receives answers from Chrome Extension via backend
    // ============================================
    
    socket.on('extension_capture', (data: { status?: string; question?: string; source?: string }) => {
      console.log('[Socket] 🥷 Extension capture:', data.status)
      
      if (data.status === 'processing') {
        // Show processing state - no toast, UI shows it
        setProcessing(true)
        setIslandState('expanded')
        
        // Set the question
        if (data.question) {
          setCurrentQuestion(data.question)
          setCurrentAnswer({
            id: uuidv4(),
            question: data.question,
            answer: '',
            isStreaming: true,
            timestamp: new Date(),
            source: 'extension' as any
          })
        }
      }
    })

    socket.on('extension_answer', (data: { question?: string; answer?: string; provider?: string; model?: string; source?: string; conversation_id?: string; mode?: string }) => {
      console.log('[Socket] 🥷 Extension answer received via', data.provider)
      
      setProcessing(false)
      setIslandState('expanded')
      
      const answerEntry = {
        id: uuidv4(),
        question: data.question || 'Extension Capture',
        answer: data.answer || '',
        isStreaming: false,
        timestamp: new Date(),
        source: 'extension' as any,
        provider: data.provider,
        model: data.model
      }
      
      setCurrentAnswer(answerEntry)
      addToHistory(answerEntry)
      incrementAnswers()
      notifyAnswerReady(answerEntry.answer)
      
      // Update active conversation if returned from backend
      if (data.conversation_id) {
        useAppStore.getState().setActiveConversationId(data.conversation_id)
      }
    })

    // Chrome extension not reachable: take a screenshot instead so Capture always works
    socket.on('capture_error', () => {
      toast('Chrome extension not connected, using a screenshot', { icon: '📷' })
      requestScreenshot()
    })

    socket.on('system_error', (data: { data?: { error?: string } }) => {
      const error = data.data?.error || 'Something went wrong'
      if (error.includes('Screen & System Audio Recording')) {
        window.wingman?.openScreenRecordingSettings?.()
      }
      toast.error(error, { duration: 10000 })
    })

  }, [
    setConnected, setListening, setProcessing, setIslandState,
    addTranscriptLine, setCurrentAnswer, appendToAnswer,
    addToHistory, setCurrentQuestion, setSessionId, 
    incrementQuestions, incrementAnswers, setAIProvider, setAvailableProviders
  ])

  const disconnect = useCallback(() => {
    socketService.disconnect()
  }, [])

  return {
    connect,
    disconnect,
    emit: socketService.emit.bind(socketService),
    startAudio: socketService.startAudio.bind(socketService),
    stopAudio: socketService.stopAudio.bind(socketService),
    captureScreen: socketService.captureScreen.bind(socketService),
    submitQuestion: socketService.submitQuestion.bind(socketService),
    setBackendMode: socketService.setMode.bind(socketService),
    pause: socketService.pause.bind(socketService),
    resume: socketService.resume.bind(socketService),
    getAIProviders: () => socketService.emit('get_ai_providers'),
    setAIProvider: socketService.setAIProvider.bind(socketService)
  }
}
