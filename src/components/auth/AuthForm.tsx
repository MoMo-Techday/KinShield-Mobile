import { AuthField } from "@/components/auth/AuthField";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuthFlow } from "@/components/auth/AuthFlowProvider";
import { authFormConfig, authSchemas, type AuthFlow } from "@/lib/auth-validation";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

type AuthFormProps = {
  flow: AuthFlow;
};

function createInitialValues(flow: AuthFlow): Record<string, string> {
  return Object.fromEntries(authFormConfig[flow].fields.map((field) => [field.name, ""]));
}

export function AuthForm({ flow }: AuthFormProps) {
  const config = authFormConfig[flow];
  const router = useRouter();
  const { pendingVerificationEmail, setPendingVerificationEmail } = useAuthFlow();
  const hasPendingVerificationEmailOnEntry = useRef(Boolean(pendingVerificationEmail));
  const [values, setValues] = useState<Record<string, string>>(() => createInitialValues(flow));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (flow === "verifyEmail" && !hasPendingVerificationEmailOnEntry.current) {
      router.replace("/auth/register");
    }
  }, [flow, router]);

  function updateField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setNotice("");
  }

  function handleSubmit() {
    if (flow === "verifyEmail" && !pendingVerificationEmail) {
      router.replace("/auth/register");
      return;
    }

    const valuesToValidate =
      flow === "verifyEmail"
        ? { ...values, email: pendingVerificationEmail ?? "" }
        : values;
    const result = authSchemas[flow].safeParse(valuesToValidate);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string" && !nextErrors[fieldName]) {
          nextErrors[fieldName] = issue.message;
        }
      }
      setErrors(nextErrors);
      setNotice("");
      return;
    }

    setErrors({});
    setNotice("");

    switch (flow) {
      case "register":
        setPendingVerificationEmail(values.email);
        router.push("/auth/email/verify");
        return;
      case "verifyEmail":
        setPendingVerificationEmail(null);
        router.replace("/auth");
        return;
      case "forgotPassword":
        router.push("/auth/password/reset");
        return;
      case "resetPassword":
        router.replace("/auth");
        return;
      default:
        setNotice("Thông tin hợp lệ. Kết nối API xác thực chưa được triển khai.");
    }
  }

  return (
    <AuthFormShell title={config.title} description={config.description}>
      <View className="gap-5">
        <View className="gap-4">
          {config.fields.map((field) => (
            <AuthField
              key={field.name}
              field={field}
              value={values[field.name] ?? ""}
              error={errors[field.name]}
              onChange={updateField}
            />
          ))}
        </View>

        <Button
          onPress={handleSubmit}
          className="h-12 w-full rounded-xl bg-[#264673] active:bg-[#1c3559]"
        >
          <Text className="font-bold text-white">{config.submitLabel}</Text>
        </Button>

        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            className="rounded-xl border border-[#2e6f5e]/20 bg-[#ebf5f2] px-4 py-3 text-sm leading-6 text-[#245848]"
          >
            {notice}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap justify-center gap-x-5 gap-y-2">
          {config.links.map((link) => (
            <Pressable
              key={link.href}
              accessibilityRole="link"
              onPress={() => router.push(link.href)}
            >
              <Text className="text-sm font-semibold text-[#264673] underline">{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AuthFormShell>
  );
}
