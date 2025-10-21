'use client'

import { Heart, LogOut } from "lucide-react"
import { FloatingUploadButton } from "@/components/FloatingUploadButton"
import { QRCodeGenerator } from "@/components/QRCodeGenerator"
import { useAuth } from "@/contexts/AuthContext"
import { ReactNode } from "react"

interface HomeClientProps {
  children: ReactNode
}

export default function HomeClient({ children }: HomeClientProps) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                  Merry Share
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">大切な思い出を共有しよう</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.userName}さん
                </span>
              )}
              <QRCodeGenerator />
              <button
                onClick={logout}
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

      <FloatingUploadButton />
    </div>
  )
}
