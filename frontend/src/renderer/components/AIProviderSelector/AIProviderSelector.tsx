/**
 * Wingman AI - AI Provider Selector
 * Component to select and switch between AI providers
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, AIProvider, PROVIDER_MODELS } from '../../store/appStore'
import { setTabAI } from '../../services/tabs'
import { 
  Zap, 
  Cpu,
  ChevronDown,
  Check
} from 'lucide-react'

// Provider info with icons and descriptions
const PROVIDER_INFO: Record<AIProvider, { 
  name: string
  icon: React.ReactNode
  description: string
  color: string
  isFree: boolean
}> = {
  groq: {
    name: 'Groq',
    icon: <Zap className="w-4 h-4" />,
    description: 'Ultra-fast inference (FREE)',
    color: 'text-orange-400',
    isFree: true
  },
  nvidia: {
    name: 'NVIDIA',
    icon: <Cpu className="w-4 h-4" />,
    description: 'Automatic backup when Groq is busy (rotates keys)',
    color: 'text-green-400',
    isFree: true
  }
}

interface AIProviderSelectorProps {
  compact?: boolean
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ compact = false }) => {
  // Edits the open chat tab's AI; tabs without their own choice use the default from Settings
  const { aiProvider: defaultProvider, aiModel: defaultModel, availableProviders, tabs, activeConversationId } = useAppStore()
  const tab = tabs.find((t) => t.id === activeConversationId)
  const aiProvider: AIProvider = tab?.provider || defaultProvider
  const aiModel = tab?.model || (tab?.provider ? PROVIDER_MODELS[aiProvider][0] : defaultModel)
  const [isOpen, setIsOpen] = useState(false)

  const choose = (provider: AIProvider, model: string) => {
    if (activeConversationId) setTabAI(activeConversationId, provider, model)
  }

  const handleProviderSelect = (provider: AIProvider) => {
    choose(provider, PROVIDER_MODELS[provider]?.[0] || '')
    setIsOpen(false)
  }

  const handleModelSelect = (model: string) => choose(aiProvider, model)

  const currentInfo = PROVIDER_INFO[aiProvider]

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className={currentInfo.color}>{currentInfo.icon}</span>
          <span className="text-xs text-white/80">{currentInfo.name}</span>
          <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-50"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-2">
                <p className="text-xs text-white/40 px-2 py-1 uppercase tracking-wide">AI Providers</p>
                {availableProviders.map(provider => (
                  <ProviderOption
                    key={provider}
                    provider={provider}
                    isSelected={aiProvider === provider}
                    onClick={() => handleProviderSelect(provider)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full selector view
  return (
    <div className="space-y-4">
      {/* Current Provider */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 ${currentInfo.color}`}>
            {currentInfo.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{currentInfo.name}</p>
            <p className="text-xs text-white/40">{currentInfo.description}</p>
          </div>
        </div>
        {currentInfo.isFree && (
          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
            FREE
          </span>
        )}
      </div>

      <p className="text-[11px] text-white/40">
        Applies to this chat only. The default for new chats is in Settings → AI Models.
      </p>

      {/* Model Selector */}
      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-wide">Model</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_MODELS[aiProvider]?.map(model => (
            <motion.button
              key={model}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                aiModel === model
                  ? 'bg-wingman-500/30 text-wingman-300 border border-wingman-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
              }`}
              onClick={() => handleModelSelect(model)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {model.split('/').pop()?.replace(/-/g, ' ')}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Provider Grid */}
      <div className="space-y-2">
        <p className="text-xs text-white/40 uppercase tracking-wide">Switch Provider</p>
        <div className="grid grid-cols-2 gap-2">
          {availableProviders.map(provider => {
            const info = PROVIDER_INFO[provider]
            const isSelected = aiProvider === provider
            
            return (
              <motion.button
                key={provider}
                className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-wingman-500/20 border border-wingman-500/40'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
                onClick={() => handleProviderSelect(provider)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className={info.color}>{info.icon}</span>
                <div className="text-left flex-1">
                  <p className="text-xs font-medium text-white">{info.name}</p>
                  {info.isFree && (
                    <span className="text-[10px] text-green-400">FREE</span>
                  )}
                </div>
                {isSelected && <Check className="w-3 h-3 text-wingman-400" />}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Individual provider option
const ProviderOption: React.FC<{
  provider: AIProvider
  isSelected: boolean
  onClick: () => void
}> = ({ provider, isSelected, onClick }) => {
  const info = PROVIDER_INFO[provider]
  
  return (
    <motion.button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isSelected ? 'bg-wingman-500/20' : 'hover:bg-white/5'
      }`}
      onClick={onClick}
      whileHover={{ x: 2 }}
    >
      <span className={info.color}>{info.icon}</span>
      <div className="flex-1 text-left">
        <p className="text-sm text-white">{info.name}</p>
      </div>
      {isSelected && <Check className="w-4 h-4 text-wingman-400" />}
    </motion.button>
  )
}

export default AIProviderSelector
