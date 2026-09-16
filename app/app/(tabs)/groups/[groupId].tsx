import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import {
  fetchGroupMembers,
  fetchGroupMessages,
  fetchNearbyGroups,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  subscribeToGroupMessages,
} from "@/lib/api";
import type { GroupMember, GroupMessage, NearbyGroup } from "@/types/database";

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [group, setGroup] = useState<NearbyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const listRef = useRef<FlatList<GroupMessage>>(null);

  const isMember = group?.is_member ?? false;

  const loadGroup = useCallback(async () => {
    const groups = await fetchNearbyGroups(20000, 500);
    const found = groups.find((g) => g.id === groupId) ?? null;
    setGroup(found);
    setMembers(await fetchGroupMembers(groupId));
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    if (!isMember) return;
    let unsubscribe: (() => void) | undefined;
    fetchGroupMessages(groupId).then(setMessages);
    unsubscribe = subscribeToGroupMessages(groupId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    return () => unsubscribe?.();
  }, [groupId, isMember]);

  async function handleJoin() {
    setJoining(true);
    try {
      await joinGroup(groupId, userId);
      await loadGroup();
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Impossible de rejoindre le groupe.");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setJoining(true);
    try {
      await leaveGroup(groupId, userId);
      await loadGroup();
      setMessages([]);
    } catch (err) {
      Alert.alert("Erreur", err instanceof Error ? err.message : "Réessaie.");
    } finally {
      setJoining(false);
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    try {
      const message = await sendGroupMessage(groupId, userId, content);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setSending(false);
    }
  }

  if (!group) return null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{group.name}</Text>
          <Text style={styles.headerSubtitle}>
            {members.length} membre{members.length > 1 ? "s" : ""}
            {group.interest_name ? ` · ${group.interest_name}` : ""}
          </Text>
        </View>
      </View>

      {!isMember ? (
        <View style={styles.joinPrompt}>
          {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
          <Button label="Rejoindre le groupe" onPress={handleJoin} loading={joining} />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMine = item.sender_id === userId;
              return (
                <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>Sois le premier à écrire dans ce groupe !</Text>}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Écris au groupe…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !draft.trim()}>
              <Text style={styles.sendIcon}>➤</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleLeave} disabled={joining} style={styles.leaveButton}>
            <Text style={styles.leaveButtonText}>Quitter le groupe</Text>
          </Pressable>
        </>
      )}
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
  headerTextBlock: { flexShrink: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  joinPrompt: { padding: spacing.lg, gap: spacing.md },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10 },
  bubbleTheirs: { backgroundColor: colors.surface },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { fontSize: 15, color: colors.text },
  bubbleTextMine: { color: colors.white },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { color: colors.white, fontSize: 18 },
  leaveButton: { alignSelf: "center", paddingVertical: spacing.md },
  leaveButtonText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
});
