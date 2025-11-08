import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  userName: string
}

interface Wedding {
  id: number
  weddingDate: string
}

interface AuthState {
  user: User | null
  wedding: Wedding | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  login: (
    user: User,
    wedding: Wedding,
    accessToken: string,
    refreshToken: string
  ) => void
  logout: () => void
  verifyToken: () => Promise<boolean>
  refreshAccessToken: () => Promise<boolean>
  setLoading: (isLoading: boolean) => void
  initialize: () => Promise<void>
  signInWithGoogle: (invitationToken?: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (
    email: string,
    password: string,
    userName: string,
    weddingDate?: string,
    invitationToken?: string
  ) => Promise<void>
}

export type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      wedding: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      isAuthenticated: false,

      // ログイン
      login: (user, wedding, accessToken, refreshToken) => {
        set({
          user,
          wedding,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      // ログアウト
      logout: () => {
        set({
          user: null,
          wedding: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
        // ログインページへリダイレクトは呼び出し側で行う
      },

      // トークン検証
      verifyToken: async () => {
        const { accessToken } = get()

        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false })
          return false
        }

        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken }),
          })

          if (!response.ok) {
            // トークンが無効な場合、リフレッシュを試みる
            const refreshed = await get().refreshAccessToken()
            if (!refreshed) {
              get().logout()
              return false
            }
            return true
          }

          const data = await response.json()

          if (data.isValid) {
            set({
              user: data.user,
              wedding: data.wedding,
              isAuthenticated: true,
              isLoading: false,
            })
            return true
          } else {
            get().logout()
            return false
          }
        } catch (error) {
          console.error('トークン検証エラー:', error)
          get().logout()
          return false
        }
      },

      // トークンリフレッシュ
      refreshAccessToken: async () => {
        const { refreshToken } = get()

        if (!refreshToken) {
          return false
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })

          if (!response.ok) {
            return false
          }

          const data = await response.json()

          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          })

          return true
        } catch (error) {
          console.error('トークンリフレッシュエラー:', error)
          return false
        }
      },

      // ローディング状態を設定
      setLoading: (isLoading) => {
        set({ isLoading })
      },

      // 初期化（アプリ起動時に呼び出す）
      initialize: async () => {
        set({ isLoading: true })
        const { accessToken } = get()

        if (!accessToken) {
          set({ isLoading: false })
          return
        }

        await get().verifyToken()
      },

      // Google OAuth認証
      signInWithGoogle: async (invitationToken?: string) => {
        set({ isLoading: true })

        try {
          const { supabase } = await import('@/lib/supabase')

          // リダイレクトURL（コールバック）を構築
          const redirectTo = `${window.location.origin}/api/auth/callback${
            invitationToken ? `?invitation_token=${invitationToken}` : ''
          }`

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          })

          if (error) {
            console.error('Google sign in error:', error)
            throw error
          }

          // リダイレクトが発生するため、ここには到達しない
        } catch (error) {
          console.error('Google OAuth error:', error)
          set({ isLoading: false })
          throw error
        }
      },

      // メール/パスワードでログイン
      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true })

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'ログインに失敗しました')
          }

          // ログイン成功
          get().login(
            data.user,
            data.wedding,
            data.session.access_token,
            data.session.refresh_token
          )
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // メール/パスワードで会員登録
      signUpWithEmail: async (
        email: string,
        password: string,
        userName: string,
        weddingDate?: string,
        invitationToken?: string
      ) => {
        set({ isLoading: true })

        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              userName,
              weddingDate,
              invitationToken,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || '会員登録に失敗しました')
          }

          // 会員登録成功後、自動的にログイン
          await get().signInWithEmail(email, password)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // 永続化する状態を選択（トークンのみ）
      partialize: (state) => ({
        user: state.user,
        wedding: state.wedding,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
