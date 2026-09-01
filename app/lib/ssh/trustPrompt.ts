import { Alert } from 'react-native';
import type { TrustPromptInfo } from './connectionManager';

/**
 * TODO: replace with a themed bottom sheet matching the rest of the app —
 * Alert.alert is the fastest correct way to get a real (not stubbed)
 * accept/reject decision in front of the user for this pass.
 */
export function alertTrustPrompt(info: TrustPromptInfo): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      info.changed ? 'Host key changed!' : 'Verify host identity',
      (info.changed
        ? 'This host presented a DIFFERENT key than last time. This can mean the server was reinstalled — or that the connection is being intercepted.\n\n'
        : "The authenticity of this host can't be established.\n\n") + `${info.keyType}\n${info.fingerprint}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: info.changed ? 'Trust anyway' : 'Trust & Connect',
          style: info.changed ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ]
    );
  });
}
