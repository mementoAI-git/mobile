cmake_minimum_required(VERSION 3.13)
project(mementovoice)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../common/cpp")
file(GLOB MEMENTO_VOICE_SOURCES "${COMMON_CPP_DIR}/mementovoice/*.cpp")

add_library(mementovoice SHARED
  src/main/cpp/MementoVoiceAudioJni.cpp
  ${MEMENTO_VOICE_SOURCES}
)

target_include_directories(mementovoice PRIVATE
  "${COMMON_CPP_DIR}"
  "${COMMON_CPP_DIR}/mementovoice"
)

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)
find_package(react-native-audio-api REQUIRED CONFIG)

target_link_libraries(mementovoice
  ReactAndroid::jsi
  ReactAndroid::reactnative
  fbjni::fbjni
  react-native-audio-api::react-native-audio-api
  android
  log
)
