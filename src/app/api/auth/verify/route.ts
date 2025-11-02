import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json(
        { error: 'アクセストークンが必要です' },
        { status: 400 }
      )
    }

    // Supabaseでトークンを検証
    const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser(access_token)

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '無効なトークンです', isValid: false },
        { status: 401 }
      )
    }

    // データベースからユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { user_id: authUser.id },
      include: {
        wedding: true,
      },
    })

    if (!user || !user.wedding) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません', isValid: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      isValid: true,
      user: {
        id: user.user_id,
        email: user.email,
        userName: user.user_name,
      },
      wedding: {
        id: user.wedding.wedding_id,
        weddingDate: user.wedding.wedding_date.toISOString(),
      },
    })
  } catch (error) {
    console.error('トークン検証エラー:', error)
    return NextResponse.json(
      { error: 'トークンの検証に失敗しました', isValid: false },
      { status: 500 }
    )
  }
}
