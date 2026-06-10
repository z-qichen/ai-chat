/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import ChatArea from '@/components/ChatArea.vue';
import { useConversationStore } from '@/stores/conversation';
/** 会话 Store 实例 */
const store = useConversationStore();
/** 侧边栏是否可见，true=展开（默认），false=折叠 */
const isSidebarVisible = ref(true);
/** 传给 Sidebar 的会话列表（仅含 id + title，不含消息） */
const sidebarSessions = computed(() => store.sessions.map((s) => ({ id: s.id, title: s.title })));
/** 切换侧边栏展开/折叠状态 */
const onToggleSidebar = () => {
    isSidebarVisible.value = !isSidebarVisible.value;
};
/** 新建会话（点击侧边栏"新建"按钮时） */
const onNewChat = () => {
    store.createSession();
};
/** 选中侧边栏某个会话 */
const onSelectSession = (id) => {
    store.selectSession(id);
};
/** 编辑会话标题（侧边栏内联编辑确认后） */
const onUpdateTitle = (id, title) => {
    store.updateTitle(id, title);
};
/** 删除会话（侧边栏确认删除后） */
const onDeleteSession = (id) => {
    store.deleteSession(id);
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-page" },
});
/** @type {__VLS_StyleScopedClasses['chat-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: (['chat-page__sidebar', { 'chat-page__sidebar--hidden': !__VLS_ctx.isSidebarVisible }]) },
});
/** @type {__VLS_StyleScopedClasses['chat-page__sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-page__sidebar--hidden']} */ ;
const __VLS_0 = Sidebar;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onToggleSidebar': {} },
    ...{ 'onNewChat': {} },
    ...{ 'onSelectSession': {} },
    ...{ 'onUpdateTitle': {} },
    ...{ 'onDeleteSession': {} },
    sessions: (__VLS_ctx.sidebarSessions),
    activeId: (__VLS_ctx.store.currentId),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onToggleSidebar': {} },
    ...{ 'onNewChat': {} },
    ...{ 'onSelectSession': {} },
    ...{ 'onUpdateTitle': {} },
    ...{ 'onDeleteSession': {} },
    sessions: (__VLS_ctx.sidebarSessions),
    activeId: (__VLS_ctx.store.currentId),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ toggleSidebar: {} },
    { onToggleSidebar: (__VLS_ctx.onToggleSidebar) });
const __VLS_7 = ({ newChat: {} },
    { onNewChat: (__VLS_ctx.onNewChat) });
const __VLS_8 = ({ selectSession: {} },
    { onSelectSession: (__VLS_ctx.onSelectSession) });
const __VLS_9 = ({ updateTitle: {} },
    { onUpdateTitle: (__VLS_ctx.onUpdateTitle) });
const __VLS_10 = ({ deleteSession: {} },
    { onDeleteSession: (__VLS_ctx.onDeleteSession) });
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "chat-page__main" },
});
/** @type {__VLS_StyleScopedClasses['chat-page__main']} */ ;
const __VLS_11 = ChatArea;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    ...{ 'onToggleSidebar': {} },
    sidebarVisible: (__VLS_ctx.isSidebarVisible),
}));
const __VLS_13 = __VLS_12({
    ...{ 'onToggleSidebar': {} },
    sidebarVisible: (__VLS_ctx.isSidebarVisible),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
let __VLS_16;
const __VLS_17 = ({ toggleSidebar: {} },
    { onToggleSidebar: (__VLS_ctx.onToggleSidebar) });
var __VLS_14;
var __VLS_15;
// @ts-ignore
[isSidebarVisible, isSidebarVisible, sidebarSessions, store, onToggleSidebar, onToggleSidebar, onNewChat, onSelectSession, onUpdateTitle, onDeleteSession,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
