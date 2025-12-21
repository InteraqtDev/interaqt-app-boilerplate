import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { config } from '../config'
import { viteDefineGlobals } from './globals'

// 从配置中获取 main component URL 用于代理
const mainComponentUrl = config.components.main?.publicUrl || 'http://localhost:3000'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 启用 HTTPS，以便在网络 IP 访问时也能使用麦克风等需要安全上下文的 API
    // basicSsl()
  ],
  define: {
    ...viteDefineGlobals,
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
