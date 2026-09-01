import React, { useSyncExternalStore, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TerminalSession } from '../../lib/terminal/TerminalSession';
import { paletteColor, rgbColor } from '../../lib/terminal/palette256';
import { useTheme } from '../../lib/theme/useTheme';
import { fonts } from '../../lib/theme/tokens';

interface Run {
  text: string;
  fg: string;
  bg: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  inverse: boolean;
}

/**
 * Real terminal viewport — reads @xterm/headless's parsed buffer directly
 * (colors, bold/italic/underline, alt-screen) and renders it as runs of
 * styled monospace Text. Not GPU-accelerated (no react-native-skia) — fine
 * for a phone-sized grid; revisit only if profiling on a real device shows
 * it's needed, per the plan's "no premature optimization" call.
 */
export function TerminalGrid({ session, fontSize }: { session: TerminalSession; fontSize: number }) {
  const theme = useTheme();
  const c = theme.colors;

  useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.getVersion()
  );

  const rows = useMemo(() => {
    const buf = session.term.buffer.active;
    const out: Run[][] = [];
    for (let y = 0; y < session.term.rows; y++) {
      const line = buf.getLine(buf.viewportY + y);
      out.push(line ? lineToRuns(line, session.term.cols, c.fg, c.bg) : []);
    }
    return out;
  }, [session, session.getVersion(), c.fg, c.bg]);

  const lineHeight = fontSize * 1.35;

  return (
    <View style={styles.root}>
      {rows.map((runs, i) => (
        <View key={i} style={{ flexDirection: 'row', height: lineHeight }}>
          {runs.length === 0 ? (
            <Text> </Text>
          ) : (
            runs.map((run, j) => (
              <Text
                key={j}
                style={[
                  styles.cellText,
                  {
                    fontFamily: run.bold ? fonts.mono.semiBold : fonts.mono.regular,
                    fontStyle: run.italic ? 'italic' : 'normal',
                    textDecorationLine: run.underline ? 'underline' : 'none',
                    color: run.inverse ? run.bg ?? c.bg : run.fg,
                    backgroundColor: run.inverse ? run.fg : run.bg ?? undefined,
                    fontSize,
                    lineHeight,
                  },
                ]}
              >
                {run.text}
              </Text>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

// @xterm/headless doesn't export IBufferCell/IBufferLine by name (only
// reachable structurally through Terminal.buffer.active), so these take
// `any` deliberately rather than fighting the library's type exports.

function cellFg(cell: any, defaultFg: string): string {
  if (cell.isFgDefault()) return defaultFg;
  if (cell.isFgRGB()) return rgbColor(cell.getFgColor());
  return paletteColor(cell.getFgColor());
}

function cellBg(cell: any, defaultBg: string): string | null {
  if (cell.isBgDefault()) return null;
  if (cell.isBgRGB()) return rgbColor(cell.getBgColor());
  return paletteColor(cell.getBgColor());
}

function lineToRuns(line: any, cols: number, defaultFg: string, defaultBg: string): Run[] {
  const runs: Run[] = [];
  let current: Run | null = null;

  for (let x = 0; x < cols; x++) {
    const cell = line.getCell(x);
    if (!cell || cell.getWidth() === 0) continue;
    const chars = cell.getChars() || ' ';
    const fg = cellFg(cell, defaultFg);
    const bg = cellBg(cell, defaultBg);
    const bold = !!cell.isBold();
    const italic = !!cell.isItalic();
    const underline = !!cell.isUnderline();
    const inverse = !!cell.isInverse();

    if (
      current &&
      current.fg === fg &&
      current.bg === bg &&
      current.bold === bold &&
      current.italic === italic &&
      current.underline === underline &&
      current.inverse === inverse
    ) {
      current.text += chars;
    } else {
      current = { text: chars, fg, bg, bold, italic, underline, inverse };
      runs.push(current);
    }
  }
  return runs;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cellText: { includeFontPadding: false } as any,
});
