import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { withAuth } from '@/lib/api/auth-middleware'

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const weddingId = user.dbUser.wedding_id;

    const body = await request.json()
    const { email } = body

    // バリデーション
    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスは必須です' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // 既に登録済みのメールアドレスかチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // 既存の未使用招待トークンがあるかチェック
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        wedding_id: weddingId,
        used_at: null,
        expires_at: {
          gte: new Date()
        }
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'このメールアドレスには既に招待メールが送信されています' },
        { status: 400 }
      )
    }

    // 招待トークンを生成（ランダムな32バイトのトークン）
    const invitationToken = crypto.randomBytes(32).toString('hex')

    // 有効期限を設定（1日後）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 1)

    // 招待レコードを作成
    const invitation = await prisma.invitation.create({
      data: {
        wedding_id: weddingId,
        invited_by: user.dbUser.user_id,
        email,
        token: invitationToken,
        expires_at: expiresAt
      }
    })

    // 招待URLを生成
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/signup?token=${invitationToken}`

    // Supabaseを使って招待メールを送信
    // Note: Supabaseのメール機能を使う場合、カスタムメールテンプレートが必要
    // ここでは簡易的な実装として、招待URLを返すのみとします
    // 本番環境では、SendGrid、AWS SES、Resendなどのメールサービスを使用することを推奨

    console.log('[招待メール] 送信先:', email)
    console.log('[招待URL]:', invitationUrl)

    // TODO: 実際のメール送信処理をここに実装
    // 例: SendGrid、AWS SES、Resendなどを使用

    return NextResponse.json(
      {
        message: '招待メールを送信しました',
        invitation: {
          id: invitation.invitation_id,
          email: invitation.email,
          expires_at: invitation.expires_at,
          invitation_url: invitationUrl
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('招待メール送信エラー:', error)
    return NextResponse.json(
      { error: '招待メールの送信中にエラーが発生しました' },
      { status: 500 }
    )
  }
});
