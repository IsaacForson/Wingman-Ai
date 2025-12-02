/**
 * Wingman AI - Voice Output
 * Text-to-speech for AI responses
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Play, Pause, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VoiceOutputProps {
  text: string
  autoPlay?: boolean
  onStart?: () => void
  onEnd?: () => void
}

interface VoiceSettings {
  enabled: boolean
  rate: number
  pitch: number
  volume: number
  voice: string | null
}

const defaultSettings: VoiceSettings = {
  enabled: false,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  voice: null
}

const VoiceOutput: React.FC<VoiceOutputProps> = ({
  text,
  autoPlay = false,
  onStart,
  onEnd
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [settings, setSettings] = useState<VoiceSettings>(defaultSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      // Filter for English voices
      const englishVoices = voices.filter(
        v => v.lang.startsWith('en') 
      )
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices)
    }

    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      speechSynthesis.cancel()
    }
  }, [])

  // Auto-play
  useEffect(() => {
    if (autoPlay && settings.enabled && text) {
      speak()
    }
  }, [text, autoPlay, settings.enabled])

  const speak = useCallback(() => {
    if (!text) return
    
    // Cancel any ongoing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utterance

    // Apply settings
    utterance.rate = settings.rate
    utterance.pitch = settings.pitch
    utterance.volume = settings.volume

    // Set voice
    if (settings.voice) {
      const voice = availableVoices.find(v => v.name === settings.voice)
      if (voice) {
        utterance.voice = voice
      }
    } else if (availableVoices.length > 0) {
      // Default to first English voice
      utterance.voice = availableVoices[0]
    }

    // Events
    utterance.onstart = () => {
      setIsPlaying(true)
      onStart?.()
    }

    utterance.onend = () => {
      setIsPlaying(false)
      onEnd?.()
    }

    utterance.onerror = () => {
      setIsPlaying(false)
    }

    speechSynthesis.speak(utterance)
  }, [text, settings, availableVoices, onStart, onEnd])

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      speak()
    }
  }, [isPlaying, speak, stop])

  const toggleEnabled = useCallback(() => {
    const newEnabled = !settings.enabled
    setSettings(s => ({ ...s, enabled: newEnabled }))
    
    if (!newEnabled && isPlaying) {
      stop()
    }
  }, [settings.enabled, isPlaying, stop])

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Main toggle */}
      <button
        onClick={toggleEnabled}
        className={`p-1.5 rounded-lg transition-colors ${
          settings.enabled
            ? 'bg-wingman-500/20 text-wingman-400'
            : 'text-white/40 hover:text-white/60 hover:bg-white/10'
        }`}
        title={settings.enabled ? 'Disable voice' : 'Enable voice'}
      >
        {settings.enabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>

      {/* Play/Pause button (only show if enabled) */}
      {settings.enabled && (
        <button
          onClick={toggle}
          className={`p-1.5 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-wingman-500/20 text-wingman-400'
              : 'text-white/40 hover:text-white/60 hover:bg-white/10'
          }`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Settings button */}
      {settings.enabled && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg transition-colors ${
            showSettings
              ? 'bg-white/10 text-white'
              : 'text-white/40 hover:text-white/60 hover:bg-white/10'
          }`}
          title="Voice settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-64 p-4 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl z-50"
          >
            <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Voice Settings</p>

            {/* Voice selection */}
            <div className="mb-4">
              <label className="text-xs text-white/60 mb-1 block">Voice</label>
              <select
                value={settings.voice || ''}
                onChange={(e) => setSettings(s => ({ ...s, voice: e.target.value || null }))}
                className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-white focus:outline-none"
              >
                <option value="">Default</option>
                {availableVoices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Speed */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Speed</span>
                <span className="text-white/40">{settings.rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.rate}
                onChange={(e) => setSettings(s => ({ ...s, rate: parseFloat(e.target.value) }))}
                className="w-full h-1 rounded-full bg-white/20 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-wingman-500"
              />
            </div>

            {/* Pitch */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Pitch</span>
                <span className="text-white/40">{settings.pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => setSettings(s => ({ ...s, pitch: parseFloat(e.target.value) }))}
                className="w-full h-1 rounded-full bg-white/20 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-wingman-500"
              />
            </div>

            {/* Volume */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Volume</span>
                <span className="text-white/40">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => setSettings(s => ({ ...s, volume: parseFloat(e.target.value) }))}
                className="w-full h-1 rounded-full bg-white/20 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-wingman-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playing indicator */}
      {isPlaying && (
        <motion.div
          className="flex items-center gap-0.5 ml-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-0.5 bg-wingman-500 rounded-full"
              animate={{
                height: [8, 16, 8],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default VoiceOutput

