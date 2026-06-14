import { create } from 'zustand';

export type SheetName =
  | 'create-memory'
  | 'create-capsule'
  | 'add-beneficiary'
  | 'create-group'
  | 'group-actions'
  | 'share-memory'
  | 'search-memory'
  | 'memory-detail'
  | 'memory-actions'
  | 'capsule-actions'
  | 'capsule-detail'
  | 'quick-capture'
  | 'memory-insights'
  | 'chat-actions'
  | 'feedback'
  | 'upgrade-prompt'
  | 'select'
  | 'publish-article'
  | 'streak'
  | 'story-drafts'
  | null;

interface UiState {
  activeSheet: SheetName;
  sheetProps: Record<string, any>;
  pendingDeepLink: any; // Can be string or { pathname, params }
  setPendingDeepLink: (link: any) => void;
  openSheet: (name: SheetName, props?: Record<string, any>) => void;
  closeSheet: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  sheetProps: {},
  pendingDeepLink: null,
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
  openSheet: (name, props = {}) => set({ activeSheet: name, sheetProps: props }),
  closeSheet: () => set({ activeSheet: null, sheetProps: {} }),
}));
