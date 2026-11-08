// Core domain types — ported verbatim from web/src/utility/interface.ts

export interface IFile {
  url: string;
  name: string;
  size: string | number;
  duration?: number;
  type?: string;
  _id: string;
  thumbnail?: string | null;
  status?: 'processing' | 'ready' | 'failed';
  access?: {
    expires_at: string;
    refresh_endpoint: string;
  };
}

export interface IAuth {
  access_token: string;
  refresh_token: string;
  access_expires_at?: string;
  expires_at: string;
  refresh_expires_at: string;
  onboarding_status?: string;
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
  /** Day of the last activity that counted toward the streak (web streak card). */
  last_task_date?: string | null;
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
  visibility?: 'private' | 'everyone';
  groups?: IMemoryAccessItem[];
  beneficiaries?: IMemoryAccessItem[];
  /** Quick capture / daily-prompt enrichment state — mirrors web enrichment_status */
  enrichment_status?: 'pending' | 'completed' | 'failed';
  /** Source of capture — 'quick' for voice/quick-capture memories */
  capture_source?: 'quick' | 'standard' | 'manual' | 'prompt';
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

type IBeneficiaryUser = Pick<IUser, '_id' | 'email' | 'first_name' | 'last_name' | 'picture_url'>;

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
  about?: string;
  avatar_url?: string;
  avatar_file?: IFile;
  groups?: Array<Pick<IGroup, '_id' | 'name' | 'color'>>;
}

export type CreateBeneficiaryBody = {
  name: string;
  email: string;
  relationship: string;
  /** Group ids, as web add-beneficiary sends them. */
  groups?: string[];
  access_scope?: 'shared_only';
};

export interface IGroupMember {
  user?: IBeneficiaryUser;
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
  recipient_snapshots?: Array<{
    recipient_id: string;
    beneficiary_id?: string;
    linked_user_id?: string;
    email: string;
    display_name?: string;
    delivery_status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed';
    failure_code?: string;
    delivered_at?: string;
  }>;
  recipients_snapshot_version?: number;
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
  source?: import('@/features/explore/question-presentation').ExploreQuestionSource;
  status?: import('@/features/explore/question-presentation').ExploreQuestionStatus;
  _id?: string;
  category?: string;
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

export type IDashboardPromptSlot = ({
  slot_kind: 'ai';
  ai_prompt_text: string;
  prompt?: never;
} | {
  slot_kind: 'static';
  prompt: IPrompt;
  ai_prompt_text?: never;
}) & {
  reflection_day_key: string;
  answered: boolean;
  display_label?: string;
  reply_user_count?: number;
};

export interface IMessageAttachment {
  _id?: string;
  url: string;
  name: string;
  type?: string;
  size?: string | number;
}

export interface IMessage {
  _id?: string;
  user: string;
  text: string;
  role: string;
  created_at: string;
  /** Matches web's `attatchments` field (intentional typo preserved for API parity) */
  attatchments?: IMessageAttachment[];
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
