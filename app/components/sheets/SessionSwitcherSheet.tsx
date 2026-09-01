import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { AppText } from '../ui/Text';
import { useTheme } from '../../lib/theme/useTheme';
import { useSessionStore } from '../../lib/sessionStore';

export interface SessionSwitcherHandle {
  open: () => void;
}

export const SessionSwitcherSheet = forwardRef<SessionSwitcherHandle>((_, ref) => {
  const theme = useTheme();
  const c = theme.colors;
  const sheetRef = useRef<BottomSheetModal>(null);
  const { tabs, setActive, killTab, addTabFromActive } = useSessionStore();

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />,
    []
  );

  return (
    <BottomSheetModal ref={sheetRef} backgroundStyle={{ backgroundColor: c.bg }} handleIndicatorStyle={{ backgroundColor: c.line2 }} backdropComponent={renderBackdrop} enableDynamicSizing>
      <BottomSheetView style={styles.sheet}>
        <View style={styles.headerRow}>
          <AppText weight="extraBold" size={17} color={c.fg} letterSpacing={-0.3}>SESSIONS</AppText>
          <Pressable onPress={() => sheetRef.current?.dismiss()}>
            <AppText weight="semiBold" mono size={11} color={c.dim}>CLOSE</AppText>
          </Pressable>
        </View>

        {tabs.map((t, i) => (
          <Pressable
            key={t.id}
            onPress={() => { setActive(i); sheetRef.current?.dismiss(); }}
            style={[styles.row, { borderColor: c.line2 }]}
          >
            <View style={{ minWidth: 0, flex: 1 }}>
              <AppText weight="semiBold" size={14.5} color={c.fg}>{t.hostName}</AppText>
              <AppText weight="regular" mono size={11} color={c.dim} numberOfLines={1} style={{ marginTop: 4 }}>
                {'$ ' + t.lastCommand}
              </AppText>
            </View>
            <Pressable hitSlop={8} onPress={() => killTab(i)}>
              <AppText weight="semiBold" size={12} color={c.faint}>✕</AppText>
            </Pressable>
          </Pressable>
        ))}

        <Pressable onPress={() => { addTabFromActive(); sheetRef.current?.dismiss(); }} style={[styles.newBtn, { backgroundColor: c.acc }]}>
          <AppText weight="semiBold" mono size={12} color={c.bg} letterSpacing={1}>+ NEW WINDOW</AppText>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  row: { borderWidth: 1, padding: 13, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newBtn: { padding: 14, alignItems: 'center' },
});
