'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useAuthStore } from '@/stores/authStore'

export default function LoginForm() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'ログインに失敗しました')
      }

      // AuthContextを更新
      login(
        responseData.user,
        responseData.wedding,
        responseData.session.access_token,
        responseData.session.refresh_token
      )

      // ホームページへリダイレクト
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-rose-100">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
        ログイン
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            メールアドレス <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            placeholder="example@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            パスワード <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            id="password"
            {...register('password')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            placeholder="パスワードを入力"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-rose-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <a href="/signup" className="text-rose-500 hover:text-rose-600 font-semibold hover:underline transition-colors">
            会員登録
          </a>
        </p>
      </div>

      <div className="mt-4 text-center">
        <a href="#" className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors">
          パスワードをお忘れですか？
        </a>
      </div>
    </div>
  )
}
