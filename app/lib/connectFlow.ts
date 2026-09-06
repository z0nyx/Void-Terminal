import { useHostsStore, parseAddr, type Host } from "./storage/hostsStore";
import { useSessionStore } from "./sessionStore";
import {
  connectHost,
  isNativeSshAvailable,
  type TrustPromptInfo,
} from "./ssh/connectionManager";
import {
  connectLocalShell,
  isLocalShellAvailable,
} from "./localShell/localShellManager";
import * as keychain from "./storage/keychain";

/**
 * Shared connect (and retry) logic for both the initial tap on a host in
 * Hosts.tsx and the Retry button on Session.tsx's connect-error screen —
 * one place to keep them from drifting. Drives SessionTab.status, which
 * Session.tsx reads to show the connecting/error takeover screens.
 */
export async function attemptHostConnect(
  host: Host,
  tabId: string,
  onTrustPrompt: (info: TrustPromptInfo) => Promise<boolean>,
): Promise<void> {
  const { setStatus, attachLive, pushLinesForTab } =
    useSessionStore.getState();
  setStatus(tabId, "connecting");

  if (!isNativeSshAvailable()) {
    // No native build yet (Expo Go / before the first prebuild) — fall
    // back to the demo shell instead of treating this as a failure.
    setStatus(tabId, "ready");
    pushLinesForTab(tabId, [
      {
        k: "sys",
        text: "Native SSH module not built yet — run `npx expo prebuild` then `expo run:android` for a real connection. Showing the demo shell for now.",
      },
    ]);
    return;
  }

  const { username, hostname, port } = parseAddr(host.addr);
  try {
    let password: string | undefined;
    let privateKeyOpenSsh: string | undefined;
    if (host.authMethod === "password") {
      password = (await keychain.getPassword(host.id)) ?? undefined;
      if (!password) {
        setStatus(
          tabId,
          "error",
          'No saved password for this host — edit the connection and enable "store in keychain" first.',
        );
        return;
      }
    } else {
      const identity = await keychain.getOrCreateIdentityKey();
      privateKeyOpenSsh = identity.privateKeyOpenSsh;
    }

    const live = await connectHost({
      hostname,
      port,
      username,
      authMethod: host.authMethod,
      password,
      privateKeyOpenSsh,
      onTrustPrompt,
      onStatus: (status, message) => {
        if (status === "closed" || status === "error") {
          pushLinesForTab(tabId, [{ k: "sys", text: message ?? status }]);
        }
      },
    });

    if (useSessionStore.getState().tabs.some((t) => t.id === tabId)) {
      attachLive(tabId, live);
      useHostsStore.getState().touch(host.id);
    } else {
      live.disconnect(); // tab was cancelled while this attempt was in flight
    }
  } catch (e: any) {
    if (useSessionStore.getState().tabs.some((t) => t.id === tabId)) {
      setStatus(tabId, "error", e?.message ?? String(e));
    }
  }
}

export async function attemptLocalShellConnect(tabId: string): Promise<void> {
  const { setStatus, attachLive, pushLinesForTab } =
    useSessionStore.getState();
  setStatus(tabId, "connecting");

  if (!isLocalShellAvailable()) {
    setStatus(tabId, "ready");
    pushLinesForTab(tabId, [
      {
        k: "sys",
        text: "Native local-shell module not built yet — run `npx expo prebuild` then `expo run:android` for a real shell. Showing the demo shell for now.",
      },
    ]);
    return;
  }

  try {
    const live = await connectLocalShell({
      onStatus: (status, message) => {
        if (
          status === "closed" ||
          status === "error" ||
          status === "exited"
        ) {
          pushLinesForTab(tabId, [{ k: "sys", text: message ?? status }]);
        }
      },
    });
    if (useSessionStore.getState().tabs.some((t) => t.id === tabId)) {
      attachLive(tabId, live);
    } else {
      live.disconnect();
    }
  } catch (e: any) {
    if (useSessionStore.getState().tabs.some((t) => t.id === tabId)) {
      setStatus(tabId, "error", e?.message ?? String(e));
    }
  }
}
