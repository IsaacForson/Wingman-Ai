/**
 * Wingman AI - Main App Component
 */

import { useEffect, useState } from "react"
import { Toaster } from "react-hot-toast"
import DynamicIsland from "./components/DynamicIsland/DynamicIsland"
import { SettingsPanel } from "./components/Settings"
import { CommandPalette } from "./components/CommandPalette"
import { HistoryView } from "./components/History"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { NotificationSystem } from "./components/Notifications"
import { OnboardingFlow } from "./components/Onboarding"
import { useAppStore, OperatingMode } from "./store/appStore"
import { useWebSocket } from "./hooks/useWebSocket"

function AppContent() {
  const { 
    setMode, 
    togglePause, 
    setPaused,
    isSettingsOpen,
    setSettingsOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen
  } = useAppStore()
  
  const [isHistoryOpen, setHistoryOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if first time user
    return localStorage.getItem('wingman_onboarded') !== 'true'
  })
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
  }, [isSettingsOpen, isCommandPaletteOpen, isHistoryOpen, setSettingsOpen, setCommandPaletteOpen, togglePause])

  const handleOnboardingComplete = () => {
    localStorage.setItem('wingman_onboarded', 'true')
    setShowOnboarding(false)
  }

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

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    )
  }

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
      
      {/* Notification System */}
      <NotificationSystem position="top-right" />
      
      {/* Toast Notifications (legacy) */}
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

// Wrap with Error Boundary
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
