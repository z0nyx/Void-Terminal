# Data Deletion Policy

**Last updated: September 6, 2026**

## Table of Contents

1. [Scope](#1-scope)
2. [Deleting Personal Data](#2-deleting-personal-data)
3. [How to Request Deletion](#3-how-to-request-deletion)
4. [Timeframe for Fulfillment](#4-timeframe-for-fulfillment)
5. [Exceptions](#5-exceptions)
6. [Relationship to the Account Deletion Policy](#6-relationship-to-the-account-deletion-policy)

---

## 1. Scope

This policy explains how personal data connected with your use of Void
("the App") can be deleted. It complements the
[Privacy Policy](./privacy.md) and the
[Account Deletion Policy](./account-deletion.md), and is provided
separately to satisfy app-store and data-protection requirements for a
clearly documented deletion process.

## 2. Deleting Personal Data

As explained in the Privacy Policy, the Developer does not collect,
receive, or store any personal data on Developer-controlled
infrastructure. The only personal data that exists in connection with
the App (saved hosts, credentials, command history, preferences) is
stored exclusively on your own device, under your exclusive control.

As a result, deleting this data does not require submitting a request
to the Developer and waiting for it to be processed on a server — you
can delete it yourself, immediately, using the methods in Section 3.

## 3. How to Request Deletion

**You do not need to file a request with the Developer** to delete your
data — see Section 2. If you would prefer to do so anyway (for example,
to formally document that you did), or if you have a deletion question
this document doesn't answer, you may open a request via GitHub Issues:

**https://github.com/z0nyx/Void-Terminal/issues** (prefix your issue
title with `[Data Deletion]`)

To actually remove the data itself, use one of:

1. **In-App:** Settings → Manage Data → Delete All Data.
2. **Per-host:** swipe-to-delete (or the delete action) on an individual
   saved host, which removes only that host's details and credentials.
3. **Android system settings:** Settings → Apps → Void → Storage &
   cache → Clear storage.
4. **Uninstall the App.**

## 4. Timeframe for Fulfillment

Options 1, 2, and 3 above take effect immediately — there is no
processing queue, because deletion happens directly on your device with
no server round-trip involved.

If you file a GitHub Issue under Section 3 asking the Developer to
confirm or assist with something related to deletion, the Developer
will respond on a best-effort basis, consistent with an
individually-maintained open-source project — typically within a few
days, though no fixed SLA is guaranteed (see the
[Disclaimer](./disclaimer.md)).

## 5. Exceptions

The following are outside the scope of what this policy — or the
Developer — can delete, because they are not held by the Developer:

- **Server-side logs on hosts you connected to.** Any SSH server you
  connect to through the App may independently log connection
  attempts, source IPs, or session activity, under that server
  operator's own policies. Deleting App data does not affect those
  logs; requests to delete them must go to that server's operator.
- **Distribution-platform records.** Google Play and RuStore may retain
  install/purchase/review records under their own respective privacy
  policies, independent of the App's own data.
- **Data you voluntarily posted publicly** (for example, in a GitHub
  Issue or public comment) is not "App data" and is not covered by this
  policy; deleting or editing a public post is handled through GitHub's
  own tools.

## 6. Relationship to the Account Deletion Policy

Because Void has no user accounts, "data deletion" and "account
deletion" describe the same underlying action for this App — see the
[Account Deletion Policy](./account-deletion.md) for the step-by-step
walkthrough with more detail on what specifically gets removed.

---

*See also: [Privacy Policy](./privacy.md) · [Account Deletion Policy](./account-deletion.md)*
