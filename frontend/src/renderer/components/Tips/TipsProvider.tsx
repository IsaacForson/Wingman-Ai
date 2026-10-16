/**
 * Wingman AI - In-App Tips System
 * Contextual tips and guidance for users
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lightbulb, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface Tip {
  id: string
  title: string
  content: string
  category: 'getting_started' | 'productivity' | 'shortcuts' | 'features' | 'pro_tips'
  trigger?: string // When to show this tip
  seen?: boolean
}

interface TipsContextType {
  currentTip: Tip | null
  showTip: (tipId: string) => void
  dismissTip: () => void
  showRandomTip: () => void
  markTipSeen: (tipId: string) => void
  seenTips: string[]
  allTips: Tip[]
}

const TipsContext = createContext<TipsContextType | null>(null)

// All available tips
const tips: Tip[] = [
  // Getting Started
  {
    id: 'welcome',
    title: 'Welcome to Wingman AI! 🚀',
    content: 'I\'m your AI assistant for interviews, studying, and work. I listen to conversations and provide real-time answers. Try saying something!',
    category: 'getting_started'
  },
  {
    id: 'modes',
    title: 'Different Modes for Different Needs',
    content: 'Switch between Interview, Study, Work, and Meeting modes for context-aware assistance. Each mode is optimized for specific scenarios.',
    category: 'getting_started'
  },
  {
    id: 'expand',
    title: 'Expand for More Details',
    content: 'Click on the Dynamic Island to expand it and see full answers. Click again to minimize.',
    category: 'getting_started'
  },
  
  // Shortcuts
  {
    id: 'cmd_space',
    title: 'Quick Actions with Cmd+Space',
    content: 'Press Cmd+Space (or Ctrl+Space on Windows) to open the Command Palette for quick access to all features.',
    category: 'shortcuts'
  },
  {
    id: 'pause_shortcut',
    title: 'Pause Anytime',
    content: 'Press Cmd+Shift+P to quickly pause/resume listening. Useful when you need privacy.',
    category: 'shortcuts'
  },
  {
    id: 'settings_shortcut',
    title: 'Quick Settings Access',
    content: 'Press Cmd+, to open settings instantly. Customize AI providers, audio settings, and more.',
    category: 'shortcuts'
  },
  
  // Productivity
  {
    id: 'focus_timer',
    title: 'Stay Focused with Pomodoro',
    content: 'Use the Focus Timer (Cmd+Space → "Focus") for productivity. 25 min work + 5 min break is the classic technique.',
    category: 'productivity'
  },
  {
    id: 'breaks',
    title: 'Take Regular Breaks',
    content: 'Enable eye break reminders in Wellness settings. The 20-20-20 rule: Every 20 min, look 20 ft away for 20 sec.',
    category: 'productivity'
  },
  {
    id: 'history',
    title: 'Review Your History',
    content: 'Press Cmd+H to view past questions and answers. Great for reviewing what was discussed.',
    category: 'productivity'
  },
  
  // Features
  {
    id: 'knowledge_base',
    title: 'Upload Your Documents',
    content: 'Add your resume, study materials, or work docs to the Knowledge Base. I\'ll use them to give more personalized answers.',
    category: 'features'
  },
  {
    id: 'practice_mode',
    title: 'Practice for Interviews',
    content: 'Use Practice Mode to simulate interviews. I\'ll ask questions and give feedback on your answers using the STAR method.',
    category: 'features'
  },
  {
    id: 'meeting_mode',
    title: 'Meeting Intelligence',
    content: 'In Meeting mode, I track speakers, extract action items, and can generate meeting summaries.',
    category: 'features'
  },
  {
    id: 'themes',
    title: 'Customize Your Look',
    content: 'Choose from 8 beautiful themes in Settings → Appearance. Find one that matches your style!',
    category: 'features'
  },
  
  // Pro Tips
  {
    id: 'star_method',
    title: 'Master the STAR Method',
    content: 'For behavioral questions, structure answers as: Situation, Task, Action, Result. I\'ll analyze your practice answers!',
    category: 'pro_tips'
  },
  {
    id: 'ai_providers',
    title: 'Try Different AI Providers',
    content: 'Groq answers first. If it is busy or down, Wingman switches to NVIDIA automatically and rotates through your NVIDIA keys.',
    category: 'pro_tips'
  },
  {
    id: 'screen_capture',
    title: 'Screen-Share Safe',
    content: 'Wingman is invisible to screen sharing apps. Use it confidently during video calls!',
    category: 'pro_tips'
  },
  {
    id: 'achievements',
    title: 'Earn Achievements',
    content: 'Keep using Wingman to unlock achievements and maintain streaks. Check your progress in the Achievements panel!',
    category: 'pro_tips'
  }
]

export function TipsProvider({ children }: { children: React.ReactNode }) {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null)
  const [seenTips, setSeenTips] = useState<string[]>(() => {
    const saved = localStorage.getItem('wingman_seen_tips')
    return saved ? JSON.parse(saved) : []
  })

  // Save seen tips to localStorage
  useEffect(() => {
    localStorage.setItem('wingman_seen_tips', JSON.stringify(seenTips))
  }, [seenTips])

  const showTip = useCallback((tipId: string) => {
    const tip = tips.find(t => t.id === tipId)
    if (tip) {
      setCurrentTip(tip)
    }
  }, [])

  const dismissTip = useCallback(() => {
    if (currentTip) {
      markTipSeen(currentTip.id)
    }
    setCurrentTip(null)
  }, [currentTip])

  const markTipSeen = useCallback((tipId: string) => {
    setSeenTips(prev => {
      if (prev.includes(tipId)) return prev
      return [...prev, tipId]
    })
  }, [])

  const showRandomTip = useCallback(() => {
    const unseenTips = tips.filter(t => !seenTips.includes(t.id))
    const pool = unseenTips.length > 0 ? unseenTips : tips
    const randomTip = pool[Math.floor(Math.random() * pool.length)]
    setCurrentTip(randomTip)
  }, [seenTips])

  // Show welcome tip on first load
  useEffect(() => {
    if (!seenTips.includes('welcome')) {
      const timer = setTimeout(() => {
        showTip('welcome')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [seenTips, showTip])

  return (
    <TipsContext.Provider value={{
      currentTip,
      showTip,
      dismissTip,
      showRandomTip,
      markTipSeen,
      seenTips,
      allTips: tips
    }}>
      {children}
      <TipDisplay />
    </TipsContext.Provider>
  )
}

export function useTips() {
  const context = useContext(TipsContext)
  if (!context) {
    throw new Error('useTips must be used within TipsProvider')
  }
  return context
}

// Tip Display Component
function TipDisplay() {
  const { currentTip, dismissTip, showRandomTip, seenTips, allTips } = useTips()
  const [tipIndex, setTipIndex] = useState(0)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting_started': return 'from-green-500/20 to-emerald-500/20 border-green-500/30'
      case 'shortcuts': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      case 'productivity': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
      case 'features': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      case 'pro_tips': return 'from-red-500/20 to-pink-500/20 border-red-500/30'
      default: return 'from-white/10 to-white/5 border-white/10'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'getting_started': return '🚀 Getting Started'
      case 'shortcuts': return '⌨️ Shortcuts'
      case 'productivity': return '⚡ Productivity'
      case 'features': return '✨ Features'
      case 'pro_tips': return '💡 Pro Tips'
      default: return 'Tip'
    }
  }

  if (!currentTip) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 right-6 z-50 w-80"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
      >
        <div className={`rounded-2xl bg-gradient-to-br ${getCategoryColor(currentTip.category)} backdrop-blur-xl border shadow-2xl overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white/60">{getCategoryLabel(currentTip.category)}</span>
            </div>
            <button
              onClick={dismissTip}
              className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white mb-2">{currentTip.title}</h3>
            <p className="text-sm text-white/70 leading-relaxed">{currentTip.content}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/20">
            <span className="text-xs text-white/40">
              {seenTips.length}/{allTips.length} tips seen
            </span>
            <button
              onClick={showRandomTip}
              className="flex items-center gap-1 text-xs text-wingman-400 hover:text-wingman-300 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Next tip
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Floating tip button component
export function TipButton() {
  const { showRandomTip } = useTips()

  return (
    <motion.button
      onClick={showRandomTip}
      className="fixed bottom-6 right-6 p-3 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors shadow-lg"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Lightbulb className="w-5 h-5" />
    </motion.button>
  )
}

