import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { InterestChip } from "@/components/InterestChip";
import { colors, radius, spacing } from "@/constants/theme";
import { CATEGORY_LABELS, CATEGORY_ORDER, MIN_INTERESTS_REQUIRED } from "@/constants/interests";
import { useAuth } from "@/lib/auth-context";
import {
  fetchInterestsCatalog,
  fetchMyPhotos,
  setMyInterests,
  updateMyLocation,
  updateMyProfile,
  uploadProfilePhoto,
} from "@/lib/api";
import type { Gender, Interest, ProfilePhoto } from "@/types/database";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "autre", label: "Autre" },
];

const STEPS = ["Infos", "Photos", "Loisirs & sports"] as const;
const MAX_PHOTOS = 6;

export default function ProfileSetupScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Étape 1 — infos
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<Gender[]>([]);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");

  // Étape 2 — photos
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);

  // Étape 3 — intérêts
  const [catalog, setCatalog] = useState<Interest[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  useEffect(() => {
    fetchInterestsCatalog().then(setCatalog).catch(() => {});
    fetchMyPhotos(userId).then(setPhotos).catch(() => {});
  }, [userId]);

  function toggleLookingFor(value: Gender) {
    setLookingFor((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function toggleInterest(id: string) {
    setSelectedInterestIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorise l'accès à tes photos pour continuer.");
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

  async function goToStep(next: number) {
    if (step === 0) {
      if (!gender || lookingFor.length === 0) {
        Alert.alert("Complète ce champ", "Indique ton genre et qui tu souhaites rencontrer.");
        return;
      }
      try {
        setSaving(true);
        await updateMyProfile(userId, { gender, looking_for: lookingFor, bio, city: city || null });
      } catch (err) {
        Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
        return;
      } finally {
        setSaving(false);
      }
    }

    if (step === 1 && photos.length === 0) {
      Alert.alert("Ajoute au moins une photo", "Une photo de profil est nécessaire pour continuer.");
      return;
    }

    setStep(next);
  }

  async function handleFinish() {
    if (selectedInterestIds.length < MIN_INTERESTS_REQUIRED) {
      Alert.alert("Encore un peu !", `Choisis au moins ${MIN_INTERESTS_REQUIRED} loisirs ou sports.`);
      return;
    }
    setSaving(true);
    try {
      await setMyInterests(userId, selectedInterestIds);

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.granted) {
        const position = await Location.getCurrentPositionAsync({});
        await updateMyLocation(position.coords.latitude, position.coords.longitude);
      }

      router.replace("/(tabs)/discover");
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>{STEPS[step]}</Text>
        <View style={styles.stepDots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={styles.sectionLabel}>Tu es</Text>
            <View style={styles.row}>
              {GENDER_OPTIONS.map((opt) => (
                <InterestChip
                  key={opt.value}
                  label={opt.label}
                  selected={gender === opt.value}
                  onPress={() => setGender(opt.value)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Tu recherches</Text>
            <View style={styles.row}>
              {GENDER_OPTIONS.map((opt) => (
                <InterestChip
                  key={opt.value}
                  label={opt.label}
                  selected={lookingFor.includes(opt.value)}
                  onPress={() => toggleLookingFor(opt.value)}
                />
              ))}
            </View>

            <TextField label="Ta ville" value={city} onChangeText={setCity} placeholder="Paris" />
            <TextField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Parle un peu de toi, de ce que tu aimes faire…"
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.helper}>Ajoute jusqu'à {MAX_PHOTOS} photos. La première sera ta photo principale.</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.photoThumb} />
              ))}
              {photos.length < MAX_PHOTOS && (
                <Pressable style={styles.addPhotoButton} onPress={handlePickPhoto}>
                  <Text style={styles.addPhotoLabel}>+</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.helper}>
              Choisis au moins {MIN_INTERESTS_REQUIRED} loisirs ou sports. On s'en sert pour te proposer des
              personnes et des groupes qui te correspondent.
            </Text>
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
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <View style={styles.footerButton}>
            <Button label="Retour" variant="outline" onPress={() => setStep(step - 1)} disabled={saving} />
          </View>
        )}
        <View style={styles.footerButton}>
          {step < STEPS.length - 1 ? (
            <Button label="Continuer" onPress={() => goToStep(step + 1)} loading={saving} />
          ) : (
            <Button label="C'est parti !" onPress={handleFinish} loading={saving} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 64, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  stepDots: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  bioInput: { minHeight: 100, textAlignVertical: "top" },
  helper: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg, lineHeight: 20 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoThumb: { width: 100, height: 130, borderRadius: radius.md, backgroundColor: colors.surface },
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
  categoryBlock: { marginBottom: spacing.md },
  categoryTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: { flex: 1 },
});
