"use strict";
/**
 * utils/stream.ts —— SSE 流式解析工具（待实现）
 *
 * 设计意图：
 * 将 services/chat.ts 中的 SSE 流解析逻辑抽离为独立工具函数，
 * 使其可复用且易于单独测试。
 *
 * 计划提供的函数：
 *   - parseSSEStream(reader)  → 将 ReadableStream reader 转为 AsyncGenerator<StreamChunk>
 *   - createSSERequest(url, body) → 发起 SSE POST 请求并返回解析后的流
 *
 * 当前状态：占位空文件，逻辑暂留在 services/chat.ts 的 chatStream() 函数内。
 */
