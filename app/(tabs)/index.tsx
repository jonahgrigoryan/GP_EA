import { FlatList, Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAppState } from "@/lib/app-context";
import { chapters } from "@/lib/chapters";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HomeScreen() {
  const { readChapters } = useAppState();
  const colors = useColors();
  const router = useRouter();
  const progress = readChapters.length / chapters.length;

  const handleChapterPress = (chapterId: number) => {
    router.push(`/chapter/${chapterId}` as any);
  };

  return (
    <ScreenContainer>
      <FlatList
        data={chapters}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Hero Section */}
            <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.heroEmoji}>🚀</Text>
              <Text style={styles.heroTitle}>Ship Apps Guide</Text>
              <Text style={styles.heroSubtitle}>
                Your complete guide to shipping mobile apps like a pro
              </Text>
            </View>

            {/* Progress Section */}
            <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                  Your Progress
                </Text>
                <Text style={[styles.progressCount, { color: colors.primary }]}>
                  {readChapters.length}/{chapters.length}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.round(progress * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressHint, { color: colors.muted }]}>
                {readChapters.length === 0
                  ? "Start reading to track your progress"
                  : readChapters.length === chapters.length
                  ? "Congratulations! You've completed the guide!"
                  : `${chapters.length - readChapters.length} chapters remaining`}
              </Text>
            </View>

            {/* Section Title */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Chapters
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isRead = readChapters.includes(item.id);
          return (
            <Pressable
              onPress={() => handleChapterPress(item.id)}
              style={({ pressed }) => [
                styles.chapterCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isRead ? colors.success : colors.border,
                  borderLeftWidth: isRead ? 3 : 1,
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
                    {isRead && (
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={16}
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
                  <View style={styles.chapterMeta}>
                    <IconSymbol
                      name="clock.fill"
                      size={12}
                      color={colors.muted}
                    />
                    <Text style={[styles.chapterTime, { color: colors.muted }]}>
                      {item.readTime}
                    </Text>
                  </View>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={18}
                  color={colors.muted}
                />
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
  header: {
    marginBottom: 8,
  },
  heroCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 0,
  },
  progressHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
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
    marginBottom: 6,
  },
  chapterMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chapterTime: {
    fontSize: 12,
    lineHeight: 16,
  },
});
