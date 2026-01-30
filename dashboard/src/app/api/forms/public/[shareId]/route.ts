import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth-clerk"

// GET /api/forms/public/[shareId] - Get form by public share ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ shareId: string }> }
) {
    try {
        const { shareId } = await params

        const form = await prisma.form.findUnique({
            where: { publicShareId: shareId },
            include: {
                sections: {
                    orderBy: { order: "asc" },
                    include: {
                        questions: {
                            orderBy: { order: "asc" }
                        }
                    }
                },
                _count: { select: { responses: true } },
                server: { select: { name: true, customName: true, bannerUrl: true } }
            }
        })

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 })
        }

        // Check if form is accepting responses
        if (form.status !== "published") {
            return NextResponse.json({ error: "Form is not accepting responses" }, { status: 403 })
        }

        // Check expiration
        if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
            return NextResponse.json({ error: "Form has expired" }, { status: 403 })
        }

        // Check max responses
        if (form.maxResponses && form._count.responses >= form.maxResponses) {
            return NextResponse.json({ error: "Form has reached maximum responses" }, { status: 403 })
        }

        // Check if user has already submitted (if not allowing multiple) or has a draft
        let hasSubmitted = false
        let draftAnswers: Record<string, any> | null = null

        const session = await getSession()
        if (session) {
            // Check for completed submissions
            if (!form.allowMultiple) {
                const existing = await prisma.formResponse.findFirst({
                    where: {
                        formId: form.id,
                        respondentId: session.user.id,
                        status: "completed"
                    }
                })
                hasSubmitted = !!existing
            }

            // Check for draft
            const draft = await prisma.formResponse.findFirst({
                where: {
                    formId: form.id,
                    respondentId: session.user.id,
                    status: "draft"
                },
                include: { answers: true }
            })

            if (draft) {
                draftAnswers = {}
                draft.answers.forEach(a => {
                    try {
                        // Parse JSON value
                        const val = JSON.parse(a.value)
                        draftAnswers![a.questionId] = val
                    } catch {
                        draftAnswers![a.questionId] = a.value
                    }
                })
            }
        }

        // Parse question configs and conditions
        const formWithParsedData = {
            ...form,
            status: undefined, // Don't expose internal status
            editorShareId: undefined, // Don't expose editor link
            sections: form.sections.map(s => ({
                ...s,
                questions: s.questions.map(q => ({
                    ...q,
                    config: JSON.parse(q.config || "{}"),
                    conditions: JSON.parse(q.conditions || "{}")
                }))
            })),
            responseCount: form._count.responses,
            maxResponses: form.maxResponses,
            hasSubmitted,
            draftAnswers
        }

        return NextResponse.json(formWithParsedData)
    } catch (error) {
        console.error("[PUBLIC FORM GET]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
