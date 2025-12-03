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
  } = useAppStore()
  
  const { connect, disconnect } = useWebSocket()

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
      
      // Escape -> Close overlays
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setCommandPaletteOpen(false)
        else if (isSettingsOpen) setSettingsOpen(false)
        else if (isHistoryOpen) setHistoryOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, isCommandPaletteOpen, isHistoryOpen, setSettingsOpen, setCommandPaletteOpen, setHistoryOpen, togglePause])

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

      return () => {
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
    <div className="w-full h-full flex items-start justify-center pt-0">
      {/* Main Dynamic Island */}
      <DynamicIsland />
      
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
