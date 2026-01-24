/// <reference types="vite/client" />

interface ElectronAPI {
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

export { }
