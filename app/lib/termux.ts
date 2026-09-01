import { Linking, Alert, Platform } from 'react-native';

/**
 * There is no public Android API for one app to attach to another app's
 * interactive PTY without root — Termux's own shell is only reachable
 * from inside Termux's own process. So "Termux shell" is a real hand-off
 * to the Termux app (launched via an `intent:` URI, which RN's Android
 * Linking implementation parses through `Intent.parseUri`), not an
 * embedded shell. That's the honest, correct scope: this is the same
 * pattern real terminal apps use for local-shell hand-off on Android.
 */
export async function openTermux(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const intentUrl =
    'intent://#Intent;package=com.termux;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end';

  try {
    const supported = await Linking.canOpenURL(intentUrl);
    if (supported) {
      await Linking.openURL(intentUrl);
      return;
    }
  } catch {
    // fall through to the "not installed" prompt below
  }

  Alert.alert(
    'Termux not found',
    'Void Terminal hands off to the Termux app for a local shell — it can\'t embed one directly (Android has no API for one app to attach to another app\'s shell without root). Install Termux from F-Droid (not the unmaintained Play Store build) to use this.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open F-Droid page', onPress: () => Linking.openURL('https://f-droid.org/packages/com.termux/') },
    ]
  );
}
