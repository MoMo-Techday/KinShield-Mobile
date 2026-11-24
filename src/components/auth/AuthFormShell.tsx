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
    <SafeAreaView className="flex-1 bg-[#f9f6f0]">
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
              <View className="size-12 items-center justify-center rounded-2xl bg-[#264673] shadow-sm">
                <Text className="text-lg font-extrabold text-white">K</Text>
              </View>
              <Text className="text-xs font-extrabold tracking-[3px] text-[#264673]">
                KINSHIELD
              </Text>
            </View>

            <Card className="gap-0 rounded-[28px] border-[#e5ddd0] bg-white py-0 shadow-xl shadow-[#264673]/[0.06]">
              <CardHeader className="gap-2 px-6 pt-7">
                <CardTitle className="text-2xl font-bold text-[#1e2229]">{title}</CardTitle>
                <Text className="text-sm leading-6 text-[#5a616d]">{description}</Text>
              </CardHeader>
              <CardContent className="px-6 pb-7 pt-6">{children}</CardContent>
            </Card>

            <Text className="text-center text-xs leading-5 text-[#777d86]">
              KinShield không bao giờ yêu cầu bạn chia sẻ mã OTP.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
