import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // 这里你需要使用服务端Supabase客户端来检查会话
    // 但由于中间件是边缘函数，需要使用特殊的Supabase客户端
    // 这里简化处理，你可以根据需要调整

    const session = request.cookies.get("sb-access-token");

    // 如果是登录/注册页面且有会话，重定向到主页
    if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
        return NextResponse.redirect(new URL('/main', request.url));
    }

    // 如果访问受保护页面且没有会话，重定向到登录页
    if (!session && request.nextUrl.pathname.startsWith('/main')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};