'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingOAuth, setLoadingOAuth] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check for success message from registration
    const message = searchParams.get('message')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('Неверный email или пароль')
            } else {
                router.push('/profile')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('Произошла ошибка при входе')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setLoadingOAuth(true)
        setError('')

        try {
            await signIn('google', {
                callbackUrl: '/profile',
            })
        } catch (err) {
            console.error('Google sign in error:', err)
            setError('Произошла ошибка при входе через Google')
            setLoadingOAuth(false)
        }
    }

    return (
        <div className="mt-8 space-y-6">
            {message === 'registration-success' && (
                <div className="text-green-700 text-sm text-center bg-green-50 border border-green-200 rounded-md p-3">
                    Регистрация прошла успешно! Теперь вы можете войти в систему.
                </div>
            )}

            {/* OAuth Section */}
            <div>
                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loadingOAuth}
                    className="w-full mb-4 bg-red-600 hover:bg-red-700"
                >
                    {loadingOAuth ? 'Вход...' : 'Войти через Google'}
                </Button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">или</span>
                </div>
            </div>

            {/* Credentials Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-800">
                            Email
                        </label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1"
                            placeholder="your@email.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-800">
                            Пароль
                        </label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </div>

                {error && (
                    <div className="text-red-700 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
                        {error}
                    </div>
                )}

                <div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Вход...' : 'Войти'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
