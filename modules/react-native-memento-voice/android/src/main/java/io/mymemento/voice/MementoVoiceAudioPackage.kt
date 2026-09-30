package io.mymemento.voice

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MementoVoiceAudioPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == MementoVoiceAudioModule.NAME) MementoVoiceAudioModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        MementoVoiceAudioModule.NAME to
          ReactModuleInfo(
            MementoVoiceAudioModule.NAME,
            MementoVoiceAudioModule.NAME,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            true, // isTurboModule
          ),
      )
    }
}
