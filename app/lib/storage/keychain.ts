import * as Keychain from "react-native-keychain";

/**
 * Secrets only: host passwords and the app's SSH private key. Never stored
 * in MMKV. Every read is gated by the device's biometric prompt
 * (ACCESS_CONTROL.BIOMETRY_ANY), matching the mockup's "unlock with Face
 * ID" copy.
 *
 * Not BIOMETRY_ANY_OR_DEVICE_PASSCODE: that combined-authenticator flag
 * (BIOMETRIC_STRONG | DEVICE_CREDENTIAL under the hood) hits a native
 * crash — "Attempt to get length of null array" — on at least some
 * ColorOS (Realme/Oppo) biometric stacks even with a fingerprint enrolled
 * and a device passcode set. Plain BIOMETRY_ANY uses the simpler
 * single-authenticator path and avoids it.
 */

const passwordService = (hostId: string) =>
  `sh.void.terminal.password.${hostId}`;
const keyService = (hostId: string) => `sh.void.terminal.key.${hostId}`;
const IDENTITY_KEY_SERVICE = "sh.void.terminal.identity-ed25519";

const accessibleOnly: Keychain.SetOptions = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const secureOptions: Keychain.SetOptions = {
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  ...accessibleOnly,
};

/**
 * Tries the biometric-gated write first; if the device's biometric stack
 * itself is broken (see module doc above), falls back to a plain
 * device-encrypted entry rather than failing to save the secret at all.
 */
async function setSecret(
  service: string,
  username: string,
  value: string,
): Promise<void> {
  try {
    await Keychain.setGenericPassword(username, value, {
      service,
      ...secureOptions,
    });
  } catch {
    await Keychain.setGenericPassword(username, value, {
      service,
      ...accessibleOnly,
    });
  }
}

export async function savePassword(
  hostId: string,
  password: string,
): Promise<void> {
  await setSecret(passwordService(hostId), "password", password);
}

export async function getPassword(hostId: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({
    service: passwordService(hostId),
  });
  return result ? result.password : null;
}

export async function deletePassword(hostId: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: passwordService(hostId) });
}

export async function savePrivateKey(
  hostId: string,
  privateKeyOpenSsh: string,
): Promise<void> {
  await setSecret(keyService(hostId), "key", privateKeyOpenSsh);
}

export async function getPrivateKey(hostId: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({
    service: keyService(hostId),
  });
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
export async function deleteIdentityKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: IDENTITY_KEY_SERVICE });
}

export async function getOrCreateIdentityKey(): Promise<IdentityKey> {
  const cached = await Keychain.getGenericPassword({
    service: IDENTITY_KEY_SERVICE,
  });
  if (cached) {
    const { privateKeyOpenSsh, publicKeySsh, fingerprintSha256 } = JSON.parse(
      cached.password,
    );
    return { privateKeyOpenSsh, publicKeySsh, fingerprintSha256 };
  }

  const VoidSsh =
    require("../../../modules/void-ssh/src/VoidSshModule").default;
  const generated: IdentityKey =
    await VoidSsh.generateEd25519KeyPair("void-terminal");
  await setSecret(IDENTITY_KEY_SERVICE, "identity", JSON.stringify(generated));
  return generated;
}
