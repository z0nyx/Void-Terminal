import { create } from 'zustand';
import { getJSON, setJSON } from './mmkv';
import * as keychain from './keychain';

const KEY = 'void.hosts';

export type AuthMethod = 'key' | 'password';
export type HostIcon = 'cloud' | 'ci' | 'cpu' | 'db' | 'server';

export interface Host {
  id: string;
  name: string;
  addr: string; // user@host:port
  authMethod: AuthMethod;
  mosh: boolean;
  savePassword: boolean;
  icon: HostIcon;
  lastConnectedAt: number | null;
}

interface HostsState {
  hosts: Host[];
  add: (h: Omit<Host, 'id' | 'lastConnectedAt'>, password?: string) => Host;
  update: (id: string, patch: Partial<Omit<Host, 'id'>>, password?: string) => void;
  remove: (id: string) => void;
  touch: (id: string) => void;
}

function persist(hosts: Host[]) {
  setJSON(KEY, hosts);
}

function makeId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ParsedAddr {
  username: string;
  hostname: string;
  port: number;
}

/** Parses "user@host:port" (port defaults to 22, username defaults to the device's typical remote-admin convention "root" only as a last resort). */
export function parseAddr(addr: string): ParsedAddr {
  const [userPart, rest] = addr.includes('@') ? addr.split(/@(.+)/) : ['root', addr];
  const [hostname, portStr] = rest.split(':');
  return { username: userPart, hostname, port: portStr ? parseInt(portStr, 10) : 22 };
}

export const useHostsStore = create<HostsState>((set, get) => ({
  hosts: getJSON<Host[]>(KEY, []),
  add: (h, password) => {
    const host: Host = { ...h, id: makeId(), lastConnectedAt: null };
    const hosts = [host, ...get().hosts];
    set({ hosts });
    persist(hosts);
    if (h.authMethod === 'password' && h.savePassword && password) {
      keychain.savePassword(host.id, password).catch(() => {});
    }
    return host;
  },
  update: (id, patch, password) => {
    const hosts = get().hosts.map((h) => (h.id === id ? { ...h, ...patch } : h));
    set({ hosts });
    persist(hosts);
    if (patch.authMethod === 'password' && patch.savePassword && password) {
      keychain.savePassword(id, password).catch(() => {});
    }
    if (patch.savePassword === false) {
      keychain.deletePassword(id).catch(() => {});
    }
  },
  remove: (id) => {
    const hosts = get().hosts.filter((h) => h.id !== id);
    set({ hosts });
    persist(hosts);
    keychain.deletePassword(id).catch(() => {});
    keychain.deletePrivateKey(id).catch(() => {});
  },
  touch: (id) => {
    const hosts = get().hosts.map((h) => (h.id === id ? { ...h, lastConnectedAt: Date.now() } : h));
    set({ hosts });
    persist(hosts);
  },
}));
