import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { config } from '../config'

// 将 HTTP URL 转换为 WebSocket URL
function httpToWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws') + '/connection/websocket'
}

// 从配置中获取各项配置
const mainComponentUrl = config.components.main?.publicUrl || 'http://localhost:3000'
const centrifugoPublicUrl = config.components.communication?.middlewareDependencies?.centrifugo?.endpoints?.main?.publicUrl || 'http://localhost:8000'
const centrifugoWsUrl = httpToWsUrl(centrifugoPublicUrl)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 启用 HTTPS，以便在网络 IP 访问时也能使用麦克风等需要安全上下文的 API
    // basicSsl()
  ],
  define: {
    // 使用相对路径，通过 Vite 代理解决跨域问题
    BASE_URL: JSON.stringify('/api'),
    CENTRIFUGO_WS_URL: JSON.stringify(centrifugoWsUrl),
  },
  server: {
    // 允许从网络访问
    host: true,
    proxy: {
      // 使用正则匹配只代理 API 调用，排除 .ts 源代码文件
      '^/api/(interaction|custom)/': {
        target: mainComponentUrl,
        changeOrigin: true,
      }
    }
  }
})
