import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  READ_CHAPTERS: "ship-guide:read-chapters",
  BOOKMARKS: "ship-guide:bookmarks",
  CHECKLIST: "ship-guide:checklist",
};

export async function getReadChapters(): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.READ_CHAPTERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function markChapterRead(chapterId: number): Promise<number[]> {
  const current = await getReadChapters();
  if (!current.includes(chapterId)) {
    const updated = [...current, chapterId];
    await AsyncStorage.setItem(KEYS.READ_CHAPTERS, JSON.stringify(updated));
    return updated;
  }
  return current;
}

export async function getBookmarks(): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BOOKMARKS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleBookmark(chapterId: number): Promise<number[]> {
  const current = await getBookmarks();
  let updated: number[];
  if (current.includes(chapterId)) {
    updated = current.filter((id) => id !== chapterId);
  } else {
    updated = [...current, chapterId];
  }
  await AsyncStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(updated));
  return updated;
}

export async function getChecklist(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CHECKLIST);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleChecklistItem(itemId: string): Promise<string[]> {
  const current = await getChecklist();
  let updated: string[];
  if (current.includes(itemId)) {
    updated = current.filter((id) => id !== itemId);
  } else {
    updated = [...current, itemId];
  }
  await AsyncStorage.setItem(KEYS.CHECKLIST, JSON.stringify(updated));
  return updated;
}
