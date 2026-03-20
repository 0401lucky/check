import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
  bumpEpoch,
  clearFailedAttempts,
  verifyAuth,
  recordFailedAttempt,
} from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (await verifyAuth(request)) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      const rateState = await recordFailedAttempt();

      if (rateState.limited) {
        return NextResponse.json(
          {
            error: `请求过于频繁，请 ${rateState.retryAfter} 秒后重试`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateState.retryAfter ?? 1),
            },
          }
        );
      }

      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    await clearFailedAttempts();

    const token = await createSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (await verifyAuth(request)) {
    await bumpEpoch();
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
