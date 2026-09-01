#import "VoidSshHostKey.h"
#import <CommonCrypto/CommonDigest.h>
#import <libssh2.h>

@implementation VoidSshHostKey

+ (nullable NSString *)fingerprintForSession:(NMSSHSession *)session type:(NSString **)outType {
  LIBSSH2_SESSION *raw = session.session;
  if (raw == NULL) {
    *outType = @"";
    return nil;
  }

  size_t len = 0;
  int type = 0;
  const char *blob = libssh2_session_hostkey(raw, &len, &type);
  if (blob == NULL || len == 0) {
    *outType = @"";
    return nil;
  }

  switch (type) {
    case LIBSSH2_HOSTKEY_TYPE_ED25519:
      *outType = @"ssh-ed25519";
      break;
    case LIBSSH2_HOSTKEY_TYPE_ECDSA_256:
      *outType = @"ecdsa-sha2-nistp256";
      break;
    case LIBSSH2_HOSTKEY_TYPE_ECDSA_384:
      *outType = @"ecdsa-sha2-nistp384";
      break;
    case LIBSSH2_HOSTKEY_TYPE_ECDSA_521:
      *outType = @"ecdsa-sha2-nistp521";
      break;
    case LIBSSH2_HOSTKEY_TYPE_DSS:
      *outType = @"ssh-dss";
      break;
    case LIBSSH2_HOSTKEY_TYPE_RSA:
    default:
      *outType = @"ssh-rsa";
      break;
  }

  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(blob, (CC_LONG)len, digest);
  NSData *digestData = [NSData dataWithBytes:digest length:CC_SHA256_DIGEST_LENGTH];
  NSString *b64 = [digestData base64EncodedStringWithOptions:0];
  while ([b64 hasSuffix:@"="]) {
    b64 = [b64 substringToIndex:b64.length - 1];
  }
  return [NSString stringWithFormat:@"SHA256:%@", b64];
}

@end
