/**
 * Wingman AI - Expanded State
 * Chat-like conversation view with full history
 */

import React, { useRef, useState, useEffect } from 'react'
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
  Zap,
  User,
  Bot,
  Trash2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Highlight, themes } from 'prism-react-renderer'
import toast from 'react-hot-toast'
import { AIProviderSelector } from '../AIProviderSelector'
import { ModeSelector } from '../ModeSelector'
import socketService from '../../services/socket'

const ExpandedState = () => {
  const { 
    currentQuestion, 
    currentAnswer,
    answerHistory,
    islandState,
    setIslandState,
    isProcessing,
    isListening,
    aiProvider,
    setCurrentAnswer,
    setCurrentQuestion,
    setProcessing,
    setSettingsOpen,
    clearHistory
  } = useAppStore()
  
  const [copied, setCopied] = useState(false)
  const [showAISelector, setShowAISelector] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [answerHistory, currentAnswer])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setIslandState('normal')
  }

  const handleClearChat = () => {
    if (confirm('Clear all conversation history?')) {
      clearHistory()
      setCurrentAnswer(null)
      setCurrentQuestion(null)
      toast.success('Chat cleared')
    }
  }

  const toggleFullscreen = () => {
    setIslandState(islandState === 'fullscreen' ? 'expanded' : 'fullscreen')
  }

  const handleRegenerate = () => {
    // Get the last question from history or current
    const lastMessage = answerHistory[answerHistory.length - 1]
    const questionToRegen = currentQuestion || lastMessage?.question
    
    if (!questionToRegen) {
      toast.error('No question to regenerate')
      return
    }
    
    const { activeConversationId, mode: currentMode } = useAppStore.getState()
    
    setCurrentAnswer({
      id: `regen-${Date.now()}`,
      question: questionToRegen,
      answer: '',
      isStreaming: true,
      timestamp: new Date(),
      source: lastMessage?.source || 'audio'
    })
    setProcessing(true)
    
    socketService.submitQuestion(questionToRegen, activeConversationId || undefined, currentMode)
    toast.success('Regenerating answer...')
  }

  const handleMicClick = () => {
    if (isListening) {
      socketService.stopAudio()
    } else {
      socketService.startAudio()
    }
  }

  // Combine history with current Q&A for display
  // Show currentAnswer if:
  // 1. It's streaming (actively generating)
  // 2. OR it has a question but no answer yet (waiting to start)
  const showCurrent = currentAnswer && (
    currentAnswer.isStreaming || 
    (currentAnswer.question && !currentAnswer.answer)
  )
  
  const allMessages = [
    ...answerHistory,
    ...(showCurrent ? [currentAnswer] : [])
  ]

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
            {isProcessing ? 'Generating...' : 'Chat'}
          </span>
          <ModeSelector compact />
          <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">
            {aiProvider}
          </span>
          {allMessages.length > 0 && (
            <span className="text-[10px] text-white/30 px-1.5 py-0.5 bg-white/5 rounded">
              {allMessages.length} msgs
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <ActionButton 
            onClick={() => setShowAISelector(!showAISelector)}
            title="Switch AI Model"
          >
            <Zap className={`w-3.5 h-3.5 ${showAISelector ? 'text-wingman-400' : ''}`} />
          </ActionButton>
          {allMessages.length > 0 && (
            <ActionButton 
              onClick={handleClearChat}
              title="Clear Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </ActionButton>
          )}
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

      {/* Chat Messages - Scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4"
      >
        {allMessages.length > 0 ? (
          allMessages.map((entry, index) => (
            <ChatMessage 
              key={entry.id || index} 
              entry={entry} 
              onCopy={handleCopy}
              isLast={index === allMessages.length - 1}
            />
          ))
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
          <EmptyState isListening={isListening} onMicClick={handleMicClick} />
        )}
      </div>

      {/* Footer Actions */}
      {(() => {
        // Get the last completed message for action buttons
        const lastMessage = answerHistory[answerHistory.length - 1]
        const hasCompletedAnswer = lastMessage?.answer && !lastMessage?.isStreaming
        
        return (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-1">
              {hasCompletedAnswer && (
                <>
                  <ActionButton onClick={() => toast('Feedback saved!', { icon: '👍' })} title="Good answer">
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </ActionButton>
                  <ActionButton onClick={() => toast('Feedback saved!', { icon: '👎' })} title="Bad answer">
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </ActionButton>
                  <ActionButton onClick={handleRegenerate} className="px-2 gap-1" title="Regenerate answer">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">Redo</span>
                  </ActionButton>
                </>
              )}
              {/* Listen button - always visible */}
              <ActionButton 
                onClick={handleMicClick} 
                className={`px-2 gap-1 ${isListening ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-wingman-500/20 hover:bg-wingman-500/30'}`}
                title={isListening ? 'Stop listening (⌘+Shift+K)' : 'Ask a question (⌘+Shift+L)'}
              >
                {isListening ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-red-400">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-wingman-400" />
                    <span className="text-xs text-wingman-400">Ask</span>
                  </>
                )}
              </ActionButton>
            </div>
            
            {hasCompletedAnswer && (
              <ActionButton onClick={() => handleCopy(lastMessage.answer)} className="px-3 gap-1.5" title="Copy last answer">
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
            )}
          </div>
        )
      })()}
    </motion.div>
  )
}

// Chat message component
interface ChatMessageProps {
  entry: {
    id: string
    question: string
    answer: string
    isStreaming: boolean
    timestamp: Date
    source: string
    provider?: string
    model?: string
  }
  onCopy: (text: string) => void
  isLast: boolean
}

const ChatMessage = ({ entry, onCopy, isLast }: ChatMessageProps) => {
  return (
    <div className="space-y-3">
      {/* User Question */}
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 text-blue-400" />
        </div>
        <div className="flex-1 bg-white/5 rounded-lg p-3">
          <p className="text-xs text-white/40 mb-1">You</p>
          <p className="text-sm text-white/90">{entry.question}</p>
        </div>
      </div>
      
      {/* AI Answer */}
      {(entry.answer || entry.isStreaming) && (
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-wingman-500/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3 h-3 text-wingman-400" />
          </div>
          <div className="flex-1 bg-wingman-500/5 rounded-lg p-3 border border-wingman-500/10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-wingman-400">
                Wingman
                {entry.provider && !entry.isStreaming && (
                  <span className="text-white/30 ml-1">via {entry.provider}</span>
                )}
              </p>
              {entry.answer && !entry.isStreaming && (
                <button
                  onClick={() => onCopy(entry.answer)}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                  title="Copy answer"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {entry.answer ? (
              <div className="markdown-content text-sm text-white/90">
                <ReactMarkdown
                  components={{
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
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-lg font-semibold mt-3 mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white">{children}</strong>
                    )
                  }}
                >
                  {entry.answer}
                </ReactMarkdown>
                
                {entry.isStreaming && isLast && (
                  <motion.span
                    className="inline-block w-2 h-4 bg-wingman-400 ml-0.5"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/40">
                <div className="w-3 h-3 border-2 border-wingman-500/30 border-t-wingman-500 rounded-full animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Empty state component
const EmptyState = ({ isListening, onMicClick }: { isListening: boolean; onMicClick: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
    <div className="text-white/30 text-sm">
      No conversation yet
    </div>
    <p className="text-white/20 text-xs max-w-[200px]">
      {isListening ? 'Listening... speak now' : 'Click the mic button to ask a question'}
    </p>
    
    <button
      onClick={onMicClick}
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
)

// Reusable action button
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
      e.stopPropagation()
      onClick?.()
    }}
    title={title}
  >
    {children}
  </button>
)

export default ExpandedState
