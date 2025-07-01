import { OAuthLoginForm } from '@/components/oauth-login-form'
import { Suspense } from 'react'

function LoginContent() {
    return <OAuthLoginForm />
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Войти в HackLoad 2025
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-700">
                        Используйте Google или GitHub для входа
                    </p>
                </div>
                <Suspense fallback={<div>Загрузка...</div>}>
                    <LoginContent />
                </Suspense>
            </div>
        </div>
    )
}
