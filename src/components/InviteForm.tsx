'use client'

import { useState } from 'react'
import { Mail, Copy, CheckCircle } from 'lucide-react'

export default function InviteForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSuccess(false)

    try {
      // ローカルストレージからトークンを取得
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('ログインが必要です')
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '招待メールの送信に失敗しました')
      }

      setSuccess(true)
      setInvitationUrl(data.invitation.invitation_url)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待メールの送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    if (invitationUrl) {
      try {
        await navigator.clipboard.writeText(invitationUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('コピーに失敗しました:', err)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-rose-100 p-8">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
          管理者を招待
        </h2>

        <p className="text-gray-600 mb-6 text-center">
          招待したい方のメールアドレスを入力してください。
          <br />
          招待URLが発行されます（有効期限: 1日間）
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-xl">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50/80 backdrop-blur-sm border-2 border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-700 font-medium mb-2">招待URLを発行しました</p>
                <div className="bg-white p-3 rounded-lg border border-green-200 break-all text-sm text-gray-700 mb-3">
                  {invitationUrl}
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      コピーしました
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      URLをコピー
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  このURLを招待したい方に送信してください。
                  <br />
                  ※現在、メール送信機能は未実装のため、手動で送信してください。
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              招待するメールアドレス <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                placeholder="example@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-rose-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? '送信中...' : '招待URLを発行'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">招待の流れ</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-semibold flex-shrink-0">
                1
              </span>
              <span>招待したい方のメールアドレスを入力し、招待URLを発行</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-semibold flex-shrink-0">
                2
              </span>
              <span>発行されたURLを招待したい方に送信</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-semibold flex-shrink-0">
                3
              </span>
              <span>招待された方がURLから会員登録を完了</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-semibold flex-shrink-0">
                4
              </span>
              <span>同じウェディングの管理者として登録完了</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
