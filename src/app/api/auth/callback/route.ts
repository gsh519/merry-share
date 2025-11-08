import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import prisma from "@/lib/prisma";

/**
 * Google OAuth認証後のコールバック処理
 *
 * フロー:
 * 1. Supabaseからcode/error受け取り
 * 2. codeをセッションに交換
 * 3. ユーザー情報を取得
 * 4. DBにユーザーが存在しない場合は作成処理へリダイレクト
 * 5. 存在する場合はホームへリダイレクト
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // 招待トークンの取得（会員登録時に使用）
  const invitationToken = requestUrl.searchParams.get("invitation_token");

  // エラーチェック
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(
        errorDescription || error
      )}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(
        "認証コードが見つかりません"
      )}`
    );
  }

  try {
    const supabase = createClient();

    // codeをセッションに交換
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("Session exchange error:", sessionError);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(
          "認証に失敗しました"
        )}`
      );
    }

    const user = sessionData.user;
    if (!user || !user.email) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(
          "ユーザー情報の取得に失敗しました"
        )}`
      );
    }

    // DBでユーザーを確認
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { wedding: true },
    });

    if (dbUser) {
      // 既存ユーザー: ホームへリダイレクト
      // セッション情報をクエリパラメータで渡す（フロントエンドでZustandに保存）
      const redirectUrl = new URL("/", requestUrl.origin);
      redirectUrl.searchParams.set("access_token", sessionData.session.access_token);
      redirectUrl.searchParams.set("refresh_token", sessionData.session.refresh_token);

      return NextResponse.redirect(redirectUrl.toString());
    } else {
      // 新規ユーザー: 会員登録完了ページへリダイレクト
      const redirectUrl = new URL("/signup/complete", requestUrl.origin);
      redirectUrl.searchParams.set("access_token", sessionData.session.access_token);
      redirectUrl.searchParams.set("refresh_token", sessionData.session.refresh_token);
      redirectUrl.searchParams.set("email", user.email);
      redirectUrl.searchParams.set("name", user.user_metadata?.full_name || user.email.split("@")[0]);

      // 招待トークンがある場合は引き継ぐ
      if (invitationToken) {
        redirectUrl.searchParams.set("invitation_token", invitationToken);
      }

      return NextResponse.redirect(redirectUrl.toString());
    }
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${encodeURIComponent(
        "予期しないエラーが発生しました"
      )}`
    );
  }
}
