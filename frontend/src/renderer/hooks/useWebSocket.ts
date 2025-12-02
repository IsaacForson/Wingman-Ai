/**
 * Wingman AI - WebSocket Hook
 * Manages real-time communication with the Python backend
 */


import { useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store/appStore'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

const BACKEND_URL = 'http://localhost:8765'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  
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
    incrementAnswers
  } = useAppStore()

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('Connected to Wingman backend')
      setConnected(true)
      toast.success('Connected to Wingman AI')
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
      setIslandState('nano')
    })

    socket.on('session_started', (data: { data?: { session_id?: string } }) => {
      setSessionId(data.data?.session_id || null)
    })

    // Audio events
    socket.on('audio_started', () => {
      setListening(true)
      setIslandState('mini')
    })

    socket.on('audio_stopped', () => {
      setListening(false)
      setIslandState('nano')
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
      setIslandState('normal')
      
      // Create new answer entry
      setCurrentAnswer({
        id: uuidv4(),
        question,
        answer: '',
        isStreaming: true,
        timestamp: new Date(),
        source: data.data?.source || 'audio'
      })
    })

    // Answer events
    socket.on('answer_generating', () => {
      setProcessing(true)
      setIslandState('normal')
    })

    socket.on('answer_chunk', (data: { data?: { chunk?: string } }) => {
      const chunk = data.data?.chunk || ''
      appendToAnswer(chunk)
      
      // Expand if answer is getting long
      const currentAnswer = useAppStore.getState().currentAnswer
      if (currentAnswer && currentAnswer.answer.length > 200) {
        setIslandState('expanded')
      }
    })

    socket.on('answer_complete', (data: { data?: { answer?: string } }) => {
      setProcessing(false)
      
      const currentAnswer = useAppStore.getState().currentAnswer
      if (currentAnswer) {
        const completedAnswer = {
          ...currentAnswer,
          isStreaming: false,
          answer: data.data?.answer || currentAnswer.answer
        }
        setCurrentAnswer(completedAnswer)
        addToHistory(completedAnswer)
        incrementAnswers()
      }
    })

    socket.on('answer_error', (data: { data?: { error?: string } }) => {
      setProcessing(false)
      toast.error(data.data?.error || 'Failed to generate answer')
      setIslandState('mini')
    })

    // Screen events
    socket.on('screen_text', (data: { data?: { type?: string } }) => {
      console.log('Screen text detected:', data.data?.type)
    })

    socket.on('screen_code', (data: { data?: { blocks?: unknown[] } }) => {
      console.log('Code detected:', data.data?.blocks?.length, 'blocks')
    })

    socket.on('screen_mcq', (data: { data?: { mcq?: unknown } }) => {
      console.log('MCQ detected:', data.data?.mcq)
    })

    // Mode change
    socket.on('mode_changed', (data: { data?: { new_mode?: string } }) => {
      console.log('Mode changed:', data.data?.new_mode)
    })

    socketRef.current = socket
  }, [
    setConnected, setListening, setProcessing, setIslandState,
    addTranscriptLine, setCurrentAnswer, appendToAnswer,
    addToHistory, setCurrentQuestion, setSessionId, 
    incrementQuestions, incrementAnswers
  ])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  // Helper methods
  const startAudio = useCallback(() => emit('start_audio'), [emit])
  const stopAudio = useCallback(() => emit('stop_audio'), [emit])
  const captureScreen = useCallback(() => emit('capture_screen'), [emit])
  const submitQuestion = useCallback((question: string) => {
    emit('submit_question', { question })
  }, [emit])
  const setBackendMode = useCallback((mode: string) => {
    emit('set_mode', { mode })
  }, [emit])
  const pause = useCallback(() => emit('pause'), [emit])
  const resume = useCallback(() => emit('resume'), [emit])

  return {
    connect,
    disconnect,
    emit,
    startAudio,
    stopAudio,
    captureScreen,
    submitQuestion,
    setBackendMode,
    pause,
    resume
  }
}

