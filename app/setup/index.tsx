import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Redirect to the first step so users go through a linear setup flow instead of a menu.
export default function SetupHome() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useEffect(() => {
    // replace so the back button doesn't return to this index
    router.replace("/setup/create-account");
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, gap: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={{ fontSize: 17, color: colors.icon }}>Starting setup...</Text>
    </View>
  );
}
