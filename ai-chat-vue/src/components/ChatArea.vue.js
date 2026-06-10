/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed } from 'vue';
import { useConversationStore } from '@/stores/conversation';
import MessageList from './MessageList.vue';
import ChatInput from './ChatInput.vue';
import ModelSelector from './ModelSelector.vue';
const __VLS_props = defineProps();
const emit = defineEmits();
const chatStore = useConversationStore();
/** 当前会话是否有消息（决定空态/有消息布局） */
const hasMessages = computed(() => {
    return chatStore.currentMessages().length > 0;
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-area" },
});
/** @type {__VLS_StyleScopedClasses['chat-area']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-area__top" },
});
/** @type {__VLS_StyleScopedClasses['chat-area__top']} */ ;
if (!__VLS_ctx.sidebarVisible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.sidebarVisible))
                    return;
                __VLS_ctx.emit('toggle-sidebar');
                // @ts-ignore
                [sidebarVisible, emit,];
            } },
        ...{ class: "chat-area__toggle-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['chat-area__toggle-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "20",
        height: "20",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "3",
        y: "3",
        width: "18",
        height: "18",
        rx: "2",
        ry: "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "9",
        y1: "3",
        x2: "9",
        y2: "21",
    });
}
const __VLS_0 = ModelSelector;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-area__body" },
    ...{ class: ({ 'chat-area__body--center': !__VLS_ctx.hasMessages }) },
});
/** @type {__VLS_StyleScopedClasses['chat-area__body']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-area__body--center']} */ ;
const __VLS_5 = MessageList;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    ...{ class: ({ 'message-list--grow': __VLS_ctx.hasMessages }) },
}));
const __VLS_7 = __VLS_6({
    ...{ class: ({ 'message-list--grow': __VLS_ctx.hasMessages }) },
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {__VLS_StyleScopedClasses['message-list--grow']} */ ;
const __VLS_10 = ChatInput;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    hasMessages: (__VLS_ctx.hasMessages),
}));
const __VLS_12 = __VLS_11({
    hasMessages: (__VLS_ctx.hasMessages),
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
// @ts-ignore
[hasMessages, hasMessages, hasMessages,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
