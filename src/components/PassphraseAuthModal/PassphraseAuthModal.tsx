/* eslint-disable prettier/prettier */
/*eslint-disable-next-line*/
"use client"

import { useState, useRef, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, Lock, X } from 'lucide-react'

interface PassphraseAuthModalProps {
    isOpen: boolean
    onClose: () => void
    onAuthenticate: (passphrase: string) => Promise<void>
    title?: string
    message?: string
}

export default function PassphraseAuthModal({
    isOpen,
    onClose,
    onAuthenticate,
    title = "Authentication Required",
    message = "Please enter your master passphrase to view this password"
}: PassphraseAuthModalProps) {
    const [passphrase, setPassphrase] = useState("")
    const [showPassphrase, setShowPassphrase] = useState(false)
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Focus on the input field when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    // Close modal with escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose()
            }
        }

        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setPassphrase("")
            setError(null)
            setIsAuthenticating(false)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!passphrase.trim()) {
            setError("Passphrase cannot be empty")
            return
        }

        setIsAuthenticating(true)
        setError(null)

        try {
            await onAuthenticate(passphrase)
            setPassphrase("")
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed")
        } finally {
            setIsAuthenticating(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 shadow-lg"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                    <h3 className="flex items-center text-lg font-medium text-slate-100">
                        <Lock className="mr-2 h-5 w-5 text-cyan-400" />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="mb-4 text-sm text-slate-300">{message}</p>

                    {error && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-900 bg-red-900/20 p-3 text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6 space-y-2">
                            <label htmlFor="passphrase" className="block text-sm font-medium text-slate-300">
                                Master Passphrase
                            </label>
                            <div className="flex">
                                <input
                                    ref={inputRef}
                                    id="passphrase"
                                    type={showPassphrase ? "text" : "password"}
                                    value={passphrase}
                                    onChange={(e) => setPassphrase(e.target.value)}
                                    placeholder="Enter your master passphrase"
                                    className="w-full rounded-l-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    disabled={isAuthenticating}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassphrase(!showPassphrase)}
                                    className="rounded-r-md border border-l-0 border-slate-600 bg-slate-700 px-3 hover:bg-slate-600"
                                >
                                    {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isAuthenticating}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isAuthenticating}
                            >
                                {isAuthenticating ? "Authenticating..." : "Authenticate"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}