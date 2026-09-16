import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { InterestChip } from "@/components/InterestChip";
import { colors, radius, spacing } from "@/constants/theme";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/constants/interests";
import { useAuth } from "@/lib/auth-context";
import { ageFromBirthdate } from "@/lib/age";
import {
  deleteProfilePhoto,
  fetchInterestsCatalog,
  fetchMyInterestIds,
  fetchMyPhotos,
  fetchMyProfile,
  setMyInterests,
  updateMyProfile,
  uploadProfilePhoto,
} from "@/lib/api";
import type { Gender, Interest, Profile, ProfilePhoto } from "@/types/database";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "autre", label: "Autre" },
];

const MAX_PHOTOS = 6;

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const userId = session!.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [catalog, setCatalog] = useState<Interest[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myProfile, myPhotos, myInterestIds, allInterests] = await Promise.all([
        fetchMyProfile(userId),
        fetchMyPhotos(userId),
        fetchMyInterestIds(userId),
        fetchInterestsCatalog(),
      ]);
      setProfile(myProfile);
      setPhotos(myPhotos);
      setSelectedInterestIds(myInterestIds);
      setCatalog(allInterests);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleInterest(id: string) {
    setSelectedInterestIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleLookingFor(value: Gender) {
    if (!profile) return;
    const next = profile.looking_for.includes(value)
      ? profile.looking_for.filter((v) => v !== value)
      : [...profile.looking_for, value];
    setProfile({ ...profile, looking_for: next });
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorise l'accès à tes photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (result.canceled || !result.assets?.length) return;
    try {
      setSaving(true);
      const photo = await uploadProfilePhoto(userId, result.assets[0].uri, photos.length);
      setPhotos((prev) => [...prev, photo]);
    } catch (err) {
      Alert.alert("Échec de l'envoi", err instanceof Error ? err.message : "Réessaie plus tard.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await deleteProfilePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateMyProfile(userId, {
        full_name: profile.full_name,
        bio: profile.bio,
        city: profile.city,
        gender: profile.gender,
        looking_for: profile.looking_for,
        is_visible: profile.is_visible,
      });
      await setMyInterests(userId, selectedInterestIds);
      Alert.alert("Profil mis à jour", "Tes changements ont bien été enregistrés.");
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Déconnexion", "Veux-tu vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => signOut() },
    ]);
  }

  if (loading || !profile) return null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ton profil</Text>
          <Text style={styles.headerSubtitle}>{ageFromBirthdate(profile.birthdate)} ans</Text>
        </View>

        <Text style={styles.sectionLabel}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoWrap}>
              <Image source={{ uri: photo.url }} style={styles.photoThumb} />
              <Pressable style={styles.removePhotoButton} onPress={() => handleDeletePhoto(photo.id)}>
                <Text style={styles.removePhotoIcon}>✕</Text>
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable style={styles.addPhotoButton} onPress={handlePickPhoto}>
              <Text style={styles.addPhotoLabel}>+</Text>
            </Pressable>
          )}
        </View>

        <TextField
          label="Prénom"
          value={profile.full_name}
          onChangeText={(v) => setProfile({ ...profile, full_name: v })}
        />
        <TextField
          label="Ville"
          value={profile.city ?? ""}
          onChangeText={(v) => setProfile({ ...profile, city: v })}
        />
        <TextField
          label="Bio"
          value={profile.bio}
          onChangeText={(v) => setProfile({ ...profile, bio: v })}
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />

        <Text style={styles.sectionLabel}>Tu es</Text>
        <View style={styles.row}>
          {GENDER_OPTIONS.map((opt) => (
            <InterestChip
              key={opt.value}
              label={opt.label}
              selected={profile.gender === opt.value}
              onPress={() => setProfile({ ...profile, gender: opt.value })}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Tu recherches</Text>
        <View style={styles.row}>
          {GENDER_OPTIONS.map((opt) => (
            <InterestChip
              key={opt.value}
              label={opt.label}
              selected={profile.looking_for.includes(opt.value)}
              onPress={() => toggleLookingFor(opt.value)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Loisirs & sports</Text>
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
                    selected={selectedInterestIds.includes(interest.id)}
                    onPress={() => toggleInterest(interest.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.visibilityRow}>
          <View style={styles.visibilityTextBlock}>
            <Text style={styles.sectionLabel}>Profil visible</Text>
            <Text style={styles.helper}>Désactive temporairement ton profil pour ne plus apparaître dans Découvrir.</Text>
          </View>
          <Switch
            value={profile.is_visible}
            onValueChange={(v) => setProfile({ ...profile, is_visible: v })}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Button label="Enregistrer" onPress={handleSave} loading={saving} />
        <View style={{ height: spacing.md }} />
        <Button label="Se déconnecter" variant="outline" onPress={handleSignOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: 64, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.lg },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text },
  headerSubtitle: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  photoWrap: { position: "relative" },
  photoThumb: { width: 100, height: 130, borderRadius: radius.md, backgroundColor: colors.surface },
  removePhotoButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoIcon: { color: colors.white, fontSize: 12 },
  addPhotoButton: {
    width: 100,
    height: 130,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  addPhotoLabel: { fontSize: 32, color: colors.textMuted },
  bioInput: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm },
  categoryBlock: { marginBottom: spacing.sm },
  categoryTitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.xs },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  visibilityTextBlock: { flex: 1 },
  helper: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
