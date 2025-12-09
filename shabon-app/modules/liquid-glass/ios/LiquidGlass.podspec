Pod::Spec.new do |s|
  s.name           = 'LiquidGlass'
  s.version        = '1.0.0'
  s.summary        = 'iOS 26 Liquid Glass effect for Expo'
  s.description    = 'Native Metal shader-based Liquid Glass UI component'
  s.author         = 'shabon'
  s.homepage       = 'https://github.com/shabon'
  s.platforms      = { :ios => '17.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'MTL_ENABLE_DEBUG_INFO' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
  
  # Metal shaders need to be compiled into the default library
  s.resources = ['**/*.metal']
end

