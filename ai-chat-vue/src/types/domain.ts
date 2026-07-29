/**
 * types/domain.ts —— 前端领域模型类型定义
 *
 * 定义应用核心的领域实体接口，包括会话、消息、用户、记忆等。
 * 这些类型与后端数据结构解耦，反映前端视图层的业务模型。
 */

/** 用户上传的附件文件信息 */
export interface AttachedFile {
  /** 原始文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 预览 URL（图片文件才有，文档为空） */
  previewUrl: string | null
  /** 是否为图片类型文件 */
  isImage: boolean
}

/** 对话中的单条消息 */
export interface Message {
  /** 消息唯一标识，格式 `msg_<timestamp>_<seq>` */
  id: string
  /** 消息发送方角色：user=用户, assistant=AI助手, system=系统提示 */
  role: 'user' | 'assistant' | 'system'
  /** 消息文本内容（Markdown 格式） */
  content: string
  /** 消息创建时间戳 */
  timestamp: number
  /** 随消息附带的文件列表（可选） */
  files?: AttachedFile[]
  /** 深度思考过程文本（仅 assistant 消息，开启深度思考模式时有值） */
  thinking?: string
  /** 工具调用记录（仅 assistant 消息，Agent Loop 中产生的工具调用） */
  toolCalls?: Array<{
    name: string
    args: string
    result?: string
    /** 联网搜索结果（name=web_search 时有值） */
    searchResults?: Array<{
      title: string
      url: string
      content: string
      score: number
    }>
    /** AI 摘要（name=web_search 时有值） */
    answer?: string
    /** 搜索耗时秒数（name=web_search 时有值） */
    responseTime?: number
  }>
}

/** 一个完整的对话会话 */
export interface Conversation {
  /** 会话唯一标识，UUID v4 格式 */
  id: string
  /** 会话标题，默认"新对话"，支持用户编辑修改 */
  title: string
  /** 会话内所有消息记录 */
  messages: Message[]
  /** 当前使用的模型名称 */
  model: string
  /** 会话创建时间戳 */
  createdAt: number
  /** 会话最后更新时间戳 */
  updatedAt: number
}

/** 侧边栏会话元数据（轻量，用于列表展示与本地持久化） */
export interface SessionMeta {
  /** 会话唯一标识，UUID v4 格式 */
  id: string
  /** 会话标题 */
  title: string
  /** 最后更新时间戳（用于排序） */
  updatedAt: number
  /** 消息总数（用于判断会话是否为空） */
  messageCount: number
  /** 关联的定时任务 ID（由定时任务创建时有值） */
  fromTaskId?: string | null
}

/** 应用全局配置（设置页面可编辑） */
export interface AppConfig {
  /** 默认模型名称 */
  model: string
  /** 系统提示词，每次对话自动附加在最前面 */
  systemPrompt: string
}

/** 登录/注册响应的用户信息 */
export interface User {
  id: string
  username: string
}

/** 用户记忆条目 */
export interface MemoryItem {
  id: string
  userId: string
  category: 'identity' | 'address' | 'preference' | 'background' | 'other'
  key: string
  value: string
  confidence: number
  source: 'auto' | 'manual'
  createdAt: number
  updatedAt: number
}

/** 记忆分类中文标签映射 */
export const MEMORY_CATEGORY_LABELS: Record<MemoryItem['category'], string> = {
  identity: '身份',
  address: '住址',
  preference: '偏好',
  background: '背景',
  other: '其他',
}

/** 定时任务 */
export interface ScheduledTask {
  id: string
  userId: string
  title: string
  prompt: string
  frequencyType: 'once' | 'daily' | 'weekly' | 'monthly'
  time: string
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  nextRunAt?: string | null
  lastRunAt?: string | null
  enabled: number
  resultConversationId?: string | null
  expiresAt?: string | null
  /** 是否开启深度思考 (0/1) */
  deepThink: number
  /** 是否开启联网搜索 (0/1) */
  webSearch: number
  createdAt: number
  updatedAt: number
}

/** 频率类型中文标签 */
export const FREQUENCY_LABELS: Record<ScheduledTask['frequencyType'], string> = {
  once: '单次',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
}
