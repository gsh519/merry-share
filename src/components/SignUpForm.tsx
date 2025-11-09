'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
