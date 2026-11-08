# Voice previews

Copied from web (`Web/memento-web/src/assets/audio/voice-previews`), named
`<voice id>-<line index>.mp3`. The index points into `VOICE_PREVIEW_LINES` in
`src/features/chat/voice-preview-assets.ts`: public-domain lines from Jane
Austen's *Pride and Prejudice*.

Generated with Google gemini-2.5-flash-preview-tts by web's
`scripts/generate-voice-previews.mjs`, using the same prebuilt voice names as
the voice catalog (denver: Fenrir, sue: Aoede, josef: Enceladus, hannah: Kore,
maya: Leda, leo: Puck). No user data or credentials are included.

When web records a new clip, copy it here and add it to `VOICE_PREVIEW_CLIPS`.
