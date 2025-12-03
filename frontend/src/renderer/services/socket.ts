/**
 * Wingman AI - Socket Service
 * Singleton socket connection for the entire app
 */

import { io, Socket } from 'socket.io-client'

const BACKEND_URL = 'http://localhost:8765'

class SocketService {
  private socket: Socket | null = null
  private static instance: SocketService

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

    this.socket = io(BACKEND_URL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      console.log(`[Socket] Emitting: ${event}`, data)
      this.socket.emit(event, data)
    } else {
      console.warn(`[Socket] Cannot emit ${event} - not connected`)
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

  submitQuestion(question: string): void {
    this.emit('submit_question', { question })
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
}

export const socketService = SocketService.getInstance()
export default socketService

