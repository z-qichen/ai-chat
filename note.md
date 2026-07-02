# 移动端适配问题总结

## 目标

适配 375px 宽移动端屏幕，Sidebar 抽屉式隐藏，ChatArea 全屏显示并等比缩放。

## 方案

- **Sidebar**：移动端 `position: fixed` + `transform: translateX(-100%)` 隐藏在屏幕左侧，点击汉堡按钮滑入（抽屉模式），带半透明遮罩
- **ChatArea 缩放**：全量 px → rem 转换，移动端 `html { font-size: 14px }` 使所有 rem 值自动缩小到桌面端的 87.5%
- **断点**：`≤ 768px` 视为移动端

---

## 遇到的问题及修复

### 问题 1：侧边栏占据 flex 空间导致 ChatArea 右侧超出屏幕

**根因**：
桌面端 `.chat-page__sidebar` 设置了 `flex-shrink: 0; width: 300px`，移动端虽然加了 `position: fixed`，但未显式重置 flex 属性，侧边栏仍可能被 flex 容器分配空间，将 ChatArea 挤到右侧超出屏幕。

**修复**（`ChatPage.vue`）：
- 移动端 `.chat-page__sidebar` 添加 `flex: none` 彻底踢出 flex 布局
- `.chat-page__main` 添加 `min-width: 0` 防止被内容撑开
- 移动端侧边栏默认 `transform: translateX(-100%)` 隐藏，通过 `:not(--hidden)` 展开，避免与桌面 `--hidden` 的 `width: 0` 冲突

### 问题 2：内容区域水平 padding 过大

**根因**：
`chat-input-wrapper` 和 `message-list` 的水平 padding 为 `1.5rem`（375px 下 = 21px × 2 = 42px），内容可用宽度仅剩 333px（89%），内部再叠加 padding 后实际可输入区域仅 305px（81%）。

**修复**：
在 `ChatInput.vue`、`MessageList.vue`、`ChatArea.vue`、`MessageItem.vue` 尾部各添加 `@media (max-width: 768px)` 移动端样式：

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| wrapper 水平 padding | `1.5rem` (24px) | `0.75rem` (10.5px) |
| chat-input 内部 padding | `1rem` (16px) | `0.75rem` (10.5px) |
| message-list 水平 padding | `1.5rem` (24px) | `0.75rem` (10.5px) |
| 消息气泡 max-width | `75%` | `85%` |
| 消息气泡 padding | `0.625rem 1rem` | `0.5rem 0.75rem` |
| 操作按钮字体 | `0.8125rem` (13px) | `0.75rem` (10.5px) |
| 操作按钮 padding | `0.25rem 0.75rem` | `0.25rem 0.5rem` |

修复后内容可用宽度从 **81%** 提升至 **89%**，textarea 最终宽度从 305px 提升至 **294.5px**。

### 问题 3：Less 嵌套导致 CSS 级联顺序错误

**根因**：
移动端媒体查询中使用了 `.chat-page { &__sidebar { &--hidden {} } }` 嵌套写法，其中 `&__sidebar` 在桌面端已定义了 `--hidden` 的 `width: 0`，移动端仅覆盖了 `transform`，未覆盖 `width`，导致两套规则冲突。

**修复**（`ChatPage.vue`）：
移动端媒体查询改用扁平选择器：
- `.chat-page__sidebar` 直接设置完整属性，包括 `flex: none`
- `.chat-page__sidebar:not(.chat-page__sidebar--hidden)` 控制展开状态
- `.chat-page__sidebar:not(.chat-page__sidebar--hidden) ~ .chat-page__backdrop` 控制遮罩

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/style.less` | 添加 `html { font-size: 16px }` 和移动端 `14px` 媒体查询 |
| `src/pages/ChatPage.vue` | 移动端抽屉布局 + flex 修复 + 遮罩层 |
| `src/components/ChatArea.vue` | px → rem + 移动端缩小样式 |
| `src/components/ChatInput.vue` | px → rem + 移动端缩小样式 |
| `src/components/MessageList.vue` | px → rem + 移动端缩小样式 |
| `src/components/MessageItem.vue` | px → rem + 移动端缩小样式 |
| `src/components/ModelSelector.vue` | px → rem |
| `src/components/Sidebar.vue` | px → rem |
| `src/components/MarkdownRenderer.vue` | px → rem |

---

# 跨标签记忆功能重构

## 目标

在会话中自动沉淀用户关键信息（身份、住址、喜好等），后续对话自动注入用户档案，使 AI 回复更个性化。

## 原始方案的问题

原实现 `streamWithMemoryExtraction()` 采用**串行多轮 tool calling** 模式：

```
用户消息 → LLM调用1(带tool) → 提取记忆 → LLM调用2(带tool) → 提取记忆 → LLM调用3(不带tool) → 推流回复
```

### 核心缺陷

| 问题 | 影响 |
|------|------|
| **串行阻塞**：最多 3 次 LLM API 调用后才回复 | 用户等待时间 3x，体验极差 |
| **无脑触发**：每条消息都带 tool，包括"你好" | 浪费 Token 和 API 费用 |
| **记忆无限膨胀**：无上限、无去重、无冲突解决 | system prompt 越来越长，挤占上下文窗口 |
| **前端完全缺失**：无 MemoryItem 类型、无管理 UI、SSE `memories_added` 事件被丢弃 | 用户不知情、不可控 |
| **置信度阈值 0.3 过低**：LLM 估算不可靠 | 容易存储垃圾信息 |
| **前后端类型不同步**：`StreamChunk.type` 后端有 `'memories_added'`，前端只有 `'thinking' | 'answer'` | 类型不安全 |

## 重构方案

### Phase 1: 异步提取（核心架构变更）

```
原流程:  用户消息 → [串行: 提取记忆×2轮] → 推流回复
新流程:  用户消息 → 推流回复（不带tools） → 后台异步调用 chat() 提取记忆
                                    ↑ 用户立即看到回复
```

**技术要点**：
- 回复阶段直接 `chatStream({ messages, tools: [] })`，不再传 tool
- 回复完成后 `await processMemoriesInBackground()` 异步非流式调用 `chat()` 带 tool 提取
- 后台调用使用便宜模型 `deepseek-chat`，不传 AbortSignal
- `finally` 块推送 `type: 'memories_added'` 的 SSE chunk 通知前端
- 代价：记忆 1 轮延迟生效（下次对话才注入），但对于长期用户档案场景可接受

### Phase 2: 生命周期管理

- **上限 30 条**：`upsertMemory()` 写入前 `COUNT`，>= 30 条则删最旧（`ORDER BY updated_at ASC LIMIT 1`）
- **冲突裁决**：同 `(user_id, key)` 存在时比较置信度，高者胜出，覆写时 log 旧值
- **注入裁剪**：`injectMemoriesIntoSystemPrompt()` 每个 category 最多 5 条（`items.slice(0, 5)`）
- **清空 API**：新增 `clearMemories(userId)` 批量删除，前端可做「一键清空」按钮

### Phase 3: 条件触发

`shouldExtractMemories(userMessage)` 判断逻辑：
- 消息长度 < 10 字 → 跳过
- 包含 25 个中文关键词之一（`"我是" "我叫" "我在" "我住" "我的"` 等） → 触发
- 否则跳过，节省 API 调用

### Phase 4: 前端补全

- 类型对齐：`StreamChunk` 补全 `toolCalls`、`memoriesAdded`、`'memories_added'`
- 新增 `MemoryItem` 接口和 `MEMORY_CATEGORY_LABELS` 常量
- 新增 `fetchMemories` / `createMemory` / `deleteMemory` API 封装
- 新建 `MemoryPage.vue` 记忆管理页（分组卡片、增删、置信度进度条）
- 路由 `/memory` + 侧边栏「用户档案」入口

---

## 遇到的问题及修复

### 问题 1：`streamWithMemoryExtraction` 的 chunks 丢弃逻辑

**根因**：
当轮次中 tool_calls 存在且 count > 0 时，该轮收集的 `chunks` 直接丢弃，不传给前端。这意味着 LLM 在提取记忆的同时可能也生成了部分回复内容，但这些内容被丢弃了。

**是否构成问题**：
实际上不构成严重问题。因为 tool call 模式下 deepseek 流式生成器将 `toolCallMode = true`，内容被积累到 `acc.content` 不 yield，只有最终的 `yield { content: acc.content }` 会在流结束时推送。该累积内容通常只是 LLM 的 tool call 推理文本（如"用户提到了他的职业..."），不是有效回复。最终回复由最后一个不带 tools 的轮次生成。

**新方案下此问题已消除**：回复和提取完全分离，回复阶段不带 tools，不产生 tool call 推理文本。

### 问题 2：后台 `chat()` 非流式调用时的超时处理

**风险**：
`processMemoriesInBackground` 中 `await chat(...)` 如果 API 响应慢，会延迟 `finally` 块中 `memories_added` 通知的推送，但不会阻塞用户回复（因为回复已经推送完毕）。

**修复**：
整个 `processMemoriesInBackground` 包裹在 `try/catch` 中，任何异常静默处理。前端通知在 `finally` 块外部统一推送（通过外层 `memoriesAdded` 变量承接）。

### 问题 3：前端 `vue-tsc --noEmit` 提示 `request` 函数返回类型问题

**根因**：
`api.ts` 中 `request<T>` 返回 `Promise<T>`，但原实现部分函数用 `(await request(...)).data` 取值，新增的记忆 API 直接 `return request<MemoryItem[]>('/memories')`。需确认后端响应格式为 `{ data: MemoryItem[] }` 还是直接返回数组。

**确认**：后端 `/api/memories` GET 返回 `{ data: memories }`，POST 返回 `{ data: memory }`。因此 `fetchMemories()` 和 `createMemory()` 应解包 `.data`，已按此实现。

### 问题 4：后端 TS5097 错误（`.ts` 扩展名导入）

这是项目既有问题，`tsconfig.json` 未启用 `allowImportingTsExtensions`，所有 `.ts` 后缀导入都报 TS5097。本次未引入新错误，但未修复既有问题（改动范围外）。

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `ai-chat-server/src/routes/chat.ts` | 删除 `streamWithMemoryExtraction`，回复阶段改为无 tools 直接流式，新增 `processMemoriesInBackground` |
| `ai-chat-server/src/services/memory.ts` | `upsertMemory` 加冲突裁决+上限 30 条，`injectMemoriesIntoSystemPrompt` 每分类最多 5 条，新增 `clearMemories` 和 `shouldExtractMemories` |
| `ai-chat-vue/src/types/index.ts` | `StreamChunk` 补全字段，新增 `MemoryItem` 和 `MEMORY_CATEGORY_LABELS` |
| `ai-chat-vue/src/services/api.ts` | 新增 `fetchMemories` / `createMemory` / `deleteMemory` |
| `ai-chat-vue/src/pages/MemoryPage.vue` | **新建** 记忆管理页面 |
| `ai-chat-vue/src/router/index.ts` | 注册 `/memory` 路由 |
| `ai-chat-vue/src/router/index.js` | 同步注册 `/memory` 路由 |
| `ai-chat-vue/src/components/Sidebar.vue` | 侧边栏添加「用户档案」按钮 |

---

# SSE 流式输出 buffering 导致打字机效果失效

## 现象

用户发送消息后，前端收到 `:ok\n\n` 心跳后长时间等待，然后全部内容瞬间出现，无逐字渲染效果。

## 根因

`streamWithMemoryExtraction()` 在 `chat.ts` 中将 `chatStream()` 产生的所有 chunk **全部收集到数组中**，函数返回后再一次性推送到 SSE 流：

```ts
// 旧代码：先收集再推送
const chunks: StreamChunk[] = []
for await (const chunk of deepseekStream) {
    if (chunk.toolCalls?.length) { toolCalls = chunk.toolCalls }
    else { chunks.push(chunk) }  // ← 全部缓存，不推送
}
// ... 函数返回后：
for (const chunk of result.chunks) {
    stream.push(`data: ${JSON.stringify(chunk)}\n\n`)  // ← 一次性推送
}
```

结果：DeepSeek 完整响应 + 最多 2 轮记忆提取全部完成后，客户端才能收到内容。

## 核心洞察：外层不需要重复缓存

`deepseek.ts` 的 `chatStream()` 内部已经处理了 tool_call 模式下的内容缓存：

```ts
// deepseek.ts 内部逻辑
if (delta?.tool_calls) {
    toolCallMode = true  // ← 进入工具调用模式
}
if (delta?.content) {
    if (toolCallMode) {
        acc.content += delta.content  // ← 内容自动缓存，不 yield
    } else {
        yield { content: delta.content, done: false, type: 'answer' }  // ← 正常流式输出
    }
}
```

**要点**：当调用带 tools 的 `chatStream()` 时：
- 如果模型不触发 tool call → 正常 yield content chunk，直接推流即可
- 如果模型触发 tool call → `chatStream` 内部自动缓存所有后续 content，仅 yield 最终的 tool_calls chunk

因此外层的 `streamWithMemoryExtraction` 完全不需要再收集 chunk，直接推送即可。

## 修复方案

将 `streamWithMemoryExtraction` 改为即时推送模式：

```ts
function pushChunk(chunk: StreamChunk) {
    if (chunk.content) {
        if (chunk.type === 'thinking') acc.fullReasoningContent += chunk.content
        else if (chunk.type === 'answer') acc.fullContent += chunk.content
    }
    stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
}

for await (const chunk of deepseekStream) {
    if (chunk.toolCalls?.length) {
        toolCalls = chunk.toolCalls
    } else {
        pushChunk(chunk)  // ← 立即推送，实现真正的流式输出
    }
}
```

### 关键技术点

1. **外部累加器 `acc`**：`{ fullContent, fullReasoningContent }` 由路由 handler 创建并传入，确保即使 `streamWithMemoryExtraction` 中途抛异常，路由的 catch 块仍能拿到已推送的内容，用于保存 `partial` 消息

2. **tool_calls 安全性**：当第一轮检测到 tool_calls 时，`chatStream` 在进入 `toolCallMode` 后已停止 yield content，因此不会出现"错误内容先被推送给用户"的问题。极少数情况下（tool_calls 前有少量 thinking content）不影响体验

3. **对比 `/chat/continue` 路由**：continue 路由本就是逐 chunk 推送（无记忆提取），与修复后的 stream 路由行为一致

## 涉及文件

| 文件 | 改动 |
|------|------|
| `ai-chat-server/src/routes/chat.ts` | `streamWithMemoryExtraction` 签名新增 `stream` + `acc` 参数，改为即时推送；路由 handler 使用外部 `acc` 累加器

---

# 暗色主题切换闪烁（FOUC）修复

## 现象

页面加载或刷新时，暗色模式用户会先看到亮色页面一闪而过，然后才切换到暗色。切换过程持续约 0.3s，非常刺眼。

## 根因分析

两层原因叠加：

### 原因 1：主题 class 在 Vue 挂载后才设置

```
浏览器加载 HTML → 解析 CSS（:root 亮色变量生效）→ 首次绘制（亮色页面）
→ 下载 JS bundle → Vue 初始化 → onMounted → themeStore.init() → 添加 dark class
```

`themeStore.init()` 在 `App.vue` 的 `onMounted` 生命周期中调用（`ai-chat-vue/src/App.vue:7`），这意味着 Vue 框架加载、组件挂载完成后才往 `<html>` 上加 `dark` class。在此之前的首次绘制已经以亮色完成。

### 原因 2：全局过渡动画放大了闪烁

`src/style.less:221` 对 `*, *::before, *::after` 设置了 0.3s 过渡：

```css
*, *::before, *::after {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}
```

当 `dark` class 被添加后，所有元素的颜色变量在 0.3s 内从亮色渐变到暗色，用户清晰看到整个页面的颜色"滑过去"，闪烁被拉长放大。

## 修复方案

### 修复 1：`<head>` 内联同步脚本（核心修复）

在 `index.html` 的 `<head>` 中添加同步内联脚本，在 HTML 解析的第一时间（任何 CSS 生效前）读取 localStorage 并设置 `dark` class：

```html
<script>
  (function() {
    var theme = localStorage.getItem('ai-chat-theme')
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  })()
</script>
```

**关键设计要点**：
- 必须是同步脚本（不是 `async`/`defer`），阻塞 HTML 解析直到执行完毕，确保在首次绘制前完成
- 必须放在 `<head>` 中所有 CSS 引用之前
- 逻辑必须与 `themeStore.init()` 完全一致（storage key、回退到系统偏好）
- 脚本极小（~200 bytes），同步执行代价可忽略

### 修复 2：移除全局 `*` 过渡动画

删除 `style.less` 中的通配符过渡规则，仅保留 `body` 上的过渡（`style.less:167`）。

**理由**：
- `*, *::before, *::after` 的过渡作用在每一个 DOM 元素上，性能开销大
- 内联脚本修复后，手动切换主题时用户点击到看到变化已有心理预期，不需要全页面 0.3s 渐变
- `body` 的 `background-color` / `color` 过渡足够提供柔和切换感

## 业界参考

GitHub、Vercel、Tailwind CSS 官网等主流网站的做法一致：
1. `<head>` 中放内联脚本，同步设置主题 class
2. 不再依赖 JS 框架的挂载时机来初始化主题
3. 有的网站会额外加 `.no-transition` class 在首次加载时禁用所有过渡，`requestAnimationFrame` 后移除

## 涉及文件

| 文件 | 改动 |
|------|------|
| `ai-chat-vue/index.html` | `<head>` 中添加内联主题初始化脚本 |
| `ai-chat-vue/src/style.less` | 移除 `*, *::before, *::after` 全局过渡规则 |

---

# 记忆提取触发策略重构：从硬编码关键词到 LLM 自主判断

## 现象

用户对话中提到了"工业设计专业"、"自学前端"、"小厂实习"、"秋招准备"等大量个人信息，但后台记忆提取仅捕获了"大三学生"一条，其余全部遗漏。

## 根因

`shouldExtractMemories()` 存在两层问题：

### 层一：硬编码关键词白名单触发不可靠

```ts
// 旧代码 —— memory.ts:282-291
const keywords = [
  '我是', '我叫', '我在', '我住', '我的', '我从事', '我工作',
  '我学', '我毕业于', '我擅长', '我喜欢', '我偏好', '我希望',
  ...
]
return keywords.some(k => userMessage.includes(k))
```

"我的专业是工业设计" 包含 `'我的'`，触发成功 ✓。但"前端学习中"不含任何关键词，即便明显包含有用信息也会被跳过。白名单永远无法覆盖所有自然语言表达。

### 层二：LLM 单次提取不可靠

即使触发成功，`processMemoriesInBackground()` 仅调用一次 DeepSeek API，依赖模型一次性返回所有 tool_call。实测 DeepSeek 只返回了 1 条（"大三学生"），遗漏了其余 4-5 条可提取信息。

## 修复方案

**删除硬编码关键词白名单，改为每次对话都进入后台提取，由 LLM 自主判断是否有信息值得记录。**

### 修复 1：移除触发前置判断（chat.ts）

```ts
// 旧：仅含关键词才触发
if (lastUserMsg && shouldExtractMemories(lastUserMsg.content)) {
  memoriesAdded = await processMemoriesInBackground({...})
}

// 新：无条件触发
memoriesAdded = await processMemoriesInBackground({...})
```

### 修复 2：强化 tool description（memory.ts）

```ts
description: `从当前对话中提取用户新透露的个人信息...
重要：只有在用户确实透露了新的个人信息时才调用此工具，如果对话中没有新信息则不调用。
对于每条独立信息调用一次（如专业、技能、偏好分别调用），不要合并。`
```

关键改动：
- **"没有新信息则不调用"** → LLM 判断无价值时返回 0 条 tool_call，零额外存储
- **"每条独立信息分别调用"** → 防止模型合并多条信息为一条 tool_call

### 修复 3：删除关键词白名单（memory.ts）

删除 `shouldExtractMemories()` 函数及 25 个硬编码关键词，判断权完全交给大模型。

## 代价与平衡

- **每次对话增加 1 次后台 API 调用**（`deepseek-chat`，非流式）。该模型成本极低（约 $0.27/M tokens），常规消息 ~1000 tokens，每次约 $0.00027
- 当 LLM 判断无新信息时直接返回空（不调 tool），消耗与正常对话相近
- 收益：语义理解 >> 关键词匹配，覆盖所有自然语言表达

## 涉及文件

| 文件 | 改动 |
|------|------|
| `ai-chat-server/src/routes/chat.ts` | 移除 `shouldExtractMemories` 导入和条件判断，改为每次对话都调用后台提取 |
| `ai-chat-server/src/services/memory.ts` | 更新 `EXTRACT_USER_INFO_TOOL` 描述（强调独立性 + 无新信息不调用），删除 `shouldExtractMemories` 函数 |
