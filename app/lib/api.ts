import { supabase } from "@/lib/supabase";
import type {
  Group,
  GroupMember,
  GroupMessage,
  Interest,
  Match,
  Message,
  NearbyGroup,
  NearbyProfile,
  Profile,
  ProfilePhoto,
} from "@/types/database";

// ── Profil ────────────────────────────────────────────────────────────────

export async function fetchMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "birthdate" | "gender" | "looking_for" | "bio" | "city" | "is_visible">>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function fetchMyPhotos(userId: string): Promise<ProfilePhoto[]> {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("profile_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as ProfilePhoto[];
}

export async function fetchPhotosForProfiles(profileIds: string[]): Promise<Record<string, ProfilePhoto[]>> {
  if (profileIds.length === 0) return {};
  const { data, error } = await supabase
    .from("profile_photos")
    .select("*")
    .in("profile_id", profileIds)
    .order("position", { ascending: true });
  if (error) throw error;
  const byProfile: Record<string, ProfilePhoto[]> = {};
  for (const photo of data as ProfilePhoto[]) {
    (byProfile[photo.profile_id] ??= []).push(photo);
  }
  return byProfile;
}

export async function uploadProfilePhoto(userId: string, localUri: string, position: number): Promise<ProfilePhoto> {
  const arraybuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `avatars/${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("photos").upload(path, arraybuffer, {
    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("photos").getPublicUrl(path);

  const { data, error } = await supabase
    .from("profile_photos")
    .upsert({ profile_id: userId, url: publicUrlData.publicUrl, position }, { onConflict: "profile_id,position" })
    .select()
    .single();
  if (error) throw error;
  return data as ProfilePhoto;
}

export async function deleteProfilePhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from("profile_photos").delete().eq("id", photoId);
  if (error) throw error;
}

// ── Centres d'intérêt ─────────────────────────────────────────────────────

export async function fetchInterestsCatalog(): Promise<Interest[]> {
  const { data, error } = await supabase.from("interests").select("*").order("category").order("name");
  if (error) throw error;
  return data as Interest[];
}

export async function fetchMyInterestIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("profile_interests").select("interest_id").eq("profile_id", userId);
  if (error) throw error;
  return (data as { interest_id: string }[]).map((row) => row.interest_id);
}

export async function setMyInterests(userId: string, interestIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from("profile_interests").delete().eq("profile_id", userId);
  if (deleteError) throw deleteError;
  if (interestIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("profile_interests")
    .insert(interestIds.map((interest_id) => ({ profile_id: userId, interest_id })));
  if (insertError) throw insertError;
}

// ── Position ──────────────────────────────────────────────────────────────

export async function updateMyLocation(lat: number, lng: number): Promise<void> {
  const { error } = await supabase.rpc("update_my_location", { lat, lng });
  if (error) throw error;
}

// ── Découverte / matching ────────────────────────────────────────────────

export async function fetchNearbyProfiles(radiusKm = 50, limit = 30): Promise<NearbyProfile[]> {
  const { data, error } = await supabase.rpc("nearby_profiles", { radius_km: radiusKm, limit_count: limit });
  if (error) throw error;
  const profiles = data as NearbyProfile[];
  const photosByProfile = await fetchPhotosForProfiles(profiles.map((p) => p.id));
  return profiles.map((p) => ({ ...p, photos: photosByProfile[p.id] ?? [] }));
}

/** Retourne true si l'action crée un match (like mutuel). */
export async function swipeProfile(swipeeId: string, liked: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc("swipe_profile", { p_swipee_id: swipeeId, p_liked: liked });
  if (error) throw error;
  return Boolean(data);
}

// ── Matches & messages ───────────────────────────────────────────────────

export async function fetchMyMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Match[];
}

export function otherUserInMatch(match: Match, myUserId: string): string {
  return match.user_a === myUserId ? match.user_b : match.user_a;
}

export async function fetchProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  const map: Record<string, Profile> = {};
  for (const profile of data as Profile[]) map[profile.id] = profile;
  return map;
}

export async function fetchMessages(matchId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(matchId: string, senderId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

export function subscribeToMatchMessages(matchId: string, onInsert: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Groupes ──────────────────────────────────────────────────────────────

export async function fetchNearbyGroups(radiusKm = 50, limit = 30): Promise<NearbyGroup[]> {
  const { data, error } = await supabase.rpc("nearby_groups", { radius_km: radiusKm, limit_count: limit });
  if (error) throw error;
  return data as NearbyGroup[];
}

export async function createGroup(input: {
  name: string;
  description: string;
  interestId: string | null;
  ownerId: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: input.name,
      description: input.description,
      interest_id: input.interestId,
      owner_id: input.ownerId,
      city: input.city,
      location: input.lat != null && input.lng != null ? `SRID=4326;POINT(${input.lng} ${input.lat})` : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}

export async function joinGroup(groupId: string, profileId: string): Promise<void> {
  const { error } = await supabase.from("group_members").insert({ group_id: groupId, profile_id: profileId });
  if (error) throw error;
}

export async function leaveGroup(groupId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", profileId);
  if (error) throw error;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data as GroupMember[];
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const { data, error } = await supabase
    .from("group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as GroupMessage[];
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string): Promise<GroupMessage> {
  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data as GroupMessage;
}

export function subscribeToGroupMessages(groupId: string, onInsert: (message: GroupMessage) => void) {
  const channel = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
      (payload) => onInsert(payload.new as GroupMessage)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
