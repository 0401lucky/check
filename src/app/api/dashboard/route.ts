import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import crypto from "crypto";

export async function GET() {
  try {
    const data = await getDashboardData();
    const body = JSON.stringify(data);
    const etag = `"${crypto.createHash("md5").update(body).digest("hex")}"`;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[API] 获取仪表盘数据失败:", err);
    return NextResponse.json(
      { error: "获取数据失败" },
      { status: 500 }
    );
  }
}
