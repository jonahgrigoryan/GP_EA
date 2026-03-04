import { FlatList, Text, View, Pressable, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useAppState } from "@/lib/app-context";
import { checklistData } from "@/lib/chapters";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export default function ChecklistScreen() {
  const { checkedItems, handleToggleChecklist } = useAppState();
  const colors = useColors();

  const totalItems = checklistData.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );
  const completedItems = checkedItems.length;
  const progress = totalItems > 0 ? completedItems / totalItems : 0;

  const onToggle = async (itemId: string) => {
    await handleToggleChecklist(itemId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const renderCategory = ({ item }: { item: ChecklistCategory }) => {
    const catCompleted = item.items.filter((i) =>
      checkedItems.includes(i.id)
    ).length;

    return (
      <View style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
            {item.category}
          </Text>
          <Text style={[styles.categoryCount, { color: colors.muted }]}>
            {catCompleted}/{item.items.length}
          </Text>
        </View>
        <View
          style={[
            styles.categoryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {item.items.map((checkItem, index) => {
            const checked = checkedItems.includes(checkItem.id);
            return (
              <Pressable
                key={checkItem.id}
                onPress={() => onToggle(checkItem.id)}
                style={({ pressed }) => [
                  styles.checkItem,
                  index < item.items.length - 1 && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol
                  name={checked ? "checkmark.circle.fill" : "circle"}
                  size={24}
                  color={checked ? colors.success : colors.muted}
                />
                <Text
                  style={[
                    styles.checkLabel,
                    { color: colors.foreground },
                    checked && {
                      textDecorationLine: "line-through",
                      color: colors.muted,
                    },
                  ]}
                >
                  {checkItem.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        data={checklistData}
        keyExtractor={(item) => item.category}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Pre-Launch Checklist
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Track your progress before shipping
            </Text>

            {/* Progress Card */}
            <View
              style={[
                styles.progressCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.progressRow}>
                <Text
                  style={[styles.progressPercent, { color: colors.primary }]}
                >
                  {Math.round(progress * 100)}%
                </Text>
                <Text style={[styles.progressLabel, { color: colors.muted }]}>
                  {completedItems} of {totalItems} items completed
                </Text>
              </View>
              <View
                style={[styles.progressBarBg, { backgroundColor: colors.border }]}
              >
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
            </View>
          </View>
        }
        renderItem={renderCategory}
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
    paddingTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  progressPercent: {
    fontSize: 32,
    fontWeight: "800",
  },
  progressLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  checkLabel: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
});
