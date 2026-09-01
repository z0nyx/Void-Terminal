import { getJSON, setJSON } from '../storage/mmkv';

const KEY = 'void.knownHostKeys';

type KnownHosts = Record<string, string>; // "host:port" -> "SHA256:..."

function load(): KnownHosts {
  return getJSON<KnownHosts>(KEY, {});
}

function addrKey(host: string, port: number): string {
  return `${host}:${port}`;
}

export function getPinnedFingerprint(host: string, port: number): string | null {
  return load()[addrKey(host, port)] ?? null;
}

export function pinFingerprint(host: string, port: number, fingerprint: string): void {
  const hosts = load();
  hosts[addrKey(host, port)] = fingerprint;
  setJSON(KEY, hosts);
}

export function forgetHost(host: string, port: number): void {
  const hosts = load();
  delete hosts[addrKey(host, port)];
  setJSON(KEY, hosts);
}
