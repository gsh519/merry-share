import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: '招待トークンが指定されていません' },
        { status: 400 }
      )
    }

    // 招待情報を取得
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        wedding: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: '無効な招待URLです' },
        { status: 404 }
      )
    }

    // 既に使用済みかチェック
    if (invitation.used_at) {
      return NextResponse.json(
        { error: 'この招待URLは既に使用されています' },
        { status: 400 }
      )
    }

    // 有効期限切れかチェック
    if (new Date() > invitation.expires_at) {
      return NextResponse.json(
        { error: '招待URLの有効期限が切れています' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        valid: true,
        invitation: {
          email: invitation.email,
          wedding_id: invitation.wedding_id,
          expires_at: invitation.expires_at
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('招待トークン検証エラー:', error)
    return NextResponse.json(
      { error: '招待トークンの検証中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
