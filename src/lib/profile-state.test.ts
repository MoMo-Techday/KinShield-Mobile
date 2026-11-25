import { describe, expect, it } from "vitest";
import { isUnauthorizedProfileError, shouldRetryProfileQuery } from "./profile-state";

const unauthorized = Object.assign(new Error("Unauthorized"), {
  isAxiosError: true,
  response: { status: 401 },
  config: { url: "/auth/me" },
});
const missingRefreshCookie = Object.assign(new Error("Refresh cookie required"), {
  isAxiosError: true,
  response: { status: 400 },
  config: { url: "/auth/refresh" },
});
const invalidRefreshCookie = Object.assign(new Error("Invalid refresh cookie"), {
  isAxiosError: true,
  response: { status: 401 },
  config: { url: "/auth/refresh" },
});
const otherBadRequest = Object.assign(new Error("Bad request"), {
  isAxiosError: true,
  response: { status: 400 },
  config: { url: "/auth/me" },
});
const forbidden = Object.assign(new Error("Origin is not allowed"), {
  isAxiosError: true,
  response: { status: 403 },
  config: { url: "/auth/me" },
});

describe("profile query state", () => {
  it("recognizes protected and refresh-cookie authorization failures", () => {
    expect(isUnauthorizedProfileError(unauthorized)).toBe(true);
    expect(isUnauthorizedProfileError(missingRefreshCookie)).toBe(true);
    expect(isUnauthorizedProfileError(invalidRefreshCookie)).toBe(true);
  });

  it("does not mistake other errors for an unauthenticated session", () => {
    expect(isUnauthorizedProfileError(otherBadRequest)).toBe(false);
    expect(isUnauthorizedProfileError(forbidden)).toBe(false);
    expect(isUnauthorizedProfileError(new Error("Network error"))).toBe(false);
  });

  it("does not retry unauthorized requests", () => {
    expect(shouldRetryProfileQuery(0, unauthorized)).toBe(false);
    expect(shouldRetryProfileQuery(0, missingRefreshCookie)).toBe(false);
    expect(shouldRetryProfileQuery(0, invalidRefreshCookie)).toBe(false);
  });

  it("retries transient errors at most twice", () => {
    const networkError = new Error("Network error");
    expect(shouldRetryProfileQuery(0, networkError)).toBe(true);
    expect(shouldRetryProfileQuery(1, networkError)).toBe(true);
    expect(shouldRetryProfileQuery(2, networkError)).toBe(false);
  });
});
