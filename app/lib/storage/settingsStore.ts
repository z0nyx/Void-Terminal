import { create } from "zustand";
import { getJSON, setJSON } from "./mmkv";
import type { ThemeName } from "../theme/tokens";

const KEY = "void.settings";

export interface KeyBarOptions {
  stickyModifiers: boolean;
  haptics: boolean;
  swipeRows: boolean;
}

interface SettingsState {
  theme: ThemeName;
  fontSize: number; // px, matches mockup's 9-20 clamp
  welcomed: boolean;
  keyBar: KeyBarOptions;
  setTheme: (t: ThemeName) => void;
  setFontSize: (px: number) => void;
  fontUp: () => void;
  fontDown: () => void;
  setWelcomed: (v: boolean) => void;
  toggleKeyBarOption: (k: keyof KeyBarOptions) => void;
}

const defaults = {
  theme: "dark" as ThemeName,
  fontSize: 13,
  welcomed: false,
  keyBar: {
    stickyModifiers: true,
    haptics: true,
    swipeRows: false,
  } as KeyBarOptions,
};

function persist(
  state: Pick<SettingsState, "theme" | "fontSize" | "welcomed" | "keyBar">,
) {
  setJSON(KEY, {
    theme: state.theme,
    fontSize: state.fontSize,
    welcomed: state.welcomed,
    keyBar: state.keyBar,
  });
}

const initial = getJSON(KEY, defaults);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setTheme: (theme) => {
    set({ theme });
    persist(get());
  },
  setFontSize: (px) => {
    const fontSize = Math.max(9, Math.min(20, px));
    set({ fontSize });
    persist(get());
  },
  fontUp: () => get().setFontSize(get().fontSize + 1),
  fontDown: () => get().setFontSize(get().fontSize - 1),
  setWelcomed: (welcomed) => {
    set({ welcomed });
    persist(get());
  },
  toggleKeyBarOption: (k) => {
    const keyBar = { ...get().keyBar, [k]: !get().keyBar[k] };
    set({ keyBar });
    persist(get());
  },
}));
