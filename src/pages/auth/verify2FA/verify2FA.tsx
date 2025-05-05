/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { useEffect, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"
import TwoFactorAuth from "./components/twoFactorAuth/twoFactorAuth"
import { RootState } from "redux/store";
import { resetRedirectFlag } from "feature/auth/authSlice";

export default function Verify2FAPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const authState = useSelector((state: RootState) => state.auth);

    // Extract registration data from location state or auth state
    const registrationData = location.state?.registrationData ?? authState?.registrationData;

    // Extract QR code and secret from all possible sources
    const [qrCode, setQrCode] = useState<string | null>(
        location.state?.qrCode ??
        registrationData?.twoFAData?.qrCode ??
        authState?.twoFA?.qrCode
    );
    const [secret, setSecret] = useState<string | null>(
        location.state?.secret ??
        registrationData?.twoFAData?.secret ??
        registrationData?.user?.twoFASecret ??
        authState?.twoFA?.secret
    );

    // Lấy dữ liệu từ location state
    const userId = location.state?.userId ??
        registrationData?.user?.id ??
        authState?.user?.id;
    const email = location.state?.email ??
        registrationData?.user?.email ??
        authState?.user?.email;
    const fromRegister = location.state?.fromRegister ?? false;
    const isAuthenticated = authState?.isAuthenticated ?? false;
    const is2FAVerified = authState?.is2FAVerified ?? false;

    // For determining which step to start on - always start at step 1
    const [initialStep, setInitialStep] = useState<number>(1);

    // Reset redirect flag để tránh vòng lặp
    useEffect(() => {
        dispatch(resetRedirectFlag());

        // If we don't have QR or secret but have email, attempt to retrieve from localStorage
        if ((!qrCode || !secret) && email) {
            try {
                const storedTwoFAData = localStorage.getItem('twoFASetupData');
                if (storedTwoFAData) {
                    const twoFAMap = JSON.parse(storedTwoFAData);
                    if (twoFAMap[email]) {
                        console.log("Found stored 2FA setup data for email:", email);
                        if (!qrCode) {
                            setQrCode(twoFAMap[email].qrCode);
                        }
                        if (!secret) {
                            setSecret(twoFAMap[email].secret);
                        }
                    }
                }
            } catch (e) {
                console.error("Error retrieving stored 2FA setup data:", e);
            }
        }
    }, [dispatch, email, qrCode, secret]);

    useEffect(() => {
        // Log để debug
        console.log("Verify2FA Page State:", {
            userId,
            email,
            fromRegister,
            isAuthenticated,
            is2FAVerified,
            locationState: location.state,
            registrationData,
            qrCode: qrCode ? "Available (truncated)" : "Not available",
            secret: secret ? "Available (truncated)" : "Not available"
        });

        // Always start at step 1 for existing accounts
        setInitialStep(1);

        // Nếu đã xác thực và đăng nhập, chuyển đến home
        if (isAuthenticated && is2FAVerified) {
            navigate("/", { replace: true });
            return;
        }
    }, [userId, email, isAuthenticated, is2FAVerified, navigate, location.state, qrCode]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Xác thực hai yếu tố</h1>
                    <p className="text-gray-600 mt-2">
                        {fromRegister
                            ? "Thiết lập bảo mật cho tài khoản mới của bạn"
                            : "Nhập mã xác thực để truy cập tài khoản của bạn"}
                    </p>

                    {/* Step indicator for 3-step authentication process */}
                    <div className="flex justify-center mt-6 mb-6">
                        <div className="flex items-center">
                            {/* Step 1: Download App */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${initialStep > 1 ? "bg-green-500" : "bg-purple-600"
                                } text-white`}>
                                1
                            </div>
                            <div className={`h-1 w-16 ${initialStep > 1 ? "bg-green-500" : "bg-gray-300"}`}></div>

                            {/* Step 2: Scan QR */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${initialStep === 2 ? "bg-purple-600" : initialStep > 2 ? "bg-green-500" : "bg-gray-300"
                                } text-white`}>
                                2
                            </div>
                            <div className={`h-1 w-16 ${initialStep > 2 ? "bg-green-500" : "bg-gray-300"}`}></div>

                            {/* Step 3: Enter Code */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${initialStep === 3 ? "bg-purple-600" : "bg-gray-300"
                                } text-white`}>
                                3
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center text-xs text-gray-500 mt-2 space-x-8">
                        <span className={initialStep === 1 ? "font-semibold text-purple-600" : ""}>Tải ứng dụng</span>
                        <span className={initialStep === 2 ? "font-semibold text-purple-600" : ""}>Quét mã QR</span>
                        <span className={initialStep === 3 ? "font-semibold text-purple-600" : ""}>Nhập mã xác thực</span>
                    </div>
                </div>

                {(userId || qrCode) ? (
                    <TwoFactorAuth
                        userId={userId}
                        email={email}
                        qrCode={qrCode}
                        secret={secret}
                        fromRegister={fromRegister}
                        initialStep={initialStep}
                    />
                ) : (
                    <div className="bg-white rounded-lg p-6 shadow-md text-center">
                        <p className="text-red-500">Không tìm thấy thông tin xác thực cần thiết.</p>
                        <button
                            onClick={() => navigate("/login", { replace: true })}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md"
                        >
                            Quay lại đăng nhập
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}