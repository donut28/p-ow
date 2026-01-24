import { useState, useEffect } from 'react'

interface SettingsProps {
    onBack: () => void
    onLogout: () => void
}

export function Settings({ onBack, onLogout }: SettingsProps) {
    const [hotkey, setHotkey] = useState('Alt+V')
    const [opacity, setOpacity] = useState(95)
    const [isRecording, setIsRecording] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await window.electronAPI.getSettings()
            setHotkey(settings.hotkey)
            setOpacity(Math.round(settings.overlayOpacity * 100))
        }
        loadSettings()
    }, [])

    const handleHotkeyRecord = () => {
        setIsRecording(true)

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault()
            const parts: string[] = []
            if (e.ctrlKey) parts.push('Control')
            if (e.altKey) parts.push('Alt')
            if (e.shiftKey) parts.push('Shift')
            if (e.metaKey) parts.push('Meta')

            const key = e.key
            if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
                parts.push(key.toUpperCase())
            }

            if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(parts[parts.length - 1])) {
                setHotkey(parts.join('+'))
                setIsRecording(false)
                document.removeEventListener('keydown', handleKeyDown)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
    }

    const handleSave = async () => {
        await window.electronAPI.setSettings({
            hotkey,
            overlayOpacity: opacity / 100
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="p-4 h-full flex flex-col">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-white/60 hover:text-white mb-4 text-sm"
            >
                <BackIcon />
                Back
            </button>

            <div className="space-y-4 flex-1">
                {/* Hotkey Setting */}
                <div>
                    <label className="block text-white/40 text-xs uppercase font-bold mb-2">Scan Hotkey</label>
                    <button
                        onClick={handleHotkeyRecord}
                        className={`w-full bg-pow-card border rounded-lg px-4 py-3 text-left transition-colors ${isRecording ? 'border-indigo-500 text-indigo-400' : 'border-pow-border text-white'
                            }`}
                    >
                        {isRecording ? 'Press key combination...' : hotkey}
                    </button>
                    <p className="text-white/30 text-xs mt-1">Click to change, then press your desired key combination</p>
                </div>

                {/* Opacity Setting */}
                <div>
                    <label className="block text-white/40 text-xs uppercase font-bold mb-2">Overlay Opacity: {opacity}%</label>
                    <input
                        type="range"
                        min="50"
                        max="100"
                        value={opacity}
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="w-full accent-indigo-500"
                    />
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                >
                    {saved ? '✓ Saved!' : 'Save Settings'}
                </button>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-pow-border">
                <button
                    onClick={onLogout}
                    className="w-full py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition-colors"
                >
                    Log Out
                </button>
            </div>
        </div>
    )
}

function BackIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    )
}
