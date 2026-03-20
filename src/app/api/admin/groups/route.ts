import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateCache } from "@/lib/dashboard";
import { verifyAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const groups = await db.group.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { configs: true } },
      },
    });

    return NextResponse.json(groups);
  } catch (err) {
    console.error("[API] 获取分组列表失败:", err);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "缺少必填字段：name" },
        { status: 400 }
      );
    }

    const group = await db.group.create({
      data: {
        name: String(name),
        description: description ? String(description) : null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    invalidateCache();
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("[API] 创建分组失败:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, description, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    // 白名单字段
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name);
    if (description !== undefined) data.description = description ? String(description) : null;
    if (sortOrder !== undefined) data.sortOrder = typeof sortOrder === "number" ? sortOrder : 0;

    const group = await db.group.update({
      where: { id: String(id) },
      data,
    });

    invalidateCache();
    return NextResponse.json(group);
  } catch (err) {
    console.error("[API] 更新分组失败:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await db.checkConfig.updateMany({
      where: { groupId: id },
      data: { groupId: null },
    });

    await db.group.delete({ where: { id } });
    invalidateCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] 删除分组失败:", err);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
