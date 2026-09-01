# modules/void-ssh

A hand-written Expo native module giving Void Terminal a real interactive
SSH shell with a raw byte stream — not a community package.

## Why this exists instead of an npm package

The only React Native SSH package, `react-native-ssh-sftp`, is abandoned
and pins `peerDependencies.react-native` to `^0.54.0` (from ~2018) — `npm
install` refuses it outright against this app's React Native 0.86 / New
Architecture (`npm error ERESOLVE ... peer react-native@"^0.54.0"`). Rather
than force-install an unmaintained package against an architecture it was
never built for, this module wraps the same underlying libraries that
package used, directly:

- **Android**: [sshj](https://github.com/hierynomus/sshj) (actively
  maintained, pure Kotlin/Java-friendly, gives a real `InputStream`/
  `OutputStream` on the shell channel — no line-buffering).
- **iOS**: [NMSSH](https://github.com/NMSSH/NMSSH) (wraps libssh2), via
  CocoaPods, called from Swift.

## API surface (`src/VoidSshModule.ts`)

`connect(host, port, username)` → opens the transport and negotiates the
host key **without authenticating** — the caller must inspect
`hostKeyFingerprintSha256` against its own trust store and call
`verifyHostKey(id, accepted)` before auth or `startShell` will do
anything. This is the TOFU host-key check (app/lib/ssh/connectionManager.ts
+ hostKeyStore.ts own it), equivalent to OpenSSH's "authenticity of host
... can't be established" prompt — never skipped, never auto-accepted.

`authenticatePassword` / `authenticateKey` → standard SSH auth.
`startShell(id, cols, rows)` → allocates a PTY, starts the interactive
shell, and `onData` events begin firing raw bytes (base64-encoded) from
then on. `write` / `resize` / `disconnect` are self-explanatory.
`generateEd25519KeyPair(comment)` → the app's single identity key, in
real OpenSSH private-key format (see below).

## Known risks — read before trusting this blindly

This was written in a sandbox with **no Xcode and no Android SDK**, so
none of it has been compiled or run. Ranked by how bad a silent failure
would be:

1. **OpenSSH private-key encoding**
   (`encodeOpenSshEd25519PrivateKey` in both the Kotlin and Swift files).
   Hand-rolled per OpenSSH's `PROTOCOL.key` format since no available
   library does OpenSSH-format *writing* for Ed25519 without pulling in a
   second full SSH stack (Apache Mina SSHD) just for this. Written
   carefully field-by-field, but a subtly wrong byte and the key would
   either fail to parse or — worse — silently produce a key sshj/NMSSH
   happen to still parse but that a real `ssh-keygen`/OpenSSH considers
   malformed. **Verify with `ssh-keygen -y -f <exported key>` and an
   actual connection before relying on KEY auth.**
2. **NMSSHChannel method names** (iOS `startShell`/`requestPty`/
   `requestSizeWidth:height:`) — written against NMSSH's documented API
   from memory; if slightly off for the exact version CocoaPods resolves,
   Xcode will show a clear "no member" compile error, not a silent bug.
   Low risk precisely because it fails loudly.
3. **iOS byte fidelity** — `NMSSHChannelDelegate` hands back an already
   UTF-8-decoded `NSString`, not raw bytes. Re-encoded to UTF-8 bytes for
   parity with Android's `DataEvent.base64`, but a multi-byte character
   split exactly across two reads could rarely render as U+FFFD. Accepted
   as a known v1 limitation rather than pulling raw bytes off
   `libssh2_channel_read` directly (doable, just more surface to get
   wrong for a rare edge case).
4. **`resize()`'s Android reflection call** — sshj's `Session` resize
   method name wasn't certain enough to hardcode, so it's called via
   reflection inside a try/catch. Worst case: a resize silently no-ops
   instead of crashing.

## First thing to do with this module on a real machine

```bash
npx expo prebuild
npx expo run:android   # and separately: npx expo run:ios
```

Connect to a disposable test SSH server (a throwaway VM or
`docker run -p 2222:22 linuxserver/openssh-server`) before building
anything else on top — this is the one piece of the whole app that
genuinely could not be verified without real device/emulator access.
