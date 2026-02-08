import { PricingTable } from "@/components/pricing/pricing-table"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Pricing | Project Overwatch",
    description: "Choose the perfect plan for your moderation needs"
}

export default async function PricingPage() {
    const isEnabled = await isFeatureEnabled('PRICING_PAGE')
    if (!isEnabled) {
        redirect("/")
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="border-b border-[#222]">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 text-center">
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
                    Choose the plan that fits your server. Start free
                    and upgrade as you grow.
                </p>

                <PricingTable />
            </section>

            {/* FAQ */}
            <section className="py-16 border-t border-[#222]">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>

                    <div className="space-y-6">
                        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333]">
                            <h3 className="font-bold text-white mb-2">Can I switch plans anytime?</h3>
                            <p className="text-zinc-400">Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
                        </div>

                        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333]">
                            <h3 className="font-bold text-white mb-2">What payment methods do you accept?</h3>
                            <p className="text-zinc-400">We accept all major credit cards via Stripe. Your payment info is securely handled by Clerk.</p>
                        </div>

                        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333]">
                            <h3 className="font-bold text-white mb-2">Is there a free trial?</h3>
                            <p className="text-zinc-400">The Free tier is always free! Try all basic features before upgrading.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-[#222] text-center text-zinc-500 text-sm">
                <p>© {new Date().getFullYear()} Project Overwatch. All rights reserved.</p>
            </footer>
        </div>
    )
}
