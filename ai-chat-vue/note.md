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
