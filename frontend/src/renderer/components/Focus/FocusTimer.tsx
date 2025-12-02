/**
 * Wingman AI - Focus Timer (Pomodoro)
 * Productivity timer with break reminders
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Settings,
  Volume2,
  VolumeX,
  Target,
  Flame
} from 'lucide-react'

interface FocusTimerProps {
  isOpen: boolean
  onClose: () => void
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

interface TimerSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
}

const defaultSettings: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true
}

const FocusTimer: React.FC<FocusTimerProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  
  const [mode, setMode] = useState<TimerMode>('focus')
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalFocusTime, setTotalFocusTime] = useState(0)

  // Get duration for current mode
  const getModeDuration = useCallback((m: TimerMode) => {
    switch (m) {
      case 'focus': return settings.focusMinutes * 60
      case 'shortBreak': return settings.shortBreakMinutes * 60
      case 'longBreak': return settings.longBreakMinutes * 60
    }
  }, [settings])

  // Reset timer when mode changes
  useEffect(() => {
    setTimeLeft(getModeDuration(mode))
    setIsRunning(false)
  }, [mode, getModeDuration])

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1)
        if (mode === 'focus') {
          setTotalFocusTime(t => t + 1)
        }
      }, 1000)
    } else if (timeLeft === 0) {
      handleTimerComplete()
    }

    return () => clearInterval(interval)
  }, [isRunning, timeLeft, mode])

  const handleTimerComplete = () => {
    // Play sound
    if (settings.soundEnabled) {
      playNotificationSound()
    }

    // Show notification
    if (Notification.permission === 'granted') {
      new Notification(
        mode === 'focus' ? '🎯 Focus session complete!' : '☕ Break is over!',
        { body: mode === 'focus' ? 'Time for a break!' : 'Ready to focus?' }
      )
    }

    if (mode === 'focus') {
      const newCompletedSessions = completedSessions + 1
      setCompletedSessions(newCompletedSessions)

      // Determine next break type
      const isLongBreak = newCompletedSessions % settings.sessionsUntilLongBreak === 0
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak'
      setMode(nextMode)

      if (settings.autoStartBreaks) {
        setTimeout(() => setIsRunning(true), 1000)
      }
    } else {
      setMode('focus')
      if (settings.autoStartFocus) {
        setTimeout(() => setIsRunning(true), 1000)
      }
    }
  }

  const playNotificationSound = () => {
    // Simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    
    oscillator.start()
    setTimeout(() => oscillator.stop(), 200)
  }

  const toggleTimer = () => setIsRunning(!isRunning)
  
  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(getModeDuration(mode))
  }

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatTotalTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const progress = 1 - timeLeft / getModeDuration(mode)

  const getModeColor = () => {
    switch (mode) {
      case 'focus': return 'text-red-400'
      case 'shortBreak': return 'text-green-400'
      case 'longBreak': return 'text-blue-400'
    }
  }

  const getModeBackground = () => {
    switch (mode) {
      case 'focus': return 'from-red-500/20 to-orange-500/20'
      case 'shortBreak': return 'from-green-500/20 to-emerald-500/20'
      case 'longBreak': return 'from-blue-500/20 to-cyan-500/20'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className={`relative w-[400px] rounded-2xl bg-gradient-to-br ${getModeBackground()} backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Target className={`w-5 h-5 ${getModeColor()}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Focus Timer</h2>
                  <p className="text-xs text-white/40">
                    {completedSessions} sessions today
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showSettings ? (
              /* Settings Panel */
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-2">Focus Duration (min)</label>
                  <input
                    type="number"
                    value={settings.focusMinutes}
                    onChange={(e) => setSettings(s => ({ ...s, focusMinutes: parseInt(e.target.value) || 25 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white"
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-2">Short Break (min)</label>
                  <input
                    type="number"
                    value={settings.shortBreakMinutes}
                    onChange={(e) => setSettings(s => ({ ...s, shortBreakMinutes: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white"
                    min="1"
                    max="30"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/60 block mb-2">Long Break (min)</label>
                  <input
                    type="number"
                    value={settings.longBreakMinutes}
                    onChange={(e) => setSettings(s => ({ ...s, longBreakMinutes: parseInt(e.target.value) || 15 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white"
                    min="1"
                    max="60"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Auto-start breaks</span>
                  <button
                    onClick={() => setSettings(s => ({ ...s, autoStartBreaks: !s.autoStartBreaks }))}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.autoStartBreaks ? 'bg-green-500' : 'bg-white/20'
                    }`}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ x: settings.autoStartBreaks ? 22 : 2 }}
                    />
                  </button>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 rounded-lg bg-wingman-500 hover:bg-wingman-600 text-white font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Timer Display */
              <div className="p-6">
                {/* Mode Tabs */}
                <div className="flex gap-2 mb-6">
                  {(['focus', 'shortBreak', 'longBreak'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        mode === m
                          ? 'bg-white/20 text-white'
                          : 'text-white/40 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {m === 'focus' ? (
                        <span className="flex items-center justify-center gap-1">
                          <Brain className="w-4 h-4" /> Focus
                        </span>
                      ) : m === 'shortBreak' ? (
                        <span className="flex items-center justify-center gap-1">
                          <Coffee className="w-4 h-4" /> Short
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <Coffee className="w-4 h-4" /> Long
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Timer Circle */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  {/* Background circle */}
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-white/10"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className={getModeColor()}
                      strokeDasharray={553}
                      initial={{ strokeDashoffset: 553 }}
                      animate={{ strokeDashoffset: 553 * (1 - progress) }}
                    />
                  </svg>
                  
                  {/* Time Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold ${getModeColor()}`}>
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-sm text-white/40 capitalize">{mode.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={resetTimer}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleTimer}
                    className={`p-4 rounded-xl ${
                      isRunning
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-wingman-500 hover:bg-wingman-600'
                    } text-white transition-colors`}
                  >
                    {isRunning ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => switchMode(mode === 'focus' ? 'shortBreak' : 'focus')}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  >
                    {mode === 'focus' ? <Coffee className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-400">
                      <Flame className="w-4 h-4" />
                      <span className="text-lg font-bold">{completedSessions}</span>
                    </div>
                    <span className="text-xs text-white/40">Sessions</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-white">{formatTotalTime(totalFocusTime)}</span>
                    <span className="text-xs text-white/40 block">Focus Time</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FocusTimer

