import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppText } from "../components/ui/Text";
import {
  IconBack,
  IconBolt,
  IconSplit,
  IconSwitcher,
  IconSnippets,
} from "../components/ui/icons";
import { useTheme } from "../lib/theme/useTheme";
import { useSettingsStore } from "../lib/storage/settingsStore";
import { useHostsStore } from "../lib/storage/hostsStore";
import { useSessionStore, type Line } from "../lib/sessionStore";
import { attemptHostConnect, attemptLocalShellConnect } from "../lib/connectFlow";
import { charWidthFor, lineHeightFor } from "../lib/terminal/geometry";
import {
  ROWS,
  ghostFor,
  runDemoCommand,
  type KeyAction,
} from "../lib/demoShell";
import {
  SessionSwitcherSheet,
  type SessionSwitcherHandle,
} from "../components/sheets/SessionSwitcherSheet";
import {
  SnippetPaletteSheet,
  type SnippetPaletteHandle,
} from "../components/sheets/SnippetPaletteSheet";
import {
  TrustPromptSheet,
  type TrustPromptHandle,
} from "../components/sheets/TrustPromptSheet";
import { TerminalGrid } from "../components/terminal/TerminalGrid";
import type { TabParamList } from "../navigation/TabParamList";

const CTRL_BYTES: Partial<Record<KeyAction, string>> = {
  sigint: "\x03",
  eof: "\x04",
  clear: "\x0c",
  bg: "\x1a",
  esc: "\x1b",
  tab: "\t",
  histup: "\x1b[A",
  histdown: "\x1b[B",
  accept: "\x1b[C",
  left: "\x1b[D",
  home: "\x01",
  end: "\x05",
  pgup: "\x1b[5~",
  pgdn: "\x1b[6~",
};

// These need the remote's readline to see the buffered line before acting
// on it (tab-completion, history recall, cursor movement) — so unlike a
// plain character, pressing one of these flushes whatever's typed so far
// straight to the remote first.
const LIVE_FLUSH_ACTIONS = new Set<KeyAction>([
  "tab",
  "histup",
  "histdown",
  "accept",
  "left",
  "home",
  "end",
]);

const SUGGESTS = [
  "tmux attach -t main",
  "df -h",
  "pkg upgrade -y",
  "journalctl -u caddy",
];

function loadClipboard(): typeof import("expo-clipboard") | null {
  try {
    // Lazy require (not a static import) so a dev client built before
    // this dependency was added — or Expo Go, which can't load any
    // custom-native-module build at all — fails softly here instead of
    // crashing this whole screen at bundle-load time. Same pattern as
    // connectionManager.ts's loadNativeModule().
    return require("expo-clipboard");
  } catch {
    return null;
  }
}

export function SessionScreen({
  navigation,
}: BottomTabScreenProps<TabParamList, "Session">) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const fontSize = useSettingsStore((s) => s.fontSize);
  // KeyboardAvoidingView's native resize/pan behavior isn't reliable under
  // Android's edge-to-edge rendering (the window no longer actually
  // resizes when the keyboard opens), so track the keyboard height
  // directly and pad the bottom of the screen with it instead — works
  // identically on both platforms.
  const keyboard = useAnimatedKeyboard();
  const keyboardPad = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  const {
    tabs,
    activeIndex,
    setActive,
    killTab,
    setStatus,
    pushLines,
    setTabLines,
    setDropped,
    updateLastCommand,
  } = useSessionStore();
  const tab = tabs[activeIndex];

  const [input, setInput] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  // Whether the remote shell currently owns the in-progress line (set once
  // we've flushed the locally-buffered text to it, e.g. on Tab/history/
  // arrow) — while false, typed text stays purely local and nothing is
  // sent until Enter, so nothing echoes into the terminal grid twice.
  const [liveOwnedByRemote, setLiveOwnedByRemote] = useState(false);
  const [keyRow, setKeyRow] = useState(0);
  const [split, setSplit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dots, setDots] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const contentHeight = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const switcherRef = useRef<SessionSwitcherHandle>(null);
  const paletteRef = useRef<SnippetPaletteHandle>(null);
  const trustRef = useRef<TrustPromptHandle>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [tab?.lines.length]);

  useEffect(() => {
    if (tab?.status !== "connecting") return;
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, [tab?.status]);

  const flash = useCallback((t: string) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  if (!tab) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: c.bg,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <AppText weight="regular" color={c.dim}>
          Connect to a host from the Hosts tab.
        </AppText>
      </View>
    );
  }

  const cancelConnect = () => {
    killTab(activeIndex);
    navigation.navigate("Hosts");
  };

  const retry = () => {
    if (tab.hostId === "local") {
      attemptLocalShellConnect(tab.id);
      return;
    }
    const host = useHostsStore.getState().hosts.find((h) => h.id === tab.hostId);
    if (!host) {
      setStatus(tab.id, "error", "Host was deleted — go back and reconnect from Hosts.");
      return;
    }
    attemptHostConnect(host, tab.id, (info) => trustRef.current!.open(info));
  };

  if (tab.status === "connecting") {
    return (
      <View
        style={[
          styles.root,
          styles.screenCenter,
          { backgroundColor: c.bg, paddingTop: insets.top },
        ]}
      >
        <AppText weight="semiBold" mono size={11} color={c.dim} letterSpacing={1.5}>
          {tab.hostId === "local" ? "STARTING LOCAL SHELL" : "CONNECTING"}
        </AppText>
        <AppText
          weight="extraBold"
          size={20}
          color={c.fg}
          letterSpacing={-0.3}
          style={{ marginTop: 10, textAlign: "center" }}
        >
          {tab.hostName}
        </AppText>
        <AppText weight="regular" mono size={13} color={c.faint} style={{ marginTop: 14 }}>
          {"establishing session" + ".".repeat(dots)}
        </AppText>
        <Pressable
          onPress={cancelConnect}
          style={[styles.pillBtn, styles.pillBtnOutline, { borderColor: c.line2, marginTop: 28 }]}
        >
          <AppText weight="semiBold" mono size={12} color={c.fg} letterSpacing={1}>
            CANCEL
          </AppText>
        </Pressable>
        <TrustPromptSheet ref={trustRef} />
      </View>
    );
  }

  if (tab.status === "error") {
    return (
      <View
        style={[
          styles.root,
          styles.screenCenter,
          { backgroundColor: c.bg, paddingTop: insets.top },
        ]}
      >
        <View style={[styles.errBanner, { backgroundColor: c.acc }]}>
          <AppText weight="semiBold" mono size={11} color={c.accFg} letterSpacing={0.6}>
            CONNECTION FAILED
          </AppText>
        </View>
        <AppText
          weight="extraBold"
          size={20}
          color={c.fg}
          letterSpacing={-0.3}
          style={{ marginTop: 16, textAlign: "center" }}
        >
          {tab.hostName}
        </AppText>
        <AppText
          weight="regular"
          size={13}
          color={c.out}
          style={{ marginTop: 12, textAlign: "center", lineHeight: 19 }}
        >
          {tab.error}
        </AppText>
        <View style={styles.btnRow}>
          <Pressable
            onPress={cancelConnect}
            style={[styles.pillBtn, styles.pillBtnOutline, { borderColor: c.line2 }]}
          >
            <AppText weight="semiBold" mono size={12} color={c.fg} letterSpacing={1}>
              CANCEL
            </AppText>
          </Pressable>
          <Pressable onPress={retry} style={[styles.pillBtn, { backgroundColor: c.acc }]}>
            <AppText weight="semiBold" mono size={12} color={c.accFg} letterSpacing={1}>
              RETRY
            </AppText>
          </Pressable>
        </View>
        <TrustPromptSheet ref={trustRef} />
      </View>
    );
  }

  const prompt = `${tab.hostName} ~ $`;
  const ghost = ghostFor(input, hist);

  const isLive = !!tab.live;

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (isLive) {
      // Used by the snippet palette to run a whole canned command
      // immediately, replacing whatever's currently on the line.
      if (liveOwnedByRemote) tab.live!.write("\x15"); // unix-line-discard
      tab.live!.write(raw + "\r");
      if (cmd) {
        updateLastCommand(cmd);
        setHist((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 30));
      }
      setInput("");
      setLiveOwnedByRemote(false);
      setHistIdx(-1);
      return;
    }
    if (!cmd) {
      pushLines([{ k: "cmd", prompt, text: "" }]);
      setInput("");
      return;
    }
    if (cmd === "clear") {
      setTabLines([]);
      setInput("");
      setHistIdx(-1);
      return;
    }
    const add: Line[] = [
      { k: "cmd", prompt, text: cmd },
      ...runDemoCommand(cmd, prompt),
    ];
    pushLines(add);
    updateLastCommand(cmd);
    setHist((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 30));
    setInput("");
    setHistIdx(-1);
  };

  const insertText = (s: string) => {
    if (isLive && liveOwnedByRemote) {
      // The remote already has a partial line from an earlier flush
      // (e.g. Tab) — discard it before loading the snippet locally.
      tab.live!.write("\x15");
      setLiveOwnedByRemote(false);
    }
    setInput(s);
  };

  const keyAction = (a: KeyAction) => {
    if (a === "ctrl") return setCtrl((v) => !v);
    if (a === "alt") return setAlt((v) => !v);

    if (isLive) {
      const bytes = CTRL_BYTES[a];
      if (bytes) {
        if (LIVE_FLUSH_ACTIONS.has(a)) {
          // Give the remote whatever's typed so far before the key that
          // depends on it (tab-completion needs the partial word, arrows/
          // history need the remote's readline to actually own the line).
          // From here on the remote is the source of truth for this line —
          // its echo (completed name, candidate list, cursor moves, ...)
          // shows up in the terminal grid, same as any other server output.
          // The composer clears: it only ever shows text that hasn't been
          // sent yet.
          if (input) tab.live!.write(input);
          tab.live!.write(bytes);
          setInput("");
          setLiveOwnedByRemote(true);
        } else {
          tab.live!.write(bytes);
          if (a === "sigint") {
            // ^C abandons the line rather than submitting it.
            setInput("");
            setLiveOwnedByRemote(false);
          }
        }
        return;
      }
      switch (a) {
        case "split":
          return setSplit((v) => !v);
        case "zoom":
          return flash(
            "pane zoomed (local UI only — tmux control-mode integration is a future step)",
          );
        case "copy": {
          const next = !copyMode;
          setCopyMode(next);
          return flash(next ? "select text — release to copy" : "copy mode off");
        }
        case "detach":
          return flash("[detached from session main]");
        case "newtab":
          return useSessionStore.getState().addTabFromActive();
        default:
          return;
      }
    }

    switch (a) {
      case "clear":
        return setTabLines([]);
      case "sigint":
        pushLines([{ k: "cmd", prompt, text: input + "^C" }]);
        return setInput("");
      case "eof":
        return flash("^D — shell would exit");
      case "bg":
        return flash("[1]+  Stopped   moved to background");
      case "esc":
        setInput("");
        return flash("ESC");
      case "tab":
      case "accept":
        return setInput((v) => v + ghostFor(v, hist));
      case "left": {
        const p = Math.max(0, selection.start - 1);
        inputRef.current?.setSelection(p, p);
        return;
      }
      case "home":
        inputRef.current?.setSelection(0, 0);
        return;
      case "end":
        inputRef.current?.setSelection(input.length, input.length);
        return;
      case "histup": {
        const i = Math.min(histIdx + 1, hist.length - 1);
        if (i < 0) return flash("no history yet");
        setHistIdx(i);
        setInput(hist[i]);
        return;
      }
      case "histdown": {
        const i = histIdx - 1;
        setHistIdx(i);
        setInput(i < 0 ? "" : hist[i]);
        return;
      }
      case "pgup":
      case "pgdn":
        scrollRef.current?.scrollTo({
          y: (a === "pgup" ? -1 : 1) * 400,
          animated: true,
        });
        return;
      case "split":
        return setSplit((v) => !v);
      case "zoom":
        return flash("pane zoomed");
      case "copy":
        return flash("long-press any line above to select & copy");
      case "detach":
        return flash("[detached from session main]");
      case "newtab":
        return useSessionStore.getState().addTabFromActive();
      default:
        return flash("sent");
    }
  };

  const forceReconnect = () => {
    const next = !tab.dropped;
    setDropped(next);
    if (!next)
      pushLines([{ k: "sys", text: "connection resumed — buffer intact" }]);
  };

  const handleChangeText = (text: string) => {
    if (!isLive || !liveOwnedByRemote) {
      setInput(text);
      return;
    }
    // The remote already owns this line (post-flush) — forward only the
    // delta as raw bytes instead of resending everything, so a fast typist
    // can't cause the same character to be sent twice.
    const prev = input;
    if (text.length > prev.length && text.startsWith(prev)) {
      tab.live!.write(text.slice(prev.length));
    } else if (text.length < prev.length && prev.startsWith(text)) {
      tab.live!.write("\x7f".repeat(prev.length - text.length));
    } else {
      // Non-trailing edit (autocorrect swapped a word, etc.) — resync by
      // wiping what the remote has for this line and resending it all.
      tab.live!.write("\x7f".repeat(prev.length) + text);
    }
    setInput(text);
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (isLive && liveOwnedByRemote && input === "" && e.nativeEvent.key === "Backspace") {
      // The composer is already empty (post-flush) so onChangeText won't
      // fire for this — forward the backspace directly.
      tab.live!.write("\x7f");
    }
  };

  const handleSubmit = () => {
    if (isLive) {
      if (liveOwnedByRemote) tab.live!.write("\r");
      else tab.live!.write(input + "\r");
      const cmd = input.trim();
      if (cmd) {
        updateLastCommand(cmd);
        setHist((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 30));
      }
      setInput("");
      setLiveOwnedByRemote(false);
      setHistIdx(-1);
      return;
    }
    run(input);
  };

  const marks = tab.lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.k === "cmd" && l.text);

  const rowKeys = ROWS[keyRow].keys;
  const keyBg = c.key;

  return (
    <View
      style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.navigate("Hosts")}>
          <IconBack color={c.dim} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="semiBold" size={14.5} color={c.fg} numberOfLines={1}>
            {tab.hostName}
          </AppText>
          <AppText
            weight="regular"
            mono
            size={10.5}
            color={c.dim}
            style={{ marginTop: 2 }}
          >
            {tab.dropped
              ? "connection lost — reconnecting…"
              : copyMode
                ? "COPY MODE — drag to select, release to copy"
                : ctrl
                  ? "CTRL armed"
                  : alt
                    ? "ALT armed"
                    : "ssh · tmux main"}
          </AppText>
        </View>
        <Pressable hitSlop={8} onPress={forceReconnect} style={{ padding: 6 }}>
          <IconBolt size={18} color={c.dim} />
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={() => setSplit((v) => !v)}
          style={{ padding: 6 }}
        >
          <IconSplit size={18} color={c.dim} />
        </Pressable>
        <Pressable
          onPress={() => switcherRef.current?.open()}
          style={[styles.switcherBadge, { backgroundColor: c.fg }]}
        >
          <IconSwitcher size={13} color={c.bg} />
          <AppText weight="semiBold" mono size={11} color={c.bg}>
            {String(tabs.length)}
          </AppText>
        </Pressable>
      </View>
      <View style={[styles.rule, { backgroundColor: c.fg }]} />

      {tab.dropped && (
        <View style={[styles.dropBanner, { backgroundColor: c.acc }]}>
          <AppText
            weight="semiBold"
            mono
            size={11}
            color={c.bg}
            letterSpacing={0.4}
          >
            CONNECTION LOST — RECONNECTING
          </AppText>
          <Pressable onPress={forceReconnect}>
            <AppText
              weight="semiBold"
              mono
              size={11}
              color={c.bg}
              style={{ textDecorationLine: "underline" }}
            >
              RETRY NOW
            </AppText>
          </Pressable>
        </View>
      )}

      <Animated.View style={[{ flex: 1 }, keyboardPad]}>
        <View
          style={{ flex: 1, position: "relative" }}
          onLayout={(e) => {
            if (!tab.live) return;
            const { width, height } = e.nativeEvent.layout;
            const charWidth = charWidthFor(fontSize);
            const lineHeight = lineHeightFor(fontSize);
            const cols = Math.max(20, Math.floor((width - 44) / charWidth));
            const rows = Math.max(6, Math.floor((height - 12) / lineHeight));
            if (
              cols !== tab.live.terminal.term.cols ||
              rows !== tab.live.terminal.term.rows
            ) {
              tab.live.resize(cols, rows);
            }
          }}
        >
          {isLive ? (
            <View
              style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12 }}
            >
              <TerminalGrid
                session={tab.live!.terminal}
                fontSize={fontSize}
                copyMode={copyMode}
                onCursorMove={(delta) => {
                  const seq = delta > 0 ? "\x1b[C" : "\x1b[D";
                  tab.live!.write(seq.repeat(Math.abs(delta)));
                }}
                onCopy={async (text) => {
                  setCopyMode(false);
                  const Clipboard = loadClipboard();
                  if (!Clipboard) {
                    flash("clipboard module not built yet — rebuild the app");
                    return;
                  }
                  await Clipboard.setStringAsync(text);
                  flash(`copied ${text.length} chars`);
                }}
              />
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  paddingRight: 30,
                }}
                onContentSizeChange={(_, h) => {
                  contentHeight.current = h;
                }}
              >
                {tab.lines.map((l, i) => (
                  <LineView key={i} line={l} c={c} fontSize={fontSize} />
                ))}
              </ScrollView>

              <View style={styles.rail}>
                <AppText
                  weight="medium"
                  mono
                  size={8}
                  color={c.faint}
                  letterSpacing={1}
                >
                  RAIL
                </AppText>
                {marks.map(({ l, i }) => (
                  <Pressable
                    key={i}
                    onPress={() =>
                      scrollRef.current?.scrollTo({
                        y: (i / tab.lines.length) * contentHeight.current,
                        animated: true,
                      })
                    }
                    style={[styles.railMark, { backgroundColor: c.dim2 }]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={[styles.composerRow, { borderTopColor: c.line2 }]}>
          <AppText weight="semiBold" mono size={fontSize} color={c.acc}>
            {prompt}
          </AppText>
          <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {/* Shows only text that hasn't been sent yet. Enter sends the
                whole line; Tab/history/arrows send whatever's typed so far
                too (so the remote can act on it) — either way, once it's
                sent, `input` clears and everything about that line from
                then on (completions, output, ...) lives in the terminal
                grid above, never duplicated back here. */}
            <View style={styles.composerGhostRow} pointerEvents="none">
              <AppText mono size={fontSize} color={c.fg} numberOfLines={1}>
                {input}
              </AppText>
              <AppText mono size={fontSize} color={c.faint} numberOfLines={1}>
                {ghost}
              </AppText>
            </View>
            <TextInput
              ref={inputRef}
              value={input}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              onChangeText={handleChangeText}
              onKeyPress={handleKeyPress}
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              cursorColor={c.acc}
              selectionColor={c.acc}
              style={[
                StyleSheet.absoluteFill,
                {
                  color: "transparent",
                  fontFamily: theme.fonts.mono.regular,
                  fontSize,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.suggestRow, { borderTopColor: c.line }]}>
          {SUGGESTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => insertText(s)}
              style={[styles.suggestChip, { borderColor: c.line2 }]}
            >
              <AppText weight="regular" mono size={11.5} color={c.out}>
                {s}
              </AppText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => paletteRef.current?.open()}
            style={[styles.paletteBtn, { backgroundColor: c.fg }]}
          >
            <IconSnippets size={15} color={c.bg} />
          </Pressable>
        </View>

        <View
          style={[
            styles.keyBarWrap,
            {
              backgroundColor: c.bar,
              borderTopColor: c.line2,
              paddingBottom: insets.bottom || 8,
            },
          ]}
        >
          <View style={styles.rowTabsRow}>
            {ROWS.map((r, i) => (
              <Pressable
                key={r.label}
                onPress={() => setKeyRow(i)}
                style={[
                  styles.rowTab,
                  { backgroundColor: keyRow === i ? c.acc : "transparent" },
                ]}
              >
                <AppText
                  weight="semiBold"
                  mono
                  size={9.5}
                  letterSpacing={1.2}
                  color={keyRow === i ? c.accFg : c.dim}
                >
                  {r.label}
                </AppText>
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() =>
                inputRef.current?.isFocused()
                  ? inputRef.current?.blur()
                  : inputRef.current?.focus()
              }
            >
              <AppText
                weight="semiBold"
                mono
                size={9.5}
                letterSpacing={1.2}
                color={c.dim}
              >
                KEYBOARD
              </AppText>
            </Pressable>
          </View>
          <View style={styles.keyGrid}>
            {rowKeys.map((k) => {
              const on =
                (k.a === "ctrl" && ctrl) ||
                (k.a === "alt" && alt) ||
                (k.a === "copy" && copyMode);
              return (
                <Pressable
                  key={k.label}
                  onPress={() => keyAction(k.a as KeyAction)}
                  style={[styles.key, { backgroundColor: on ? c.acc : keyBg }]}
                >
                  <AppText
                    weight="semiBold"
                    mono
                    size={12.5}
                    color={on ? c.accFg : c.fg}
                  >
                    {k.label}
                  </AppText>
                  {!!k.sub && (
                    <AppText
                      weight="semiBold"
                      mono
                      size={7.5}
                      letterSpacing={0.6}
                      color={on ? c.accFg : c.dim}
                      style={{ marginTop: 2 }}
                    >
                      {k.sub}
                    </AppText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {toast && (
        <View
          style={[
            styles.toast,
            { backgroundColor: c.fg, bottom: 100 + (insets.bottom || 0) },
          ]}
        >
          <AppText weight="semiBold" mono size={11.5} color={c.bg}>
            {toast}
          </AppText>
        </View>
      )}

      <SessionSwitcherSheet ref={switcherRef} />
      <SnippetPaletteSheet ref={paletteRef} onRun={run} />
      <TrustPromptSheet ref={trustRef} />
    </View>
  );
}

function LineView({
  line,
  c,
  fontSize,
}: {
  line: Line;
  c: ReturnType<typeof useTheme>["colors"];
  fontSize: number;
}) {
  if (line.k === "cmd") {
    return (
      <View
        style={{ flexDirection: "row", gap: 7, marginTop: 9, marginBottom: 3 }}
      >
        <AppText weight="semiBold" mono size={fontSize} color={c.acc}>
          {line.prompt}
        </AppText>
        <AppText
          weight="medium"
          mono
          size={fontSize}
          color={c.fg}
          style={{ flex: 1 }}
          selectable
        >
          {line.text}
        </AppText>
      </View>
    );
  }
  if (line.k === "sys") {
    return (
      <AppText
        weight="regular"
        mono
        size={fontSize}
        color={c.faint}
        style={{ fontStyle: "italic" }}
        selectable
      >
        {line.text}
      </AppText>
    );
  }
  return (
    <AppText weight="regular" mono size={fontSize} color={c.out} selectable>
      {line.text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenCenter: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  pillBtn: { paddingHorizontal: 28, paddingVertical: 14, alignItems: "center", minWidth: 120 },
  pillBtnOutline: { borderWidth: 1 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 28 },
  errBanner: { paddingHorizontal: 14, paddingVertical: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  rule: { height: 2 },
  switcherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dropBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rail: {
    position: "absolute",
    right: 6,
    top: 14,
    bottom: 0,
    width: 24,
    alignItems: "flex-end",
    gap: 6,
  },
  railMark: { width: 12, height: 2 },
  composerRow: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composerGhostRow: { flexDirection: "row", alignItems: "center" },
  suggestRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  suggestChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  paletteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  keyBarWrap: { borderTopWidth: 1 },
  rowTabsRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingTop: 8,
    alignItems: "center",
  },
  rowTab: { paddingHorizontal: 9, paddingVertical: 6 },
  keyGrid: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 5,
  },
  key: { flex: 1, height: 44, alignItems: "center", justifyContent: "center" },
  toast: {
    position: "absolute",
    left: 14,
    right: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
