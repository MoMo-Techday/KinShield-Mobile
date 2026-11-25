import { AuthFlowProvider } from "@/components/auth/AuthFlowProvider";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <AuthFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthFlowProvider>
  );
}
