import { create } from 'zustand';
import type { Host } from './storage/hostsStore';
import type { LiveConnection } from './ssh/connectionManager';

export type LineKind = 'cmd' | 'out' | 'sys';
export interface Line {
  k: LineKind;
  prompt?: string;
  text: string;
}

export interface SessionTab {
  id: string;
  hostId: string;
  hostName: string;
  lastCommand: string;
  lines: Line[];
  dropped: boolean;
  /** Set once connectionManager.connectHost() resolves; while null, Session.tsx renders `lines` (the demo transcript) instead of a real terminal grid. */
  live: LiveConnection | null;
}

interface SessionState {
  tabs: SessionTab[];
  activeIndex: number;
  connect: (host: Host) => string;
  addTabFromActive: () => void;
  killTab: (index: number) => void;
  setActive: (index: number) => void;
  setDropped: (dropped: boolean) => void;
  pushLines: (lines: Line[]) => void;
  setTabLines: (lines: Line[]) => void;
  updateLastCommand: (cmd: string) => void;
  attachLive: (tabId: string, live: LiveConnection) => void;
}

function makeId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function demoLinesFor(name: string): Line[] {
  return [
    { k: 'sys', text: `connecting to ${name}…` },
  ];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  tabs: [],
  activeIndex: 0,
  connect: (host) => {
    const tab: SessionTab = {
      id: makeId(),
      hostId: host.id,
      hostName: host.name,
      lastCommand: 'connected',
      lines: demoLinesFor(host.name),
      dropped: false,
      live: null,
    };
    set({ tabs: [tab], activeIndex: 0 });
    return tab.id;
  },
  addTabFromActive: () => {
    const { tabs, activeIndex } = get();
    const base = tabs[activeIndex];
    if (!base) return;
    const tab: SessionTab = {
      id: makeId(),
      hostId: base.hostId,
      hostName: base.hostName,
      lastCommand: 'new window',
      lines: [{ k: 'sys', text: 'tmux: new window created' }],
      dropped: false,
      live: null,
    };
    set({ tabs: [...tabs, tab], activeIndex: tabs.length });
  },
  killTab: (index) => {
    const { tabs } = get();
    if (tabs.length <= 1) return;
    tabs[index]?.live?.disconnect();
    const next = tabs.filter((_, i) => i !== index);
    set({ tabs: next, activeIndex: 0 });
  },
  setActive: (index) => set({ activeIndex: index }),
  setDropped: (dropped) => {
    const { tabs, activeIndex } = get();
    set({ tabs: tabs.map((t, i) => (i === activeIndex ? { ...t, dropped } : t)) });
  },
  pushLines: (lines) => {
    const { tabs, activeIndex } = get();
    set({
      tabs: tabs.map((t, i) => (i === activeIndex ? { ...t, lines: [...t.lines, ...lines] } : t)),
    });
  },
  setTabLines: (lines) => {
    const { tabs, activeIndex } = get();
    set({ tabs: tabs.map((t, i) => (i === activeIndex ? { ...t, lines } : t)) });
  },
  updateLastCommand: (cmd) => {
    const { tabs, activeIndex } = get();
    set({ tabs: tabs.map((t, i) => (i === activeIndex ? { ...t, lastCommand: cmd } : t)) });
  },
  attachLive: (tabId, live) => {
    const { tabs } = get();
    set({ tabs: tabs.map((t) => (t.id === tabId ? { ...t, live, lines: [] } : t)) });
  },
}));
