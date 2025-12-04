/**
 * Wingman AI - Expanded State
 * Full answer display with question context
 */

import React, { useRef, useState } from 'react'
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
  Settings,
  Mic,
  MicOff,
  Zap
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Highlight, themes } from 'prism-react-renderer'
import toast from 'react-hot-toast'
import { AIProviderSelector } from '../AIProviderSelector'
import socketService from '../../services/socket'

const ExpandedState = () => {
  const { 
    currentQuestion, 
    currentAnswer,
    islandState,
    setIslandState,
    isProcessing,
    isListening,
    aiProvider,
    setCurrentAnswer,
    setProcessing,
    setSettingsOpen
  } = useAppStore()
  
  const [copied, setCopied] = useState(false)
  const [showAISelector, setShowAISelector] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // No auto-scroll - let user read from top

  const handleCopy = () => {
    if (currentAnswer?.answer) {
      navigator.clipboard.writeText(currentAnswer.answer)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    // Clear current Q&A and go to normal state (click to listen)
    setCurrentAnswer(null)
    useAppStore.getState().setCurrentQuestion(null)
    setIslandState('normal')
  }

  const toggleFullscreen = () => {
    setIslandState(islandState === 'fullscreen' ? 'expanded' : 'fullscreen')
  }

  const handleRegenerate = () => {
    if (!currentQuestion) {
      toast.error('No question to regenerate')
      return
    }
    
    // Clear current answer and regenerate
    setCurrentAnswer({
      id: currentAnswer?.id || '',
      question: currentQuestion,
      answer: '',
      isStreaming: true,
      timestamp: new Date(),
      source: currentAnswer?.source || 'audio'
    })
    setProcessing(true)
    
    // Emit regenerate request
    socketService.submitQuestion(currentQuestion)
    toast.success('Regenerating answer...')
  }

  const handleMicClick = () => {
    if (isListening) {
      socketService.stopAudio()
    } else {
      socketService.startAudio()
    }
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
          {/* Quick AI Provider Toggle */}
          <ActionButton 
            onClick={() => setShowAISelector(!showAISelector)}
            title="Switch AI Model"
          >
            <Zap className={`w-3.5 h-3.5 ${showAISelector ? 'text-wingman-400' : ''}`} />
          </ActionButton>
          {/* Full Settings Panel */}
          <ActionButton 
            onClick={() => setSettingsOpen(true)}
            title="Open Settings (⌘+,)"
          >
            <Settings className="w-3.5 h-3.5" />
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

      {/* Quick AI Selector */}
      {showAISelector && (
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

      {/* Answer Content - Scrollable container */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 pr-1"
        style={{ 
          overflowY: 'auto',
          maxHeight: 'calc(100% - 120px)'
        }}
      >
        {currentAnswer?.answer ? (
          <div className="markdown-content text-sm text-white/90 pr-2">
            <ReactMarkdown
              components={{
                // Custom code block rendering with syntax highlighting
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeString = String(children).replace(/\n$/, '')
                  const isInline = !match && !codeString.includes('\n')
                  
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
                  
                  const language = match ? match[1] : 'text'
                  
                  return (
                    <div className="my-2 rounded-lg overflow-hidden bg-[#1a1a2e] border border-white/10">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
                        <span className="text-xs text-wingman-400 font-mono uppercase">
                          {language}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(codeString)
                            toast.success('Code copied')
                          }}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <Highlight
                        theme={themes.nightOwl}
                        code={codeString}
                        language={language}
                      >
                        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
                          <pre 
                            className={`${highlightClassName} p-3 overflow-x-auto text-xs`}
                            style={{ ...style, backgroundColor: 'transparent', margin: 0 }}
                          >
                            {tokens.map((line, i) => (
                              <div key={i} {...getLineProps({ line })} className="leading-relaxed">
                                <span className="inline-block w-8 text-white/20 select-none text-right pr-4">
                                  {i + 1}
                                </span>
                                {line.map((token, key) => (
                                  <span key={key} {...getTokenProps({ token })} />
                                ))}
                              </div>
                            ))}
                          </pre>
                        )}
                      </Highlight>
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
        ) : isProcessing ? (
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
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="text-white/30 text-sm">
              {currentQuestion ? 'Processing your question...' : 'No question detected yet'}
            </div>
            <p className="text-white/20 text-xs max-w-[200px]">
              {isListening ? 'Listening... speak now' : 'Click the mic button to start listening'}
            </p>
            
            {/* Mic Button */}
            <button
              onClick={handleMicClick}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center
                ${isListening ? 'bg-red-500/30 hover:bg-red-500/40' : 'bg-white/10 hover:bg-white/20'}
                active:bg-white/30 transition-all
              `}
            >
              {isListening ? (
                <Mic className="w-6 h-6 text-red-400" />
              ) : (
                <MicOff className="w-6 h-6 text-white/60" />
              )}
            </button>
            
            {isListening && (
              <p className="text-wingman-400 text-xs animate-pulse">
                Recording... click again to stop
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {currentAnswer?.answer && !currentAnswer.isStreaming && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-1">
            <ActionButton onClick={() => toast('Feedback saved!', { icon: '👍' })}>
              <ThumbsUp className="w-3.5 h-3.5" />
            </ActionButton>
            <ActionButton onClick={() => toast('Feedback saved!', { icon: '👎' })}>
              <ThumbsDown className="w-3.5 h-3.5" />
            </ActionButton>
            <ActionButton onClick={handleRegenerate} className="px-2 gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-xs">Regenerate</span>
            </ActionButton>
            {/* Listen button for quick access */}
            <ActionButton 
              onClick={handleMicClick} 
              className={`px-2 gap-1 ${isListening ? 'bg-red-500/20 hover:bg-red-500/30' : ''}`}
              title={isListening ? 'Stop listening' : 'Ask another question'}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-xs">Listen</span>
                </>
              )}
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
        </div>
      )}
    </motion.div>
  )
}

// Reusable action button - no scale animations for reliable clicking
const ActionButton = ({ 
  children, 
  onClick, 
  className = '',
  title
}: { 
  children: React.ReactNode
  onClick?: () => void
  className?: string
  title?: string
}) => (
  <button
    className={`
      flex items-center justify-center p-2 rounded-lg
      bg-white/5 hover:bg-white/15 active:bg-white/20
      text-white/60 hover:text-white
      transition-colors cursor-pointer
      ${className}
    `}
    onClick={(e) => {
      e.stopPropagation() // Prevent drag from triggering
      onClick?.()
    }}
    title={title}
  >
    {children}
  </button>
)

export default ExpandedState

