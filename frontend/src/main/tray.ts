/**
 * Wingman AI - System Tray
 * System tray integration for quick access
 */

import { Tray, Menu, nativeImage, BrowserWindow, NativeImage } from 'electron'
import path from 'path'

let tray: Tray | null = null

interface TrayOptions {
  mainWindow: BrowserWindow
  onToggleVisibility: () => void
  onTogglePause: () => void
  onQuit: () => void
}

export function createTray(options: TrayOptions): Tray {
  const { mainWindow, onToggleVisibility, onTogglePause, onQuit } = options

  // Create tray icon
  // Use a template image for macOS (16x16 or 22x22)
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  
  // Create a simple icon programmatically if file doesn't exist
  let icon: NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = createDefaultIcon()
    }
  } catch {
    icon = createDefaultIcon()
  }

  // Make it a template image for macOS (automatic dark/light mode)
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  tray = new Tray(icon)
  tray.setToolTip('Wingman AI')

  // Create context menu
  const contextMenu = createContextMenu(options)
  tray.setContextMenu(contextMenu)

  // Click handlers
  tray.on('click', () => {
    onToggleVisibility()
  })

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })

  return tray
}

function createDefaultIcon(): NativeImage {
  // Create a simple 16x16 icon
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  
  // Draw a simple circle (wingman icon placeholder)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const cx = size / 2
      const cy = size / 2
      const r = size / 2 - 1
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      
      if (dist <= r) {
        // Inside circle - white color
        canvas[idx] = 255     // R
        canvas[idx + 1] = 255 // G
        canvas[idx + 2] = 255 // B
        canvas[idx + 3] = 255 // A
      } else {
        // Outside - transparent
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size
  })
}

function createContextMenu(options: TrayOptions): Menu {
  const { mainWindow, onToggleVisibility, onTogglePause, onQuit } = options

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Wingman AI',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show/Hide',
      accelerator: 'CmdOrCtrl+Shift+W',
      click: onToggleVisibility
    },
    {
      label: 'Pause/Resume',
      accelerator: 'CmdOrCtrl+Shift+P',
      click: onTogglePause
    },
    { type: 'separator' },
    {
      label: 'Modes',
      submenu: [
        {
          label: 'Interview',
          type: 'radio',
          checked: true,
          click: () => mainWindow.webContents.send('set-mode', 'interview')
        },
        {
          label: 'Study',
          type: 'radio',
          click: () => mainWindow.webContents.send('set-mode', 'study')
        },
        {
          label: 'Work',
          type: 'radio',
          click: () => mainWindow.webContents.send('set-mode', 'work')
        },
        {
          label: 'Meeting',
          type: 'radio',
          click: () => mainWindow.webContents.send('set-mode', 'meeting')
        },
        {
          label: 'Research',
          type: 'radio',
          click: () => mainWindow.webContents.send('set-mode', 'research')
        },
        {
          label: 'Practice',
          type: 'radio',
          click: () => mainWindow.webContents.send('set-mode', 'practice')
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quick Actions',
      submenu: [
        {
          label: 'Start Listening',
          click: () => mainWindow.webContents.send('start-audio')
        },
        {
          label: 'Capture Screen',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('capture-screen')
        },
        {
          label: 'Clear Context',
          click: () => mainWindow.webContents.send('clear-context')
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: 'CmdOrCtrl+,',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('open-settings')
      }
    },
    { type: 'separator' },
    {
      label: 'About Wingman AI',
      click: () => {
        const { dialog } = require('electron')
        dialog.showMessageBox({
          type: 'info',
          title: 'About Wingman AI',
          message: 'Wingman AI',
          detail: `Version: 1.0.0\n\nYour intelligent AI assistant for interviews, studying, and work.\n\n© 2024 Wingman AI`
        })
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: onQuit
    }
  ]

  return Menu.buildFromTemplate(template)
}

export function updateTrayMenu(options: TrayOptions): void {
  if (tray) {
    const contextMenu = createContextMenu(options)
    tray.setContextMenu(contextMenu)
  }
}

export function setTrayTitle(title: string): void {
  if (tray && process.platform === 'darwin') {
    tray.setTitle(title)
  }
}

export function setTrayTooltip(tooltip: string): void {
  if (tray) {
    tray.setToolTip(tooltip)
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function flashTray(): void {
  if (tray) {
    // Flash the tray icon to get attention
    let count = 0
    const flash = setInterval(() => {
      if (count >= 6) {
        clearInterval(flash)
        return
      }
      
      // Toggle icon opacity or color
      // This is platform-specific and may need adjustment
      count++
    }, 500)
  }
}

