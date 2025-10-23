import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get all active plans
    const plans = await prisma.plan.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        price: "asc",
      },
      select: {
        plan_id: true,
        name: true,
        display_name: true,
        description: true,
        price: true,
        currency: true,
        max_storage_gb: true,
        max_media_count: true,
        features: true,
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "プランの取得に失敗しました" },
      { status: 500 }
    );
  }
}
