# Privacy Policy

**Last updated: September 6, 2026**

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data We Collect](#2-data-we-collect)
3. [Data We Do Not Collect](#3-data-we-do-not-collect)
4. [Account Registration and Authentication](#4-account-registration-and-authentication)
5. [Third-Party Services](#5-third-party-services)
6. [Error Logs and Crash Reports](#6-error-logs-and-crash-reports)
7. [Analytics](#7-analytics)
8. [IP Address](#8-ip-address)
9. [Device Information](#9-device-information)
10. [Cookies](#10-cookies)
11. [Data Retention](#11-data-retention)
12. [Your Rights](#12-your-rights)
13. [Data Deletion Requests](#13-data-deletion-requests)
14. [Children's Privacy](#14-childrens-privacy)
15. [International Data Transfers](#15-international-data-transfers)
16. [Security](#16-security)
17. [Developer Contact](#17-developer-contact)
18. [Changes to This Policy](#18-changes-to-this-policy)

---

## 1. Introduction

This Privacy Policy explains how Void ("the App", "Void Terminal") handles
information when you use it. It applies to the App as distributed via
GitHub Releases and RuStore.

Void is a terminal client for connecting to remote servers over SSH and
for running a local shell session on your own device. It is developed
and maintained by an independent individual developer operating under
the name "zonyx" ("the Developer", "we", "us"). The Developer does not
operate any backend server for the App and does not receive, store, or
process any of your data on Developer-controlled infrastructure.

**The short version:** Void has no user accounts, no backend, no
analytics, and no advertising. Everything the App stores is stored
locally, on your device. The only network connections the App makes are
the SSH connections you configure, directly between your device and the
host you specify.

## 2. Data We Collect

The Developer does not collect any data. Nothing about your use of the
App is transmitted to the Developer or to any server operated by the
Developer, because no such server exists.

The App itself stores the following categories of information, entirely
on your device:

| Data | Where it's stored | Purpose |
|---|---|---|
| Saved host entries (address, port, username, display name, per-host settings) | Local app storage (MMKV) | Let you reconnect to a host without re-entering its details |
| SSH passwords and your SSH private key | Android Keystore, gated by biometrics/device passcode | Authenticate to hosts you connect to |
| Command history | Local app storage (MMKV) | Populate the in-app command history/autocomplete |
| App preferences (theme, font size, key-bar layout, toggles) | Local app storage (MMKV) | Remember your settings between sessions |

None of the above is sent anywhere except as strictly necessary to
perform the action you requested — for example, your password is sent
to the SSH host you are connecting to, as part of the standard SSH
authentication handshake, exactly as any SSH client would do.

## 3. Data We Do Not Collect

To be explicit about what the App does **not** do:

- No account registration, sign-up, sign-in, or user profile of any kind.
- No use of Firebase or any Firebase product (Analytics, Crashlytics,
  Cloud Messaging, Authentication, Firestore, or otherwise).
- No OAuth login of any kind (Discord, Google, Apple, GitHub, or other).
- No advertising SDKs and no ad identifiers (e.g., Android's Advertising
  ID) are read or transmitted.
- No analytics or telemetry SDKs are integrated into the App.
- No crash-reporting SDKs are integrated into the App.
- No contact list, media library, or other device content is accessed,
  beyond the storage access described in Section 9.
- No data is sold, rented, or shared with third parties, because no
  data is collected from you in the first place.

## 4. Account Registration and Authentication

Void does not support or require creating an account. There is no
username/password registration with the Developer, no email
verification, and no cloud-synced profile. The "authentication" that
occurs when you use biometrics or a device passcode inside the App is
local Android OS-level authentication used to unlock your saved
passwords/keys — it never involves the Developer and no biometric data
is collected, stored, or transmitted by the App.

## 5. Third-Party Services

The App does not integrate any third-party SDK that transmits data off
your device — no Firebase, no Discord, no crash reporting, no
analytics, no advertising network. The App's SSH and local-shell
functionality is built on open-source libraries that run entirely
on-device (see [`open-source.md`](./open-source.md)); none of them
communicate with a Developer-operated or third-party analytics backend.

If a future version of the App adds a third-party service that changes
this, this Policy will be updated first, per Section 18, before that
version is released.

## 6. Error Logs and Crash Reports

The App does not use a crash-reporting service. If the App crashes,
Android's own OS-level crash handling may apply (e.g., the standard
"App has stopped" dialog), which is a platform behavior outside the
App's control and outside the Developer's visibility — the Developer
does not receive a copy of any such crash log automatically.

Diagnostic messages shown inside the terminal view (for example,
connection-status or error messages) are rendered locally on your
device and are never transmitted anywhere.

If you choose to voluntarily report a bug via GitHub Issues (Section
17), any information you include in that report (screenshots, logs,
descriptions) is shared with the Developer only because you chose to
paste it into a public GitHub issue — treat that information as public
if you do.

## 7. Analytics

The App does not use any analytics service (no Google Analytics,
Firebase Analytics, Mixpanel, Amplitude, or similar). Your usage of the
App — which screens you open, which hosts you connect to, how long you
use it — is not tracked, measured, or reported to anyone.

## 8. IP Address

The Developer's infrastructure never sees your IP address, because the
App does not make any network request to Developer-operated
infrastructure.

When you connect to a host, your device's IP address is naturally
visible to that host as part of establishing a TCP/SSH connection —
this is inherent to how networking works and is true of any SSH
client, not something Void adds on top. That exchange is between your
device and the host you chose to connect to; the Developer is not a
party to it and has no visibility into it.

## 9. Device Information

The App does not collect or transmit device information (model, OS
version, identifiers, etc.) to the Developer or any third party.

Distribution platforms (Google Play, RuStore) may independently collect
limited technical information (such as device model and OS version) as
part of operating their store and delivering updates — that collection
is governed by the respective platform's own privacy policy, not this
one.

## 10. Cookies

Void does not currently have a web version, and the mobile app does not
use cookies or any similar tracking technology. This section is
included for completeness and will be replaced with a full Cookie
Policy if a web version is ever released — see
[`cookie-policy.md`](./cookie-policy.md).

## 11. Data Retention

Because all data described in Section 2 is stored only on your device,
it is retained for as long as the App remains installed and you have
not cleared its data. There is no Developer-side copy with a separate
retention schedule, because no Developer-side copy exists.

You control retention directly:

- Deleting a saved host removes that host's stored details and any
  associated password/key from the Android Keystore.
- Clearing the App's storage/data from Android's system Settings, or
  uninstalling the App, removes all data described in Section 2
  immediately.

## 12. Your Rights

Depending on where you live, you may have rights under data protection
law (e.g., the EU/UK GDPR, or the California Consumer Privacy Act /
CPRA) including the right to access, correct, export, or delete your
data, and the right to object to or restrict certain processing.

Because the Developer does not collect, hold, or process any personal
data on Developer-controlled infrastructure, there is no Developer-held
data for these rights to act on. Any personal data that exists in
connection with your use of the App (Section 2) is already exclusively
in your own possession, on your own device, and you can exercise full
control over it — view, export, or delete it — at any time, directly
in the App or via Android's system Settings, without needing to submit
a request to anyone.

If you believe this is not the case, or have any other privacy
question, contact the Developer using Section 17.

## 13. Data Deletion Requests

See [`data-deletion.md`](./data-deletion.md) for the full, dedicated
data-deletion policy. In short: since no personal data is held by the
Developer, there is nothing on the Developer's side to delete, and
on-device deletion is immediate and fully within your control (Section
11).

## 14. Children's Privacy

Void is not directed at children and is not designed to collect
personal data from anyone, regardless of age. The App does not knowingly
collect personal data from children, because it does not collect
personal data from anyone. If you believe a child has provided personal
data through the App in some way not anticipated by this Policy, contact
the Developer (Section 17) and it will be addressed.

## 15. International Data Transfers

The App does not transfer your personal data anywhere, because the
Developer does not receive it. When you connect to a remote host of
your choosing, any data exchanged over that SSH session travels between
your device and that host, wherever it is located — that transfer is
initiated and controlled by you, not by the Developer.

## 16. Security

Passwords and private keys are stored using the Android Keystore system
and are gated behind biometric authentication or your device's
passcode, consistent with Android platform security best practices.
Host-key verification uses Trust-On-First-Use (TOFU), the same model
used by OpenSSH's `known_hosts` — the App warns you if a host's key
changes between connections, which can indicate a server reinstall or a
potential man-in-the-middle attack.

No method of storage or transmission is 100% secure, and the Developer
cannot guarantee absolute security. You are responsible for keeping
your device, its lock screen, and your SSH credentials secure.

## 17. Developer Contact

For questions about this Privacy Policy, or any privacy-related request,
please open an issue on the App's GitHub repository:

**https://github.com/z0nyx/Void-Terminal/issues**

Please label or title your issue so it's clearly a privacy-related
matter (for example, prefix it with `[Privacy]`).

## 18. Changes to This Policy

This Policy may be updated from time to time — for example, if a future
version of the App adds a feature that changes how data is handled. The
"Last updated" date at the top of this document reflects the most
recent revision. Material changes will be noted in the App's release
notes on GitHub. Continued use of the App after an update constitutes
acceptance of the revised Policy.

---

*See also: [Terms of Service](./terms.md) · [Data Deletion Policy](./data-deletion.md) · [Legal Notice](./legal-notice.md)*
