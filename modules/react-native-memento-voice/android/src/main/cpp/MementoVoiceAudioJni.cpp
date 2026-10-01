#include <jni.h>
#include <jsi/jsi.h>

#include "mementovoice/VoiceSessionHostObject.h"

extern "C" JNIEXPORT void JNICALL
Java_io_mymemento_voice_MementoVoiceAudioModule_nativeInstall(
    JNIEnv * /*env*/,
    jobject /*thiz*/,
    jlong runtimePointer) {
  auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(runtimePointer);
  if (runtime == nullptr) return;
  mementovoice::installVoicePlaybackBindings(*runtime);
}
