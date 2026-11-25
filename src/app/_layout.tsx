import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, ThemeProvider } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import "../../global.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { NAV_THEME } from "@/lib/theme";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME[colorScheme ?? "light"]}>
        <AppProviders>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Stack />
          <PortalHost />
        </AppProviders>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
