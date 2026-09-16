import { useCallback, useEffect, useState } from "react";
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing } from "@/constants/theme";
import { ageFromBirthdate, formatDistance } from "@/lib/age";
import { fetchNearbyProfiles, swipeProfile } from "@/lib/api";
import type { NearbyProfile } from "@/types/database";

export default function DiscoverScreen() {
  const [queue, setQueue] = useState<NearbyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await fetchNearbyProfiles();
      setQueue(profiles);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de charger les profils.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[0];

  async function handleSwipe(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const matched = await swipeProfile(current.id, liked);
      setQueue((prev) => prev.slice(1));
      if (matched) {
        Alert.alert("C'est un match ! 🎉", `Toi et ${current.full_name} vous êtes likés mutuellement.`, [
          { text: "Continuer" },
          { text: "Voir les messages", onPress: () => router.push("/(tabs)/matches") },
        ]);
      }
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Découvrir</Text>
        <Text style={styles.headerSubtitle}>Des personnes proches, qui partagent tes passions</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {!loading && !current && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧭</Text>
            <Text style={styles.emptyTitle}>Plus personne à proximité pour l'instant</Text>
            <Text style={styles.emptyText}>
              Reviens plus tard ou élargis tes loisirs pour voir apparaître plus de profils.
            </Text>
          </View>
        )}

        {current && (
          <View style={styles.card}>
            {current.photos && current.photos.length > 0 ? (
              <Image source={{ uri: current.photos[0].url }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>🙂</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {current.full_name}, {ageFromBirthdate(current.birthdate)}
                </Text>
                <Text style={styles.distance}>{formatDistance(current.distance_km)}</Text>
              </View>
              {current.city ? <Text style={styles.city}>{current.city}</Text> : null}
              {current.bio ? <Text style={styles.bio}>{current.bio}</Text> : null}

              {current.shared_interests.length > 0 && (
                <View style={styles.interestsBlock}>
                  <Text style={styles.interestsLabel}>
                    {current.shared_interest_count} passion{current.shared_interest_count > 1 ? "s" : ""} en commun
                  </Text>
                  <View style={styles.badgeRow}>
                    {current.shared_interests.map((name) => (
                      <View key={name} style={styles.badge}>
                        <Text style={styles.badgeText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {current && (
        <View style={styles.actions}>
          <Pressable
            disabled={busy}
            onPress={() => handleSwipe(false)}
            style={[styles.actionButton, styles.passButton]}
          >
            <Text style={[styles.actionIcon, styles.passIcon]}>✕</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => handleSwipe(true)}
            style={[styles.actionButton, styles.likeButton]}
          >
            <Text style={[styles.actionIcon, styles.likeIcon]}>♥</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text },
  headerSubtitle: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  container: { padding: spacing.lg, paddingBottom: 140, flexGrow: 1 },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: "100%", height: 420, backgroundColor: colors.border },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { fontSize: 64 },
  cardBody: { padding: spacing.lg },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  distance: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  city: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  bio: { color: colors.text, fontSize: 15, marginTop: spacing.md, lineHeight: 21 },
  interestsBlock: { marginTop: spacing.lg },
  interestsLabel: { fontSize: 13, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  badge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: colors.text },
  actions: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  passButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  likeButton: { backgroundColor: colors.primary },
  actionIcon: { fontSize: 28 },
  passIcon: { color: colors.text },
  likeIcon: { color: colors.white },
  empty: { alignItems: "center", paddingTop: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: spacing.sm },
});
