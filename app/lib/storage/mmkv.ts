import { createMMKV } from 'react-native-mmkv';

/**
 * Non-secret local state only: theme, font size, key-bar toggles, host
 * metadata, command history, snippets. Passwords and private keys never
 * touch this store — see lib/storage/keychain.ts for those.
 */
export const storage = createMMKV({ id: 'void-terminal' });

export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
