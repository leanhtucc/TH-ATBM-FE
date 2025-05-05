/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react"
import { Select } from "antd"
import { useDispatch } from "react-redux"
import { registerUser } from "../../../feature/auth/authThunks"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { registerSchema } from "validateSchema/authSchema"
import { store } from "redux/store"

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [enable2FA, setEnable2FA] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dispatch = useDispatch<typeof store.dispatch>()
  const navigate = useNavigate()


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      enable2FA: true,
    },
  })

  async function onSubmit(data: RegisterFormValues) {
    try {
      setLoading(true);
      setError(null);

      const result = await dispatch(registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        enable2FA: enable2FA
      })).unwrap();


      // Store the user ID in localStorage if available (as a fallback for 2FA)
      const userId = result.data?.user?.id ?? result.data?.userId ?? '';

      // Store 2FA data in localStorage keyed by email for retrieval during login
      if (enable2FA && result.data?.twoFAData) {
        // Store 2FA setup data in localStorage keyed by email
        const twoFAStorage = {
          userId: userId,
          secret: result.data.twoFAData.secret ?? result.data.user?.twoFASecret,
          qrCode: result.data.twoFAData.qrCode,
          createdAt: new Date().toISOString()
        };

        // Store as a map of email -> 2FA data
        const existingData = localStorage.getItem('twoFASetupData');
        const twoFAMap = existingData ? JSON.parse(existingData) : {};
        twoFAMap[data.email] = twoFAStorage;

        localStorage.setItem('twoFASetupData', JSON.stringify(twoFAMap));
      }

      if (userId) {
        localStorage.setItem('registeredUserId', userId);
      }

      // Modify this section to always redirect to login
      navigate("/login", {
        state: {
          registrationSuccess: true,
          email: data.email,
          message: enable2FA
            ? "Đăng ký thành công! Vui lòng đăng nhập và xác thực 2FA."
            : "Đăng ký thành công! Vui lòng đăng nhập.",
          userId: userId // Pass userId in location state as well
        },
        replace: true
      });
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message ?? "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-2">Sign up to get started with our service</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
          <div className="bg-purple-600 py-4">
            <h2 className="text-center text-xl font-semibold text-white">Register</h2>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className={`w-full pl-10 pr-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:outline-none ${errors.name
                      ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                      : "border-gray-300 focus:border-purple-300 focus:ring-purple-100"
                      }`}
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className={`w-full pl-10 pr-3 py-2 text-gray-900 border rounded-md focus:ring-2 focus:outline-none ${errors.email
                      ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                      : "border-gray-300 focus:border-purple-300 focus:ring-purple-100"
                      }`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className={`w-full pl-10 pr-10 py-2 text-gray-900 border rounded-md focus:ring-2 focus:outline-none ${errors.password
                      ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                      : "border-gray-300 focus:border-purple-300 focus:ring-purple-100"
                      }`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className={`w-full pl-10 pr-10 py-2 text-gray-900 border rounded-md focus:ring-2 focus:outline-none ${errors.confirmPassword
                      ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                      : "border-gray-300 focus:border-purple-300 focus:ring-purple-100"
                      }`}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="enable2FA" className="block text-sm font-medium text-gray-700">
                  Enable Two-Factor Authentication
                </label>
                <Select
                  defaultValue="True"
                  className="w-full border-gray-300 rounded-md"
                  onChange={(value) => setEnable2FA(value === "True")}
                >
                  <Select.Option value="True">True</Select.Option>
                  <Select.Option value="False">False</Select.Option>
                </Select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="text-purple-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}