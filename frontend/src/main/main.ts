/**
 * Wingman AI - Electron Main Process
 * Handles window management, system tray, and global hotkeys
 */

import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage } from 'electron'
import path from 'path'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
// eslint-disable-next-line @typescript-eslint/no-var-requires
try {
  if (require('electron-squirrel-startup')) {
    app.quit()
  }
} catch {
  // electron-squirrel-startup not available
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Window configuration
const WINDOW_CONFIG = {
  nano: { width: 60, height: 40 },
  mini: { width: 140, height: 44 },
  normal: { width: 420, height: 64 },
  expanded: { width: 600, height: 400 },
  fullscreen: { width: 900, height: 600 }
}

function createWindow(): void {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.normal.width,
    height: WINDOW_CONFIG.normal.height,
    x: Math.floor(screenWidth / 2 - WINDOW_CONFIG.normal.width / 2),
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    vibrancy: 'ultra-dark',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  // Make window click-through when not focused (for screen share protection)
  mainWindow.setIgnoreMouseEvents(false)

  // Set window level to be above screen recording (macOS)
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false)
    // Set window to be excluded from screen capture
    mainWindow.setContentProtection(true)
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
  let trayIcon: nativeImage
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

function registerGlobalShortcuts(): void {
  // Toggle visibility
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })

  // Command palette
  globalShortcut.register('CommandOrControl+Space', () => {
    mainWindow?.show()
    mainWindow?.focus()
    mainWindow?.webContents.send('open-command-palette')
  })

  // Toggle pause
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    mainWindow?.webContents.send('toggle-pause')
  })

  // Capture screen
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow?.webContents.send('capture-screen')
  })

  // Emergency hide (kill switch)
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    mainWindow?.hide()
    mainWindow?.webContents.send('emergency-hide')
  })
}

function setupIPC(): void {
  // Window size changes
  ipcMain.handle('resize-window', (_, state: keyof typeof WINDOW_CONFIG) => {
    if (mainWindow && WINDOW_CONFIG[state]) {
      const { width, height } = WINDOW_CONFIG[state]
      const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
      
      // Keep centered horizontally
      const newX = Math.floor(screenWidth / 2 - width / 2)
      
      mainWindow.setBounds({
        x: newX,
        y: 20,
        width,
        height
      }, true) // Animate
    }
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
    mainWindow?.setAlwaysOnTop(flag)
  })

  // Set click-through
  ipcMain.handle('set-ignore-mouse', (_, ignore: boolean) => {
    mainWindow?.setIgnoreMouseEvents(ignore, { forward: true })
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
}

// App lifecycle
app.whenReady().then(() => {
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
})

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://localhost')) {
    event.preventDefault()
    callback(true)
  } else {
    callback(false)
  }
})

