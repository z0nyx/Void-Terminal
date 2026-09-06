import { NativeModule, requireNativeModule } from 'expo';
import type { StartResult, VoidLocalShellEvents } from './VoidLocalShell.types';

/**
 * Native bridge to a real local shell: /system/bin/sh forked onto a
 * genuine PTY via forkpty (see android/src/main/cpp/local_pty.c) —
 * replaces the old Termux hand-off (app/lib/termux.ts) with an actual
 * embedded, interactive shell. Android-only: iOS's app sandbox forbids
 * exec'ing arbitrary binaries, so there's no equivalent there.
 */
declare class VoidLocalShellModule extends NativeModule<VoidLocalShellEvents> {
  /** Forks a shell and allocates a `cols`x`rows` PTY; `onData` events begin firing once this resolves. */
  start(cols: number, rows: number): Promise<StartResult>;

  /** Fire-and-forget: writes UTF-8 text to the shell's stdin. */
  write(sessionId: string, data: string): void;

  resize(sessionId: string, cols: number, rows: number): void;

  stop(sessionId: string): void;

  /**
   * Whether the shell's cwd/HOME will actually be the phone's shared
   * storage (/storage/emulated/0) rather than falling back to this app's
   * private sandbox — true on API < 30 (no such gate existed yet) or once
   * "All files access" has been granted on API 30+.
   */
  hasFullStorageAccess(): boolean;

  /** Opens the system "All files access" settings screen for this app (API 30+ only; the permission can't be requested via a normal runtime dialog). */
  openStorageAccessSettings(): void;
}

export default requireNativeModule<VoidLocalShellModule>('VoidLocalShell');
