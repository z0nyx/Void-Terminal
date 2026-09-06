export type LocalShellStatus = 'exited' | 'closed' | 'error';

export interface StatusEvent {
  sessionId: string;
  status: LocalShellStatus;
  message?: string;
}

export interface DataEvent {
  sessionId: string;
  /** UTF-8 bytes from the local PTY, base64-encoded (raw byte stream — not line-buffered). */
  base64: string;
}

export interface StartResult {
  sessionId: string;
}

export type VoidLocalShellEvents = {
  onData: (event: DataEvent) => void;
  onStatus: (event: StatusEvent) => void;
};
