import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, userName, weddingDate, invitationToken } = body

    // 招待トークンの有無で処理を分岐
    let invitationData = null

    if (invitationToken) {
      // 招待経由の場合：招待トークンを検証
      const invitation = await prisma.invitation.findUnique({
        where: { token: invitationToken }
      })

      if (!invitation) {
        return NextResponse.json(
          { error: '無効な招待URLです' },
          { status: 400 }
        )
      }

      if (invitation.used_at) {
        return NextResponse.json(
          { error: 'この招待URLは既に使用されています' },
          { status: 400 }
        )
      }

      if (new Date() > invitation.expires_at) {
        return NextResponse.json(
          { error: '招待URLの有効期限が切れています' },
          { status: 400 }
        )
      }

      if (invitation.email !== email) {
        return NextResponse.json(
          { error: '招待されたメールアドレスと異なります' },
          { status: 400 }
        )
      }

      invitationData = invitation

      // 招待経由の場合：結婚式の日付は不要（招待者のwedding_idを使用）
      if (!email || !password || !userName) {
        return NextResponse.json(
          { error: 'メールアドレス、パスワード、ユーザー名は必須です' },
          { status: 400 }
        )
      }
    } else {
      // 通常の会員登録：結婚式の日付が必要
      if (!email || !password || !userName || !weddingDate) {
        return NextResponse.json(
          { error: 'メールアドレス、パスワード、ユーザー名、結婚式の日付は必須です' },
          { status: 400 }
        )
      }
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で設定してください' },
        { status: 400 }
      )
    }

    // Supabase Authでユーザー登録
    const { data: authData, error: authError } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_name: userName,
        },
        emailRedirectTo: undefined,
      },
    })

    if (authError) {
      console.error('Supabase Auth Error:', authError)
      console.error('Error details:', JSON.stringify(authError, null, 2))
      console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.error('Using Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return NextResponse.json(
        { error: authError.message || '会員登録に失敗しました' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'ユーザーの作成に失敗しました' },
        { status: 400 }
      )
    }

    // Weddingレコードを作成または既存のものを使用
    let wedding

    if (invitationData) {
      // 招待経由の場合：既存のweddingを取得
      try {
        const existingWedding = await prisma.wedding.findUnique({
          where: { wedding_id: invitationData.wedding_id }
        })

        if (!existingWedding) {
          return NextResponse.json(
            { error: 'ウェディング情報が見つかりません' },
            { status: 404 }
          )
        }

        wedding = existingWedding
      } catch (prismaError) {
        console.error('Wedding Fetch Error:', prismaError)
        return NextResponse.json(
          { error: 'ウェディング情報の取得に失敗しました' },
          { status: 500 }
        )
      }
    } else {
      // 通常の会員登録：新しいweddingを作成
      try {
        wedding = await prisma.wedding.create({
          data: {
            wedding_date: new Date(weddingDate),
            created_by: authData.user.id,
            updated_by: authData.user.id,
          },
        })
      } catch (prismaError) {
        console.error('Wedding Creation Error:', prismaError)
        return NextResponse.json(
          { error: 'ウェディング情報の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    // Userレコードを作成（Weddingと紐付け）
    try {
      await prisma.user.create({
        data: {
          user_id: authData.user.id,
          wedding_id: wedding.wedding_id,
          user_name: userName,
          email: email,
          password: '', // Supabase Authが管理するため空文字
          created_by: authData.user.id,
          updated_by: authData.user.id,
        },
      })
    } catch (prismaError) {
      console.error('User Creation Error:', prismaError)
      return NextResponse.json(
        { error: 'ユーザー情報の作成に失敗しました' },
        { status: 500 }
      )
    }

    // 招待トークンを使用済みにマーク
    if (invitationData) {
      try {
        await prisma.invitation.update({
          where: { invitation_id: invitationData.invitation_id },
          data: { used_at: new Date() }
        })
      } catch (prismaError) {
        console.error('Invitation Update Error:', prismaError)
        // エラーログは出すが、会員登録自体は成功とする
      }
    }

    return NextResponse.json(
      {
        message: '会員登録が完了しました',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          userName: userName,
        },
        wedding: {
          id: wedding.wedding_id,
          weddingDate: wedding.wedding_date,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup Error:', error)
    return NextResponse.json(
      { error: '会員登録中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
