import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { AuthFieldConfig } from "@/lib/auth-validation";
import { View } from "react-native";

type AuthFieldProps = {
  field: AuthFieldConfig;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
};

export function AuthField({ field, value, error, onChange }: AuthFieldProps) {
  const inputId = `auth-${field.name}`;

  return (
    <View className="gap-2">
      <Text nativeID={`${inputId}-label`} className="text-sm font-semibold text-[#1e2229]">
        {field.label}
      </Text>
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
