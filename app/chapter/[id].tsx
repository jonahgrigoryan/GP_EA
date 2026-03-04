import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useAppState } from "@/lib/app-context";
import { chapters, type ChapterSection } from "@/lib/chapters";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ChapterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isChapterRead,
    isBookmarked,
    handleMarkRead,
    handleToggleBookmark,
  } = useAppState();

  const chapterId = Number(id);
  const chapter = chapters.find((c) => c.id === chapterId);

  if (!chapter) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Chapter not found
        </Text>
      </ScreenContainer>
    );
  }

  const read = isChapterRead(chapterId);
  const bookmarked = isBookmarked(chapterId);

  const onMarkRead = async () => {
    await handleMarkRead(chapterId);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onToggleBookmark = async () => {
    await handleToggleBookmark(chapterId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const renderSection = (section: ChapterSection, index: number) => {
    const bgColor =
      section.type === "tip"
        ? colors.warning + "18"
        : section.type === "warning"
        ? colors.error + "18"
        : section.type === "steps"
        ? colors.primary + "10"
        : "transparent";

    const borderColor =
      section.type === "tip"
        ? colors.warning
        : section.type === "warning"
        ? colors.error
        : section.type === "steps"
        ? colors.primary
        : "transparent";

    const labelText =
      section.type === "tip"
        ? "💡 Tip"
        : section.type === "warning"
        ? "⚠️ Important"
        : section.type === "steps"
        ? "📝 Steps"
        : null;

    return (
      <View key={index} style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>
          {section.heading}
        </Text>
        <View
          style={[
            styles.sectionBody,
            section.type && {
              backgroundColor: bgColor,
              borderLeftColor: borderColor,
              borderLeftWidth: 3,
              borderRadius: 10,
              padding: 16,
            },
          ]}
        >
          {labelText && (
            <Text
              style={[
                styles.sectionLabel,
                {
                  color:
                    section.type === "tip"
                      ? colors.warning
                      : section.type === "warning"
                      ? colors.error
                      : colors.primary,
                },
              ]}
            >
              {labelText}
            </Text>
          )}
          <Text style={[styles.sectionText, { color: colors.foreground }]}>
            {section.body}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← Back
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggleBookmark}
          style={({ pressed }) => [
            styles.bookmarkButton,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <IconSymbol
            name="bookmark.fill"
            size={22}
            color={bookmarked ? colors.primary : colors.muted}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Chapter Header */}
        <View style={styles.chapterHeader}>
          <Text style={styles.chapterEmoji}>{chapter.icon}</Text>
          <Text style={[styles.chapterNumber, { color: colors.primary }]}>
            Chapter {chapter.id}
          </Text>
          <Text style={[styles.chapterTitle, { color: colors.foreground }]}>
            {chapter.title}
          </Text>
          <View style={styles.metaRow}>
            <IconSymbol name="clock.fill" size={14} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {chapter.readTime} read
            </Text>
            {read && (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.muted }]} />
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={14}
                  color={colors.success}
                />
                <Text style={[styles.metaText, { color: colors.success }]}>
                  Completed
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Sections */}
        {chapter.sections.map(renderSection)}
      </ScrollView>

      {/* Mark as Read Button */}
      {!read && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onMarkRead}
            style={({ pressed }) => [
              styles.markReadButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <IconSymbol
              name="checkmark.circle.fill"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.markReadText}>Mark as Read</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  bookmarkButton: {
    padding: 8,
    borderRadius: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  chapterHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },
  chapterEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  chapterNumber: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  chapterTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    lineHeight: 26,
  },
  sectionBody: {},
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 26,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  markReadText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
