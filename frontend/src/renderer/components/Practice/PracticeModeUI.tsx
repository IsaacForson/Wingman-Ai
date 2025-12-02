/**
 * Wingman AI - Practice Mode UI
 * Mock interview interface with feedback
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Pause,
  SkipForward,
  RefreshCw,
  Lightbulb,
  Award,
  Target,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Mic,
  Send,
  BarChart
} from 'lucide-react'

type InterviewType = 'behavioral' | 'technical' | 'coding' | 'system_design' | 'mixed'
type Difficulty = 'easy' | 'medium' | 'hard'

interface PracticeQuestion {
  id: string
  question: string
  category: string
  type: InterviewType
  difficulty: Difficulty
  hints: string[]
  key_points: string[]
}

interface Feedback {
  score: number
  strengths: string[]
  improvements: string[]
  overall_feedback: string
}

interface PracticeModeUIProps {
  isOpen: boolean
  onClose: () => void
}

const PracticeModeUI: React.FC<PracticeModeUIProps> = ({ isOpen, onClose }) => {
  const [stage, setStage] = useState<'setup' | 'practice' | 'feedback' | 'results'>('setup')
  const [interviewType, setInterviewType] = useState<InterviewType>('behavioral')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionResults, setSessionResults] = useState<{question: string, score: number}[]>([])

  // Sample questions
  const sampleQuestions: PracticeQuestion[] = [
    {
      id: '1',
      question: 'Tell me about a time you faced a challenging situation at work and how you handled it.',
      category: 'problem_solving',
      type: 'behavioral',
      difficulty: 'medium',
      hints: ['Use the STAR method', 'Focus on your specific actions', 'Quantify results if possible'],
      key_points: ['Specific situation', 'Actions taken', 'Measurable results', 'Lessons learned']
    },
    {
      id: '2',
      question: 'Explain the difference between a stack and a queue.',
      category: 'data_structures',
      type: 'technical',
      difficulty: 'easy',
      hints: ['Think about LIFO vs FIFO', 'Consider real-world examples'],
      key_points: ['LIFO vs FIFO', 'Use cases', 'Operations complexity']
    },
    {
      id: '3',
      question: 'How do you handle disagreements with team members?',
      category: 'teamwork',
      type: 'behavioral',
      difficulty: 'medium',
      hints: ['Stay professional', 'Focus on resolution', 'Show empathy'],
      key_points: ['Communication approach', 'Conflict resolution', 'Relationship outcome']
    }
  ]

  const startPractice = () => {
    setStage('practice')
    setQuestionNumber(1)
    setTotalScore(0)
    setSessionResults([])
    nextQuestion()
  }

  const nextQuestion = () => {
    const filtered = sampleQuestions.filter(q => 
      (interviewType === 'mixed' || q.type === interviewType) &&
      q.difficulty === difficulty
    )
    const randomQ = filtered[Math.floor(Math.random() * filtered.length)] || sampleQuestions[0]
    setCurrentQuestion(randomQ)
    setAnswer('')
    setFeedback(null)
    setShowHint(false)
  }

  const submitAnswer = async () => {
    if (!answer.trim() || !currentQuestion) return

    // Simulate AI evaluation
    const mockFeedback: Feedback = {
      score: Math.floor(Math.random() * 4) + 6, // 6-9
      strengths: [
        'Good structure in your response',
        'Provided specific examples'
      ],
      improvements: [
        'Could quantify results more',
        'Consider adding more context'
      ],
      overall_feedback: 'Good answer! You demonstrated clear thinking and provided relevant examples. Consider adding more specific metrics to strengthen your response.'
    }

    setFeedback(mockFeedback)
    setTotalScore(prev => prev + mockFeedback.score)
    setSessionResults(prev => [...prev, { question: currentQuestion.question, score: mockFeedback.score }])
    setStage('feedback')
  }

  const continueToNext = () => {
    if (questionNumber >= 5) {
      setStage('results')
    } else {
      setQuestionNumber(prev => prev + 1)
      nextQuestion()
      setStage('practice')
    }
  }

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return 'text-green-400 bg-green-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'hard': return 'text-red-400 bg-red-500/20'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400'
    if (score >= 6) return 'text-yellow-400'
    return 'text-red-400'
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
            className="relative w-[800px] max-h-[700px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Practice Mode</h2>
                  <p className="text-xs text-white/40">
                    {stage === 'setup' ? 'Configure your session' :
                     stage === 'results' ? 'Session complete!' :
                     `Question ${questionNumber} of 5`}
                  </p>
                </div>
              </div>
              
              {stage === 'practice' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span>Score: {totalScore}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Setup Stage */}
              {stage === 'setup' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-white/60 mb-3">Interview Type</p>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { id: 'behavioral', label: 'Behavioral', icon: '💭' },
                        { id: 'technical', label: 'Technical', icon: '⚙️' },
                        { id: 'coding', label: 'Coding', icon: '💻' },
                        { id: 'system_design', label: 'System Design', icon: '🏗️' },
                        { id: 'mixed', label: 'Mixed', icon: '🎲' }
                      ] as const).map(type => (
                        <button
                          key={type.id}
                          onClick={() => setInterviewType(type.id)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            interviewType === type.id
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-transparent bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{type.icon}</span>
                          <span className="text-sm text-white">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-white/60 mb-3">Difficulty</p>
                    <div className="flex gap-3">
                      {(['easy', 'medium', 'hard'] as const).map(diff => (
                        <button
                          key={diff}
                          onClick={() => setDifficulty(diff)}
                          className={`flex-1 p-3 rounded-xl border-2 transition-all capitalize ${
                            difficulty === diff
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-transparent bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className={`text-sm ${getDifficultyColor(diff)}`}>{diff}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">Session Overview</p>
                    <ul className="space-y-2 text-sm text-white/80">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        5 questions per session
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        AI-powered answer evaluation
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Detailed feedback with improvements
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={startPractice}
                    className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Practice
                  </button>
                </div>
              )}

              {/* Practice Stage */}
              {stage === 'practice' && currentQuestion && (
                <div className="space-y-6">
                  {/* Question */}
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-1 rounded-lg text-xs ${getDifficultyColor(currentQuestion.difficulty)}`}>
                        {currentQuestion.difficulty}
                      </span>
                      <span className="text-xs text-white/40 capitalize">{currentQuestion.category}</span>
                    </div>
                    <p className="text-lg text-white leading-relaxed">{currentQuestion.question}</p>
                  </div>

                  {/* Hint */}
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-400">Hints</span>
                      </div>
                      <ul className="space-y-1">
                        {currentQuestion.hints.map((hint, i) => (
                          <li key={i} className="text-sm text-yellow-200/80">• {hint}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Answer Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Your Answer</span>
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        {showHint ? 'Hide Hint' : 'Show Hint'}
                      </button>
                    </div>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer here... Be specific and use examples where possible."
                      className="w-full h-40 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { nextQuestion(); setQuestionNumber(prev => prev + 1) }}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip
                      </button>
                    </div>
                    <button
                      onClick={submitAnswer}
                      disabled={!answer.trim()}
                      className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Stage */}
              {stage === 'feedback' && feedback && (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="text-center py-6">
                    <p className="text-sm text-white/40 mb-2">Your Score</p>
                    <p className={`text-6xl font-bold ${getScoreColor(feedback.score)}`}>
                      {feedback.score}/10
                    </p>
                  </div>

                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Strengths</span>
                    </div>
                    <ul className="space-y-2">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-200/80 flex items-start gap-2">
                          <span>•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsDown className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-orange-400">Areas to Improve</span>
                    </div>
                    <ul className="space-y-2">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-orange-200/80 flex items-start gap-2">
                          <span>•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Overall */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">Overall Feedback</p>
                    <p className="text-sm text-white/80">{feedback.overall_feedback}</p>
                  </div>

                  <button
                    onClick={continueToNext}
                    className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {questionNumber >= 5 ? 'See Results' : 'Next Question'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Results Stage */}
              {stage === 'results' && (
                <div className="space-y-6 text-center">
                  <div className="py-6">
                    <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <p className="text-2xl font-bold text-white mb-2">Session Complete!</p>
                    <p className="text-white/60">Here's how you did</p>
                  </div>

                  <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/40 mb-2">Average Score</p>
                    <p className={`text-5xl font-bold ${getScoreColor(totalScore / 5)}`}>
                      {(totalScore / sessionResults.length).toFixed(1)}/10
                    </p>
                  </div>

                  <div className="text-left space-y-2">
                    <p className="text-sm text-white/60 mb-3">Question Breakdown</p>
                    {sessionResults.map((result, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <span className="text-sm text-white/80 truncate flex-1 mr-4">
                          Q{i + 1}: {result.question.slice(0, 50)}...
                        </span>
                        <span className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                          {result.score}/10
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStage('setup')}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                      New Session
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
                    >
                      Done
                    </button>
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

export default PracticeModeUI

