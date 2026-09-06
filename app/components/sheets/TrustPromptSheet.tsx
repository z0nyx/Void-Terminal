import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { AppText } from '../ui/Text';
import { IconLock } from '../ui/icons';
import { useTheme } from '../../lib/theme/useTheme';
import type { TrustPromptInfo } from '../../lib/ssh/connectionManager';

export interface TrustPromptHandle {
  open: (info: TrustPromptInfo) => Promise<boolean>;
}

const EMPTY_INFO: TrustPromptInfo = { fingerprint: '', keyType: '', changed: false };

/**
 * Themed replacement for the OS-native Alert.alert TOFU prompt (see
 * app/lib/ssh/trustPrompt.ts) — same accept/reject decision, dressed to
 * match the rest of the app instead of popping a stock system dialog.
 */
export const TrustPromptSheet = forwardRef<TrustPromptHandle>((_, ref) => {
  const theme = useTheme();
  const c = theme.colors;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [info, setInfo] = useState<TrustPromptInfo>(EMPTY_INFO);
  const resolveRef = useRef<((accepted: boolean) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    open: (nextInfo) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setInfo(nextInfo);
        sheetRef.current?.present();
      }),
  }));

  const respond = (accepted: boolean) => {
    sheetRef.current?.dismiss();
    resolveRef.current?.(accepted);
    resolveRef.current = null;
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />,
    []
  );

  const changed = info.changed;

  return (
    <BottomSheetModal
      ref={sheetRef}
      backgroundStyle={{ backgroundColor: c.bg }}
      handleIndicatorStyle={{ backgroundColor: c.line2 }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
      onDismiss={() => {
        // Swipe/backdrop dismiss without an explicit button — treat like Cancel.
        resolveRef.current?.(false);
        resolveRef.current = null;
      }}
    >
      <BottomSheetView style={styles.sheet}>
        {changed && (
          <View style={[styles.warnBanner, { backgroundColor: c.acc }]}>
            <AppText weight="semiBold" mono size={11} color={c.bg} letterSpacing={0.6}>HOST KEY CHANGED</AppText>
          </View>
        )}

        <View style={styles.headerRow}>
          <IconLock size={16} color={c.dim} />
          <AppText weight="extraBold" size={17} color={c.fg} letterSpacing={-0.3}>
            {changed ? 'VERIFY BEFORE TRUSTING' : 'VERIFY HOST IDENTITY'}
          </AppText>
        </View>

        <AppText weight="regular" size={13} color={c.out} style={styles.body}>
          {changed
            ? 'This host presented a DIFFERENT key than last time. This can mean the server was reinstalled — or that the connection is being intercepted.'
            : "The authenticity of this host can't be established yet — this is the first time you're connecting."}
        </AppText>

        <View style={[styles.fpBox, { backgroundColor: c.field, borderColor: c.line2 }]}>
          <AppText weight="semiBold" mono size={10} color={c.dim} letterSpacing={1}>{info.keyType.toUpperCase()}</AppText>
          <AppText weight="medium" mono size={13} color={c.fg} style={{ marginTop: 6 }} selectable>
            {info.fingerprint}
          </AppText>
        </View>

        <View style={styles.btnRow}>
          <Pressable onPress={() => respond(false)} style={[styles.btn, styles.btnOutline, { borderColor: c.line2 }]}>
            <AppText weight="semiBold" mono size={12} color={c.fg} letterSpacing={1}>CANCEL</AppText>
          </Pressable>
          <Pressable onPress={() => respond(true)} style={[styles.btn, { backgroundColor: c.acc }]}>
            <AppText weight="semiBold" mono size={12} color={c.accFg} letterSpacing={1}>
              {changed ? 'TRUST ANYWAY' : 'TRUST & CONNECT'}
            </AppText>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 4 },
  warnBanner: { paddingVertical: 8, alignItems: 'center', marginHorizontal: -20, marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { marginTop: 10, lineHeight: 19 },
  fpBox: { borderWidth: 1, padding: 13, marginTop: 16, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { borderWidth: 1 },
});
