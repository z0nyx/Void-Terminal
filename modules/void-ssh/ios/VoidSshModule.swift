import ExpoModulesCore
import NMSSH
import CryptoKit
import Foundation

private let keyType = "ssh-ed25519"

enum VoidSshError: Error {
  case unknownConnection
  case connectFailed
  case hostKeyNotVerified
  case authFailed
  case shellFailed
}

private final class LiveConnection {
  let session: NMSSHSession
  var hostKeyConfirmed = false
  var closed = false
  var readThread: Thread?
  init(session: NMSSHSession) { self.session = session }
}

/**
 * Real interactive SSH shell over NMSSH (libssh2) — see
 * modules/void-ssh/README.md. Written carefully against NMSSH's documented
 * API but NOT yet compiled or run on a device (no Xcode toolchain in the
 * environment this was authored in). First step on a real Mac: open the
 * generated `ios/` project after `npx expo prebuild`, let CocoaPods pull
 * NMSSH in, and fix up any NMSSHChannel method-name mismatches Xcode
 * flags — those are the one part of this file most likely to need a
 * small correction against the exact NMSSH version that resolves.
 *
 * Known limitation vs. Android: NMSSHChannel's delegate hands back
 * already-UTF8-decoded NSStrings, not raw bytes, so a multi-byte
 * character split exactly across two reads could in rare cases render as
 * a replacement character. Acceptable for a v1 — flagged here rather than
 * silently claimed as byte-perfect.
 */
public class VoidSshModule: Module, NMSSHChannelDelegate {
  private var connections: [String: LiveConnection] = [:]
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("VoidSsh")
    Events("onData", "onStatus")

    AsyncFunction("connect") { (host: String, port: Int, username: String) -> [String: String] in
      guard let session = NMSSHSession(host: "\(host):\(port)", andUsername: username) else {
        throw VoidSshError.connectFailed
      }
      session.connect()
      guard session.isConnected else {
        throw VoidSshError.connectFailed
      }

      let id = UUID().uuidString
      var typeOut: NSString = ""
      let fingerprint = VoidSshHostKey.fingerprint(for: session, type: &typeOut) ?? ""

      self.lock.lock()
      self.connections[id] = LiveConnection(session: session)
      self.lock.unlock()

      self.sendEvent("onStatus", ["connectionId": id, "status": "connected"])
      return ["connectionId": id, "hostKeyFingerprintSha256": fingerprint, "hostKeyType": typeOut as String]
    }

    AsyncFunction("verifyHostKey") { (connectionId: String, accepted: Bool) in
      guard let conn = self.connections[connectionId] else { throw VoidSshError.unknownConnection }
      if accepted {
        conn.hostKeyConfirmed = true
      } else {
        self.closeConnection(connectionId, reason: "host key rejected")
      }
    }

    AsyncFunction("authenticatePassword") { (connectionId: String, username: String, password: String) in
      let conn = try self.requireConfirmed(connectionId)
      conn.session.authenticate(byPassword: password)
      guard conn.session.isAuthorized else { throw VoidSshError.authFailed }
      self.sendEvent("onStatus", ["connectionId": connectionId, "status": "authenticated"])
    }

    AsyncFunction("authenticateKey") { (connectionId: String, username: String, privateKeyOpenSsh: String, passphrase: String?) in
      let conn = try self.requireConfirmed(connectionId)
      // NMSSH's public-key auth takes file paths, not in-memory PEM — write
      // to a NSTemporaryDirectory() file for the duration of the call and
      // remove it immediately after, since the Keychain (not disk) is our
      // real secret store.
      let tmpURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString)
      try privateKeyOpenSsh.write(to: tmpURL, atomically: true, encoding: .utf8)
      defer { try? FileManager.default.removeItem(at: tmpURL) }

      conn.session.authenticate(byInMemoryPublicKey: nil, privateKey: tmpURL.path, andPassword: passphrase)
      guard conn.session.isAuthorized else { throw VoidSshError.authFailed }
      self.sendEvent("onStatus", ["connectionId": connectionId, "status": "authenticated"])
    }

    AsyncFunction("startShell") { (connectionId: String, cols: Int, rows: Int) in
      guard let conn = self.connections[connectionId] else { throw VoidSshError.unknownConnection }
      let channel = conn.session.channel
      channel.delegate = self
      channel.requestPty = true
      channel.ptyTerminalType = NMSSHChannelPtyTerminal.xterm

      var startError: NSError?
      channel.startShell(&startError)
      if let startError { throw startError }

      channel.requestSizeWidth(UInt(cols), height: UInt(rows))

      self.sendEvent("onStatus", ["connectionId": connectionId, "status": "shellReady"])
    }

    Function("write") { (connectionId: String, data: String) in
      guard let conn = self.connections[connectionId] else { return }
      var error: NSError?
      conn.session.channel.write(data, error: &error, timeout: 0)
    }

    Function("resize") { (connectionId: String, cols: Int, rows: Int) in
      guard let conn = self.connections[connectionId] else { return }
      conn.session.channel.requestSizeWidth(UInt(cols), height: UInt(rows))
    }

    Function("disconnect") { (connectionId: String) in
      self.closeConnection(connectionId, reason: "closed by app")
    }

    AsyncFunction("generateEd25519KeyPair") { (comment: String) -> [String: String] in
      let priv = Curve25519.Signing.PrivateKey()
      let seed = [UInt8](priv.rawRepresentation)
      let pub = [UInt8](priv.publicKey.rawRepresentation)

      let publicBlob = Self.encodeSshEd25519PublicKey(pub)
      let privateKeyOpenSsh = Self.encodeOpenSshEd25519PrivateKey(seed: seed, pub: pub, comment: comment)
      let fingerprint = "SHA256:" + Self.base64NoPad(Data(SHA256.hash(data: Data(publicBlob))))
      let publicKeySsh = "\(keyType) \(Data(publicBlob).base64EncodedString()) \(comment)"

      return [
        "privateKeyOpenSsh": privateKeyOpenSsh,
        "publicKeySsh": publicKeySsh,
        "fingerprintSha256": fingerprint,
      ]
    }

    OnDestroy {
      for id in Array(self.connections.keys) {
        self.closeConnection(id, reason: "module destroyed")
      }
    }
  }

  // MARK: - NMSSHChannelDelegate

  public func channel(_ channel: NMSSHChannel, didReadData message: String) {
    guard let connectionId = connections.first(where: { $0.value.session.channel === channel })?.key else { return }
    let base64 = Data(message.utf8).base64EncodedString()
    sendEvent("onData", ["connectionId": connectionId, "base64": base64])
  }

  public func channel(_ channel: NMSSHChannel, didReadError error: String) {
    guard let connectionId = connections.first(where: { $0.value.session.channel === channel })?.key else { return }
    sendEvent("onStatus", ["connectionId": connectionId, "status": "error", "message": error])
  }

  // MARK: - Helpers

  private func requireConfirmed(_ connectionId: String) throws -> LiveConnection {
    guard let conn = connections[connectionId] else { throw VoidSshError.unknownConnection }
    guard conn.hostKeyConfirmed else { throw VoidSshError.hostKeyNotVerified }
    return conn
  }

  private func closeConnection(_ connectionId: String, reason: String) {
    lock.lock()
    let conn = connections.removeValue(forKey: connectionId)
    lock.unlock()
    guard let conn, !conn.closed else { return }
    conn.closed = true
    conn.session.channel.closeShell()
    conn.session.disconnect()
    sendEvent("onStatus", ["connectionId": connectionId, "status": "closed", "message": reason])
  }

  private static func base64NoPad(_ data: Data) -> String {
    var s = data.base64EncodedString()
    while s.hasSuffix("=") { s.removeLast() }
    return s
  }

  private static func writeSshString(_ out: inout [UInt8], _ bytes: [UInt8]) {
    let len = UInt32(bytes.count)
    out.append(UInt8((len >> 24) & 0xFF))
    out.append(UInt8((len >> 16) & 0xFF))
    out.append(UInt8((len >> 8) & 0xFF))
    out.append(UInt8(len & 0xFF))
    out.append(contentsOf: bytes)
  }

  private static func writeSshUInt32(_ out: inout [UInt8], _ value: UInt32) {
    out.append(UInt8((value >> 24) & 0xFF))
    out.append(UInt8((value >> 16) & 0xFF))
    out.append(UInt8((value >> 8) & 0xFF))
    out.append(UInt8(value & 0xFF))
  }

  private static func encodeSshEd25519PublicKey(_ pub: [UInt8]) -> [UInt8] {
    var out: [UInt8] = []
    writeSshString(&out, Array(keyType.utf8))
    writeSshString(&out, pub)
    return out
  }

  /// OpenSSH private-key container (PROTOCOL.key), unencrypted — the file
  /// only ever lives inside the Keychain, never on plain disk. Mirrors
  /// modules/void-ssh/android's Kotlin implementation byte-for-byte; keep
  /// the two in sync if either changes.
  private static func encodeOpenSshEd25519PrivateKey(seed: [UInt8], pub: [UInt8], comment: String) -> String {
    let pubBlob = encodeSshEd25519PublicKey(pub)

    var inner: [UInt8] = []
    var checkintBytes = [UInt8](repeating: 0, count: 4)
    _ = SecRandomCopyBytes(kSecRandomDefault, 4, &checkintBytes)
    inner.append(contentsOf: checkintBytes)
    inner.append(contentsOf: checkintBytes)
    writeSshString(&inner, Array(keyType.utf8))
    writeSshString(&inner, pub)
    writeSshString(&inner, seed + pub) // "sk" field: 32-byte seed || 32-byte pubkey
    writeSshString(&inner, Array(comment.utf8))
    var padByte: UInt8 = 1
    while inner.count % 8 != 0 {
      inner.append(padByte)
      padByte += 1
    }

    var out: [UInt8] = Array("openssh-key-v1".utf8)
    out.append(0) // NUL terminator -- magic is "openssh-key-v1\0", 15 bytes total
    writeSshString(&out, Array("none".utf8)) // ciphername
    writeSshString(&out, Array("none".utf8)) // kdfname
    writeSshString(&out, []) // kdfoptions
    writeSshUInt32(&out, 1) // number of keys
    writeSshString(&out, pubBlob)
    writeSshString(&out, inner)

    let b64 = Data(out).base64EncodedString()
    let wrapped = stride(from: 0, to: b64.count, by: 70).map { i -> String in
      let start = b64.index(b64.startIndex, offsetBy: i)
      let end = b64.index(start, offsetBy: 70, limitedBy: b64.endIndex) ?? b64.endIndex
      return String(b64[start..<end])
    }.joined(separator: "\n")

    return "-----BEGIN OPENSSH PRIVATE KEY-----\n\(wrapped)\n-----END OPENSSH PRIVATE KEY-----\n"
  }
}
