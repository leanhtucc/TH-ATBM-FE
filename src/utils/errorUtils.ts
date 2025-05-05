/* eslint-disable prettier/prettier */
export const handleApiError = (error: { response: { status: any; data: any }; request: any; message: any }) => {
  if (error.response) {
    // Lỗi từ server trả về
    const { status, data } = error.response
    switch (status) {
      case 400:
        return 'Yêu cầu không hợp lệ'
      case 401:
        return 'Chưa xác thực'
      case 403:
        return 'Từ chối quyền truy cập'
      case 404:
        return 'Không tìm thấy tài nguyên'
      case 500:
        return 'Lỗi hệ thống'
      default:
        return data.message ?? 'Đã có lỗi xảy ra'
    }
  } else if (error.request) {
    // Lỗi mạng
    return 'Không thể kết nối đến máy chủ'
  } else {
    // Lỗi khác
    return error.message ?? 'Lỗi không xác định'
  }
}

export const logError = () => {
  // console.error(`Error in ${context}:`, error)
  // Có thể tích hợp logging service như Sentry
}

export function timeoutPromise<T>(promiseFn: () => Promise<T>, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
      promiseFn()
          .then((result) => {
              clearTimeout(timer);
              resolve(result);
          })
          .catch((error) => {
              clearTimeout(timer);
              reject(error instanceof Error ? error : new Error(String(error)));
          });
  });
}