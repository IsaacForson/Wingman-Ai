/**
 * Wingman AI - Achievements Panel
 * Gamification: streaks, badges, progress tracking
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Award,
  Flame,
  Target,
  Star,
  Trophy,
  Zap,
  Brain,
  Clock,
  Calendar,
  Lock,
  CheckCircle,
  TrendingUp
} from 'lucide-react'

interface AchievementsPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'beginner' | 'progress' | 'mastery' | 'special'
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  target?: number
}

interface Streak {
  current: number
  longest: number
  lastActive: string
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'streaks' | 'stats'>('achievements')
  
  const [streak] = useState<Streak>({
    current: 7,
    longest: 14,
    lastActive: new Date().toISOString()
  })

  const [achievements] = useState<Achievement[]>([
    // Beginner
    { id: '1', name: 'First Steps', description: 'Ask your first question', icon: '🎯', category: 'beginner', unlocked: true, unlockedAt: '2024-01-01' },
    { id: '2', name: 'Quick Learner', description: 'Complete 10 questions', icon: '📚', category: 'beginner', unlocked: true, unlockedAt: '2024-01-02' },
    { id: '3', name: 'Explorer', description: 'Try all 4 modes', icon: '🧭', category: 'beginner', unlocked: true, unlockedAt: '2024-01-03' },
    
    // Progress
    { id: '4', name: 'Century Club', description: 'Ask 100 questions', icon: '💯', category: 'progress', unlocked: true, unlockedAt: '2024-01-10' },
    { id: '5', name: 'Week Warrior', description: '7-day streak', icon: '🔥', category: 'progress', unlocked: true, unlockedAt: '2024-01-07' },
    { id: '6', name: 'Knowledge Seeker', description: 'Upload 5 documents', icon: '📖', category: 'progress', unlocked: false, progress: 3, target: 5 },
    { id: '7', name: 'Practice Perfect', description: 'Complete 10 practice sessions', icon: '🎯', category: 'progress', unlocked: false, progress: 6, target: 10 },
    
    // Mastery
    { id: '8', name: 'Interview Pro', description: 'Score 90%+ in 5 practice interviews', icon: '🏆', category: 'mastery', unlocked: false, progress: 2, target: 5 },
    { id: '9', name: 'Night Owl', description: 'Use Wingman after midnight 5 times', icon: '🦉', category: 'mastery', unlocked: true, unlockedAt: '2024-01-08' },
    { id: '10', name: 'Speed Demon', description: 'Get answers under 1 second 50 times', icon: '⚡', category: 'mastery', unlocked: false, progress: 23, target: 50 },
    { id: '11', name: 'Code Master', description: 'Solve 25 coding questions', icon: '💻', category: 'mastery', unlocked: false, progress: 12, target: 25 },
    
    // Special
    { id: '12', name: 'Early Bird', description: 'Use before 6 AM', icon: '🌅', category: 'special', unlocked: false },
    { id: '13', name: 'Marathon', description: '4-hour session', icon: '🏃', category: 'special', unlocked: false },
    { id: '14', name: 'Polyglot', description: 'Use in 3 different languages', icon: '🌍', category: 'special', unlocked: false },
    { id: '15', name: 'Zen Master', description: 'Complete 10 breathing exercises', icon: '🧘', category: 'special', unlocked: false, progress: 4, target: 10 }
  ])

  const [stats] = useState({
    totalQuestions: 247,
    totalAnswers: 243,
    totalSessions: 42,
    averageScore: 85,
    favoriteMode: 'interview',
    totalFocusTime: 1120, // minutes
    documentsUploaded: 3,
    practiceSessionsCompleted: 6
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'beginner': return 'from-green-500/20 to-emerald-500/20 border-green-500/30'
      case 'progress': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      case 'mastery': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
      case 'special': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      default: return 'from-white/10 to-white/5 border-white/10'
    }
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
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
            className="relative w-[600px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Achievements</h2>
                  <p className="text-xs text-white/40">
                    {unlockedCount}/{achievements.length} unlocked
                  </p>
                </div>
              </div>
              
              {/* Streak Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{streak.current} day streak</span>
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
              {(['achievements', 'streaks', 'stats'] as const).map(tab => (
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
              {activeTab === 'achievements' && (
                <div className="space-y-6">
                  {(['beginner', 'progress', 'mastery', 'special'] as const).map(category => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-white/60 mb-3 capitalize">{category}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {achievements.filter(a => a.category === category).map(achievement => (
                          <motion.div
                            key={achievement.id}
                            className={`p-4 rounded-xl bg-gradient-to-br border ${getCategoryColor(achievement.category)} ${
                              !achievement.unlocked && 'opacity-50'
                            }`}
                            whileHover={{ scale: 1.02 }}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{achievement.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-white">{achievement.name}</p>
                                  {achievement.unlocked ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-white/30" />
                                  )}
                                </div>
                                <p className="text-xs text-white/50 mt-0.5">{achievement.description}</p>
                                
                                {achievement.unlocked && achievement.unlockedAt && (
                                  <p className="text-xs text-green-400/60 mt-2">
                                    Unlocked {formatDate(achievement.unlockedAt)}
                                  </p>
                                )}
                                
                                {!achievement.unlocked && achievement.progress !== undefined && (
                                  <div className="mt-2">
                                    <div className="flex justify-between text-xs text-white/40 mb-1">
                                      <span>Progress</span>
                                      <span>{achievement.progress}/{achievement.target}</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                      <motion.div
                                        className="h-full bg-white/40"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(achievement.progress! / achievement.target!) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'streaks' && (
                <div className="space-y-6">
                  {/* Current Streak */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 text-center">
                    <Flame className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                    <p className="text-5xl font-bold text-white mb-1">{streak.current}</p>
                    <p className="text-white/60">Day Streak</p>
                    <p className="text-sm text-orange-400/60 mt-3">
                      Keep it going! Your longest streak is {streak.longest} days
                    </p>
                  </div>

                  {/* Streak Calendar (simplified) */}
                  <div>
                    <p className="text-sm text-white/60 mb-3">Last 7 Days</p>
                    <div className="flex gap-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (6 - i))
                        const isActive = i >= 7 - streak.current
                        
                        return (
                          <div
                            key={i}
                            className={`flex-1 p-3 rounded-xl text-center ${
                              isActive 
                                ? 'bg-orange-500/20 border border-orange-500/30' 
                                : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            <p className="text-xs text-white/40 mb-1">
                              {date.toLocaleDateString('en', { weekday: 'short' })}
                            </p>
                            <p className={`text-lg font-bold ${isActive ? 'text-orange-400' : 'text-white/30'}`}>
                              {date.getDate()}
                            </p>
                            {isActive && <Flame className="w-4 h-4 text-orange-400 mx-auto mt-1" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Streak Tips */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-2">💡 Streak Tips</p>
                    <ul className="space-y-1 text-sm text-white/60">
                      <li>• Use Wingman for at least one question daily</li>
                      <li>• Set a daily reminder to maintain your streak</li>
                      <li>• Practice mode counts towards your streak!</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <Brain className="w-5 h-5" />
                      <span className="text-xs text-white/40">Questions Asked</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalQuestions}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-xs text-white/40">Answers Generated</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalAnswers}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-xs text-white/40">Total Sessions</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <Star className="w-5 h-5" />
                      <span className="text-xs text-white/40">Average Score</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.averageScore}%</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-xs text-white/40">Focus Time</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{Math.floor(stats.totalFocusTime / 60)}h</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-cyan-400 mb-2">
                      <Target className="w-5 h-5" />
                      <span className="text-xs text-white/40">Practice Sessions</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.practiceSessionsCompleted}</p>
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

export default AchievementsPanel

