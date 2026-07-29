/**
 * types/index.ts —— 类型统一导出入口
 *
 * 本项目所有公用类型通过此文件集中导出，
 * 其他模块通过 `import type { ... } from '@/types'` 引入。
 */

export type { AttachedFile, Message, Conversation, SessionMeta, AppConfig, User, MemoryItem, ScheduledTask } from './domain'
export { MEMORY_CATEGORY_LABELS, FREQUENCY_LABELS } from './domain'

export type {
  StreamChunk,
  UploadFileResponse,
  FileMeta,
  AuthResponse,
  RequestOptions,
  PaginatedConversations,
  MessagesResponse,
  ModelItem,
  ValidateModelResponse,
  UserSettingsResponse,
} from './api'
