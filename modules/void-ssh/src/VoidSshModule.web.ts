import { registerWebModule, NativeModule } from 'expo';
import type { VoidSshEvents } from './VoidSsh.types';

/** No web target for Void Terminal — SSH needs a real TCP socket, which the browser sandbox doesn't expose. */
class VoidSshModule extends NativeModule<VoidSshEvents> {
  private unsupported(): never {
    throw new Error('void-ssh has no web implementation — Void Terminal targets Android only.');
  }
  connect = this.unsupported;
  verifyHostKey = this.unsupported;
  authenticatePassword = this.unsupported;
  authenticateKey = this.unsupported;
  startShell = this.unsupported;
  write = this.unsupported;
  resize = this.unsupported;
  disconnect = this.unsupported;
  generateEd25519KeyPair = this.unsupported;
}

export default registerWebModule(VoidSshModule, 'VoidSshModule');
