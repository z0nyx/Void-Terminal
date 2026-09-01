import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppText } from '../components/ui/Text';
import { IconBack, IconBolt, IconSplit, IconSwitcher, IconSnippets } from '../components/ui/icons';
import { useTheme } from '../lib/theme/useTheme';
import { useSettingsStore } from '../lib/storage/settingsStore';
import { useSessionStore, type Line } from '../lib/sessionStore';
import { ROWS, ghostFor, runDemoCommand, type KeyAction } from '../lib/demoShell';
import { SessionSwitcherSheet, type SessionSwitcherHandle } from '../components/sheets/SessionSwitcherSheet';
import { SnippetPaletteSheet, type SnippetPaletteHandle } from '../components/sheets/SnippetPaletteSheet';
import { TerminalGrid } from '../components/terminal/TerminalGrid';
import type { TabParamList } from '../navigation/TabParamList';

const CTRL_BYTES: Partial<Record<KeyAction, string>> = {
  sigint: '\x03',
  eof: '\x04',
  clear: '\x0c',
  bg: '\x1a',
  esc: '\x1b',
  tab: '\t',
  histup: '\x1b[A',
  histdown: '\x1b[B',
  accept: '\x1b[C',
  pgup: '\x1b[5~',
  pgdn: '\x1b[6~',
};

const SUGGESTS = ['tmux attach -t main', 'df -h', 'pkg upgrade -y', 'journalctl -u caddy'];

export function SessionScreen({ navigation }: BottomTabScreenProps<TabParamList, 'Session'>) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const fontSize = useSettingsStore((s) => s.fontSize);

  const { tabs, activeIndex, setActive, pushLines, setTabLines, setDropped, updateLastCommand } = useSessionStore();
  const tab = tabs[activeIndex];

  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [keyRow, setKeyRow] = useState(0);
  const [split, setSplit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const contentHeight = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const switcherRef = useRef<SessionSwitcherHandle>(null);
  const paletteRef = useRef<SnippetPaletteHandle>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [tab?.lines.length]);

  const flash = useCallback((t: string) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  if (!tab) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <AppText weight="regular" color={c.dim}>Connect to a host from the Hosts tab.</AppText>
      </View>
    );
  }

  const prompt = `${tab.hostName} ~ $`;
  const ghost = ghostFor(input, hist);

  const isLive = !!tab.live;

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (isLive) {
      tab.live!.write(raw + '\r');
      if (cmd) {
        updateLastCommand(cmd);
        setHist((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 30));
      }
      setInput('');
      setHistIdx(-1);
      return;
    }
    if (!cmd) {
      pushLines([{ k: 'cmd', prompt, text: '' }]);
      setInput('');
      return;
    }
    if (cmd === 'clear') {
      setTabLines([]);
      setInput('');
      setHistIdx(-1);
      return;
    }
    const add: Line[] = [{ k: 'cmd', prompt, text: cmd }, ...runDemoCommand(cmd, prompt)];
    pushLines(add);
    updateLastCommand(cmd);
    setHist((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 30));
    setInput('');
    setHistIdx(-1);
  };

  const keyAction = (a: KeyAction) => {
    if (a === 'ctrl') return setCtrl((v) => !v);
    if (a === 'alt') return setAlt((v) => !v);

    if (isLive) {
      const bytes = CTRL_BYTES[a];
      if (bytes) {
        tab.live!.write(bytes);
        if (a === 'esc') setInput('');
        return;
      }
      switch (a) {
        case 'split': return setSplit((v) => !v);
        case 'zoom': return flash('pane zoomed (local UI only — tmux control-mode integration is a future step)');
        case 'copy': return flash('copy-mode — drag to select, tap to yank');
        case 'detach': return flash('[detached from session main]');
        case 'newtab': return useSessionStore.getState().addTabFromActive();
        default: return;
      }
    }

    switch (a) {
      case 'clear': return setTabLines([]);
      case 'sigint':
        pushLines([{ k: 'cmd', prompt, text: input + '^C' }]);
        return setInput('');
      case 'eof': return flash('^D — shell would exit');
      case 'bg': return flash('[1]+  Stopped   moved to background');
      case 'esc':
        setInput('');
        return flash('ESC');
      case 'tab':
      case 'accept':
        return setInput((v) => v + ghostFor(v, hist));
      case 'histup': {
        const i = Math.min(histIdx + 1, hist.length - 1);
        if (i < 0) return flash('no history yet');
        setHistIdx(i);
        setInput(hist[i]);
        return;
      }
      case 'histdown': {
        const i = histIdx - 1;
        setHistIdx(i);
        setInput(i < 0 ? '' : hist[i]);
        return;
      }
      case 'pgup':
      case 'pgdn':
        scrollRef.current?.scrollTo({ y: (a === 'pgup' ? -1 : 1) * 400, animated: true });
        return;
      case 'split': return setSplit((v) => !v);
      case 'zoom': return flash('pane zoomed');
      case 'copy': return flash('copy-mode — drag to select, tap to yank');
      case 'detach': return flash('[detached from session main]');
      case 'newtab': return useSessionStore.getState().addTabFromActive();
      default: return flash('sent');
    }
  };

  const forceReconnect = () => {
    const next = !tab.dropped;
    setDropped(next);
    if (!next) pushLines([{ k: 'sys', text: 'connection resumed — buffer intact' }]);
  };

  const marks = tab.lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.k === 'cmd' && l.text);

  const rowKeys = ROWS[keyRow].keys;
  const keyBg = c.key;

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => navigation.navigate('Hosts')}>
          <IconBack color={c.dim} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="semiBold" size={14.5} color={c.fg} numberOfLines={1}>{tab.hostName}</AppText>
          <AppText weight="regular" mono size={10.5} color={c.dim} style={{ marginTop: 2 }}>
            {tab.dropped ? 'connection lost — reconnecting…' : ctrl ? 'CTRL armed' : alt ? 'ALT armed' : 'ssh · tmux main'}
          </AppText>
        </View>
        <Pressable hitSlop={8} onPress={forceReconnect} style={{ padding: 6 }}>
          <IconBolt size={18} color={c.dim} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => setSplit((v) => !v)} style={{ padding: 6 }}>
          <IconSplit size={18} color={c.dim} />
        </Pressable>
        <Pressable onPress={() => switcherRef.current?.open()} style={[styles.switcherBadge, { backgroundColor: c.fg }]}>
          <IconSwitcher size={13} color={c.bg} />
          <AppText weight="semiBold" mono size={11} color={c.bg}>{String(tabs.length)}</AppText>
        </Pressable>
      </View>
      <View style={[styles.rule, { backgroundColor: c.fg }]} />

      {tab.dropped && (
        <View style={[styles.dropBanner, { backgroundColor: c.acc }]}>
          <AppText weight="semiBold" mono size={11} color={c.bg} letterSpacing={0.4}>CONNECTION LOST — RECONNECTING</AppText>
          <Pressable onPress={forceReconnect}>
            <AppText weight="semiBold" mono size={11} color={c.bg} style={{ textDecorationLine: 'underline' }}>RETRY NOW</AppText>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{ flex: 1, position: 'relative' }}
          onLayout={(e) => {
            if (!tab.live) return;
            const { width, height } = e.nativeEvent.layout;
            const charWidth = fontSize * 0.6;
            const lineHeight = fontSize * 1.35;
            const cols = Math.max(20, Math.floor((width - 44) / charWidth));
            const rows = Math.max(6, Math.floor((height - 12) / lineHeight));
            if (cols !== tab.live.terminal.term.cols || rows !== tab.live.terminal.term.rows) {
              tab.live.resize(cols, rows);
            }
          }}
        >
          {isLive ? (
            <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12 }}>
              <TerminalGrid session={tab.live!.terminal} fontSize={fontSize} />
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, paddingRight: 30 }}
                onContentSizeChange={(_, h) => { contentHeight.current = h; }}
              >
                {tab.lines.map((l, i) => (
                  <LineView key={i} line={l} c={c} fontSize={fontSize} />
                ))}
              </ScrollView>

              <View style={styles.rail}>
                <AppText weight="medium" mono size={8} color={c.faint} letterSpacing={1}>RAIL</AppText>
                {marks.map(({ l, i }) => (
                  <Pressable
                    key={i}
                    onPress={() => scrollRef.current?.scrollTo({ y: (i / tab.lines.length) * contentHeight.current, animated: true })}
                    style={[styles.railMark, { backgroundColor: c.dim2 }]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={[styles.composerRow, { borderTopColor: c.line2 }]}>
          <AppText weight="semiBold" mono size={fontSize} color={c.acc}>{prompt}</AppText>
          <View style={{ flex: 1, position: 'relative' }}>
            <View style={styles.composerGhostRow} pointerEvents="none">
              <AppText mono size={fontSize} color={c.fg}>{input}</AppText>
              <View style={[styles.cursor, { backgroundColor: c.acc, height: fontSize + 2 }]} />
              <AppText mono size={fontSize} color={c.faint}>{ghost}</AppText>
            </View>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => run(input)}
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              caretHidden
              style={[StyleSheet.absoluteFill, { color: 'transparent', fontFamily: theme.fonts.mono.regular, fontSize }]}
            />
          </View>
        </View>

        <View style={[styles.suggestRow, { borderTopColor: c.line }]}>
          {SUGGESTS.map((s) => (
            <Pressable key={s} onPress={() => setInput(s)} style={[styles.suggestChip, { borderColor: c.line2 }]}>
              <AppText weight="regular" mono size={11.5} color={c.out}>{s}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={() => paletteRef.current?.open()} style={[styles.paletteBtn, { backgroundColor: c.fg }]}>
            <IconSnippets size={15} color={c.bg} />
          </Pressable>
        </View>

        <View style={[styles.keyBarWrap, { backgroundColor: c.bar, borderTopColor: c.line2, paddingBottom: insets.bottom || 8 }]}>
          <View style={styles.rowTabsRow}>
            {ROWS.map((r, i) => (
              <Pressable key={r.label} onPress={() => setKeyRow(i)} style={[styles.rowTab, { backgroundColor: keyRow === i ? c.acc : 'transparent' }]}>
                <AppText weight="semiBold" mono size={9.5} letterSpacing={1.2} color={keyRow === i ? c.accFg : c.dim}>{r.label}</AppText>
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => (inputRef.current?.isFocused() ? inputRef.current?.blur() : inputRef.current?.focus())}>
              <AppText weight="semiBold" mono size={9.5} letterSpacing={1.2} color={c.dim}>KEYBOARD</AppText>
            </Pressable>
          </View>
          <View style={styles.keyGrid}>
            {rowKeys.map((k) => {
              const on = (k.a === 'ctrl' && ctrl) || (k.a === 'alt' && alt);
              return (
                <Pressable key={k.label} onPress={() => keyAction(k.a as KeyAction)} style={[styles.key, { backgroundColor: on ? c.acc : keyBg }]}>
                  <AppText weight="semiBold" mono size={12.5} color={on ? c.accFg : c.fg}>{k.label}</AppText>
                  {!!k.sub && (
                    <AppText weight="semiBold" mono size={7.5} letterSpacing={0.6} color={on ? c.accFg : c.dim} style={{ marginTop: 2 }}>{k.sub}</AppText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>

      {toast && (
        <View style={[styles.toast, { backgroundColor: c.fg, bottom: 100 + (insets.bottom || 0) }]}>
          <AppText weight="semiBold" mono size={11.5} color={c.bg}>{toast}</AppText>
        </View>
      )}

      <SessionSwitcherSheet ref={switcherRef} />
      <SnippetPaletteSheet ref={paletteRef} onRun={run} />
    </View>
  );
}

function LineView({ line, c, fontSize }: { line: Line; c: ReturnType<typeof useTheme>['colors']; fontSize: number }) {
  if (line.k === 'cmd') {
    return (
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 9, marginBottom: 3 }}>
        <AppText weight="semiBold" mono size={fontSize} color={c.acc}>{line.prompt}</AppText>
        <AppText weight="medium" mono size={fontSize} color={c.fg} style={{ flex: 1 }}>{line.text}</AppText>
      </View>
    );
  }
  if (line.k === 'sys') {
    return <AppText weight="regular" mono size={fontSize} color={c.faint} style={{ fontStyle: 'italic' }}>{line.text}</AppText>;
  }
  return <AppText weight="regular" mono size={fontSize} color={c.out}>{line.text}</AppText>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  rule: { height: 2 },
  switcherBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  dropBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  rail: { position: 'absolute', right: 6, top: 14, bottom: 0, width: 24, alignItems: 'flex-end', gap: 6 },
  railMark: { width: 12, height: 2 },
  composerRow: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  composerGhostRow: { flexDirection: 'row', alignItems: 'center' },
  cursor: { width: 2, marginHorizontal: 1 },
  suggestRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  suggestChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  paletteBtn: { paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  keyBarWrap: { borderTopWidth: 1 },
  rowTabsRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingTop: 8, alignItems: 'center' },
  rowTab: { paddingHorizontal: 9, paddingVertical: 6 },
  keyGrid: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 5 },
  key: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 14, right: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
