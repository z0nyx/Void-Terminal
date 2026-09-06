# modules/void-local-shell

A hand-written Expo native module giving Void Terminal a real local shell,
embedded in the app — not a hand-off to Termux (the previous approach,
`app/lib/termux.ts`, now removed).

## Why not just launch Termux?

That's the standard workaround, and it's what the app did before: there is
no public Android API for one app to attach to another app's interactive
PTY without root, so a "local shell" either means handing off via an
`intent:` URI, or forking a shell **inside your own process's sandbox**,
which any app is allowed to do — that's exactly what Termux itself does
internally. This module does the latter directly, Android-only.

## How it works

Android's bionic libc has no `forkpty(3)` convenience wrapper (that's a
glibc-only addition), so `android/src/main/cpp/local_pty.c` hand-rolls the
same sequence: open `/dev/ptmx`, `grantpt`/`unlockpt`/`ptsname_r`, `fork()`,
and in the child — `setsid()`, open the pts slave, `TIOCSCTTY`, `dup2` onto
fd 0/1/2, `execve("/system/bin/sh", ...)`. The parent gets back the PTY
master fd, wraps it with `ParcelFileDescriptor.adoptFd` in Kotlin, and reads
it on a background thread exactly like `modules/void-ssh` reads its SSH
channel — base64-encoded `onData` events over the same wire shape
(`{ sessionId, base64 }` instead of `{ connectionId, base64 }`), so
`app/lib/localShell/localShellManager.ts` is a near copy of
`app/lib/ssh/connectionManager.ts` and Session.tsx / TerminalGrid.tsx treat
both kinds of tab identically.

**Safety-critical detail**: everything JNI-related (converting Java
strings/arrays to C strings) happens *before* `fork()`. After fork, the
child is a single thread cloned out of a multi-threaded JVM process — only
plain POSIX/libc calls are safe there, no `JNIEnv` calls. See the comment
at the top of `local_pty.c`.

## What you get, honestly

A real interactive shell — job control, full-screen apps (`vim`, `less`,
`top`), a genuine PTY with correct `SIGWINCH`/resize — but only
`/system/bin/sh` (toybox/mksh depending on AOSP version) and the utilities
built into AOSP. No `apt`/`pkg`, no arbitrary Linux userland — that's what
Termux bootstraps into its own app-private storage, and this module
doesn't attempt to replicate that. Home directory is the app's own
`filesDir` (the only writable location without extra permissions).

## Known risks — read before trusting this blindly

Written in a sandbox with **no Android NDK/CMake toolchain available**, so
none of the native code has been compiled or run. First thing to do on a
real machine:

```bash
npx expo prebuild
npx expo run:android
```

Open the "Local shell" row on the Hosts tab and confirm: a prompt appears,
`ls`/`echo`/`pwd` work, arrow-key history and Ctrl-C (SIGINT) work, and
closing the tab actually reaps the child (`adb shell ps | grep sh` should
not accumulate zombies across repeated opens).
