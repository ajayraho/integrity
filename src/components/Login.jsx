import { useState } from 'react'
import { login, register, resetPassword, friendlyAuthError } from '../utils/auth'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [loading, setLoading] = useState(false)
    const [isRegisterMode, setIsRegisterMode] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setInfo('')
        setLoading(true)
        try {
            if (isRegisterMode) await register(email, password)
            else await login(email, password)
            // App reacts to the auth state change
        } catch (err) {
            setError(friendlyAuthError(err))
        } finally {
            setLoading(false)
        }
    }

    const handleReset = async () => {
        setError('')
        setInfo('')
        if (!email.trim()) {
            setError('Enter your email first, then tap "Forgot password".')
            return
        }
        try {
            await resetPassword(email)
            setInfo('Password reset email sent.')
        } catch (err) {
            setError(friendlyAuthError(err))
        }
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-paper via-line/10 to-paper flex items-center justify-center p-4">
            <div className="bg-white border-4 border-line rounded-lg shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-ink mb-2">📔 Integrity</h1>
                    <p className="text-ink/60">Daily Journal & Habit Tracker</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setError('')
                            }}
                            className="w-full px-4 py-2 border-2 border-line rounded-lg focus:border-ink outline-none text-ink"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError('')
                            }}
                            className="w-full px-4 py-2 border-2 border-line rounded-lg focus:border-ink outline-none text-ink"
                            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                            minLength={isRegisterMode ? 6 : undefined}
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                            {info}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ink text-white py-3 rounded-lg font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : (isRegisterMode ? 'Create account' : 'Login')}
                    </button>
                </form>

                <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                        onClick={() => {
                            setIsRegisterMode(!isRegisterMode)
                            setError('')
                            setInfo('')
                        }}
                        className="text-ink/60 hover:text-ink underline"
                    >
                        {isRegisterMode ? 'Have an account? Login' : 'New here? Create account'}
                    </button>
                    {!isRegisterMode && (
                        <button onClick={handleReset} className="text-ink/60 hover:text-ink underline">
                            Forgot password
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login
