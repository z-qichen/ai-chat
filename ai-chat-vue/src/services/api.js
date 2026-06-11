/**
 * services/api.ts —— 后端 API HTTP 客户端
 *
 * 封装与 Fastify.js 后端的通信接口，包括：
 *   - 会话 CRUD（列表、创建、更新标题、删除）
 *   - 消息分页加载（游标分页，优先返回最新消息）
 *   - 消息新增与 SSE 流式回复
 *
 * 注：目前后端尚未部署，API 调用会失败。当前前端以本地模式运行，
 *     会话元数据存 localStorage，消息缓存在 Pinia 内存中。
 *     后端就绪后，取消注释各方法内的 fetch 调用即可接入。
 */
/** 后端 API 基础地址 */
const BASE = 'http://localhost:4000/api';
/** localStorage token key */
const TOKEN_KEY = 'ai-chat-token';
/** 统一请求封装：自动附加 JSON 头、Token 与错误处理 */
async function request(path, options) {
    const headers = {};
    if (options?.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
    });
    if (!res.ok) {
        const body = await res.text();
        let message = `请求失败 (${res.status})`;
        try {
            const parsed = JSON.parse(body);
            message = parsed.error || parsed.message || message;
        }
        catch { }
        throw new Error(message);
    }
    return res.json();
}
// ---- 认证 API ----
/** 用户注册 */
export function register(username, password) {
    return request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}
/** 用户登录 */
export function login(username, password) {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}
// ---- 会话 API ----
/** 获取所有会话元数据列表（用于侧边栏同步） */
export function getConversations() {
    return request('/conversations');
}
/** 创建新会话 */
export function createConversation(title) {
    return request('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
    });
}
/** 更新会话标题 */
export function updateConversation(id, title) {
    return request(`/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
    });
}
/** 删除会话（级联删除所有消息） */
export function deleteConversation(id) {
    return request(`/conversations/${id}`, { method: 'DELETE' });
}
/**
 * 获取会话消息（游标分页）
 *
 * @param id      会话 ID
 * @param before  游标：返回早于此消息 ID 的一页（不传则返回最新一页）
 * @param limit   每页条数，默认 50
 */
export function getMessages(id, before, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before)
        params.set('before', before);
    return request(`/conversations/${id}/messages?${params}`);
}
/**
 * 新增一条消息（用户发送或 AI 回复）
 *
 * @param id       会话 ID
 * @param role     角色：user / assistant / system
 * @param content  消息内容
 */
export function addMessage(id, role, content) {
    return request(`/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ role, content }),
    });
}
/**
 * SSE 流式 AI 回复（异步生成器）
 *
 * 后端对接 DeepSeek API，通过 SSE 逐块返回生成内容。
 * 消费方式与 services/chat.ts 的 chatStream() 一致。
 *
 * @param id       会话 ID
 * @param model    模型名称
 * @param thinking 是否开启深度思考模式
 * @param signal   AbortSignal 用于取消请求
 */
export async function* streamReply(id, model, thinking, signal) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const body = { model };
    if (thinking) {
        body.thinking = { type: 'enabled' };
    }
    const res = await fetch(`${BASE}/conversations/${id}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`流式请求失败 ${res.status}: ${body}`);
    }
    const reader = res.body?.getReader();
    if (!reader)
        throw new Error('响应体不可读');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:'))
                continue;
            const payload = trimmed.slice(5).trim();
            try {
                const parsed = JSON.parse(payload);
                if (parsed.error) {
                    throw new Error(parsed.error);
                }
                yield {
                    content: parsed.content,
                    done: parsed.done,
                    type: parsed.type,
                    aborted: parsed.aborted,
                };
                if (parsed.done)
                    return;
            }
            catch (e) {
                if (e instanceof SyntaxError)
                    continue;
                throw e;
            }
        }
    }
    yield { content: '', done: true };
}
// ---- 流式对话控制 API ----
/** 停止当前对话的流式生成 */
export async function stopChat(id) {
    return request(`/conversations/${id}/chat/stop`, { method: 'POST' });
}
/**
 * 从上次中断处继续生成（SSE 流式，异步生成器）
 *
 * 行为与 streamReply 一致，仅请求 URL 不同。
 * 后端会使用已保存的部分 assistant 内容作为上下文，调 DeepSeek 继续输出。
 */
export async function* continueChat(id, model, thinking, signal) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const body = { model };
    if (thinking) {
        body.thinking = { type: 'enabled' };
    }
    const res = await fetch(`${BASE}/conversations/${id}/chat/continue`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`继续生成请求失败 ${res.status}: ${errBody}`);
    }
    const reader = res.body?.getReader();
    if (!reader)
        throw new Error('响应体不可读');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:'))
                continue;
            const payload = trimmed.slice(5).trim();
            try {
                const parsed = JSON.parse(payload);
                if (parsed.error) {
                    throw new Error(parsed.error);
                }
                yield {
                    content: parsed.content,
                    done: parsed.done,
                    type: parsed.type,
                    aborted: parsed.aborted,
                };
                if (parsed.done)
                    return;
            }
            catch (e) {
                if (e instanceof SyntaxError)
                    continue;
                throw e;
            }
        }
    }
    yield { content: '', done: true };
}
/**
 * 校验模型名称是否可用
 *
 * 后端校验逻辑：
 * 1. 非空格式检查
 * 2. 精确匹配可用模型列表（忽略大小写）
 * 3. 匹配失败时通过编辑距离算法给出最接近的建议
 *
 * 无需认证
 */
export function validateModel(model) {
    return request('/models/validate', {
        method: 'POST',
        body: JSON.stringify({ model }),
    });
}
