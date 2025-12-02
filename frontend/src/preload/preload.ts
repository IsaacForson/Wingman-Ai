/**
 * Wingman AI - Preload Script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'

// Types for the exposed API
export interface WingmanAPI {
  // Window management
  resizeWindow: (state: 'nano' | 'mini' | 'normal' | 'expanded' | 'fullscreen') => Promise<void>
  getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  moveWindow: (x: number, y: number) => Promise<void>
  setAlwaysOnTop: (flag: boolean) => Promise<void>
  setIgnoreMouse: (ignore: boolean) => Promise<void>
  getScreenInfo: () => Promise<{ width: number; height: number; scaleFactor: number }>

  // Event listeners
  onSetMode: (callback: (mode: string) => void) => () => void
  onTogglePause: (callback: () => void) => () => void
  onCaptureScreen: (callback: () => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
  onOpenCommandPalette: (callback: () => void) => () => void
  onEmergencyHide: (callback: () => void) => () => void

  // App info
  platform: string
  version: string
}

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('wingman', {
  // Window management
  resizeWindow: (state: string) => ipcRenderer.invoke('resize-window', state),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  moveWindow: (x: number, y: number) => ipcRenderer.invoke('move-window', x, y),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('set-always-on-top', flag),
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.invoke('set-ignore-mouse', ignore),
  getScreenInfo: () => ipcRenderer.invoke('get-screen-info'),

  // Event listeners
  onSetMode: (callback: (mode: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, mode: string) => callback(mode)
    ipcRenderer.on('set-mode', handler)
    return () => ipcRenderer.removeListener('set-mode', handler)
  },
  
  onTogglePause: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-pause', handler)
    return () => ipcRenderer.removeListener('toggle-pause', handler)
  },
  
  onCaptureScreen: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('capture-screen', handler)
    return () => ipcRenderer.removeListener('capture-screen', handler)
  },
  
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  },
  
  onOpenCommandPalette: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-command-palette', handler)
    return () => ipcRenderer.removeListener('open-command-palette', handler)
  },
  
  onEmergencyHide: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('emergency-hide', handler)
    return () => ipcRenderer.removeListener('emergency-hide', handler)
  },

  // App info
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
} as WingmanAPI)

// Type declaration for window object
declare global {
  interface Window {
    wingman: WingmanAPI
  }
}

