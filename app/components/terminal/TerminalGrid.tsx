import React, { useSyncExternalStore, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native';
import type { TerminalSession } from '../../lib/terminal/TerminalSession';
import { paletteColor, rgbColor } from '../../lib/terminal/palette256';
import { charWidthFor, lineHeightFor } from '../../lib/terminal/geometry';
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

interface CellPos {
  row: number;
  col: number;
}

interface SelRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function normalizeRange(r: SelRange): SelRange {
  if (r.startRow < r.endRow || (r.startRow === r.endRow && r.startCol <= r.endCol)) {
    return r;
  }
  return {
    startRow: r.endRow,
    startCol: r.endCol,
    endRow: r.startRow,
    endCol: r.startCol,
  };
}

function extractSelectedText(session: TerminalSession, r: SelRange): string {
  const buf = session.term.buffer.active;
  const cols = session.term.cols;
  const out: string[] = [];
  for (let y = r.startRow; y <= r.endRow; y++) {
    const line = buf.getLine(buf.viewportY + y);
    if (!line) continue;
    const from = y === r.startRow ? r.startCol : 0;
    const to = y === r.endRow ? r.endCol + 1 : cols;
    out.push((line as any).translateToString(true, from, to));
  }
  return out.join('\n').trim();
}

/**
 * Real terminal viewport — reads @xterm/headless's parsed buffer directly
 * (colors, bold/italic/underline, alt-screen) and renders it as runs of
 * styled monospace Text. Not GPU-accelerated (no react-native-skia) — fine
 * for a phone-sized grid; revisit only if profiling on a real device shows
 * it's needed, per the plan's "no premature optimization" call.
 *
 * Also owns two touch interactions on top of that same buffer: outside
 * copy mode, a tap on the shell's current input line repositions its
 * cursor (as N left/right arrow presses — real terminals have no
 * random-access cursor, only relative movement); in copy mode, a drag
 * selects a text range which is copied out on release.
 */
export function TerminalGrid({
  session,
  fontSize,
  copyMode = false,
  onCursorMove,
  onCopy,
}: {
  session: TerminalSession;
  fontSize: number;
  copyMode?: boolean;
  onCursorMove?: (deltaCols: number) => void;
  onCopy?: (text: string) => void;
}) {
  const theme = useTheme();
  const c = theme.colors;

  useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.getVersion()
  );

  const charWidth = charWidthFor(fontSize);
  const lineHeight = lineHeightFor(fontSize);

  const [selRange, setSelRange] = useState<SelRange | null>(null);
  const dragStart = useRef<CellPos | null>(null);

  const rows = useMemo(() => {
    const buf = session.term.buffer.active;
    const out: Run[][] = [];
    for (let y = 0; y < session.term.rows; y++) {
      const line = buf.getLine(buf.viewportY + y);
      out.push(line ? lineToRuns(line, session.term.cols, c.fg, c.bg) : []);
    }
    return out;
  }, [session, session.getVersion(), c.fg, c.bg]);

  const cellAt = (evt: GestureResponderEvent): CellPos => {
    const { locationX, locationY } = evt.nativeEvent;
    const col = Math.max(0, Math.min(session.term.cols - 1, Math.floor(locationX / charWidth)));
    const row = Math.max(0, Math.min(session.term.rows - 1, Math.floor(locationY / lineHeight)));
    return { row, col };
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => copyMode,
        onPanResponderGrant: (evt) => {
          const p = cellAt(evt);
          dragStart.current = p;
          if (copyMode) setSelRange({ startRow: p.row, startCol: p.col, endRow: p.row, endCol: p.col });
        },
        onPanResponderMove: (evt) => {
          if (!copyMode || !dragStart.current) return;
          const p = cellAt(evt);
          setSelRange({
            startRow: dragStart.current.row,
            startCol: dragStart.current.col,
            endRow: p.row,
            endCol: p.col,
          });
        },
        onPanResponderRelease: (evt) => {
          const start = dragStart.current;
          dragStart.current = null;

          if (copyMode) {
            const range = selRange ?? (start && { startRow: start.row, startCol: start.col, endRow: start.row, endCol: start.col });
            setSelRange(null);
            if (!range) return;
            const text = extractSelectedText(session, normalizeRange(range));
            if (text) onCopy?.(text);
            return;
          }

          if (!start) return;
          const p = cellAt(evt);
          const buf = session.term.buffer.active;
          if (p.row !== buf.cursorY) return;
          const delta = p.col - buf.cursorX;
          if (delta !== 0) onCursorMove?.(delta);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copyMode, selRange, session, onCopy, onCursorMove, charWidth, lineHeight]
  );

  const selNorm = selRange ? normalizeRange(selRange) : null;

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      {rows.map((runs, i) => {
        const hl =
          selNorm && i >= selNorm.startRow && i <= selNorm.endRow
            ? {
                from: i === selNorm.startRow ? selNorm.startCol : 0,
                to: i === selNorm.endRow ? selNorm.endCol + 1 : session.term.cols,
              }
            : null;
        return (
          <View key={i} style={{ flexDirection: 'row', height: lineHeight, position: 'relative' }}>
            {hl && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: hl.from * charWidth,
                  width: Math.max(0, hl.to - hl.from) * charWidth,
                  top: 0,
                  bottom: 0,
                  backgroundColor: c.acc,
                  opacity: 0.35,
                }}
              />
            )}
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
        );
      })}
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
