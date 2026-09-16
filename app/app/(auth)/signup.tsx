import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { ageFromBirthdate } from "@/lib/age";

function parseBirthdate(input: string): string | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [birthdateInput, setBirthdateInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!fullName || !email || !password || !birthdateInput) {
      Alert.alert("Champs manquants", "Merci de remplir tous les champs.");
      return;
    }
    const birthdateIso = parseBirthdate(birthdateInput);
    if (!birthdateIso) {
      Alert.alert("Date invalide", "Utilise le format JJ/MM/AAAA.");
      return;
    }
    if (ageFromBirthdate(birthdateIso) < 18) {
      Alert.alert("Âge minimum", "Ensemble est réservé aux 18 ans et plus.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Mot de passe trop court", "6 caractères minimum.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), birthdateIso);
      Alert.alert(
        "Vérifie ta boîte mail",
        "Un e-mail de confirmation vient de t'être envoyé. Confirme ton adresse puis connecte-toi."
      );
    } catch (err) {
      Alert.alert("Inscription impossible", err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoins la communauté Ensemble.</Text>

        <View style={styles.form}>
          <TextField label="Prénom" value={fullName} onChangeText={setFullName} placeholder="Camille" />
          <TextField
            label="Date de naissance"
            value={birthdateInput}
            onChangeText={setBirthdateInput}
            placeholder="JJ/MM/AAAA"
            keyboardType="numbers-and-punctuation"
          />
          <TextField
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="toi@exemple.fr"
          />
          <TextField
            label="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="6 caractères minimum"
          />
          <Button label="S'inscrire" onPress={handleSubmit} loading={loading} />
        </View>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>
            Déjà un compte ? <Text style={styles.linkTextStrong}>Connecte-toi</Text>
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: { marginBottom: spacing.lg },
  link: { alignSelf: "center", marginTop: spacing.md },
  linkText: { color: colors.textMuted, fontSize: 14 },
  linkTextStrong: { color: colors.primary, fontWeight: "700" },
});
