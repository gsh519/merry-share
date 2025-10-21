'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  userName: string
}

interface Wedding {
  id: number
  weddingDate: string
}

interface AuthContextType {
  user: User | null
  wedding: Wedding | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User, wedding: Wedding, accessToken: string, refreshToken: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // ローカルストレージから認証情報を読み込む
    const loadAuthData = () => {
      try {
        const storedUser = localStorage.getItem('user')
        const storedWedding = localStorage.getItem('wedding')
        const accessToken = localStorage.getItem('access_token')

        if (storedUser && storedWedding && accessToken) {
          setUser(JSON.parse(storedUser))
          setWedding(JSON.parse(storedWedding))
        }
      } catch (error) {
        console.error('認証情報の読み込みに失敗しました:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuthData()
  }, [])

  const login = (user: User, wedding: Wedding, accessToken: string, refreshToken: string) => {
    setUser(user)
    setWedding(wedding)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('wedding', JSON.stringify(wedding))
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  const logout = () => {
    setUser(null)
    setWedding(null)
    localStorage.removeItem('user')
    localStorage.removeItem('wedding')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.push('/login')
  }

  const isAuthenticated = !!user && !!wedding

  return (
    <AuthContext.Provider
      value={{
        user,
        wedding,
        isLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
