/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */
"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowRight, QrCode, LogOut } from 'lucide-react'
import { setting2FA } from "feature/auth/authThunks"
import { set2FAEnabled, resetAuth } from "feature/auth/authSlice"
import { RootState, AppDispatch } from "redux/store"
import { removeAuthToken } from "utils/localStorageUtils"

interface TwoFASettingsProps {
    onRefreshToken: () => Promise<boolean>
}

export default function TwoFASettings({ onRefreshToken }: TwoFASettingsProps) {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()

    // Lấy state từ Redux store
    const {
        is2FAEnabled,
        is2FASetting,
        twoFA
    } = useSelector((state: RootState) => state.auth)

    const [localEnable2FA, setLocalEnable2FA] = useState(false)
    const [localLoading, setLocalLoading] = useState(true)
    const [localError, setLocalError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showQrCode, setShowQrCode] = useState(false)
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [countdownSeconds, setCountdownSeconds] = useState(5)

    // Tải cài đặt 2FA khi component mount
    useEffect(() => {
        const fetchSettings = async () => {
            setLocalLoading(true)
            setLocalError(null)

            // Đặt trạng thái ban đầu từ Redux store
            setLocalEnable2FA(is2FAEnabled)
            setLocalLoading(false)
        }

        fetchSettings()
    }, [is2FAEnabled])

    // Đếm ngược trước khi logout
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (showLogoutModal && countdownSeconds > 0) {
            timer = setTimeout(() => {
                setCountdownSeconds(prev => prev - 1);
            }, 1000);
        } else if (showLogoutModal && countdownSeconds === 0) {
            handleLogout();
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [showLogoutModal, countdownSeconds]);

    // Xử lý đăng xuất người dùng
    const handleLogout = () => {
        // Xóa tokens khỏi localStorage
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        removeAuthToken()

        // Reset trạng thái auth trong Redux
        dispatch(resetAuth())

        // Chuyển hướng đến trang đăng nhập
        navigate("/login", { replace: true })
    }

    // Cập nhật cài đặt 2FA
    const handleSaveSettings = async () => {
        setLocalError(null)
        setSuccess(null)

        // So sánh trạng thái 2FA hiện tại với trạng thái cài đặt mới
        const is2FASettingChanged = localEnable2FA !== is2FAEnabled;

        try {
            // Gọi action từ Redux thunk
            const resultAction = await dispatch(setting2FA({ enable2FA: localEnable2FA })).unwrap()

            // Xử lý kết quả
            if (resultAction) {
                // Cập nhật state trong Redux
                dispatch(set2FAEnabled(localEnable2FA))

                // Hiển thị thông báo thành công
                setSuccess("2FA settings updated successfully")

                // Hiển thị mã QR code nếu bật 2FA
                if (localEnable2FA && resultAction.qrCode) {
                    setShowQrCode(true)
                } else {
                    setShowQrCode(false)
                }

                // Nếu có sự thay đổi trạng thái 2FA, hiển thị modal thông báo đăng nhập lại
                if (is2FASettingChanged) {
                    setTimeout(() => {
                        setShowLogoutModal(true);
                    }, 1500);
                }
            }
        } catch (err: any) {
            if (err.message && err.message.includes("token expired")) {
                const refreshed = await onRefreshToken()
                if (refreshed) {
                    try {
                        const resultAction = await dispatch(setting2FA({ enable2FA: localEnable2FA })).unwrap()
                        dispatch(set2FAEnabled(localEnable2FA))
                        setSuccess("2FA settings updated successfully")

                        if (localEnable2FA && resultAction.qrCode) {
                            setShowQrCode(true)
                        } else {
                            setShowQrCode(false)
                        }

                        // Nếu có sự thay đổi trạng thái 2FA, hiển thị modal thông báo đăng nhập lại
                        if (is2FASettingChanged) {
                            setTimeout(() => {
                                setShowLogoutModal(true);
                            }, 1500);
                        }
                    } catch (refreshErr) {
                        setLocalError("Failed to update 2FA settings")
                    }
                } else {
                    setLocalError("Session expired. Please login again.")
                }
            } else {
                setLocalError(err.message || "Failed to update 2FA settings")
            }
        }
    }

    // Xử lý chuyển đổi trạng thái 2FA
    const handleToggle2FA = () => {
        if (!localLoading && !is2FASetting) {
            setLocalEnable2FA(!localEnable2FA);
        }
    };

    // Hiển thị lỗi từ cả Redux và local state
    const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || null

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
            <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="flex items-center text-xl font-semibold text-slate-50">
                    <ShieldCheck className="mr-2 h-5 w-5 text-cyan-400" />
                    Two-Factor Authentication Settings
                </h2>
                <p className="text-sm text-slate-400 mt-1">Enhance your account security with two-factor authentication</p>
            </div>

            <div className="p-6 space-y-6">
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

                {success && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-green-900/20 text-green-400 border border-green-900">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <p className="text-sm">{success}</p>
                    </div>
                )}

                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="enable2FA" className="flex-1 space-y-0.5 cursor-pointer">
                            <div className="text-base font-medium text-slate-300">Two-Factor Authentication</div>
                            <p className="text-sm text-slate-400">
                                {localEnable2FA
                                    ? "2FA is currently enabled for your account"
                                    : "Enable 2FA to add an extra layer of security"}
                            </p>
                        </label>
                        <div
                            className="cursor-pointer"
                            onClick={handleToggle2FA}
                        >
                            <div className={`relative flex h-5 w-9 rounded-full transition-colors ${localEnable2FA ? 'bg-cyan-600' : 'bg-slate-700'} ${(localLoading || is2FASetting) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${localEnable2FA ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`}
                                />
                            </div>
                            <input
                                type="checkbox"
                                id="enable2FA"
                                checked={localEnable2FA}
                                onChange={() => handleToggle2FA()}
                                disabled={localLoading || is2FASetting}
                                className="sr-only"
                            />
                        </div>
                    </div>
                </div>

                {/* Hiển thị QR Code khi bật 2FA và có mã QR */}
                {showQrCode && twoFA.qrCode && (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                        <h3 className="mb-2 font-medium text-slate-200 flex items-center">
                            <QrCode className="h-4 w-4 mr-2" />
                            Scan QR Code
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Scan this QR code with your authenticator app to set up 2FA.
                        </p>

                        <div className="flex justify-center p-4 bg-white rounded-md">
                            <img
                                src={twoFA.qrCode}
                                alt="2FA QR Code"
                                className="w-48 h-48"
                            />
                        </div>

                        {twoFA.secret && (
                            <div className="mt-4">
                                <p className="text-sm text-slate-400">If you can't scan the QR code, enter this code manually:</p>
                                <div className="p-2 mt-2 font-mono text-sm bg-slate-800 rounded border border-slate-600 text-slate-200">
                                    {twoFA.secret}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="mb-2 font-medium text-slate-200">How Two-Factor Authentication Works</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        When enabled, you'll need to enter both your password and a verification code from your authenticator app
                        when logging in.
                    </p>

                    <div className="space-y-3 text-sm text-slate-400">
                        <div className="flex items-start">
                            <div className="mr-2 rounded-full bg-cyan-900/20 p-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-xs font-medium">
                                    1
                                </span>
                            </div>
                            <div>
                                <p>Download an authenticator app</p>
                                <div className="mt-1 flex gap-2">
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                        Google Authenticator
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </a>
                                    <a
                                        href="https://authy.com/download/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                        Authy
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="mr-2 rounded-full bg-cyan-900/20 p-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-xs font-medium">
                                    2
                                </span>
                            </div>
                            <p>Scan the QR code provided during setup with your authenticator app</p>
                        </div>

                        <div className="flex items-start">
                            <div className="mr-2 rounded-full bg-cyan-900/20 p-1">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-xs font-medium">
                                    3
                                </span>
                            </div>
                            <p>Enter the 6-digit code from your app when logging in</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <h3 className="mb-2 font-medium text-slate-200 flex items-center text-amber-400">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Important Notice
                    </h3>
                    <p className="text-sm text-slate-400 mb-2">
                        When you change your two-factor authentication settings (enable or disable), you will be logged out automatically.
                    </p>
                    <p className="text-sm text-slate-400">
                        This is a security measure to ensure that only you can modify these important security settings.
                    </p>
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={localLoading || is2FASetting}
                    className="w-full py-2 px-4 rounded-md bg-cyan-600 text-white font-medium hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {is2FASetting ? "Saving..." : "Save Settings"}
                </button>
            </div>

            {/* Modal đăng xuất tự động */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-amber-600/20 p-2 rounded-full">
                                <LogOut className="h-6 w-6 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-100">Logging out</h3>
                        </div>

                        <p className="text-slate-300 mb-3">
                            Your two-factor authentication settings have been updated successfully.
                        </p>

                        <p className="text-slate-400 mb-6">
                            For security reasons, you will be logged out automatically in <span className="text-amber-400 font-medium">{countdownSeconds}</span> seconds. Please log in again with your new security settings.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                                Logout now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}