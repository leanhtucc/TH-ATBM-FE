/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { createSlice } from "@reduxjs/toolkit";
import { getAllPasswords, getPasswordById, addPassword, updatePassword, deletePassword } from "./passwordThunk";

// Định nghĩa cấu trúc của một mật khẩu theo đúng chuẩn từ backend
interface Password {
  id: string
  userId?: string
  website: string
  username: string
  encryptedData: string
  iv: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

// Định nghĩa kiểu dữ liệu cho error message
interface ErrorResponse {
  message?: string;
  [key: string]: any;
}

interface PasswordState {
  passwords: Password[]
  loading: boolean
  error: string | null
  selectedPassword: Password | null
  isPasswordUpdated: boolean
  isPasswordDeleted: boolean
  isPasswordAdded: boolean
}

const initialState: PasswordState = {
  passwords: [],
  loading: false,
  error: null,
  selectedPassword: null,
  isPasswordUpdated: false,
  isPasswordDeleted: false,
  isPasswordAdded: false
}

// Hàm tiện ích để chuẩn hóa dữ liệu mật khẩu
const normalizePasswordData = (data: any): Password => {
  if (!data) return data;
  
  // Lấy dữ liệu từ trường data nếu có
  const passwordData = data.data ?? data;

  return {
    id: passwordData.id,
    userId: passwordData.userId,
    website: passwordData.website ?? "",
    username: passwordData.username ?? "",
    encryptedData: passwordData.encryptedData ?? "",
    iv: passwordData.iv ?? "",
    createdAt: passwordData.created_at ?? passwordData.createdAt,
    created_at: passwordData.created_at,
    updatedAt: passwordData.updated_at ?? passwordData.updatedAt,
    updated_at: passwordData.updated_at
  };
};

export const passwordSlice = createSlice({
  name: "password",
  initialState,
  reducers: {
    setSelectedPassword: (state, action) => {
      state.selectedPassword = action.payload;
    },
    resetPasswordStatus: (state) => {
      state.isPasswordUpdated = false;
      state.isPasswordDeleted = false;
      state.isPasswordAdded = false;
      state.error = null;
    },
    clearPasswordError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // getAllPasswords cases
      .addCase(getAllPasswords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPasswords.fulfilled, (state, action) => {
        state.loading = false;
        // Chuẩn hóa dữ liệu danh sách mật khẩu
        const payload = action.payload;
        const passwordsData = payload.data ?? payload;
        
        state.passwords = Array.isArray(passwordsData) 
          ? passwordsData.map(normalizePasswordData)
          : [];
          
      })
      .addCase(getAllPasswords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // getPasswordById cases
      .addCase(getPasswordById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPasswordById.fulfilled, (state, action) => {
        state.loading = false;
        // Chuẩn hóa dữ liệu mật khẩu đơn lẻ
        state.selectedPassword = normalizePasswordData(action.payload);
      })
      .addCase(getPasswordById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // addPassword cases
      .addCase(addPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isPasswordAdded = false;
      })
      .addCase(addPassword.fulfilled, (state, action) => {
        state.loading = false;
        
        // Chuẩn hóa dữ liệu mật khẩu mới theo đúng cấu trúc từ backend
        const newPassword = normalizePasswordData(action.payload);
        
        // Đảm bảo passwords là một mảng
        if (!Array.isArray(state.passwords)) {
          state.passwords = [];
        }
        
        // Thêm mật khẩu mới vào mảng
        state.passwords.push(newPassword);
        state.isPasswordAdded = true;
        
      })
      .addCase(addPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isPasswordAdded = false;
      })
      
      // updatePassword cases
      .addCase(updatePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isPasswordUpdated = false;
      })
      .addCase(updatePassword.fulfilled, (state, action) => {
        state.loading = false;
        
        // Chuẩn hóa dữ liệu mật khẩu cập nhật
        const updatedPassword = normalizePasswordData(action.payload);
        
        // Đảm bảo passwords là một mảng
        if (!Array.isArray(state.passwords)) {
          state.passwords = [];
        }
        
        // Tìm và cập nhật mật khẩu trong mảng
        const index = state.passwords.findIndex(
          (password) => password.id === updatedPassword.id
        );
        
        if (index !== -1) {
          state.passwords[index] = updatedPassword;
        }
        
        state.selectedPassword = updatedPassword;
        state.isPasswordUpdated = true;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isPasswordUpdated = false;
      })
      
      // deletePassword cases
      .addCase(deletePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.isPasswordDeleted = false;
      })
      .addCase(deletePassword.fulfilled, (state, action) => {
        state.loading = false;
        
        // Lấy ID của mật khẩu đã xóa từ phản hồi API
        let passwordId: string | undefined = undefined;
        
        // Kiểm tra các cấu trúc phản hồi khác nhau
        if (action.payload) {
          if (typeof action.payload === 'object') {
            // Phản hồi có thể là: { id: "abc123" } hoặc { data: { id: "abc123" } }
            const payload = action.payload as { id?: string; data?: { id?: string } };
            passwordId = payload.id || 
                        (payload.data && payload.data.id) || 
                        undefined;
          } else if (typeof action.payload === 'string') {
            // Phản hồi có thể là ID trực tiếp
            passwordId = action.payload;
          }
        }
        
        
        // Đảm bảo passwords là một mảng
        if (!Array.isArray(state.passwords)) {
          state.passwords = [];
        } 
        
        // Xóa mật khẩu khỏi mảng nếu có ID
        if (passwordId) {
          state.passwords = state.passwords.filter(
            (password) => password.id !== passwordId
          );
        }
        
        state.isPasswordDeleted = true;
        state.selectedPassword = null;
      })
      .addCase(deletePassword.rejected, (state, action) => {
        state.loading = false;
        console.error("Delete password rejected with payload:", action.payload);
        
        // Xử lý lỗi có cấu trúc khác nhau
        if (action.payload) {
          if (typeof action.payload === 'object') {
            const errorPayload = action.payload as ErrorResponse;
            if (errorPayload.message) {
              state.error = errorPayload.message;
            } else {
              state.error = "Failed to delete password";
            }
          } else if (typeof action.payload === 'string') {
            state.error = action.payload;
          } else {
            state.error = "Failed to delete password";
          }
        } else {
          state.error = "Failed to delete password";
        }
        
        state.isPasswordDeleted = false;
      });
  }
});

export const { setSelectedPassword, resetPasswordStatus, clearPasswordError } = passwordSlice.actions;
export default passwordSlice.reducer;