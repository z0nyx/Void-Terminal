import type { Line } from './sessionStore';

/**
 * TODO(task-3): this is the mockup's original canned-output demo, ported
 * verbatim so Session.tsx has something real to render and be visually
 * verified against before the native SSH + xterm-headless pipeline
 * (app/lib/ssh, app/lib/terminal) replaces it as the source of transcript
 * data. Nothing here should still be imported by Session.tsx once that
 * lands.
 */

export const SNIPPETS = [
  { cmd: 'tmux attach -t main', desc: 'Reattach the long-running session', tag: 'TMUX' },
  { cmd: 'journalctl -u caddy -n 80 --no-pager', desc: 'Last 80 lines of the web server unit', tag: 'LOGS' },
  { cmd: 'docker compose up -d --build', desc: 'Rebuild and restart the stack', tag: 'DEPLOY' },
  { cmd: 'pkg upgrade -y', desc: 'Update every Termux package', tag: 'PKG' },
  { cmd: 'df -h | sort -k5 -r | head', desc: 'Fullest mounts first', tag: 'DISK' },
  { cmd: 'systemctl restart caddy', desc: 'Bounce the reverse proxy', tag: 'OPS' },
];

export const KNOWN = [
  'ls -la', 'ls', 'uname -a', 'uptime', 'df -h', 'htop', 'tmux ls', 'tmux attach -t main',
  'pkg install neovim', 'pkg upgrade -y', 'git status', 'journalctl -u caddy -n 80 --no-pager',
  'docker compose up -d --build', 'systemctl restart caddy', 'cd /srv/void', 'cat /etc/os-release',
];

const OUT: Record<string, string> = {
  'ls': 'bin   etc   home  opt   srv   var',
  'ls -la': 'drwxr-xr-x  14 root root  4096 Aug 30 02:11 .\ndrwxr-xr-x   1 root root  4096 Jul 02 09:40 ..\n-rw-------   1 root root  8213 Aug 31 14:02 .bash_history\ndrwx------   2 root root  4096 Jun 11 08:22 .ssh\ndrwxr-xr-x   6 root root  4096 Aug 29 19:55 srv',
  'uname -a': 'Linux edge-01 6.6.30-arm64 #1 SMP PREEMPT aarch64 GNU/Linux',
  'uptime': ' 15:58:41 up 41 days,  3:12,  1 user,  load average: 0.42, 0.31, 0.28',
  'df -h': 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        79G   38G   38G  50% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm\n/dev/vdb1       500G  411G   64G  87% /srv',
  'htop': '[alt-screen] htop 3.3.0 — swipe down with two fingers to leave',
  'tmux ls': 'main: 3 windows (created Mon Jul 21 08:14:02 2026) (attached)\nbuild: 1 windows (created Fri Aug 28 22:03:19 2026)',
  'git status': "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean",
  'cat /etc/os-release': 'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"\nID=debian\nVERSION_ID="13"',
  'pkg install neovim': 'Checking availability of current mirror: ok\nReading package lists... Done\nThe following NEW packages will be installed:\n  libluajit neovim tree-sitter\nAfter this operation, 24.1 MB of additional disk space will be used.\nGet:1 termux-main neovim aarch64 0.10.2 [9,204 kB]\nunpacking neovim (0.10.2) ...\nSetting up neovim (0.10.2) ...',
  'pkg upgrade -y': 'Reading package lists... Done\n412 packages, 6 upgradable\nFetched 18.4 MB in 3s\nAll packages are up to date.',
};

export function runDemoCommand(cmd: string, prompt: string): Line[] {
  if (cmd === 'clear') return [];
  const add: Line[] = [];
  if (OUT[cmd]) add.push({ k: 'out', text: OUT[cmd] });
  else if (cmd.indexOf('cd ') === 0) add.push({ k: 'sys', text: 'now in ' + cmd.slice(3) });
  else if (cmd.indexOf('tmux attach') === 0) add.push({ k: 'sys', text: '[attached to session main — 3 windows]' });
  else add.push({ k: 'out', text: 'zsh: command not found: ' + cmd.split(' ')[0] });
  return add;
}

export function ghostFor(input: string, history: string[]): string {
  if (!input) return '';
  const pool = history.concat(KNOWN);
  const hit = pool.find((c) => c.indexOf(input) === 0 && c !== input);
  return hit ? hit.slice(input.length) : '';
}

export const ROWS = [
  {
    label: 'MOD',
    keys: [
      { label: 'ESC', sub: '', a: 'esc' }, { label: '⇥', sub: 'TAB', a: 'tab' },
      { label: 'CTRL', sub: 'HOLD', a: 'ctrl' }, { label: 'ALT', sub: 'HOLD', a: 'alt' },
      { label: '^C', sub: 'KILL', a: 'sigint' }, { label: '^D', sub: 'EOF', a: 'eof' },
      { label: '^L', sub: 'CLR', a: 'clear' }, { label: '^Z', sub: 'BG', a: 'bg' },
    ],
  },
  {
    label: 'NAV',
    keys: [
      { label: '←', sub: '', a: 'noop' }, { label: '↓', sub: '', a: 'histdown' },
      { label: '↑', sub: 'HIST', a: 'histup' }, { label: '→', sub: '', a: 'accept' },
      { label: '⇱', sub: 'HOME', a: 'noop' }, { label: '⇲', sub: 'END', a: 'noop' },
      { label: '⇞', sub: 'PGUP', a: 'pgup' }, { label: '⇟', sub: 'PGDN', a: 'pgdn' },
    ],
  },
  {
    label: 'TMUX',
    keys: [
      { label: '⌃B', sub: 'PFX', a: 'noop' }, { label: '⊟', sub: 'SPLIT', a: 'split' },
      { label: '⊞', sub: 'VSPL', a: 'split' }, { label: '⇄', sub: 'PANE', a: 'noop' },
      { label: '＋', sub: 'WIN', a: 'newtab' }, { label: '⌕', sub: 'COPY', a: 'copy' },
      { label: '⤢', sub: 'ZOOM', a: 'zoom' }, { label: '⏻', sub: 'DTCH', a: 'detach' },
    ],
  },
] as const;

export type KeyAction = (typeof ROWS)[number]['keys'][number]['a'];
