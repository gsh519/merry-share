'use client'

import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

// 互換性のためにAuthProviderを残す（Zustandの初期化処理を行う）
export function AuthProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    // アプリ起動時に認証状態を初期化
    initialize()
  }, [initialize])

  return <>{children}</>
}

// 互換性のためにuseAuthフックを残す（内部でZustandを使用）
export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const wedding = useAuthStore((state) => state.wedding)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  return {
    user,
    wedding,
    isLoading,
    isAuthenticated,
    login,
    logout,
  }
}
