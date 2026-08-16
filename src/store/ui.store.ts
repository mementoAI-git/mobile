import { create } from 'zustand';
import type { Href } from 'expo-router';
import type { StoryDraft } from '@/components/sheets/DraftsSheet';

export type SheetName =
  | 'create-memory'
  | 'create-capsule'
  | 'add-beneficiary'
  | 'beneficiary-actions'
  | 'create-group'
  | 'share-memory'
  | 'add-member-to-group'
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
  | 'edit-profile'
  | 'change-password'
  | 'setup-two-factor'
  | 'security-confirmation'
  | null;

interface UiState {
  appReady: boolean;
  activeSheet: SheetName;
  sheetProps: Record<string, any>;
  pendingDeepLink: Href | null;
  setAppReady: (ready: boolean) => void;
  setPendingDeepLink: (link: Href | null) => void;
  openSheet: (name: SheetName, props?: Record<string, any>) => void;
  closeSheet: () => void;
  /** Story drafts — single source of truth shared between editor + DraftsSheet */
  storyDrafts: StoryDraft[];
  setStoryDrafts: (drafts: StoryDraft[]) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  appReady: false,
  activeSheet: null,
  sheetProps: {},
  pendingDeepLink: null,
  setAppReady: (ready) => set({ appReady: ready }),
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
  openSheet: (name, props = {}) => {
    if (!get().appReady) return;
    set({ activeSheet: name, sheetProps: props });
  },
  closeSheet: () => set({ activeSheet: null, sheetProps: {} }),
  storyDrafts: [],
  setStoryDrafts: (drafts) => set({ storyDrafts: drafts }),
}));
