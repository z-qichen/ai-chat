<!--
  MarkdownRenderer.vue —— Markdown 渲染组件

  职责：
    - 将 AI 回复的 Markdown 文本渲染为 HTML
    - 使用 markdown-it 作为解析引擎
    - 集成 highlight.js 实现代码块语法高亮（支持 14 种语言）
    - 防止 XSS：禁用 HTML 标签（html: false）

  使用方式：
    <MarkdownRenderer :content="message.content" />

  支持格式：
    - 标题 h1-h4、列表、引用、表格、链接
    - 行内代码 `code` 和围栏代码块 ```lang\ncode\n```
    - 代码高亮语言：js/ts/py/sh/json/css/html/xml/sql/md
-->
<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import sql from 'highlight.js/lib/languages/sql'
import markdown from 'highlight.js/lib/languages/markdown'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{ content: string }>()
const theme = useThemeStore()

// ---- 注册 highlight.js 语言包 ----
// 每种语言注册多个别名，方便用户省略或简写代码块语言标识
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)           // 别名
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)           // 别名
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)               // 别名
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)                 // 别名
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)                // HTML 用 XML 高亮器
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('markdown', markdown)

// ---- 初始化 markdown-it 实例 ----
// 注：highlight 回调不能直接引用 md.utils（构成自引用类型推断循环），
// 因此先创建一个临时实例获取 escapeHtml 工具函数
const _mdUtils = MarkdownIt().utils

const md = new MarkdownIt({
  html: false,   // 禁用原始 HTML（防止 XSS 攻击）
  breaks: true,  // 将 \n 转换为 <br>（更自然的换行）
  linkify: true, // 自动将 URL 文本转换为可点击链接
  // 自定义代码高亮回调
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        )
      } catch {
        // 高亮失败时回退到普通代码块
      }
    }
    // 无语言标识或未知语言：转义 HTML 后原样输出
    return '<pre class="hljs"><code>' + _mdUtils.escapeHtml(str) + '</code></pre>'
  },
})

/** 计算属性：将原始 Markdown 转为 HTML */
const rendered = computed(() => md.render(props.content))

// ---- 动态切换 highlight.js 主题 ----

const STYLE_ID = 'hljs-theme-dynamic'
let currentStyleEl: HTMLStyleElement | null = null

async function loadHljsTheme() {
  try {
    const cssModule = theme.isDark
      ? await import('highlight.js/styles/github-dark.css?inline')
      : await import('highlight.js/styles/github.css?inline')
    const css = cssModule.default

    if (currentStyleEl) {
      currentStyleEl.remove()
    }
    currentStyleEl = document.createElement('style')
    currentStyleEl.id = STYLE_ID
    currentStyleEl.textContent = css
    document.head.appendChild(currentStyleEl)
  } catch {
    // 主题加载失败时忽略
  }
}

watch(() => theme.isDark, loadHljsTheme, { immediate: true })

onUnmounted(() => {
  if (currentStyleEl) {
    currentStyleEl.remove()
    currentStyleEl = null
  }
})
</script>

<template>
  <div class="markdown-renderer" v-html="rendered" />
</template>

<style scoped lang="less">
/* Markdown 内容全局样式 */
.markdown-renderer {
  background: var(--bg-secondary);
  color: var(--text-primary);
  line-height: 1.75;
  word-break: break-word;

  /* 段落 */
  :deep(p) {
    margin: 0 0 8px;
    &:last-child { margin-bottom: 0; }
  }

  /* 代码块（围栏代码） */
  :deep(pre.hljs) {
    background: var(--code-block-bg);
    border: 1px solid var(--code-block-border);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.6;

    code {
      background: transparent;
      padding: 0;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }
  }

  /* 行内代码 */
  :deep(code) {
    background: var(--code-bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }

  /* 有序/无序列表 */
  :deep(ul), :deep(ol) {
    padding-left: 20px;
    margin: 8px 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  /* 引用块 */
  :deep(blockquote) {
    border-left: 3px solid var(--blockquote-border);
    padding-left: 12px;
    margin: 12px 0;
    color: var(--text-muted);
  }

  /* 表格 */
  :deep(table) {
    border-collapse: collapse;
    margin: 12px 0;
    width: 100%;

    th, td {
      border: 1px solid var(--border-primary);
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }
  }

  /* 链接 */
  :deep(a) {
    color: var(--accent-primary);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  /* 标题 */
  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 16px 0 8px;
    font-weight: 600;
  }
}
</style>
