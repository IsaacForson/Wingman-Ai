/**
 * Wingman AI - Performance Monitor UI
 * Visual display of app performance metrics
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Activity,
  Cpu,
  HardDrive,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'

interface PerformanceMonitorProps {
  isOpen: boolean
  onClose: () => void
}

interface PerformanceData {
  cpu_percent: number
  memory_mb: number
  avg_response_ms: number
  timings: {
    transcription: { avg_ms: number; count: number }
    ai_response: { avg_ms: number; count: number }
    ocr: { avg_ms: number; count: number }
  }
  counters: {
    questions_asked: number
    answers_generated: number
    cache_hits: number
    cache_misses: number
    errors: number
  }
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<PerformanceData>({
    cpu_percent: 12,
    memory_mb: 245,
    avg_response_ms: 850,
    timings: {
      transcription: { avg_ms: 320, count: 156 },
      ai_response: { avg_ms: 1200, count: 243 },
      ocr: { avg_ms: 450, count: 67 }
    },
    counters: {
      questions_asked: 247,
      answers_generated: 243,
      cache_hits: 45,
      cache_misses: 198,
      errors: 4
    }
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulate real-time updates
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        cpu_percent: Math.max(5, Math.min(95, prev.cpu_percent + (Math.random() - 0.5) * 10)),
        memory_mb: Math.max(100, Math.min(400, prev.memory_mb + (Math.random() - 0.5) * 20)),
        avg_response_ms: Math.max(300, Math.min(2000, prev.avg_response_ms + (Math.random() - 0.5) * 200))
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [isOpen])

  const refresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getStatusColor = (metric: string, value: number) => {
    switch (metric) {
      case 'cpu':
        if (value < 30) return 'text-green-400'
        if (value < 70) return 'text-yellow-400'
        return 'text-red-400'
      case 'memory':
        if (value < 200) return 'text-green-400'
        if (value < 350) return 'text-yellow-400'
        return 'text-red-400'
      case 'response':
        if (value < 1000) return 'text-green-400'
        if (value < 2000) return 'text-yellow-400'
        return 'text-red-400'
      default:
        return 'text-white'
    }
  }

  const getOverallStatus = () => {
    if (data.cpu_percent > 70 || data.memory_mb > 350 || data.avg_response_ms > 2000) {
      return { status: 'degraded', color: 'text-yellow-400', icon: AlertTriangle }
    }
    return { status: 'healthy', color: 'text-green-400', icon: CheckCircle }
  }

  const status = getOverallStatus()
  const cacheHitRate = data.counters.cache_hits + data.counters.cache_misses > 0
    ? (data.counters.cache_hits / (data.counters.cache_hits + data.counters.cache_misses) * 100).toFixed(1)
    : '0'

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
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Performance</h2>
                  <div className="flex items-center gap-2">
                    <status.icon className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-xs ${status.color} capitalize`}>{status.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className={`p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* System Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className={`w-4 h-4 ${getStatusColor('cpu', data.cpu_percent)}`} />
                    <span className="text-xs text-white/60">CPU Usage</span>
                  </div>
                  <p className={`text-2xl font-bold ${getStatusColor('cpu', data.cpu_percent)}`}>
                    {data.cpu_percent.toFixed(1)}%
                  </p>
                  <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        data.cpu_percent < 30 ? 'bg-green-500' :
                        data.cpu_percent < 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.cpu_percent}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <HardDrive className={`w-4 h-4 ${getStatusColor('memory', data.memory_mb)}`} />
                    <span className="text-xs text-white/60">Memory</span>
                  </div>
                  <p className={`text-2xl font-bold ${getStatusColor('memory', data.memory_mb)}`}>
                    {data.memory_mb.toFixed(0)} MB
                  </p>
                  <p className="text-xs text-white/40 mt-1">Target: &lt;500 MB</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className={`w-4 h-4 ${getStatusColor('response', data.avg_response_ms)}`} />
                    <span className="text-xs text-white/60">Avg Response</span>
                  </div>
                  <p className={`text-2xl font-bold ${getStatusColor('response', data.avg_response_ms)}`}>
                    {data.avg_response_ms.toFixed(0)} ms
                  </p>
                  <p className="text-xs text-white/40 mt-1">Target: &lt;2000 ms</p>
                </div>
              </div>

              {/* Timing Breakdown */}
              <div>
                <p className="text-sm font-medium text-white mb-3">Operation Timings</p>
                <div className="space-y-3">
                  {Object.entries(data.timings).map(([key, timing]) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-sm text-white/60 w-28 capitalize">{key.replace('_', ' ')}</span>
                      <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            timing.avg_ms < 500 ? 'bg-green-500' :
                            timing.avg_ms < 1500 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (timing.avg_ms / 2000) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-white w-20 text-right">
                        {timing.avg_ms.toFixed(0)} ms
                      </span>
                      <span className="text-xs text-white/40 w-16 text-right">
                        ({timing.count} ops)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Counters */}
              <div>
                <p className="text-sm font-medium text-white mb-3">Session Statistics</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                    <span className="text-sm text-white/60">Questions Asked</span>
                    <span className="text-sm font-bold text-white">{data.counters.questions_asked}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                    <span className="text-sm text-white/60">Answers Generated</span>
                    <span className="text-sm font-bold text-white">{data.counters.answers_generated}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                    <span className="text-sm text-white/60">Cache Hit Rate</span>
                    <span className="text-sm font-bold text-green-400">{cacheHitRate}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 flex items-center justify-between">
                    <span className="text-sm text-white/60">Errors</span>
                    <span className={`text-sm font-bold ${data.counters.errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {data.counters.errors}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Performance Tips</span>
                </div>
                <ul className="space-y-1 text-sm text-white/60">
                  {data.cpu_percent > 50 && (
                    <li>• High CPU: Consider reducing screen capture frequency</li>
                  )}
                  {data.memory_mb > 300 && (
                    <li>• High memory: Clear history to free up memory</li>
                  )}
                  {data.avg_response_ms > 1500 && (
                    <li>• Slow responses: Try switching to Groq for faster answers</li>
                  )}
                  {parseFloat(cacheHitRate) < 20 && (
                    <li>• Low cache hits: Enable caching for repeated questions</li>
                  )}
                  {data.cpu_percent < 30 && data.memory_mb < 250 && data.avg_response_ms < 1000 && (
                    <li>• 🎉 Everything looks great! Performance is optimal.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/10 text-center">
              <span className="text-xs text-white/40">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PerformanceMonitor

