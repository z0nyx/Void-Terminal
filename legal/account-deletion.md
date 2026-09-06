# Account Deletion Policy

**Last updated: September 6, 2026**

## Table of Contents

1. [Does Void Have Accounts?](#1-does-void-have-accounts)
2. [How to "Delete Your Account"](#2-how-to-delete-your-account)
3. [What Gets Deleted](#3-what-gets-deleted)
4. [What May Remain After Deletion](#4-what-may-remain-after-deletion)
5. [Timeframe](#5-timeframe)
6. [What Happens After Deletion](#6-what-happens-after-deletion)
7. [Contact](#7-contact)

---

## 1. Does Void Have Accounts?

No. Void does not have user registration, sign-in, or any
Developer-hosted account system. There is no username/password, email
verification, or profile stored on any server, because Void has no
server. This document exists to satisfy app-store requirements that
apps provide a clear account/data deletion path, and to explain plainly
what "deleting your account" means for an app that never created one.

## 2. How to "Delete Your Account"

Since there is no account to delete on any server, "deleting your
account" for Void means deleting the App's local data on your device.
You can do this in either of two ways, entirely without contacting the
Developer:

**Option A — From within the App:**
Open Settings → Manage Data → Delete All Data (removes all saved
hosts, credentials, and history, and resets preferences to default).

**Option B — From Android system settings:**
Settings → Apps → Void → Storage & cache → Clear storage. This removes
everything the App has stored, equivalent to a fresh install.

Uninstalling the App entirely achieves the same result.

## 3. What Gets Deleted

Both options above delete, immediately and completely:

- Every saved host (address, username, port, display name, per-host
  settings);
- Every stored password and SSH private key held in the Android
  Keystore on behalf of the App;
- Command history;
- App preferences (theme, font size, key-bar layout, toggles).

## 4. What May Remain After Deletion

- **Nothing on the Developer's side**, because the Developer never held
  a copy of this data to begin with.
- **The remote hosts you connected to** retain whatever server-side
  logs or records they independently keep of your SSH connections (for
  example, `sshd` auth logs on that server). Those records are
  controlled by the operator of that host, not by the Developer or the
  App, and are unaffected by deleting the App's local data.
- **Distribution-platform records** (Google Play / RuStore) — your
  install history and any data those platforms independently collect
  are governed by their own policies and are not affected by deleting
  the App's data.

## 5. Timeframe

Deletion via Option A or Option B above is immediate — there is no
processing delay, because no server-side deletion request needs to be
routed anywhere. This differs from typical account-based apps, where a
deletion request must be relayed to a backend within a stated number of
days; Void has no such backend to relay a request to.

## 6. What Happens After Deletion

The App returns to its first-launch state. You can continue using it
immediately by adding hosts again, or uninstall it entirely — both are
equally valid, since no account persists either way.

## 7. Contact

If you have any trouble locating these controls, or a question this
document doesn't answer, open an issue at:
**https://github.com/z0nyx/Void-Terminal/issues**

---

*See also: [Data Deletion Policy](./data-deletion.md) · [Privacy Policy](./privacy.md)*
