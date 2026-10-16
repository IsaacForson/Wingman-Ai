/**
 * Wingman AI - Electron Main Process
 * Handles window management, system tray, global hotkeys, and backend auto-start
 */

import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage, NativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import http from 'http'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
// eslint-disable-next-line @typescript-eslint/no-var-requires
try {
  if (require('electron-squirrel-startup')) {
    app.quit()
  }
} catch {
  // electron-squirrel-startup not available
}

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // This is the primary instance - handle when second instance is launched
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let backendProcess: ChildProcess | null = null

const BACKEND_URL = 'http://127.0.0.1:8765'
const BACKEND_HEALTH_ENDPOINT = '/health'

// Window configuration
const WINDOW_CONFIG = {
  nano: { width: 60, height: 40 },
  mini: { width: 140, height: 44 },
  normal: { width: 420, height: 64 },
  expanded: { width: 600, height: 400 },
  fullscreen: { width: 900, height: 600 }
}

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  // Create a FULLSCREEN transparent window so island can be dragged anywhere
  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000', // Fully transparent
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  // Make window click-through by default, but forward mouse events
  // This allows clicks to pass through to desktop, except on the island
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  // Set window level to be above everything including fullscreen apps (macOS)
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false)
    // Set window to be excluded from screen capture
    mainWindow.setContentProtection(true)
    // Make visible on all Spaces including fullscreen apps
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    // Use 'screen-saver' level to stay above fullscreen apps
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }

  // Load the app
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Handle close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray(): void {
  // Create a simple tray icon
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../resources/tray-icon.png')
    : path.join(__dirname, '../resources/tray-icon.png')

  // Create a small icon for tray (if file doesn't exist, use a placeholder)
  let trayIcon: NativeImage
  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      // Create a simple colored icon as fallback
      trayIcon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEzSURBVDiNpZMxTsNAEEWfJwgJkdAiGgoaJI4AFRfgAFyCjoaOI3AEGmpaCgouQEHDESgoUBASQkIkyBaOvWNnAaer/f/PzO7sGv6JYRhkWdYFVoFjYAzsAi/AEPB+x7Ku67que8A6cAa8AU9pmsa/AmVZ7gBnwB7wBNzEGKcAVVUdApfAAZADNzHGj98K0jQ9By6BAjgF7mOM3wBaa8dAxWjLhQxBELyYxk+PkiRJgBOgCWwDKy4kJqy0Y4xT4BpYAwZhGBaLQOqKrutuAS/A6kQUx3EBdIBDoAXcxxifXXkWa22MMU6AHlCf+Abgg/NcZoYMw3AEXAMPvu+PlxK6vOu6Y+8r4DRGP85SLyIYhkETeJ8H7yzLhk+4D+x5npcDL97cJ/r+VhAGIvKzlM7zpZn9f/sCMXJ4Av8AAAAASUVORK5CYII='
      )
    }
  } catch {
    // Fallback icon
    trayIcon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEzSURBVDiNpZMxTsNAEEWfJwgJkdAiGgoaJI4AFRfgAFyCjoaOI3AEGmpaCgouQEHDESgoUBASQkIkyBaOvWNnAaer/f/PzO7sGv6JYRhkWdYFVoFjYAzsAi/AEPB+x7Ku67que8A6cAa8AU9pmsa/AmVZ7gBnwB7wBNzEGKcAVVUdApfAAZADNzHGj98K0jQ9By6BAjgF7mOM3wBaa8dAxWjLhQxBELyYxk+PkiRJgBOgCWwDKy4kJqy0Y4xT4BpYAwZhGBaLQOqKrutuAS/A6kQUx3EBdIBDoAXcxxifXXkWa22MMU6AHlCf+Abgg/NcZoYMw3AEXAMPvu+PlxK6vOu6Y+8r4DRGP85SLyIYhkETeJ8H7yzLhk+4D+x5npcDL97cJ/r+VhAGIvKzlM7zpZn9f/sCMXJ4Av8AAAAASUVORK5CYII='
    )
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Wingman',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Interview Mode',
      type: 'radio',
      checked: true,
      click: () => mainWindow?.webContents.send('set-mode', 'interview')
    },
    {
      label: 'Study Mode',
      type: 'radio',
      click: () => mainWindow?.webContents.send('set-mode', 'study')
    },
    {
      label: 'Work Mode',
      type: 'radio',
      click: () => mainWindow?.webContents.send('set-mode', 'work')
    },
    {
      label: 'Meeting Mode',
      type: 'radio',
      click: () => mainWindow?.webContents.send('set-mode', 'meeting')
    },
    { type: 'separator' },
    {
      label: 'Pause',
      accelerator: 'CommandOrControl+Shift+P',
      click: () => mainWindow?.webContents.send('toggle-pause')
    },
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: 'CommandOrControl+,',
      click: () => mainWindow?.webContents.send('open-settings')
    },
    { type: 'separator' },
    {
      label: 'Quit Wingman',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Wingman AI')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

// Global shortcut actions; the accelerators come from the Hotkeys settings
const hotkeyActions: Record<string, () => void> = {
  toggleVisibility: () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  },
  commandPalette: () => {
    mainWindow?.show()
    mainWindow?.focus()
    mainWindow?.webContents.send('open-command-palette')
  },
  pauseResume: () => mainWindow?.webContents.send('toggle-pause'),
  captureScreen: () => mainWindow?.webContents.send('capture-screen'),
  // Emergency hide (kill switch)
  emergencyHide: () => {
    mainWindow?.hide()
    mainWindow?.webContents.send('emergency-hide')
  },
  startListening: () => mainWindow?.webContents.send('start-listening'),
  stopListening: () => mainWindow?.webContents.send('stop-listening'),
}

const hotkeys: Record<string, string> = {
  toggleVisibility: 'CommandOrControl+Shift+W',
  commandPalette: 'CommandOrControl+Space',
  pauseResume: 'CommandOrControl+Shift+P',
  captureScreen: 'CommandOrControl+Shift+S',
  emergencyHide: 'CommandOrControl+Shift+Escape',
  startListening: 'CommandOrControl+Shift+L',
  stopListening: 'CommandOrControl+Shift+K',
}

function registerGlobalShortcuts(): void {
  for (const [action, keys] of Object.entries(hotkeys)) {
    try {
      globalShortcut.register(keys, hotkeyActions[action])
    } catch (err) {
      console.error(`Could not register ${keys} for ${action}:`, err)
    }
  }
}

// Rebind one action. Returns false (and keeps the old binding) if the keys are taken or invalid.
function setHotkey(action: string, keys: string): boolean {
  const handler = hotkeyActions[action]
  if (!handler) return false
  const old = hotkeys[action]
  if (old === keys) return true
  try {
    if (!globalShortcut.register(keys, handler)) return false
  } catch {
    return false
  }
  if (old) globalShortcut.unregister(old)
  hotkeys[action] = keys
  return true
}

function setupIPC(): void {
  // Window size changes - no longer needed since window is fullscreen
  // The Dynamic Island handles its own size changes
  ipcMain.handle('resize-window', () => {
    // No-op: window stays fullscreen, island resizes itself
  })

  // Get current window state
  ipcMain.handle('get-window-bounds', () => {
    return mainWindow?.getBounds()
  })

  // Move window
  ipcMain.handle('move-window', (_, x: number, y: number) => {
    mainWindow?.setPosition(x, y, true)
  })

  // Set always on top
  ipcMain.handle('set-always-on-top', (_, flag: boolean) => {
    if (flag && process.platform === 'darwin') {
      // Use 'screen-saver' level to stay above fullscreen apps on macOS
      mainWindow?.setAlwaysOnTop(true, 'screen-saver')
      mainWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    } else {
      mainWindow?.setAlwaysOnTop(flag)
      if (!flag && process.platform === 'darwin') {
        mainWindow?.setVisibleOnAllWorkspaces(false)
      }
    }
  })

  // Track if a modal is open (settings, command palette, etc.)
  // When a modal is open, we should NOT enable click-through
  let isModalOpen = false

  // Set click-through - called when modals open/close
  ipcMain.handle('set-ignore-mouse', (_, ignore: boolean) => {
    // If ignore is false, a modal is open
    isModalOpen = !ignore
    mainWindow?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  // Mouse entered the island - enable interaction
  ipcMain.on('mouse-enter-island', () => {
    mainWindow?.setIgnoreMouseEvents(false)
  })

  // Mouse left the island - enable click-through (but NOT if modal is open)
  ipcMain.on('mouse-leave-island', () => {
    if (!isModalOpen) {
      mainWindow?.setIgnoreMouseEvents(true, { forward: true })
    }
  })

  // Get screen info
  ipcMain.handle('get-screen-info', () => {
    const primaryDisplay = screen.getPrimaryDisplay()
    return {
      width: primaryDisplay.workAreaSize.width,
      height: primaryDisplay.workAreaSize.height,
      scaleFactor: primaryDisplay.scaleFactor
    }
  })

  // Settings-related IPC handlers
  
  // Launch at startup
  ipcMain.handle('set-launch-at-startup', (_, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true // Start minimized to tray
    })
    console.log(`Launch at startup: ${enabled}`)
  })

  // Show/hide in dock (macOS)
  ipcMain.handle('set-show-in-dock', (_, show: boolean) => {
    if (process.platform === 'darwin') {
      if (show) {
        app.dock?.show()
      } else {
        app.dock?.hide()
      }
    }
    console.log(`Show in dock: ${show}`)
  })

  // Window opacity
  ipcMain.handle('set-window-opacity', (_, opacity: number) => {
    if (mainWindow) {
      mainWindow.setOpacity(Math.max(0.5, Math.min(1, opacity)))
    }
    console.log(`Window opacity: ${opacity}`)
  })

  // Hide from screen capture (screen share protection)
  ipcMain.handle('set-hide-from-screen-capture', (_, hide: boolean) => {
    if (mainWindow && process.platform === 'darwin') {
      mainWindow.setContentProtection(hide)
    }
    console.log(`Hide from screen capture: ${hide}`)
  })

  // Hotkey customization
  ipcMain.handle('set-hotkey', (_, action: string, keys: string) => setHotkey(action, keys))

  // Quit app
  ipcMain.handle('quit-app', () => {
    isQuitting = true
    app.quit()
  })
}

// Backend management
async function startBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    // First check if backend is already running
    checkBackendHealth().then((isHealthy) => {
      if (isHealthy) {
        console.log('✅ Backend already running')
        resolve(true)
        return
      }

      // Backend not running, start it
      console.log('🚀 Starting backend...')
      
      // Look for backend executable or Python script
      const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..')
      const appPath = app.getAppPath()
      
      // Possible locations for bundled backend executable
      const bundledPaths = [
        // Production: resources/backend/
        path.join(resourcesPath, 'backend', 'wingman-backend'),
        path.join(resourcesPath, 'backend', 'wingman-backend.app', 'Contents', 'MacOS', 'wingman-backend'),
        // Development: ../../backend/dist/
        path.join(appPath, '..', '..', 'backend', 'dist', 'wingman-backend'),
        path.join(appPath, '..', 'backend', 'dist', 'wingman-backend'),
      ]
      
      // Check for bundled executable first (for non-technical users)
      let executablePath: string | null = null
      for (const p of bundledPaths) {
        if (fs.existsSync(p)) {
          executablePath = p
          console.log(`Found bundled backend at: ${p}`)
          break
        }
      }
      
      if (executablePath) {
        // Launch bundled executable
        console.log('🔧 Starting bundled backend executable...')
        
        // Create .env file in temp location if needed
        const envPath = path.join(path.dirname(executablePath), '.env')
        if (!fs.existsSync(envPath)) {
          const envExample = path.join(path.dirname(executablePath), '.env.example')
          if (fs.existsSync(envExample)) {
            fs.copyFileSync(envExample, envPath)
          }
        }
        
        backendProcess = spawn(executablePath, [], {
          cwd: path.dirname(executablePath),
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        })
      } else {
        // Fallback: Try Python (for developers)
        console.log('⚠️ No bundled backend found, trying Python...')
        
        const backendPath = path.join(appPath, '..', 'backend')
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
        
        // Try to find venv python first
        const venvPython = path.join(backendPath, 'venv', 'bin', 'python')
        const venvPythonWin = path.join(backendPath, 'venv', 'Scripts', 'python.exe')
        
        let pythonExecutable = pythonPath
        if (fs.existsSync(venvPython)) {
          pythonExecutable = venvPython
        } else if (fs.existsSync(venvPythonWin)) {
          pythonExecutable = venvPythonWin
        }

        backendProcess = spawn(pythonExecutable, ['main.py'], {
          cwd: backendPath,
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
          stdio: ['pipe', 'pipe', 'pipe']
        })
      }

      backendProcess.stdout?.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`)
      })

      backendProcess.stderr?.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`)
      })

      backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err)
        resolve(false)
      })

      backendProcess.on('exit', (code) => {
        console.log(`Backend exited with code ${code}`)
        backendProcess = null
      })

      // Wait for backend to be ready
      waitForBackend(30).then((ready) => {
        if (ready) {
          console.log('✅ Backend is ready')
        } else {
          console.error('❌ Backend failed to start')
        }
        resolve(ready)
      })
    })
  })
}

function checkBackendHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}${BACKEND_HEALTH_ENDPOINT}`, (res) => {
      resolve(res.statusCode === 200)
    })
    
    req.on('error', () => {
      resolve(false)
    })
    
    req.setTimeout(2000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForBackend(maxAttempts: number): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await checkBackendHealth()
    if (healthy) return true
    
    // Wait 1 second between attempts
    await new Promise(r => setTimeout(r, 1000))
  }
  return false
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('Stopping backend...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Start backend first (in production)
  if (process.env.NODE_ENV !== 'development') {
    await startBackend()
  }
  
  createWindow()
  createTray()
  registerGlobalShortcuts()
  setupIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopBackend()
})

// Handle certificate errors (for development)
app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  if (url.startsWith('https://localhost')) {
    event.preventDefault()
    callback(true)
  } else {
    callback(false)
  }
})

