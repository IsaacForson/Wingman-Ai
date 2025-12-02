/**
 * Wingman AI - Breathing Exercise
 * Guided breathing exercises for stress relief
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Wind, Heart, Zap, Moon } from 'lucide-react'

interface BreathingExerciseProps {
  isOpen: boolean
  onClose: () => void
}

type ExerciseType = 'box' | '478' | 'relaxing' | 'energizing'

interface Exercise {
  id: ExerciseType
  name: string
  description: string
  icon: React.ReactNode
  pattern: { phase: string; duration: number; instruction: string }[]
  color: string
}

const exercises: Exercise[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal inhale, hold, exhale, hold. Great for focus.',
    icon: <Wind className="w-5 h-5" />,
    pattern: [
      { phase: 'inhale', duration: 4, instruction: 'Breathe in slowly' },
      { phase: 'hold', duration: 4, instruction: 'Hold your breath' },
      { phase: 'exhale', duration: 4, instruction: 'Breathe out slowly' },
      { phase: 'hold', duration: 4, instruction: 'Hold empty' }
    ],
    color: 'blue'
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    description: 'Calming technique for sleep and anxiety.',
    icon: <Moon className="w-5 h-5" />,
    pattern: [
      { phase: 'inhale', duration: 4, instruction: 'Breathe in through nose' },
      { phase: 'hold', duration: 7, instruction: 'Hold your breath' },
      { phase: 'exhale', duration: 8, instruction: 'Exhale through mouth' }
    ],
    color: 'purple'
  },
  {
    id: 'relaxing',
    name: 'Deep Relaxation',
    description: 'Slow, deep breaths for stress relief.',
    icon: <Heart className="w-5 h-5" />,
    pattern: [
      { phase: 'inhale', duration: 5, instruction: 'Deep breath in' },
      { phase: 'hold', duration: 2, instruction: 'Brief pause' },
      { phase: 'exhale', duration: 7, instruction: 'Long slow exhale' }
    ],
    color: 'green'
  },
  {
    id: 'energizing',
    name: 'Energizing Breath',
    description: 'Quick breaths to boost energy and alertness.',
    icon: <Zap className="w-5 h-5" />,
    pattern: [
      { phase: 'inhale', duration: 2, instruction: 'Quick breath in' },
      { phase: 'exhale', duration: 2, instruction: 'Quick breath out' }
    ],
    color: 'orange'
  }
]

const BreathingExercise: React.FC<BreathingExerciseProps> = ({ isOpen, onClose }) => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(exercises[0])
  const [isRunning, setIsRunning] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)
  const [targetCycles, setTargetCycles] = useState(4)

  const currentPhase = selectedExercise.pattern[currentPhaseIndex]

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && phaseTimeLeft > 0) {
      interval = setInterval(() => {
        setPhaseTimeLeft(t => t - 0.1)
      }, 100)
    } else if (isRunning && phaseTimeLeft <= 0) {
      // Move to next phase
      const nextIndex = (currentPhaseIndex + 1) % selectedExercise.pattern.length
      
      if (nextIndex === 0) {
        // Completed a cycle
        const newCycles = cyclesCompleted + 1
        setCyclesCompleted(newCycles)
        
        if (newCycles >= targetCycles) {
          setIsRunning(false)
          // Play completion sound
          return
        }
      }
      
      setCurrentPhaseIndex(nextIndex)
      setPhaseTimeLeft(selectedExercise.pattern[nextIndex].duration)
    }

    return () => clearInterval(interval)
  }, [isRunning, phaseTimeLeft, currentPhaseIndex, selectedExercise, cyclesCompleted, targetCycles])

  const startExercise = () => {
    setIsRunning(true)
    setCurrentPhaseIndex(0)
    setCyclesCompleted(0)
    setPhaseTimeLeft(selectedExercise.pattern[0].duration)
  }

  const stopExercise = () => {
    setIsRunning(false)
    setCurrentPhaseIndex(0)
    setPhaseTimeLeft(0)
    setCyclesCompleted(0)
  }

  const toggleExercise = () => {
    if (isRunning) {
      setIsRunning(false)
    } else if (phaseTimeLeft > 0) {
      setIsRunning(true)
    } else {
      startExercise()
    }
  }

  const selectExercise = (exercise: Exercise) => {
    stopExercise()
    setSelectedExercise(exercise)
  }

  const getPhaseScale = () => {
    if (!isRunning) return 1
    const progress = 1 - (phaseTimeLeft / currentPhase.duration)
    
    if (currentPhase.phase === 'inhale') {
      return 1 + (progress * 0.3)  // Grow
    } else if (currentPhase.phase === 'exhale') {
      return 1.3 - (progress * 0.3)  // Shrink
    }
    return currentPhase.phase === 'hold' && currentPhaseIndex === 1 ? 1.3 : 1  // Hold at current size
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; glow: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
      green: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' }
    }
    return colors[color] || colors.blue
  }

  const colorClasses = getColorClasses(selectedExercise.color)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-[500px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses.bg}/20`}>
                  <Wind className={`w-5 h-5 ${colorClasses.text}`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Breathing Exercise</h2>
                  <p className="text-xs text-white/40">Take a moment to relax</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exercise Selection */}
            {!isRunning && phaseTimeLeft === 0 && (
              <div className="p-4 border-b border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  {exercises.map(exercise => (
                    <button
                      key={exercise.id}
                      onClick={() => selectExercise(exercise)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedExercise.id === exercise.id
                          ? `bg-white/10 border-2 border-${exercise.color}-500/50`
                          : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={getColorClasses(exercise.color).text}>{exercise.icon}</span>
                        <span className="text-sm font-medium text-white">{exercise.name}</span>
                      </div>
                      <p className="text-xs text-white/40">{exercise.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Exercise Area */}
            <div className="p-8 flex flex-col items-center">
              {/* Breathing Circle */}
              <div className="relative w-48 h-48 mb-6">
                {/* Outer glow */}
                <motion.div
                  className={`absolute inset-0 rounded-full ${colorClasses.bg}/20 blur-xl`}
                  animate={{ 
                    scale: isRunning ? getPhaseScale() : 1,
                    opacity: isRunning ? 0.8 : 0.4
                  }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
                
                {/* Main circle */}
                <motion.div
                  className={`absolute inset-4 rounded-full ${colorClasses.bg}/30 border-2 border-white/20 flex items-center justify-center ${colorClasses.glow} shadow-lg`}
                  animate={{ scale: isRunning ? getPhaseScale() : 1 }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                >
                  {/* Inner content */}
                  <div className="text-center">
                    {isRunning ? (
                      <>
                        <p className={`text-3xl font-bold ${colorClasses.text}`}>
                          {Math.ceil(phaseTimeLeft)}
                        </p>
                        <p className="text-sm text-white/60 capitalize">{currentPhase.phase}</p>
                      </>
                    ) : (
                      <p className={`text-lg font-medium ${colorClasses.text}`}>
                        {cyclesCompleted > 0 ? 'Complete!' : 'Ready'}
                      </p>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Instruction */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={isRunning ? currentPhase.instruction : 'ready'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg text-white/80 text-center mb-6 h-7"
                >
                  {isRunning ? currentPhase.instruction : 'Press play to begin'}
                </motion.p>
              </AnimatePresence>

              {/* Progress */}
              {isRunning && (
                <div className="flex items-center gap-2 mb-6">
                  {Array.from({ length: targetCycles }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        i < cyclesCompleted ? colorClasses.bg : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                {isRunning && (
                  <button
                    onClick={stopExercise}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={toggleExercise}
                  className={`px-6 py-3 rounded-xl ${colorClasses.bg} hover:opacity-90 text-white font-medium transition-colors flex items-center gap-2`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {phaseTimeLeft > 0 ? 'Resume' : 'Start'}
                    </>
                  )}
                </button>
              </div>

              {/* Cycles selector */}
              {!isRunning && phaseTimeLeft === 0 && (
                <div className="flex items-center gap-3 mt-6">
                  <span className="text-sm text-white/40">Cycles:</span>
                  {[2, 4, 6, 8].map(num => (
                    <button
                      key={num}
                      onClick={() => setTargetCycles(num)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        targetCycles === num
                          ? `${colorClasses.bg} text-white`
                          : 'bg-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BreathingExercise

