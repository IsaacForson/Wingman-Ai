/**
 * Wingman AI - Meeting HUD
 * Real-time meeting intelligence interface
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Users,
  Clock,
  ListTodo,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  StopCircle,
  FileText,
  Copy,
  Download,
  Smile,
  Frown,
  Meh
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Speaker {
  name: string
  wordCount: number
  speakingTime: number
  interventions: number
}

interface ActionItem {
  id: string
  text: string
  assignee: string | null
  priority: 'high' | 'medium' | 'low'
}

interface KeyPoint {
  id: string
  text: string
  category: 'decision' | 'insight' | 'question' | 'concern'
  timestamp: string
}

interface MeetingHUDProps {
  isOpen: boolean
  onClose: () => void
}

const MeetingHUD: React.FC<MeetingHUDProps> = ({ isOpen, onClose }) => {
  const [isActive, setIsActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')
  const [activeTab, setActiveTab] = useState<'overview' | 'speakers' | 'actions' | 'transcript'>('overview')
  
  const [speakers, setSpeakers] = useState<Record<string, Speaker>>({
    'You': { name: 'You', wordCount: 245, speakingTime: 180, interventions: 12 },
    'Interviewer': { name: 'Interviewer', wordCount: 389, speakingTime: 290, interventions: 15 }
  })

  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { id: '1', text: 'Follow up on technical assessment results', assignee: 'Interviewer', priority: 'high' },
    { id: '2', text: 'Send portfolio links', assignee: 'You', priority: 'medium' },
    { id: '3', text: 'Schedule next round interview', assignee: null, priority: 'high' }
  ])

  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([
    { id: '1', text: 'Team uses React and TypeScript primarily', category: 'insight', timestamp: '2:34' },
    { id: '2', text: 'Remote work is supported 3 days/week', category: 'decision', timestamp: '5:12' },
    { id: '3', text: 'What is the team size?', category: 'question', timestamp: '8:45' }
  ])

  const [transcript, setTranscript] = useState<{speaker: string, text: string, time: string}[]>([
    { speaker: 'Interviewer', text: 'Tell me about your experience with React.', time: '0:15' },
    { speaker: 'You', text: "I've been working with React for about 4 years now...", time: '0:20' },
    { speaker: 'Interviewer', text: 'Great. Can you describe a challenging project?', time: '1:45' }
  ])

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive) {
      interval = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-5 h-5 text-green-400" />
      case 'negative': return <Frown className="w-5 h-5 text-red-400" />
      default: return <Meh className="w-5 h-5 text-yellow-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-green-500/20 text-green-400'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'decision': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'insight': return <TrendingUp className="w-4 h-4 text-blue-400" />
      case 'question': return <AlertCircle className="w-4 h-4 text-yellow-400" />
      default: return <AlertCircle className="w-4 h-4 text-red-400" />
    }
  }

  const totalSpeakingTime = Object.values(speakers).reduce((sum, s) => sum + s.speakingTime, 0)

  const exportSummary = () => {
    toast.success('Meeting summary exported!')
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
            className="relative w-[900px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                  <Users className={`w-5 h-5 ${isActive ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Meeting Intelligence</h2>
                  <p className="text-xs text-white/40">
                    {isActive ? 'Recording in progress' : 'Ready to start'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Duration */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                  <Clock className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-mono text-white">{formatDuration(duration)}</span>
                </div>

                {/* Sentiment */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                  {getSentimentIcon()}
                  <span className="text-xs text-white/60 capitalize">{sentiment}</span>
                </div>

                {/* Controls */}
                {!isActive ? (
                  <button
                    onClick={() => setIsActive(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => setIsActive(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-2 border-b border-white/10">
              {(['overview', 'speakers', 'actions', 'transcript'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Key Points */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      Key Points
                    </p>
                    <div className="space-y-2">
                      {keyPoints.map(point => (
                        <div key={point.id} className="p-3 rounded-lg bg-white/5 flex items-start gap-3">
                          {getCategoryIcon(point.category)}
                          <div className="flex-1">
                            <p className="text-sm text-white/80">{point.text}</p>
                            <p className="text-xs text-white/40 mt-1">{point.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-purple-400" />
                      Action Items ({actionItems.length})
                    </p>
                    <div className="space-y-2">
                      {actionItems.map(item => (
                        <div key={item.id} className="p-3 rounded-lg bg-white/5 flex items-start gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-white/80">{item.text}</p>
                            {item.assignee && (
                              <p className="text-xs text-white/40 mt-1">Assigned to: {item.assignee}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Speaking Distribution */}
                  <div className="col-span-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-4">Speaking Distribution</p>
                    <div className="flex items-center gap-4">
                      {Object.values(speakers).map((speaker, i) => (
                        <div key={speaker.name} className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/80">{speaker.name}</span>
                            <span className="text-white/40">
                              {Math.round((speaker.speakingTime / totalSpeakingTime) * 100)}%
                            </span>
                          </div>
                          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${i === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${(speaker.speakingTime / totalSpeakingTime) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'speakers' && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(speakers).map((speaker, i) => (
                    <div key={speaker.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-purple-500'} flex items-center justify-center text-white font-medium`}>
                          {speaker.name[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{speaker.name}</p>
                          <p className="text-xs text-white/40">{speaker.interventions} interventions</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-lg font-bold text-white">{speaker.wordCount}</p>
                          <p className="text-xs text-white/40">Words</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <p className="text-lg font-bold text-white">{formatDuration(speaker.speakingTime)}</p>
                          <p className="text-xs text-white/40">Speaking Time</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-3">
                  {actionItems.map(item => (
                    <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                      <input type="checkbox" className="w-5 h-5 rounded border-white/20" />
                      <div className="flex-1">
                        <p className="text-white">{item.text}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          {item.assignee && (
                            <span className="text-xs text-white/40">Assigned to: {item.assignee}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className="space-y-4">
                  {transcript.map((entry, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-xs text-white/40 w-12 flex-shrink-0">{entry.time}</span>
                      <div>
                        <span className={`text-sm font-medium ${entry.speaker === 'You' ? 'text-blue-400' : 'text-purple-400'}`}>
                          {entry.speaker}:
                        </span>
                        <span className="text-sm text-white/80 ml-2">{entry.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <MessageSquare className="w-4 h-4" />
                <span>{Object.values(speakers).reduce((sum, s) => sum + s.wordCount, 0)} words captured</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText('Meeting summary...')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy Summary
                </button>
                <button
                  onClick={exportSummary}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-wingman-500 hover:bg-wingman-600 text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
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

export default MeetingHUD

