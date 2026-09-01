import * as Keychain from 'react-native-keychain';

/**
 * Secrets only: host passwords and the app's SSH private key. Never stored
 * in MMKV. Every read is gated by the device's biometric/passcode prompt
 * (ACCESS_CONTROL.BIOMETRY_ANY, falling back to the device passcode),
 * matching the mockup's "unlock with Face ID" copy.
 */

const passwordService = (hostId: string) => `sh.void.terminal.password.${hostId}`;
const keyService = (hostId: string) => `sh.void.terminal.key.${hostId}`;
const IDENTITY_KEY_SERVICE = 'sh.void.terminal.identity-ed25519';

const secureOptions: Keychain.SetOptions = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function savePassword(hostId: string, password: string): Promise<void> {
  await Keychain.setGenericPassword('password', password, {
    service: passwordService(hostId),
    ...secureOptions,
  });
}

export async function getPassword(hostId: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service: passwordService(hostId) });
  return result ? result.password : null;
}

export async function deletePassword(hostId: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: passwordService(hostId) });
}

export async function savePrivateKey(hostId: string, privateKeyOpenSsh: string): Promise<void> {
  await Keychain.setGenericPassword('key', privateKeyOpenSsh, {
    service: keyService(hostId),
    ...secureOptions,
  });
}

export async function getPrivateKey(hostId: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({ service: keyService(hostId) });
  return result ? result.password : null;
}

export async function deletePrivateKey(hostId: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: keyService(hostId) });
}

export interface IdentityKey {
  privateKeyOpenSsh: string;
  publicKeySsh: string;
  fingerprintSha256: string;
}

/**
 * The single app-wide "id_ed25519" identity shown in Settings → Keys and
 * offered as the KEY auth option in the host sheet. Generation happens in
 * the native void-ssh module (Secure-Enclave-backed key material, OpenSSH
 * export) — see modules/void-ssh. Until that module lands this throws, so
 * callers must not silently treat a missing identity as "no key needed".
 */
export async function getOrCreateIdentityKey(): Promise<IdentityKey> {
  const cached = await Keychain.getGenericPassword({ service: IDENTITY_KEY_SERVICE });
  if (cached) {
    const { privateKeyOpenSsh, publicKeySsh, fingerprintSha256 } = JSON.parse(cached.password);
    return { privateKeyOpenSsh, publicKeySsh, fingerprintSha256 };
  }

  const VoidSsh = require('../../../modules/void-ssh/src/VoidSshModule').default;
  const generated: IdentityKey = await VoidSsh.generateEd25519KeyPair('void-terminal');
  await Keychain.setGenericPassword('identity', JSON.stringify(generated), {
    service: IDENTITY_KEY_SERVICE,
    ...secureOptions,
  });
  return generated;
}
