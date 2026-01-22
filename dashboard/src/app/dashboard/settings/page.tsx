import { getSession } from "@/lib/auth-clerk"
import { isSuperAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import SettingsContent from "./settings-content"
import { ApiKeysManager } from "./api-keys-manager"

export default async function SettingsPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const adminStatus = isSuperAdmin(session.user as any)

    return (
        <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
            <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-3xl font-bold">Dashboard Settings</h1>
                <p className="text-zinc-400 mt-2">Manage your connected ERLC servers</p>
            </div>

            <SettingsContent isSuperAdmin={adminStatus} />

            <ApiKeysManager isSuperAdmin={adminStatus} />
        </div>
    )
}
