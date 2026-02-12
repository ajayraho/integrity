import { useState } from 'react'
import { loginUser, registerUser } from '../utils/database'

function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [isRegisterMode, setIsRegisterMode] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            let result
            
            if (isRegisterMode) {
                // Register new user
                result = await registerUser(username, password)
                if (result.success) {
                    localStorage.setItem('isAuthenticated', 'true')
                    localStorage.setItem('username', username)
                    onLogin(username, password)
                } else {
                    setError(result.error || 'Registration failed')
                }
            } else {
                // Login existing user
                result = await loginUser(username, password)
                if (result.success) {
                    localStorage.setItem('isAuthenticated', 'true')
                    localStorage.setItem('username', username)
                    onLogin(username, password)
                } else {
                    setError(result.error || 'Login failed')
                }
            }
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
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
                        <label htmlFor="username" className="block text-sm font-medium text-ink mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                setError('')
                            }}
                            className="w-full px-4 py-2 border-2 border-line rounded-lg focus:border-ink outline-none text-ink"
                            placeholder="admin"
                            autoComplete="username"
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
                            placeholder="admin"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ink text-white py-3 rounded-lg font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Please wait...' : (isRegisterMode ? 'Register' : 'Login')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => {
                            setIsRegisterMode(!isRegisterMode)
                            setError('')
                        }}
                        className="text-sm text-ink/60 hover:text-ink underline"
                    >
                        {isRegisterMode ? 'Already have an account? Login' : 'New user? Register here'}
                    </button>
                </div>

                <div className="mt-6 text-center text-xs text-ink/40">
                    {isRegisterMode ? 'Create your encrypted account' : 'Login to access your encrypted data'}
                </div>
            </div>
        </div>
    )
}

export default Login
