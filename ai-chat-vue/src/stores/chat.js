/**
 * stores/chat.ts —— 会话与消息状态管理
 *
 * 管理所有对话会话及消息，是应用的核心 Store。
 * 使用 Pinia Setup Store 风格。
 *
 * 数据结构：conversations 数组存储所有会话，currentId 指向当前激活会话
 *
 * 核心操作：
 *   ensureConversation()       确保存在当前会话（不存在则自动创建）
 *   createNewChat()            新建空白会话
 *   addMessage()               向当前会话追加消息
 *   appendToLastMessage()      流式场景下追加内容到最后一条消息末尾
 *   updateLastMessageContent() 完全替换最后一条消息内容
 *   updateConversationTitle()  修改会话标题
 *   removeConversation()       删除指定会话
 *   setCurrentId()             切换当前活跃会话
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
// ---- 工具函数 ----
/** 自增序列号，确保 generateId 在同一个 tick 内不重复 */
let _id = 0;
/** 生成全局唯一消息 ID，格式 msg_<timestamp>_<seq> */
function generateId() {
    return `msg_${Date.now()}_${++_id}`;
}
export const useChatStore = defineStore('chat', () => {
    // ---- State ----
    /** 所有会话列表（按创建时间倒序，最新的在最前） */
    const conversations = ref([]);
    /** 当前激活的会话 ID，null 表示无活跃会话 */
    const currentId = ref(null);
    // ---- Getters ----
    /** 当前激活的会话对象，不存在则返回 null */
    const currentConversation = () => conversations.value.find((c) => c.id === currentId.value) ?? null;
    // ---- Actions ----
    /** 确保存在一个当前会话：如果当前会话不存在或为空，则创建一个新的 */
    function ensureConversation() {
        if (!currentId.value || !currentConversation()) {
            const id = `conv_${Date.now()}`;
            conversations.value.unshift({
                id,
                title: '新对话',
                messages: [],
                model: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            currentId.value = id;
        }
        return currentConversation();
    }
    /** 新建空白会话：当前会话有消息时才新建，否则复用空会话 */
    function createNewChat() {
        const current = currentConversation();
        console.log(111);
        if (!current || current.messages.length > 0) {
            const id = `conv_${Date.now()}`;
            conversations.value.unshift({
                id,
                title: '新对话',
                messages: [],
                model: '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            currentId.value = id;
        }
        return currentConversation();
    }
    /** 添加一个已有会话到列表（用于未来从持久化恢复数据） */
    function addConversation(conversation) {
        conversations.value.unshift(conversation);
        currentId.value = conversation.id;
    }
    /** 删除指定会话，若恰好是当前会话则自动切换到第一个 */
    function removeConversation(id) {
        conversations.value = conversations.value.filter((c) => c.id !== id);
        if (currentId.value === id) {
            currentId.value = conversations.value[0]?.id ?? null;
        }
    }
    /** 切换到指定会话（点击侧边栏时触发） */
    function setCurrentId(id) {
        currentId.value = id;
    }
    /** 向当前会话末尾追加一条消息 */
    function addMessage(message) {
        const conv = ensureConversation();
        conv.messages.push(message);
        conv.updatedAt = Date.now();
    }
    /** 追加文本到当前会话最后一条消息的 content 末尾（流式打字机效果） */
    function appendToLastMessage(content) {
        const conv = currentConversation();
        if (!conv || conv.messages.length === 0)
            return;
        const last = conv.messages[conv.messages.length - 1];
        last.content += content;
        conv.updatedAt = Date.now();
    }
    /** 完整替换当前会话最后一条消息的 content（流结束后收尾用） */
    function updateLastMessageContent(content) {
        const conv = currentConversation();
        if (!conv || conv.messages.length === 0)
            return;
        conv.messages[conv.messages.length - 1].content = content;
        conv.updatedAt = Date.now();
    }
    /** 修改会话标题（侧边栏编辑功能） */
    function updateConversationTitle(id, title) {
        const conv = conversations.value.find((c) => c.id === id);
        if (conv) {
            conv.title = title;
            conv.updatedAt = Date.now();
        }
    }
    return {
        // State
        conversations,
        currentId,
        // Getters
        currentConversation,
        // Actions
        ensureConversation,
        createNewChat,
        addConversation,
        removeConversation,
        setCurrentId,
        addMessage,
        appendToLastMessage,
        updateLastMessageContent,
        updateConversationTitle,
    };
});
