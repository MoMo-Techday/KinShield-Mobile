import { describe, expect, it } from "vitest";
import { authFormConfig, authSchemas } from "./auth-validation";

describe("register auth form links", () => {
  it("offers existing users a link to login", () => {
    expect(authFormConfig.register.links).toContainEqual({
      href: "/auth",
      label: "Đã có tài khoản? Đăng nhập",
    });
  });
});

const validRegisterValues = {
  email: "an@example.com",
  displayName: "Nguyen Van An",
  password: "valid-long-password-123!",
  confirmPassword: "valid-long-password-123!",
};

describe("register password confirmation", () => {
  it("accepts matching valid passwords", () => {
    expect(authSchemas.register.safeParse(validRegisterValues).success).toBe(true);
  });

  it("reports a mismatch on the confirmation field", () => {
    const result = authSchemas.register.safeParse({
      ...validRegisterValues,
      confirmPassword: "different-long-password-456!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["confirmPassword"],
          message: "Mật khẩu xác nhận không khớp.",
        }),
      );
    }
  });

  it.each(["short", "x".repeat(129)])(
    "keeps the existing password length limits for %s",
    (passwordValue) => {
      expect(
        authSchemas.register.safeParse({
          ...validRegisterValues,
          password: passwordValue,
          confirmPassword: passwordValue,
        }).success,
      ).toBe(false);
    },
  );

  it("places the confirmation input after password", () => {
    expect(authFormConfig.register.fields.map(({ name }) => name)).toEqual([
      "email",
      "displayName",
      "password",
      "confirmPassword",
    ]);
    expect(authFormConfig.register.fields[3]).toMatchObject({
      label: "Xác nhận mật khẩu",
      type: "password",
      autoComplete: "new-password",
      maxLength: 128,
    });
  });
});
