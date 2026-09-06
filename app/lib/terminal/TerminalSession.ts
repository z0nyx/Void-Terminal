import { Terminal } from "@xterm/headless";
import { base64ToBytes } from "./base64";

/**
 * Wraps one @xterm/headless Terminal — a real VT100/256-color/alt-screen
 * parser — so vim/htop/tmux render correctly instead of the mockup's
 * canned line list (see app/lib/demoShell.ts, which this replaces once
 * Session.tsx is wired to a live connection). One instance per session
 * tab; feed() is called from the onData event of app/lib/ssh/connectionManager.
 */
export class TerminalSession {
  readonly term: Terminal;
  private listeners = new Set<() => void>();
  private version = 0;

  getVersion(): number {
    return this.version;
  }

  constructor(cols = 80, rows = 24) {
    this.term = new Terminal({
      cols,
      rows,
      scrollback: 2000,
      allowProposedApi: true,
      convertEol: false,
    });
  }

  feed(base64: string): void {
    const bytes = base64ToBytes(base64);
    this.term.write(bytes, () => this.notify());
  }

  writeText(text: string): void {
    this.term.write(text, () => this.notify());
  }

  resize(cols: number, rows: number): void {
    this.term.resize(cols, rows);
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispose(): void {
    this.listeners.clear();
    this.term.dispose();
  }

  private notify(): void {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }
}
