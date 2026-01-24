import { useState } from 'react'

interface LoginScreenProps {
    onLoginSuccess: () => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async () => {
        setIsLoading(true)

        // TODO: Open browser to dashboard auth page
        // For now, simulate OAuth flow
        // In production: window.open('https://your-dashboard.com/vision-auth', '_blank')

        // This would be replaced with actual OAuth callback handling
        // The dashboard would redirect to pow-vision://callback?token=xxx
        // which the app registers as a custom protocol handler

        // Temporary mock for development
        setTimeout(async () => {
            await window.electronAPI.storeAuthToken('mock-token-for-dev')
            onLoginSuccess()
        }, 1500)
    }

    return (
        <div className="w-full h-screen bg-pow-bg/95 rounded-2xl border border-pow-border overflow-hidden flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
                <span className="text-white text-2xl font-bold">P</span>
            </div>

            <h1 className="text-white text-xl font-bold mb-2">POW Vision</h1>
            <p className="text-white/50 text-sm text-center mb-8">
                Connect your POW account to get started
            </p>

            <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full max-w-xs bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <LockIcon />
                        Login with POW
                    </>
                )}
            </button>

            <p className="text-white/30 text-xs mt-4 text-center">
                You'll be redirected to sign in via the POW dashboard
            </p>
        </div>
    )
}

function LockIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    )
}
