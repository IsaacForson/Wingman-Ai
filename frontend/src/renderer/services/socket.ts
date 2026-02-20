/**
 * Wingman AI - Socket Service
 * Singleton socket connection for the entire app
 */

import { io, Socket } from 'socket.io-client'

const BACKEND_URL = 'http://localhost:8765'

class SocketService {
  private socket: Socket | null = null
  private static instance: SocketService
  private pendingEmits: Array<{ event: string; data?: any }> = []
  private isConnecting = false

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    if (this.isConnecting && this.socket) {
      return this.socket
    }

    this.isConnecting = true

    this.socket = io(BACKEND_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: false
    })

    // Process pending emits when connected
    this.socket.on('connect', () => {
      console.log('[Socket] Connected!')
      this.isConnecting = false
      this.processPendingEmits()
    })

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
    })

    return this.socket
  }

  private processPendingEmits(): void {
    while (this.pendingEmits.length > 0) {
      const item = this.pendingEmits.shift()
      if (item) {
        this.emit(item.event, item.data)
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log(`[Socket] Emitting: ${event}`, data)
      this.socket.emit(event, data)
    } else {
      // Queue the emit for when connection is established
      console.log(`[Socket] Queueing: ${event} (not connected yet)`)
      this.pendingEmits.push({ event, data })
    }
  }

  // Helper methods
  startAudio(): void {
    this.emit('start_audio')
  }

  stopAudio(): void {
    this.emit('stop_audio')
  }

  captureScreen(): void {
    this.emit('capture_screen')
  }

  submitQuestion(question: string, conversationId?: string, mode?: string): void {
    this.emit('submit_question', { question, conversation_id: conversationId, mode })
  }

  setMode(mode: string): void {
    this.emit('set_mode', { mode })
  }

  pause(): void {
    this.emit('pause')
  }

  resume(): void {
    this.emit('resume')
  }

  setAIProvider(provider: string, model?: string): void {
    this.emit('set_ai_provider', { provider, model })
  }

  convertCode(code: string, fromLanguage: string, toLanguage: string, callback: (convertedCode: string) => void): void {
    if (!this.socket?.connected) {
      callback('')
      return
    }

    // Set up one-time listener for the response
    const responseHandler = (data: { converted_code: string; success: boolean; error?: string }) => {
      if (data.success) {
        callback(data.converted_code)
      } else {
        console.error('[Socket] Code conversion failed:', data.error)
        callback('')
      }
    }

    this.socket.once('code_converted', responseHandler)
    this.emit('convert_code', { code, from_language: fromLanguage, to_language: toLanguage })
  }
}

export const socketService = SocketService.getInstance()
export default socketService

