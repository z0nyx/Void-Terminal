Pod::Spec.new do |s|
  s.name           = 'VoidSsh'
  s.version        = '1.0.0'
  s.summary        = 'Real interactive SSH shell (raw PTY byte stream) backing the Void Terminal app.'
  s.description    = 'Wraps NMSSH (libssh2) for a real, raw-byte interactive SSH PTY channel — see modules/void-ssh/README.md.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'NMSSH', '~> 2.2.9'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
