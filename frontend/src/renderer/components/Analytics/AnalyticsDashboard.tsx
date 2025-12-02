/**
 * Wingman AI - Analytics Dashboard
 * Full analytics UI with charts and insights
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  BarChart3,
  TrendingUp,
  Clock,
  MessageSquare,
  Brain,
  Mic,
  Monitor,
  Flame,
  Target,
  Calendar,
  ChevronDown,
  Award
} from 'lucide-react'

interface AnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

interface DailyStats {
  date: string
  questions: number
  answers: number
  sessions: number
  time_minutes: number
}

interface UsageStats {
  total_questions: number
  total_answers: number
  total_sessions: number
  total_time_hours: number
  questions_by_source: Record<string, number>
  questions_by_mode: Record<string, number>
  ai_provider_usage: Record<string, number>
  avg_questions_per_session: number
}

interface Insight {
  type: string
  title: string
  message: string
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'performance'>('overview')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')
  
  // Mock data - in real app, fetch from backend
  const [usageStats] = useState<UsageStats>({
    total_questions: 247,
    total_answers: 243,
    total_sessions: 42,
    total_time_hours: 18.5,
    questions_by_source: { audio: 156, screen: 67, manual: 24 },
    questions_by_mode: { interview: 128, study: 67, work: 42, meeting: 10 },
    ai_provider_usage: { groq: 180, gemini: 43, ollama: 20 },
    avg_questions_per_session: 5.9
  })

  const [dailyStats] = useState<DailyStats[]>([
    { date: '2024-01-01', questions: 12, answers: 12, sessions: 2, time_minutes: 45 },
    { date: '2024-01-02', questions: 18, answers: 18, sessions: 3, time_minutes: 62 },
    { date: '2024-01-03', questions: 8, answers: 8, sessions: 1, time_minutes: 28 },
    { date: '2024-01-04', questions: 22, answers: 21, sessions: 4, time_minutes: 78 },
    { date: '2024-01-05', questions: 15, answers: 15, sessions: 2, time_minutes: 52 },
    { date: '2024-01-06', questions: 28, answers: 28, sessions: 5, time_minutes: 95 },
    { date: '2024-01-07', questions: 19, answers: 19, sessions: 3, time_minutes: 68 },
  ])

  const [insights] = useState<Insight[]>([
    { type: 'usage', title: 'Most Used Mode', message: 'You use Interview mode the most (128 questions)' },
    { type: 'performance', title: 'Fast Responses', message: 'Average answer time is 1.2s - great performance!' },
    { type: 'engagement', title: 'Current Streak', message: "You've been using Wingman for 7 days in a row! 🔥" },
  ])

  const maxQuestions = Math.max(...dailyStats.map(d => d.questions))

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'audio': return <Mic className="w-4 h-4" />
      case 'screen': return <Monitor className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getModeColor = (mode: string) => {
    const colors: Record<string, string> = {
      interview: 'bg-blue-500',
      study: 'bg-green-500',
      work: 'bg-purple-500',
      meeting: 'bg-yellow-500',
      research: 'bg-cyan-500'
    }
    return colors[mode] || 'bg-gray-500'
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
            className="relative w-[900px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-wingman-500/20">
                  <BarChart3 className="w-5 h-5 text-wingman-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Analytics</h2>
                  <p className="text-xs text-white/40">Track your progress</p>
                </div>
              </div>
              
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                {(['7d', '30d', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-wingman-500/20 text-wingman-400'
                        : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-2 border-b border-white/10">
              {(['overview', 'usage', 'performance'] as const).map((tab) => (
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
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-wingman-400" />
                        <span className="text-xs text-white/40">Total Questions</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{usageStats.total_questions}</p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-white/40">Answers Generated</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{usageStats.total_answers}</p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-white/40">Total Time</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{usageStats.total_time_hours}h</p>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-white/40">Current Streak</span>
                      </div>
                      <p className="text-2xl font-bold text-white">7 days</p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-medium text-white">Daily Activity</p>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    
                    <div className="flex items-end gap-2 h-32">
                      {dailyStats.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            className="w-full bg-wingman-500/80 rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.questions / maxQuestions) * 100}%` }}
                            transition={{ delay: i * 0.1 }}
                          />
                          <span className="text-xs text-white/40">
                            {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insights */}
                  <div>
                    <p className="text-sm font-medium text-white mb-3">Insights</p>
                    <div className="space-y-2">
                      {insights.map((insight, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                        >
                          <div className={`p-2 rounded-lg ${
                            insight.type === 'usage' ? 'bg-blue-500/20 text-blue-400' :
                            insight.type === 'performance' ? 'bg-green-500/20 text-green-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {insight.type === 'usage' ? <Target className="w-4 h-4" /> :
                             insight.type === 'performance' ? <TrendingUp className="w-4 h-4" /> :
                             <Flame className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{insight.title}</p>
                            <p className="text-xs text-white/60">{insight.message}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-6">
                  {/* By Source */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-4">Questions by Source</p>
                    <div className="space-y-3">
                      {Object.entries(usageStats.questions_by_source).map(([source, count]) => (
                        <div key={source} className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            source === 'audio' ? 'bg-red-500/20 text-red-400' :
                            source === 'screen' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {getSourceIcon(source)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-white capitalize">{source}</span>
                              <span className="text-sm text-white/60">{count}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${
                                  source === 'audio' ? 'bg-red-500' :
                                  source === 'screen' ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / usageStats.total_questions) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* By Mode */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-4">Questions by Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(usageStats.questions_by_mode).map(([mode, count]) => (
                        <div key={mode} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className={`w-3 h-3 rounded-full ${getModeColor(mode)}`} />
                          <div className="flex-1">
                            <p className="text-sm text-white capitalize">{mode}</p>
                            <p className="text-xs text-white/40">{count} questions</p>
                          </div>
                          <p className="text-lg font-semibold text-white">
                            {Math.round((count / usageStats.total_questions) * 100)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Provider Usage */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-4">AI Provider Usage</p>
                    <div className="space-y-2">
                      {Object.entries(usageStats.ai_provider_usage).map(([provider, count]) => (
                        <div key={provider} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                          <span className="text-sm text-white capitalize">{provider}</span>
                          <span className="text-sm text-white/60">{count} answers</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Avg Response Time</p>
                      <p className="text-3xl font-bold text-green-400">1.2s</p>
                      <p className="text-xs text-green-400/60 mt-1">↓ 15% faster than last week</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Cache Hit Rate</p>
                      <p className="text-3xl font-bold text-blue-400">34%</p>
                      <p className="text-xs text-blue-400/60 mt-1">Saving tokens on repeat questions</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Questions/Session</p>
                      <p className="text-3xl font-bold text-purple-400">{usageStats.avg_questions_per_session}</p>
                      <p className="text-xs text-purple-400/60 mt-1">↑ More engaged sessions</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Success Rate</p>
                      <p className="text-3xl font-bold text-wingman-400">98.4%</p>
                      <p className="text-xs text-wingman-400/60 mt-1">Answers generated successfully</p>
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-5 h-5 text-yellow-400" />
                      <p className="text-sm font-medium text-white">Achievements</p>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { name: 'First Question', icon: '🎯', unlocked: true },
                        { name: '100 Questions', icon: '💯', unlocked: true },
                        { name: '7 Day Streak', icon: '🔥', unlocked: true },
                        { name: 'Night Owl', icon: '🦉', unlocked: true },
                        { name: 'Code Master', icon: '💻', unlocked: false },
                        { name: 'Speed Demon', icon: '⚡', unlocked: false },
                        { name: 'Knowledge Seeker', icon: '📚', unlocked: false },
                        { name: 'Interview Pro', icon: '🏆', unlocked: false },
                      ].map((achievement) => (
                        <div
                          key={achievement.name}
                          className={`p-3 rounded-xl text-center ${
                            achievement.unlocked
                              ? 'bg-yellow-500/10 border border-yellow-500/30'
                              : 'bg-white/5 opacity-50'
                          }`}
                        >
                          <span className="text-2xl">{achievement.icon}</span>
                          <p className="text-xs text-white/60 mt-1">{achievement.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AnalyticsDashboard

