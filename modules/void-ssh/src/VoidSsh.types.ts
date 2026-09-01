export interface ConnectParams {
  host: string;
  port: number;
}

export interface ConnectResult {
  connectionId: string;
  hostKeyFingerprintSha256: string;
  hostKeyType: string;
}

export type SshStatus = 'connected' | 'authenticated' | 'shellReady' | 'closed' | 'error';

export interface StatusEvent {
  connectionId: string;
  status: SshStatus;
  message?: string;
}

export interface DataEvent {
  connectionId: string;
  /** UTF-8 bytes from the remote PTY, base64-encoded (raw byte stream — not line-buffered). */
  base64: string;
}

export interface IdentityKeyResult {
  privateKeyOpenSsh: string;
  publicKeySsh: string;
  fingerprintSha256: string;
}

export type VoidSshEvents = {
  onData: (event: DataEvent) => void;
  onStatus: (event: StatusEvent) => void;
};
