/**
 * Wingman AI - Transcript View
 * Live transcript display with speaker identification
 */

import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { Mic, User, Bot, Clock, ChevronDown } from 'lucide-react'
import { formatTime } from '../../utils/helpers'

interface TranscriptViewProps {
  compact?: boolean
  maxHeight?: number | string
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ 
  compact = false, 
  maxHeight = 300 
}) => {
  const { transcript, isListening } = useAppStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = React.useState(true)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript, autoScroll])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setAutoScroll(isAtBottom)
    }
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiveIndicator isActive={isListening} />
            <span className="text-xs text-white/60 font-medium">
              {isListening ? 'Listening...' : 'Transcript'}
            </span>
          </div>
          <span className="text-xs text-white/40">
            {transcript.length} lines
          </span>
        </div>

        {/* Compact transcript */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="space-y-1 overflow-y-auto pr-1"
          style={{ maxHeight }}
        >
          {transcript.length === 0 ? (
            <EmptyState compact />
          ) : (
            transcript.slice(-10).map((line, index) => (
              <CompactTranscriptLine key={line.id} line={line} index={index} />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <LiveIndicator isActive={isListening} size="md" />
          <div>
            <h3 className="text-sm font-medium text-white">Live Transcript</h3>
            <p className="text-xs text-white/40">
              {isListening ? 'Capturing audio...' : 'Not listening'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 px-2 py-1 rounded bg-white/5">
            {transcript.length} lines
          </span>
        </div>
      </div>

      {/* Transcript content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        <AnimatePresence initial={false}>
          {transcript.length === 0 ? (
            <EmptyState />
          ) : (
            transcript.map((line, index) => (
              <TranscriptLine key={line.id} line={line} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!autoScroll && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setAutoScroll(true)
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
              })
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-wingman-500/90 text-white text-xs flex items-center gap-1 shadow-lg"
          >
            <ChevronDown className="w-3 h-3" />
            Scroll to bottom
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// Individual transcript line
interface TranscriptLineProps {
  line: {
    id: string
    text: string
    speaker?: string
    timestamp: Date
    isFinal: boolean
  }
  index: number
}

const TranscriptLine: React.FC<TranscriptLineProps> = ({ line, index }) => {
  const isQuestion = line.text.includes('?') || 
    line.text.toLowerCase().startsWith('what') ||
    line.text.toLowerCase().startsWith('how') ||
    line.text.toLowerCase().startsWith('why') ||
    line.text.toLowerCase().startsWith('can you')

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`flex gap-3 ${!line.isFinal ? 'opacity-60' : ''}`}
    >
      {/* Speaker icon */}
      <div className={`mt-0.5 p-1.5 rounded-lg ${
        line.speaker === 'assistant' 
          ? 'bg-wingman-500/20 text-wingman-400' 
          : 'bg-white/10 text-white/60'
      }`}>
        {line.speaker === 'assistant' ? (
          <Bot className="w-3.5 h-3.5" />
        ) : (
          <User className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-white/60">
            {line.speaker || 'Speaker'}
          </span>
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(new Date(line.timestamp))}
          </span>
          {isQuestion && (
            <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
              Question
            </span>
          )}
        </div>
        <p className={`text-sm ${
          isQuestion ? 'text-yellow-200' : 'text-white/80'
        } ${!line.isFinal ? 'italic' : ''}`}>
          {line.text}
          {!line.isFinal && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-1 h-3 bg-wingman-400 ml-1"
            />
          )}
        </p>
      </div>
    </motion.div>
  )
}

// Compact transcript line for mini view
const CompactTranscriptLine: React.FC<TranscriptLineProps> = ({ line, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: line.isFinal ? 1 : 0.6 }}
      className="text-xs text-white/70 leading-relaxed"
    >
      <span className="text-white/40 mr-1">
        {formatTime(new Date(line.timestamp)).slice(0, 5)}
      </span>
      {line.text}
      {!line.isFinal && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-1 h-2 bg-wingman-400 ml-0.5"
        />
      )}
    </motion.div>
  )
}

// Live indicator
const LiveIndicator: React.FC<{ isActive: boolean; size?: 'sm' | 'md' }> = ({ 
  isActive, 
  size = 'sm' 
}) => {
  const sizeClasses = size === 'md' ? 'w-3 h-3' : 'w-2 h-2'
  
  return (
    <div className="relative">
      <motion.div
        className={`${sizeClasses} rounded-full ${
          isActive ? 'bg-red-500' : 'bg-white/30'
        }`}
        animate={isActive ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {isActive && (
        <motion.div
          className={`absolute inset-0 ${sizeClasses} rounded-full bg-red-500`}
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  )
}

// Empty state
const EmptyState: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { isListening } = useAppStore()

  if (compact) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-white/40">
          {isListening ? 'Waiting for speech...' : 'Start listening to see transcript'}
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <motion.div
        animate={isListening ? {
          scale: [1, 1.1, 1],
          opacity: [0.5, 1, 0.5]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="p-4 rounded-full bg-white/5 mb-4"
      >
        <Mic className={`w-8 h-8 ${isListening ? 'text-red-400' : 'text-white/30'}`} />
      </motion.div>
      <h4 className="text-sm font-medium text-white/60 mb-1">
        {isListening ? 'Listening for speech...' : 'No transcript yet'}
      </h4>
      <p className="text-xs text-white/40 max-w-[200px]">
        {isListening 
          ? 'Start speaking and your words will appear here'
          : 'Click the microphone to start capturing audio'
        }
      </p>
    </motion.div>
  )
}

export default TranscriptView

