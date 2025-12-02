/**
 * Wingman AI - Mode Switcher
 * UI for switching between different operating modes
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, OperatingMode } from '../../store/appStore'
import {
  Brain,
  BookOpen,
  Briefcase,
  Users,
  FlaskConical,
  Dumbbell,
  ChevronDown,
  Check,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ModeConfig {
  id: OperatingMode
  name: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  features: string[]
}

const modes: ModeConfig[] = [
  {
    id: 'interview',
    name: 'Interview',
    description: 'Technical & behavioral interview assistance',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    features: ['Question detection', 'Code explanations', 'Behavioral tips']
  },
  {
    id: 'study',
    name: 'Study',
    description: 'Learning and exam preparation',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-500/20',
    features: ['Concept explanations', 'Quiz mode', 'Flashcard support']
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Productivity and coding assistance',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20',
    features: ['Code completion', 'Bug detection', 'Documentation help']
  },
  {
    id: 'meeting',
    name: 'Meeting',
    description: 'Real-time meeting intelligence',
    icon: <Users className="w-5 h-5" />,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-orange-500/20',
    features: ['Live transcription', 'Action items', 'Meeting summary']
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Deep research and analysis',
    icon: <FlaskConical className="w-5 h-5" />,
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-red-500/20',
    features: ['Source analysis', 'Citation help', 'Synthesis']
  },
  {
    id: 'practice',
    name: 'Practice',
    description: 'Mock interview practice sessions',
    icon: <Dumbbell className="w-5 h-5" />,
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-pink-500/20',
    features: ['Mock interviews', 'Feedback', 'Progress tracking']
  }
]

interface ModeSwitcherProps {
  variant?: 'compact' | 'dropdown' | 'grid'
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ variant = 'dropdown' }) => {
  const { mode, setMode } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentMode = modes.find(m => m.id === mode) || modes[0]

  const handleModeChange = (newMode: OperatingMode) => {
    setMode(newMode)
    setIsOpen(false)
    const modeConfig = modes.find(m => m.id === newMode)
    toast.success(`Switched to ${modeConfig?.name} Mode`)
  }

  // Compact variant - just the icon
  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ${currentMode.color}`}
          title={`${currentMode.name} Mode`}
        >
          {currentMode.icon}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full right-0 mt-2 w-64 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl z-50 overflow-hidden"
              >
                {modes.map((modeItem) => (
                  <button
                    key={modeItem.id}
                    onClick={() => handleModeChange(modeItem.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      mode === modeItem.id
                        ? 'bg-wingman-500/20'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={modeItem.color}>{modeItem.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-white font-medium">{modeItem.name}</p>
                      <p className="text-xs text-white/40">{modeItem.description}</p>
                    </div>
                    {mode === modeItem.id && (
                      <Check className="w-4 h-4 text-wingman-400" />
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${currentMode.gradient} hover:opacity-90 transition-opacity`}
        >
          <span className={currentMode.color}>{currentMode.icon}</span>
          <span className="text-sm text-white font-medium">{currentMode.name}</span>
          <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-wide">Select Mode</p>
                </div>
                <div className="p-1">
                  {modes.map((modeItem) => (
                    <motion.button
                      key={modeItem.id}
                      onClick={() => handleModeChange(modeItem.id)}
                      whileHover={{ x: 2 }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        mode === modeItem.id
                          ? 'bg-wingman-500/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${modeItem.gradient}`}>
                        <span className={modeItem.color}>{modeItem.icon}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-white font-medium">{modeItem.name}</p>
                        <p className="text-xs text-white/40">{modeItem.description}</p>
                      </div>
                      {mode === modeItem.id && (
                        <Check className="w-4 h-4 text-wingman-400" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Grid variant - full selection grid
  return (
    <div className="grid grid-cols-2 gap-3">
      {modes.map((modeItem) => (
        <motion.button
          key={modeItem.id}
          onClick={() => handleModeChange(modeItem.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative p-4 rounded-xl border transition-all ${
            mode === modeItem.id
              ? 'bg-wingman-500/20 border-wingman-500/40'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          {/* Active indicator */}
          {mode === modeItem.id && (
            <motion.div
              layoutId="mode-indicator"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-wingman-500/20 to-wingman-600/20 border border-wingman-500/40"
            />
          )}

          <div className="relative">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${modeItem.gradient} flex items-center justify-center mb-3`}>
              <span className={modeItem.color}>{modeItem.icon}</span>
            </div>

            {/* Info */}
            <h4 className="text-sm font-medium text-white mb-1">{modeItem.name}</h4>
            <p className="text-xs text-white/40 mb-3">{modeItem.description}</p>

            {/* Features */}
            <div className="space-y-1">
              {modeItem.features.slice(0, 2).map((feature) => (
                <div key={feature} className="flex items-center gap-1.5 text-xs text-white/50">
                  <Sparkles className="w-3 h-3" />
                  {feature}
                </div>
              ))}
            </div>

            {/* Check mark */}
            {mode === modeItem.id && (
              <div className="absolute top-0 right-0 p-1 rounded-full bg-wingman-500">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  )
}

export default ModeSwitcher

