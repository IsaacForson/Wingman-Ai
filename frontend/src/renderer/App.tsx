/**
 * Wingman AI - Main App Component
 */

import { useEffect } from "react"
import { Toaster } from "react-hot-toast"
import DynamicIsland from "./components/DynamicIsland/DynamicIsland"
import { SettingsPanel } from "./components/Settings"
import { CommandPalette } from "./components/CommandPalette"
import { HistoryView } from "./components/History"
import { useAppStore, OperatingMode } from "./store/appStore"
import { useWebSocket } from "./hooks/useWebSocket"
import socketService from "./services/socket"
import { useSettingsStore, requestCapture, requestScreenshot, IslandPosition } from "./store/settingsStore"

const ISLAND_POSITION_CLASSES: Record<IslandPosition, string> = {
  "top": "top-4 left-1/2 -translate-x-1/2",
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom": "bottom-4 left-1/2 -translate-x-1/2",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
}

function App() {
  const { 
    setMode, 
    togglePause, 
    setPaused,
    isSettingsOpen,
    setSettingsOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isHistoryOpen,
    setHistoryOpen,
    isListening,
  } = useAppStore()
  
  const { connect, disconnect } = useWebSocket()
  const islandPosition = useSettingsStore((state) => state.islandPosition)

  // Re-apply saved window/look settings once on startup
  useEffect(() => {
    useSettingsStore.getState().applyLocalSettings()
  }, [])

  // Handle click-through when modals are open
  useEffect(() => {
    const hasModalOpen = isSettingsOpen || isCommandPaletteOpen || isHistoryOpen
    
    if (window.wingman?.setIgnoreMouse) {
      window.wingman.setIgnoreMouse(!hasModalOpen)
    }
  }, [isSettingsOpen, isCommandPaletteOpen, isHistoryOpen])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Space -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.code === 'Space') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      
      // Cmd/Ctrl + , -> Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
      
      // Cmd/Ctrl + Shift + P -> Toggle Pause
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        togglePause()
      }
      
      // Cmd/Ctrl + H -> History
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault()
        setHistoryOpen(true)
      }
      
      // Start/stop listening hotkeys are global shortcuts now (see Settings → Hotkeys)
      
      // Cmd/Ctrl + L -> Toggle Listening
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'l') {
        e.preventDefault()
        if (isListening) {
          socketService.stopAudio()
        } else {
          socketService.startAudio()
        }
      }
      
      // Escape -> Close overlays
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setCommandPaletteOpen(false)
        else if (isSettingsOpen) setSettingsOpen(false)
        else if (isHistoryOpen) setHistoryOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, isCommandPaletteOpen, isHistoryOpen, isListening, setSettingsOpen, setCommandPaletteOpen, setHistoryOpen, togglePause])

  useEffect(() => {
    // Connect to backend
    connect()

    // Setup IPC listeners from Electron
    if (window.wingman) {
      const unsubMode = window.wingman.onSetMode((mode) => {
        setMode(mode as OperatingMode)
      })

      const unsubPause = window.wingman.onTogglePause(() => {
        togglePause()
      })

      const unsubEmergency = window.wingman.onEmergencyHide(() => {
        setPaused(true)
      })

      const unsubCapture = window.wingman.onCaptureScreen(requestCapture)
      const unsubScreenshot = window.wingman.onTakeScreenshot(requestScreenshot)
      const unsubStart = window.wingman.onStartListening(() => socketService.startAudio())
      const unsubStop = window.wingman.onStopListening(() => socketService.stopAudio())

      return () => {
        unsubCapture()
        unsubScreenshot()
        unsubStart()
        unsubStop()
        unsubMode()
        unsubPause()
        unsubEmergency()
        disconnect()
      }
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect, setMode, togglePause, setPaused])

  return (
    <div className="w-screen h-screen relative overflow-visible">
      {/* Main Dynamic Island - Positioned absolutely for free dragging */}
      <div className={`absolute ${ISLAND_POSITION_CLASSES[islandPosition] || ISLAND_POSITION_CLASSES.top} z-50`}>
        <DynamicIsland />
      </div>
      
      {/* Global Overlays */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
      
      <HistoryView
        isOpen={isHistoryOpen}
        onClose={() => setHistoryOpen(false)}
      />
      
      {/* Toast Notifications */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "glass text-white text-sm",
          duration: 3000,
          style: {
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px",
          },
        }}
      />
    </div>
  )
}

export default App
