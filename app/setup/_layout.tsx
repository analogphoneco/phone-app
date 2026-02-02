import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SetupLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          color: colors.text,
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Setup" }} />
      <Stack.Screen name="create-account" options={{ title: "Sign Up" }} />
      <Stack.Screen name="subscribe" options={{ title: "Subscribe" }} />
      <Stack.Screen name="pick-number" options={{ title: "Choose Number" }} />
      <Stack.Screen name="complete" options={{ title: "Setup Complete", headerBackVisible: false }} />
      <Stack.Screen name="provision" options={{ title: "Device Credentials" }} />
    </Stack>
  );
}
