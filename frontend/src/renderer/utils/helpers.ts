/**
 * Wingman AI - Helper Functions
 */

import { clsx, type ClassValue } from 'clsx'

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format timestamp to readable string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if text looks like code
 */
export function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /^(const|let|var|function|class|import|export|def|public|private)\s/m,
    /\{\s*\n/,
    /;\s*$/m,
    /=>\s*{/,
    /\(\)\s*{/,
    /^\s*(if|for|while|switch)\s*\(/m
  ]
  
  return codeIndicators.some(pattern => pattern.test(text))
}

/**
 * Detect programming language from code snippet
 */
export function detectLanguage(code: string): string {
  const patterns: [RegExp, string][] = [
    [/\bdef\s+\w+\s*\(.*\)\s*:/, 'python'],
    [/\bfunction\s+\w+\s*\(/, 'javascript'],
    [/\bconst\s+\w+\s*=\s*\(.*\)\s*=>/, 'javascript'],
    [/\bpublic\s+class\s+\w+/, 'java'],
    [/\bfunc\s+\w+\s*\(/, 'go'],
    [/\bfn\s+\w+\s*\(/, 'rust'],
    [/^\s*#include\s*</, 'c'],
    [/\bpackage\s+\w+/, 'go'],
    [/\bimport\s+.*\s+from\s+['"]/, 'javascript']
  ]
  
  for (const [pattern, lang] of patterns) {
    if (pattern.test(code)) {
      return lang
    }
  }
  
  return 'plaintext'
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

/**
 * Check if platform is macOS
 */
export function isMac(): boolean {
  return window.wingman?.platform === 'darwin' || 
    navigator.platform.toLowerCase().includes('mac')
}

/**
 * Get modifier key name based on platform
 */
export function getModKey(): string {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('mod', getModKey())
    .replace('shift', isMac() ? '⇧' : 'Shift')
    .replace('alt', isMac() ? '⌥' : 'Alt')
    .replace('+', ' + ')
}

