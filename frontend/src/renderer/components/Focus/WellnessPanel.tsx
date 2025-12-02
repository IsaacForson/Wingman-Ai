/**
 * Wingman AI - Wellness Panel
 * Comprehensive wellness features: breaks, hydration, posture
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Eye,
  Droplets,
  Activity,
  Wind,
  Clock,
  Bell,
  BellOff,
  ChevronRight,
  Sparkles,
  Heart,
  AlertTriangle
} from 'lucide-react'

interface WellnessPanelProps {
  isOpen: boolean
  onClose: () => void
  onOpenFocusTimer: () => void
  onOpenBreathing: () => void
}

interface WellnessReminder {
  id: string
  type: 'eye' | 'hydration' | 'posture' | 'stretch'
  title: string
  message: string
  interval: number // minutes
  enabled: boolean
  lastReminder: Date | null
}

const WellnessPanel: React.FC<WellnessPanelProps> = ({
  isOpen,
  onClose,
  onOpenFocusTimer,
  onOpenBreathing
}) => {
  const [reminders, setReminders] = useState<WellnessReminder[]>([
    {
      id: 'eye',
      type: 'eye',
      title: 'Eye Break (20-20-20)',
      message: 'Look at something 20 feet away for 20 seconds',
      interval: 20,
      enabled: true,
      lastReminder: null
    },
    {
      id: 'hydration',
      type: 'hydration',
      title: 'Hydration Reminder',
      message: 'Time to drink some water! Stay hydrated.',
      interval: 30,
      enabled: true,
      lastReminder: null
    },
    {
      id: 'posture',
      type: 'posture',
      title: 'Posture Check',
      message: 'Check your posture! Sit up straight.',
      interval: 45,
      enabled: true,
      lastReminder: null
    },
    {
      id: 'stretch',
      type: 'stretch',
      title: 'Stretch Break',
      message: 'Time for a quick stretch! Move your body.',
      interval: 60,
      enabled: false,
      lastReminder: null
    }
  ])

  const [waterGlasses, setWaterGlasses] = useState(0)
  const [dailyGoal] = useState(8)
  const [stressLevel, setStressLevel] = useState<'low' | 'medium' | 'high'>('low')
  const [sessionTime, setSessionTime] = useState(0)

  // Track session time
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(t => t + 1)
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Check reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      
      reminders.forEach(reminder => {
        if (!reminder.enabled) return
        
        const lastTime = reminder.lastReminder?.getTime() || 0
        const elapsed = (now.getTime() - lastTime) / 60000 // minutes
        
        if (elapsed >= reminder.interval) {
          // Show notification
          if (Notification.permission === 'granted') {
            new Notification(`🌟 ${reminder.title}`, {
              body: reminder.message
            })
          }
          
          // Update last reminder time
          setReminders(prev => prev.map(r => 
            r.id === reminder.id 
              ? { ...r, lastReminder: now }
              : r
          ))
        }
      })
    }

    const interval = setInterval(checkReminders, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [reminders])

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const updateInterval = (id: string, interval: number) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, interval } : r
    ))
  }

  const addWater = () => {
    setWaterGlasses(prev => Math.min(prev + 1, dailyGoal))
  }

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'eye': return <Eye className="w-5 h-5" />
      case 'hydration': return <Droplets className="w-5 h-5" />
      case 'posture': return <Activity className="w-5 h-5" />
      case 'stretch': return <Wind className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
  }

  const getReminderColor = (type: string) => {
    switch (type) {
      case 'eye': return 'text-blue-400 bg-blue-500/20'
      case 'hydration': return 'text-cyan-400 bg-cyan-500/20'
      case 'posture': return 'text-green-400 bg-green-500/20'
      case 'stretch': return 'text-purple-400 bg-purple-500/20'
      default: return 'text-white/60 bg-white/10'
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
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
            className="relative w-[500px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Wellness</h2>
                  <p className="text-xs text-white/40">Take care of yourself</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Session Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{formatTime(sessionTime)}</p>
                  <p className="text-xs text-white/40">Session</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <Droplets className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{waterGlasses}/{dailyGoal}</p>
                  <p className="text-xs text-white/40">Water</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <Activity className={`w-5 h-5 mx-auto mb-1 ${
                    stressLevel === 'low' ? 'text-green-400' :
                    stressLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <p className="text-lg font-bold text-white capitalize">{stressLevel}</p>
                  <p className="text-xs text-white/40">Stress</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-sm text-white/60 mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onOpenFocusTimer}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-red-400" />
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                    </div>
                    <p className="text-sm font-medium text-white">Focus Timer</p>
                    <p className="text-xs text-white/40">Pomodoro technique</p>
                  </button>
                  <button
                    onClick={onOpenBreathing}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Wind className="w-5 h-5 text-blue-400" />
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                    </div>
                    <p className="text-sm font-medium text-white">Breathing</p>
                    <p className="text-xs text-white/40">Guided exercises</p>
                  </button>
                </div>
              </div>

              {/* Water Tracker */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Water Intake</span>
                  </div>
                  <button
                    onClick={addWater}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors"
                  >
                    + Add Glass
                  </button>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: dailyGoal }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-3 rounded-full transition-colors ${
                        i < waterGlasses ? 'bg-cyan-400' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-cyan-400/60 mt-2">
                  {waterGlasses >= dailyGoal 
                    ? '🎉 Daily goal reached!' 
                    : `${dailyGoal - waterGlasses} more to reach your goal`}
                </p>
              </div>

              {/* Reminders */}
              <div>
                <p className="text-sm text-white/60 mb-3">Reminders</p>
                <div className="space-y-2">
                  {reminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        reminder.enabled 
                          ? 'bg-white/5 border-white/10' 
                          : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getReminderColor(reminder.type)}`}>
                          {getReminderIcon(reminder.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{reminder.title}</p>
                          <p className="text-xs text-white/40">
                            Every {reminder.interval} minutes
                          </p>
                        </div>
                        <select
                          value={reminder.interval}
                          onChange={(e) => updateInterval(reminder.id, parseInt(e.target.value))}
                          className="px-2 py-1 rounded bg-white/10 text-white text-xs border-none outline-none"
                          disabled={!reminder.enabled}
                        >
                          <option value="15">15m</option>
                          <option value="20">20m</option>
                          <option value="30">30m</option>
                          <option value="45">45m</option>
                          <option value="60">60m</option>
                        </select>
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            reminder.enabled
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {reminder.enabled ? (
                            <Bell className="w-4 h-4" />
                          ) : (
                            <BellOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Wellness Tip</span>
                </div>
                <p className="text-sm text-white/60">
                  The 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds. 
                  This helps reduce eye strain from screen time.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default WellnessPanel

