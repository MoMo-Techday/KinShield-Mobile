import { useState } from "react";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { AuthFieldConfig } from "@/lib/auth-validation";
import { THEME } from "@/lib/theme";

type AuthFieldProps = {
  field: AuthFieldConfig;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
};

function PasswordEyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <Circle cx="12" cy="12" r="3" />
      {visible ? <Line x1="3" y1="3" x2="21" y2="21" /> : null}
    </Svg>
  );
}

export function AuthField({ field, value, error, onChange }: AuthFieldProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [showPassword, setShowPassword] = useState(false);

  const inputId = `auth-${field.name}`;
  const action = field.action;
  const isPassword = field.type === "password";
  const iconColor = THEME[colorScheme ?? "light"].mutedForeground;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text nativeID={`${inputId}-label`} className="text-sm font-semibold text-foreground">
          {field.label}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(action.href)}
          >
            <Text className="text-xs font-medium text-muted-foreground active:text-primary">
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="relative justify-center">
        <Input
          nativeID={inputId}
          value={value}
          placeholder={field.placeholder}
          keyboardType={field.keyboardType}
          autoComplete={field.autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPassword && !showPassword}
          maxLength={field.maxLength}
          aria-invalid={Boolean(error)}
          accessibilityLabel={field.label}
          accessibilityHint={error}
          onChangeText={(text) => onChange(field.name, text)}
          className={`h-12 rounded-xl border-input bg-card px-4 text-base text-foreground ${
            isPassword ? "pr-12" : ""
          }`}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-2 size-9 items-center justify-center rounded-lg"
          >
            <PasswordEyeIcon visible={showPassword} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm font-medium text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
