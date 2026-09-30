require "json"

package_json = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name = "MementoVoiceAudio"
  s.version = package_json["version"]
  s.summary = package_json["description"]
  s.homepage = "https://mymemento.io"
  s.license = { :type => "MIT" }
  s.authors = { "Memento" => "engineering@mymemento.io" }
  s.platforms = { :ios => "16.4" }
  s.source = { :path => "." }

  s.source_files = [
    "ios/**/*.{h,mm}",
    "common/cpp/mementovoice/**/*.{h,cpp}"
  ]
  s.header_dir = "mementovoice"
  s.header_mappings_dir = "common/cpp/mementovoice"

  s.dependency "RNAudioAPI"
  s.dependency "React-jsi"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_ROOT)/Headers/Public/RNAudioAPI"',
      '"$(PODS_ROOT)/Headers/Public/React-jsi"',
      '"$(PODS_TARGET_SRCROOT)/common/cpp"'
    ].join(" ")
  }

  install_modules_dependencies(s)
end