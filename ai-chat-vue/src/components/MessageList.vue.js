/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useConversationStore } from '@/stores/conversation';
import MessageItem from './MessageItem.vue';
const chatStore = useConversationStore();
/** 消息列表 DOM 引用（用于滚动操作） */
const listRef = ref(null);
/** 当前会话的所有消息（已加载部分） */
const messages = computed(() => {
    return chatStore.currentMessages();
});
/** 是否还有更多历史消息可加载 */
const hasMore = computed(() => {
    return chatStore.hasMoreMessages();
});
/** 是否正在加载更多消息 */
const isLoadingMore = computed(() => {
    return chatStore.loadingMore;
});
/** 是否正在等待 AI 回复（最后一条是空的 assistant 消息） */
const isLoading = computed(() => {
    const msgs = messages.value;
    if (msgs.length === 0)
        return false;
    const last = msgs[msgs.length - 1];
    return last.role === 'assistant' && last.content.length === 0;
});
// ---- 自动滚底控制 ----
/** 用户是否手动向上滚动（此时暂停自动滚底） */
const isUserScrollingUp = ref(false);
/** 是否处于会话初始加载状态（切换历史对话时用于瞬时滚底） */
const isInitialLoad = ref(false);
/** 判断列表当前是否在底部（容差 50px） */
function isAtBottom() {
    const el = listRef.value;
    if (!el)
        return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
}
/** 滚动到列表底部（仅在用户未手动上滚时执行） */
function scrollToBottom() {
    if (isUserScrollingUp.value)
        return;
    nextTick(() => {
        const el = listRef.value;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    });
}
/** 滚轮事件：向上滚动 → 暂停自动滚底，向下滚到底 → 恢复 */
function onWheel(e) {
    if (e.deltaY < 0) {
        isUserScrollingUp.value = true;
    }
    else if (e.deltaY > 0 && isAtBottom()) {
        isUserScrollingUp.value = false;
    }
}
/** 键盘事件：ArrowUp → 暂停，ArrowDown → 滚到底时恢复 */
function onKeydown(e) {
    if (e.key === 'ArrowUp') {
        isUserScrollingUp.value = true;
    }
    else if (e.key === 'ArrowDown' && isAtBottom()) {
        isUserScrollingUp.value = false;
    }
}
// ---- 向上翻页加载更多 ----
/** 是否正在执行加载更多（防重复触发） */
const isLoadingMoreTriggered = ref(false);
/** 滚动事件：检测是否滚动到顶部，触发加载更多 */
async function onScroll() {
    const el = listRef.value;
    if (!el)
        return;
    // 滚动到顶部附近（< 100px）且还有更多消息且未在加载中
    if (el.scrollTop < 100 && hasMore.value && !isLoadingMoreTriggered.value) {
        isLoadingMoreTriggered.value = true;
        // 记录当前第一个可见消息，用于加载后恢复滚动位置
        const firstVisibleEl = el.querySelector('[data-message-id]');
        const anchorId = firstVisibleEl?.getAttribute('data-message-id');
        await chatStore.loadMoreMessages(chatStore.currentId);
        // 等待 DOM 更新后，将之前可见的消息拉回视野
        await nextTick();
        if (anchorId) {
            const anchorEl = el.querySelector(`[data-message-id="${anchorId}"]`);
            if (anchorEl) {
                anchorEl.scrollIntoView({ block: 'start' });
            }
        }
        isLoadingMoreTriggered.value = false;
    }
}
// 监听当前会话切换 → 标记为初始加载，用于瞬时滚底
watch(() => chatStore.currentId, () => {
    isInitialLoad.value = true;
});
// 监听消息数量变化 → 滚底（初始加载瞬时，新消息平滑）
watch(() => messages.value.length, () => {
    isUserScrollingUp.value = false;
    nextTick(() => {
        const el = listRef.value;
        if (el && messages.value.length > 0) {
            if (isInitialLoad.value) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
                isInitialLoad.value = false;
            }
            else {
                el.scrollTop = el.scrollHeight;
            }
        }
    });
});
// 监听最后一条消息内容变化 → 条件滚底（流式打字机效果）
watch(() => {
    const msgs = messages.value;
    if (msgs.length === 0)
        return '';
    const last = msgs[msgs.length - 1];
    return last.content;
}, () => scrollToBottom());
// 组件挂载时：若消息已加载完毕（如刷新页面恢复会话），直接定位底部
onMounted(() => {
    if (messages.value.length > 0) {
        nextTick(() => {
            const el = listRef.value;
            if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
            }
        });
    }
    else if (chatStore.currentId && chatStore.loading) {
        // 消息正在异步加载中，标记为初始加载以便加载完成后瞬时滚底
        isInitialLoad.value = true;
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onWheel: (__VLS_ctx.onWheel) },
    ...{ onKeydown: (__VLS_ctx.onKeydown) },
    ...{ onScroll: (__VLS_ctx.onScroll) },
    ref: "listRef",
    ...{ class: "message-list" },
    tabindex: "0",
});
/** @type {__VLS_StyleScopedClasses['message-list']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "message-list__inner" },
});
/** @type {__VLS_StyleScopedClasses['message-list__inner']} */ ;
if (__VLS_ctx.hasMore) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-list__load-more" },
    });
    /** @type {__VLS_StyleScopedClasses['message-list__load-more']} */ ;
    if (__VLS_ctx.isLoadingMore) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
            ...{ class: "load-more-spinner" },
        });
        /** @type {__VLS_StyleScopedClasses['load-more-spinner']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "load-more-text" },
        });
        /** @type {__VLS_StyleScopedClasses['load-more-text']} */ ;
    }
}
for (const [msg] of __VLS_vFor((__VLS_ctx.messages))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (msg.id),
        'data-message-id': (msg.id),
    });
    const __VLS_0 = MessageItem;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        message: (msg),
    }));
    const __VLS_2 = __VLS_1({
        message: (msg),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    // @ts-ignore
    [onWheel, onKeydown, onScroll, hasMore, isLoadingMore, messages,];
}
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-list__loading" },
    });
    /** @type {__VLS_StyleScopedClasses['message-list__loading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "loading-dot" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "loading-dot" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "loading-dot" },
    });
    /** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
}
// @ts-ignore
[isLoading,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
