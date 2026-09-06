// @xterm/headless detects its host environment by checking `process.title`
// and, failing that, reading `navigator.userAgent`/`navigator.platform`.
// React Native's `process` polyfill has no `title`, and its `navigator`
// polyfill has no `userAgent`/`platform`, so xterm's browser-detection code
// (`navigator.userAgent.includes(...)`) throws on `undefined` the moment
// `@xterm/headless` is imported. Must run before any xterm import.
const nav =
  (globalThis as any).navigator ?? ((globalThis as any).navigator = {});
if (typeof nav.userAgent !== "string") nav.userAgent = "ReactNative";
if (typeof nav.platform !== "string") nav.platform = "ReactNative";
