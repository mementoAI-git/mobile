package io.mymemento.voice

import com.facebook.react.bridge.Promise
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

  // Compresses off the JS thread. On failure the WAV is left untouched, so
  // callers keep (and can upload) it.
  override fun convertRecordingToM4A(wavPath: String, promise: Promise) {
    converter.execute {
      try {
        promise.resolve(MementoRecordingConverter.convertToM4A(wavPath))
      } catch (error: Throwable) {
        promise.reject("E_CONVERT", error.message ?: "Could not compress the recording.", error)
      }
    }
  }

  private external fun nativeInstall(runtimePointer: Long)

  companion object {
    /** One conversion at a time; recordings are converted once, after a call. */
    private val converter = java.util.concurrent.Executors.newSingleThreadExecutor()

    const val NAME = "MementoVoiceAudio"

    init {
      // Our library links against react-native-audio-api's shared library.
      System.loadLibrary("react-native-audio-api")
      System.loadLibrary("mementovoice")
    }
  }
}
