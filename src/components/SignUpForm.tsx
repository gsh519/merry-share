'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  signUpSchema,
  signUpWithInvitationSchema,
  type SignUpFormData,
  type SignUpWithInvitationFormData
} from '@/lib/validations/auth'

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [invitationEmail, setInvitationEmail] = useState<string>('')
  const [verifyingInvitation, setVerifyingInvitation] = useState(false)

  // 招待トークンがある場合とない場合でフォームを切り替え
  const isInvitation = !!invitationToken

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData | SignUpWithInvitationFormData>({
    resolver: zodResolver(isInvitation ? signUpWithInvitationSchema : signUpSchema),
    mode: 'onBlur',
  })

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
            setInvitationEmail(data.invitation.email)
            setValue('email', data.invitation.email)
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
  }, [searchParams, setValue])

  const onSubmit = async (data: SignUpFormData | SignUpWithInvitationFormData) => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          userName: data.userName,
          weddingDate: 'weddingDate' in data ? data.weddingDate : undefined,
          invitationToken: invitationToken || undefined,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || '会員登録に失敗しました')
      }

      setSuccess(true)
      // 2秒後にログインページへリダイレクト
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '会員登録に失敗しました')
    } finally {
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

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-8 p-8 bg-white/80 backdrop-blur-md border-2 border-rose-200 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent mb-4">
            会員登録完了
          </h2>
          <p className="text-gray-700 mb-2">
            会員登録が完了しました。{isInvitation ? '招待者と同じウェディングに登録されました。' : '確認メールをご確認ください。'}
          </p>
          <p className="text-sm text-rose-500 font-medium">
            ログインページへ移動します...
          </p>
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
            招待URLから登録しています。結婚式の日付の入力は不要です。
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            htmlFor="userName"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            ユーザー名 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="userName"
            {...register('userName')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            placeholder="山田太郎"
          />
          {errors.userName && (
            <p className="mt-1 text-sm text-red-600">{errors.userName.message}</p>
          )}
        </div>

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
            readOnly={isInvitation}
            disabled={isInvitation}
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
            placeholder="6文字以上"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            パスワード（確認） <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            {...register('confirmPassword')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            placeholder="パスワードを再入力"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {!isInvitation && (
          <div>
            <label
              htmlFor="weddingDate"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              結婚式の日付 <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              id="weddingDate"
              {...register('weddingDate' as any)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            />
            {(errors as any).weddingDate && (
              <p className="mt-1 text-sm text-red-600">{(errors as any).weddingDate.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-rose-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
