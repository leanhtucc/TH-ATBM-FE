/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { createAsyncThunk } from "@reduxjs/toolkit";
import passwordService from "service/passwordService";

export const getAllPasswords = createAsyncThunk(
  "password/getAllPasswords", async (_, { rejectWithValue }) => {
    try {
      const response = await passwordService.getAllPasswords();
      return response.data;
    } catch (error) {
      const err = error as any;
      return rejectWithValue(err.response?.data ?? { message: err.message });
    }
  }
)

export const getPasswordById = createAsyncThunk(
  "password/getPasswordById", async (id: string, { rejectWithValue }) => {
    try {
      const response = await passwordService.getPasswordById(id);
      return response.data;
    } catch (error) {
      const err = error as any;
      return rejectWithValue(err.response?.data ?? { message: err.message });
    }
  }
)
export const addPassword = createAsyncThunk(
  "password/addPassword", async (data: any, { rejectWithValue }) => {   
    try {
      const response = await passwordService.addPassword(data);
      return response.data;
    } catch (error) {
      const err = error as any;
      return rejectWithValue(err.response?.data ?? { message: err.message });
    }
  }
)
export const updatePassword = createAsyncThunk(
  "password/updatePassword", async ({ id, data }: { id: string, data: any }, { rejectWithValue }) => {
    try {
      const response = await passwordService.updatePassword(id, data);
      return response.data;
    } catch (error) {
      const err = error as any;
      return rejectWithValue(err.response?.data ?? { message: err.message });
    }
  }
)
export const deletePassword = createAsyncThunk(
    "password/deletePassword", async (id: string, { rejectWithValue }) => {
        try {
       
          const response = await passwordService.deletePassword(id);
        
          
          // Bảo đảm response có dữ liệu (phòng trường hợp response trống)
          if (!response) {
            console.error("Empty response from delete API");
            return { id }; // Trả về ID để reducer có thể xử lý xóa
          }
          
          // Trả về dữ liệu của mật khẩu đã xóa hoặc ít nhất ID để reducer có thể xử lý
          return response.data ?? { id };
        } catch (error) {
          console.error("Error in deletePassword thunk:", error);
          
          const err = error as any;
          
          // Xử lý các trường hợp lỗi cụ thể
          if (err.response) {
            // Trường hợp có response từ server
            if (err.response.status === 404) {
              return rejectWithValue({ message: "Mật khẩu không tồn tại hoặc đã bị xóa" });
            } else if (err.response.data && err.response.data.message) {
              return rejectWithValue({ message: err.response.data.message });
            }
          }
          
          // Trường hợp lỗi mạng hoặc không kết nối được server
          if (err.message && err.message.includes("Network Error")) {
            return rejectWithValue({ message: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng" });
          }
          
          // Lỗi khác
          return rejectWithValue({ 
            message: err.message ?? "Không thể xóa mật khẩu. Vui lòng thử lại sau" 
          });
        }
    }
)


