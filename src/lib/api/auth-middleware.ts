import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  supabaseUser: SupabaseUser
  dbUser: {
    user_id: string
    user_name: string
    email: string
    wedding_id: string
  }
}

/**
 * APIリクエストから認証トークンを検証し、ユーザー情報を返す
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: NextResponse | null }> {
  // 認証トークンを取得
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    console.error('[Auth Middleware] No authorization header')
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      ),
    }
  }

  const token = authHeader.replace('Bearer ', '')

  if (!token) {
    console.error('[Auth Middleware] Invalid authorization header format')
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '無効な認証トークンです' },
        { status: 401 }
      ),
    }
  }

  // Supabaseでトークンを検証
  const { data: { user: supabaseUser }, error: authError } = await supabaseServer.auth.getUser(token)

  if (authError || !supabaseUser) {
    console.error('[Auth Middleware] Token verification failed:', authError?.message)
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '認証トークンが無効です' },
        { status: 401 }
      ),
    }
  }

  // データベースからユーザー情報を取得
  try {
    const dbUser = await prisma.user.findUnique({
      where: { user_id: supabaseUser.id },
      select: {
        user_id: true,
        user_name: true,
        email: true,
        wedding_id: true,
      },
    })

    if (!dbUser) {
      console.error('[Auth Middleware] User not found in database:', supabaseUser.id)
      return {
        user: null,
        error: NextResponse.json(
          { success: false, error: 'ユーザー情報が見つかりません' },
          { status: 404 }
        ),
      }
    }

    return {
      user: {
        supabaseUser,
        dbUser,
      },
      error: null,
    }
  } catch (error) {
    console.error('[Auth Middleware] Database error:', error)
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      ),
    }
  }
}

/**
 * 認証が必要なAPIハンドラーをラップするヘルパー関数
 *
 * @example
 * export const POST = withAuth(async (request, { user }) => {
 *   // user.dbUser.wedding_id などが使用可能
 *   return NextResponse.json({ success: true })
 * })
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { user, error } = await authenticate(request)

    if (error) {
      return error
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    return handler(request, { user })
  }
}
