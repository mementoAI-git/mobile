import { create } from 'zustand';
import type { Href } from 'expo-router';
import type { StoryDraft } from '@/components/sheets/DraftsSheet';

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
  pendingDeepLink: Href | null;
  setPendingDeepLink: (link: Href | null) => void;
  openSheet: (name: SheetName, props?: Record<string, any>) => void;
  closeSheet: () => void;
  /** Story drafts — single source of truth shared between editor + DraftsSheet */
  storyDrafts: StoryDraft[];
  setStoryDrafts: (drafts: StoryDraft[]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  sheetProps: {},
  pendingDeepLink: null,
  setPendingDeepLink: (link) => set({ pendingDeepLink: link }),
  openSheet: (name, props = {}) => set({ activeSheet: name, sheetProps: props }),
  closeSheet: () => set({ activeSheet: null, sheetProps: {} }),
  storyDrafts: [],
  setStoryDrafts: (drafts) => set({ storyDrafts: drafts }),
}));
