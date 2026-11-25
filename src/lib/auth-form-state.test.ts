import { describe, expect, it } from "vitest";
import { createEmptyAuthFormValues } from "./auth-form-state";

describe("createEmptyAuthFormValues", () => {
  it.each([
    ["login", { email: "", password: "" }],
    ["register", { email: "", displayName: "", password: "", confirmPassword: "" }],
    ["verifyEmail", { code: "" }],
    ["forgotPassword", { email: "" }],
    ["resetPassword", { token: "", password: "" }],
    ["changePassword", { currentPassword: "", newPassword: "" }],
  ] as const)("creates empty values for %s", (flow, expected) => {
    expect(createEmptyAuthFormValues(flow)).toEqual(expected);
  });
});
