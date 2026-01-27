import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";

// Redirect to the first step so users go through a linear setup flow instead of a menu.
export default function SetupHome() {
  const router = useRouter();

  useEffect(() => {
    // replace so the back button doesn't return to this index
    router.replace("/setup/create-account");
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, gap: 12, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20 }}>Starting setup...</Text>
    </View>
  );
}
