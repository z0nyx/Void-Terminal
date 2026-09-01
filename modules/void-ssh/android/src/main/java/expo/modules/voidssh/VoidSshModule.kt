package expo.modules.voidssh

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import net.schmizz.sshj.SSHClient
import net.schmizz.sshj.common.Buffer
import net.schmizz.sshj.connection.channel.direct.Session
import net.schmizz.sshj.transport.verification.HostKeyVerifier
import net.schmizz.sshj.userauth.keyprovider.OpenSSHKeyFile
import net.schmizz.sshj.userauth.password.PasswordUtils
import org.bouncycastle.crypto.generators.Ed25519KeyPairGenerator
import org.bouncycastle.crypto.params.Ed25519KeyGenerationParameters
import org.bouncycastle.crypto.params.Ed25519PrivateKeyParameters
import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.security.MessageDigest
import java.security.PublicKey
import java.security.SecureRandom
import java.util.Base64
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

private const val KEY_TYPE = "ssh-ed25519"

private class LiveConnection(val client: SSHClient) {
  @Volatile var hostKeyConfirmed = false
  @Volatile var session: Session? = null
  @Volatile var shell: Session.Shell? = null
  val closed = AtomicBoolean(false)
}

/**
 * Real interactive SSH shell over sshj — see modules/void-ssh/README.md.
 * Written carefully against the sshj 0.38 API but NOT yet compiled or run
 * on a device (no Android SDK in the environment this was authored in).
 * First step on a real machine: `npx expo run:android` and connect to a
 * disposable test server before building anything else on top of this.
 */
class VoidSshModule : Module() {
  private val connections = ConcurrentHashMap<String, LiveConnection>()

  override fun definition() = ModuleDefinition {
    Name("VoidSsh")
    Events("onData", "onStatus")

    // `username` is accepted (not just host/port) so the JS-facing API is
    // identical on both platforms — NMSSH on iOS bakes the username into
    // session construction itself, sshj doesn't need it until auth, but
    // taking it here too means callers never branch on platform.
    AsyncFunction("connect") { host: String, port: Int, _username: String ->
      val id = java.util.UUID.randomUUID().toString()
      val client = SSHClient()
      client.connectTimeout = 12_000

      var fingerprint = ""
      var keyType = ""
      client.addHostKeyVerifier(HostKeyVerifier { _, _, key ->
        keyType = keyTypeName(key)
        fingerprint = sha256Fingerprint(key)
        true // transport-level accept always; app-level trust gate is verifyHostKey() below
      })

      client.connect(host, port)
      connections[id] = LiveConnection(client)
      sendEvent("onStatus", mapOf("connectionId" to id, "status" to "connected"))

      mapOf(
        "connectionId" to id,
        "hostKeyFingerprintSha256" to fingerprint,
        "hostKeyType" to keyType
      )
    }

    AsyncFunction("verifyHostKey") { connectionId: String, accepted: Boolean ->
      val conn = connections[connectionId] ?: throw IllegalStateException("unknown connectionId")
      if (accepted) {
        conn.hostKeyConfirmed = true
      } else {
        closeConnection(connectionId, "host key rejected")
      }
    }

    AsyncFunction("authenticatePassword") { connectionId: String, username: String, password: String ->
      val conn = requireConfirmed(connectionId)
      conn.client.authPassword(username, password)
      sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "authenticated"))
    }

    AsyncFunction("authenticateKey") { connectionId: String, username: String, privateKeyOpenSsh: String, passphrase: String? ->
      val conn = requireConfirmed(connectionId)
      val keyFile = OpenSSHKeyFile()
      val finder = if (passphrase != null) PasswordUtils.createOneOff(passphrase.toCharArray()) else null
      keyFile.init(privateKeyOpenSsh.reader(), null, finder)
      conn.client.authPublickey(username, keyFile)
      sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "authenticated"))
    }

    AsyncFunction("startShell") { connectionId: String, cols: Int, rows: Int ->
      val conn = connections[connectionId] ?: throw IllegalStateException("unknown connectionId")
      val session = conn.client.startSession()
      session.allocatePTY("xterm-256color", cols, rows, 0, 0, emptyMap())
      val shell = session.startShell()
      conn.session = session
      conn.shell = shell

      val thread = Thread {
        readLoop(connectionId, conn, shell.inputStream)
      }
      thread.isDaemon = true
      thread.start()

      sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "shellReady"))
    }

    Function("write") { connectionId: String, data: String ->
      val conn = connections[connectionId] ?: return@Function
      try {
        conn.shell?.outputStream?.let {
          it.write(data.toByteArray(Charsets.UTF_8))
          it.flush()
        }
      } catch (e: Exception) {
        sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "error", "message" to (e.message ?: "write failed")))
      }
    }

    Function("resize") { connectionId: String, cols: Int, rows: Int ->
      val conn = connections[connectionId] ?: return@Function
      try {
        conn.session?.let { s ->
          // sshj re-sends a window-change request through the same channel.
          val method = s.javaClass.getMethod("changeWindowDimensions", Int::class.java, Int::class.java, Int::class.java, Int::class.java)
          method.invoke(s, cols, rows, 0, 0)
        }
      } catch (_: Exception) {
        // Best-effort — not all sshj versions expose this the same way; a
        // missed resize just leaves the remote PTY at its previous size.
      }
    }

    Function("disconnect") { connectionId: String ->
      closeConnection(connectionId, "closed by app")
    }

    AsyncFunction("generateEd25519KeyPair") { comment: String ->
      val generator = Ed25519KeyPairGenerator()
      generator.init(Ed25519KeyGenerationParameters(SecureRandom()))
      val pair = generator.generateKeyPair()
      val priv = pair.private as Ed25519PrivateKeyParameters
      val pub = pair.public as Ed25519PublicKeyParameters

      val publicBlob = encodeSshEd25519PublicKey(pub.encoded)
      val privateKeyOpenSsh = encodeOpenSshEd25519PrivateKey(priv.encoded, pub.encoded, comment)
      val fingerprint = "SHA256:" + Base64.getEncoder().withoutPadding().encodeToString(
        MessageDigest.getInstance("SHA-256").digest(publicBlob)
      )
      val publicKeySsh = "$KEY_TYPE ${Base64.getEncoder().encodeToString(publicBlob)} $comment"

      mapOf(
        "privateKeyOpenSsh" to privateKeyOpenSsh,
        "publicKeySsh" to publicKeySsh,
        "fingerprintSha256" to fingerprint
      )
    }

    OnDestroy {
      connections.keys.toList().forEach { closeConnection(it, "module destroyed") }
    }
  }

  private fun requireConfirmed(connectionId: String): LiveConnection {
    val conn = connections[connectionId] ?: throw IllegalStateException("unknown connectionId")
    if (!conn.hostKeyConfirmed) throw IllegalStateException("host key not verified — call verifyHostKey(true) first")
    return conn
  }

  private fun readLoop(connectionId: String, conn: LiveConnection, input: InputStream) {
    val buf = ByteArray(8192)
    try {
      while (!conn.closed.get()) {
        val n = input.read(buf)
        if (n < 0) break
        val chunk = Base64.getEncoder().encodeToString(buf.copyOf(n))
        sendEvent("onData", mapOf("connectionId" to connectionId, "base64" to chunk))
      }
    } catch (e: Exception) {
      if (!conn.closed.get()) {
        sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "error", "message" to (e.message ?: "read failed")))
      }
    } finally {
      closeConnection(connectionId, "shell stream ended")
    }
  }

  private fun closeConnection(connectionId: String, reason: String) {
    val conn = connections.remove(connectionId) ?: return
    if (!conn.closed.compareAndSet(false, true)) return
    try { conn.shell?.close() } catch (_: Exception) {}
    try { conn.session?.close() } catch (_: Exception) {}
    try { conn.client.disconnect() } catch (_: Exception) {}
    sendEvent("onStatus", mapOf("connectionId" to connectionId, "status" to "closed", "message" to reason))
  }

  private fun keyTypeName(key: PublicKey): String {
    return when (key.algorithm) {
      "EdDSA", "Ed25519" -> "ssh-ed25519"
      "EC" -> "ecdsa-sha2-nistp256"
      "RSA" -> "ssh-rsa"
      else -> key.algorithm
    }
  }

  /** SHA256 fingerprint over the SSH wire-format key blob (matches `ssh-keygen -lf` output), not the JCA X.509 encoding. */
  private fun sha256Fingerprint(key: PublicKey): String {
    val buf = Buffer.PlainBuffer()
    buf.putPublicKey(key)
    val blob = buf.compactData
    val digest = MessageDigest.getInstance("SHA-256").digest(blob)
    return "SHA256:" + Base64.getEncoder().withoutPadding().encodeToString(digest)
  }

  private fun writeSshString(out: ByteArrayOutputStream, bytes: ByteArray) {
    val len = bytes.size
    out.write((len ushr 24) and 0xFF)
    out.write((len ushr 16) and 0xFF)
    out.write((len ushr 8) and 0xFF)
    out.write(len and 0xFF)
    out.write(bytes)
  }

  private fun writeSshUInt32(out: ByteArrayOutputStream, value: Int) {
    out.write((value ushr 24) and 0xFF)
    out.write((value ushr 16) and 0xFF)
    out.write((value ushr 8) and 0xFF)
    out.write(value and 0xFF)
  }

  private fun encodeSshEd25519PublicKey(pubBytes: ByteArray): ByteArray {
    val out = ByteArrayOutputStream()
    writeSshString(out, KEY_TYPE.toByteArray(Charsets.US_ASCII))
    writeSshString(out, pubBytes)
    return out.toByteArray()
  }

  /**
   * OpenSSH private-key container (PROTOCOL.key), unencrypted
   * ("none"/"none" cipher+kdf) since the file itself is only ever kept
   * inside the Android Keystore-backed Keychain, never on plain disk.
   */
  private fun encodeOpenSshEd25519PrivateKey(seed: ByteArray, pub: ByteArray, comment: String): String {
    val pubBlob = encodeSshEd25519PublicKey(pub)

    val inner = ByteArrayOutputStream()
    val checkint = SecureRandom().nextInt()
    writeSshUInt32(inner, checkint)
    writeSshUInt32(inner, checkint)
    writeSshString(inner, KEY_TYPE.toByteArray(Charsets.US_ASCII))
    writeSshString(inner, pub)
    writeSshString(inner, seed + pub) // "sk" field: 32-byte seed || 32-byte pubkey
    writeSshString(inner, comment.toByteArray(Charsets.UTF_8))
    var padByte = 1
    while (inner.size() % 8 != 0) {
      inner.write(padByte)
      padByte++
    }
    val innerBytes = inner.toByteArray()

    val out = ByteArrayOutputStream()
    out.write("openssh-key-v1".toByteArray(Charsets.US_ASCII))
    out.write(0) // NUL terminator -- magic is "openssh-key-v1\0", 15 bytes total
    writeSshString(out, "none".toByteArray(Charsets.US_ASCII)) // ciphername
    writeSshString(out, "none".toByteArray(Charsets.US_ASCII)) // kdfname
    writeSshString(out, ByteArray(0)) // kdfoptions
    writeSshUInt32(out, 1) // number of keys
    writeSshString(out, pubBlob)
    writeSshString(out, innerBytes)

    val b64 = Base64.getEncoder().encodeToString(out.toByteArray())
    val wrapped = b64.chunked(70).joinToString("\n")
    return "-----BEGIN OPENSSH PRIVATE KEY-----\n$wrapped\n-----END OPENSSH PRIVATE KEY-----\n"
  }
}
