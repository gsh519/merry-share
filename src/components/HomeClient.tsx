'use client'

import { Heart, LogOut, UserPlus } from "lucide-react"
import { FloatingUploadButton } from "@/components/FloatingUploadButton"
import { QRCodeGenerator } from "@/components/QRCodeGenerator"
import { useAuthStore } from "@/stores/authStore"
import { ReactNode, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

interface HomeClientProps {
  children: ReactNode
  showUploadButton?: boolean
}

export default function HomeClient({ children, showUploadButton = true }: HomeClientProps) {
  const user = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const router = useRouter()
  const searchParams = useSearchParams()

  // OAuth認証後のセッション情報を復元
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // LocalStorageから一時保存されたユーザー情報を取得
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const { state } = JSON.parse(authStorage)
        if (state.user && state.wedding) {
          login(state.user, state.wedding, accessToken, refreshToken)
        }
      }

      // URLパラメータをクリア（リロード時に再度処理されないように）
      router.replace('/')
    }
  }, [searchParams, login, router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                  Merry Share
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">大切な思い出を共有しよう</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.userName}さん
                </span>
              )}
              <QRCodeGenerator />
              <Link
                href="/invite"
                className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                title="管理者を招待"
              >
                <UserPlus className="w-5 h-5 text-gray-600" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-8">
        {children}
      </main>

      {showUploadButton && <FloatingUploadButton />}
    </div>
  )
}
