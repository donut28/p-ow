
"use client"

import { useState } from "react"
import { Save, Loader2, RefreshCw } from "lucide-react"
import { RoleCombobox } from "@/components/admin/role-combobox"
import { ChannelCombobox } from "@/components/admin/channel-combobox"

interface ServerSettingsFormProps {
    serverId: string
    currentName: string
    currentBanner: string | null
    currentOnDutyRoleId: string | null
    currentDiscordGuildId: string | null
    currentAutoSyncRoles: boolean
    currentSuspendedRoleId: string | null
    currentTerminatedRoleId: string | null
    currentStaffRoleId: string | null
    currentPermLogChannelId: string | null
    currentStaffRequestChannelId: string | null
    currentRaidAlertChannelId: string | null
    currentCommandLogChannelId: string | null
}

export function ServerSettingsForm({
    serverId,
    currentName,
    currentBanner,
    currentOnDutyRoleId,
    currentDiscordGuildId,
    currentAutoSyncRoles,
    currentSuspendedRoleId,
    currentTerminatedRoleId,
    currentStaffRoleId,
    currentPermLogChannelId,
    currentStaffRequestChannelId,
    currentRaidAlertChannelId,
    currentCommandLogChannelId
}: ServerSettingsFormProps) {
    const [name, setName] = useState(currentName)
    const [bannerUrl, setBannerUrl] = useState(currentBanner || "")
    const [onDutyRoleId, setOnDutyRoleId] = useState(currentOnDutyRoleId || "")
    const [discordGuildId, setDiscordGuildId] = useState(currentDiscordGuildId || "")
    const [autoSyncRoles, setAutoSyncRoles] = useState(currentAutoSyncRoles)
    const [suspendedRoleId, setSuspendedRoleId] = useState(currentSuspendedRoleId || "")
    const [terminatedRoleId, setTerminatedRoleId] = useState(currentTerminatedRoleId || "")
    const [staffRoleId, setStaffRoleId] = useState(currentStaffRoleId || "")
    const [permLogChannelId, setPermLogChannelId] = useState(currentPermLogChannelId || "")
    const [staffRequestChannelId, setStaffRequestChannelId] = useState(currentStaffRequestChannelId || "")
    const [raidAlertChannelId, setRaidAlertChannelId] = useState(currentRaidAlertChannelId || "")
    const [commandLogChannelId, setCommandLogChannelId] = useState(currentCommandLogChannelId || "")
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState("")

    const handleSave = async () => {
        setSaving(true)
        setMessage("")

        try {
            const res = await fetch("/api/admin/server", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serverId,
                    customName: name,
                    bannerUrl: bannerUrl || null,
                    onDutyRoleId: onDutyRoleId || null,
                    discordGuildId: discordGuildId || null,
                    autoSyncRoles,
                    suspendedRoleId: suspendedRoleId || null,
                    terminatedRoleId: terminatedRoleId || null,
                    staffRoleId: staffRoleId || null,
                    permLogChannelId: permLogChannelId || null,
                    staffRequestChannelId: staffRequestChannelId || null,
                    raidAlertChannelId: raidAlertChannelId || null,
                    commandLogChannelId: commandLogChannelId || null
                })
            })

            if (res.ok) {
                setMessage("Settings saved!")
            } else {
                setMessage("Failed to save settings")
            }
        } catch (e: any) {
            setMessage("Error saving settings")
        } finally {
            setSaving(false)
            setTimeout(() => setMessage(""), 3000)
        }
    }

    return (
        <div className="space-y-6">
            {/* Server Name */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Display Name
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Server name..."
                />
                <p className="text-xs text-zinc-600 mt-1">This name will be displayed on the dashboard</p>
            </div>

            {/* Banner URL */}
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Banner Image URL
                </label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        className="flex-1 bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        placeholder="https://example.com/banner.png"
                    />
                </div>
                <p className="text-xs text-zinc-600 mt-1">Paste an image URL for the server banner. Recommended resolution: 1200x320</p>

                {/* Banner Preview */}
                {bannerUrl && (
                    <div className="mt-4">
                        <p className="text-xs text-zinc-500 mb-2">Preview:</p>
                        <div className="h-32 rounded-lg overflow-hidden bg-[#222] border border-[#333]">
                            <img
                                src={bannerUrl}
                                alt="Banner preview"
                                className="w-full h-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                    e.currentTarget.src = ""
                                    e.currentTarget.alt = "Invalid image URL"
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Discord Integration Section */}
            <div className="border-t border-[#333] pt-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-indigo-400" />
                    Discord Integration
                </h3>

                {/* Discord Guild ID */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Discord Server ID (Guild ID)
                    </label>
                    <input
                        type="text"
                        value={discordGuildId}
                        onChange={(e) => setDiscordGuildId(e.target.value)}
                        className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        placeholder="123456789012345678"
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                        Right-click your Discord server → Copy Server ID. Required for role sync.
                    </p>
                </div>

                {/* Perm Log Channel */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-blue-400 mb-2">
                        Permission Log Channel
                    </label>
                    <ChannelCombobox
                        serverId={serverId}
                        value={permLogChannelId}
                        onChange={(val) => setPermLogChannelId(val || "")}
                        placeholder="Select Permission Log channel..."
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                        Channel where "Perm Logs" from the toolbox will be sent.
                    </p>
                </div>

                {/* Command Log Channel */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-emerald-400 mb-2">
                        Command Log Channel
                    </label>
                    <ChannelCombobox
                        serverId={serverId}
                        value={commandLogChannelId}
                        onChange={(val) => setCommandLogChannelId(val || "")}
                        placeholder="Select Command Log channel..."
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                        Manual commands run via the toolbox will be logged here.
                    </p>
                </div>

                {/* Staff Request Channel */}
                <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-amber-400 mb-2">
                        Staff Request Channel
                    </label>
                    <ChannelCombobox
                        serverId={serverId}
                        value={staffRequestChannelId}
                        onChange={(val) => setStaffRequestChannelId(val || "")}
                        placeholder="Select Staff Request channel..."
                    />
                    <p className="text-xs text-amber-400/70 mt-1">
                        Channel where staff request alerts will be sent (pings Staff Role).
                    </p>
                </div>

                {/* Raid Alert Channel */}
                <div className="mb-4 p-4 bg-red-500/5 border border-red-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-red-400 mb-2">
                        Raid Alert Channel
                    </label>
                    <ChannelCombobox
                        serverId={serverId}
                        value={raidAlertChannelId}
                        onChange={(val) => setRaidAlertChannelId(val || "")}
                        placeholder="Select Raid Alert channel..."
                    />
                    <p className="text-xs text-red-400/70 mt-1">
                        Channel where raid notifications and mitigation prompts will be sent.
                    </p>
                </div>

                {/* On Duty Role ID */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                        On-Duty Role ID
                    </label>
                    <RoleCombobox
                        serverId={serverId}
                        value={onDutyRoleId}
                        onChange={(val) => setOnDutyRoleId(val || "")}
                        placeholder="Select On-Duty role..."
                    />
                    <p className="text-xs text-zinc-600 mt-1">
                        Staff will receive this Discord role when they start a shift.
                    </p>
                </div>

                {/* Staff Role ID */}
                <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-emerald-400 mb-2">
                        Staff Role ID (Viewer Access)
                    </label>
                    <RoleCombobox
                        serverId={serverId}
                        value={staffRoleId}
                        onChange={(val) => setStaffRoleId(val || "")}
                        placeholder="Select Staff/Viewer role..."
                    />
                    <p className="text-xs text-emerald-400/70 mt-1">
                        Users with this Discord role get viewer access (can see logs/punishments but can't take actions).
                    </p>
                </div>

                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-[#222] border border-[#333] rounded-lg">
                    <div>
                        <p className="text-white font-medium">Auto Role Sync</p>
                        <p className="text-xs text-zinc-500">Automatically sync panel roles to Discord every 10 seconds</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAutoSyncRoles(!autoSyncRoles)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSyncRoles ? 'bg-indigo-500' : 'bg-zinc-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSyncRoles ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Suspended Role ID */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-orange-400 mb-2">
                        Suspended Role ID
                    </label>
                    <RoleCombobox
                        serverId={serverId}
                        value={suspendedRoleId}
                        onChange={(val) => setSuspendedRoleId(val || "")}
                        placeholder="Select Suspended role..."
                    />
                    <p className="text-xs text-orange-400/70 mt-1">
                        Users with this Discord role will be blocked from the mod panel entirely.
                    </p>
                </div>

                {/* Terminated Role ID */}
                <div className="mb-4 p-4 bg-red-500/5 border border-red-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-red-400 mb-2">
                        ⚠️ Terminated Role ID
                    </label>
                    <RoleCombobox
                        serverId={serverId}
                        value={terminatedRoleId}
                        onChange={(val) => setTerminatedRoleId(val || "")}
                        placeholder="Select Terminated role..."
                    />
                    <p className="text-xs text-red-400/70 mt-1">
                        <strong>DANGER:</strong> Users with this Discord role will have their account PERMANENTLY DELETED.
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Save Changes
                </button>
                {message && (
                    <span className={`text-sm ${message.includes("saved") ? "text-emerald-400" : "text-red-400"}`}>
                        {message}
                    </span>
                )}
            </div>
        </div>
    )
}
