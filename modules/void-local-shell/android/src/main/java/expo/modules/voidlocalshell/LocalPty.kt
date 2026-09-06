package expo.modules.voidlocalshell

/**
 * JNI bridge to local_pty.c. Kept as a separate object (rather than
 * `external fun` directly on VoidLocalShellModule) so the native symbol
 * names — `Java_expo_modules_voidlocalshell_LocalPty_*` — stay stable
 * even if the module class around it changes shape.
 */
internal object LocalPty {
  init {
    System.loadLibrary("voidlocalshell")
  }

  /**
   * Forks [cmd] attached to a real PTY. Returns the master fd (wrap with
   * `ParcelFileDescriptor.adoptFd` to get Kotlin-side read/write streams),
   * or -1 on failure. Writes the child's pid into `pidOut[0]`.
   */
  external fun forkPty(
    cmd: String,
    args: Array<String>,
    env: Array<String>,
    cwd: String?,
    rows: Int,
    cols: Int,
    pidOut: IntArray
  ): Int

  external fun setWindowSize(fd: Int, rows: Int, cols: Int)

  /** Blocks until the process exits; returns its exit status. Call from a background thread only. */
  external fun waitFor(pid: Int): Int
}
