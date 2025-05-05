/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Copy, Eye, EyeOff, AlertCircle, ArrowLeft, Edit, ExternalLink, ShieldCheck, RefreshCw, Lock } from 'lucide-react'
import { getPasswordById } from "feature/password/passwordThunk"
import { resetPasswordStatus, clearPasswordError } from "feature/password/passwordSlice"
import { RootState, AppDispatch } from "redux/store"
import { decryptPassword } from "utils/encryptionUtils"
import PassphraseAuthModal from "components/PassphraseAuthModal"
import passphraseManager from "utils/passphraseManager"

interface ViewPasswordDetailsProps {
    passwordId: string
    onBack: () => void
    onEdit: () => void
    onRefreshToken: () => Promise<boolean>
}

// Duration in milliseconds that a password is visible before being automatically hidden
const PASSWORD_VISIBILITY_TIMEOUT = 10000; // 10 seconds

export default function ViewPasswordDetails({ passwordId, onBack, onEdit, onRefreshToken }: ViewPasswordDetailsProps) {
    const dispatch = useDispatch<AppDispatch>()
    const { selectedPassword, loading, error } = useSelector((state: RootState) => state.password)

    const [showPassword, setShowPassword] = useState(false)
    const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null)
    const [localLoading, setLocalLoading] = useState(true)
    const [localError, setLocalError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [copyPosition, setCopyPosition] = useState<'top' | 'bottom'>('top')
    const [isDecrypting, setIsDecrypting] = useState(false)

    // Kiểm tra xem có passphrase session không
    const hasSession = passphraseManager.hasValidPassphrase();

    // State for authentication
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authenticated, setAuthenticated] = useState(false)
    const [visibilityTimeout, setVisibilityTimeout] = useState<NodeJS.Timeout | null>(null)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const fetchPassword = async () => {
            setLocalLoading(true)
            setLocalError(null)

            try {
                // Fetch encrypted password data
                await dispatch(getPasswordById(passwordId)).unwrap()

                // Tự động giải mã nếu đã có passphrase trong session
                if (selectedPassword && passphraseManager.hasValidPassphrase()) {
                    await tryAutomaticDecryption();
                }
            } catch (err) {
                if (typeof err === "string" && err.includes("token expired")) {
                    const refreshed = await onRefreshToken()
                    if (refreshed) {
                        try {
                            await dispatch(getPasswordById(passwordId)).unwrap()

                            // Tự động giải mã nếu đã có passphrase trong session
                            if (selectedPassword && passphraseManager.hasValidPassphrase()) {
                                await tryAutomaticDecryption();
                            }
                        } catch (refreshErr) {
                            setLocalError("Failed to load password details")
                        }
                    } else {
                        setLocalError("Session expired. Please login again.")
                    }
                } else {
                    setLocalError(typeof err === "string" ? err : "Failed to load password details")
                }
            } finally {
                setLocalLoading(false)
            }
        }

        fetchPassword()

        // Cleanup when component unmounts
        return () => {
            dispatch(resetPasswordStatus())
            dispatch(clearPasswordError())

            // Clear any active timeouts and intervals
            if (visibilityTimeout) clearTimeout(visibilityTimeout)
            if (countdownInterval) clearInterval(countdownInterval)
        }
    }, [passwordId, dispatch, onRefreshToken])

    // Thử giải mã tự động nếu đã có passphrase
    const tryAutomaticDecryption = async () => {
        if (!selectedPassword || !selectedPassword.encryptedData || !selectedPassword.iv) {
            return;
        }

        const savedPassphrase = passphraseManager.getPassphrase();
        if (savedPassphrase) {
            setIsDecrypting(true);

            try {
                const password = await decryptPassword(
                    selectedPassword.encryptedData,
                    selectedPassword.iv,
                    savedPassphrase
                );

                setDecryptedPassword(password);
                setAuthenticated(true);
                // Không hiển thị mật khẩu tự động, chỉ chuẩn bị sẵn để hiển thị
                setShowPassword(false);

                // Gia hạn thời gian của passphrase
                passphraseManager.extendValidity();
            } catch (error) {
                // Nếu không giải mã được, có thể passphrase đã thay đổi
                console.error("Auto-decryption failed:", error);
                passphraseManager.clearPassphrase();
            } finally {
                setIsDecrypting(false);
            }
        }
    };

    // Effect khi selectedPassword thay đổi
    useEffect(() => {
        // Nếu có selectedPassword mới và đã có passphrase trong session
        if (selectedPassword && passphraseManager.hasValidPassphrase()) {
            tryAutomaticDecryption();
        }
    }, [selectedPassword]);

    // Handle authentication with passphrase
    const handleAuthenticate = async (passphrase: string) => {
        if (!selectedPassword || !selectedPassword.encryptedData || !selectedPassword.iv) {
            throw new Error("Password data not available")
        }

        setIsDecrypting(true)

        try {
            // Decrypt the password using the provided passphrase
            const password = await decryptPassword(
                selectedPassword.encryptedData,
                selectedPassword.iv,
                passphrase
            )

            // Store the decrypted password and show it
            setDecryptedPassword(password)
            setShowPassword(true)
            setAuthenticated(true)

            // Lưu passphrase cho các lần giải mã tiếp theo
            passphraseManager.setPassphrase(passphrase);

            // Set a timeout to hide the password after the visibility period
            startVisibilityTimer()

            // Password successfully decrypted, no need to return it
        } catch (error) {
            console.error("Decryption error:", error)
            throw new Error("Invalid passphrase. Please try again.")
        } finally {
            setIsDecrypting(false)
        }
    }

    // Start the timeout to hide the password and countdown timer
    const startVisibilityTimer = () => {
        // Clear any existing timers first
        if (visibilityTimeout) clearTimeout(visibilityTimeout)
        if (countdownInterval) clearInterval(countdownInterval)

        // Set the visibility timeout
        const timeout = setTimeout(() => {
            setShowPassword(false)
            setTimeLeft(null)
            // Không đặt lại authenticated vì người dùng vẫn đã xác thực
            // setAuthenticated(false)
        }, PASSWORD_VISIBILITY_TIMEOUT)

        setVisibilityTimeout(timeout)

        // Set up the countdown timer
        setTimeLeft(PASSWORD_VISIBILITY_TIMEOUT)
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1000) {
                    clearInterval(interval)
                    return null
                }
                return prev - 1000
            })
        }, 1000)

        setCountdownInterval(interval)
    }

    // Reset timers when manually toggling password visibility
    useEffect(() => {
        if (showPassword && authenticated) {
            startVisibilityTimer()
        } else {
            // Clear timers if password is hidden
            if (visibilityTimeout) clearTimeout(visibilityTimeout)
            if (countdownInterval) clearInterval(countdownInterval)
            setTimeLeft(null)
        }
    }, [showPassword])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            })
            .catch(err => console.error('Failed to copy password: ', err))
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";

        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            console.error("Invalid date format:", dateString);
            return "Invalid date";
        }
    }

    const togglePasswordVisibility = () => {
        if (showPassword) {
            // Simply hide the password if it's already showing
            setShowPassword(false)
        } else if (authenticated && decryptedPassword) {
            // If already authenticated, show the password again without requiring re-authentication
            setShowPassword(true)
        } else {
            // Need to authenticate first
            setAuthModalOpen(true)
        }
    }

    // Format remaining time for display
    const formatTimeLeft = (ms: number | null): string => {
        if (ms === null) return "";
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    }

    // Show time left in passphrase session
    const getPassphraseSessionTimeLeft = (): string => {
        const ms = passphraseManager.getRemainingTime();
        if (ms <= 0) return "0:00";

        const minutes = Math.floor(ms / 60000);
        const seconds = Math.ceil((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Tạo effect để cập nhật thời gian còn lại mỗi giây
    useEffect(() => {
        if (!hasSession) return;

        // Cập nhật thời gian mỗi giây
        const intervalId = setInterval(() => {
            // Buộc component re-render để cập nhật thời gian
            setTimeLeft(prevTime => prevTime !== null ? prevTime : null);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [hasSession]);

    // Use combined loading state
    const isLoading = loading || localLoading || isDecrypting

    // Use combined error state
    const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || error

    if (isLoading) {
        return (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
                <div className="flex h-40 items-center justify-center p-6">
                    <div className="text-slate-400">
                        {isDecrypting ? "Đang giải mã mật khẩu..." : "Đang tải thông tin mật khẩu..."}
                    </div>
                </div>
            </div>
        )
    }

    const maskedPassword = decryptedPassword ? '•'.repeat(decryptedPassword.length) : ''

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <button
                    className="flex items-center text-sm text-slate-400 hover:text-slate-100"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại danh sách
                </button>

                <button
                    className="px-3 py-1.5 rounded-md border border-slate-600 bg-slate-700 text-sm text-slate-200 hover:bg-slate-600 hover:text-slate-50"
                    onClick={onEdit}
                >
                    <Edit className="mr-2 h-4 w-4 inline" />
                    Chỉnh sửa
                </button>
            </div>

            <div className="px-6 py-4">
                <h2 className="text-xl font-semibold text-slate-50">
                    {selectedPassword?.website || "Chi tiết mật khẩu"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Xem chi tiết mật khẩu đã lưu</p>

                {hasSession && (
                    <div className="mt-2 flex items-center text-xs text-green-400">
                        <Lock className="h-3 w-3 mr-1" />
                        <span>Master passphrase có hiệu lực: {getPassphraseSessionTimeLeft()}</span>
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 space-y-6">
                {displayError && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-900/20 text-red-400 border border-red-900">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">
                            {typeof displayError === 'object'
                                ? displayError.message ?? 'An error occurred'
                                : displayError}
                        </p>
                    </div>
                )}

                {selectedPassword && (
                    <div className="rounded-md border border-slate-700 p-5">
                        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                            <div>
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500">Website</h4>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-200">{selectedPassword.website}</p>
                                    {selectedPassword.website.startsWith("http") && (
                                        <a
                                            href={selectedPassword.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-400 hover:text-cyan-300"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                    <button
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-100"
                                        onClick={() => copyToClipboard(selectedPassword.website)}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500">Username / Email</h4>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-200">{selectedPassword.username}</p>
                                    <button
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-100"
                                        onClick={() => copyToClipboard(selectedPassword.username)}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500 flex items-center gap-1">
                                    Password
                                    {authenticated && timeLeft !== null && (
                                        <span className="text-amber-400 text-[10px] font-normal">
                                            (hiển thị còn {formatTimeLeft(timeLeft)})
                                        </span>
                                    )}
                                </h4>
                                <div className="flex items-center gap-2">
                                    {authenticated ? (
                                        <p className="font-mono text-slate-200">
                                            {showPassword && decryptedPassword ? decryptedPassword : maskedPassword}
                                        </p>
                                    ) : (
                                        <div className="flex items-center">
                                            <p className="font-mono text-slate-500">••••••••••</p>
                                            <span className="ml-2 text-xs text-amber-400 flex items-center">
                                                <ShieldCheck className="h-3 w-3 mr-1" />
                                                Protected
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-100"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>

                                    {authenticated && decryptedPassword && (
                                        <button
                                            className="p-1 rounded-md text-slate-400 hover:text-slate-100"
                                            onClick={() => {
                                                copyToClipboard(decryptedPassword)
                                                setCopyPosition('top')
                                            }}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </button>
                                    )}

                                    {copied && copyPosition === 'top' && (
                                        <div className="absolute -top-8 right-0 bg-green-900/80 text-green-200 text-xs py-1 px-2 rounded">
                                            Đã sao chép!
                                        </div>
                                    )}
                                </div>

                                {authenticated && !showPassword && (
                                    <button
                                        onClick={() => setShowPassword(true)}
                                        className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Hiển thị mật khẩu
                                    </button>
                                )}

                                {!authenticated && (
                                    <button
                                        onClick={() => setAuthModalOpen(true)}
                                        className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Xác thực để xem mật khẩu
                                    </button>
                                )}

                                {authenticated && timeLeft !== null && (
                                    <button
                                        onClick={startVisibilityTimer}
                                        className="mt-1 text-xs text-amber-400 hover:text-amber-300 flex items-center">
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Đặt lại thời gian
                                    </button>
                                )}
                            </div>

                            <div>
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500">ID</h4>
                                <p className="font-mono text-sm text-slate-400">{selectedPassword.id}</p>
                            </div>

                            <div>
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500">Ngày tạo</h4>
                                <p className="text-slate-400">{formatDate(selectedPassword.created_at || selectedPassword.createdAt)}</p>
                            </div>

                            <div>
                                <h4 className="mb-1 text-xs font-medium uppercase text-slate-500">Cập nhật lần cuối</h4>
                                <p className="text-slate-400">{formatDate(selectedPassword.updated_at || selectedPassword.updatedAt)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Passphrase Authentication Modal */}
            <PassphraseAuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onAuthenticate={handleAuthenticate}
                title="Xác thực bắt buộc"
                message="Vui lòng nhập master passphrase để xem mật khẩu này."
            />
        </div>
    )
}