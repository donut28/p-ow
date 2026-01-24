import { useState, useCallback } from 'react'
import Tesseract from 'tesseract.js'

export function useOcr() {
    const [isProcessing, setIsProcessing] = useState(false)

    const processCapture = useCallback(async (imageDataUrl: string): Promise<string | null> => {
        setIsProcessing(true)

        try {
            // Process with Tesseract
            const result = await Tesseract.recognize(imageDataUrl, 'eng', {
                logger: () => { } // Suppress progress logs
            })

            // Extract text and find Roblox username pattern
            const text = result.data.text

            // Roblox usernames: 3-20 chars, alphanumeric + underscore
            const usernamePattern = /[A-Za-z][A-Za-z0-9_]{2,19}/g
            const matches = text.match(usernamePattern)

            if (matches && matches.length > 0) {
                // Return the most likely username (first reasonable match)
                // Filter out common false positives
                const filtered = matches.filter(m =>
                    !['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT'].includes(m.toUpperCase()) &&
                    m.length >= 3
                )

                return filtered[0] || null
            }

            return null
        } catch (error) {
            console.error('OCR error:', error)
            return null
        } finally {
            setIsProcessing(false)
        }
    }, [])

    return { processCapture, isProcessing }
}
