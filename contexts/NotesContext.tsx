'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Note } from '@/types/note';

interface NotesContextType {
    notes: Note[];
    loading: boolean;
    refreshNotes: () => Promise<void>;
    addNote: (note: Note) => void;
    updateNote: (noteId: string, updates: Partial<Note>) => void;
    deleteNote: (noteId: string) => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: ReactNode }) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const useLocalStorage = !isSupabaseConfigured();

    // 刷新笔记列表
    const refreshNotes = useCallback(async () => {
        setLoading(true);
        try {
            if (useLocalStorage) {
                // 本地存储逻辑
                const { getLocalNotes } = await import('@/lib/local-storage');
                setNotes(getLocalNotes());
            } else {
                // Supabase 逻辑
                const supabase = createClient();
                if (!supabase) {
                    setNotes([]);
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setNotes([]);
                    return;
                }

                const { data, error } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false });

                if (error) {
                    console.error('Error loading notes:', error);
                    setNotes([]);
                } else {
                    setNotes((data as Note[]) || []);
                }
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [useLocalStorage]);

    // 添加新笔记
    const addNote = useCallback((note: Note) => {
        setNotes(prev => [note, ...prev]);
    }, []);

    // 更新笔记
    const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
        setNotes(prev => prev.map(note =>
            note.id === noteId ? { ...note, ...updates } : note
        ));
    }, []);

    // 删除笔记
    const deleteNote = useCallback((noteId: string) => {
        setNotes(prev => prev.filter(note => note.id !== noteId));
    }, []);

    // 初始加载
    React.useEffect(() => {
        refreshNotes();
    }, [refreshNotes]);

    return (
        <NotesContext.Provider value={{
            notes,
            loading,
            refreshNotes,
            addNote,
            updateNote,
            deleteNote
        }}>
            {children}
        </NotesContext.Provider>
    );
}

export function useNotes() {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error('useNotes must be used within a NotesProvider');
    }
    return context;
}