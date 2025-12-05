import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabase = await createClient();
        if (supabase) {
            await supabase.auth.exchangeCodeForSession(code);
        }
    }

    // 重定向到主页面
    return NextResponse.redirect(new URL("/main", requestUrl.origin));
}