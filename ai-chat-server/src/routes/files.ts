/**
 * src/routes/files.ts —— 文件上传路由
 *
 * POST /api/files/upload — 上传文件（multipart）
 *
 * 需要 JWT 认证，文件按用户隔离存储。
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth'
import { saveFile, getFileRecord } from '../services/file'
import { config } from '../config'

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/xml',
])

const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
  '.kt', '.scala', '.sh', '.bash', '.yaml', '.yml', '.toml',
  '.sql', '.graphql', '.vue', '.svelte', '.xml',
])

function isAllowedFile(mimeType: string, filename: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType)) return true
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  if (CODE_EXTENSIONS.has(ext)) return true
  return false
}

export default async function fileRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.post('/api/files/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId

    const data = await request.file()
    if (!data) {
      reply.code(400)
      return { error: '未提供文件' }
    }

    if (!isAllowedFile(data.mimetype, data.filename)) {
      reply.code(400)
      return { error: `不支持的文件类型: ${data.mimetype}` }
    }

    const buffer = await data.toBuffer()

    if (buffer.length > config.upload.maxSize) {
      reply.code(413)
      return { error: `文件大小超过限制 (${config.upload.maxSize} 字节)` }
    }

    const file = saveFile(buffer, data.filename, data.mimetype, userId)

    reply.code(201)
    return {
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    }
  })

  app.get('/api/files/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId

    const file = getFileRecord(id)
    if (!file || file.userId !== userId) {
      reply.code(404)
      return { error: '文件不存在' }
    }

    return {
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdAt: file.createdAt,
    }
  })
}
