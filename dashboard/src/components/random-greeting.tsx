"use client"

import { useMemo } from "react"

const GREETINGS = [
    "What's up",
    "Hey there",
    "Welcome back",
    "Good to see you",
    "Yo",
    "Howdy",
    "Sup",
    "Ahoy",
    "Greetings",
    "Salutations",
    "What's good",
    "Look who's here",
    "Well well well",
    "Nice to see you",
    "Ready to roll",
    "Let's get to work",
    "Time to shine",
    "Back at it again",
    "The legend returns",
    "Look who showed up",
]

export function RandomGreeting({ username }: { username: string }) {
    // Pick a random greeting - memoized so it doesn't change on re-renders
    const greeting = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * GREETINGS.length)
        return GREETINGS[randomIndex]
    }, [])

    return (
        <>
            {greeting}, {username}!
        </>
    )
}
