import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      )
    }

    // Supabase Authでログイン
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Supabase Auth Error:', authError)
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'ログインに失敗しました' },
        { status: 401 }
      )
    }

    // ユーザー情報とウェディング情報を取得
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: authData.user.id },
        include: {
          wedding: true,
        },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'ユーザー情報が見つかりません' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          message: 'ログインに成功しました',
          user: {
            id: authData.user.id,
            email: authData.user.email,
            userName: user.user_name,
            weddingId: user.wedding_id,
          },
          wedding: {
            id: user.wedding.wedding_id,
            weddingDate: user.wedding.wedding_date,
          },
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
          },
        },
        { status: 200 }
      )
    } catch (prismaError) {
      console.error('User Fetch Error:', prismaError)
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json(
      { error: 'ログイン中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
