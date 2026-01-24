import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Screen capture
    captureScreen: () => ipcRenderer.invoke('capture-screen'),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSettings: (settings: { hotkey?: string; overlayOpacity?: number }) =>
        ipcRenderer.invoke('set-settings', settings),

    // Auth
    storeAuthToken: (token: string) => ipcRenderer.invoke('store-auth-token', token),
    getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
    clearAuthToken: () => ipcRenderer.invoke('clear-auth-token'),

    // Listen for capture trigger from main process
    onTriggerCapture: (callback: () => void) => {
        ipcRenderer.on('trigger-capture', callback)
        return () => ipcRenderer.removeListener('trigger-capture', callback)
    }
})

// Type definitions for renderer
export interface ElectronAPI {
    captureScreen: () => Promise<string | null>
    getSettings: () => Promise<{ hotkey: string; overlayOpacity: number }>
    setSettings: (settings: { hotkey?: string; overlayOpacity?: number }) => Promise<boolean>
    storeAuthToken: (token: string) => Promise<boolean>
    getAuthToken: () => Promise<string | null>
    clearAuthToken: () => Promise<boolean>
    onTriggerCapture: (callback: () => void) => () => void
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
