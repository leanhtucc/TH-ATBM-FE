/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { loginUser } from "../../../feature/auth/authThunks"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { RootState, store } from "../../../redux/store"
import { resetRedirectFlag } from "feature/auth/authSlice"

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const dispatch = useDispatch<typeof store.dispatch>()
  const navigate = useNavigate()
  const location = useLocation()

  // Lấy thông tin từ location state (từ trang Register)
  const registrationSuccess = location.state?.registrationSuccess ?? false;
  const registrationMessage = location.state?.message ?? "";
  const registeredEmail = location.state?.email ?? "";

  // Lấy state từ Redux
  const authState = useSelector((state: RootState) => state.auth);
  const isLoading = authState?.loading || false;
  const error = authState?.error ?? null;
  const isAuthenticated = authState?.isAuthenticated || false;
  const is2FAEnabled = authState?.is2FAEnabled || false;

  // Debug để kiểm tra userId
  useEffect(() => {
    console.log("Current auth state:", {
      isAuthenticated,
      is2FAEnabled,
      user: authState.user,
      userId: authState.user?.id,
    });
  }, [authState]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: registeredEmail ?? "",
      password: "",
      rememberMe: false,
    },
  })

  // Điền email từ location state vào form nếu có
  useEffect(() => {
    if (registeredEmail) {
      setValue("email", registeredEmail);
    }
  }, [registeredEmail, setValue]);

  // Trong phương thức onSubmit
  async function onSubmit(data: LoginFormValues) {
    setLocalError(null);

    try {
      const result = await dispatch(loginUser({
        email: data.email,
        password: data.password
      })).unwrap();


      // Kiểm tra cấu trúc response
      const user = result.data?.user ?? result.user;
      const requireTwoFA =
        result.requireTwoFA === true ||
        result.data?.requireTwoFA === true ||
        result.message?.includes("xác thực 2 bước");

      if (requireTwoFA) {

        // Tìm userId từ các vị trí có thể có
        let userId =
          result.userId ||
          result.data?.userId ||
          (user && (user.id || user._id)) ||
          localStorage.getItem('registeredUserId');

        // Try to retrieve stored 2FA data for this email
        let qrCode = result.qrCode ??
          result.data?.qrCode ??
          result.data?.twoFAData?.qrCode;

        let secret = result.secret ??
          result.data?.secret ??
          result.data?.twoFAData?.secret ??
          result.twoFASecret ??
          result.data?.twoFASecret;

        // If no QR code found in response, try to get from localStorage
        if (!qrCode || !secret) {
          try {
            const storedTwoFAData = localStorage.getItem('twoFASetupData');
            if (storedTwoFAData) {
              const twoFAMap = JSON.parse(storedTwoFAData);
              const userData = twoFAMap[data.email];

              if (userData) {
                console.log("Found stored 2FA data for:", data.email);
                qrCode = userData.qrCode ?? qrCode;
                secret = userData.secret ?? secret;
                userId = userData.userId ?? userId;
              }
            }
          } catch (e) {
            console.error("Error retrieving stored 2FA data:", e);
          }
        }

        // If still no userId but we have email, create an email-based identifier
        if (!userId && data.email) {
          userId = `email:${data.email}`;
        }

        console.log("Extracted 2FA verification information:", {
          userId,
          email: data.email,
          hasQRCode: !!qrCode,
          hasSecret: !!secret
        });

        // Create a payload with all relevant data for the verification page
        const verificationPayload = {
          userId: userId,
          email: data.email,
          qrCode: qrCode,
          secret: secret,
          registrationData: result.data,  // Include full registration data
          timestamp: new Date().getTime() // Add timestamp to prevent caching issues
        };

        if (userId) {
          // Chuyển đến trang xác thực 2FA with all relevant information
          navigate("/verify-2fa", {
            state: verificationPayload,
            replace: true
          });
        } else {
          setLocalError("Không thể xác thực 2FA: thiếu thông tin người dùng");
        }
      } else {
        // Không cần 2FA, điều hướng thẳng đến trang chủ
        console.log("2FA is not enabled, redirecting to home page");

        if (user && (user.id || user._id)) {
          navigate("/", { replace: true });
        } else {
          console.warn("User ID not found in response");
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setLocalError(err.message ?? "Đăng nhập thất bại. Vui lòng thử lại.");
    }
  }

  // Sửa useEffect để không xử lý redirect khi onSubmit đã xử lý
  useEffect(() => {
    // Nếu người dùng đã đăng nhập và có trong state, nhưng không phải do onSubmit điều hướng
    // (trường hợp refresh page hoặc direct access)
    if (authState.isAuthenticated && !authState.is2FAEnabled && authState.user) {
      navigate("/", { replace: true });
      return;
    }

    // Xử lý trường hợp cần xác thực 2FA (khi refresh page)
    if (authState.is2FAEnabled && authState.user && authState.user.id && authState.redirectAfterLogin) {
      dispatch(resetRedirectFlag());

      navigate("/verify-2fa", {
        state: {
          userId: authState.user.id,
          email: authState.user.email
        },
        replace: true
      });
    }
  }, [authState.isAuthenticated, authState.is2FAEnabled, authState.redirectAfterLogin]);
  const displayError: string | { message?: string } | null = (localError as string | { message?: string } | null) || error
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to access your account</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
          <div className="bg-purple-600 py-4">
            <h2 className="text-center text-xl font-semibold text-white">Login</h2>
          </div>
          <div className="p-6">
            {/* Hiển thị thông báo từ trang đăng ký */}
            {registrationSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
                {registrationMessage ?? "Đăng ký thành công! Vui lòng đăng nhập."}
              </div>
            )}

            {/* Hiển thị thông báo lỗi nếu có */}
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    placeholder="Enter your password"
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
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${isLoading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-purple-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}