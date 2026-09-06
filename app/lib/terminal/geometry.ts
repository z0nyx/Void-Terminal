/**
 * Cell-size approximation shared by Session.tsx (resize + tap-to-cursor math)
 * and TerminalGrid.tsx (selection-highlight geometry) so the two can't drift
 * out of sync with each other.
 */
export function charWidthFor(fontSize: number): number {
  return fontSize * 0.6;
}

export function lineHeightFor(fontSize: number): number {
  return fontSize * 1.35;
}
