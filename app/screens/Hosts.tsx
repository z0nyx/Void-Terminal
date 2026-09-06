import React, { useRef } from "react";
import {
  View,
  Image,
  Pressable,
  FlatList,
  Platform,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "../components/ui/Text";
import {
  IconPlus,
  IconCloud,
  IconCi,
  IconCpu,
  IconDb,
  IconServer,
  IconEdit,
  IconArrowRight,
  IconSession,
} from "../components/ui/icons";
import { useTheme } from "../lib/theme/useTheme";
import { useHostsStore, type Host } from "../lib/storage/hostsStore";
import { useSessionStore } from "../lib/sessionStore";
import {
  HostEditorSheet,
  type HostEditorHandle,
} from "../components/sheets/HostEditorSheet";
import {
  attemptHostConnect,
  attemptLocalShellConnect,
} from "../lib/connectFlow";
import {
  isLocalShellAvailable,
  hasFullStorageAccess,
  openStorageAccessSettings,
} from "../lib/localShell/localShellManager";
import {
  TrustPromptSheet,
  type TrustPromptHandle,
} from "../components/sheets/TrustPromptSheet";
import type { TabParamList } from "../navigation/TabParamList";

const logos = {
  dark: require("../../assets/void-white.png"),
  light: require("../../assets/void-black.png"),
};

const kindIcon: Record<Host["icon"], typeof IconCloud> = {
  cloud: IconCloud,
  ci: IconCi,
  cpu: IconCpu,
  db: IconDb,
  server: IconServer,
};

function timeAgo(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function HostsScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "Hosts">) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const hosts = useHostsStore((s) => s.hosts);
  const connect = useSessionStore((s) => s.connect);
  const connectLocal = useSessionStore((s) => s.connectLocal);
  const pushLinesForTab = useSessionStore((s) => s.pushLinesForTab);
  const sheetRef = useRef<HostEditorHandle>(null);
  const trustRef = useRef<TrustPromptHandle>(null);

  const openHost = (h: Host) => {
    const tabId = connect(h);
    navigation.navigate("Session");
    attemptHostConnect(h, tabId, (info) => trustRef.current!.open(info));
  };

  const openLocalShell = () => {
    const tabId = connectLocal();
    navigation.navigate("Session");

    if (isLocalShellAvailable() && !hasFullStorageAccess()) {
      pushLinesForTab(tabId, [
        {
          k: "sys",
          text: 'No "All files access" yet — opening in the app\'s own sandbox for now, not your phone storage.',
        },
      ]);
      Alert.alert(
        "Open in your phone storage?",
        "Grant \"All files access\" so the local shell starts in your phone's storage (Download, DCIM, etc.) instead of this app's private sandbox.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => openStorageAccessSettings() },
        ],
      );
    }

    attemptLocalShellConnect(tabId);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={logos[theme.name]}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText
            weight="extraBold"
            size={20}
            color={c.fg}
            letterSpacing={-0.4}
          >
            HOSTS
          </AppText>
        </View>
        <Pressable
          onPress={() => sheetRef.current?.openNew()}
          style={[styles.newBtn, { backgroundColor: c.acc }]}
        >
          <IconPlus size={13} color={c.accFg} />
          <AppText
            weight="semiBold"
            mono
            size={11}
            color={c.accFg}
            letterSpacing={1}
          >
            NEW
          </AppText>
        </Pressable>
      </View>
      <View style={[styles.rule, { backgroundColor: c.fg }]} />

      <FlatList
        data={hosts}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24 + insets.bottom,
        }}
        ListEmptyComponent={
          <AppText
            weight="regular"
            color={c.dim}
            size={13}
            style={{ paddingVertical: 24 }}
          >
            No hosts yet — tap NEW to add your first connection.
          </AppText>
        }
        ListFooterComponent={
          Platform.OS === "android" ? (
            <>
              <AppText
                weight="medium"
                mono
                size={10}
                color={c.faint}
                letterSpacing={1.2}
                style={{ marginTop: 22, marginBottom: 12 }}
              >
                LOCAL
              </AppText>
              <Pressable
                onPress={() => openLocalShell()}
                style={[styles.localRow, { borderColor: c.line2 }]}
              >
                <View style={styles.localLeft}>
                  <IconSession size={20} color={c.fg} />
                  <View>
                    <AppText weight="semiBold" size={15} color={c.fg}>
                      Local shell
                    </AppText>
                    <AppText
                      weight="regular"
                      mono
                      size={11.5}
                      color={c.dim}
                      style={{ marginTop: 4 }}
                    >
                      /system/bin/sh · real PTY, no root
                    </AppText>
                  </View>
                </View>
                <IconArrowRight color={c.acc} />
              </Pressable>
            </>
          ) : null
        }
        renderItem={({ item }) => {
          const Kind = kindIcon[item.icon];
          return (
            <Pressable
              onPress={() => openHost(item)}
              style={[styles.row, { borderBottomColor: c.line }]}
            >
              <View style={styles.dotCol}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: "transparent", borderColor: c.dim2 },
                  ]}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Kind size={15} color={c.acc} />
                  <AppText
                    weight="semiBold"
                    size={16}
                    color={c.fg}
                    letterSpacing={-0.2}
                  >
                    {item.name}
                  </AppText>
                </View>
                <AppText
                  weight="regular"
                  mono
                  size={12}
                  color={c.dim}
                  numberOfLines={1}
                  style={{ marginTop: 4 }}
                >
                  {item.addr}
                </AppText>
                <View style={styles.tagsRow}>
                  {[
                    item.authMethod === "password" ? "PASSWORD" : "ED25519",
                    ...(item.mosh ? ["MOSH"] : []),
                  ].map((t) => (
                    <View
                      key={t}
                      style={[styles.tag, { borderColor: c.line2 }]}
                    >
                      <AppText
                        weight="medium"
                        mono
                        size={9.5}
                        color={c.out}
                        letterSpacing={1}
                      >
                        {t}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.rightCol}>
                <AppText weight="regular" mono size={11} color={c.faint}>
                  {timeAgo(item.lastConnectedAt)}
                </AppText>
                <Pressable
                  hitSlop={8}
                  onPress={() => sheetRef.current?.openEdit(item)}
                >
                  <IconEdit size={16} color={c.dim2} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <HostEditorSheet ref={sheetRef} />
      <TrustPromptSheet ref={trustRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 26, height: 26 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rule: { height: 2, marginHorizontal: 20 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  dotCol: { width: 12, paddingTop: 4 },
  dot: { width: 9, height: 9, borderWidth: 1.5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 9, flexWrap: "wrap" },
  tag: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 5 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  localRow: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  localLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
});
