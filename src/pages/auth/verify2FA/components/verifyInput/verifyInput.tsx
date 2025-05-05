/* eslint-disable prettier/prettier */
"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface VerificationInputProps {
    length: number
    onChange: (code: string) => void
    disabled?: boolean
}

const VerificationInput = ({ length, onChange }: VerificationInputProps) => {
    const [code, setCode] = useState<string[]>(Array(length).fill(""))
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    useEffect(() => {
        // Initialize refs array
        inputRefs.current = inputRefs.current.slice(0, length)

        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus()
        }
    }, [length])

    useEffect(() => {
        onChange(code.join(""))
    }, [code, onChange])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value

        // Only accept numbers
        if (!/^\d*$/.test(value)) return

        // Update the code array with the new value (take only the last character if multiple)
        const newCode = [...code]
        newCode[index] = value.slice(-1)
        setCode(newCode)

        // If a digit was entered and there's a next input, focus it
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        // Handle backspace
        if (e.key === "Backspace") {
            if (!code[index] && index > 0) {
                // If current input is empty and backspace is pressed, focus previous input
                const newCode = [...code]
                newCode[index - 1] = ""
                setCode(newCode)
                inputRefs.current[index - 1]?.focus()
            }
        }

        // Handle left arrow key
        if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }

        // Handle right arrow key
        if (e.key === "ArrowRight" && index < length - 1) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData("text/plain").trim()

        // Only accept numbers
        if (!/^\d+$/.test(pastedData)) return

        // Fill the code array with the pasted digits
        const newCode = [...code]
        for (let i = 0; i < Math.min(length, pastedData.length); i++) {
            newCode[i] = pastedData[i]
        }
        setCode(newCode)

        // Focus the input after the last pasted digit
        const focusIndex = Math.min(length - 1, pastedData.length)
        inputRefs.current[focusIndex]?.focus()
    }

    return (
        <div className="flex justify-center gap-2">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[index]}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            ))}
        </div>
    )
}

export default VerificationInput
