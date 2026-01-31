"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronRight, Shield, Zap, BarChart3, Users, Clock, FileText, ArrowRight } from "lucide-react"
import { useUser } from "@clerk/nextjs"

export function LandingPage() {
    const [scrollY, setScrollY] = useState(0)
    const { isSignedIn, isLoaded } = useUser()

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans antialiased">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? "bg-white/80 backdrop-blur-xl shadow-sm" : "bg-transparent"
                }`}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="POW" className="h-10 w-10" />
                            <span className="text-xl font-semibold tracking-tight">Project Overwatch</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Features</a>
                            <a href="#about" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">About</a>
                            {isLoaded && (
                                isSignedIn ? (
                                    <Link
                                        href="/dashboard"
                                        className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-all hover:scale-105"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-all hover:scale-105"
                                    >
                                        Sign In
                                    </Link>
                                )
                            )}
                        </div>
                        {isLoaded && (
                            isSignedIn ? (
                                <Link
                                    href="/dashboard"
                                    className="md:hidden px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="md:hidden px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full"
                                >
                                    Sign In
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />

                {/* Animated Gradient Orbs */}
                <div
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-r from-indigo-400/30 to-violet-400/30 rounded-full blur-3xl"
                    style={{ transform: `translateY(${scrollY * 0.1}px)` }}
                />
                <div
                    className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-r from-violet-400/20 to-pink-400/20 rounded-full blur-3xl"
                    style={{ transform: `translateY(${-scrollY * 0.15}px)` }}
                />

                <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-zinc-200 rounded-full text-sm font-medium text-zinc-600 mb-8 shadow-sm">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        Trusted by ERLC communities worldwide
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8">
                        <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent">
                            ERLC moderation
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                            but better™
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                        The modern, professional-grade management platform for Emergency Response: Liberty County servers.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="group flex items-center gap-3 px-8 py-4 bg-zinc-900 text-white text-lg font-semibold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 hover:shadow-2xl hover:shadow-zinc-900/30 hover:-translate-y-0.5"
                        >
                            Get Started
                            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#features"
                            className="flex items-center gap-2 px-8 py-4 text-zinc-600 text-lg font-medium hover:text-zinc-900 transition-colors"
                        >
                            Learn More
                            <ArrowRight className="h-5 w-5" />
                        </a>
                    </div>

                    {/* Hero Stats */}
                    <div className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto">
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-zinc-900">10K+</div>
                            <div className="text-sm text-zinc-500 mt-1">Active Users</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-zinc-900">500+</div>
                            <div className="text-sm text-zinc-500 mt-1">Communities</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-zinc-900">99.9%</div>
                            <div className="text-sm text-zinc-500 mt-1">Uptime</div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-8 h-12 border-2 border-zinc-300 rounded-full flex items-start justify-center p-2">
                        <div className="w-1.5 h-3 bg-zinc-400 rounded-full animate-pulse" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-20">
                        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-4">Features</p>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                            Everything you need to run a<br />professional ERLC server
                        </h2>
                        <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
                            A comprehensive suite of tools designed for modern server management.
                        </p>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Mod Panel</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Real-time player management with kick, ban, and warning systems. Execute commands instantly with full audit logging.
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Clock className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Shift Tracking</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Automated shift logging with time tracking. Monitor staff activity and generate detailed performance reports.
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Analytics</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Comprehensive server analytics. Track player counts, moderation actions, and identify trends over time.
                            </p>
                        </div>

                        {/* Card 4 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Role Management</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Discord-synced role system with granular permissions. Auto-assign roles based on Discord membership.
                            </p>
                        </div>

                        {/* Card 5 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Automations</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Set up automated actions triggered by events. From welcome messages to scheduled commands.
                            </p>
                        </div>

                        {/* Card 6 */}
                        <div className="group p-8 bg-gradient-to-br from-zinc-50 to-zinc-100/50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileText className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Custom Forms</h3>
                            <p className="text-zinc-500 leading-relaxed">
                                Build application forms, surveys, and more. Role-gated access with response tracking and analytics.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / Mission Section */}
            <section id="about" className="py-32 bg-zinc-900 text-white relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
                    <p className="text-sm font-semibold text-indigo-400 tracking-wide uppercase mb-4">Our Mission</p>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
                        Making server management<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            accessible to everyone
                        </span>
                    </h2>
                    <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-12">
                        Project Overwatch was built by ERLC players, for ERLC players. We understand the challenges of running a community,
                        and we've created the tools to make it easier. No more spreadsheets. No more manual tracking. Just a beautiful,
                        powerful platform that works.
                    </p>

                    {/* Feature Highlights */}
                    <div className="grid md:grid-cols-3 gap-8 mt-16">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div className="text-3xl font-bold text-white mb-2">Free</div>
                            <div className="text-zinc-400">Always free for communities</div>
                        </div>
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div className="text-3xl font-bold text-white mb-2">Open</div>
                            <div className="text-zinc-400">Built with the community</div>
                        </div>
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <div className="text-3xl font-bold text-white mb-2">Secure</div>
                            <div className="text-zinc-400">Your data stays yours</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
                        Ready to level up your server?
                    </h2>
                    <p className="text-xl text-white/80 mb-10">
                        Join thousands of communities already using Project Overwatch.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-3 px-10 py-5 bg-white text-zinc-900 text-lg font-semibold rounded-2xl hover:bg-zinc-100 transition-all shadow-2xl hover:-translate-y-1"
                    >
                        Start Now — It's Free
                        <ChevronRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 bg-white border-t border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="POW" className="h-10 w-10 opacity-80" />
                            <span className="text-lg font-semibold text-zinc-900">Project Overwatch</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <a href="#features" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Features</a>
                            <a href="#about" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">About</a>
                            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Sign In</Link>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-zinc-100 text-center">
                        <p className="text-sm text-zinc-500">
                            © 2026 Project Overwatch - erlc moderation but better™
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
