/**
 * main.ts —— 应用入口文件
 *
 * 职责：
 * 1. 创建 Vue 3 应用实例
 * 2. 注册全局插件：Pinia（状态管理）、Vue Router（路由）
 * 3. 导入全局样式
 * 4. 挂载到 #app 根节点
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.less';
import 'element-plus/theme-chalk/dark/css-vars.css';
// 创建 Vue 应用实例
const app = createApp(App);
// 注册 Pinia 状态管理（Setup Store 风格）
app.use(createPinia());
// 注册路由（支持懒加载）
app.use(router);
// 挂载到 index.html 中的 #app 容器
app.mount('#app');
