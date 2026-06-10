/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, watch, onUnmounted } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import { useThemeStore } from '@/stores/theme';
const props = defineProps();
const theme = useThemeStore();
// ---- 注册 highlight.js 语言包 ----
// 每种语言注册多个别名，方便用户省略或简写代码块语言标识
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript); // 别名
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript); // 别名
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python); // 别名
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash); // 别名
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml); // HTML 用 XML 高亮器
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('markdown', markdown);
// ---- 初始化 markdown-it 实例 ----
// 注：highlight 回调不能直接引用 md.utils（构成自引用类型推断循环），
// 因此先创建一个临时实例获取 escapeHtml 工具函数
const _mdUtils = MarkdownIt().utils;
const md = new MarkdownIt({
    html: false, // 禁用原始 HTML（防止 XSS 攻击）
    breaks: true, // 将 \n 转换为 <br>（更自然的换行）
    linkify: true, // 自动将 URL 文本转换为可点击链接
    // 自定义代码高亮回调
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return ('<pre class="hljs"><code>' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>');
            }
            catch {
                // 高亮失败时回退到普通代码块
            }
        }
        // 无语言标识或未知语言：转义 HTML 后原样输出
        return '<pre class="hljs"><code>' + _mdUtils.escapeHtml(str) + '</code></pre>';
    },
});
/** 计算属性：将原始 Markdown 转为 HTML */
const rendered = computed(() => md.render(props.content));
// ---- 动态切换 highlight.js 主题 ----
const STYLE_ID = 'hljs-theme-dynamic';
let currentStyleEl = null;
async function loadHljsTheme() {
    try {
        const cssModule = theme.isDark
            ? await import('highlight.js/styles/github-dark.css?inline')
            : await import('highlight.js/styles/github.css?inline');
        const css = cssModule.default;
        if (currentStyleEl) {
            currentStyleEl.remove();
        }
        currentStyleEl = document.createElement('style');
        currentStyleEl.id = STYLE_ID;
        currentStyleEl.textContent = css;
        document.head.appendChild(currentStyleEl);
    }
    catch {
        // 主题加载失败时忽略
    }
}
watch(() => theme.isDark, loadHljsTheme, { immediate: true });
onUnmounted(() => {
    if (currentStyleEl) {
        currentStyleEl.remove();
        currentStyleEl = null;
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "markdown-renderer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.rendered) }, null, null);
/** @type {__VLS_StyleScopedClasses['markdown-renderer']} */ ;
// @ts-ignore
[rendered,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
