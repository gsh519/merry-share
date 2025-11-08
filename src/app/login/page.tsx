import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            Merry Share
          </h1>
          <p className="text-gray-600 text-lg">
            大切な結婚式の思い出をシェアしましょう
          </p>
        </div>

        <Suspense fallback={<div className="text-center">読み込み中...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
