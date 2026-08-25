export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotions',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊',
      '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙',
      '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
      '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
      '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤',
      '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠',
      '🤥', '😶', '🫥', '😐', '😑', '🫨', '😬', '🙄', '😯', '😦',
      '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐',
    ],
  },
  {
    id: 'gestures',
    name: 'Hands & Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
      '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Love',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '💌', '💐', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '✨',
      '🌟', '💫', '⭐️', '🌠', '🎉', '🎊', '🎁', '🎈', '🍾', '🥂',
    ],
  },
  {
    id: 'nature',
    name: 'Animals & Nature',
    icon: '🌱',
    emojis: [
      '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁',
      '🍂', '🍃', '☀️', '🌤️', '⛅️', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
      '🌩️', '⚡️', '🔥', '🌈', '🌊', '🐶', '🐱', '🐭', '🐹', '🐰',
      '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦋', '🐝', '🐞', '🐢', '🐬',
    ],
  },
  {
    id: 'activities',
    name: 'Food & Activities',
    icon: '☕️',
    emojis: [
      '☕️', '🍵', '🧋', '🥤', '🧃', '🍺', '🍻', '🍷', '🍸', '🍹',
      '🥐', '🥯', '🍞', '🥖', '🥨', '🥞', '🧇', '🧀', '🍖', '🍗',
      '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥗',
      '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭',
      '⚽️', '🏀', '🏈', '⚾️', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓',
    ],
  },
];

export function insertEmojiAtPosition(
  currentText: string,
  emoji: string,
  selection: { start: number; end: number } = { start: currentText.length, end: currentText.length }
): { newText: string; newCursor: number } {
  const start = Math.max(0, Math.min(selection.start, currentText.length));
  const end = Math.max(start, Math.min(selection.end, currentText.length));

  const before = currentText.slice(0, start);
  const after = currentText.slice(end);
  const newText = `${before}${emoji}${after}`;
  const newCursor = start + emoji.length;

  return { newText, newCursor };
}
