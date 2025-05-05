/* eslint-disable prettier/prettier */
import LoginPage from 'pages/auth/login/login'
import RegisterPage from 'pages/auth/register/register'
import Verify2FA from 'pages/auth/verify2FA'
import Home from 'pages/Home'
import { createBrowserRouter } from 'react-router-dom'
const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />
    },
    {
        path: "/login",
        element: <LoginPage />
    },
    {
        path: "/register",
        element: <RegisterPage />
    },
    {
        path: "/verify-2fa",
        element: <Verify2FA />
    }
])
export default router
