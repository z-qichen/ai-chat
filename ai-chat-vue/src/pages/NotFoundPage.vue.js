/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useRouter } from 'vue-router';
import { WarningFilled } from '@element-plus/icons-vue';
const router = useRouter();
function goHome() {
    router.push('/');
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "not-found-page" },
});
/** @type {__VLS_StyleScopedClasses['not-found-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "not-found-content" },
});
/** @type {__VLS_StyleScopedClasses['not-found-content']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.elIcon | typeof __VLS_components.ElIcon | typeof __VLS_components['el-icon'] | typeof __VLS_components.elIcon | typeof __VLS_components.ElIcon | typeof __VLS_components['el-icon']} */
elIcon;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "not-found-icon" },
    size: (72),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "not-found-icon" },
    size: (72),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['not-found-icon']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.WarningFilled} */
WarningFilled;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({}));
const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "not-found-code" },
});
/** @type {__VLS_StyleScopedClasses['not-found-code']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "not-found-title" },
});
/** @type {__VLS_StyleScopedClasses['not-found-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "not-found-desc" },
});
/** @type {__VLS_StyleScopedClasses['not-found-desc']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "not-found-actions" },
});
/** @type {__VLS_StyleScopedClasses['not-found-actions']} */ ;
let __VLS_11;
/** @ts-ignore @type { | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button'] | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button']} */
elButton;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}));
const __VLS_13 = __VLS_12({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
let __VLS_16;
const __VLS_17 = ({ click: {} },
    { onClick: (__VLS_ctx.goHome) });
const { default: __VLS_18 } = __VLS_14.slots;
// @ts-ignore
[goHome,];
var __VLS_14;
var __VLS_15;
let __VLS_19;
/** @ts-ignore @type { | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button'] | typeof __VLS_components.elButton | typeof __VLS_components.ElButton | typeof __VLS_components['el-button']} */
elButton;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    ...{ 'onClick': {} },
    size: "large",
}));
const __VLS_21 = __VLS_20({
    ...{ 'onClick': {} },
    size: "large",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_24;
const __VLS_25 = ({ click: {} },
    { onClick: (...[$event]) => {
            __VLS_ctx.router.go(-1);
            // @ts-ignore
            [router,];
        } });
const { default: __VLS_26 } = __VLS_22.slots;
// @ts-ignore
[];
var __VLS_22;
var __VLS_23;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
