import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * 处理 OAuth 回调的 GET 请求处理器
 * 主要功能：处理 GitHub/邮箱登录的回调，交换 code 为 session，创建用户记录，并重定向到相应页面
 */
export async function GET(request: Request) {
    try {
        // 从请求 URL 中提取查询参数
        const requestUrl = new URL(request.url)
        const code = requestUrl.searchParams.get('code')        // OAuth 授权码
        const error = requestUrl.searchParams.get('error')      // 错误信息
        const next = requestUrl.searchParams.get('next') || '/dashboard'  // 登录成功后的目标页面

        // 处理 OAuth 错误情况
        if (error) {
            console.error('OAuth 错误:', error);
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin))
        }

        // 如果没有 code 参数，直接重定向到登录页
        if (!code) {
            console.warn('没有找到 code 参数');
            return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
        }

        // 获取 cookies 和初始化响应
        const cookieStore = await cookies()
        let response = NextResponse.next()

        // 创建服务器端 Supabase 客户端（使用新 API）
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        // 关键：在路由处理器中通过 NextResponse 设置 cookies
                        cookiesToSet.forEach(({ name, value, ...options }) => {
                            response.cookies.set({ name, value, ...options })
                        })
                    },
                },
            }
        )

        // 交换 code 为 session
        console.log('正在交换 code 为 session...');
        const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
            console.error('交换 session 失败:', exchangeError);
            return NextResponse.redirect(new URL('/login?error=exchange_failed', requestUrl.origin))
        }

        if (!session?.user) {
            console.error('没有获取到用户 session');
            return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin))
        }

        console.log('用户登录成功:', session.user.email);

        // 判断登录方式
        const appMetadata = session.user.app_metadata || {};
        const isGitHubUser = appMetadata.provider === 'github';
        console.log('登录方式:', isGitHubUser ? 'GitHub' : '邮箱');

        // 尝试创建用户记录（非阻塞，可失败）
        try {
            const username = isGitHubUser
                ? session.user.user_metadata?.user_name ||
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.username ||
                session.user.email?.split('@')[0] ||
                'GitHub用户'
                : session.user.email?.split('@')[0] || '用户';

            // 先检查 users 表是否有 auth_provider 列
            let userData: any = {
                id: session.user.id,
                email: session.user.email,
                username: username,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                updated_at: new Date().toISOString(),
            }

            // 只有在确认字段存在时才添加 auth_provider
            // 注意：理想情况下应在数据库中添加此字段，这里提供回退方案
            try {
                // 尝试包含 auth_provider
                userData.auth_provider = isGitHubUser ? 'github' : 'email';
            } catch (fieldError) {
                console.log('忽略 auth_provider 字段，可能不存在于数据库表中');
            }

            // 使用 then 处理异步操作，不阻塞主流程
            supabase
                .from('users')
                .upsert(userData, { onConflict: 'id' })
                .then(({ error: upsertError }: { error: PostgrestError | null }) => {
                    if (upsertError) {
                        // 如果是字段不存在错误，移除该字段重试
                        if (upsertError.code === '42703' && upsertError.message.includes('auth_provider')) {
                            console.log('检测到 auth_provider 字段不存在，移除后重试...');

                            const { auth_provider, ...userDataWithoutProvider } = userData;

                            supabase
                                .from('users')
                                .upsert(userDataWithoutProvider, { onConflict: 'id' })
                                .then(({ error: retryError }: { error: PostgrestError | null }) => {
                                    if (retryError && retryError.code !== '23505') {
                                        console.log('重试创建用户记录失败:', retryError.message);
                                    }
                                });
                        } else if (upsertError.code !== '23505') { // 忽略唯一约束错误
                            console.log('创建用户记录失败:', upsertError.message);
                        }
                    }
                });

        } catch (userError: any) {
            // 静默失败，不阻止登录流程
            console.log('创建用户记录异常（可忽略）:', userError.message || userError);
        }

        // 成功登录，重定向到目标页面
        console.log('重定向到:', next);
        const redirectResponse = NextResponse.redirect(new URL(next, requestUrl.origin))

        // 复制已设置的 cookies 到重定向响应
        response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie)
        })

        return redirectResponse

    } catch (error: any) {
        console.error('OAuth 回调处理异常:', error);
        const requestUrl = new URL(request.url)
        return NextResponse.redirect(new URL('/login?error=server_error', requestUrl.origin))
    }
}