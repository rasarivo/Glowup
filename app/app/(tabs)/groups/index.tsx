import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/constants/theme";
import { formatDistance } from "@/lib/age";
import { fetchNearbyGroups } from "@/lib/api";
import type { NearbyGroup } from "@/types/database";

export default function GroupsListScreen() {
  const [groups, setGroups] = useState<NearbyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNearbyGroups();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Groupes</Text>
          <Text style={styles.headerSubtitle}>Rejoins une activité près de chez toi</Text>
        </View>
      </View>

      <View style={styles.createButtonWrap}>
        <Button label="+ Créer un groupe" onPress={() => router.push("/(tabs)/groups/create")} />
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyTitle}>Pas encore de groupe par ici</Text>
              <Text style={styles.emptyText}>Sois le premier à en créer un !</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(tabs)/groups/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.groupName}>{item.name}</Text>
              {item.is_member && <View style={styles.memberTag}><Text style={styles.memberTagText}>Membre</Text></View>}
            </View>
            {item.interest_name && <Text style={styles.groupInterest}>🏷️ {item.interest_name}</Text>}
            {item.description ? <Text style={styles.groupDescription}>{item.description}</Text> : null}
            <View style={styles.cardFooter}>
              <Text style={styles.metaText}>
                {item.member_count} membre{item.member_count > 1 ? "s" : ""}
              </Text>
              {item.distance_km != null && <Text style={styles.metaText}>{formatDistance(item.distance_km)}</Text>}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text },
  headerSubtitle: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  createButtonWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 17, fontWeight: "700", color: colors.text, flexShrink: 1 },
  memberTag: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  memberTagText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  groupInterest: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.xs },
  groupDescription: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs, lineHeight: 19 },
  cardFooter: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  metaText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: spacing.xl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing.sm },
});
