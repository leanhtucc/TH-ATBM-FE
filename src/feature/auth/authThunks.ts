/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { createAsyncThunk } from '@reduxjs/toolkit'
import AuthService from 'service/authService'
import { timeoutPromise } from 'utils/errorUtils'


export const loginUser = createAsyncThunk(
  "auth/loginUser", 
  async ({ email, password }: { email: string, password: string }, { rejectWithValue }) => {
    try {
      
      const response = await AuthService.login(email, password);
      
      // Extract userId from response (should be in multiple places now)
      const userId = 
        response.data.userId || 
        response.data.data?.userId || 
        response.data.normalizedData?.userId;
      
      
      // Check if token exists in response
      if (response.data.data?.accessToken) {
        localStorage.setItem("accessToken", response.data.data.accessToken);
      } else if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
      }
      
      // Xác định nếu cần 2FA
      const requireTwoFA = 
        response.data.requireTwoFA === true || 
        response.data.data?.requireTwoFA === true || 
        response.data.message?.includes("xác thực 2 bước");
      
      // Fallback: If user registered with 2FA and we have their ID from registration response
      const registeredUserId = localStorage.getItem('registeredUserId');
      
      // Create an object with the userId in all possible locations for maximum compatibility
      const responseData = {
        ...response.data,
        requireTwoFA: requireTwoFA,
        userId: userId || registeredUserId || '', // Ensure userId is set
        user: {
          ...response.data.user,
          id: userId || registeredUserId || '',
        },
        data: {
          ...response.data.data,
          userId: userId || registeredUserId || '',
          user: {
            ...response.data.data?.user,
            id: userId || registeredUserId || '',
          }
        },
        email: email  // Thêm email vào response để sử dụng sau
      };
      
      return responseData;
    } catch (error: any) {
      console.error("Login error:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Login failed");
    }
  }
);

export const registerUser = createAsyncThunk(
    "auth/registerUser", 
    async ({ name, email, password, enable2FA }: { name: string, email: string, password: string, enable2FA: boolean }, { rejectWithValue }) => {
        try {
            const response = await AuthService.register(name, email, password, enable2FA);
            
            // Trả về toàn bộ dữ liệu từ API
            return response.data;
        } catch (error) {
            // Xử lý lỗi một cách chi tiết
            const err = error as any;
            return rejectWithValue(err.response?.data ?? { message: err.message });
        }
    }
)
export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
    const response = await timeoutPromise(() => AuthService.logout(), 5000)
    return response.data
})
export const verify2FA = createAsyncThunk(
    "auth/verify2FA", 
    async ({ userId, twoFACode }: { userId: string, twoFACode: string }, { rejectWithValue }) => {
      try {
        // Đảm bảo mã được gửi dưới dạng chuỗi
        const formattedCode = String(twoFACode).padStart(6, '0');
        
        
        const response = await AuthService.verify2FA(
          userId, 
          formattedCode
        );
        
        return response.data;
      } catch (error: any) {
        console.error("2FA verification failed:", error.response?.data ?? error.message);
        return rejectWithValue(error.response?.data?.message ?? error.message ?? "Verification failed");
      }
    }
  );
export const setting2FA = createAsyncThunk("auth/setting2FA", async ({ enable2FA }: { enable2FA: boolean }) => {
    const response = await timeoutPromise(() => AuthService.setting2FA(enable2FA), 5000)
    return response.data
}
)

export const refreshToken = createAsyncThunk(
    "auth/refreshToken",
    async (refreshToken: string, { rejectWithValue }) => {
      try {
        const response = await AuthService.refreshToken(refreshToken);
        return response.data;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message ?? error.message);
      }
    }
  );