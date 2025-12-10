import { create } from "zustand";

export const useCurrentFolderIdStore = create<{
    currentFolderId: string;
    setCurrentFolderId: (folderId: string) => void;
}>((set) => ({
    currentFolderId: "",
    setCurrentFolderId: (folderId: string) => set({ currentFolderId: folderId }),
}));