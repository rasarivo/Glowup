import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";
import { fetchMyMatches, fetchPhotosForProfiles, fetchProfilesByIds, otherUserInMatch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Match, Profile, ProfilePhoto } from "@/types/database";

interface MatchRow {
  match: Match;
  profile: Profile;
  avatarUrl?: string;
}

export default function MatchesListScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const matches = await fetchMyMatches(userId);
      const otherIds = matches.map((m) => otherUserInMatch(m, userId));
      const [profilesById, photosById] = await Promise.all([
        fetchProfilesByIds(otherIds),
        fetchPhotosForProfiles(otherIds),
      ]);
      const nextRows: MatchRow[] = matches
        .map((match): MatchRow | null => {
          const otherId = otherUserInMatch(match, userId);
          const profile = profilesById[otherId];
          if (!profile) return null;
          const photos: ProfilePhoto[] = photosById[otherId] ?? [];
          return { match, profile, avatarUrl: photos[0]?.url };
        })
        .filter((r): r is MatchRow => r !== null);
      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tes matchs</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.match.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>Pas encore de match</Text>
              <Text style={styles.emptyText}>Va découvrir des profils qui partagent tes loisirs !</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(tabs)/matches/${item.match.id}`)}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text>🙂</Text>
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.profile.full_name}</Text>
              <Text style={styles.subtitle}>Dites bonjour 👋</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.surface },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowText: { marginLeft: spacing.md },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: spacing.xl * 2 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing.sm },
});
