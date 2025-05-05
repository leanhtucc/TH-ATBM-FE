/* eslint-disable no-console */
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable prettier/prettier */
import { createSlice } from '@reduxjs/toolkit'
import { loginUser, registerUser, logoutUser, verify2FA, setting2FA } from './authThunks'

interface User {
    token: string;
    id: string;
    name: string;
    email: string;
}

interface TwoFA {
    enabled: boolean;
    secret: string | null;
    qrCode: string | null;
    twoFACode: string | null;
    isVerified: boolean;
}

interface AuthState {
    [x: string]: any;
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    error: string | null;
    twoFA: TwoFA;
    is2FAEnabled: boolean;
    is2FAVerified: boolean;
    is2FALoading: boolean;
    is2FAError: string | null;
    is2FASetting: boolean;
    redirectAfterLogin: boolean;
}

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
    twoFA: {
        enabled: false,
        secret: null,
        qrCode: null,
        twoFACode: null,
        isVerified: false,
    },
    is2FAEnabled: false,
    is2FASetting: false,
    is2FAVerified: false,
    is2FALoading: false,
    is2FAError: null,
    redirectAfterLogin: false
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = {
                token: action.payload.token,
                id: action.payload.data.user?.id ?? '',
                name: action.payload.data.user?.name ?? '',
                email: action.payload.data.user?.email ?? '',
            }
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload
        },
        set2FAEnabled: (state, action) => {
            state.is2FAEnabled = action.payload
        },
        set2FALoading: (state, action) => {
            state.is2FALoading = action.payload
        },
        resetAuthState: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
            state.is2FAEnabled = false;
            state.is2FAVerified = false;
        },
        resetAuth: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.error = null;
          },
          resetRedirectFlag: (state) => {
            state.redirectAfterLogin = false;
          },
    },
    extraReducers: (builder) => {
        builder
            // Handle login
            .addCase(loginUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                
              
                
                // Xác định xem có cần 2FA không
                const requireTwoFA = 
                  action.payload.requireTwoFA === true || 
                  action.payload.data?.requireTwoFA === true ||
                  action.payload.message?.includes("xác thực 2 bước");
                
                if (requireTwoFA) {
                  // Cần xác thực 2FA
            
                  state.is2FAEnabled = true;
                  state.isAuthenticated = false;
                  state.redirectAfterLogin = true;
                  
                  // Extract user ID từ response - ensure we're checking all possible locations
                  const userId = 
                    action.payload.userId || 
                    action.payload.data?.userId ||
                    action.payload.data?.normalizedData?.userId ||
                    (action.payload.user && (action.payload.user.id || action.payload.user._id)) ||
                    (action.payload.data?.user && (action.payload.data.user.id || action.payload.data.user._id));
                  
                  
                  
                  // Set user info
                  state.user = {
                    id: userId ?? '',
                    email: action.payload.email ?? '',
                    name: '',
                    token: ''
                  };
                } else {
                  // Không cần 2FA, đăng nhập thành công
                  state.is2FAEnabled = false;
                  state.isAuthenticated = true;
                  state.redirectAfterLogin = false;
                  
                  // Extract user data
                  const user = action.payload.data?.user ?? action.payload.user;
                  const token = action.payload.data?.accessToken ?? action.payload.accessToken ?? '';
                  
                  if (user) {
                    state.user = {
                      id: user.id ?? user._id ?? '',
                      email: user.email ?? action.payload.email ?? '',
                      name: user.name ?? '',
                      token: token
                    };
                  } else {
                    // Fallback nếu không có user object
                    state.user = {
                      id: action.payload.userId ?? '',
                      email: action.payload.email ?? '',
                      name: action.payload.name ?? '',
                      token: token
                    };
                  }
                }
              })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message ?? null
            })
            
            // Handle registration
            .addCase(registerUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                
                // Lưu thông tin user
                if (action.payload?.data?.user) {
                  state.user = action.payload.data.user;
                }
                
                // Lưu thông tin 2FA nếu có
                if (action.payload?.data?.twoFAData) {
                  state.twoFA.qrCode = action.payload.data.twoFAData.qrCode;
                  state.twoFA.secret = action.payload.data.twoFAData.secret;
                  state.twoFA.enabled = true;
                  
                  // KHÔNG đặt is2FAEnabled = true ở đây vì chúng ta chưa yêu cầu xác thực
                  // Chỉ đặt khi đăng nhập và cần xác thực 2FA
                  // state.is2FAEnabled = true; 
                } else {
                  state.twoFA.enabled = false;
                }
                
                // Sau khi đăng ký, cần đăng nhập lại nên isAuthenticated vẫn là false
                state.isAuthenticated = false;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message ?? null
            })
            .addCase(logoutUser.pending, (state) => {
                state.loading = true
                state.error = null
            }
            )
            .addCase(logoutUser.fulfilled, (state) => {
                state.is2FAError = null;
                state.loading = false;
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message ?? null
            }
            )
        // Verify 2FA
      .addCase(verify2FA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.isAuthenticated = true;
        state.is2FAVerified = true;
        
        
        // Extract token from response
        const token = action.payload.accessToken ?? 
                     action.payload.data?.accessToken ?? 
                     action.payload.token ?? 
                     action.payload.data?.token;
        
        // Update user information with token and other data
        if (action.payload.user ?? action.payload.data?.user) {
          const user = action.payload.user ?? action.payload.data?.user;
          
          state.user = {
            id: user.id ?? user._id ?? state.user?.id ?? '',
            email: user.email ?? state.user?.email ?? '',
            name: user.name ?? state.user?.name ?? '',
            token: token ?? ''
          };
        } else if (token) {
          // If we have a token but no user object, keep existing user data but update token
          if (state.user) {
            state.user = {
              ...state.user,
              token: token
            };
          } else {
            // Create minimal user object if none exists
            state.user = {
              id: action.payload.userId ?? '',
              email: action.payload.email ?? '',
              name: action.payload.name ?? '',
              token: token
            };
          }
        }
        
        // Reset redirect flag
        state.redirectAfterLogin = false;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : "2FA verification failed";
      })
      .addCase(setting2FA.pending, (state: AuthState) => {
                state.is2FASetting = true
                state.is2FAError = null
            }
            )
            .addCase(setting2FA.fulfilled, (state, action) => {
                state.is2FASetting = false
                state.twoFA.enabled = action.payload.enabled
                state.twoFA.secret = action.payload.secret
                state.twoFA.qrCode = action.payload.qrCode
                state.is2FAEnabled = true
            }
            )
            .addCase(setting2FA.rejected, (state, action) => {
                state.is2FASetting = false
                state.is2FAError = action.error.message ?? null
            }
            )
    },
})

export const { setUser, setLoading, setError, set2FAEnabled, set2FALoading, resetAuth, resetRedirectFlag } = authSlice.actions

export default authSlice.reducer