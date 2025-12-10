import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Auth API" });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // 处理认证逻辑
  return NextResponse.json({ success: true });
}
