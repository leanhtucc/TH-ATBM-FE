/* eslint-disable no-console */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prettier/prettier */
"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Eye, Edit, Trash2, Search, AlertCircle, ExternalLink } from 'lucide-react'
import { getAllPasswords as fetchAllPasswords, deletePassword as removePassword } from "feature/password/passwordThunk"
import { resetPasswordStatus } from "feature/password/passwordSlice"
import { RootState, AppDispatch } from "redux/store"

interface PasswordListProps {
    onViewPassword: (id: string) => void
    onEditPassword: (id: string) => void
    onRefreshToken: () => Promise<boolean>
}

export default function PasswordList({ onViewPassword, onEditPassword, onRefreshToken }: PasswordListProps) {
    const dispatch = useDispatch<AppDispatch>()
    const { passwords, loading, error, isPasswordDeleted, isPasswordAdded, isPasswordUpdated } = useSelector((state: RootState) => state.password)

    const [searchQuery, setSearchQuery] = useState("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [passwordToDelete, setPasswordToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [localError, setLocalError] = useState<string | null>(null)

    const fetchPasswords = async () => {
        try {
            await dispatch(fetchAllPasswords()).unwrap()
        } catch (err) {
            if (typeof err === "string" && err.includes("token expired")) {
                const refreshed = await onRefreshToken()
                if (refreshed) {
                    try {
                        await dispatch(fetchAllPasswords()).unwrap()
                    } catch (refreshErr) {
                        setLocalError("Failed to load passwords")
                    }
                } else {
                    setLocalError("Session expired. Please login again.")
                }
            } else {
                setLocalError(err as string)
            }
        }
    }

    useEffect(() => {
        fetchPasswords()

        // Reset status flags when component mounts
        return () => {
            dispatch(resetPasswordStatus())
        }
    }, [dispatch, onRefreshToken])

    useEffect(() => {
        // Nếu có trạng thái thành công từ việc thêm, sửa hoặc xóa mật khẩu
        if (isPasswordAdded || isPasswordUpdated || isPasswordDeleted) {
            fetchPasswords();
            dispatch(resetPasswordStatus());
        }
    }, [isPasswordAdded, isPasswordUpdated, isPasswordDeleted]);

    useEffect(() => {
        // Close delete dialog when password is successfully deleted
        if (isPasswordDeleted && deleteDialogOpen) {
            setDeleteDialogOpen(false)
            setPasswordToDelete(null)
        }
    }, [isPasswordDeleted, deleteDialogOpen])

    // Ensure passwords is an array before filtering
    const passwordsArray = Array.isArray(passwords) ? passwords : []
    const filteredPasswords = passwordsArray.filter(
        (password: { website: string; username: string }) =>
            password.website.toLowerCase().includes(searchQuery.toLowerCase()) ||
            password.username.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleDeleteClick = (id: string) => {
        setPasswordToDelete(id)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!passwordToDelete) {
            return;
        }

        setIsDeleting(true)
        setLocalError(null)

        try {
            const result = await dispatch(removePassword(passwordToDelete)).unwrap()
            console.log("Delete API response:", result);
        } catch (err) {
            console.error("Error deleting password:", err);

            if (typeof err === "string" && err.includes("token expired")) {
                const refreshed = await onRefreshToken()
                if (refreshed) {
                    try {
                        const retryResult = await dispatch(removePassword(passwordToDelete)).unwrap()
                        console.log("Delete API response after token refresh:", retryResult);
                    } catch (retryErr) {
                        console.error("Error deleting password after token refresh:", retryErr);
                        setLocalError("Failed to delete password")
                    }
                } else {
                    setLocalError("Session expired. Please login again.")
                }
            } else if (typeof err === "string") {
                setLocalError(err)
            } else if (typeof err === "object" && err !== null) {
                const errorObj = err as any;
                // Xử lý trường hợp lỗi là đối tượng với thuộc tính message
                if (errorObj.message) {
                    setLocalError(errorObj.message);
                } else {
                    setLocalError("Không thể xóa mật khẩu");
                }
            } else {
                setLocalError("Không thể xóa mật khẩu")
            }
        } finally {
            setIsDeleting(false)
        }
    }

    const formatDate = (password: any) => {
        const createdDate = password.created_at || password.createdAt;
        if (!createdDate) return "N/A";
        try {
            return new Date(createdDate).toLocaleDateString();
        } catch (e) {
            console.error("Invalid date format:", createdDate);
            return "Invalid date";
        }
    }

    const formatUpdatedDate = (password: any) => {
        const updatedDate = password.updated_at || password.updatedAt;
        if (!updatedDate) return "N/A";
        try {
            return new Date(updatedDate).toLocaleDateString();
        } catch (e) {
            console.error("Invalid date format:", updatedDate);
            return "Invalid date";
        }
    }

    // Use either Redux error or local error
    const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || error

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 shadow-lg">
            <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-semibold text-slate-50">Your Passwords</h2>
                <p className="text-sm text-slate-400 mt-1">Manage all your saved passwords</p>
            </div>

            <div className="p-6 space-y-4">
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

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="search"
                        placeholder="Search passwords..."
                        className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-700 text-slate-100 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="text-slate-400">Loading passwords...</div>
                    </div>
                ) : filteredPasswords.length > 0 ? (
                    <div className="rounded-md border border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-900/50 text-slate-300 text-sm">
                                    <tr className="border-b border-slate-700">
                                        <th className="px-4 py-3 font-medium">Website</th>
                                        <th className="px-4 py-3 font-medium">Username</th>
                                        <th className="px-4 py-3 font-medium">Created</th>
                                        <th className="px-4 py-3 font-medium">Updated</th>
                                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPasswords.map((password: any, index: number) => {
                                        const uniqueKey = password.id || `password-${index}`;

                                        return (
                                            <tr key={uniqueKey} className="border-b border-slate-700 hover:bg-slate-700/30">
                                                <td className="px-4 py-3 font-medium text-slate-200">
                                                    <div className="flex items-center">
                                                        {password.website}
                                                        {typeof password.website === "string" && password.website.startsWith("http") && (
                                                            <a
                                                                href={password.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ml-1 text-slate-400 hover:text-slate-300"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-300">{password.username}</td>
                                                <td className="px-4 py-3 text-slate-400">{formatDate(password)}</td>
                                                <td className="px-4 py-3 text-slate-400">{formatUpdatedDate(password)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            className="p-1 rounded-md text-slate-400 hover:text-cyan-500 hover:bg-slate-700"
                                                            onClick={() => {
                                                                if (password.id) onViewPassword(password.id);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-700"
                                                            onClick={() => {
                                                                if (password.id) onEditPassword(password.id);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-700"
                                                            onClick={() => {
                                                                if (password.id) handleDeleteClick(password.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-700 text-xs text-slate-400">
                            {filteredPasswords.length} {filteredPasswords.length === 1 ? 'password' : 'passwords'} found
                            {searchQuery && (
                                <span> for "{searchQuery}"</span>
                            )}
                            <span className="hidden sm:inline"> • Scroll horizontally if needed</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-40 flex-col items-center justify-center rounded-md border border-slate-700 p-5 text-center">
                        <p className="text-lg text-slate-300">No passwords found</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {searchQuery ? "Try a different search term" : "Add your first password to get started"}
                        </p>
                    </div>
                )}
            </div>

            {deleteDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-slate-100">Are you sure?</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            This action cannot be undone. This will permanently delete the password from your account.
                        </p>

                        {localError && (
                            <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-red-900/20 text-red-400 border border-red-900">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">
                                    {typeof localError === 'object'
                                        ? (localError as any).message ?? 'An error occurred'
                                        : localError}
                                </p>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteDialogOpen(false)}
                                className="px-4 py-2 rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
