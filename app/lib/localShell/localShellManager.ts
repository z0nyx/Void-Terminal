import { Platform } from "react-native";
import { TerminalSession } from "../terminal/TerminalSession";
import type { LiveConnection } from "../ssh/connectionManager";

/**
 * Orchestrates modules/void-local-shell (forkpty'd /system/bin/sh) + a
 * TerminalSession, mirroring app/lib/ssh/connectionManager.ts so a local
 * shell tab is indistinguishable from an SSH one to Session.tsx and
 * sessionStore. Android-only — see VoidLocalShellModule.ts for why.
 */

export interface ConnectLocalParams {
  cols?: number;
  rows?: number;
  onStatus?: (status: string, message?: string) => void;
}

function loadNativeModule(): any | null {
  if (Platform.OS !== "android") return null;
  try {
    // Dynamic require (not a static import) so a missing native build
    // (Expo Go, or before the first `expo prebuild` + native run) fails
    // softly here instead of crashing the whole JS bundle at load time.
    return require("../../../modules/void-local-shell/src/VoidLocalShellModule")
      .default;
  } catch {
    return null;
  }
}

export function isLocalShellAvailable(): boolean {
  return loadNativeModule() !== null;
}

/** Whether the shell's cwd will be the phone's real shared storage rather than this app's private sandbox — see VoidLocalShellModule.ts. */
export function hasFullStorageAccess(): boolean {
  const mod = loadNativeModule();
  if (!mod) return false;
  try {
    return mod.hasFullStorageAccess();
  } catch {
    return false;
  }
}

/** Opens the system "All files access" settings screen for this app. */
export function openStorageAccessSettings(): void {
  loadNativeModule()?.openStorageAccessSettings();
}

const subscriptions = new Map<string, { remove: () => void }[]>();

export async function connectLocalShell(
  params: ConnectLocalParams = {},
): Promise<LiveConnection> {
  const VoidLocalShell = loadNativeModule();
  if (!VoidLocalShell) {
    throw new Error(
      Platform.OS !== "android"
        ? "Local shell is Android-only — iOS has no forkpty/exec equivalent in an app sandbox."
        : "Native local-shell module not linked — run `npx expo prebuild` and `expo run:android` at least once (Expo Go and the JS-only bundler preview cannot load custom native modules).",
    );
  }

  const cols = params.cols ?? 80;
  const rows = params.rows ?? 24;

  const { sessionId } = await VoidLocalShell.start(cols, rows);
  const terminal = new TerminalSession(cols, rows);

  const subs: { remove: () => void }[] = [];
  subs.push(
    VoidLocalShell.addListener(
      "onData",
      (e: { sessionId: string; base64: string }) => {
        if (e.sessionId === sessionId) terminal.feed(e.base64);
      },
    ),
  );
  subs.push(
    VoidLocalShell.addListener(
      "onStatus",
      (e: { sessionId: string; status: string; message?: string }) => {
        if (e.sessionId === sessionId) params.onStatus?.(e.status, e.message);
      },
    ),
  );
  subscriptions.set(sessionId, subs);

  return {
    connectionId: sessionId,
    terminal,
    write: (data: string) => VoidLocalShell.write(sessionId, data),
    resize: (c: number, r: number) => {
      terminal.resize(c, r);
      VoidLocalShell.resize(sessionId, c, r);
    },
    disconnect: () => {
      VoidLocalShell.stop(sessionId);
      subscriptions.get(sessionId)?.forEach((s) => s.remove());
      subscriptions.delete(sessionId);
      terminal.dispose();
    },
  };
}
