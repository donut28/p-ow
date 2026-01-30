import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"

// Helper to check form access
async function canViewResponses(userId: string, formId: string): Promise<boolean> {
    const form = await prisma.form.findUnique({
        where: { id: formId },
        select: { serverId: true }
    })
    if (!form) return false

    const isAdmin = await isServerAdmin({ id: userId } as any, form.serverId)
    if (isAdmin) return true

    const editorAccess = await prisma.formEditorAccess.findUnique({
        where: { formId_userId: { formId, userId } }
    })
    return !!editorAccess
}

// GET /api/forms/[formId]/responses - Get all responses
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { formId } = await params

        const canView = await canViewResponses(session.user.id, formId)
        if (!canView) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "50")
        const format = searchParams.get("format") // "json" or "csv"

        // Get form to check anonymity settings
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                sections: {
                    orderBy: { order: "asc" },
                    include: {
                        questions: { orderBy: { order: "asc" } }
                    }
                }
            }
        })

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 })
        }

        const responses = await prisma.formResponse.findMany({
            where: { formId },
            include: {
                answers: {
                    include: { question: true }
                }
            },
            orderBy: { submittedAt: "desc" },
            skip: (page - 1) * limit,
            take: limit
        })

        const total = await prisma.formResponse.count({ where: { formId } })

        // Format responses
        const formattedResponses = responses.map(r => ({
            id: r.id,
            submittedAt: r.submittedAt,
            respondent: form.isAnonymous ? null : {
                id: r.respondentId,
                email: r.respondentEmail
            },
            answers: r.answers.reduce((acc, a) => {
                let value
                try {
                    value = JSON.parse(a.value)
                } catch {
                    value = a.value
                }
                acc[a.questionId] = {
                    questionLabel: a.question.label,
                    value
                }
                return acc
            }, {} as Record<string, any>)
        }))

        // Export as CSV
        if (format === "csv") {
            const allQuestions = form.sections.flatMap(s => s.questions)
            const headers = [
                "Response ID",
                "Submitted At",
                ...(form.isAnonymous ? [] : ["Respondent ID", "Email"]),
                ...allQuestions.map(q => q.label)
            ]

            const rows = formattedResponses.map(r => {
                const row = [
                    r.id,
                    r.submittedAt.toISOString(),
                    ...(form.isAnonymous ? [] : [r.respondent?.id || "", r.respondent?.email || ""])
                ]
                for (const q of allQuestions) {
                    const answer = r.answers[q.id]
                    const value = answer?.value
                    row.push(typeof value === "object" ? JSON.stringify(value) : String(value ?? ""))
                }
                return row
            })

            const csv = [
                headers.join(","),
                ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            ].join("\n")

            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, "_")}_responses.csv"`
                }
            })
        }

        return NextResponse.json({
            responses: formattedResponses,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            form: {
                id: form.id,
                title: form.title,
                isAnonymous: form.isAnonymous
            }
        })
    } catch (error) {
        console.error("[RESPONSES GET]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
