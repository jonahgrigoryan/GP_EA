import { FlatList, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAppState } from "@/lib/app-context";
import { chapters } from "@/lib/chapters";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function BookmarksScreen() {
  const { bookmarks, isChapterRead, handleToggleBookmark } = useAppState();
  const colors = useColors();
  const router = useRouter();

  const bookmarkedChapters = chapters.filter((c) =>
    bookmarks.includes(c.id)
  );

  const handleChapterPress = (chapterId: number) => {
    router.push(`/chapter/${chapterId}` as any);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📚</Text>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No Bookmarks Yet
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.muted }]}>
        Tap the bookmark icon on any chapter to save it here for quick access.
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={bookmarkedChapters}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          bookmarkedChapters.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          bookmarkedChapters.length > 0 ? (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Bookmarks
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {bookmarkedChapters.length} saved chapter
                {bookmarkedChapters.length !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const read = isChapterRead(item.id);
          return (
            <Pressable
              onPress={() => handleChapterPress(item.id)}
              style={({ pressed }) => [
                styles.chapterCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.chapterRow}>
                <Text style={styles.chapterIcon}>{item.icon}</Text>
                <View style={styles.chapterContent}>
                  <View style={styles.chapterTitleRow}>
                    <Text
                      style={[styles.chapterNumber, { color: colors.primary }]}
                    >
                      Chapter {item.id}
                    </Text>
                    {read && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={14}
                        color={colors.success}
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.chapterTitle, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.chapterDesc, { color: colors.muted }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleToggleBookmark(item.id)}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && { opacity: 0.5 },
                  ]}
                >
                  <IconSymbol
                    name="bookmark.fill"
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyListContent: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  chapterCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chapterIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  chapterContent: {
    flex: 1,
  },
  chapterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  chapterNumber: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chapterTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 22,
  },
  chapterDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  removeButton: {
    padding: 8,
  },
});
