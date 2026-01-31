import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomBytes } from "crypto"

// POST /api/forms/upload - Handle file uploads
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        // File uploads can be from any user filling a form

        const formData = await request.formData()
        const file = formData.get("file") as File | null
        const formId = formData.get("formId") as string | null

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        if (!formId) {
            return NextResponse.json({ error: "formId is required" }, { status: 400 })
        }

        // Validate file size (max 1GB)
        const maxSize = 1024 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large (max 1GB)" }, { status: 400 })
        }

        // Generate unique filename
        const ext = path.extname(file.name) || ""
        const uniqueId = randomBytes(16).toString("hex")
        const filename = `${uniqueId}${ext}`

        // Create uploads directory in data folder (persists across deploys)
        // Use DATA_DIR env var on VPS, or fallback to local data folder for dev
        const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data")
        const uploadsDir = path.join(dataDir, "uploads", "forms", formId)
        await mkdir(uploadsDir, { recursive: true })

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer())
        const filePath = path.join(uploadsDir, filename)
        await writeFile(filePath, buffer)

        // Return API URL for download (not public folder)
        const fileUrl = `/api/forms/download?formId=${formId}&file=${filename}`

        return NextResponse.json({
            url: fileUrl,
            filename: file.name,
            size: file.size,
            type: file.type
        })
    } catch (error) {
        console.error("[UPLOAD]", error)
        return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }
}
