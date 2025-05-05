/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"
import { verify2FA } from "../../../../../feature/auth/authThunks"
import { RootState, store } from "../../../../../redux/store"
import QRCode from "../qrCode/qrCode"
import VerificationInput from "../verifyInput/verifyInput"
import QRIMage from "../../../../../assets/image/Screenshot 2025-04-28 104407.png"

interface TwoFactorAuthProps {
    userId?: string;
    email?: string;
    qrCode?: string | null;
    secret?: string | null;
    fromRegister?: boolean;
    initialStep?: number;
}

const TwoFactorAuth = (props: TwoFactorAuthProps) => {
    const [verificationCode, setVerificationCode] = useState<string>("")
    const [isVerified, setIsVerified] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [codeComplete, setCodeComplete] = useState<boolean>(false)
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

    // Initialize step from props or default to 1
    const [step, setStep] = useState<number>(props.initialStep || 1);

    const dispatch = useDispatch<typeof store.dispatch>()
    const navigate = useNavigate()
    const location = useLocation()

    // Lấy state từ Redux
    const authState = useSelector((state: RootState) => state.auth)

    // Gộp các thuộc tính từ props và location state
    const userId = props.userId ?? location.state?.userId ?? authState?.user?.id ?? ""
    const email = props.email ?? location.state?.email ?? authState?.user?.email ?? ""
    const fromRegister = props.fromRegister ?? location.state?.fromRegister ?? false
    const is2FAVerified = authState?.is2FAVerified || false

    // Lấy QR code và secret từ location state (được chuyển từ trang đăng ký)
    // Hoặc từ Redux state nếu có
    const qrCodeBase64 = props.qrCode ?? location.state?.qrCode ?? authState?.twoFA?.qrCode
    const secretValue = props.secret ?? location.state?.secret ?? authState?.twoFA?.secret

    // Log available information for debugging
    useEffect(() => {
        console.log("TwoFactorAuth Component Props:", {
            userId,
            email,
            fromRegister,
            initialStep: props.initialStep,
            currentStep: step,
            qrCode: qrCodeBase64 ? "Available" : "Not available",
            secret: secretValue
        });
    }, [userId, email, fromRegister, props.initialStep, step, qrCodeBase64, secretValue]);

    // Chuyển hướng khi xác thực thành công
    useEffect(() => {
        if (is2FAVerified || isVerified) {
            // Chờ một chút để người dùng thấy thông báo thành công
            const redirectTimer = setTimeout(() => {
                // Always redirect to the home page regardless of where the user came from
                navigate("/", { replace: true });
            }, 1500);

            return () => clearTimeout(redirectTimer);
        }
    }, [is2FAVerified, isVerified, navigate]);

    // Initialize to the correct step if provided
    useEffect(() => {
        if (props.initialStep) {
            console.log(`Setting initial step to ${props.initialStep} from props`);
            setStep(props.initialStep);
        }
    }, [props.initialStep]);

    // For a 3-step authentication process
    const totalSteps = 3;

    // Xử lý khi mã xác thực thay đổi
    useEffect(() => {
        // Reset thông báo khi mã thay đổi
        setVerifyMessage(null);

        // Kiểm tra khi mã đạt đủ 6 số
        if (verificationCode.length === 6) {
            setCodeComplete(true);
            setVerifyMessage("Mã đã nhập đủ 6 số. Bấm nút Xác thực để tiếp tục.");

            // Kiểm tra thời gian còn lại của mã
            const now = Math.floor(Date.now() / 1000);
            const secondsLeft = 30 - (now % 30);

            if (secondsLeft < 5) {
                setVerifyMessage("⚠️ Mã sắp hết hạn, bạn có thể đợi mã mới để đảm bảo xác thực thành công!");
            }
        } else {
            setCodeComplete(false);
        }
    }, [verificationCode]);

    const handleVerifyCode = async () => {
        if (verificationCode.length !== 6) {
            setError("Vui lòng nhập mã xác thực 6 chữ số");
            return;
        }

        setIsLoading(true);
        setError(null);
        setVerifyMessage(null);
        
        try {
            // Format code và log chi tiết
            const formattedCode = String(verificationCode).padStart(6, '0');
            const currentUserId = String(userId);

            console.log("Verify 2FA Request:", {
                userId: currentUserId,
                twoFACode: formattedCode,
                time: new Date().toISOString()
            });

            const result = await dispatch(verify2FA({
                userId: currentUserId,
                twoFACode: formattedCode
            })).unwrap();

            console.log("Verification result:", result);

            if (result && (result.success || result.status === 200)) {
                setIsVerified(true);
                setVerifyMessage("Xác thực thành công!");
            } else {
                setError(result?.message || "Xác thực không thành công. Vui lòng thử lại.");
            }
        } catch (err: any) {
            console.error("Verification failed:", err);
            const errorMsg = err?.response?.data?.message || err?.message || "Xác thực không thành công";
            setError(errorMsg);

            // Hiển thị thêm thông tin debug
            console.error("Full error:", err);
            console.error("Time of error:", new Date().toISOString());
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1)
        } else {
            handleVerifyCode()
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const getQRCodeForStep = () => {
        switch (step) {
            case 1:
                // Step 1: QR code để tải ứng dụng
                return (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex space-x-4">
                            <div>
                                <p className="text-center text-sm font-medium mb-2">Android</p>
                                <QRCode
                                    imageUrl={QRIMage}
                                    size={150}
                                    alt="Download Authenticator for Android"
                                />
                            </div>
                        </div>
                        <div className="text-center text-sm text-gray-500 mt-4">
                            <p>Quét mã QR với camera điện thoại để tải ứng dụng Google Authenticator</p>
                            <p className="mt-2">Hoặc tải trực tiếp từ:</p>
                            <div className="flex justify-center space-x-4 mt-2">
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.authy.authy&pcampaignid=web_share"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Google Play
                                </a>
                                <a
                                    href="https://apps.apple.com/vn/app/twilio-authy/id494168017?l=vi"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    App Store
                                </a>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                // Step 2: QR code để thiết lập 2FA từ base64 string
                return (
                    <div className="flex flex-col items-center space-y-4">
                        {qrCodeBase64 ? (
                            <QRCode
                                base64String={qrCodeBase64}
                                size={200}
                                alt="2FA QR Code"
                            />
                        ) : (
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                                <p>Không tìm thấy mã QR. Vui lòng quay lại đăng ký.</p>
                            </div>
                        )}

                        {secretValue && (
                            <div className="w-full max-w-xs bg-gray-50 p-3 rounded-md border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Hoặc nhập mã này vào ứng dụng:</p>
                                <p className="font-mono text-sm overflow-auto p-1 bg-gray-100 rounded">{secretValue}</p>
                            </div>
                        )}

                        <div className="text-center text-sm text-gray-500 mt-4">
                            <p>Mở ứng dụng Google Authenticator và quét mã QR này để thiết lập 2FA.</p>
                            <p className="mt-2">
                                Sau khi quét, ứng dụng sẽ tạo mã 6 chữ số mới sau mỗi 30 giây.
                            </p>
                        </div>
                    </div>
                );
            case 3:
                // Step 3: Input để nhập mã xác thực
                return (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-full max-w-xs">
                            <VerificationInput
                                length={6}
                                onChange={setVerificationCode}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Thông báo xác nhận khi nhập đủ 6 số */}
                        {codeComplete && !error && verifyMessage && (
                            <div className="w-full max-w-xs p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
                                {verifyMessage}
                            </div>
                        )}

                        {/* Hiển thị lỗi nếu có */}
                        {error && (
                            <div className="w-full max-w-xs p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                {typeof error === 'object' ? (error as any).message ?? 'Đã xảy ra lỗi' : error}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                    {isVerified
                        ? "Xác thực thành công"
                        : `Bước ${step} / ${totalSteps}: ${step === 1 ? "Tải ứng dụng xác thực" : step === 2 ? "Thiết lập 2FA" : "Nhập mã xác thực"}`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {isVerified
                        ? "Bạn sẽ được chuyển hướng đến trang chủ."
                        : step === 1
                            ? "Quét mã QR để tải ứng dụng Google Authenticator"
                            : step === 2
                                ? "Quét mã QR này bằng ứng dụng Google Authenticator"
                                : "Nhập mã 6 chữ số từ ứng dụng Google Authenticator"}
                </p>
            </div>

            {/* Card Content */}
            <div className="p-6">
                {isVerified ? (
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-center text-green-600 font-medium mb-2">
                            Xác thực hai yếu tố thành công!
                        </p>
                        <p className="text-center text-sm text-gray-500">
                            {fromRegister
                                ? "Tài khoản của bạn đã được tạo và bảo vệ bằng xác thực hai yếu tố."
                                : "Tài khoản của bạn đã được bảo vệ bằng xác thực hai yếu tố."}
                        </p>
                    </div>
                ) : (
                    getQRCodeForStep()
                )}
            </div>

            {/* Card Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-between">
                {!isVerified && (
                    <>
                        <button
                            onClick={handleBack}
                            disabled={step === 1 || isLoading}
                            className={`flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium transition-colors ${(step === 1 || isLoading)
                                ? "opacity-50 cursor-not-allowed bg-gray-100"
                                : "hover:bg-gray-50 text-gray-700"
                                }`}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                        </button>
                        <button
                            onClick={step === 3 ? handleVerifyCode : handleNext}
                            disabled={(step === 3 && verificationCode.length !== 6) || isLoading}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${(step === 3 && verificationCode.length !== 6) || isLoading
                                ? "opacity-50 cursor-not-allowed bg-purple-400"
                                : "bg-purple-600 hover:bg-purple-700"
                                }`}
                        >
                            {step === 3 ? (isLoading ? "Đang xác thực..." : "Xác thực") : "Tiếp theo"}
                            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </button>
                    </>
                )}

                {isVerified && (
                    <button
                        onClick={() => navigate("/")}
                        className="w-full flex justify-center items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                        Đi đến trang chủ
                    </button>
                )}
            </div>
        </div>
    )
}

export default TwoFactorAuth
