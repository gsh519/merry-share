import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import {
  cancelSubscription,
  reactivateSubscription,
  getSubscription,
} from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify user with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // Get user's wedding
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser?.wedding_id) {
      return NextResponse.json(
        { error: "結婚式情報が見つかりません" },
        { status: 404 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { wedding_id: dbUser.wedding_id },
      include: {
        plan: {
          select: {
            plan_id: true,
            name: true,
            display_name: true,
            price: true,
            currency: true,
            max_storage_gb: true,
            max_media_count: true,
            features: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "サブスクリプションの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify user with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // Get user's wedding
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser?.wedding_id) {
      return NextResponse.json(
        { error: "結婚式情報が見つかりません" },
        { status: 404 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { wedding_id: dbUser.wedding_id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Stripeサブスクリプションが見つかりません" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const immediate = searchParams.get("immediate") === "true";

    // Cancel subscription in Stripe
    const canceledSubscription = await cancelSubscription(
      subscription.stripe_subscription_id,
      !immediate
    );

    // Update subscription in database
    await prisma.subscription.update({
      where: { wedding_id: dbUser.wedding_id },
      data: {
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        cancel_at: canceledSubscription.cancel_at
          ? new Date(canceledSubscription.cancel_at * 1000)
          : null,
        status: immediate ? "canceled" : subscription.status,
        updated_at: new Date(),
        updated_by: user.id,
      },
    });

    return NextResponse.json({
      message: immediate
        ? "サブスクリプションを即座にキャンセルしました"
        : "サブスクリプションは期間終了時にキャンセルされます",
      subscription: canceledSubscription,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "サブスクリプションのキャンセルに失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify user with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "認証に失敗しました" },
        { status: 401 }
      );
    }

    // Get user's wedding
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      select: { wedding_id: true },
    });

    if (!dbUser?.wedding_id) {
      return NextResponse.json(
        { error: "結婚式情報が見つかりません" },
        { status: 404 }
      );
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { wedding_id: dbUser.wedding_id },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "サブスクリプションが見つかりません" },
        { status: 404 }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "Stripeサブスクリプションが見つかりません" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "reactivate") {
      // Reactivate canceled subscription
      if (!subscription.cancel_at_period_end) {
        return NextResponse.json(
          { error: "サブスクリプションはキャンセル予定ではありません" },
          { status: 400 }
        );
      }

      const reactivatedSubscription = await reactivateSubscription(
        subscription.stripe_subscription_id
      );

      // Update subscription in database
      await prisma.subscription.update({
        where: { wedding_id: dbUser.wedding_id },
        data: {
          cancel_at_period_end: false,
          cancel_at: null,
          updated_at: new Date(),
          updated_by: user.id,
        },
      });

      return NextResponse.json({
        message: "サブスクリプションを再開しました",
        subscription: reactivatedSubscription,
      });
    }

    return NextResponse.json(
      { error: "無効なアクションです" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "サブスクリプションの更新に失敗しました" },
      { status: 500 }
    );
  }
}
