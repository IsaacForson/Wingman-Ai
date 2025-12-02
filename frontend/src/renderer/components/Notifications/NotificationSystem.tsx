/**
 * Wingman AI - Notification System
 * Desktop notifications and in-app alerts
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
  Settings
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'message'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // ms, 0 = persistent
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationSystemProps {
  maxVisible?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

// Global notification state
let notificationHandlers: ((notification: Notification) => void)[] = []

export const notify = (notification: Omit<Notification, 'id'>) => {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const fullNotification = { ...notification, id }
  
  notificationHandlers.forEach(handler => handler(fullNotification))
  
  // Also show desktop notification if permission granted
  showDesktopNotification(fullNotification)
  
  return id
}

export const notifySuccess = (title: string, message?: string) => 
  notify({ type: 'success', title, message, duration: 4000 })

export const notifyError = (title: string, message?: string) => 
  notify({ type: 'error', title, message, duration: 6000 })

export const notifyInfo = (title: string, message?: string) => 
  notify({ type: 'info', title, message, duration: 4000 })

export const notifyWarning = (title: string, message?: string) => 
  notify({ type: 'warning', title, message, duration: 5000 })

async function showDesktopNotification(notification: Notification) {
  // Check if we have permission
  if (!('Notification' in window)) return
  
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icon.png',
      silent: true
    })
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png',
        silent: true
      })
    }
  }
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxVisible = 5,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const handler = (notification: Notification) => {
      setNotifications(prev => {
        const updated = [notification, ...prev].slice(0, maxVisible * 2)
        return updated
      })

      // Auto-dismiss
      if (notification.duration !== 0) {
        setTimeout(() => {
          dismissNotification(notification.id)
        }, notification.duration || 4000)
      }
    }

    notificationHandlers.push(handler)
    
    return () => {
      notificationHandlers = notificationHandlers.filter(h => h !== handler)
    }
  }, [maxVisible])

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case 'message':
        return <MessageSquare className="w-5 h-5 text-wingman-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 flex flex-col gap-2 pointer-events-none`}>
      <AnimatePresence>
        {notifications.slice(0, maxVisible).map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className="pointer-events-auto w-80 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="mt-0.5">
                {getIcon(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {notification.title}
                </p>
                {notification.message && (
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                )}
                {notification.action && (
                  <button
                    onClick={() => {
                      notification.action?.onClick()
                      dismissNotification(notification.id)
                    }}
                    className="mt-2 text-xs text-wingman-400 hover:text-wingman-300 font-medium"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar for timed notifications */}
            {notification.duration && notification.duration > 0 && (
              <motion.div
                className={`h-0.5 ${
                  notification.type === 'error' ? 'bg-red-500' :
                  notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'warning' ? 'bg-yellow-500' :
                  'bg-wingman-500'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: notification.duration / 1000, ease: 'linear' }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook for components to use notifications
export function useNotifications() {
  return {
    notify,
    success: notifySuccess,
    error: notifyError,
    info: notifyInfo,
    warning: notifyWarning
  }
}

export default NotificationSystem

