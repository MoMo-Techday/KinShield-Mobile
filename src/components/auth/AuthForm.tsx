import { AuthField } from "@/components/auth/AuthField";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuthFlow } from "@/components/auth/AuthFlowProvider";
import { authFormConfig, authSchemas, type AuthFlow } from "@/lib/auth-validation";
import { createEmptyAuthFormValues } from "@/lib/auth-form-state";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  useChangePassword,
  useForgotPassword,
  useLogin,
  useRegister,
  useResetPassword,
  useVerifyEmail,
} from "@/hooks/use-auth";

type AuthFormProps = {
  flow: AuthFlow;
};

const pendingLabels: Record<AuthFlow, string> = {
  login: "Đang đăng nhập...",
  register: "Đang tạo tài khoản...",
  verifyEmail: "Đang xác minh...",
  forgotPassword: "Đang gửi yêu cầu...",
  resetPassword: "Đang đặt lại mật khẩu...",
  changePassword: "Đang cập nhật...",
};

export function AuthForm({ flow }: AuthFormProps) {
  const config = authFormConfig[flow];
  const router = useRouter();
  const { pendingVerificationEmail, setPendingVerificationEmail } = useAuthFlow();
  const hasPendingVerificationEmailOnEntry = useRef(Boolean(pendingVerificationEmail));
  const [values, setValues] = useState<Record<string, string>>(() => createEmptyAuthFormValues(flow));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  function resetForm() {
    setValues(createEmptyAuthFormValues(flow));
    setErrors({});
    setNotice("");
  }

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const verifyEmailMutation = useVerifyEmail();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();
  const changePasswordMutation = useChangePassword();
  const isPending = {
    login: loginMutation.isPending,
    register: registerMutation.isPending,
    verifyEmail: verifyEmailMutation.isPending,
    forgotPassword: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.isPending,
    changePassword: changePasswordMutation.isPending,
  }[flow];

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
      case "login":
        loginMutation.mutate(
          { email: values.email, password: values.password },
          {
            onSuccess: () => {
              resetForm();
              router.replace("/profile");
            },
          },
        );
        return;
      case "register": {
        const registrationEmail = values.email;
        registerMutation.mutate(
          {
            email: values.email,
            displayName: values.displayName,
            password: values.password,
          },
          {
            onSuccess: () => {
              setPendingVerificationEmail(registrationEmail);
              resetForm();
              router.push("/auth/email/verify");
            },
          },
        );
        return;
      }
      case "verifyEmail":
        verifyEmailMutation.mutate(
          { email: valuesToValidate.email, code: values.code },
          {
            onSuccess: () => {
              resetForm();
              setPendingVerificationEmail(null);
              router.replace("/auth");
            },
          },
        );
        return;
      case "forgotPassword":
        forgotPasswordMutation.mutate(
          { email: values.email },
          {
            onSuccess: () => {
              resetForm();
              router.push("/auth/password/reset");
            },
          },
        );
        return;
      case "resetPassword":
        resetPasswordMutation.mutate(
          { token: values.token, password: values.password },
          {
            onSuccess: () => {
              resetForm();
              router.replace("/auth");
            },
          },
        );
        return;
      case "changePassword":
        changePasswordMutation.mutate(
          { currentPassword: values.currentPassword, newPassword: values.newPassword },
          {
            onSuccess: () => {
              resetForm();
              setNotice("Mật khẩu đã được cập nhật.");
            },
          },
        );
        return;
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
          disabled={isPending}
          className="h-12 w-full rounded-xl bg-primary active:bg-primary/90"
        >
          <Text className="font-bold text-primary-foreground">
            {isPending ? pendingLabels[flow] : config.submitLabel}
          </Text>
        </Button>

        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            className="rounded-xl border border-success-foreground/20 bg-success px-4 py-3 text-sm leading-6 text-success-foreground"
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
              <Text className="text-sm font-semibold text-primary underline">{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </AuthFormShell>
  );
}
