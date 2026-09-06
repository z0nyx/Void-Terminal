# Void Terminal

A mobile SSH/mosh/tmux terminal client for Android — real key-bar
modifier keys, ghost autocomplete, a command rail for scrollback, and a
terminal that actually renders `vim`/`htop`/`tmux` correctly.

This app was built out from a Claude Design pitch (`design-reference/Void
Terminal.dc.html`) into a real, working implementation. That mockup is kept
for reference only — it's not part of the shipped app.

## Stack

- **React Native + TypeScript**, via **Expo** (prebuild / dev-client / EAS
  Build) — chosen for a clean path to both a local Gradle APK and cloud
  `eas build`, without giving up native modules.
- **`@xterm/headless`** — a real VT100/256-color/alt-screen terminal
  buffer, feeding a custom RN `Text`-grid renderer
  (`app/components/terminal/TerminalGrid.tsx`) — so full-screen apps
  (`vim`, `htop`, `tmux`) render correctly, not just plain command output.
- **`modules/void-ssh`** — a hand-written Expo native module (Kotlin)
  wrapping **sshj** (Android) for a real interactive SSH shell with a raw
  byte stream. Written because `react-native-ssh-sftp`, the only community
  RN package for this, is abandoned and pinned to `react-native ^0.54.0` —
  incompatible with the New Architecture this app runs on. See
  `modules/void-ssh/README.md`. Android only — there is no iOS build.
- **`react-native-keychain`** — passwords and the SSH identity key, gated
  by Face ID / Touch ID / device passcode (`ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE`).
- **`react-native-mmkv`** — everything else local (host list, theme, font
  size, key-bar toggles, command history, pinned host-key fingerprints).
- **Zustand** for app state, **`@gorhom/bottom-sheet`** for the New/Edit
  Host, Session Switcher and Snippet Palette sheets, **`@react-navigation`**
  for the Hosts / Session / Settings tabs.

## Project layout

```
app/
  screens/        Welcome, Hosts, Session, Settings
  components/
    terminal/      TerminalGrid — the real VT100 renderer
    sheets/        HostEditorSheet, SessionSwitcherSheet, SnippetPaletteSheet
    ui/            Text, icons (transcribed 1:1 from the design pitch's SVGs)
  lib/
    connectFlow.ts   shared connect/retry logic (Hosts.tsx tap + Session.tsx Retry button)
    ssh/             connectionManager (orchestrates void-ssh + host-key trust), hostKeyStore
    localShell/      localShellManager — hand-off to the local Termux shell (Android only)
    terminal/        TerminalSession (xterm-headless wrapper), base64, 256-color palette
    storage/         mmkv.ts, keychain.ts, hostsStore, settingsStore
    theme/           design tokens (colors extracted from the pitch, both themes), fonts
    demoShell.ts     the pitch's original canned-output shell — used as a graceful
                     fallback in Expo Go / before a native build exists (see below)
modules/
  void-ssh/          the native SSH module (Kotlin + TS bridge), Android only
  void-local-shell/  the native local-shell module (Kotlin/C + TS bridge), Android only
assets/fonts/        self-hosted Archivo + IBM Plex Mono (SIL OFL) static weights
design-reference/    the original Claude Design pitch — reference only, not shipped
```

## Getting started

```bash
npm install
npx expo prebuild        # generates android/ from app.json + modules/*
npx expo run:android
```

`expo start` alone (Expo Go, or the JS-only Metro bundler) will run the UI
but **cannot** load `modules/void-ssh` — Expo Go only ships Expo's own
built-in native modules. Without a prebuild, connecting to a host falls
back to `app/lib/demoShell.ts`'s canned transcript instead of a real SSH
session, and clearly says so in the session view. This is intentional: it
lets you review every screen immediately, and the real backend activates
the moment you do a native build.

For a signed release `.apk`, see **[HELP.md](HELP.md)** (in Russian — see
below for why).

## Honest feature status

- **SSH** — real, via `modules/void-ssh`. Password and Ed25519-key auth,
  TOFU host-key verification (pinned fingerprints in
  `app/lib/ssh/hostKeyStore.ts`, exactly like `~/.ssh/known_hosts`), raw
  PTY byte stream.
- **mosh** — **not implemented.** The per-host toggle and UI are real and
  persisted, but connecting to a mosh-enabled host currently just connects
  over SSH. Real mosh means implementing the SSP protocol (UDP transport,
  AES-OCB, terminal-state diff/sync) — no maintained mobile library exists
  for it (Termius and JuiceSSH don't support it either; Blink Shell
  hand-wrote their own C client). Scoped out of v1 deliberately rather
  than shipped half-working.
- **tmux / `pkg` / any remote command** — these are just bytes sent over
  the real SSH PTY, so they work as soon as SSH does; no special client
  code needed. The `TMUX` key-bar row's convenience keys (split/zoom/new
  window) are currently local UI toggles only — they don't yet send tmux's
  own control sequences (e.g. the `C-b %` prefix), which is a reasonable
  next step once the SSH core has real mileage on it.
- **Local shell** — a real hand-off to a locally-forked PTY
  (`modules/void-local-shell`, orchestrated by
  `app/lib/localShell/localShellManager.ts`), Android only. Not available
  on iOS at all in any form — this app targets Android exclusively, and
  even if it didn't, iOS's app sandbox forbids one app from forking a
  shell process onto `/system/bin/sh`.
- **Native module build status** — `modules/void-ssh`'s Kotlin was written
  carefully against the sshj API but has **not been compiled or run on a
  device** — this was built in a sandbox with no Android SDK. The first
  real step on a dev machine is `npx expo prebuild` + `expo run:android`
  against a disposable test SSH server, before anything else gets built
  on top.

## Security notes

- Passwords and the SSH identity key live only in the platform Keychain /
  Keystore, gated by biometrics or device passcode — never in MMKV, never
  as plaintext on disk.
- Host keys are verified TOFU-style: first connection shows the
  fingerprint for the user to accept
  (`app/components/sheets/TrustPromptSheet.tsx`), and a changed fingerprint
  on a later connection is flagged as a possible MITM/server-reinstall,
  exactly like OpenSSH's `known_hosts` behavior — connections are never
  silently trusted.

## Why HELP.md is in Russian

The person this project was built for asked for the APK build guide
"полностью на русском" — so `HELP.md` is written entirely in Russian by
request. This `README.md` stays in English as the project's primary
technical reference.
