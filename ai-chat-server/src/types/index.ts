/**
 * types/index.ts —— 类型统一导出入口
 *
 * 从 domain / api / services 三个子模块 re-export 所有类型，
 * 其余模块统一从 '../types/index' 导入即可。
 */

// 核心领域模型
export type {
  ContentPart,
  ChatMessageContent,
  Message,
  Conversation,
  MemoryItem,
  ExtractMemoryArgs,
  UploadedFile,
  User,
  ScheduledTask,
} from './domain'

// API 请求/响应 DTO
export type {
  ModelItem,
  ModelsListResponse,
  CreateConversationBody,
  UpdateConversationBody,
  PaginationQuery,
  PaginatedResponse,
  ThinkingConfig,
  StreamRequestBody,
  SaveMessageBody,
  StreamRequestWithFiles,
  StreamChunk,
  UploadFileResponse,
  RegisterBody,
  LoginBody,
  JwtPayload,
  AuthResponse,
  ValidateModelBody,
  ValidateModelResponse,
  CreateTaskBody,
  UpdateTaskBody,
} from './api'

// 服务层内部类型
export type {
  BuildMessagesOptions,
  ChatMessage,
  BuildMessagesResult,
  ToolDefinition,
  ToolCallResult,
  ChatResult,
  ChatOptions,
  StreamResult,
  ToolExecutor,
  ToolOptions,
  ProcessedContent,
  TavilyResult,
  TavilyResponse,
} from './services'

// Agent 模块类型
export type {
  AgentConfig,
  AgentSummary,
} from '../agents/types'
