import React from 'react';
import { View, Pressable, ScrollView, Linking, Share, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/Text';
import {
  IconThemeHalf,
  IconReplay,
  IconTypeSize,
  IconKeyBar,
  IconKey,
  IconStorageSection,
  IconPhone,
  IconSupport,
  IconExternal,
  IconMail,
  IconGithub,
  IconTelegram,
  IconInstagram,
} from '../components/ui/icons';
import { useTheme } from '../lib/theme/useTheme';
import { useSettingsStore, type KeyBarOptions } from '../lib/storage/settingsStore';
import * as keychain from '../lib/storage/keychain';

const SUPPORT_LINKS = [
  { key: 'mail', Icon: IconMail, label: 'Email', value: 'help@void.sh', url: 'mailto:help@void.sh' },
  { key: 'github', Icon: IconGithub, label: 'GitHub', value: 'Issues and changelog', url: 'https://github.com/void-sh/terminal' },
  { key: 'telegram', Icon: IconTelegram, label: 'Telegram', value: '@voidterminal', url: 'https://t.me/voidterminal' },
  { key: 'instagram', Icon: IconInstagram, label: 'Instagram', value: '@void.terminal', url: 'https://instagram.com/void.terminal' },
] as const;

const KEY_BAR_ROWS: { key: keyof KeyBarOptions; name: string; desc: string }[] = [
  { key: 'stickyModifiers', name: 'Sticky modifiers', desc: 'Tap latches for one key, double-tap locks' },
  { key: 'haptics', name: 'Haptics on key bar', desc: 'Short tick on every accessory key' },
  { key: 'swipeRows', name: 'Swipe rows', desc: 'Swipe the bar sideways to change row' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { theme: themeName, setTheme, fontSize, fontUp, fontDown, keyBar, toggleKeyBarOption, setWelcomed } = useSettingsStore();
  const [fingerprint, setFingerprint] = React.useState<string | null>(null);

  const exportKey = async () => {
    try {
      const identity = await keychain.getOrCreateIdentityKey();
      setFingerprint(identity.fingerprintSha256);
      await Share.share({ message: identity.publicKeySsh });
    } catch (e: any) {
      Alert.alert('Could not export key', e?.message ?? String(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppText weight="extraBold" size={20} color={c.fg} letterSpacing={-0.4} style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14 }}>
        SETTINGS
      </AppText>
      <View style={[styles.rule, { backgroundColor: c.fg }]} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 + insets.bottom }}>
        <SectionHeader Icon={IconThemeHalf} label="THEME" c={c} />
        <View style={[styles.segment, { borderColor: c.line2 }]}>
          <Pressable onPress={() => setTheme('dark')} style={[styles.segmentItem, { backgroundColor: themeName === 'dark' ? c.acc : 'transparent' }]}>
            <AppText weight="semiBold" mono size={12} letterSpacing={0.6} color={themeName === 'dark' ? c.accFg : c.fg}>BLACK</AppText>
          </Pressable>
          <Pressable onPress={() => setTheme('light')} style={[styles.segmentItem, { backgroundColor: themeName === 'light' ? c.acc : 'transparent' }]}>
            <AppText weight="semiBold" mono size={12} letterSpacing={0.6} color={themeName === 'light' ? c.accFg : c.fg}>WHITE</AppText>
          </Pressable>
        </View>
        <AppText weight="regular" size={12.5} color={c.dim} style={{ marginBottom: 26, lineHeight: 19 }}>
          Charcoal for night shifts, milk for sunlight. Taupe carries the accent on dark, mocha on light.
        </AppText>

        <Pressable onPress={() => setWelcomed(false)} style={[styles.card, { borderColor: c.line2, marginBottom: 26 }]}>
          <View>
            <AppText weight="semiBold" size={14} color={c.fg}>Show welcome again</AppText>
            <AppText weight="regular" size={11.5} color={c.dim} style={{ marginTop: 3 }}>Normally only on first launch</AppText>
          </View>
          <IconReplay color={c.acc} />
        </Pressable>

        <SectionHeader Icon={IconTypeSize} label="TYPE SIZE" c={c} />
        <View style={styles.fontRow}>
          <Pressable onPress={fontDown} style={[styles.fontBtn, { backgroundColor: c.key }]}>
            <AppText weight="semiBold" mono size={15} color={c.fg}>A−</AppText>
          </Pressable>
          <Pressable onPress={fontUp} style={[styles.fontBtn, { backgroundColor: c.key }]}>
            <AppText weight="semiBold" mono size={15} color={c.fg}>A+</AppText>
          </Pressable>
          <AppText weight="regular" mono size={12} color={c.dim}>{fontSize}px · pinch in the session works too</AppText>
        </View>
        <AppText weight="regular" size={12.5} color={c.dim} style={{ marginBottom: 26, lineHeight: 19 }}>
          Size changes reflow the buffer instead of scaling it, so lines never run off the right edge.
        </AppText>

        <SectionHeader Icon={IconKeyBar} label="KEY BAR" c={c} />
        {KEY_BAR_ROWS.map((row) => {
          const on = keyBar[row.key];
          return (
            <Pressable key={row.key} onPress={() => toggleKeyBarOption(row.key)} style={[styles.toggleRow, { borderBottomColor: c.line }]}>
              <View>
                <AppText weight="semiBold" size={14} color={c.fg}>{row.name}</AppText>
                <AppText weight="regular" size={11.5} color={c.dim} style={{ marginTop: 3 }}>{row.desc}</AppText>
              </View>
              <View style={[styles.toggleTrack, { backgroundColor: on ? c.acc : c.key, justifyContent: on ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.toggleKnob, { backgroundColor: on ? c.accFg : c.dim2 }]} />
              </View>
            </Pressable>
          );
        })}

        <SectionHeader Icon={IconKey} label="KEYS" c={c} style={{ marginTop: 26 }} />
        <Pressable onPress={exportKey} style={[styles.card, { borderColor: c.line2 }]}>
          <View>
            <AppText weight="semiBold" size={14} color={c.fg}>id_ed25519</AppText>
            <AppText weight="regular" mono size={11} color={c.dim} style={{ marginTop: 4 }}>
              {fingerprint ?? 'Generated on first KEY-auth connection'}
            </AppText>
          </View>
          <AppText weight="semiBold" mono size={11} color={c.acc}>EXPORT</AppText>
        </Pressable>

        <SectionHeader Icon={IconStorageSection} label="STORAGE" c={c} style={{ marginTop: 26 }} />
        <View style={[styles.infoCard, { borderColor: c.line2 }]}>
          <IconPhone color={c.acc} />
          <View style={{ flex: 1 }}>
            <AppText weight="semiBold" size={14} color={c.fg}>Connections stay on this phone</AppText>
            <AppText weight="regular" size={11.5} color={c.dim} style={{ marginTop: 4, lineHeight: 17 }}>
              Hosts, ports and titles are saved to local device storage; passwords and keys go to the system keychain. Nothing syncs to a server.
            </AppText>
          </View>
        </View>

        <SectionHeader Icon={IconSupport} label="SUPPORT" c={c} style={{ marginTop: 26 }} />
        <View style={[styles.supportCard, { borderColor: c.line2 }]}>
          {SUPPORT_LINKS.map(({ key, Icon, label, value, url }, i) => (
            <Pressable
              key={key}
              onPress={() => Linking.openURL(url)}
              style={[styles.supportRow, i < SUPPORT_LINKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.line }]}
            >
              <Icon color={c.fg} />
              <View style={{ flex: 1 }}>
                <AppText weight="semiBold" size={14} color={c.fg}>{label}</AppText>
                <AppText weight="regular" mono size={11} color={c.dim} style={{ marginTop: 3 }}>{value}</AppText>
              </View>
              <IconExternal color={c.dim2} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ Icon, label, c, style }: { Icon: React.ComponentType<{ color: string }>; label: string; c: ReturnType<typeof useTheme>['colors']; style?: any }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Icon color={c.acc} />
      <AppText weight="semiBold" mono size={10} color={c.acc} letterSpacing={1.4}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: 2, marginHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  segment: { flexDirection: 'row', borderWidth: 1, marginBottom: 8 },
  segmentItem: { flex: 1, padding: 14, alignItems: 'center' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, padding: 14 },
  fontRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  fontBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  toggleTrack: { width: 44, height: 24, padding: 3, flexDirection: 'row', alignItems: 'center' },
  toggleKnob: { width: 18, height: 18 },
  infoCard: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', borderWidth: 1, padding: 14 },
  supportCard: { borderWidth: 1 },
  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
});
