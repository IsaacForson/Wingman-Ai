/**
 * Wingman AI - History View
 * Browse past questions and answers
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import {
  X,
  Search,
  Calendar,
  Clock,
  MessageSquare,
  Mic,
  Monitor,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Download,
  Filter,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

interface HistoryItem {
  id: string
  question: string
  answer: string
  source: 'audio' | 'screen' | 'manual'
  mode: string
  timestamp: string
  feedback?: 'positive' | 'negative'
}

interface HistoryViewProps {
  isOpen: boolean
  onClose: () => void
}

const HistoryView: React.FC<HistoryViewProps> = ({ isOpen, onClose }) => {
  const { answerHistory } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Convert store history to display format
  const historyItems: HistoryItem[] = answerHistory.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    source: item.source,
    mode: 'interview', // Default mode
    timestamp: item.timestamp.toISOString()
  }))

  // Filter history
  const filteredHistory = historyItems.filter((item) => {
    const matchesSearch = !searchQuery || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesMode = !selectedMode || item.mode === selectedMode
    const matchesSource = !selectedSource || item.source === selectedSource
    
    return matchesSearch && matchesMode && matchesSource
  })

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copied to clipboard')
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'audio':
        return <Mic className="w-3.5 h-3.5" />
      case 'screen':
        return <Monitor className="w-3.5 h-3.5" />
      default:
        return <Edit3 className="w-3.5 h-3.5" />
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return date.toLocaleDateString()
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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-[800px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-wingman-500/20">
                  <Clock className="w-5 h-5 text-wingman-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">History</h2>
                  <p className="text-xs text-white/40">
                    {filteredHistory.length} items
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-wingman-500/50"
                />
              </div>
              
              {/* Source Filter */}
              <select
                value={selectedSource || ''}
                onChange={(e) => setSelectedSource(e.target.value || null)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-wingman-500/50"
              >
                <option value="">All Sources</option>
                <option value="audio">Audio</option>
                <option value="screen">Screen</option>
                <option value="manual">Manual</option>
              </select>

              {/* Mode Filter */}
              <select
                value={selectedMode || ''}
                onChange={(e) => setSelectedMode(e.target.value || null)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-wingman-500/50"
              >
                <option value="">All Modes</option>
                <option value="interview">Interview</option>
                <option value="study">Study</option>
                <option value="work">Work</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mb-4" />
                  <p className="text-sm text-white/40 mb-2">No history yet</p>
                  <p className="text-xs text-white/30">
                    Questions and answers will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
                    >
                      {/* Item Header */}
                      <button
                        onClick={() => setExpandedItem(
                          expandedItem === item.id ? null : item.id
                        )}
                        className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                      >
                        {/* Source Icon */}
                        <div className={`mt-1 p-2 rounded-lg ${
                          item.source === 'audio' ? 'bg-red-500/20 text-red-400' :
                          item.source === 'screen' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {getSourceIcon(item.source)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium line-clamp-2">
                            {item.question}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.timestamp)}
                            </span>
                            <span className="capitalize">{item.mode}</span>
                          </div>
                        </div>

                        {/* Expand Indicator */}
                        <ChevronDown 
                          className={`w-4 h-4 text-white/40 transition-transform ${
                            expandedItem === item.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {expandedItem === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10"
                          >
                            <div className="p-4 space-y-4">
                              {/* Question */}
                              <div>
                                <p className="text-xs text-white/40 mb-1">Question</p>
                                <p className="text-sm text-white">{item.question}</p>
                              </div>

                              {/* Answer */}
                              <div>
                                <p className="text-xs text-white/40 mb-1">Answer</p>
                                <p className="text-sm text-white/80 whitespace-pre-wrap">
                                  {item.answer}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => handleCopy(item.answer, item.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs hover:bg-white/20 transition-colors"
                                >
                                  {copiedId === item.id ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Copy Answer
                                    </>
                                  )}
                                </button>
                                <button
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 text-xs hover:bg-white/10 hover:text-green-400 transition-colors"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/40 text-xs hover:bg-white/10 hover:text-red-400 transition-colors"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>History is stored locally on your device</span>
                <button
                  onClick={() => toast.success('Export coming soon!')}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default HistoryView

