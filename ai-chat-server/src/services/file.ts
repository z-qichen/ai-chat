/**
 * src/services/file.ts —— 文件处理服务
 *
 * 统一的文件处理入口，支持：
 * - 文件存储（磁盘 + 数据库元数据）
 * - 文本提取（PDF / DOCX / 纯文本 / 代码）
 * - 图片编码（base64 data URL，用于 Vision API）
 *
 * 所有路由均可复用本服务的处理能力。
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import db from '../database.ts'
import { config } from '../config.ts'
import type { UploadedFile } from '../types/index.ts'

const UPLOAD_DIR = path.resolve(config.upload.dir)

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export interface ProcessedContent {
  textContent: string | null
  imageDataUrl: string | null
}

export function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  userId: string
): UploadedFile {
  const id = randomUUID()
  const ext = path.extname(originalName) || '.bin'
  const storedPath = path.join(UPLOAD_DIR, `${id}${ext}`)

  fs.writeFileSync(storedPath, buffer)

  const file: UploadedFile = {
    id,
    userId,
    originalName,
    mimeType,
    size: buffer.length,
    storedPath,
    createdAt: Date.now(),
  }

  db.prepare(`
    INSERT INTO uploaded_files (id, user_id, original_name, mime_type, size, stored_path, extracted_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(file.id, file.userId, file.originalName, file.mimeType, file.size, file.storedPath, file.extractedText ?? null, file.createdAt)

  return file
}

export async function processFile(fileId: string): Promise<ProcessedContent> {
  const row = db.prepare(`SELECT * FROM uploaded_files WHERE id = ?`).get(fileId) as any
  if (!row) {
    return { textContent: null, imageDataUrl: null }
  }

  const mimeType: string = row.mime_type

  if (mimeType.startsWith('image/')) {
    return processImage(row.stored_path, mimeType)
  }

  if (row.extracted_text) {
    return { textContent: row.extracted_text, imageDataUrl: null }
  }

  const buffer = fs.readFileSync(row.stored_path)
  const textContent = await extractText(buffer, mimeType, row.original_name)

  if (textContent) {
    db.prepare(`UPDATE uploaded_files SET extracted_text = ? WHERE id = ?`).run(textContent, fileId)
  }

  return { textContent, imageDataUrl: null }
}

function processImage(filePath: string, mimeType: string): ProcessedContent {
  const buffer = fs.readFileSync(filePath)
  const base64 = buffer.toString('base64')
  const imageDataUrl = `data:${mimeType};base64,${base64}`
  return { textContent: null, imageDataUrl }
}

export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    if (mimeType === 'text/plain' || isCodeFile(mimeType, filename)) {
      return buffer.toString('utf-8')
    }

    if (mimeType === 'application/pdf') {
      return await extractTextFromPdf(buffer)
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return await extractTextFromDocx(buffer)
    }

    if (
      mimeType === 'application/json' ||
      mimeType === 'text/html' ||
      mimeType === 'text/css' ||
      mimeType === 'text/javascript' ||
      mimeType === 'text/markdown'
    ) {
      return buffer.toString('utf-8')
    }
  } catch {
    return null
  }

  return null
}

function isCodeFile(mimeType: string, filename: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
    '.kt', '.scala', '.sh', '.bash', '.yaml', '.yml', '.toml',
    '.xml', '.sql', '.graphql', '.vue', '.svelte',
  ]
  const ext = path.extname(filename).toLowerCase()
  if (codeExtensions.includes(ext)) {
    return true
  }
  return false
}

async function extractTextFromPdf(buffer: Buffer): Promise<string | null> {
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text?.slice(0, 50000) ?? null
  } catch {
    return null
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string | null> {
  try {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ buffer })
    return result.value?.slice(0, 50000) ?? null
  } catch {
    return null
  }
}

export function encodeImage(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

export function getFileRecord(fileId: string): UploadedFile | null {
  const row = db.prepare(`SELECT * FROM uploaded_files WHERE id = ?`).get(fileId) as any
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    storedPath: row.stored_path,
    extractedText: row.extracted_text,
    createdAt: row.created_at,
  }
}

export function loadFileBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath)
}
