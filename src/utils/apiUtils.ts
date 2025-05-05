/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import axios from 'axios'
import {URL_SERVER} from "config/url_server"
import { removeAuthToken } from './localStorageUtils'

// Store navigation function for use in interceptors
let navigateToLogin: (() => void) | null = null;

// Function to set the navigation function from React components
export const setNavigationFunction = (navFunction: () => void) => {
  navigateToLogin = navFunction;
};

console.log('BASE_URL', URL_SERVER)

export const createApi = () => {
  const instance = axios.create({
    baseURL: URL_SERVER,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  instance.interceptors.request.use(
    (config) => {
      // Get token directly from localStorage with the correct key
      const token = localStorage.getItem("accessToken")
      if (token) {
        config.headers = config.headers || {}
        config.headers['Authorization'] = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(new Error(error))
  )

  instance.interceptors.response.use(
    (response) => {
      return response
    },
    (error) => {
      if (error.response && error.response.status === 401) {
        // Remove the token
        removeAuthToken();
        localStorage.removeItem("accessToken");
        
        // Use React Router navigation if available, otherwise fallback to window.location
        if (navigateToLogin) {
          // Use the navigation function that was set from a React component
          navigateToLogin();
        } else if (window.location.pathname !== '/login') {
          // Fallback to traditional navigation if React Router is not set up
          window.location.href = '/login';
        }
      }
      return Promise.reject(error instanceof Error ? error : new Error(error))
    }
  )

  return instance
}
