import * as hostKeyStore from "./hostKeyStore";
import { TerminalSession } from "../terminal/TerminalSession";

/**
 * Orchestrates modules/void-ssh (native SSH) + the host-key trust store +
 * a TerminalSession per connection. Session.tsx is the caller; it also
 * still has a self-contained demo path (app/lib/demoShell.ts) for running
 * in Expo Go / before a native build exists — see isNativeSshAvailable().
 */

export interface TrustPromptInfo {
  fingerprint: string;
  keyType: string;
  changed: boolean; // true = the host key differs from what we last pinned (possible MITM or legitimate key rotation)
}

export interface ConnectParams {
  hostname: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  password?: string;
  privateKeyOpenSsh?: string;
  passphrase?: string;
  cols?: number;
  rows?: number;
  onTrustPrompt: (info: TrustPromptInfo) => Promise<boolean>;
  onStatus?: (status: string, message?: string) => void;
}

export interface LiveConnection {
  connectionId: string;
  terminal: TerminalSession;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  disconnect: () => void;
}

function loadNativeModule(): any | null {
  try {
    // Dynamic require (not a static import) so a missing native build
    // (Expo Go, or before the first `expo prebuild` + native run) fails
    // softly here instead of crashing the whole JS bundle at load time.
    return require("../../../modules/void-ssh/src/VoidSshModule").default;
  } catch {
    return null;
  }
}

export function isNativeSshAvailable(): boolean {
  return loadNativeModule() !== null;
}

const subscriptions = new Map<string, { remove: () => void }[]>();

export async function connectHost(
  params: ConnectParams,
): Promise<LiveConnection> {
  const VoidSsh = loadNativeModule();
  if (!VoidSsh) {
    throw new Error(
      "Native SSH module not linked — run `npx expo prebuild` and `expo run:android` at least once (Expo Go and the JS-only bundler preview cannot load custom native modules).",
    );
  }

  const cols = params.cols ?? 80;
  const rows = params.rows ?? 24;

  const { connectionId, hostKeyFingerprintSha256, hostKeyType } =
    await VoidSsh.connect(params.hostname, params.port, params.username);

  const pinned = hostKeyStore.getPinnedFingerprint(
    params.hostname,
    params.port,
  );
  const changed = pinned !== null && pinned !== hostKeyFingerprintSha256;
  const accepted =
    pinned === hostKeyFingerprintSha256
      ? true
      : await params.onTrustPrompt({
          fingerprint: hostKeyFingerprintSha256,
          keyType: hostKeyType,
          changed,
        });

  await VoidSsh.verifyHostKey(connectionId, accepted);
  if (!accepted) {
    throw new Error("Host key not trusted — connection closed.");
  }
  hostKeyStore.pinFingerprint(
    params.hostname,
    params.port,
    hostKeyFingerprintSha256,
  );

  if (params.authMethod === "password") {
    if (!params.password)
      throw new Error("Password required for password auth.");
    await VoidSsh.authenticatePassword(
      connectionId,
      params.username,
      params.password,
    );
  } else {
    if (!params.privateKeyOpenSsh)
      throw new Error("Private key required for key auth.");
    await VoidSsh.authenticateKey(
      connectionId,
      params.username,
      params.privateKeyOpenSsh,
      params.passphrase,
    );
  }

  await VoidSsh.startShell(connectionId, cols, rows);

  const terminal = new TerminalSession(cols, rows);
  const subs: { remove: () => void }[] = [];
  subs.push(
    VoidSsh.addListener(
      "onData",
      (e: { connectionId: string; base64: string }) => {
        if (e.connectionId === connectionId) terminal.feed(e.base64);
      },
    ),
  );
  subs.push(
    VoidSsh.addListener(
      "onStatus",
      (e: { connectionId: string; status: string; message?: string }) => {
        if (e.connectionId === connectionId)
          params.onStatus?.(e.status, e.message);
      },
    ),
  );
  subscriptions.set(connectionId, subs);

  return {
    connectionId,
    terminal,
    write: (data: string) => VoidSsh.write(connectionId, data),
    resize: (c: number, r: number) => {
      terminal.resize(c, r);
      VoidSsh.resize(connectionId, c, r);
    },
    disconnect: () => {
      VoidSsh.disconnect(connectionId);
      subscriptions.get(connectionId)?.forEach((s) => s.remove());
      subscriptions.delete(connectionId);
      terminal.dispose();
    },
  };
}
