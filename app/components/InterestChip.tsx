import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

interface InterestChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function InterestChip({ label, emoji, selected, onPress }: InterestChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {emoji ? `${emoji} ` : ""}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.text, fontSize: 14, fontWeight: "600" },
  labelSelected: { color: colors.white },
});
