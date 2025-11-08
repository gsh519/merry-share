'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail)
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // ローカル認証が有効かどうかを判定
  const enableLocalAuth = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH === 'true'

  // URLフラグメントからトークンを取得してセッションを確立
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // URLエラーパラメータをチェック
      const urlError = searchParams.get('error')
      if (urlError) {
        setError(decodeURIComponent(urlError))
        return
      }

      // URLフラグメントからトークンを取得
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        setLoading(true)
        try {
          // Supabaseにセッションを設定
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: new URLSearchParams(hash.substring(1)).get('access_token') || '',
            refresh_token: new URLSearchParams(hash.substring(1)).get('refresh_token') || '',
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('認証に失敗しました')
            setLoading(false)
            return
          }

          if (!data.user?.email) {
            setError('ユーザー情報の取得に失敗しました')
            setLoading(false)
            return
          }

          // DBでユーザーを確認
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: data.session?.access_token }),
          })

          const userData = await response.json()

          if (response.ok && userData.isValid) {
            // 既存ユーザー: Zustandに保存してホームへ
            login(
              userData.user,
              userData.wedding,
              data.session?.access_token || '',
              data.session?.refresh_token || ''
            )
            // URLフラグメントをクリア
            window.history.replaceState({}, document.title, '/login')
            router.push('/')
          } else {
            // 新規ユーザー: 会員登録完了ページへ
            const redirectUrl = new URL('/signup/complete', window.location.origin)
            redirectUrl.searchParams.set('access_token', data.session?.access_token || '')
            redirectUrl.searchParams.set('refresh_token', data.session?.refresh_token || '')
            redirectUrl.searchParams.set('email', data.user.email)
            redirectUrl.searchParams.set('name', data.user.user_metadata?.full_name || data.user.email.split('@')[0])

            window.history.replaceState({}, document.title, '/login')
            router.push(redirectUrl.toString())
          }
        } catch (err) {
          console.error('OAuth callback error:', err)
          setError('認証処理中にエラーが発生しました')
          setLoading(false)
        }
      }
    }

    handleOAuthCallback()
  }, [searchParams, login, router])

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      await signInWithGoogle()
      // リダイレクトが発生するため、ここには到達しない
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmail(email, password)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
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

      {/* メール/パスワードログインフォーム（開発環境のみ表示） */}
      {enableLocalAuth && (
        <>
          <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="6文字以上"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          {/* 区切り線 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/80 text-gray-500 font-medium">または</span>
            </div>
          </div>
        </>
      )}

      {/* Google OAuth */}
      <div className="space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white text-gray-700 py-3.5 px-4 rounded-xl font-semibold border-2 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? 'ログイン中...' : 'Googleでログイン'}
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <a href="/signup" className="text-rose-500 hover:text-rose-600 font-semibold hover:underline transition-colors">
            会員登録
          </a>
        </p>
      </div>
    </div>
  )
}
