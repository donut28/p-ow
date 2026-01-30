import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"

// POST /api/forms/[formId]/submit - Submit form response
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const { formId } = await params

        // Get form with settings and questions
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                sections: {
                    include: {
                        questions: true
                    }
                },
                _count: { select: { responses: true } }
            }
        })

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 })
        }

        // Check form is published
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

        // Check auth requirement
        const session = await getSession()
        if (form.requiresAuth && !session) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        // Check multiple submissions (only for completed ones)
        if (!form.allowMultiple && session) {
            const existing = await prisma.formResponse.findFirst({
                where: {
                    formId,
                    respondentId: session.user.id,
                    status: "completed"
                }
            })
            if (existing) {
                return NextResponse.json({ error: "You have already submitted this form" }, { status: 403 })
            }
        }

        const body = await request.json()
        const { answers, email, saveAsDraft } = body

        if (!answers || typeof answers !== "object") {
            return NextResponse.json({ error: "answers object is required" }, { status: 400 })
        }

        // Validate required questions (SKIP if saving as draft)
        if (!saveAsDraft) {
            const allQuestions = form.sections.flatMap(s => s.questions)
            const requiredQuestions = allQuestions.filter(q => q.required)

            for (const question of requiredQuestions) {
                const answer = answers[question.id]
                // TODO: Also check conditional logic here to ensure we don't require hidden questions
                // For now, simple check
                if (answer === undefined || answer === null || answer === "") {
                    return NextResponse.json({
                        error: `Question "${question.label}" is required`,
                        questionId: question.id
                    }, { status: 400 })
                }
            }
        }

        // Find existing draft (or response if updating)
        let responseId: string | undefined
        if (session) {
            const existing = await prisma.formResponse.findFirst({
                where: { formId, respondentId: session.user.id, status: "draft" }
            })
            responseId = existing?.id
        }

        // Upsert response
        const status = saveAsDraft ? "draft" : "completed"

        const response = await prisma.formResponse.upsert({
            where: { id: responseId || "new" }, // "new" checks nothing, triggers create
            create: {
                formId,
                respondentId: session?.user.id || null,
                respondentEmail: email || null,
                status,
                answers: {
                    create: Object.entries(answers).map(([questionId, value]) => ({
                        questionId,
                        value: JSON.stringify(value)
                    }))
                }
            },
            update: {
                status,
                // For update, we delete all answers and recreate them to handle removed answers
                answers: {
                    deleteMany: {},
                    create: Object.entries(answers).map(([questionId, value]) => ({
                        questionId,
                        value: JSON.stringify(value)
                    }))
                }
            },
            include: { answers: true }
        })

        // TODO: Send Discord notification only on FINAL submission
        if (!saveAsDraft && form.notifyChannelId) {
            await prisma.botQueue.create({
                data: {
                    serverId: form.serverId,
                    type: "MESSAGE",
                    targetId: form.notifyChannelId,
                    content: JSON.stringify({
                        embeds: [{
                            title: `📝 New Form Submission`,
                            description: `Someone submitted **${form.title}**`,
                            color: 0x5865F2,
                            fields: [
                                {
                                    name: "Respondent",
                                    value: form.isAnonymous ? "Anonymous" : (session?.user.username || email || "Anonymous"),
                                    inline: true
                                },
                                {
                                    name: "Response #",
                                    value: `${form._count.responses + 1}`,
                                    inline: true
                                }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    })
                }
            })
        }

        return NextResponse.json({
            success: true,
            responseId: response.id
        }, { status: 201 })
    } catch (error) {
        console.error("[FORM SUBMIT]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
