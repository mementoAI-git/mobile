export interface NativeMediaMenuProps {
  /** Diameter of the round trigger button. */
  size: number;
  onGallery?: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  onFile?: () => void;
  isRecording?: boolean;
}
