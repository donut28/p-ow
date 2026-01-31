import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"

// GET /api/forms/download - Serve uploaded files
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const formId = searchParams.get("formId")
        const filename = searchParams.get("file")

        if (!formId || !filename) {
            return NextResponse.json({ error: "Missing formId or file" }, { status: 400 })
        }

        // Sanitize inputs to prevent directory traversal
        const safeFormId = formId.replace(/[^a-zA-Z0-9_-]/g, "")
        const safeFilename = path.basename(filename)

        // Use DATA_DIR env var on VPS, or fallback to local data folder for dev
        const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data")
        const filePath = path.join(dataDir, "uploads", "forms", safeFormId, safeFilename)

        // Check file exists
        try {
            await stat(filePath)
        } catch {
            return NextResponse.json({ error: "File not found" }, { status: 404 })
        }

        // Read and serve file
        const buffer = await readFile(filePath)

        // Determine content type from extension
        const ext = path.extname(safeFilename).toLowerCase()
        const contentTypes: Record<string, string> = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".zip": "application/zip",
            ".txt": "text/plain",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
        }

        const contentType = contentTypes[ext] || "application/octet-stream"

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${safeFilename}"`,
                "Content-Length": buffer.length.toString(),
            }
        })
    } catch (error) {
        console.error("[DOWNLOAD]", error)
        return NextResponse.json({ error: "Download failed" }, { status: 500 })
    }
}
