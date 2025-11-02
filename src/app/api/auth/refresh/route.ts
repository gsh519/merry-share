import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'リフレッシュトークンが必要です' },
        { status: 400 }
      )
    }

    // Supabaseでトークンをリフレッシュ
    const { data, error } = await supabaseServer.auth.refreshSession({
      refresh_token,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'トークンのリフレッシュに失敗しました' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    })
  } catch (error) {
    console.error('トークンリフレッシュエラー:', error)
    return NextResponse.json(
      { error: 'トークンのリフレッシュに失敗しました' },
      { status: 500 }
    )
  }
}
