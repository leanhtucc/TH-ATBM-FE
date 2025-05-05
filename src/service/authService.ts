/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { createApi } from "utils/apiUtils";

const authService = {
    http: createApi(),

    // Thêm helper function để xử lý các response có cấu trúc khác nhau
    normalizeUserData(data: any) {
        
        // Try to extract user from all possible locations
        const user = data.user ?? data.data?.user;
        const email = user?.email ?? data.email ?? data.data?.email;
        
        // Try to extract userId from all possible locations
        let userId = 
          user?.id ?? 
          user?._id ?? 
          data.userId ?? 
          data.data?.userId ??
          // Look deeper in the data structure
          data.data?.user?.id ?? 
          data.data?.user?._id;
          
        // If we still don't have a userId but we have an email, generate a temporary ID
        // This will be used as a fallback for verify2FA
        if (!userId && email) {
          userId = `email:${email}`; // Use email as identifier
        }
      
        
        const requireTwoFA = 
          data.requireTwoFA === true || 
          data.data?.requireTwoFA === true ||
          data.message?.includes("xác thực 2 bước");
        
        // Tạo normalized response
        return {
          userId,
          email: email,
          name: user?.name ?? data.name,
          token: data.accessToken ?? data.data?.accessToken,
          requireTwoFA
        };
    },
  
    // Sử dụng helper trong login
    login(email: string, password: string) {
        
        return this.http.post('/auth/login', { email, password })
          .then(response => {
            
            // Direct extraction of userId 
            const responseUserId = response.data.userId || 
                                  response.data.data?.userId || 
                                  response.data.data?.user?.id || 
                                  response.data.data?.user?._id;
                                  
            // If userId is available directly in the response, use that
            const loginPayload = {
              ...response.data,
              email: email,  // Always include the email
              userId: responseUserId // Include userId if available directly
            };
            
            
            // Normalize response including original email
            const normalizedData = this.normalizeUserData({...loginPayload});
            
            // Store important data
            if (normalizedData.token) {
              localStorage.setItem("accessToken", normalizedData.token);
            }
            
            // If we found a userId in the response, make sure it's included in the result
            if (normalizedData.userId || responseUserId) {
              response.data.userId = normalizedData.userId || responseUserId;
            }
            
            // Include the normalized data
            return {
              ...response,
              data: {
                ...response.data,
                normalizedData,
                userId: normalizedData.userId || responseUserId, // Ensure userId is in the top level
                email: email // Ensure email is also included
              }
            };
          });
    },
    
    register(name: string, email: string, password: string, enable2FA: boolean) {
        return this.http.post('/auth/register', { name, email, password, enable2FA });
    },
    
    logout() {
        const res = this.http.post('/auth/logout');
        localStorage.removeItem('token');
        return res;
    },
    
    verify2FA(userId: string, twoFACode: string) {
        console.log('authService - verify2FA called with:', { userId, twoFACode });
        
        // Check if the userId is actually an email identifier
        const isEmailIdentifier = userId.startsWith('email:');
        
        // Prepare parameters based on the identifier type
        const params = isEmailIdentifier 
            ? {
                // If it's an email identifier, extract the email and send that instead
                email: userId.substring(6), // Remove 'email:' prefix
                twoFACode: String(twoFACode)
            } 
            : {
                // Regular userId
                userId: String(userId),
                twoFACode: String(twoFACode)
            };
        
        
        return this.http.post('/auth/verify-2fa', params)
            .then(response => {
                
                // Extract and save token after successful verification
                const accessToken = 
                    response.data.accessToken || 
                    response.data.data?.accessToken ||
                    response.data.token ||
                    response.data.data?.token;
                
                if (accessToken) {
                    localStorage.setItem('accessToken', accessToken);
                } else {
                    console.warn('No access token found in 2FA verification response');
                }
                
                return response;
            });
    },
    
    setting2FA(enable2FA: boolean) {
        return this.http.put('/auth/2fa-settings', { enable2FA });
    },
    
    refreshToken(refreshToken: string) {
        return this.http.post('/auth/refresh', { refreshToken });
    }
}

export default authService;