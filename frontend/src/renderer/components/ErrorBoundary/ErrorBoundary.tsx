/**
 * Wingman AI - Error Boundary
 * Graceful error handling UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  copied: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    
    // Log error for debugging
    console.error('Wingman Error:', error)
    console.error('Component Stack:', errorInfo.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state
    
    const errorText = `
Wingman AI Error Report
========================
Error: ${error?.message}
Stack: ${error?.stack}

Component Stack: ${errorInfo?.componentStack}

Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
    `.trim()
    
    await navigator.clipboard.writeText(errorText)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  render(): ReactNode {
    const { hasError, error, copied } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Error Card */}
            <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              {/* Title */}
              <h1 className="text-xl font-semibold text-white mb-2">
                Something went wrong
              </h1>
              
              {/* Description */}
              <p className="text-sm text-white/60 mb-6">
                Wingman encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                  <p className="text-xs text-red-400/60 mb-1">Error message:</p>
                  <p className="text-sm text-red-300 font-mono break-all">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-wingman-500 hover:bg-wingman-600 text-white font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload App
                </button>

                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Try Again
                </button>

                <button
                  onClick={this.handleCopyError}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Error Details
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-center text-xs text-white/40 mt-4">
              If this keeps happening, try restarting the app or{' '}
              <a 
                href="https://github.com/wingman-ai/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-wingman-400 hover:underline"
              >
                report the issue
              </a>
            </p>
          </div>
        </div>
      )
    }

    return children
  }
}

// Functional wrapper for hooks compatibility
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> => {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary

