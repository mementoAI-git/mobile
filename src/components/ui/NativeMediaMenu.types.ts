export interface NativeMediaMenuProps {
  /** Diameter of the round trigger button. */
  size: number;
  onGallery?: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  onFile?: () => void;
  isRecording?: boolean;
  /** `plain` draws only the plus glyph (chat composer); the default sits on a filled circle (editor). */
  tone?: 'filled' | 'plain';
  /** Plus glyph size; defaults to 18. */
  iconSize?: number;
  disabled?: boolean;
}
