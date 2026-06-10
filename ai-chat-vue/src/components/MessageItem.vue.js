/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import MarkdownRenderer from './MarkdownRenderer.vue';
const props = defineProps();
/** 深度思考面板是否展开 */
const thinkingExpanded = ref(false);
/** 思考过程是否仍在进行中（thinking 有内容但 answer 还未开始） */
function isThinkingInProgress() {
    return !!props.message.thinking && !props.message.content;
}
/** 格式化文件大小为可读字符串 */
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
/** @type {__VLS_StyleScopedClasses['hljs']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "message-item" },
    ...{ class: (`message-item--${__VLS_ctx.message.role}`) },
});
/** @type {__VLS_StyleScopedClasses['message-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "message-item__bubble" },
});
/** @type {__VLS_StyleScopedClasses['message-item__bubble']} */ ;
if (__VLS_ctx.message.files && __VLS_ctx.message.files.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-item__files" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__files']} */ ;
    for (const [f, i] of __VLS_vFor((__VLS_ctx.message.files))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "message-item__file" },
        });
        /** @type {__VLS_StyleScopedClasses['message-item__file']} */ ;
        if (f.previewUrl) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                src: (f.previewUrl),
                ...{ class: "message-item__file-img" },
            });
            /** @type {__VLS_StyleScopedClasses['message-item__file-img']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "message-item__file-icon" },
            });
            /** @type {__VLS_StyleScopedClasses['message-item__file-icon']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
                width: "20",
                height: "20",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
                points: "14 2 14 8 20 8",
            });
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "message-item__file-name" },
        });
        /** @type {__VLS_StyleScopedClasses['message-item__file-name']} */ ;
        (f.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "message-item__file-size" },
        });
        /** @type {__VLS_StyleScopedClasses['message-item__file-size']} */ ;
        (__VLS_ctx.formatSize(f.size));
        // @ts-ignore
        [message, message, message, message, formatSize,];
    }
}
if (__VLS_ctx.message.role === 'assistant' && __VLS_ctx.message.thinking) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-item__thinking" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__thinking']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.message.role === 'assistant' && __VLS_ctx.message.thinking))
                    return;
                __VLS_ctx.thinkingExpanded = !__VLS_ctx.thinkingExpanded;
                // @ts-ignore
                [message, message, thinkingExpanded, thinkingExpanded,];
            } },
        ...{ class: "message-item__thinking-header" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ class: "message-item__thinking-chevron" },
        ...{ class: ({ 'message-item__thinking-chevron--open': __VLS_ctx.thinkingExpanded }) },
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        width: "16",
        height: "16",
    });
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-chevron']} */ ;
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-chevron--open']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
        points: "6 9 12 15 18 9",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "message-item__thinking-icon" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        width: "16",
        height: "16",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "message-item__thinking-title" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-title']} */ ;
    (__VLS_ctx.isThinkingInProgress() ? '深度思考中...' : (__VLS_ctx.thinkingExpanded ? '已深度思考' : '深度思考'));
    if (__VLS_ctx.isThinkingInProgress()) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "message-item__thinking-dots" },
        });
        /** @type {__VLS_StyleScopedClasses['message-item__thinking-dots']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "dot" },
        });
        /** @type {__VLS_StyleScopedClasses['dot']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "dot" },
        });
        /** @type {__VLS_StyleScopedClasses['dot']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "dot" },
        });
        /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-item__thinking-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.thinkingExpanded) }, null, null);
    /** @type {__VLS_StyleScopedClasses['message-item__thinking-body']} */ ;
    const __VLS_0 = MarkdownRenderer;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        content: (__VLS_ctx.message.thinking),
    }));
    const __VLS_2 = __VLS_1({
        content: (__VLS_ctx.message.thinking),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
if (__VLS_ctx.message.content) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-item__content" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__content']} */ ;
    const __VLS_5 = MarkdownRenderer;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
        content: (__VLS_ctx.message.content),
    }));
    const __VLS_7 = __VLS_6({
        content: (__VLS_ctx.message.content),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
if (__VLS_ctx.message.role === 'assistant' && !__VLS_ctx.message.content && !__VLS_ctx.message.thinking) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "message-item__loading" },
    });
    /** @type {__VLS_StyleScopedClasses['message-item__loading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dot" },
    });
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dot" },
    });
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dot" },
    });
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
}
// @ts-ignore
[message, message, message, message, message, message, thinkingExpanded, thinkingExpanded, thinkingExpanded, isThinkingInProgress, isThinkingInProgress,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
