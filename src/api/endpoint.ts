export default {
  // auth
  login: '/auth/login',
  register: '/auth/register',
  sendLink: '/auth/send-link',
  verifyEmail: '/auth/verify-email',
  refreshToken: '/auth/refresh-token',
  logout: '/auth/logout',
  logoutOther: '/auth/logout/other',
  oauth: '/auth/oauth/',
  setPassword: '/auth/set-password',
  verify2FALogin: '/auth/2fa/verify',
  passkeyRegisterBegin: '/auth/passkey/register/begin',
  passkeyRegisterComplete: '/auth/passkey/register/complete',
  passkeyLoginBegin: '/auth/passkey/login/begin',
  passkeyLoginComplete: '/auth/passkey/login/complete',

  // user
  profile: '/users/profile',
  listPasskeys: '/users/passkeys',
  deletePasskey: '/users/passkeys/:credential_id',
  userContext: '/users/context',
  persona: '/users/persona',
  personaMemoryInsightsSummary: '/users/persona/memory-insights-summary',
  completeOnboarding: '/users/complete-onboarding',
  uploadPicture: '/users/upload-picture',
  changePassword: '/users/change-password',
  setup2FA: '/users/2fa/setup',
  verifyTOTP: '/users/2fa/verify',
  disable2FA: '/users/2fa/disable',
  deleteAccount: '/users/account',
  userStats: '/users/stats',

  // beneficiaries
  beneficiaries: '/beneficiaries',
  beneficiary: '/beneficiaries/:id',
  resendInvite: '/beneficiaries/invite/resend',
  getInvite: '/beneficiaries/invite/',
  acceptInvite: '/beneficiaries/invite/accept',

  // groups
  groups: '/groups',
  group: '/groups/:id',
  groupsSearch: '/groups/search',
  groupMembers: '/groups/:id/members',
  groupMember: '/groups/:id/members/:beneficiaryId',

  // files
  upload: '/files/upload',
  files: '/files',

  // push devices
  pushDevices: '/push-devices',

  // prompts
  prompts: '/prompts',
  suggestions: '/prompts/suggestions',
  replyPrompt: '/prompts/reply',
  promptDetails: '/prompts/',
  promptCategories: '/prompts/categories/',
  overviewPrompt: '/prompts/suggestions/overview',

  // memories
  memories: '/memories',
  memory: '/memories/:id',
  conversationAttachments: '/memories/:id/attachments',
  bookmarkMemory: '/memories/:id/bookmark',
  conversations: '/memories/conversations',
  stories: '/memories/stories',
  memoryPrompt: '/memories/prompt',
  restoreMemory: '/memories/:id/restore',
  memoriesStats: '/memories/stats',
  removeFileFromMemory: '/memories/remove-file',
  addMessageToMemory: '/memories/add-message',
  conversationEnrichment: '/memories/:id/enrichment',

  memoriesQuickCapture: '/memories/quick-capture',

  // ai
  aiPrompt: '/ai/prompt',
  aiGreet: '/ai/prompt/greet',
  aiPromptMessage: '/ai/prompt/messages',
  transcription: '/ai/transcribe-audio',
  startConversation: '/ai/conversation/new',
  ephemeralToken: '/ai/ephemeral-token',
  generateTags: '/ai/generate-tags',

  // capsule
  capsule: '/capsule',
  capsuleById: '/capsule/:id',
  capsuleDelete: '/capsule/:id',
  capsuleStats: '/capsule/stats',

  // activities
  activities: '/activities',

  // feedback
  feedback: '/feedback',

  // onboarding (Groot)
  onboardingDetails: '/users/onboarding-details',
  onboarding: '/users/onboarding',
  onboardingSkip: '/users/onboarding/skip',
  hostOnboardingChatPrompt: '/users/onboarding/chat/prompt',

  // billing
  billingSubscription: '/billing/subscription',
  billingCheckout: '/billing/checkout',
  billingUsage: '/billing/usage',
  billingPortal: '/billing/portal',
  billingPromoRedeem: '/billing/promo/redeem',
  billingInvoices: '/billing/invoices',
  billingCancel: '/billing/cancel',
  billingResume: '/billing/resume',
};
