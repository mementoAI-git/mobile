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
  | 'memory-actions'
  | 'capsule-actions'
  | 'capsule-detail'
  | 'quick-capture'
  | 'memory-insights'
  | 'feedback'
  | 'upgrade-prompt'
  | 'select'
  | 'streak'
  | 'story-drafts'
  | 'edit-profile'
  | 'cancel-subscription-confirmation'
  | 'change-password'
  | 'setup-two-factor'
  | 'security-confirmation'
  | 'voice-call-settings'
  | 'end-voice-session'
  | 'upgrade-success'
  | 'capsule-sealed'
  | 'first-story-milestone'
  | 'voice-debrief'
  | 'guardian-lens'
  | 'export-archive'
  | 'daily-ritual'
  | null;

interface UiState {
  appReady: boolean;
  activeSheet: SheetName;
  sheetProps: Record<string, any>;
  pendingDeepLink: Href | null;
  setAppReady: (ready: boolean) => void;
  setPendingDeepLink: (link: Href | null) => void;
  takePendingDeepLink: () => Href | null;
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
  takePendingDeepLink: () => {
    const link = get().pendingDeepLink;
    set({ pendingDeepLink: null });
    return link;
  },
  openSheet: (name, props = {}) => {
    if (!get().appReady) return;
    set({ activeSheet: name, sheetProps: props });
  },
  closeSheet: () => set({ activeSheet: null, sheetProps: {} }),
  storyDrafts: [],
  setStoryDrafts: (drafts) => set({ storyDrafts: drafts }),
}));
