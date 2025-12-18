'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Provider } from '@radix-ui/react-tooltip';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    signIn: () => Promise<void>; // 添加登录方法
    isAuthenticated: boolean; // 添加认证状态
}

// 定义认证上下文类型
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
    refreshUser: async () => { },
    signIn: async () => { }, // 添加登录方法
    isAuthenticated: false // 添加认证状态
});

/**
 * AuthProvider组件，用于提供全局的认证状态管理
 * @param children - React组件的子节点
 * @returns 提供认证上下文的Provider组件
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // 使用useState管理用户状态，初始值为null
    const [user, setUser] = useState<User | null>(null);
    // 使用useState加载状态，初始值为true
    const [loading, setLoading] = useState(true);

    /**
     * 刷新用户信息的异步函数
     * 该函数会从Supabase获取最新的用户信息并更新状态
     */
    const refreshUser = async () => {
        const supabase = createClient(); // 创建Supabase客户端实例
        // 从Supabase获取当前用户信息
        // 使用解构赋值直接获取user对象，是当前会话的用户信息、认证用户的基本信息
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user); // 更新用户状态
    };

    // 使用useEffect在组件挂载时执行初始化操作
    useEffect(() => {
        // 首次加载时刷新用户信息，确保页面刷新后用户状态不丢失 是一个异步的
        refreshUser();

        // 监听认证状态变化
        const supabase = createClient();
        // 订阅认证状态变化事件，实时性
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: any, session: { user: any; }) => {
                // 根据会话状态更新用户信息
                setUser(session?.user || null);
                // 完成加载状态更新
                setLoading(false);
            }
        );

        // 组件卸载时取消订阅
        return () => subscription.unsubscribe();
    }, []);

    const signIn = useCallback(async (provider = 'github') => {
        const supabase = createClient();
        // 调用Supabase的登录功能
        const { user, error } = await supabase.auth.signIn({
            provider: provider,
        });
        // 处理登录结果
        if (error) {
            console.error('登录失败:', error.message);
        } else {
            console.log('登录成功:', user);
            setUser(user); // 更新用户状态
        }
    }, [])

    // 用户登出的异步函数
    const signOut = useCallback(async () => {
        const supabase = createClient();
        // 调用Supabase的登出功能
        await supabase.auth.signOut();
        // 清除本地用户状态
        setUser(null);
    }, []);

    // 返回认证上下文Provider，提供用户状态、加载状态、登出和刷新功能
    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            signOut, 
            refreshUser,
            signIn,
            isAuthenticated: user !== null}}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}