import React from "react";
import { View, Image, Pressable, Linking, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../components/ui/Text";
import { IconArrowRight } from "../components/ui/icons";
import { useTheme } from "../lib/theme/useTheme";
import { useSettingsStore } from "../lib/storage/settingsStore";

const REPO_URL = "https://github.com/z0nyx/Void-Terminal";

const logos = {
  dark: require("../../assets/void-white.png"),
  light: require("../../assets/void-black.png"),
};

export function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const setWelcomed = useSettingsStore((s) => s.setWelcomed);
  const [pressed, setPressed] = React.useState(false);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.bg,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.logoWrap}>
        <Image
          source={logos[theme.name]}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <AppText
        weight="extraBold"
        mono={false}
        color={theme.colors.fg}
        style={styles.title}
      >
        A terminal that fits one thumb
      </AppText>
      <AppText
        weight="regular"
        color={theme.colors.dim}
        style={styles.subtitle}
      >
        SSH, mosh and a local shell, with the modifier keys the phone keyboard
        forgot.
      </AppText>

      <Pressable
        onPress={() => setWelcomed(true)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.cta,
          { backgroundColor: pressed ? theme.colors.acc2 : theme.colors.acc },
        ]}
      >
        <AppText
          weight="semiBold"
          mono
          color={theme.colors.bg}
          letterSpacing={2}
          size={13}
        >
          GET STARTED
        </AppText>
        <IconArrowRight color={theme.colors.bg} />
      </Pressable>

      <AppText
        weight="regular"
        color={theme.colors.dim2}
        style={styles.legalLine}
      >
        By continuing, you agree to the{" "}
        <AppText
          weight="semiBold"
          color={theme.colors.dim}
          onPress={() => Linking.openURL(`${REPO_URL}/blob/main/legal/terms.md`)}
        >
          Terms of Service
        </AppText>{" "}
        and{" "}
        <AppText
          weight="semiBold"
          color={theme.colors.dim}
          onPress={() => Linking.openURL(`${REPO_URL}/blob/main/legal/privacy.md`)}
        >
          Privacy Policy
        </AppText>
        .
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 26, justifyContent: "flex-end" },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  logo: { width: 150, height: 150 },
  title: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 26, maxWidth: 300 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 19,
  },
  legalLine: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 14,
  },
});
