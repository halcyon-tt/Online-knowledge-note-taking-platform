"use client";

import { createClient } from "@/lib/supabase/client";
import { PostgrestError } from '@supabase/supabase-js';

// 简化登录函数（不依赖外键）
export async function signInWithEmail(email: string, password: string) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;

    // 尝试创建用户记录，但不阻塞
    if (data.user) {
        createUserRecordNonBlocking(data.user, 'email');
    }

    return data;
}

// 注册函数
export async function signUpWithEmail(
    email: string,
    password: string,
    username?: string
) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username || email.split('@')[0],
            },
        },
    });

    if (error) throw error;

    // 尝试创建用户记录，但不阻塞
    if (data.user) {
        createUserRecordNonBlocking(data.user, 'email', username);
    }

    return data;
}

// 非阻塞的用户记录创建
async function createUserRecordNonBlocking(
    user: any,
    authProvider: 'email' | 'github' = 'email',
    customUsername?: string
) {
    try {
        const supabase = createClient();
        if (!supabase) return;

        const username = customUsername ||
            user.user_metadata?.username ||
            user.email?.split('@')[0] ||
            '用户';

        // 简单的插入，不等待结果
        supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                username: username,
                auth_provider: authProvider,
                avatar_url: user.user_metadata?.avatar_url || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'id'
            })
            .then(({ error }: { error: PostgrestError | null }) => {
                if (error && error.code !== '23505') {
                    console.log('创建用户记录（非阻塞）:', error.message);
                }
            });
    } catch (error) {
        // 静默失败，不阻塞主流程
        console.log('非阻塞用户记录创建失败:', error);
    }
}

// GitHub 登录（简化版）
export async function signInWithGitHub() {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo,
        },
    });

    if (error) throw error;
    return data;
}

// 退出登录
export async function signOut() {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// 获取当前用户（简化）
export async function getCurrentUser() {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// 获取当前用户ID（简化，不创建用户记录）
export async function getUserId() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch (error) {
        console.log('获取用户ID失败:', error);
        return null;
    }
}

// 检查用户是否在 public.users 中（可选）
export async function checkUserInPublicTable(userId: string): Promise<boolean> {
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.log('检查用户失败:', error);
        }

        return !!data;
    } catch (error) {
        console.log('检查用户异常:', error);
        return false;
    }
}