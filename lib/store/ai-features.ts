"use client";

import { create } from "zustand";

interface AiFeatureStore {
  ghostTextEnabled: boolean;
  toggleGhostText: () => void;
  setGhostText: (enabled: boolean) => void;
}

// AG-UI Phase B：跨组件共享 Ghost Text 开关。
// NoteEditor 读这个状态决定是否挂 useGhostSuggestion；
// AgentChatPanel 提供 toggle 按钮写它。
// localStorage 持久化避免每次刷新都关掉。
const STORAGE_KEY = "ai-ghost-text-enabled";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function persist(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }
}

export const useAiFeatureStore = create<AiFeatureStore>((set, get) => ({
  ghostTextEnabled: readInitial(),
  toggleGhostText: () => {
    const next = !get().ghostTextEnabled;
    persist(next);
    set({ ghostTextEnabled: next });
  },
  setGhostText: (enabled: boolean) => {
    persist(enabled);
    set({ ghostTextEnabled: enabled });
  },
}));
