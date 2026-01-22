"use client"

import { Trash2 } from "lucide-react"
import { revokeInvitation } from "./actions"
import { useTransition, useState } from "react"
import { ConfirmModal } from "@/components/ui/confirm-modal"

export function RevokeButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition()
    const [showConfirm, setShowConfirm] = useState(false)

    const handleRevoke = () => {
        setShowConfirm(false)
        startTransition(async () => {
            await revokeInvitation(id)
        })
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isPending}
                className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                title="Revoke Invitation"
            >
                <Trash2 className="h-4 w-4" />
            </button>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleRevoke}
                title="Revoke Invitation"
                description="Are you sure you want to revoke this invitation? This person will no longer be able to use this link to join the server."
                confirmLabel="Revoke Invitation"
                isLoading={isPending}
            />
        </>
    )
}
