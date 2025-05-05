/* eslint-disable prettier/prettier */
"use client"

interface QRCodeProps {
    imageUrl?: string;
    size?: number;
    alt?: string;
    base64String?: string;
}

const QRCode = ({ imageUrl, size = 200, alt = "QR Code", base64String }: QRCodeProps) => {
    // Ưu tiên sử dụng base64String nếu được cung cấp
    const srcToUse = base64String ?? imageUrl;

    if (!srcToUse) {
        return (
            <div
                className="flex items-center justify-center bg-gray-100 rounded-lg"
                style={{ width: size, height: size }}
            >
                <p className="text-sm text-gray-500">QR code không có sẵn</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
            <img
                src={srcToUse}
                alt={alt}
                width={size}
                height={size}
                className="max-w-full h-auto"
            />
        </div>
    );
}

export default QRCode;