/**
 * Wingman AI - Conversation History Panel
 * Shows conversation history with options to continue, delete, or clear
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  MessageSquare, 
  Trash2, 
  Clock, 
  Play, 
  Plus,
  Briefcase,
  GraduationCap,
  Mic2,
  Search,
  Users,
  Target,
  Trash
} from 'lucide-react'
import { useAppStore, OperatingMode } from '../../store/appStore'
import toast from 'react-hot-toast'

const API_BASE = 'http://localhost:8765'

interface ConversationSummary {
  id: string
  title: string
  mode: OperatingMode
  created_at: string
  updated_at: string
  message_count: number
  is_active: boolean
}

const modeIcons: Record<OperatingMode, React.ReactNode> = {
  interview: <Mic2 className="w-3 h-3" />,
  study: <GraduationCap className="w-3 h-3" />,
  work: <Briefcase className="w-3 h-3" />,
  meeting: <Users className="w-3 h-3" />,
  research: <Search className="w-3 h-3" />,
  practice: <Target className="w-3 h-3" />
}

const modeColors: Record<OperatingMode, string> = {
  interview: 'text-purple-400 bg-purple-500/20',
  study: 'text-blue-400 bg-blue-500/20',
  work: 'text-green-400 bg-green-500/20',
  meeting: 'text-orange-400 bg-orange-500/20',
  research: 'text-cyan-400 bg-cyan-500/20',
  practice: 'text-pink-400 bg-pink-500/20'
}

const ConversationHistory = () => {
  const { 
    isConversationHistoryOpen, 
    setConversationHistoryOpen,
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    mode,
    setMode
  } = useAppStore()
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch conversations on open
  useEffect(() => {
    if (isConversationHistoryOpen) {
      fetchConversations()
    }
  }, [isConversationHistoryOpen])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/conversations`)
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        setActiveConversationId(data.active_id)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async (conv: ConversationSummary) => {
    try {
      const response = await fetch(`${API_BASE}/api/conversations/${conv.id}/activate`, {
        method: 'POST'
      })
      if (response.ok) {
        setActiveConversationId(conv.id)
        setMode(conv.mode)
        setConversationHistoryOpen(false)
        toast.success(`Continuing "${conv.title}"`)
      }
    } catch (error) {
      toast.error('Failed to continue conversation')
    }
  }

  const handleDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(convId)
    try {
      const response = await fetch(`${API_BASE}/api/conversations/${convId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setConversations(conversations.filter(c => c.id !== convId))
        if (activeConversationId === convId) {
          setActiveConversationId(null)
        }
        toast.success('Conversation deleted')
      }
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Clear all conversation history? This cannot be undone.')) return
    
    try {
      const response = await fetch(`${API_BASE}/api/conversations`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setConversations([])
        setActiveConversationId(null)
        toast.success('History cleared')
      }
    } catch (error) {
      toast.error('Failed to clear history')
    }
  }

  const handleNewConversation = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/conversations?mode=${mode}`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setActiveConversationId(data.id)
        fetchConversations()
        setConversationHistoryOpen(false)
        toast.success('New conversation started')
      }
    } catch (error) {
      toast.error('Failed to create conversation')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!isConversationHistoryOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setConversationHistoryOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        
        {/* Panel */}
        <motion.div
          className="relative w-full max-w-md max-h-[80vh] bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-wingman-400" />
              <h2 className="text-lg font-semibold text-white">History</h2>
              <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                className="p-2 rounded-lg bg-wingman-500/20 hover:bg-wingman-500/30 text-wingman-400 transition-colors"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
              {conversations.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Clear all"
                >
                  <Trash className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setConversationHistoryOpen(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-wingman-500/30 border-t-wingman-500 rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No conversations yet</p>
                <p className="text-white/30 text-xs mt-1">
                  Start asking questions to build history
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <motion.button
                    key={conv.id}
                    onClick={() => handleContinue(conv)}
                    className={`
                      w-full text-left p-3 rounded-xl transition-all
                      ${conv.is_active 
                        ? 'bg-wingman-500/20 border border-wingman-500/30' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }
                    `}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`p-1 rounded ${modeColors[conv.mode]}`}>
                            {modeIcons[conv.mode]}
                          </span>
                          <span className="text-xs text-white/40 capitalize">
                            {conv.mode}
                          </span>
                          {conv.is_active && (
                            <span className="text-[10px] bg-wingman-500/30 text-wingman-300 px-1.5 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium truncate">
                          {conv.title || 'New conversation'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conv.message_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(conv.updated_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <div
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-green-400 transition-colors"
                          title="Continue"
                        >
                          <Play className="w-3 h-3" />
                        </div>
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                          disabled={deleting === conv.id}
                          title="Delete"
                        >
                          {deleting === conv.id ? (
                            <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer info */}
          <div className="p-3 border-t border-white/10 bg-white/5">
            <p className="text-xs text-white/40 text-center">
              Conversations auto-clear after 48 hours
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ConversationHistory

