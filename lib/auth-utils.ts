"use client";

import { createClient } from "@/lib/supabase/client";

// 登录函数
export async function signInWithEmail(email: string, password: string) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
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

    // 如果注册成功，创建用户记录
    if (data.user) {
        await createUserRecord(data.user.id, email, username || email.split('@')[0]);
    }

    return data;
}

// 创建用户记录
export async function createUserRecord(userId: string, email: string, username: string) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            email: email,
            username: username,
            password: 'oauth-user', // 对于OAuth用户，密码不是必须的
        });

    if (error) {
        // 如果用户已存在，忽略错误
        if (error.code !== '23505') {
            console.error('Error creating user record:', error);
        }
    }
}

// GitHub 登录
export async function signInWithGitHub() {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
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

// 获取当前用户
export async function getCurrentUser() {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data: { user } } = await supabase.auth.getUser();
    return user;
}