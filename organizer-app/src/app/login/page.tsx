import { LoginForm } from '@/components/login-form'
import Link from 'next/link'
import { Header } from '@/components/header'

export default function LoginPage() {
    return (
        <>
            <Header title="Вход в систему" />
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Вход в систему
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-700">
                            HackLoad 2025
                        </p>
                    </div>
                    <LoginForm />

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Еще не зарегистрированы?{' '}
                            <Link
                                href="/register"
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Зарегистрироваться
                            </Link>
                        </p>
                    </div>                </div>
            </div>
        </>
    )
}
