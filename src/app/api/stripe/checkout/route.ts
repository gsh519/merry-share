import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, createCustomer } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.string(),
  weddingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    // Check if user belongs to the wedding
    const dbUser = await prisma.user.findUnique({
      where: { user_id: user.id },
      include: { wedding: true },
    });

    if (!dbUser || dbUser.wedding_id !== validatedData.weddingId) {
      return NextResponse.json(
        { error: "この結婚式へのアクセス権限がありません" },
        { status: 403 }
      );
    }

    // Check if plan exists
    const plan = await prisma.plan.findUnique({
      where: { plan_id: validatedData.planId, is_active: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "プランが見つかりません" },
        { status: 404 }
      );
    }

    if (!plan.stripe_price_id) {
      return NextResponse.json(
        { error: "このプランはStripeに登録されていません" },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { wedding_id: validatedData.weddingId },
    });

    if (existingSubscription && existingSubscription.status === "active") {
      return NextResponse.json(
        { error: "既にアクティブなサブスクリプションが存在します" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = existingSubscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await createCustomer({
        email: dbUser.email,
        name: dbUser.user_name,
        metadata: {
          wedding_id: validatedData.weddingId,
          user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerId,
      successUrl: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/subscription/cancel`,
      metadata: {
        wedding_id: validatedData.weddingId,
        plan_id: validatedData.planId,
        user_id: user.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力データが無効です", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "チェックアウトセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
