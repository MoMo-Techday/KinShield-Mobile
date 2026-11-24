import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { AuthFieldConfig } from "@/lib/auth-validation";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

type AuthFieldProps = {
  field: AuthFieldConfig;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
};

export function AuthField({ field, value, error, onChange }: AuthFieldProps) {
  const router = useRouter();
  const inputId = `auth-${field.name}`;
  const action = field.action;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text nativeID={`${inputId}-label`} className="text-sm font-semibold text-[#1e2229]">
          {field.label}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(action.href)}
          >
            <Text className="text-xs font-medium text-[#777d86] active:text-[#264673]">
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Input
        nativeID={inputId}
        value={value}
        placeholder={field.placeholder}
        keyboardType={field.keyboardType}
        autoComplete={field.autoComplete}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={field.type === "password"}
        maxLength={field.maxLength}
        aria-invalid={Boolean(error)}
        accessibilityLabel={field.label}
        accessibilityHint={error}
        onChangeText={(text) => onChange(field.name, text)}
        className="h-12 rounded-xl border-[#e5ddd0] bg-white px-4 text-base"
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm font-medium text-[#b91c1c]">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
