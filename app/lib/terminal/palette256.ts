const ANSI_16 = [
  '#000000', '#cc0000', '#4e9a06', '#c4a000', '#3465a4', '#75507b', '#06989a', '#d3d7cf',
  '#555753', '#ef2929', '#8ae234', '#fce94f', '#729fcf', '#ad7fa8', '#34e2e2', '#eeeeec',
];

function cubeChannel(i: number): number {
  return i === 0 ? 0 : 55 + i * 40;
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const XTERM_256: string[] = (() => {
  const table: string[] = [...ANSI_16];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        table.push(toHex(cubeChannel(r), cubeChannel(g), cubeChannel(b)));
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10;
    table.push(toHex(v, v, v));
  }
  return table;
})();

export function paletteColor(index: number): string {
  return XTERM_256[index] ?? '#FBF7F4';
}

export function rgbColor(value: number): string {
  return '#' + (value & 0xffffff).toString(16).padStart(6, '0');
}
