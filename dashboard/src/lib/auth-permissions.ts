
import { SessionUser, getUserPermissions, RolePermissions } from "@/lib/admin"
import { NextResponse } from "next/server"
import { redirect } from "next/navigation"

/**
 * Checks if a user has a specific permission on a server server-side.
 */
export async function checkPermission(
    user: SessionUser | null,
    serverId: string,
    permission: keyof RolePermissions
): Promise<boolean> {
    if (!user) return false
    const permissions = await getUserPermissions(user, serverId)
    return permissions[permission]
}

/**
 * Verifies a permission and returns a 403 NextResponse if missing.
 * Use this in API routes.
 */
export async function verifyPermissionOrError(
    user: SessionUser | null,
    serverId: string,
    permission: keyof RolePermissions
): Promise<NextResponse | null> {
    const hasAccess = await checkPermission(user, serverId, permission)
    if (!hasAccess) {
        return new NextResponse("Forbidden: Missing Permission " + permission, { status: 403 })
    }
    return null // Access granted
}

/**
 * Verifies a permission and redirects if missing.
 * Use this in Server Components (Pages/Layouts).
 */
export async function verifyPermissionOrRedirect(
    user: SessionUser | null,
    serverId: string,
    permission: keyof RolePermissions,
    redirectPath: string = `/dashboard/${serverId}/mod-panel`
) {
    const hasAccess = await checkPermission(user, serverId, permission)
    if (!hasAccess) {
        redirect(redirectPath)
    }
}
