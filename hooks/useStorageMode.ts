// hooks/useStorageMode.ts
import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';

export type StorageMode = 'supabase' | 'local' | 'auto';

export function useStorageMode() {
    const isOnline = useNetworkStatus();
    const [mode, setMode] = useState<StorageMode>('auto');
    const [forceLocal, setForceLocal] = useState(false);

    // 计算当前实际存储模式
    const getCurrentMode = () => {
        if (forceLocal) return 'local';
        if (mode === 'local') return 'local';
        if (mode === 'supabase') return 'supabase';

        // 自动模式：根据网络状态和Supabase配置
        if (!isSupabaseConfigured()) return 'local';
        if (!isOnline) return 'local';
        return 'supabase';
    };

    // 简化使用：返回是否使用本地存储
    const useLocalStorage = getCurrentMode() === 'local';

    // 手动设置存储模式
    const setStorageMode = (newMode: StorageMode) => {
        setMode(newMode);
    };

    // 强制使用本地存储（比如出错时）
    const forceLocalStorage = () => {
        setForceLocal(true);
    };

    // 恢复自动模式
    const resetToAuto = () => {
        setForceLocal(false);
        setMode('auto');
    };

    return {
        isOnline,
        storageMode: getCurrentMode(),
        useLocalStorage,
        setStorageMode,
        forceLocalStorage,
        resetToAuto,
        isSupabaseConfigured: isSupabaseConfigured()
    };
}