/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { AlertCircle, CheckCircle2, ArrowLeft, Save, Eye, EyeOff, RefreshCw, Lock } from 'lucide-react'
import { getPasswordById, updatePassword } from "feature/password/passwordThunk"
import { resetPasswordStatus, clearPasswordError } from "feature/password/passwordSlice"
import { RootState, AppDispatch } from "redux/store"
import { encryptPassword, decryptPassword } from "utils/encryptionUtils"
import PassphraseAuthModal from "components/PassphraseAuthModal"
import passphraseManager from "utils/passphraseManager"

interface EditPasswordFormProps {
    passwordId: string
    onSuccess: () => void
    onCancel: () => void
    onRefreshToken: () => Promise<boolean>
}

export default function EditPasswordForm({ passwordId, onSuccess, onCancel, onRefreshToken }: EditPasswordFormProps) {
    const dispatch = useDispatch<AppDispatch>()
    const { selectedPassword, loading, error, isPasswordUpdated } = useSelector(
        (state: RootState) => state.password
    )

    const [website, setWebsite] = useState("")
    const [username, setUsername] = useState("")
    const [passwordValue, setPasswordValue] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [isDecrypting, setIsDecrypting] = useState(false)

    // State cho PassphraseAuthModal
    const [passphraseModalOpen, setPassphraseModalOpen] = useState(false)
    const [passphraseForDecrypt, setPassphraseForDecrypt] = useState<string | null>(null)
    const [decryptModalOpen, setDecryptModalOpen] = useState(false)

    // Lấy thông tin password từ Redux store
    useEffect(() => {
        const fetchPassword = async () => {
            setLocalError(null)

            try {
                await dispatch(getPasswordById(passwordId)).unwrap()
            } catch (err) {
                if (typeof err === "string" && err.includes("token expired")) {
                    const refreshed = await onRefreshToken()
                    if (refreshed) {
                        try {
                            await dispatch(getPasswordById(passwordId)).unwrap()
                        } catch (refreshErr) {
                            setLocalError("Failed to load password details")
                        }
                    } else {
                        setLocalError("Session expired. Please login again.")
                    }
                } else {
                    setLocalError(err instanceof Error ? err.message : String(err))
                }
            }
        }

        fetchPassword()

        // Cleanup effect
        return () => {
            dispatch(resetPasswordStatus())
            dispatch(clearPasswordError())
        }
    }, [passwordId, dispatch, onRefreshToken])

    // Cập nhật state local khi selectedPassword thay đổi
    useEffect(() => {
        if (selectedPassword) {
            setWebsite(selectedPassword.website)
            setUsername(selectedPassword.username)

            // Nếu có dữ liệu mã hóa, thử giải mã
            if (selectedPassword.encryptedData && selectedPassword.iv) {
                // Kiểm tra xem đã có passphrase trong session chưa
                if (passphraseManager.hasValidPassphrase()) {
                    tryAutomaticDecryption();
                } else {
                    // Nếu không có passphrase, hiển thị modal để yêu cầu nhập
                    setDecryptModalOpen(true);
                }
            } else {
                setPasswordValue(""); // Default empty state if no encrypted data
            }
        }
    }, [selectedPassword])

    // Thử giải mã tự động nếu đã có passphrase trong session
    const tryAutomaticDecryption = async () => {
        if (!selectedPassword || !selectedPassword.encryptedData || !selectedPassword.iv) {
            return;
        }

        const savedPassphrase = passphraseManager.getPassphrase();
        if (savedPassphrase) {
            setIsDecrypting(true);

            try {
                // Giải mã mật khẩu với passphrase từ session
                const password = await decryptPassword(
                    selectedPassword.encryptedData,
                    selectedPassword.iv,
                    savedPassphrase
                );

                // Lưu passphrase để sử dụng khi lưu
                setPassphraseForDecrypt(savedPassphrase);
                setPasswordValue(password);

                // Gia hạn thời gian của passphrase
                passphraseManager.extendValidity();
            } catch (error) {
                // Nếu không giải mã được, có thể passphrase đã thay đổi
                console.error("Auto-decryption failed:", error);
                passphraseManager.clearPassphrase();
                setDecryptModalOpen(true); // Hiển thị modal để nhập passphrase mới
            } finally {
                setIsDecrypting(false);
            }
        }
    };

    // Hàm xử lý sau khi có passphrase để giải mã
    const handleDecryptWithPassphrase = async (passphrase: string): Promise<void> => {
        if (!selectedPassword || !selectedPassword.encryptedData || !selectedPassword.iv) {
            throw new Error("Password data not available")
        }

        setIsDecrypting(true)

        try {
            // Giải mã mật khẩu với passphrase
            const decryptedPassword = await decryptPassword(
                selectedPassword.encryptedData,
                selectedPassword.iv,
                passphrase
            )

            // Lưu passphrase để có thể dùng lại khi lưu mật khẩu
            setPassphraseForDecrypt(passphrase)
            setPasswordValue(decryptedPassword)

            // Lưu passphrase vào session cho các lần sử dụng tiếp theo
            passphraseManager.setPassphrase(passphrase);
        } catch (error) {
            console.error("Error decrypting password:", error)
            throw new Error("Invalid passphrase. Please try again.")
        } finally {
            setIsDecrypting(false)
        }
    }

    // Xử lý sau khi cập nhật thành công
    useEffect(() => {
        if (isPasswordUpdated) {
            // Đặt timeout để hiển thị thông báo thành công trước khi chuyển về danh sách
            const timer = setTimeout(() => {
                onSuccess()
            }, 1500)

            return () => clearTimeout(timer)
        }
    }, [isPasswordUpdated, onSuccess])

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?"
        let generatedPassword = ""
        for (let i = 0; i < 16; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length)
            generatedPassword += charset[randomIndex]
        }
        setPasswordValue(generatedPassword)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLocalError(null)

        // Nếu đã lấy được passphrase khi giải mã, dùng lại
        if (passphraseForDecrypt) {
            await handleSaveWithPassphrase(passphraseForDecrypt)
        } else if (passphraseManager.hasValidPassphrase()) {
            // Nếu có passphrase trong session, dùng passphrase đó
            const savedPassphrase = passphraseManager.getPassphrase();
            if (savedPassphrase) {
                await handleSaveWithPassphrase(savedPassphrase);
                // Gia hạn thời gian sử dụng passphrase
                passphraseManager.extendValidity();
            } else {
                // Nếu không có passphrase trong session, mở modal
                setPassphraseModalOpen(true);
            }
        } else {
            // Ngược lại, mở modal để lấy passphrase mới
            setPassphraseModalOpen(true)
        }
    }

    // Hàm xử lý sau khi có passphrase để lưu
    const handleSaveWithPassphrase = async (passphrase: string) => {
        setIsSaving(true)

        try {
            // Mã hóa mật khẩu với passphrase
            const { encryptedData, iv } = await encryptPassword(passwordValue, passphrase);

            // Cập nhật mật khẩu với dữ liệu đã mã hóa
            await dispatch(updatePassword({
                id: passwordId,
                data: {
                    website,
                    username,
                    encryptedData,
                    iv,
                }
            })).unwrap()

            // Lưu passphrase vào session cho lần sử dụng tiếp theo
            passphraseManager.setPassphrase(passphrase);

        } catch (err) {
            if (typeof err === "string" && err.includes("token expired")) {
                const refreshed = await onRefreshToken()
                if (refreshed) {
                    try {
                        const { encryptedData, iv } = await encryptPassword(passwordValue, passphrase);

                        await dispatch(updatePassword({
                            id: passwordId,
                            data: {
                                website,
                                username,
                                encryptedData,
                                iv,
                            }
                        })).unwrap()
                    } catch (refreshErr) {
                        setLocalError("Failed to update password")
                    }
                } else {
                    setLocalError("Session expired. Please login again.")
                }
            } else {
                setLocalError(typeof err === "string" ? err : "Failed to update password")
            }
        } finally {
            setIsSaving(false)
        }
    }

    // Hiển thị lỗi từ Redux store hoặc local state
    const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || error

    // Kiểm tra xem có passphrase session không
    const hasSession = passphraseManager.hasValidPassphrase();

    // Định dạng thời gian còn lại của passphrase session
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

        // Cập nhật thời gian mỗi giây để UI hiển thị chính xác
        const intervalId = setInterval(() => {
            // Force re-render component để cập nhật thời gian hiển thị
            setIsSaving(prev => prev);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [hasSession]);

    // Show loading state while waiting for password data to load or during decryption
    if (loading || isDecrypting) {
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

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <button
                    className="flex items-center text-sm text-slate-400 hover:text-slate-100"
                    onClick={onCancel}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại danh sách
                </button>
            </div>

            <div className="px-6 py-4">
                <h2 className="text-xl font-semibold text-slate-50">Sửa Mật Khẩu</h2>
                <p className="text-sm text-slate-400 mt-1">Cập nhật thông tin mật khẩu đã lưu</p>

                {hasSession && (
                    <div className="mt-2 flex items-center text-xs text-green-400">
                        <Lock className="h-3 w-3 mr-1" />
                        <span>Master passphrase có hiệu lực: {getPassphraseSessionTimeLeft()}</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="px-6 space-y-4">
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

                    {isPasswordUpdated && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-green-900/20 text-green-400 border border-green-900">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm">Mật khẩu đã được cập nhật!</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="website" className="block text-sm font-medium text-slate-300">
                            Website / Service
                        </label>
                        <input
                            id="website"
                            placeholder="https://example.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                            Username / Email
                        </label>
                        <input
                            id="username"
                            placeholder="your.email@example.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-md bg-slate-700 text-slate-100 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                            Password
                        </label>
                        <button
                            type="button"
                            className="flex items-center text-xs text-slate-400 hover:text-slate-100"
                            onClick={generatePassword}
                        >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Tạo mật khẩu mới
                        </button>
                        <div className="flex">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={passwordValue}
                                onChange={(e) => setPasswordValue(e.target.value)}
                                required
                                className="w-full rounded-l-md px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                            />
                            <button
                                type="button"
                                className="px-3 rounded-r-md border border-l-0 border-slate-600 bg-slate-700 hover:bg-slate-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 mt-4 border-t border-slate-700 flex justify-between">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading || isSaving || isPasswordUpdated}
                        className="px-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        disabled={loading || isSaving || isPasswordUpdated}
                        className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSaving ? (
                            "Đang lưu..."
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Cập Nhật Mật Khẩu
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Modal xác thực passphrase để lưu */}
            <PassphraseAuthModal
                isOpen={passphraseModalOpen}
                onClose={() => setPassphraseModalOpen(false)}
                onAuthenticate={handleSaveWithPassphrase}
                title="Nhập Master Passphrase"
                message="Vui lòng nhập master passphrase để mã hóa mật khẩu của bạn."
            />

            {/* Modal xác thực passphrase để giải mã */}
            <PassphraseAuthModal
                isOpen={decryptModalOpen}
                onClose={() => setDecryptModalOpen(false)}
                onAuthenticate={handleDecryptWithPassphrase}
                title="Xác thực để xem mật khẩu"
                message="Vui lòng nhập master passphrase để xem mật khẩu đã lưu."
            />
        </div>
    )
}
