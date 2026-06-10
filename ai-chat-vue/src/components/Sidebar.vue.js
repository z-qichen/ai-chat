/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="C:/Users/pale/Desktop/ai-chat/ai-chat-vue/node_modules/.pnpm/@vue+language-core@3.3.3/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();
const emit = defineEmits();
const props = defineProps();
/** 安全取值：props 未传时默认为空数组 */
const sessions = computed(() => props.sessions ?? []);
/** 用户菜单是否打开 */
const userMenuOpen = ref(false);
function toggleUserMenu() {
    userMenuOpen.value = !userMenuOpen.value;
}
// ---- 虚拟滚动相关 ----
const scrollContainer = ref(null);
const scrollTop = ref(0); // 当前滚动偏移
const containerHeight = ref(0); // 可视区高度
/** 每个会话项的高度（px） */
const ITEM_HEIGHT = 50;
/** 每个会话项的宽度（px） */
const ITEM_WIDTH = 255;
/** 可视区外上下各多渲染的项数（缓冲，防止快速滚动时白屏） */
const BUFFER = 5;
/** 虚拟列表总高度 = 项数 × 每项高度 */
const totalHeight = computed(() => sessions.value.length * ITEM_HEIGHT);
/** 可视区范围的起止索引 */
const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER);
    const end = Math.min(sessions.value.length, Math.ceil((scrollTop.value + containerHeight.value) / ITEM_HEIGHT) + BUFFER);
    return { start, end };
});
/** 可视区内的会话项（仅渲染这些） */
const visibleItems = computed(() => {
    return sessions.value.slice(visibleRange.value.start, visibleRange.value.end);
});
/** 可视区内容的 Y 轴偏移量 */
const offsetY = computed(() => visibleRange.value.start * ITEM_HEIGHT);
/** 滚动事件：更新 scrollTop */
function onScroll() {
    if (scrollContainer.value) {
        scrollTop.value = scrollContainer.value.scrollTop;
    }
}
/** 容器大小变化：更新 containerHeight */
function onResize() {
    if (scrollContainer.value) {
        containerHeight.value = scrollContainer.value.clientHeight;
    }
}
onMounted(() => {
    if (scrollContainer.value) {
        containerHeight.value = scrollContainer.value.clientHeight;
    }
});
// ---- 事件处理 ----
/** 点击某个会话 → 通知父组件切换 */
function selectSession(id) {
    emit('select-session', id);
}
/** 点击新建按钮 → 通知父组件创建新会话 */
function onNewChat() {
    emit('new-chat');
}
// ---- 右键菜单 / 内联编辑 ----
/** 当前打开菜单的会话 ID（null 表示菜单关闭） */
const menuSessionId = ref(null);
/** 当前正在编辑标题的会话 ID */
const editingId = ref(null);
/** 编辑中的标题文本 */
const editingTitle = ref('');
/** 编辑输入框的 DOM 引用 */
let editInput = null;
/** 获取编辑输入框的 template ref */
function setEditRef(el) {
    editInput = el;
}
/** 切换 ... 菜单的展开/关闭 */
function toggleMenu(id, e) {
    e.stopPropagation();
    menuSessionId.value = menuSessionId.value === id ? null : id;
}
/** 关闭菜单 */
function closeMenu() {
    menuSessionId.value = null;
}
/** 开始编辑标题（从菜单触发） */
function startEdit() {
    const id = menuSessionId.value;
    if (!id)
        return;
    const session = sessions.value.find((s) => s.id === id);
    if (!session)
        return;
    editingTitle.value = session.title;
    editingId.value = id;
    menuSessionId.value = null; // 关闭菜单
    // 等待 DOM 更新后聚焦并全选
    nextTick(() => {
        if (editInput) {
            editInput.focus();
            editInput.select();
        }
    });
}
/** 确认编辑：通知父组件更新标题 */
function confirmEdit() {
    if (editingId.value && editingTitle.value.trim()) {
        emit('update-title', editingId.value, editingTitle.value.trim());
    }
    editingId.value = null;
    editingTitle.value = '';
}
/** 取消编辑（Esc 或失焦） */
function cancelEdit() {
    editingId.value = null;
    editingTitle.value = '';
}
/** 删除会话：弹出确认框，确认后通知父组件 */
function deleteSession(id, e) {
    e.stopPropagation();
    menuSessionId.value = null;
    ElMessageBox.confirm('删除后无法恢复，确定要删除该会话吗？', '确认删除', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
    })
        .then(() => {
        emit('delete-session', id);
    })
        .catch(() => { });
}
/** 编辑输入框键盘事件 */
function onEditKeydown(e) {
    if (e.key === 'Enter') {
        confirmEdit();
    }
    else if (e.key === 'Escape') {
        cancelEdit();
    }
}
/** 点击菜单外部时关闭菜单 */
function handleClickOutside(e) {
    const target = e.target;
    if (!target.closest('.session-card__menu') && !target.closest('.sidebar-user__menu')) {
        closeMenu();
        userMenuOpen.value = false;
    }
}
/** 退出登录 */
function handleLogout() {
    auth.logout();
    router.push('/login');
}
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
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
    ...{ class: "sidebar" },
});
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-header" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-header__top" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header__top']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "sidebar-header__logo" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header__logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('toggle-sidebar');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "sidebar-header__collapse" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header__collapse']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "18",
    height: "18",
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
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.onNewChat) },
    ...{ class: "sidebar-header__new-chat" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-header__new-chat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.kbd, __VLS_intrinsics.kbd)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onScroll: (__VLS_ctx.onScroll) },
    ...{ onResize: (__VLS_ctx.onResize) },
    ref: "scrollContainer",
    ...{ class: "sidebar-scroll" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-scroll']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-scroll__spacer" },
    ...{ style: ({ height: __VLS_ctx.totalHeight + 'px' }) },
});
/** @type {__VLS_StyleScopedClasses['sidebar-scroll__spacer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-scroll__content" },
    ...{ style: ({ transform: `translateY(${__VLS_ctx.offsetY}px)` }) },
});
/** @type {__VLS_StyleScopedClasses['sidebar-scroll__content']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.visibleItems))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectSession(item.id);
                // @ts-ignore
                [onNewChat, onScroll, onResize, totalHeight, offsetY, visibleItems, selectSession,];
            } },
        key: (item.id),
        ...{ class: ([
                'session-card',
                { 'session-card--active': props.activeId === item.id }
            ]) },
        ...{ style: ({ width: __VLS_ctx.ITEM_WIDTH + 'px', height: __VLS_ctx.ITEM_HEIGHT + 'px' }) },
    });
    /** @type {__VLS_StyleScopedClasses['session-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['session-card--active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "session-card__icon" },
    });
    /** @type {__VLS_StyleScopedClasses['session-card__icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    });
    if (__VLS_ctx.editingId === item.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onBlur: (__VLS_ctx.confirmEdit) },
            ...{ onKeydown: (__VLS_ctx.onEditKeydown) },
            ...{ onClick: () => { } },
            ref: (__VLS_ctx.setEditRef),
            ...{ class: "session-card__edit-input" },
        });
        (__VLS_ctx.editingTitle);
        /** @type {__VLS_StyleScopedClasses['session-card__edit-input']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "session-card__title" },
        });
        /** @type {__VLS_StyleScopedClasses['session-card__title']} */ ;
        (item.title);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "session-card__actions" },
    });
    /** @type {__VLS_StyleScopedClasses['session-card__actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleMenu(item.id, $event);
                // @ts-ignore
                [ITEM_WIDTH, ITEM_HEIGHT, editingId, confirmEdit, onEditKeydown, setEditRef, editingTitle, toggleMenu,];
            } },
        ...{ class: "session-card__more-btn" },
        ...{ class: ({ 'session-card__more-btn--open': __VLS_ctx.menuSessionId === item.id }) },
    });
    /** @type {__VLS_StyleScopedClasses['session-card__more-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['session-card__more-btn--open']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "currentColor",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "5",
        cy: "12",
        r: "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "2",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "19",
        cy: "12",
        r: "2",
    });
    if (__VLS_ctx.menuSessionId === item.id) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "session-card__menu" },
        });
        /** @type {__VLS_StyleScopedClasses['session-card__menu']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.startEdit) },
            ...{ class: "session-card__menu-item" },
        });
        /** @type {__VLS_StyleScopedClasses['session-card__menu-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.menuSessionId === item.id))
                        return;
                    __VLS_ctx.deleteSession(item.id, $event);
                    // @ts-ignore
                    [menuSessionId, menuSessionId, startEdit, deleteSession,];
                } },
            ...{ class: "session-card__menu-item session-card__menu-item--danger" },
        });
        /** @type {__VLS_StyleScopedClasses['session-card__menu-item']} */ ;
        /** @type {__VLS_StyleScopedClasses['session-card__menu-item--danger']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
            points: "3 6 5 6 21 6",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-footer" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.theme.toggle();
            // @ts-ignore
            [theme,];
        } },
    ...{ class: "sidebar-footer__theme-btn" },
    title: (__VLS_ctx.theme.isDark ? '切换到亮色模式' : '切换到暗色模式'),
});
/** @type {__VLS_StyleScopedClasses['sidebar-footer__theme-btn']} */ ;
if (__VLS_ctx.theme.isDark) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "5",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "1",
        x2: "12",
        y2: "3",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "21",
        x2: "12",
        y2: "23",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "4.22",
        y1: "4.22",
        x2: "5.64",
        y2: "5.64",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "18.36",
        y1: "18.36",
        x2: "19.78",
        y2: "19.78",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "1",
        y1: "12",
        x2: "3",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "21",
        y1: "12",
        x2: "23",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "4.22",
        y1: "19.78",
        x2: "5.64",
        y2: "18.36",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "18.36",
        y1: "5.64",
        x2: "19.78",
        y2: "4.22",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (__VLS_ctx.toggleUserMenu) },
    ...{ class: "sidebar-user" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-user']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-user__avatar" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-user__avatar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "12",
    cy: "7",
    r: "4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "sidebar-user__name" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-user__name']} */ ;
(__VLS_ctx.auth.username || '用户名称');
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ class: "sidebar-user__arrow" },
    ...{ class: ({ 'sidebar-user__arrow--open': __VLS_ctx.userMenuOpen }) },
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
/** @type {__VLS_StyleScopedClasses['sidebar-user__arrow']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-user__arrow--open']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
    points: "6 9 12 15 18 9",
});
if (__VLS_ctx.userMenuOpen) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "sidebar-user__menu" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-user__menu']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleLogout) },
        ...{ class: "sidebar-user__menu-item sidebar-user__menu-item--danger" },
    });
    /** @type {__VLS_StyleScopedClasses['sidebar-user__menu-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['sidebar-user__menu-item--danger']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
        points: "16 17 21 12 16 7",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "21",
        y1: "12",
        x2: "9",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
// @ts-ignore
[theme, theme, toggleUserMenu, auth, userMenuOpen, userMenuOpen, handleLogout,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
