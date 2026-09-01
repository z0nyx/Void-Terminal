import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { AppText } from '../ui/Text';
import { IconSearch } from '../ui/icons';
import { useTheme } from '../../lib/theme/useTheme';
import { SNIPPETS } from '../../lib/demoShell';

export interface SnippetPaletteHandle {
  open: () => void;
}

export const SnippetPaletteSheet = forwardRef<SnippetPaletteHandle, { onRun: (cmd: string) => void }>(({ onRun }, ref) => {
  const theme = useTheme();
  const c = theme.colors;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    open: () => {
      setQuery('');
      sheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />,
    []
  );

  const q = query.toLowerCase();
  const filtered = SNIPPETS.filter((s) => !q || (s.cmd + s.desc).toLowerCase().includes(q));

  return (
    <BottomSheetModal ref={sheetRef} backgroundStyle={{ backgroundColor: c.bg }} handleIndicatorStyle={{ backgroundColor: c.line2 }} backdropComponent={renderBackdrop} enableDynamicSizing>
      <BottomSheetView style={styles.sheet}>
        <View style={styles.headerRow}>
          <AppText weight="extraBold" size={17} color={c.fg} letterSpacing={-0.3}>SNIPPETS</AppText>
          <Pressable onPress={() => sheetRef.current?.dismiss()}>
            <AppText weight="semiBold" mono size={11} color={c.dim}>CLOSE</AppText>
          </Pressable>
        </View>

        <View style={[styles.searchRow, { backgroundColor: c.field, borderColor: c.line2 }]}>
          <IconSearch />
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="filter…"
            placeholderTextColor="#A39382"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: c.fg, fontFamily: theme.fonts.mono.regular }]}
          />
        </View>

        {filtered.map((s) => (
          <Pressable
            key={s.cmd}
            onPress={() => { sheetRef.current?.dismiss(); onRun(s.cmd); }}
            style={[styles.row, { borderBottomColor: c.line }]}
          >
            <View style={{ minWidth: 0, flex: 1 }}>
              <AppText weight="medium" mono size={13} color={c.fg} numberOfLines={1}>{s.cmd}</AppText>
              <AppText weight="regular" size={11.5} color={c.dim} style={{ marginTop: 3 }}>{s.desc}</AppText>
            </View>
            <AppText weight="semiBold" mono size={9.5} color={c.faint} letterSpacing={1}>{s.tag}</AppText>
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, paddingHorizontal: 12, marginBottom: 14 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 13 },
  row: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
