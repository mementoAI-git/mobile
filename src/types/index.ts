// Core domain types — ported verbatim from web/src/utility/interface.ts

export interface IFile {
  url: string;
  name: string;
  size: string | number;
  duration?: number;
  type?: string;
  _id: string;
  thumbnail?: string;
}

export interface IAuth {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
}

interface IUserPreferences {
  communication_style?: 'formal' | 'casual' | 'friendly' | 'professional';
  topics_of_interest?: string[];
  conversation_tone?: 'upbeat' | 'calm' | 'analytical' | 'creative';
  response_length?: 'short' | 'medium' | 'long';
}

interface IUserContext {
  important_notes?: string[];
  key_preferences?: string[];
  conversation_history_summary?: string;
  emotional_state_trends?: string[];
  goals_and_aspirations?: string[];
  self_description: string;
  current_priority: string;
  join_reasons: string[];
}

export interface IPersona {
  _id?: string;
  user: string;
  important_notes?: string[];
  key_preferences?: string[];
  conversation_history_summary?: string;
  emotional_state_trends?: string[];
  goals_and_aspirations?: string[];
  self_description?: string;
  current_priority?: string[];
  join_reasons?: string[];
  audience?: string[];
  communication_style?: string[];
  last_array_update?: string | null;
  last_summarized_at?: string | null;
  last_update?: Record<string, string>;
  last_summarized?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface IUser {
  _id?: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  gender: string;
  phone_number: string;
  dob: string;
  country: string;
  password: string;
  onboarded: boolean;
  onboarding_status: 'never' | 'skipped' | 'completed';
  providers: string[];
  preferences: IUserPreferences;
  context: IUserContext;
  verified: boolean;
  private_key: string;
  public_key: string;
  two_factor: {
    secret: string;
    enabled: boolean;
  };
  location?: string;
  picture: string;
  picture_url?: string;
  last_seen: string;
  streak: number;
  bg_music?: string;
  chat_voice?: string | null;
  fullname?: string | null;
  newsletter_subscriber: boolean;
  created_at: string;
  onboarding_step_reached?: number;
  /** The single unified Host Chat thread for this user (mirrors web primary_conversation_id). */
  primary_conversation_id?: string | null;
}

export interface IMemoryAccessItem {
  _id?: string;
  name: string;
  color?: number;
}

export interface IMemory {
  _id: string;
  title: string;
  body: string;
  user: string;
  attachments: IFile[];
  tags: string[];
  type: string;
  status: string;
  level: number;
  refrence: string;
  prompt?: string;
  last_opened: string;
  created_at: string;
  updated_at: string;
  bookmarked?: boolean;
  category?: string;
  summary?: string;
  topics?: string[];
  groups?: IMemoryAccessItem[];
  beneficiaries?: IMemoryAccessItem[];
  /** Quick capture / daily-prompt enrichment state — mirrors web enrichment_status */
  enrichment_status?: 'pending' | 'completed' | 'failed';
  /** Source of capture — 'quick' for voice/quick-capture memories */
  capture_source?: 'quick' | 'manual' | 'prompt';
  /** Prompt type for daily-prompt reflections */
  prompt_type?: 'static' | 'ai-generated';
}

export interface IPagination<T> {
  docs: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
  nextPage: null | number;
  page: number;
  pagingCounter: number;
  prevPage: null | number;
  totalDocs: number;
  totalPages: number;
}

type IBeneficiaryUser = Pick<IUser, 'email' | 'first_name' | 'last_name' | 'picture_url'>;

export interface IBeneficiary {
  _id?: string;
  name: string;
  email: string;
  relationship: string;
  level: number;
  user: IBeneficiaryUser;
  benefactor: IBeneficiaryUser;
  accepted_at?: string;
  status?: string;
}

export interface IGroupMember {
  _id?: string;
  name: string;
  email: string;
  relationship?: string;
  status?: string;
}

export interface IGroup {
  _id: string;
  name: string;
  description: string;
  user: string;
  members: Array<string | IGroupMember>;
  created_at: string;
  updated_at: string;
  color?: number;
}

export type CreateGroupBody = { name: string; description?: string; color?: number };
export type UpdateGroupBody = { name?: string; description?: string; color?: number };
export type AddGroupMembersBody = { beneficiaryIds: string[] };

export interface ICapsule {
  _id?: string;
  user: string;
  recipients: IUser[];
  schedule_date?: string;
  title: string;
  body: string;
  attachments: IFile[];
  memories?: IMemory[];
  status: 'draft' | 'scheduled' | 'delivered' | 'pause' | 'failed' | 'deleted';
  style?: {
    themeId?: string;
    backgroundColor: string;
    fontSize: string;
    textColor?: string;
    headerColor?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface IPrompt {
  _id?: string;
  title: string;
  type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface IPromptWithAnswer extends IPrompt {
  answered: boolean;
}

export interface IDailyPromptCapture {
  pinned_text: string;
  prompt_type: 'ai-generated' | 'static';
  prompt_id?: string;
  reflection_day_key: string;
}

export interface IDashboardPromptSlot {
  slot_kind: 'ai' | 'static';
  prompt: IPrompt;
  ai_prompt_text: string;
  reflection_day_key: string;
  answered: boolean;
  display_label?: string;
}

export interface IMessage {
  _id?: string;
  user: string;
  text: string;
  role: string;
  created_at: string;
}

export interface IOnUploadPayload {
  uri: string;
  file: null;
  id: string;
  progress: number;
  uploadedFile?: IFile | null;
  duration?: number;
}

export interface IUserStats {
  total_memories: number;
  total_conversations: number;
  total_capsules: number;
  streak: number;
  storage_used: number;
  storage_limit: number;
}

export interface ICapsuleStats {
  total: number;
  scheduled: number;
  delivered: number;
  draft: number;
  // API may return snake_case variants
  total_count?: number;
  scheduled_count?: number;
  delivered_count?: number;
  draft_count?: number;
  pause_count?: number;
  paused_count?: number;
  frozen?: number;
}
