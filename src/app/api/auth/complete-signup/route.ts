import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const completeSignUpSchema = z.object({
  email: z.string().email(),
  userName: z.string().min(1),
  weddingDate: z.string().optional(),
  invitationToken: z.string().optional(),
});

/**
 * Google OAuth認証後の会員登録完了処理
 *
 * 招待トークンがある場合: 既存のWeddingに紐付け
 * 招待トークンがない場合: 新規Weddingを作成
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの検証
    const body = await request.json();
    const validationResult = completeSignUpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "入力内容が正しくありません", details: validationResult.error },
        { status: 400 }
      );
    }

    const { email, userName, weddingDate, invitationToken } = validationResult.data;

    // 認証チェック
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user || user.email !== email) {
      return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
    }

    // ユーザーが既に存在しないか確認
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "既に登録済みです" }, { status: 400 });
    }

    let weddingId: string;

    // 招待トークンがある場合
    if (invitationToken) {
      // 招待トークンを検証
      const invitation = await prisma.invitation.findFirst({
        where: {
          token: invitationToken,
          email: email,
          used_at: null,
          expires_at: {
            gt: new Date(),
          },
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "招待トークンが無効です" },
          { status: 400 }
        );
      }

      weddingId = invitation.wedding_id;

      // 招待トークンを使用済みにマーク
      await prisma.invitation.update({
        where: { invitation_id: invitation.invitation_id },
        data: { used_at: new Date() },
      });
    } else {
      // 新規Wedding作成（結婚式の日付が必須）
      if (!weddingDate) {
        return NextResponse.json(
          { error: "結婚式の日付を入力してください" },
          { status: 400 }
        );
      }

      const wedding = await prisma.wedding.create({
        data: {
          wedding_date: new Date(weddingDate),
        },
      });

      weddingId = wedding.wedding_id;
    }

    // ユーザーを作成
    const newUser = await prisma.user.create({
      data: {
        user_id: user.id,
        email: email,
        user_name: userName,
        wedding_id: weddingId,
      },
      include: {
        wedding: true,
      },
    });

    return NextResponse.json({
      user: {
        id: newUser.user_id,
        email: newUser.email,
        userName: newUser.user_name,
      },
      wedding: {
        id: newUser.wedding.wedding_id,
        weddingDate: newUser.wedding.wedding_date.toISOString(),
      },
    });
  } catch (error) {
    console.error("Complete signup error:", error);
    return NextResponse.json(
      { error: "会員登録に失敗しました" },
      { status: 500 }
    );
  }
}
