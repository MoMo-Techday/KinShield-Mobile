import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthFormShell({ title, description, children }: AuthFormShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow justify-center px-5 py-8"
        >
          <View className="mx-auto w-full max-w-[460px] gap-5">
            <View className="items-center gap-3">
              <View className="size-12 items-center justify-center rounded-2xl bg-primary shadow-sm">
                <Text className="text-lg font-extrabold text-primary-foreground">K</Text>
              </View>
              <Text className="text-xs font-extrabold tracking-[3px] text-primary">
                KINSHIELD
              </Text>
            </View>

            <Card className="gap-0 rounded-[28px] border-border bg-card py-0 shadow-xl shadow-primary/[0.06]">
              <CardHeader className="gap-2 px-6 pt-7">
                <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
                <Text className="text-sm leading-6 text-muted-foreground">{description}</Text>
              </CardHeader>
              <CardContent className="px-6 pb-7 pt-6">{children}</CardContent>
            </Card>

            <Text             className="text-center text-xs leading-5 text-muted-foreground">
              KinShield không bao giờ yêu cầu bạn chia sẻ mã OTP.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
