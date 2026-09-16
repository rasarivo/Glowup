import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { LoadingScreen } from "@/components/LoadingScreen";
import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { useOnboardingStatus } from "@/lib/use-onboarding-status";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const { loading: onboardingLoading, isComplete } = useOnboardingStatus(session?.user.id);

  if (loading || (session && onboardingLoading)) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (!isComplete) return <Redirect href="/(onboarding)/profile-setup" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Découvrir", tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: "Matchs", tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} /> }}
      />
      <Tabs.Screen
        name="groups"
        options={{ title: "Groupes", tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarIcon: ({ focused }) => <TabIcon emoji="🙋" focused={focused} /> }}
      />
    </Tabs>
  );
}
