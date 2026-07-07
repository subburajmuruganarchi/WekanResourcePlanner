import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/home-route"
import { BrandLogo } from "@/components/brand/brand-logo"
import { GoogleLogin } from "@react-oauth/google"
import { FormField } from "@/components/patterns"
import { Input } from "@/components/ui/input"

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
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #001c2a 0%, #0a2d3f 50%, #001c2a 100%)' }}>
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
                    <div className="flex flex-col items-center gap-3 mb-4">
                        <BrandLogo className="h-14 w-14" />
                        <p className="font-bold text-white text-3xl tracking-tight">R360</p>
                        <p className="text-slate-400 text-lg">Resource Management Platform</p>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">Sign in to your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl shadow-2xl">
                    {error && (
                        <div role="alert" aria-live="polite" className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <FormField label="Email Address" htmlFor="login-email" required className="[&_label]:text-gray-300">
                            <Input
                                id="login-email"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-brand-500"
                                placeholder="name@company.com"
                            />
                        </FormField>

                        <FormField label="Password" htmlFor="login-password" required className="[&_label]:text-gray-300">
                            <Input
                                id="login-password"
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-brand-500"
                                placeholder="••••••••"
                            />
                        </FormField>

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
