/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
"use client"

import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { LogOut, Key, Plus, Settings } from 'lucide-react'
import { useNavigate } from "react-router-dom"
import PasswordList from "./components/passwordList/passwordList"
import ViewPasswordDetails from "./components/viewPassword/viewPassword"
import AddPasswordForm from "./components/addPasswordForm/addPasswordForm"
import EditPasswordForm from "./components/editPasswordForm/editPasswordForm"
import TwoFASettings from "./components/twoSettingAuth/twoSettingPassword"
import { resetAuth } from "feature/auth/authSlice"
import { AppDispatch } from "redux/store"
import { setNavigationFunction } from "utils/apiUtils"

export default function Dashboard() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [activeTab, setActiveTab] = useState("passwords")
  const [selectedPasswordId, setSelectedPasswordId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "view" | "add" | "edit">("list")

  // Set up the navigation function for automatic redirects when token expires
  useEffect(() => {
    const navigateToLogin = () => {
      console.log("Token expired, automatically redirecting to login")
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      dispatch(resetAuth())
      navigate("/login")
    }

    setNavigationFunction(navigateToLogin)

    return () => setNavigationFunction(() => { })
  }, [navigate, dispatch])

  // Kiểm tra token validity khi component mount và khi token thay đổi
  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      navigate("/login")
      return
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expTime = payload.exp * 1000

      if (Date.now() >= expTime) {
        console.log("Token has expired")
        handleLogout()
        return
      }
    } catch (err) {
      console.error("Invalid token:", err)
      handleLogout()
    }
  }, [navigate])

  const handleLogout = () => {
    dispatch(resetAuth())
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    navigate("/login")
  }

  const handleTokenExpired = () => {
    console.log("Token expired, redirecting to login page")
    dispatch(resetAuth())
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    navigate("/login")
    return false
  }

  const handleTokenRefresh = async () => {
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken")
      if (!refreshTokenValue) {
        return handleTokenExpired()
      }

      return handleTokenExpired()
    } catch (error) {
      console.error("Failed to refresh token:", error)
      return handleTokenExpired()
    }
  }

  const handleViewPassword = (id: string) => {
    setSelectedPasswordId(id)
    setViewMode("view")
  }

  const handleEditPassword = (id: string) => {
    setSelectedPasswordId(id)
    setViewMode("edit")
  }

  const handleAddPassword = () => {
    setViewMode("add")
  }

  const handleBackToList = () => {
    setViewMode("list")
    setSelectedPasswordId(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-50">
      <header className="border-b border-slate-700 bg-slate-900/60 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-50">Password Manager</h1>
          <button
            onClick={handleLogout}
            className="flex items-center rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex rounded-md bg-slate-800/50 p-1">
              <button
                onClick={() => setActiveTab("passwords")}
                className={`flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "passwords"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }`}
              >
                <Key className="mr-2 h-4 w-4" />
                Passwords
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "settings"
                  ? "bg-cyan-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }`}
              >
                <Settings className="mr-2 h-4 w-4" />
                2FA Settings
              </button>
            </div>

            {activeTab === "passwords" && viewMode === "list" && (
              <button
                onClick={handleAddPassword}
                className="flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Password
              </button>
            )}
          </div>

          {activeTab === "passwords" && (
            <>
              {viewMode === "list" && (
                <PasswordList
                  onViewPassword={handleViewPassword}
                  onEditPassword={handleEditPassword}
                  onRefreshToken={handleTokenRefresh}
                />
              )}

              {viewMode === "view" && selectedPasswordId && (
                <ViewPasswordDetails
                  passwordId={selectedPasswordId}
                  onBack={handleBackToList}
                  onEdit={() => handleEditPassword(selectedPasswordId)}
                  onRefreshToken={handleTokenRefresh}
                />
              )}

              {viewMode === "add" && (
                <AddPasswordForm
                  onSuccess={handleBackToList}
                  onCancel={handleBackToList}
                  onRefreshToken={handleTokenRefresh}
                />
              )}

              {viewMode === "edit" && selectedPasswordId && (
                <EditPasswordForm
                  passwordId={selectedPasswordId}
                  onSuccess={handleBackToList}
                  onCancel={handleBackToList}
                  onRefreshToken={handleTokenRefresh}
                />
              )}
            </>
          )}

          {activeTab === "settings" && <TwoFASettings onRefreshToken={handleTokenRefresh} />}
        </div>
      </main>
    </div>
  )
}