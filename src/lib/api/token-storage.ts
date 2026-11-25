import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'kinshield_access_token';

type StoredAccessToken = {
  token: string;
  expiresAt: number;
};

function isStoredAccessToken(value: unknown): value is StoredAccessToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number'
  );
}

export async function saveAccessToken(token: string, expiresIn: number): Promise<void> {
  if (!token.trim() || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new TypeError('A valid access token and positive expiry are required.');
  }

  const storedToken: StoredAccessToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1_000,
  };
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, JSON.stringify(storedToken));
}

export async function getAccessToken(): Promise<string | null> {
  const storedValue = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!storedValue) {
    return null;
  }

  let storedValueParsed: unknown;
  try {
    storedValueParsed = JSON.parse(storedValue) as unknown;
  } catch {
    await clearAccessToken();
    return null;
  }

  if (
    !isStoredAccessToken(storedValueParsed) ||
    !storedValueParsed.token ||
    !Number.isFinite(storedValueParsed.expiresAt) ||
    Date.now() >= storedValueParsed.expiresAt
  ) {
    await clearAccessToken();
    return null;
  }

  return storedValueParsed.token;
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
