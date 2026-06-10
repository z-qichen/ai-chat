/**
 * src/config.ts —— 全局配置
 *
 * 从环境变量加载所有配置项，提供类型安全的配置对象。
 */
import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  host: process.env.HOST ?? '0.0.0.0',

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: '7d',
  },

  db: {
    path: process.env.DATABASE_PATH ?? './data/ai-chat.db',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? './data/files',
    maxSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760', 10),
  },

  /** 支持的模型列表 */
  models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro', 'deepseek-v4-flash'] as readonly string[],
} as const
