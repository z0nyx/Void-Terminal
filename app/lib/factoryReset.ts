import { storage } from "./storage/mmkv";
import * as keychain from "./storage/keychain";
import { useHostsStore } from "./storage/hostsStore";
import { useSettingsStore } from "./storage/settingsStore";

/**
 * The "Delete All Data" action promised by legal/account-deletion.md and
 * legal/data-deletion.md — everything the app has ever written, gone,
 * with no server round-trip because there's no server to round-trip to.
 */
export async function wipeAllData(): Promise<void> {
  const hosts = useHostsStore.getState().hosts;
  await Promise.all(
    hosts.flatMap((h) => [
      keychain.deletePassword(h.id).catch(() => {}),
      keychain.deletePrivateKey(h.id).catch(() => {}),
    ]),
  );
  await keychain.deleteIdentityKey().catch(() => {});

  storage.clearAll();

  useHostsStore.setState({ hosts: [] });
  useSettingsStore.setState({
    theme: "dark",
    fontSize: 13,
    welcomed: true, // stay past Welcome — the user didn't ask to see onboarding again
    keyBar: { stickyModifiers: true, haptics: true, swipeRows: false },
  });
}
