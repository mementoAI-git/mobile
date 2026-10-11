package io.mymemento.voice

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = MementoVoiceAudioModule.NAME)
class MementoVoiceAudioModule(
  reactContext: ReactApplicationContext,
) : NativeMementoVoiceAudioSpec(reactContext) {
  override fun getName(): String = NAME

  // Runs synchronously on the JS thread, so touching the runtime here is safe.
  override fun install(): Boolean {
    val runtimePointer = reactApplicationContext.javaScriptContextHolder?.get() ?: return false
    if (runtimePointer == 0L) return false
    nativeInstall(runtimePointer)
    return true
  }

  // Android has no voice-processing switch to read back; echo cancellation
  // comes from the voiceCommunication input preset.
  override fun isVoiceProcessingActive(): Boolean = false

  private external fun nativeInstall(runtimePointer: Long)

  companion object {
    const val NAME = "MementoVoiceAudio"

    init {
      // Our library links against react-native-audio-api's shared library.
      System.loadLibrary("react-native-audio-api")
      System.loadLibrary("mementovoice")
    }
  }
}
