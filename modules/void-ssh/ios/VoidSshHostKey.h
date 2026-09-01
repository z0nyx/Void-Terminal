#import <Foundation/Foundation.h>
#import <NMSSH/NMSSH.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * NMSSH doesn't expose a host-key fingerprint API itself, but it does
 * expose the raw `LIBSSH2_SESSION *` (its `session` property) precisely so
 * callers can drop down to libssh2 for cases like this. Doing that from
 * Objective-C (this file) rather than Swift avoids needing a separate
 * Clang module for libssh2's C headers just for two calls.
 */
@interface VoidSshHostKey : NSObject

/// Returns the OpenSSH-style "SHA256:<base64>" fingerprint and key type (e.g. "ssh-ed25519") for a connected (not yet authenticated) session.
+ (nullable NSString *)fingerprintForSession:(NMSSHSession *)session type:(NSString * _Nonnull * _Nonnull)outType;

@end

NS_ASSUME_NONNULL_END
