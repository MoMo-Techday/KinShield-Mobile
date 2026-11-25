import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, saveAccessToken } from './token-storage';

const secureStore = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

vi.mock('expo-secure-store', () => secureStore);

describe('native access token storage', () => {
  beforeEach(() => {
    secureStore.values.clear();
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the access token with its absolute expiry', async () => {
    await saveAccessToken('access-token', 900);

    await expect(getAccessToken()).resolves.toBe('access-token');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'kinshield_access_token',
      JSON.stringify({ token: 'access-token', expiresAt: 901_000 }),
    );
  });

  it('clears and rejects an expired access token', async () => {
    secureStore.values.set(
      'kinshield_access_token',
      JSON.stringify({ token: 'expired-token', expiresAt: 1_000 }),
    );
    vi.spyOn(Date, 'now').mockReturnValue(1_001);

    await expect(getAccessToken()).resolves.toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('clears the stored access token', async () => {
    await saveAccessToken('access-token', 900);

    await clearAccessToken();

    expect(secureStore.values.size).toBe(0);
  });
});
