import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// base 使用相对路径，保证部署到 GitHub Pages 子路径(/dian.github.io/)下资源路径正确
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: '极简刷题 QuizPWA',
        short_name: '极简刷题',
        description: '软考中级软件设计师历年真题刷题 · 本地优先离线可用',
        theme_color: '#2E5BFF',
        background_color: '#F7F8FA',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // 题库数据等静态资源采用网络优先、离线回退缓存
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) 下 manualChunks 需为函数形式
        manualChunks(id) {
          if (id.includes('node_modules/echarts')) return 'charts'
          if (id.includes('node_modules/xlsx')) return 'xlsx'
          if (id.includes('node_modules/vue') || id.includes('node_modules/vant') || id.includes('node_modules/pinia')) return 'vendor'
        }
      }
    }
  }
})
