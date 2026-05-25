"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/home-route"
import { GoogleLogin } from "@react-oauth/google"

export function LoginPage() {
    const { login, googleLogin, isLoading } = useAuth()
    const navigate = useNavigate()
    
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        
        try {
            const loggedIn = await login(email, password)
            navigate(getHomeRoute(loggedIn.role), { replace: true })
        } catch (err: any) {
            setError(err.message || "Failed to log in. Please check your credentials.")
        }
    }

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError(null)
        try {
            const loggedIn = await googleLogin(credentialResponse.credential)
            navigate(getHomeRoute(loggedIn.role), { replace: true })
        } catch (err: any) {
            setError(err.message || "Google login failed.")
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
                            <span className="text-white font-bold text-xl">R</span>
                        </div>
                        <span className="font-bold text-white text-3xl tracking-tight">R360</span>
                    </div>
                    <p className="text-gray-400 text-lg">Resource Management Platform</p>
                    <p className="text-gray-500 text-sm mt-2">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl text-white font-medium bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 focus:ring-offset-gray-900 transition-all shadow-lg shadow-brand-600/30 flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Or continue with</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="mt-6 flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google Login Failed")}
                            theme="filled_black"
                            shape="pill"
                            width="280px"
                        />
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    Need help logging in? Contact your IT administrator.
                </p>
                <p className="text-center text-gray-600 text-xs mt-2">
                    Default User: aarav.sharma@wekancode.com / password123
                </p>
            </div>
        </div>
    )
}
