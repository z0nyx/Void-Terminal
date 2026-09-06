import { registerWebModule, NativeModule } from 'expo';
import type { VoidLocalShellEvents } from './VoidLocalShell.types';

/** No web/iOS target — a real local shell needs forkpty(2) onto /system/bin/sh, which is Android-only. */
class VoidLocalShellModule extends NativeModule<VoidLocalShellEvents> {
  private unsupported(): never {
    throw new Error('void-local-shell has no web implementation — Android only.');
  }
  start = this.unsupported;
  write = this.unsupported;
  resize = this.unsupported;
  stop = this.unsupported;
  hasFullStorageAccess = this.unsupported;
  openStorageAccessSettings = this.unsupported;
}

export default registerWebModule(VoidLocalShellModule, 'VoidLocalShellModule');
