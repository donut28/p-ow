
"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Loader2, Wrench, X, CheckCircle2, Sparkles } from "lucide-react"

interface ToolCall {
    tool: string
    args: Record<string, any>
}

interface GarminMessage {
    id: string
    type: "user" | "garmin"
    text: string
    tool_calls?: ToolCall[]
    duration_ms?: number
    punishments_logged?: string[]
    error?: boolean
    timestamp: Date
}

// Tool icons
const TOOL_ICONS: Record<string, string> = {
    "ban_player": "🔨",
    "kick_player": "👢",
    "kill_player": "💀",
    "tp_player": "🌀",
    "send_pm": "💬",
    "get_server_stats": "📊",
    "list_online_players": "👥",
    "check_if_online": "🔍",
    "get_player_info": "ℹ️",
    "search_command_logs": "📜",
    "analyze_player_activity": "📈",
    "lookup_roblox_profile": "🎮",
    "bring_all_staff": "📢",
    "pm_all_staff": "📣",
    "mod_player": "⭐",
    "unmod_player": "⬇️",
    "admin_player": "👑",
    "unadmin_player": "⬇️",
    "check_whitelist_status": "📋",
    "check_player_perks": "💎",
    "check_if_staff": "🛡️",
}

// Simple markdown renderer
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeContent: string[] = []
    let codeLanguage = ''

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Code blocks
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true
                codeLanguage = line.slice(3).trim()
                codeContent = []
            } else {
                elements.push(
                    <pre key={`code-${i}`} className="bg-black/40 rounded-lg p-3 my-2 overflow-x-auto text-xs">
                        <code className="text-emerald-300">{codeContent.join('\n')}</code>
                    </pre>
                )
                inCodeBlock = false
            }
            continue
        }

        if (inCodeBlock) {
            codeContent.push(line)
            continue
        }

        // Headers
        if (line.startsWith('### ')) {
            elements.push(<h4 key={i} className="font-bold text-white mt-3 mb-1 text-sm">{line.slice(4)}</h4>)
            continue
        }
        if (line.startsWith('## ')) {
            elements.push(<h3 key={i} className="font-bold text-white mt-3 mb-1">{line.slice(3)}</h3>)
            continue
        }
        if (line.startsWith('# ')) {
            elements.push(<h2 key={i} className="font-bold text-white text-lg mt-3 mb-1">{line.slice(2)}</h2>)
            continue
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
            elements.push(
                <div key={i} className="flex gap-2 ml-2">
                    <span className="text-zinc-500">•</span>
                    <span>{renderInlineMarkdown(line.slice(2))}</span>
                </div>
            )
            continue
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)/)
        if (numberedMatch) {
            elements.push(
                <div key={i} className="flex gap-2 ml-2">
                    <span className="text-zinc-500">{numberedMatch[1]}.</span>
                    <span>{renderInlineMarkdown(numberedMatch[2])}</span>
                </div>
            )
            continue
        }

        // Empty lines
        if (line.trim() === '') {
            elements.push(<div key={i} className="h-2" />)
            continue
        }

        // Regular paragraph
        elements.push(<p key={i} className="my-0.5">{renderInlineMarkdown(line)}</p>)
    }

    return elements
}

// Render inline markdown (bold, italic, code, links)
function renderInlineMarkdown(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
        // Bold **text**
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
        // Italic *text*
        const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
        // Inline code `code`
        const codeMatch = remaining.match(/`([^`]+)`/)
        // Links [text](url)
        const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)

        // Find the earliest match
        const matches: { match: RegExpMatchArray, type: string }[] = []
        if (boldMatch) matches.push({ match: boldMatch, type: 'bold' })
        if (italicMatch) matches.push({ match: italicMatch, type: 'italic' })
        if (codeMatch) matches.push({ match: codeMatch, type: 'code' })
        if (linkMatch) matches.push({ match: linkMatch, type: 'link' })

        if (matches.length === 0) {
            parts.push(remaining)
            break
        }

        // Sort by index
        matches.sort((a, b) => (a.match.index || 0) - (b.match.index || 0))
        const earliest = matches[0]
        const idx = earliest.match.index || 0

        // Add text before match
        if (idx > 0) {
            parts.push(remaining.slice(0, idx))
        }

        // Add formatted element
        if (earliest.type === 'bold') {
            parts.push(<strong key={key++} className="font-bold text-white">{earliest.match[1]}</strong>)
            remaining = remaining.slice(idx + earliest.match[0].length)
        } else if (earliest.type === 'italic') {
            parts.push(<em key={key++} className="italic">{earliest.match[1]}</em>)
            remaining = remaining.slice(idx + earliest.match[0].length)
        } else if (earliest.type === 'code') {
            parts.push(<code key={key++} className="bg-black/40 px-1.5 py-0.5 rounded text-xs text-emerald-300 font-mono">{earliest.match[1]}</code>)
            remaining = remaining.slice(idx + earliest.match[0].length)
        } else if (earliest.type === 'link') {
            parts.push(
                <a key={key++} href={earliest.match[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    {earliest.match[1]}
                </a>
            )
            remaining = remaining.slice(idx + earliest.match[0].length)
        }
    }

    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>
}

export function GarminPanel({ serverId, isOpen, onClose }: { serverId: string, isOpen: boolean, onClose: () => void }) {
    const [messages, setMessages] = useState<GarminMessage[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
        }
    }, [isOpen])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage: GarminMessage = {
            id: crypto.randomUUID(),
            type: "user",
            text: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch("/api/garmin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: input.trim(), serverId })
            })

            const data = await res.json()

            const garminMessage: GarminMessage = {
                id: crypto.randomUUID(),
                type: "garmin",
                text: data.success ? data.response : data.error || "Something went wrong",
                tool_calls: data.tool_calls,
                duration_ms: data.duration_ms,
                punishments_logged: data.punishments_logged,
                error: !data.success,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, garminMessage])

        } catch (e) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                type: "garmin",
                text: "Failed to connect to Garmin. Please try again.",
                error: true,
                timestamp: new Date()
            }])
        } finally {
            setLoading(false)
        }
    }

    // Format tool calls as subtitle text
    const formatToolCalls = (tools: ToolCall[]) => {
        return tools.map(t => {
            const icon = TOOL_ICONS[t.tool] || "🔧"
            const args = Object.entries(t.args)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            return `${icon} ${t.tool}${args ? `(${args})` : ""}`
        }).join(" → ")
    }

    // Early return AFTER all hooks are declared
    if (!isOpen) return null

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                            Garmin AI
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                        </h3>
                        <p className="text-xs text-zinc-500">LACRP Server Assistant</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Ask Garmin anything about the server...</p>
                        <p className="text-xs mt-2 text-zinc-600">Try: "Who is online?" or "Ban player123 for RDM"</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%]`}>
                            {/* Tool calls subtitle - Above message with connecting line */}
                            {msg.type === "garmin" && msg.tool_calls && msg.tool_calls.length > 0 && (
                                <div className="mb-1 ml-3 flex items-start gap-2">
                                    <div className="flex flex-col items-center">
                                        <Wrench className="h-3 w-3 text-zinc-600" />
                                        <div className="w-px h-3 bg-zinc-700" />
                                    </div>
                                    <p className="text-[11px] text-zinc-600 font-mono leading-tight">
                                        {formatToolCalls(msg.tool_calls)}
                                    </p>
                                </div>
                            )}

                            {/* Message bubble */}
                            <div className={`rounded-2xl px-4 py-3 ${msg.type === "user"
                                ? "bg-indigo-500 text-white rounded-br-sm"
                                : msg.error
                                    ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm"
                                    : "bg-[#222] text-zinc-100 rounded-bl-sm"
                                }`}>
                                {msg.type === "garmin" && !msg.error && (
                                    <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
                                        <Bot className="h-3 w-3" />
                                        <span>Garmin</span>
                                        {msg.duration_ms && (
                                            <span className="text-zinc-600">• {(msg.duration_ms / 1000).toFixed(1)}s</span>
                                        )}
                                    </div>
                                )}

                                {/* Render with markdown for Garmin, plain for user */}
                                <div className="text-sm">
                                    {msg.type === "garmin" && !msg.error
                                        ? renderMarkdown(msg.text)
                                        : <p className="whitespace-pre-wrap">{msg.text}</p>
                                    }
                                </div>
                            </div>

                            {/* Punishments logged */}
                            {msg.punishments_logged && msg.punishments_logged.length > 0 && (
                                <div className="mt-2 ml-3 flex items-center gap-2 text-xs text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Logged: {msg.punishments_logged.join(", ")}</span>
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className={`text-[10px] text-zinc-600 mt-1 ${msg.type === "user" ? "text-right mr-1" : "text-left ml-3"}`}>
                                {msg.timestamp.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%]">
                            {/* Loading indicator with tool-style subtitle */}
                            <div className="mb-1 ml-3 flex items-start gap-2">
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />
                                    <div className="w-px h-3 bg-zinc-700" />
                                </div>
                                <p className="text-[11px] text-zinc-600 font-mono">processing...</p>
                            </div>
                            <div className="bg-[#222] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                                <span className="text-sm text-zinc-400">Garmin is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#2a2a2a] bg-[#1a1a1a] flex-shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage() }} className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Garmin anything..."
                        disabled={loading}
                        className="flex-1 bg-[#222] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                    Garmin can run server commands. Punishments are automatically logged.
                </p>
            </div>
        </div>
    )
}
