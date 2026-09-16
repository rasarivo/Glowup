export type Gender = "femme" | "homme" | "autre";

export type InterestCategory =
  | "sport"
  | "plein_air"
  | "culture"
  | "creatif"
  | "social"
  | "bien_etre";

export interface Interest {
  id: string;
  category: InterestCategory;
  name: string;
  emoji: string;
}

export interface Profile {
  id: string;
  full_name: string;
  birthdate: string;
  gender: Gender | null;
  looking_for: Gender[];
  bio: string;
  city: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfilePhoto {
  id: string;
  profile_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface NearbyProfile {
  id: string;
  full_name: string;
  birthdate: string;
  bio: string;
  city: string | null;
  distance_km: number;
  shared_interest_count: number;
  shared_interests: string[];
  // Renseigné côté client après un fetch séparé des photos
  photos?: ProfilePhoto[];
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  interest_id: string | null;
  owner_id: string;
  city: string | null;
  photo_url: string | null;
  max_members: number | null;
  created_at: string;
  updated_at: string;
}

export interface NearbyGroup {
  id: string;
  name: string;
  description: string;
  interest_id: string | null;
  interest_name: string | null;
  city: string | null;
  distance_km: number | null;
  member_count: number;
  is_member: boolean;
}

export interface GroupMember {
  group_id: string;
  profile_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}
