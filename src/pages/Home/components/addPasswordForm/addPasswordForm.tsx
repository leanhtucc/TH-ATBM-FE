/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { AlertCircle, CheckCircle2, ArrowLeft, Save, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react'
import { addPassword } from "feature/password/passwordThunk"
import { resetPasswordStatus } from "feature/password/passwordSlice"
import { RootState, AppDispatch } from "redux/store"
import { encryptPassword } from "utils/encryptionUtils"
import PassphraseAuthModal from "components/PassphraseAuthModal"
import passphraseManager from "utils/passphraseManager"

interface AddPasswordFormProps {
    onSuccess: () => void
    onCancel: () => void
    onRefreshToken: () => Promise<boolean>
}

export default function AddPasswordForm({ onSuccess, onCancel, onRefreshToken }: AddPasswordFormProps) {
    const dispatch = useDispatch<AppDispatch>()
    const { loading, error, isPasswordAdded } = useSelector((state: RootState) => state.password)

    const [website, setWebsite] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [localLoading, setLocalLoading] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)

    // State cho PassphraseAuthModal
    const [passphraseModalOpen, setPassphraseModalOpen] = useState(false)

    // Xử lý sau khi thêm password thành công
    useEffect(() => {
        if (isPasswordAdded || showSuccess) {
            // Đặt timeout để hiển thị thông báo thành công trước khi chuyển về danh sách
            const timer = setTimeout(() => {
                onSuccess()
            }, 1500)

            return () => clearTimeout(timer)
        }
    }, [isPasswordAdded, onSuccess, showSuccess])

    // Cleanup khi component unmount
    useEffect(() => {
        return () => {
            dispatch(resetPasswordStatus())
        }
    }, [dispatch])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLocalError(null)

        // Kiểm tra xem đã có passphrase trong session chưa
        if (passphraseManager.hasValidPassphrase()) {
            const savedPassphrase = passphraseManager.getPassphrase();
            if (savedPassphrase) {
                // Nếu có, sử dụng passphrase đã lưu
                await handleSaveWithPassphrase(savedPassphrase);
                // Gia hạn thời gian sử dụng passphrase
                passphraseManager.extendValidity();
                return;
            }
        }

        // Nếu không có passphrase trong session, mở modal để yêu cầu nhập
        setPassphraseModalOpen(true);
    }

    // Hàm xử lý sau khi có passphrase
    const handleSaveWithPassphrase = async (passphrase: string) => {
        setLocalLoading(true)
        setShowSuccess(false)

        try {
            // Mã hóa mật khẩu với passphrase do người dùng nhập vào
            const { encryptedData, iv } = await encryptPassword(password, passphrase);

            // Gửi dữ liệu đã mã hóa lên server
            const result = await dispatch(addPassword({
                website,
                username,
                encryptedData,
                iv,
            })).unwrap();

            // Kiểm tra kết quả từ backend
            if (result) {
                setShowSuccess(true);
            }

        } catch (err) {
            console.log("Error adding password:", err);

            if (typeof err === "string" && err.includes("token expired")) {
                const refreshed = await onRefreshToken()
                if (refreshed) {
                    try {
                        // Thử lại với token đã làm mới
                        const { encryptedData, iv } = await encryptPassword(password, passphrase);

                        const result = await dispatch(addPassword({
                            website,
                            username,
                            encryptedData,
                            iv,
                        })).unwrap();

                        if (result) {
                            setShowSuccess(true);
                        }
                    } catch (refreshErr) {
                        setLocalError("Không thể thêm mật khẩu")
                    }
                } else {
                    setLocalError("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.")
                }
            } else {
                setLocalError(typeof err === "string" ? err : "Không thể thêm mật khẩu")
            }
        } finally {
            setLocalLoading(false)
        }
    }

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?"
        let generatedPassword = ""
        for (let i = 0; i < 16; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length)
            generatedPassword += charset[randomIndex]
        }
        setPassword(generatedPassword)
    }

    // Sử dụng trạng thái loading từ cả Redux và local state
    const isLoading = loading || localLoading

    // Sử dụng lỗi từ cả Redux và local state
    const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || error

    // Kiểm tra xem có passphrase đã lưu hay không
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
            // Force re-render để cập nhật thời gian
            setLocalLoading(prev => prev);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [hasSession]);

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
                <h2 className="text-xl font-semibold text-slate-50">Thêm Mật Khẩu Mới</h2>
                <p className="text-sm text-slate-400 mt-1">Lưu mật khẩu mới vào kho an toàn</p>

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
                                    ? displayError.message ?? 'Đã xảy ra lỗi'
                                    : displayError}
                            </p>
                        </div>
                    )}


                    {(isPasswordAdded || showSuccess) && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-green-900/20 text-green-400 border border-green-900">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm">Đã thêm mật khẩu thành công!</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="website" className="block text-sm font-medium text-slate-300">
                            Website / Dịch vụ
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
                            Tên đăng nhập / Email
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
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Mật khẩu
                            </label>
                            <button
                                type="button"
                                className="flex items-center text-xs text-slate-400 hover:text-slate-100"
                                onClick={generatePassword}
                            >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Tạo mật khẩu ngẫu nhiên
                            </button>
                        </div>
                        <div className="flex">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                        disabled={isLoading || isPasswordAdded || showSuccess}
                        className="px-4 py-2 rounded-md border border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Hủy
                    </button>

                    <button
                        type="submit"
                        disabled={isLoading || isPasswordAdded || showSuccess || !website || !username || !password}
                        className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isLoading ? (
                            "Đang lưu..."
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {hasSession ? "Lưu Mật Khẩu" : "Tiếp tục"}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Modal xác thực passphrase */}
            <PassphraseAuthModal
                isOpen={passphraseModalOpen}
                onClose={() => setPassphraseModalOpen(false)}
                onAuthenticate={handleSaveWithPassphrase}
                title="Nhập Master Passphrase"
                message="Vui lòng nhập master passphrase để mã hóa mật khẩu của bạn. Mật khẩu này sẽ được dùng để xem lại mật khẩu sau này."
            />
        </div>
    )
}