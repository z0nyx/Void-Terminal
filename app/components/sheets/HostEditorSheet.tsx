import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { AppText } from '../ui/Text';
import { IconLock, IconTrash } from '../ui/icons';
import { useTheme } from '../../lib/theme/useTheme';
import { useHostsStore, type Host, type AuthMethod } from '../../lib/storage/hostsStore';
import * as keychain from '../../lib/storage/keychain';

export interface HostEditorHandle {
  openNew: () => void;
  openEdit: (host: Host) => void;
}

export const HostEditorSheet = forwardRef<HostEditorHandle>((_, ref) => {
  const theme = useTheme();
  const c = theme.colors;
  const sheetRef = useRef<BottomSheetModal>(null);
  const { add, update, remove } = useHostsStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [password, setPassword] = useState('');
  const [passShow, setPassShow] = useState(false);
  const [auth, setAuth] = useState<AuthMethod>('key');
  const [mosh, setMosh] = useState(true);
  const [savePass, setSavePass] = useState(true);

  const reset = () => {
    setEditingId(null);
    setName('');
    setAddr('');
    setPassword('');
    setPassShow(false);
    setAuth('key');
    setMosh(true);
    setSavePass(true);
  };

  useImperativeHandle(ref, () => ({
    openNew: () => {
      reset();
      sheetRef.current?.present();
    },
    openEdit: async (host: Host) => {
      setEditingId(host.id);
      setName(host.name);
      setAddr(host.addr);
      setAuth(host.authMethod);
      setMosh(host.mosh);
      setSavePass(host.savePassword);
      if (host.authMethod === 'password' && host.savePassword) {
        const pw = await keychain.getPassword(host.id).catch(() => null);
        setPassword(pw ?? '');
      } else {
        setPassword('');
      }
      sheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />
    ),
    []
  );

  const isEditing = editingId !== null;

  const save = () => {
    const trimmedName = name.trim() || (addr.includes('@') ? addr.split('@').pop()!.split(':')[0] : 'new-host');
    const trimmedAddr = addr.trim() || 'user@host:22';
    const patch = {
      name: trimmedName,
      addr: trimmedAddr,
      authMethod: auth,
      mosh,
      savePassword: savePass,
      icon: 'server' as const,
    };
    if (isEditing) {
      update(editingId!, patch, auth === 'password' ? password : undefined);
    } else {
      add(patch, auth === 'password' ? password : undefined);
    }
    sheetRef.current?.dismiss();
  };

  const doDelete = () => {
    if (editingId) remove(editingId);
    sheetRef.current?.dismiss();
  };

  const field = useMemo(
    () => ({
      backgroundColor: c.field,
      borderColor: c.line2,
      color: c.fg,
    }),
    [c]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      backgroundStyle={{ backgroundColor: c.bg }}
      handleIndicatorStyle={{ backgroundColor: c.line2 }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
    >
      <BottomSheetView style={[styles.sheet, { borderTopColor: c.fg }]}>
        <View style={styles.headerRow}>
          <AppText weight="extraBold" size={17} color={c.fg} letterSpacing={-0.3}>
            {isEditing ? 'EDIT CONNECTION' : 'NEW CONNECTION'}
          </AppText>
          <Pressable onPress={() => sheetRef.current?.dismiss()}>
            <AppText weight="semiBold" mono size={11} color={c.dim}>
              CANCEL
            </AppText>
          </Pressable>
        </View>

        <Label c={c}>TITLE</Label>
        <BottomSheetTextInput
          value={name}
          onChangeText={setName}
          placeholder="edge-01"
          placeholderTextColor={c.dim2}
          style={[styles.input, field, { fontFamily: theme.fonts.display.semiBold, fontSize: 15 }]}
        />

        <Label c={c}>ADDRESS</Label>
        <BottomSheetTextInput
          value={addr}
          onChangeText={setAddr}
          placeholder="user@host:22"
          placeholderTextColor={c.dim2}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, field, { fontFamily: theme.fonts.mono.regular, fontSize: 14 }]}
        />

        <Label c={c}>AUTH</Label>
        <View style={[styles.segment, { borderColor: c.line2 }]}>
          {(['key', 'password'] as AuthMethod[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setAuth(m)}
              style={[styles.segmentItem, { backgroundColor: auth === m ? c.acc : 'transparent' }]}
            >
              <AppText weight="semiBold" mono size={12} color={auth === m ? c.accFg : c.fg}>
                {m === 'key' ? 'KEY · id_ed25519' : 'PASSWORD'}
              </AppText>
            </Pressable>
          ))}
        </View>

        {auth === 'password' && (
          <>
            <Label c={c}>PASSWORD</Label>
            <View style={[styles.passRow, field]}>
              <IconLock size={15} color="#A39382" />
              <BottomSheetTextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={c.dim2}
                secureTextEntry={!passShow}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.passInput, { color: c.fg, fontFamily: theme.fonts.mono.regular }]}
              />
              <Pressable onPress={() => setPassShow((v) => !v)}>
                <AppText weight="semiBold" mono size={9.5} color={c.acc} letterSpacing={1}>
                  {passShow ? 'HIDE' : 'SHOW'}
                </AppText>
              </Pressable>
            </View>
            <Pressable onPress={() => setSavePass((v) => !v)} style={styles.checkRow}>
              <View
                style={[
                  styles.checkbox,
                  savePass
                    ? { backgroundColor: c.acc }
                    : { borderWidth: 1.5, borderColor: c.dim2 },
                ]}
              />
              <AppText weight="regular" size={12.5} color={c.out}>
                Store in the keychain, unlock with Face ID
              </AppText>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => setMosh((v) => !v)} style={[styles.moshRow, { borderColor: c.line }]}>
          <AppText weight="semiBold" size={13.5} color={c.fg}>
            Keep alive with mosh
          </AppText>
          <View style={[styles.toggleTrack, { backgroundColor: mosh ? c.acc : c.key, justifyContent: mosh ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.toggleKnob, { backgroundColor: mosh ? c.bg : c.dim2 }]} />
          </View>
        </Pressable>

        <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: c.acc }]}>
          <AppText weight="semiBold" mono size={12} color={c.bg} letterSpacing={1}>
            {isEditing ? 'SAVE CHANGES' : 'SAVE & CONNECT'}
          </AppText>
        </Pressable>

        {isEditing && (
          <Pressable onPress={doDelete} style={[styles.deleteBtn, { borderColor: c.line2 }]}>
            <IconTrash size={15} color={c.out} />
            <AppText weight="semiBold" mono size={12} color={c.out} letterSpacing={1}>
              DELETE CONNECTION
            </AppText>
          </Pressable>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function Label({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <AppText weight="semiBold" mono size={9.5} color={c.dim} letterSpacing={1.2} style={{ marginBottom: 6 }}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 20, paddingBottom: 34, paddingTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  input: { width: '100%', borderWidth: 1, padding: 13, marginBottom: 16 },
  segment: { flexDirection: 'row', borderWidth: 1, marginBottom: 16 },
  segmentItem: { flex: 1, padding: 13, alignItems: 'center' },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, paddingHorizontal: 13, marginBottom: 16 },
  passInput: { flex: 1, paddingVertical: 13, fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  checkbox: { width: 18, height: 18 },
  moshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 18,
  },
  toggleTrack: { width: 44, height: 24, padding: 3, flexDirection: 'row', alignItems: 'center' },
  toggleKnob: { width: 18, height: 18 },
  saveBtn: { padding: 16, alignItems: 'center' },
  deleteBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 15, marginTop: 10 },
});
