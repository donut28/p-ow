import { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen } from 'electron'
import * as path from 'path'
import Store from 'electron-store'

// Store schema type
interface StoreSchema {
    hotkey: string
    overlayOpacity: number
    panelPosition: { x: number; y: number }
    authToken: string | null
}

// Secure store for settings
const store = new Store<StoreSchema>({
    defaults: {
        hotkey: 'Alt+V',
        overlayOpacity: 0.95,
        panelPosition: { x: 100, y: 100 },
        authToken: null
    }
})

let overlayWindow: BrowserWindow | null = null
let isOverlayVisible = false
let isQuitting = false

function createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    overlayWindow = new BrowserWindow({
        width: 380,
        height: 500,
        x: store.get('panelPosition.x') as number || 100,
        y: store.get('panelPosition.y') as number || 100,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: false, // Show in taskbar for easy access
        resizable: false,
        hasShadow: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    // Keep on top of fullscreen apps (works for borderless fullscreen)
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        overlayWindow.loadURL('http://localhost:5173')
        overlayWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
        overlayWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Save position when moved
    overlayWindow.on('moved', () => {
        const [x, y] = overlayWindow!.getPosition()
        store.set('panelPosition', { x, y })
    })

    // Hide instead of close
    overlayWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault()
            overlayWindow?.hide()
            isOverlayVisible = false
        }
    })
}

function registerHotkey() {
    const hotkey = store.get('hotkey') as string

    // Unregister all first
    globalShortcut.unregisterAll()

    // Register the capture hotkey
    const registered = globalShortcut.register(hotkey, async () => {
        if (!overlayWindow) return

        // Show overlay if hidden
        if (!isOverlayVisible) {
            overlayWindow.show()
            isOverlayVisible = true
        }

        // Trigger OCR capture
        overlayWindow.webContents.send('trigger-capture')
    })

    if (!registered) {
        console.error(`Failed to register hotkey: ${hotkey}`)
    }

    // Toggle visibility hotkey
    globalShortcut.register('Alt+Shift+V', () => {
        if (overlayWindow) {
            if (isOverlayVisible) {
                overlayWindow.hide()
                isOverlayVisible = false
            } else {
                overlayWindow.show()
                isOverlayVisible = true
            }
        }
    })
}

// Screen capture for OCR
ipcMain.handle('capture-screen', async () => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        })

        if (sources.length > 0) {
            // Return the primary display screenshot as base64
            const thumbnail = sources[0].thumbnail
            return thumbnail.toDataURL()
        }
        return null
    } catch (error) {
        console.error('Screen capture error:', error)
        return null
    }
})

// Get/Set settings
ipcMain.handle('get-settings', () => {
    return {
        hotkey: store.get('hotkey'),
        overlayOpacity: store.get('overlayOpacity')
    }
})

ipcMain.handle('set-settings', (_event, settings: { hotkey?: string; overlayOpacity?: number }) => {
    if (settings.hotkey) {
        store.set('hotkey', settings.hotkey)
        registerHotkey() // Re-register with new hotkey
    }
    if (settings.overlayOpacity !== undefined) {
        store.set('overlayOpacity', settings.overlayOpacity)
    }
    return true
})

// Auth token storage (using Electron's safe storage)
ipcMain.handle('store-auth-token', (_event, token: string) => {
    store.set('authToken', token)
    return true
})

ipcMain.handle('get-auth-token', () => {
    return store.get('authToken') || null
})

ipcMain.handle('clear-auth-token', () => {
    store.delete('authToken')
    return true
})

// App lifecycle
app.whenReady().then(() => {
    createOverlayWindow()
    registerHotkey()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createOverlayWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (overlayWindow) {
            overlayWindow.show()
            overlayWindow.focus()
        }
    })
}

// Mark app as quitting
app.on('before-quit', () => {
    isQuitting = true
})
