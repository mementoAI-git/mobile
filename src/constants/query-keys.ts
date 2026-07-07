export const queryKeys = {
  profile: ['profile'] as const,
  userStats: ['user-stats'] as const,
  userContext: ['user-context'] as const,
  persona: ['persona'] as const,

  memories: (params?: object) => ['memories', params] as const,
  memory: (id: string) => ['memory', id] as const,
  memoriesStats: ['memories-stats'] as const,
  conversations: (params?: object) => ['conversations', params] as const,
  stories: (params?: object) => ['stories', params] as const,

  capsules: (filter?: string) => ['capsules', filter] as const,
  capsule: (id: string) => ['capsule', id] as const,
  capsuleStats: ['capsule-stats'] as const,

  prompts: (params?: object) => (params ? (['prompts', params] as const) : (['prompts'] as const)),
  dailyPrompts: (dateKey?: string) => (dateKey ? (['daily-prompts', dateKey] as const) : (['daily-prompts'] as const)),
  promptCategories: ['prompt-categories'] as const,
  categoryDetailsPrompts: (slug?: string, answered?: boolean) =>
    slug ? ['category-details-prompts', slug, answered] as const : ['category-details-prompts'] as const,
  overviewPrompts: ['overview-prompts'] as const,
  memoryByPrompt: (promptId: string) => ['memory-by-prompt', promptId] as const,
  promptMessages: (id: string) => ['prompt-messages', id] as const,

  beneficiaries: ['beneficiaries'] as const,

  groups: ['groups'] as const,
  groupMembers: (id: string) => ['group-members', id] as const,

  activities: ['activities'] as const,
  files: ['files'] as const,

  subscription: ['subscription'] as const,
};
