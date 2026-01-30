import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"

// POST /api/forms/editor-access - Claim editor access via share link
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: "Login required to claim editor access" }, { status: 401 })
        }

        const body = await request.json()
        const { editorShareId } = body

        if (!editorShareId) {
            return NextResponse.json({ error: "editorShareId is required" }, { status: 400 })
        }

        // Find form by editor share ID
        const form = await prisma.form.findUnique({
            where: { editorShareId },
            select: { id: true, title: true, serverId: true }
        })

        if (!form) {
            return NextResponse.json({ error: "Invalid share link" }, { status: 404 })
        }

        // Check if already has access
        const existing = await prisma.formEditorAccess.findUnique({
            where: { formId_userId: { formId: form.id, userId: session.user.id } }
        })

        if (existing) {
            return NextResponse.json({
                message: "You already have editor access",
                formId: form.id,
                formTitle: form.title,
                serverId: form.serverId
            })
        }

        // Grant editor access
        await prisma.formEditorAccess.create({
            data: {
                formId: form.id,
                userId: session.user.id
            }
        })

        return NextResponse.json({
            message: "Editor access granted",
            formId: form.id,
            formTitle: form.title,
            serverId: form.serverId
        })
    } catch (error) {
        console.error("[EDITOR-ACCESS]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// GET /api/forms/editor-access - Check if user has editor access to a form
export async function GET(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const formId = searchParams.get("formId")

        if (!formId) {
            return NextResponse.json({ error: "formId is required" }, { status: 400 })
        }

        const access = await prisma.formEditorAccess.findUnique({
            where: { formId_userId: { formId, userId: session.user.id } }
        })

        return NextResponse.json({ hasAccess: !!access })
    } catch (error) {
        console.error("[EDITOR-ACCESS GET]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
