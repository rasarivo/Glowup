import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { InterestChip } from "@/components/InterestChip";
import { colors, spacing } from "@/constants/theme";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/constants/interests";
import { useAuth } from "@/lib/auth-context";
import { createGroup, fetchInterestsCatalog } from "@/lib/api";
import type { Interest } from "@/types/database";

export default function CreateGroupScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [interestId, setInterestId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Interest[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInterestsCatalog().then(setCatalog).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Nom manquant", "Donne un nom à ton groupe.");
      return;
    }
    setSaving(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const position = await Location.getCurrentPositionAsync({});
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      const group = await createGroup({
        name: name.trim(),
        description: description.trim(),
        interestId,
        ownerId: userId,
        city: city.trim() || null,
        lat,
        lng,
      });

      router.replace(`/(tabs)/groups/${group.id}`);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de créer le groupe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nouveau groupe</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextField label="Nom du groupe" value={name} onChangeText={setName} placeholder="Running du dimanche" />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Qui, quand, où, ambiance recherchée…"
          multiline
          numberOfLines={4}
          style={styles.descriptionInput}
        />
        <TextField label="Ville" value={city} onChangeText={setCity} placeholder="Lyon" />

        <Text style={styles.sectionLabel}>Activité principale</Text>
        {CATEGORY_ORDER.map((category) => {
          const items = catalog.filter((i) => i.category === category);
          if (items.length === 0) return null;
          return (
            <View key={category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[category]}</Text>
              <View style={styles.row}>
                {items.map((interest) => (
                  <InterestChip
                    key={interest.id}
                    label={interest.name}
                    emoji={interest.emoji}
                    selected={interestId === interest.id}
                    onPress={() => setInterestId(interest.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Créer le groupe" onPress={handleCreate} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.xs },
  backIcon: { fontSize: 28, color: colors.text },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  descriptionInput: { minHeight: 90, textAlignVertical: "top" },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  categoryBlock: { marginBottom: spacing.md },
  categoryTitle: { fontSize: 14, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
