/**
 * Wingman AI - Onboarding Flow
 * First-time setup wizard
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Mic,
  Monitor,
  Brain,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Settings
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  content: React.ReactNode
}

interface OnboardingFlowProps {
  onComplete: () => void
  onSkip?: () => void
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [settings, setSettings] = useState({
    enableAudio: true,
    enableScreen: true,
    selectedMode: 'interview',
    selectedProvider: 'groq'
  })

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Wingman AI',
      description: 'Your intelligent assistant for interviews, studying, and work',
      icon: <Sparkles className="w-8 h-8" />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-wingman-500 to-purple-500 flex items-center justify-center"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Let's set up your Wingman
            </h2>
            <p className="text-white/60">
              This quick setup will help you get the most out of Wingman AI
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: <Mic className="w-5 h-5" />, label: 'Voice Assistance' },
              { icon: <Monitor className="w-5 h-5" />, label: 'Screen Analysis' },
              { icon: <Brain className="w-5 h-5" />, label: 'AI-Powered Answers' }
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 rounded-xl bg-white/5"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-wingman-500/20 flex items-center justify-center text-wingman-400">
                  {feature.icon}
                </div>
                <p className="text-xs text-white/60">{feature.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'audio',
      title: 'Audio Capture',
      description: 'Let Wingman listen and transcribe',
      icon: <Mic className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Mic className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Real-time Audio Capture
            </h3>
            <p className="text-sm text-white/60">
              Wingman can listen to your conversations and automatically detect questions
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Enable Audio Capture</p>
                <p className="text-xs text-white/40">Listen for questions in real-time</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, enableAudio: !s.enableAudio }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableAudio ? 'bg-wingman-500' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings.enableAudio ? 26 : 2 }}
                />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-200/80">
                Audio is processed locally and never stored. Your privacy is our priority.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'screen',
      title: 'Screen Analysis',
      description: 'Visual context awareness',
      icon: <Monitor className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Monitor className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Screen Analysis
            </h3>
            <p className="text-sm text-white/60">
              Wingman can analyze your screen to understand context and detect questions
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">Enable Screen Capture</p>
                <p className="text-xs text-white/40">Analyze screen for questions and code</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, enableScreen: !s.enableScreen }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableScreen ? 'bg-wingman-500' : 'bg-white/20'
                }`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: settings.enableScreen ? 26 : 2 }}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Code Detection', desc: 'Identify programming code' },
              { label: 'MCQ Detection', desc: 'Find multiple choice questions' },
              { label: 'Text Extraction', desc: 'OCR for any text on screen' },
              { label: 'Context Awareness', desc: 'Understand what you\'re doing' }
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-white font-medium">{item.label}</p>
                <p className="text-xs text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'mode',
      title: 'Choose Your Mode',
      description: 'Select your primary use case',
      icon: <Settings className="w-8 h-8" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              How will you use Wingman?
            </h3>
            <p className="text-sm text-white/60">
              Choose your primary mode (you can change this anytime)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'interview', label: 'Interview', desc: 'Technical & behavioral interviews', icon: <Brain className="w-5 h-5" />, color: 'blue' },
              { id: 'study', label: 'Study', desc: 'Learning & exam prep', icon: <Sparkles className="w-5 h-5" />, color: 'green' },
              { id: 'work', label: 'Work', desc: 'Productivity & coding', icon: <Zap className="w-5 h-5" />, color: 'purple' },
              { id: 'meeting', label: 'Meeting', desc: 'Real-time assistance', icon: <Mic className="w-5 h-5" />, color: 'yellow' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSettings(s => ({ ...s, selectedMode: mode.id }))}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  settings.selectedMode === mode.id
                    ? 'border-wingman-500 bg-wingman-500/10'
                    : 'border-transparent bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`w-10 h-10 mb-3 rounded-lg bg-${mode.color}-500/20 flex items-center justify-center text-${mode.color}-400`}>
                  {mode.icon}
                </div>
                <p className="text-sm text-white font-medium">{mode.label}</p>
                <p className="text-xs text-white/40">{mode.desc}</p>
                {settings.selectedMode === mode.id && (
                  <CheckCircle className="w-4 h-4 text-wingman-400 absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      description: 'Start using Wingman AI',
      icon: <CheckCircle className="w-8 h-8" />,
      content: (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              You're ready to go! 🎉
            </h2>
            <p className="text-white/60">
              Wingman AI is set up and ready to help you succeed
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 text-left space-y-3">
            <p className="text-sm text-white/60">Quick tips:</p>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-wingman-500" />
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">⌘ + Space</kbd> for Command Palette
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-wingman-500" />
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">⌘ + ,</kbd> for Settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-wingman-500" />
                Click the Dynamic Island to expand
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`h-1 rounded-full transition-all ${
                i === currentStep 
                  ? 'w-8 bg-wingman-500' 
                  : i < currentStep 
                    ? 'w-4 bg-wingman-500/50'
                    : 'w-4 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {onSkip && currentStep < steps.length - 1 && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-white/40 hover:text-white/60 transition-colors"
                >
                  Skip
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-wingman-500 hover:bg-wingman-600 text-white font-medium transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default OnboardingFlow

