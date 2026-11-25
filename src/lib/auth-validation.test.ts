import { describe, expect, it } from "vitest";
import { authFormConfig } from "./auth-validation";

describe("register auth form links", () => {
  it("offers existing users a link to login", () => {
    expect(authFormConfig.register.links).toContainEqual({
      href: "/auth",
      label: "Đã có tài khoản? Đăng nhập",
    });
  });
});
