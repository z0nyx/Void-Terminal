# Open Source Licenses

**Last updated: September 6, 2026**

## Table of Contents

1. [About This Page](#1-about-this-page)
2. [Core Framework](#2-core-framework)
3. [Native SSH / Local Shell](#3-native-ssh--local-shell)
4. [Terminal Rendering](#4-terminal-rendering)
5. [UI / Navigation / State](#5-ui--navigation--state)
6. [Storage / Security](#6-storage--security)
7. [Fonts](#7-fonts)
8. [Full Machine-Readable List](#8-full-machine-readable-list)

---

## 1. About This Page

Void is built on top of a number of open-source projects. This page
lists the significant ones and their licenses, in gratitude to their
authors and in compliance with the license terms that require
attribution. Void's own source code is MIT-licensed — see the
`LICENSE` file at the repository root.

This list is maintained by hand for the significant, directly-used
dependencies. For the complete, exact dependency tree (including
transitive dependencies) as of any given release, see
[`package.json`](../package.json) and the generated `package-lock.json`
in the repository, or Section 8 below.

## 2. Core Framework

| Library | License | Purpose |
|---|---|---|
| [React](https://github.com/facebook/react) | MIT | UI library |
| [React Native](https://github.com/facebook/react-native) | MIT | Native app runtime |
| [Expo](https://github.com/expo/expo) | MIT | Native tooling, prebuild, and first-party modules (`expo-font`, `expo-clipboard`, `expo-dev-client`, `expo-haptics`, `expo-local-authentication`, `expo-status-bar`) |
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | Type-checked source language |
| [babel-preset-expo](https://github.com/expo/expo) | MIT | Build tooling |

## 3. Native SSH / Local Shell

| Library | License | Purpose |
|---|---|---|
| [sshj](https://github.com/hierynomus/sshj) | Apache-2.0 | The SSH transport/protocol implementation underlying `modules/void-ssh` (Android) |

`modules/void-ssh` and `modules/void-local-shell` are hand-written Expo
native modules maintained as part of this repository (MIT-licensed,
same as the rest of the App's source); the table above credits the
third-party library they wrap.

## 4. Terminal Rendering

| Library | License | Purpose |
|---|---|---|
| [xterm.js / @xterm/headless](https://github.com/xtermjs/xterm.js) | MIT | VT100/256-color/alt-screen terminal buffer emulation |

## 5. UI / Navigation / State

| Library | License |
|---|---|
| [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | MIT |
| [@react-navigation/native](https://github.com/react-navigation/react-navigation) | MIT |
| [@react-navigation/bottom-tabs](https://github.com/react-navigation/react-navigation) | MIT |
| [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) | MIT |
| [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) | MIT |
| [react-native-worklets](https://github.com/software-mansion/react-native-worklets) | MIT |
| [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) | MIT |
| [react-native-screens](https://github.com/software-mansion/react-native-screens) | MIT |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | MIT |
| [zustand](https://github.com/pmndrs/zustand) | MIT |

## 6. Storage / Security

| Library | License |
|---|---|
| [react-native-keychain](https://github.com/oblador/react-native-keychain) | MIT |
| [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) | MIT |

## 7. Fonts

| Font | License | Purpose |
|---|---|---|
| Archivo | SIL Open Font License 1.1 | UI typeface |
| IBM Plex Mono | SIL Open Font License 1.1 | Terminal / monospace typeface |

Both are self-hosted as static weight files under `assets/fonts/` per
their license's redistribution terms.

## 8. Full Machine-Readable List

For tooling that needs a complete, exact license manifest (including
transitive dependencies) for a specific build, generate one from the
repository:

```bash
npx license-checker --production --json > licenses.json
```

---

*See also: [Terms of Service](./terms.md) · [Legal Notice](./legal-notice.md)*
