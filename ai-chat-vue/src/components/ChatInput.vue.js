/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, nextTick } from 'vue';
import { streamReply, continueChat, stopChat, addMessage } from '@/services/api';
import { useConfigStore } from '@/stores/config';
import { useConversationStore } from '@/stores/conversation';
const props = defineProps();
const configStore = useConfigStore();
const chatStore = useConversationStore();
// ---- 消息 ID 生成 ----
let _msgId = 0;
/** 生成全局唯一的消息 ID */
function genMsgId() {
    return `msg_${Date.now()}_${++_msgId}`;
}
// ---- 输入状态 ----
const inputText = ref(''); // 输入框文本
const deepThinking = ref(false); // 深度思考模式开关
const isGenerating = ref(false); // 是否正在生成 AI 回复
const isAborted = ref(false); // 生成被中断，可继续
const abortController = ref(null); // 当前请求的 AbortController
const activeStreamConversationId = ref(null); // 当前流归属的会话 ID
const textareaRef = ref(null); // 输入框 DOM 引用
const fileInputRef = ref(null); // 隐藏文件 input 引用
const uploadedFiles = ref([]);
/** 支持的图片扩展名 */
const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
/** 支持的文档扩展名 */
const docExts = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx', 'ppt', 'pptx']);
/** 获取文件名扩展名（小写） */
function getFileExt(name) {
    return name.split('.').pop()?.toLowerCase() ?? '';
}
/** 判断是否为图片类型 */
function isImage(file) {
    return file.type.startsWith('image/') || imageExts.has(getFileExt(file.name));
}
let _fileId = 0;
/** 处理文件选择：过滤类型后加入上传列表 */
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = getFileExt(file.name);
        // 只接受图片和文档类型
        if (!imageExts.has(ext) && !docExts.has(ext))
            continue;
        const id = String(++_fileId);
        const previewUrl = isImage(file) ? URL.createObjectURL(file) : null;
        uploadedFiles.value.push({ id, file, previewUrl });
    }
    // 清空 file input 的值，允许重复选择相同文件
    fileInputRef.value.value = '';
}
/** 从上传列表中移除文件（同时释放预览 blob URL） */
function removeFile(id) {
    const idx = uploadedFiles.value.findIndex((f) => f.id === id);
    if (idx === -1)
        return;
    const f = uploadedFiles.value[idx];
    if (f.previewUrl)
        URL.revokeObjectURL(f.previewUrl);
    uploadedFiles.value.splice(idx, 1);
}
// ---- 输入框高度自适应 ----
/** 根据内容自动调整 textarea 高度（最小 1 行，最大 200px） */
function adjustTextareaHeight() {
    const el = textareaRef.value;
    if (!el)
        return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
function onInput() {
    adjustTextareaHeight();
}
// ---- 键盘事件 ----
/** Enter 发送，Shift+Enter 换行 */
function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
}
// ---- 发送消息 ----
/**
 * 启动流式对话，发送用户消息并消费 SSE 回复
 *
 * 同时只允许一个流式请求；
 * 若上次生成被中断，可通过"继续生成"按钮继续，或直接发新消息开始新一轮。
 */
async function send() {
    if (isGenerating.value)
        return;
    const text = inputText.value.trim();
    // 至少要输入文本或上传了文件
    if (!text && uploadedFiles.value.length === 0)
        return;
    const userMessage = text;
    // 构建附件信息（用于消息气泡展示）
    const files = uploadedFiles.value.map((f) => ({
        name: f.file.name,
        size: f.file.size,
        previewUrl: f.previewUrl,
        isImage: f.previewUrl !== null,
    }));
    // 清空输入状态
    inputText.value = '';
    uploadedFiles.value = [];
    nextTick(adjustTextareaHeight);
    if (!userMessage && files.length === 0)
        return;
    const { model } = configStore.config;
    if (!chatStore.currentId) {
        chatStore.createSession();
    }
    const conversationId = chatStore.currentId;
    // 新消息覆盖中断状态
    isAborted.value = false;
    // 添加用户消息到本地 Store
    chatStore.addMessageToSession(conversationId, {
        id: genMsgId(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
        files: files.length > 0 ? files : undefined,
    });
    // 保存用户消息到后端
    try {
        await addMessage(conversationId, 'user', userMessage);
    }
    catch (err) {
        console.error('保存用户消息失败:', err);
    }
    // 添加空的 assistant 消息（占位，等待流式填充）
    const assistantMessageId = genMsgId();
    chatStore.addMessageToSession(conversationId, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
    });
    // 发起 SSE 流式请求
    const ctrl = new AbortController();
    abortController.value = ctrl;
    activeStreamConversationId.value = conversationId;
    isGenerating.value = true;
    const stream = streamReply(conversationId, deepThinking.value ? 'deepseek-reasoner' : model, deepThinking.value, ctrl.signal);
    await consumeStream(stream, deepThinking.value, conversationId, assistantMessageId);
}
/**
 * 从上次中断处继续生成
 *
 * 调用后端 /chat/continue 获取新 SSE 流，
 * 追加到当前会话最后一条 assistant 消息末尾。
 */
async function continueGeneration() {
    if (isGenerating.value)
        return;
    if (!chatStore.currentId)
        return;
    const { model } = configStore.config;
    const conversationId = chatStore.currentId;
    const lastAssistantMessage = [...chatStore.currentMessages()].reverse().find((msg) => msg.role === 'assistant');
    if (!lastAssistantMessage)
        return;
    const ctrl = new AbortController();
    abortController.value = ctrl;
    activeStreamConversationId.value = conversationId;
    isGenerating.value = true;
    isAborted.value = false;
    const stream = continueChat(conversationId, deepThinking.value ? 'deepseek-reasoner' : model, deepThinking.value, ctrl.signal);
    await consumeStream(stream, deepThinking.value, conversationId, lastAssistantMessage.id);
}
/**
 * 消费 SSE 流式生成器，根据 type 分发到 thinking 或 content
 *
 * 中断处理：
 *   - chunk.aborted 为 true：后端已确认中断 → isAborted = true
 *   - AbortError：前端主动断开 → isAborted = true
 */
async function consumeStream(stream, allowThinking, conversationId, assistantMessageId) {
    try {
        for await (const chunk of stream) {
            if (chunk.done) {
                if (chunk.aborted) {
                    isAborted.value = true;
                }
                break;
            }
            if (chunk.type === 'thinking') {
                if (!allowThinking)
                    continue;
                chatStore.appendToMessage(conversationId, assistantMessageId, chunk.content, 'thinking');
            }
            else {
                chatStore.appendToMessage(conversationId, assistantMessageId, chunk.content);
            }
        }
    }
    catch (err) {
        if (err.name === 'AbortError') {
            isAborted.value = true;
        }
        else {
            console.error('流式请求异常:', err);
        }
    }
    finally {
        isGenerating.value = false;
        abortController.value = null;
        activeStreamConversationId.value = null;
    }
}
// ---- 停止生成 ----
/** 停止当前 AI 生成（双路径：显式 API + 断连兜底） */
function stopGeneration() {
    const currentId = activeStreamConversationId.value ?? chatStore.currentId;
    if (currentId) {
        stopChat(currentId).catch(() => { });
    }
    if (abortController.value) {
        abortController.value.abort();
    }
}
// ---- 工具函数 ----
/** 切换深度思考模式 */
function toggleDeepThinking() {
    deepThinking.value = !deepThinking.value;
}
/** 格式化文件大小 */
function formatSize(bytes) {
    if (bytes < 1024)
        return bytes + ' B';
    if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['chat-input__textarea']} */ ;
if (__VLS_ctx.isAborted) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chat-input__continue-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__continue-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        width: "16",
        height: "16",
        ...{ class: "chat-input__continue-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__continue-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "10",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "8",
        x2: "12",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "16",
        x2: "12.01",
        y2: "16",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.continueGeneration) },
        ...{ class: "chat-input__continue-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__continue-btn']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-input-wrapper" },
    ...{ class: ({ 'chat-input-wrapper--compact': __VLS_ctx.hasMessages }) },
});
/** @type {__VLS_StyleScopedClasses['chat-input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-wrapper--compact']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-input" },
    ...{ class: ({ 'chat-input--compact': __VLS_ctx.hasMessages }) },
});
/** @type {__VLS_StyleScopedClasses['chat-input']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input--compact']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-input__actions" },
});
/** @type {__VLS_StyleScopedClasses['chat-input__actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "chat-input__action-btn" },
    title: "联网搜索",
});
/** @type {__VLS_StyleScopedClasses['chat-input__action-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    width: "18",
    height: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "11",
    cy: "11",
    r: "8",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M21 21l-4.3-4.3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleDeepThinking) },
    ...{ class: "chat-input__action-btn" },
    ...{ class: ({ 'chat-input__action-btn--active': __VLS_ctx.deepThinking }) },
    title: "深度思考",
});
/** @type {__VLS_StyleScopedClasses['chat-input__action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input__action-btn--active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    width: "18",
    height: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.fileInputRef?.click();
            // @ts-ignore
            [isAborted, continueGeneration, hasMessages, hasMessages, toggleDeepThinking, deepThinking, fileInputRef,];
        } },
    ...{ class: "chat-input__action-btn chat-input__upload-btn" },
    title: "上传文件",
});
/** @type {__VLS_StyleScopedClasses['chat-input__action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input__upload-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    width: "18",
    height: "18",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.handleFiles($event.target.files);
            // @ts-ignore
            [handleFiles,];
        } },
    ref: "fileInputRef",
    type: "file",
    multiple: true,
    hidden: true,
    accept: ".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx",
});
if (__VLS_ctx.uploadedFiles.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "chat-input__files" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__files']} */ ;
    for (const [f] of __VLS_vFor((__VLS_ctx.uploadedFiles))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (f.id),
            ...{ class: "chat-input__file-card" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input__file-card']} */ ;
        if (f.previewUrl) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                src: (f.previewUrl),
                ...{ class: "chat-input__file-thumb" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-input__file-thumb']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "chat-input__file-icon" },
            });
            /** @type {__VLS_StyleScopedClasses['chat-input__file-icon']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
                width: "28",
                height: "28",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
                points: "14 2 14 8 20 8",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
                x1: "16",
                y1: "13",
                x2: "8",
                y2: "13",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
                x1: "16",
                y1: "17",
                x2: "8",
                y2: "17",
            });
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "chat-input__file-name" },
            title: (f.file.name),
        });
        /** @type {__VLS_StyleScopedClasses['chat-input__file-name']} */ ;
        (f.file.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "chat-input__file-size" },
        });
        /** @type {__VLS_StyleScopedClasses['chat-input__file-size']} */ ;
        (__VLS_ctx.formatSize(f.file.size));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.uploadedFiles.length > 0))
                        return;
                    __VLS_ctx.removeFile(f.id);
                    // @ts-ignore
                    [uploadedFiles, uploadedFiles, formatSize, removeFile,];
                } },
            ...{ class: "chat-input__file-remove" },
            title: "移除",
        });
        /** @type {__VLS_StyleScopedClasses['chat-input__file-remove']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            width: "14",
            height: "14",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            x1: "18",
            y1: "6",
            x2: "6",
            y2: "18",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
            x1: "6",
            y1: "6",
            x2: "18",
            y2: "18",
        });
        // @ts-ignore
        [];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-input__body" },
});
/** @type {__VLS_StyleScopedClasses['chat-input__body']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    ...{ onInput: (__VLS_ctx.onInput) },
    ...{ onKeydown: (__VLS_ctx.onKeydown) },
    ref: "textareaRef",
    value: (__VLS_ctx.inputText),
    ...{ class: "chat-input__textarea" },
    placeholder: (__VLS_ctx.hasMessages ? '输入消息...' : '输入你的问题...'),
    rows: "1",
});
/** @type {__VLS_StyleScopedClasses['chat-input__textarea']} */ ;
if (__VLS_ctx.isGenerating) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.stopGeneration) },
        ...{ class: "chat-input__stop-btn" },
        title: "停止生成",
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__stop-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        fill: "currentColor",
        width: "18",
        height: "18",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "4",
        y: "4",
        width: "16",
        height: "16",
        rx: "2",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.send) },
        ...{ class: "chat-input__send-btn" },
        ...{ class: ({ 'chat-input__send-btn--active': __VLS_ctx.inputText.trim().length > 0 || __VLS_ctx.uploadedFiles.length > 0 }) },
        disabled: (!__VLS_ctx.inputText.trim() && __VLS_ctx.uploadedFiles.length === 0),
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__send-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['chat-input__send-btn--active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        fill: "currentColor",
        width: "20",
        height: "20",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
    });
}
if (!__VLS_ctx.hasMessages) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "chat-input__tip" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-input__tip']} */ ;
}
// @ts-ignore
[hasMessages, hasMessages, uploadedFiles, uploadedFiles, onInput, onKeydown, inputText, inputText, inputText, isGenerating, stopGeneration, send,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
