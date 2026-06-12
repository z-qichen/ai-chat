/**
 * types/index.ts —— 全局类型定义
 *
 * 本项目所有公用 TypeScript 接口/类型集中在此文件定义。
 * 其他模块通过 `import type { ... } from '@/types'` 引入。
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
}

/** 一个完整的对话会话 */
export interface Conversation {
  /** 会话唯一标识，格式 `conv_<timestamp>` */
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
  /** 会话唯一标识，格式 `conv_<timestamp>` */
  id: string
  /** 会话标题 */
  title: string
  /** 最后更新时间戳（用于排序） */
  updatedAt: number
  /** 消息总数（用于判断会话是否为空） */
  messageCount: number
}

/** 应用全局配置（设置页面可编辑） */
export interface AppConfig {
  /** 默认模型名称 */
  model: string
  /** 系统提示词，每次对话自动附加在最前面 */
  systemPrompt: string
}

/** SSE 流式响应中 yield 的每个数据块 */
export interface StreamChunk {
  /** 本块包含的增量文本内容 */
  content: string
  /** 流是否已结束（true 表示服务端完成响应） */
  done: boolean
  /** 内容类型：thinking=思考过程，answer=最终回答 */
  type?: 'thinking' | 'answer'
  /** 是否被用户中止 */
  aborted?: boolean
}

/** 文件上传 API 响应 */
export interface UploadFileResponse {
  fileId: string
  originalName: string
  mimeType: string
  size: number
}

/** 文件元数据（查询接口返回，含创建时间） */
export interface FileMeta extends UploadFileResponse {
  createdAt: number
}

/** 登录/注册响应的用户信息 */
export interface User {
  id: string
  username: string
}

/** 登录/注册接口返回的完整数据 */
export interface AuthResponse {
  token: string
  user: User
  conversations: Array<{
    id: string
    userId: string
    title: string
    model: string
    createdAt: number
    updatedAt: number
  }>
}
