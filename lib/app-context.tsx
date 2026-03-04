import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getReadChapters,
  markChapterRead,
  getBookmarks,
  toggleBookmark,
  getChecklist,
  toggleChecklistItem,
} from "./storage";

interface AppState {
  readChapters: number[];
  bookmarks: number[];
  checkedItems: string[];
  isLoading: boolean;
  handleMarkRead: (chapterId: number) => Promise<void>;
  handleToggleBookmark: (chapterId: number) => Promise<void>;
  handleToggleChecklist: (itemId: string) => Promise<void>;
  isChapterRead: (chapterId: number) => boolean;
  isBookmarked: (chapterId: number) => boolean;
  isChecked: (itemId: string) => boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [readChapters, setReadChapters] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [read, bm, cl] = await Promise.all([
        getReadChapters(),
        getBookmarks(),
        getChecklist(),
      ]);
      setReadChapters(read);
      setBookmarks(bm);
      setCheckedItems(cl);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleMarkRead = useCallback(async (chapterId: number) => {
    const updated = await markChapterRead(chapterId);
    setReadChapters(updated);
  }, []);

  const handleToggleBookmark = useCallback(async (chapterId: number) => {
    const updated = await toggleBookmark(chapterId);
    setBookmarks(updated);
  }, []);

  const handleToggleChecklist = useCallback(async (itemId: string) => {
    const updated = await toggleChecklistItem(itemId);
    setCheckedItems(updated);
  }, []);

  const isChapterRead = useCallback(
    (chapterId: number) => readChapters.includes(chapterId),
    [readChapters]
  );

  const isBookmarked = useCallback(
    (chapterId: number) => bookmarks.includes(chapterId),
    [bookmarks]
  );

  const isChecked = useCallback(
    (itemId: string) => checkedItems.includes(itemId),
    [checkedItems]
  );

  return (
    <AppContext.Provider
      value={{
        readChapters,
        bookmarks,
        checkedItems,
        isLoading,
        handleMarkRead,
        handleToggleBookmark,
        handleToggleChecklist,
        isChapterRead,
        isBookmarked,
        isChecked,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}
