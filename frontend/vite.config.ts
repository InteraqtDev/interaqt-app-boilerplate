import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { config } from '../config'

// 将 HTTP URL 转换为 WebSocket URL
function httpToWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws') + '/connection/websocket'
}

// 从配置中获取 centrifugo 的 WebSocket URL
const centrifugoPublicUrl = config.components.communication?.middlewareDependencies?.centrifugo?.endpoints?.main?.publicUrl || 'http://localhost:8000'
const centrifugoWsUrl = httpToWsUrl(centrifugoPublicUrl)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    BASE_URL: JSON.stringify('/api'),
    CENTRIFUGO_WS_URL: JSON.stringify(centrifugoWsUrl),
  }
})
