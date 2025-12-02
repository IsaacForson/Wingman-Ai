/**
 * Wingman AI - Expanded State
 * Full answer display with question context
 */

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { 
  X, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Settings
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import { AIProviderSelector } from '../AIProviderSelector'

const ExpandedState = () => {
  const { 
    currentQuestion, 
    currentAnswer,
    islandState,
    setIslandState,
    isProcessing,
    aiProvider
  } = useAppStore()
  
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll as new content arrives
  useEffect(() => {
    if (scrollRef.current && currentAnswer?.isStreaming) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentAnswer?.answer, currentAnswer?.isStreaming])

  const handleCopy = () => {
    if (currentAnswer?.answer) {
      navigator.clipboard.writeText(currentAnswer.answer)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setIslandState('mini')
  }

  const toggleFullscreen = () => {
    setIslandState(islandState === 'fullscreen' ? 'expanded' : 'fullscreen')
  }

  return (
    <motion.div 
      className="w-full h-full flex flex-col p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-wingman-500"
            animate={isProcessing ? {
              opacity: [1, 0.5, 1],
              scale: [1, 1.2, 1]
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-white/40 font-medium uppercase tracking-wide">
            {isProcessing ? 'Generating...' : 'Answer'}
          </span>
          <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">
            {aiProvider}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <ActionButton onClick={() => setShowSettings(!showSettings)}>
            <Settings className={`w-3.5 h-3.5 ${showSettings ? 'text-wingman-400' : ''}`} />
          </ActionButton>
          <ActionButton onClick={toggleFullscreen}>
            {islandState === 'fullscreen' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </ActionButton>
          <ActionButton onClick={handleClose}>
            <X className="w-3.5 h-3.5" />
          </ActionButton>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          className="mb-3 pb-3 border-b border-white/10"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <AIProviderSelector />
        </motion.div>
      )}

      {/* Question */}
      {currentQuestion && (
        <div className="mb-3 pb-3 border-b border-white/10 flex-shrink-0">
          <p className="text-xs text-white/40 mb-1">Question</p>
          <p className="text-sm text-white/90 line-clamp-2">
            {currentQuestion}
          </p>
        </div>
      )}

      {/* Answer Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {currentAnswer?.answer ? (
          <div className="markdown-content text-sm text-white/90 pr-2">
            <ReactMarkdown
              components={{
                // Custom code block rendering
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match
                  
                  if (isInline) {
                    return (
                      <code 
                        className="bg-white/10 px-1.5 py-0.5 rounded text-wingman-300 text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }
                  
                  return (
                    <div className="my-2 rounded-lg overflow-hidden bg-black/40 border border-white/10">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-white/40 font-mono">
                          {match[1]}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(children))
                            toast.success('Code copied')
                          }}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <pre className="p-3 overflow-x-auto">
                        <code className="text-xs font-mono text-white/90">
                          {children}
                        </code>
                      </pre>
                    </div>
                  )
                },
                // Styled lists
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2">
                    {children}
                  </ol>
                ),
                // Styled paragraphs
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                // Styled headings
                h1: ({ children }) => (
                  <h1 className="text-lg font-semibold mt-3 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                ),
                // Styled strong
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                )
              }}
            >
              {currentAnswer.answer}
            </ReactMarkdown>
            
            {/* Streaming cursor */}
            {currentAnswer.isStreaming && (
              <motion.span
                className="inline-block w-2 h-4 bg-wingman-400 ml-0.5"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="flex items-center gap-2 text-white/40"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-4 h-4 border-2 border-wingman-500/30 border-t-wingman-500 rounded-full animate-spin" />
              <span className="text-sm">Generating answer...</span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {currentAnswer?.answer && !currentAnswer.isStreaming && (
        <motion.div 
          className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 flex-shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <ActionButton onClick={() => toast('Feedback saved!', { icon: '👍' })}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </ActionButton>
            <ActionButton onClick={() => toast('Feedback saved!', { icon: '👎' })}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </ActionButton>
            <ActionButton onClick={() => toast.success('Regenerating...')}>
              <RotateCcw className="w-3.5 h-3.5" />
            </ActionButton>
          </div>
          
          <ActionButton onClick={handleCopy} className="px-3 gap-1.5">
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </ActionButton>
        </motion.div>
      )}
    </motion.div>
  )
}

// Reusable action button
const ActionButton = ({ 
  children, 
  onClick, 
  className = '' 
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string 
}) => (
  <motion.button
    className={`
      flex items-center justify-center p-1.5 rounded-lg
      bg-white/5 hover:bg-white/10 
      text-white/60 hover:text-white
      transition-colors
      ${className}
    `}
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    {children}
  </motion.button>
)

export default ExpandedState

