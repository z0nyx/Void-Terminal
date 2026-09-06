package expo.modules.voidlocalshell

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.Settings
import android.system.Os
import android.system.OsConstants
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.Base64
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private class LocalSession(
  val pid: Int,
  val masterFd: ParcelFileDescriptor,
  val input: FileInputStream,
  val output: FileOutputStream
) {
  val closed = AtomicBoolean(false)
}

/**
 * A real interactive local shell — /system/bin/sh forked onto a genuine
 * PTY via forkpty (see src/main/cpp/local_pty.c) — not a hand-off to
 * another app (that was app/lib/termux.ts, now replaced by this). Android
 * has no root shell or coreutils beyond toybox without a full distro
 * bootstrap (that's what Termux itself ships in its own app sandbox), so
 * this is a genuinely interactive shell with job control and full-screen
 * apps (vim/less/top), but only the toybox utilities baked into AOSP —
 * no apt/pkg, no arbitrary Linux userland.
 */
class VoidLocalShellModule : Module() {
  private val sessions = ConcurrentHashMap<String, LocalSession>()

  override fun definition() = ModuleDefinition {
    Name("VoidLocalShell")
    Events("onData", "onStatus")

    Function("hasFullStorageAccess") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Environment.isExternalStorageManager() else true
    }

    Function("openStorageAccessSettings") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(
          Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
          Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    AsyncFunction("start") { cols: Int, rows: Int ->
      val context = appContext.reactContext ?: throw IllegalStateException("no context")
      val home = homeDirectory(context)

      val pidOut = IntArray(1)
      val fd = LocalPty.forkPty(
        "/system/bin/sh",
        arrayOf("/system/bin/sh", "-i"),
        arrayOf(
          "HOME=$home",
          "PATH=/system/bin:/system/xbin",
          "TERM=xterm-256color",
          "PS1=\$ "
        ),
        home,
        rows,
        cols,
        pidOut
      )
      if (fd < 0) throw IllegalStateException("forkpty failed")

      val pfd = ParcelFileDescriptor.adoptFd(fd)
      val session = LocalSession(
        pid = pidOut[0],
        masterFd = pfd,
        input = FileInputStream(pfd.fileDescriptor),
        output = FileOutputStream(pfd.fileDescriptor)
      )
      val id = UUID.randomUUID().toString()
      sessions[id] = session

      Thread { readLoop(id, session) }.apply { isDaemon = true }.start()
      Thread { waitLoop(id, session) }.apply { isDaemon = true }.start()

      mapOf("sessionId" to id)
    }

    Function("write") { sessionId: String, data: String ->
      val session = sessions[sessionId] ?: return@Function
      try {
        session.output.write(data.toByteArray(Charsets.UTF_8))
        session.output.flush()
      } catch (e: Exception) {
        sendEvent("onStatus", mapOf("sessionId" to sessionId, "status" to "error", "message" to (e.message ?: "write failed")))
      }
    }

    Function("resize") { sessionId: String, cols: Int, rows: Int ->
      val session = sessions[sessionId] ?: return@Function
      LocalPty.setWindowSize(session.masterFd.fd, rows, cols)
    }

    Function("stop") { sessionId: String ->
      closeSession(sessionId, "closed by app")
    }

    OnDestroy {
      sessions.keys.toList().forEach { closeSession(it, "module destroyed") }
    }
  }

  /**
   * The phone's actual shared storage root (/storage/emulated/0 — what any
   * file manager shows as "Internal Storage": Download/, DCIM/, etc.), not
   * this app's private sandbox — that's what makes this feel like a real
   * device shell rather than a shell that can only ever see its own app
   * folder. Reading/writing there from a forked process is gated by
   * Android's scoped-storage FUSE layer at the kernel level regardless of
   * app permissions declared in the manifest, so it only actually works
   * once the user has granted "All files access" (MANAGE_EXTERNAL_STORAGE)
   * — see hasFullStorageAccess()/openStorageAccessSettings() above, which
   * the JS side (app/lib/localShell/localShellManager.ts) checks and
   * prompts for before calling start(). Falls back to the app's own
   * sandbox dir if that permission isn't granted or shared storage isn't
   * mounted, so the shell still works either way.
   */
  private fun homeDirectory(context: android.content.Context): String {
    val hasAccess = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.isExternalStorageManager()
    } else {
      Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED
    }
    val shared = Environment.getExternalStorageDirectory()
    return if (hasAccess && shared != null && File(shared, ".").canWrite()) {
      shared.absolutePath
    } else {
      context.filesDir.absolutePath
    }
  }

  private fun readLoop(sessionId: String, session: LocalSession) {
    val buf = ByteArray(8192)
    try {
      while (!session.closed.get()) {
        val n = session.input.read(buf)
        if (n < 0) break
        val chunk = Base64.getEncoder().encodeToString(buf.copyOf(n))
        sendEvent("onData", mapOf("sessionId" to sessionId, "base64" to chunk))
      }
    } catch (_: Exception) {
      // Expected once stop()/waitLoop() closes the fd out from under us.
    } finally {
      closeSession(sessionId, "shell stream ended")
    }
  }

  private fun waitLoop(sessionId: String, session: LocalSession) {
    val exitCode = LocalPty.waitFor(session.pid)
    closeSession(sessionId, "exit code $exitCode", status = "exited")
  }

  private fun closeSession(sessionId: String, reason: String, status: String = "closed") {
    val session = sessions.remove(sessionId) ?: return
    if (!session.closed.compareAndSet(false, true)) return
    try { Os.kill(session.pid, OsConstants.SIGHUP) } catch (_: Exception) {}
    try { session.input.close() } catch (_: Exception) {}
    try { session.output.close() } catch (_: Exception) {}
    sendEvent("onStatus", mapOf("sessionId" to sessionId, "status" to status, "message" to reason))
  }
}
