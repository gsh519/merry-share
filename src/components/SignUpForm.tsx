'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [verifyingInvitation, setVerifyingInvitation] = useState(false)

  // フォーム入力
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userName, setUserName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')

  // 招待トークンがある場合とない場合でフォームを切り替え
  const isInvitation = !!invitationToken

  // URLから招待トークンを取得して検証
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setVerifyingInvitation(true)
      fetch(`/api/invitations/verify?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInvitationToken(token)
          } else {
            setError(data.error || '無効な招待URLです')
          }
        })
        .catch(() => {
          setError('招待URLの検証に失敗しました')
        })
        .finally(() => {
          setVerifyingInvitation(false)
        })
    }
  }, [searchParams])

  const handleGoogleSignUp = async () => {
    setError('')
    setLoading(true)

    try {
      await signInWithGoogle(invitationToken || undefined)
      // リダイレクトが発生するため、ここには到達しない
    } catch (err) {
      setError(err instanceof Error ? err.message : '会員登録に失敗しました')
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUpWithEmail(
        email,
        password,
        userName,
        isInvitation ? undefined : weddingDate,
        invitationToken || undefined
      )
      router.push('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : '会員登録に失敗しました')
      setLoading(false)
    }
  }

  if (verifyingInvitation) {
    return (
      <div className="max-w-md mx-auto mt-8 p-8 bg-white/80 backdrop-blur-md border-2 border-rose-200 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-4">
            招待URLを確認中...
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-rose-100">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
        {isInvitation ? '招待経由の会員登録' : '会員登録'}
      </h2>

      {isInvitation && (
        <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border-2 border-blue-200 rounded-xl">
          <p className="text-blue-700 text-sm font-medium">
            招待URLから登録しています。既存のウェディングに参加します。
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* メール/パスワード会員登録フォーム */}
      <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
        <div>
          <label htmlFor="userName" className="block text-sm font-semibold text-gray-700 mb-2">
            ユーザー名
          </label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            placeholder="山田太郎"
          />
        </div>

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

        {!isInvitation && (
          <div>
            <label htmlFor="weddingDate" className="block text-sm font-semibold text-gray-700 mb-2">
              結婚式の日付
            </label>
            <input
              id="weddingDate"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {loading ? '登録中...' : '会員登録'}
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

      {/* Google OAuth */}
      <div className="space-y-4">
        <button
          onClick={handleGoogleSignUp}
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
          {loading ? '登録中...' : 'Googleで会員登録'}
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          すでにアカウントをお持ちですか？{' '}
          <a href="/login" className="text-rose-500 hover:text-rose-600 font-semibold hover:underline transition-colors">
            ログイン
          </a>
        </p>
      </div>
    </div>
  )
}
