/**
 * vite.config.ts —— Vite 构建工具配置
 *
 * 配置项说明：
 *  - plugins:       Vue SFC + Element Plus 按需导入
 *  - resolve.alias: 路径别名 @ → src/，方便跨目录 import
 *  - server:        开发服务器在 3000 端口启动，自动打开浏览器
 *
 * Element Plus 按需导入：
 *  - unplugin-vue-components  自动解析模板中的 <el-*> 组件
 *  - unplugin-element-plus    自动按需引入对应样式
 *  - 只会打包实际使用到的组件，不会全量引入
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

export default defineConfig({
  plugins: [
    vue(),
    // Element Plus 组件按需自动引入
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    // Element Plus 样式按需引入
    ElementPlus(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.tsx', '.vue', '.mjs', '.js', '.mts', '.jsx', '.json'],
  },
  server: {
    port: 3000,
    open: true,
  },
})
