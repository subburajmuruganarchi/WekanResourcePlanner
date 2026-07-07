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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to log in. Please check your credentials.")
        }
    }

    const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
        setError(null)
        try {
            if (!credentialResponse.credential) {
                throw new Error("Google login failed.")
            }
            const loggedIn = await googleLogin(credentialResponse.credential)
            navigate(getHomeRoute(loggedIn.role), { replace: true })
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Google login failed.")
        }
    }

    return (
        <div
            className="relative min-h-screen flex flex-col items-center justify-center p-6"
            style={{ background: "linear-gradient(135deg, #001c2a 0%, #0a2d3f 50%, #001c2a 100%)" }}
        >
            <div className="absolute inset-0 opacity-5 pointer-events-none" aria-hidden="true">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            <main className="relative z-10 w-full max-w-md" id="login-main">
                <header className="text-center mb-10">
                    <div className="flex flex-col items-center gap-3 mb-4">
                        <BrandLogo className="h-14 w-14" aria-hidden="true" />
                        <p className="font-bold text-white text-3xl tracking-tight" aria-hidden="true">
                            R360
                        </p>
                        <p className="text-slate-300 text-lg">Resource Management Platform</p>
                    </div>
                    <h1 className="text-slate-200 text-sm font-medium">Sign in to your account</h1>
                </header>

                <section
                    aria-label="Sign in"
                    className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl shadow-2xl"
                >
                    {error && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-400/30 text-red-200 text-sm"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <FormField label="Email Address" htmlFor="login-email" required className="[&_label]:text-slate-200">
                            <Input
                                id="login-email"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-brand-400"
                                placeholder="name@company.com"
                            />
                        </FormField>

                        <FormField label="Password" htmlFor="login-password" required className="[&_label]:text-slate-200">
                            <Input
                                id="login-password"
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-brand-400"
                                placeholder="••••••••"
                            />
                        </FormField>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl text-white font-semibold bg-brand-700 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-400 focus-visible:ring-offset-slate-900 transition-colors shadow-lg flex items-center justify-center ${isLoading ? "opacity-80 cursor-not-allowed" : ""}`}
                        >
                            {isLoading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center gap-4" role="presentation">
                        <div className="h-px bg-white/15 flex-1" aria-hidden="true" />
                        <span className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                            Or continue with
                        </span>
                        <div className="h-px bg-white/15 flex-1" aria-hidden="true" />
                    </div>

                    <div className="mt-6 flex justify-center" role="group" aria-label="Google sign in">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google Login Failed")}
                            theme="filled_black"
                            shape="pill"
                            width="280px"
                        />
                    </div>
                </section>

                <footer className="mt-8 text-center space-y-2">
                    <p className="text-slate-300 text-sm">
                        Need help logging in? Contact your IT administrator.
                    </p>
                    <p className="text-slate-400 text-xs">
                        Default User: aarav.sharma@wekancode.com / password123
                    </p>
                </footer>
            </main>
        </div>
    )
}
