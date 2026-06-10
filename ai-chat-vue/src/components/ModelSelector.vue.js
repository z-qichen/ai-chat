/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useConfigStore } from '@/stores/config';
import { validateModel } from '@/services/api';
const configStore = useConfigStore();
/** 可用模型列表（展示用，实际校验由后端完成） */
const availableModels = [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
];
/** 下拉菜单是否展开 */
const visible = ref(false);
/** 切换中状态 */
const switching = ref(false);
/** 当前选中模型的显示名称 */
const currentLabel = ref(availableModels.find((m) => m.value === configStore.config.model)?.label ?? configStore.config.model);
/** 展开/收起下拉菜单 */
function toggle() {
    visible.value = !visible.value;
}
/** 切换模型 */
async function select(modelValue, label) {
    if (switching.value)
        return;
    visible.value = false;
    switching.value = true;
    try {
        const res = await validateModel(modelValue);
        if (res.valid) {
            configStore.updateConfig({ model: res.model });
            currentLabel.value = label;
            ElMessage.success(`已切换至 ${label}`);
        }
        else {
            // 模型不合法，检查是否有近似建议
            if (res.suggestion) {
                try {
                    await ElMessageBox.confirm(res.error || `模型 "${modelValue}" 不存在`, '模型校验失败', {
                        confirmButtonText: `使用 "${res.suggestion}"`,
                        cancelButtonText: '取消',
                        type: 'warning',
                    });
                    // 用户确认使用建议模型，递归调用校验
                    const suggestedLabel = availableModels.find((m) => m.value === res.suggestion)?.label ?? res.suggestion;
                    switching.value = false;
                    select(res.suggestion, suggestedLabel);
                    return;
                }
                catch {
                    // 用户取消
                }
            }
            else {
                ElMessage.error(res.error || '模型校验失败');
            }
        }
    }
    catch (err) {
        ElMessage.error(err.message || '网络异常，请稍后重试');
    }
    finally {
        switching.value = false;
    }
}
/** 点击外部关闭下拉菜单 */
function onBlur() {
    setTimeout(() => {
        visible.value = false;
    }, 150);
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onBlur: (__VLS_ctx.onBlur) },
    ...{ class: "model-selector" },
    tabindex: "0",
});
/** @type {__VLS_StyleScopedClasses['model-selector']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggle) },
    ...{ class: "model-selector__trigger" },
    ...{ class: ({ 'model-selector__trigger--open': __VLS_ctx.visible }) },
    disabled: (__VLS_ctx.switching),
});
/** @type {__VLS_StyleScopedClasses['model-selector__trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['model-selector__trigger--open']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "model-selector__label" },
});
/** @type {__VLS_StyleScopedClasses['model-selector__label']} */ ;
(__VLS_ctx.switching ? '切换中...' : __VLS_ctx.currentLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ class: "model-selector__arrow" },
    ...{ class: ({ 'model-selector__arrow--open': __VLS_ctx.visible }) },
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    width: "14",
    height: "14",
});
/** @type {__VLS_StyleScopedClasses['model-selector__arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['model-selector__arrow--open']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
    points: "6 9 12 15 18 9",
});
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "dropdown",
}));
const __VLS_2 = __VLS_1({
    name: "dropdown",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "model-selector__dropdown" },
    });
    /** @type {__VLS_StyleScopedClasses['model-selector__dropdown']} */ ;
    for (const [m] of __VLS_vFor((__VLS_ctx.availableModels))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.visible))
                        return;
                    __VLS_ctx.select(m.value, m.label);
                    // @ts-ignore
                    [onBlur, toggle, visible, visible, visible, switching, switching, currentLabel, availableModels, select,];
                } },
            key: (m.value),
            ...{ class: "model-selector__option" },
            ...{ class: ({ 'model-selector__option--active': m.value === __VLS_ctx.configStore.config.model }) },
        });
        /** @type {__VLS_StyleScopedClasses['model-selector__option']} */ ;
        /** @type {__VLS_StyleScopedClasses['model-selector__option--active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (m.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "model-selector__option-id" },
        });
        /** @type {__VLS_StyleScopedClasses['model-selector__option-id']} */ ;
        (m.value);
        if (m.value === __VLS_ctx.configStore.config.model) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                ...{ class: "model-selector__check" },
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
                width: "16",
                height: "16",
            });
            /** @type {__VLS_StyleScopedClasses['model-selector__check']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
                points: "20 6 9 17 4 12",
            });
        }
        // @ts-ignore
        [configStore, configStore,];
    }
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
