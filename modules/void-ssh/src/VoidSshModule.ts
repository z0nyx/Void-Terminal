import { NativeModule, requireNativeModule } from 'expo';
import type { ConnectResult, IdentityKeyResult, VoidSshEvents } from './VoidSsh.types';

/**
 * Native bridge to a real interactive SSH shell (raw PTY byte stream, not
 * line-buffered) — see modules/void-ssh/README.md for why this exists as a
 * hand-written module instead of a community RN package, and for the sshj
 * (Android) implementation this wraps.
 *
 * IMPORTANT: this native code has been written carefully against the sshj
 * API but has NOT been compiled or run on-device — the sandbox this was
 * built in has no Android SDK toolchain. Building and smoke-testing it
 * (`npx expo prebuild` then `expo run:android`) is the first thing to do
 * with this module on a real dev machine, per README.md's verification
 * checklist.
 */
declare class VoidSshModule extends NativeModule<VoidSshEvents> {
  /**
   * Opens the TCP + SSH transport and negotiates the host key, but does
   * NOT authenticate yet. Callers must inspect `hostKeyFingerprintSha256`
   * against their own trust store (see app/lib/ssh/hostKeyStore.ts) and
   * call `verifyHostKey` before `authenticatePassword`/`authenticateKey`
   * will do anything — this is the app's TOFU host-key check, equivalent
   * to OpenSSH's "authenticity of host ... can't be established" prompt.
   */
  connect(host: string, port: number, username: string): Promise<ConnectResult>;

  /** Continue (accepted=true) or close the pending connection (accepted=false). */
  verifyHostKey(connectionId: string, accepted: boolean): Promise<void>;

  authenticatePassword(connectionId: string, username: string, password: string): Promise<void>;

  authenticateKey(
    connectionId: string,
    username: string,
    privateKeyOpenSsh: string,
    passphrase?: string
  ): Promise<void>;

  /** Allocates a PTY and starts an interactive shell; `onData` events begin firing after this resolves. */
  startShell(connectionId: string, cols: number, rows: number): Promise<void>;

  /** Fire-and-forget: writes UTF-8 text to the shell's stdin. */
  write(connectionId: string, data: string): void;

  resize(connectionId: string, cols: number, rows: number): void;

  disconnect(connectionId: string): void;

  /** Generates the app's single Ed25519 identity, OpenSSH-formatted, unencrypted (secured at rest by the Keychain instead). */
  generateEd25519KeyPair(comment: string): Promise<IdentityKeyResult>;
}

export default requireNativeModule<VoidSshModule>('VoidSsh');
