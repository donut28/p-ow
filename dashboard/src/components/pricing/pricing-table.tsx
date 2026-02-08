"use client"

import { useClerk } from "@clerk/nextjs"
import { Check, Star, Zap, Crown } from "lucide-react"

interface Plan {
    id: string
    name: string
    price: string
    description: string
    features: string[]
    icon: typeof Star
    color: string
    popular?: boolean
}

const plans: Plan[] = [
    {
        id: "free",
        name: "Free",
        price: "$0",
        description: "Basic moderation tools for small servers",
        icon: Star,
        color: "zinc",
        features: [
            "5 Forms",
            "5 Automations",
            "Basic command logging",
            "Community support"
        ]
    },
    {
        id: "pow-pro",
        name: "POW Pro",
        price: "$5.99",
        description: "Advanced features for serious moderation",
        icon: Zap,
        color: "blue",
        popular: true,
        features: [
            "25 Forms",
            "15 Automations",
            "Raid Detection",
            "Auto-Actions",
            "CSV Exports",
            "Priority support"
        ]
    },
    {
        id: "pow-max",
        name: "POW Max",
        price: "$14.99",
        description: "Full power for professional organizations",
        icon: Crown,
        color: "purple",
        features: [
            "Unlimited Forms",
            "Unlimited Automations",
            "Raid Detection + Alerts",
            "Auto-Actions",
            "Unlimited Exports",
            "White-label Bot",
            "Priority support",
            "Custom features on request"
        ]
    }
]

export function PricingTable() {
    const { openSignIn } = useClerk()

    const handleSelectPlan = (planId: string) => {
        if (planId === "free") {
            openSignIn()
        } else {
            // For paid plans, redirect to Clerk billing portal
            window.location.href = `/dashboard/billing?plan=${planId}`
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
            {plans.map((plan) => {
                const Icon = plan.icon
                const isPopular = plan.popular

                return (
                    <div
                        key={plan.id}
                        className={`relative flex flex-col rounded-2xl border ${isPopular
                                ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                                : "border-[#333] bg-[#1a1a1a]"
                            } p-6 transition-all hover:border-white/20`}
                    >
                        {isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                                Most Popular
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className={`h-12 w-12 rounded-xl bg-${plan.color}-500/10 flex items-center justify-center`}>
                                <Icon className={`h-6 w-6 text-${plan.color}-400`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-xl">{plan.name}</h3>
                                <p className="text-zinc-500 text-sm">{plan.description}</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-bold text-white">{plan.price}</span>
                            {plan.id !== "free" && <span className="text-zinc-500">/month</span>}
                        </div>

                        <ul className="space-y-3 mb-8 flex-1">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-zinc-300">
                                    <Check className={`h-4 w-4 text-${plan.color}-400 flex-shrink-0`} />
                                    <span className="text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSelectPlan(plan.id)}
                            className={`w-full py-3 rounded-xl font-bold transition-all ${isPopular
                                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "bg-white/10 hover:bg-white/20 text-white"
                                }`}
                        >
                            {plan.id === "free" ? "Get Started" : "Subscribe"}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
