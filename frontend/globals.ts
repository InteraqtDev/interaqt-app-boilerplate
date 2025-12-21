/**
 * 前端全局配置生成
 * 
 * 从 ../config.ts 读取配置，提取所有 publicUrl，生成供 vite define 使用的 kv 对象
 */
import { config } from '../config'

/**
 * 将 camelCase 或 PascalCase 转换为 SCREAMING_SNAKE_CASE
 */
function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toUpperCase()
}

/**
 * 将 HTTP URL 转换为 WebSocket URL
 */
function httpToWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws')
}

type DefineValue = Record<string, string>

/**
 * 遍历配置，收集所有 publicUrl 并生成 kv 对象
 */
function generateGlobals(): DefineValue {
  const result: DefineValue = {}

  // 遍历所有 components
  for (const [componentName, componentConfig] of Object.entries(config.components)) {
    if (!componentConfig || typeof componentConfig !== 'object') continue

    const componentPrefix = toScreamingSnakeCase(componentName)

    // 1. Component 自身的 publicUrl
    if ('publicUrl' in componentConfig && typeof componentConfig.publicUrl === 'string') {
      result[`${componentPrefix}_PUBLIC_URL`] = JSON.stringify(componentConfig.publicUrl)
      // 同时生成 WebSocket 版本
      result[`${componentPrefix}_WS_URL`] = JSON.stringify(httpToWsUrl(componentConfig.publicUrl))
    }

    // 2. middlewareDependencies 下的 endpoints 的 publicUrl
    if ('middlewareDependencies' in componentConfig && componentConfig.middlewareDependencies) {
      const middlewares = componentConfig.middlewareDependencies as Record<string, unknown>
      
      for (const [middlewareName, middlewareConfig] of Object.entries(middlewares)) {
        if (!middlewareConfig || typeof middlewareConfig !== 'object') continue

        const middlewarePrefix = toScreamingSnakeCase(middlewareName)
        const mwConfig = middlewareConfig as Record<string, unknown>

        // 检查 endpoints
        if ('endpoints' in mwConfig && mwConfig.endpoints && typeof mwConfig.endpoints === 'object') {
          const endpoints = mwConfig.endpoints as Record<string, unknown>
          
          for (const [endpointName, endpointConfig] of Object.entries(endpoints)) {
            if (!endpointConfig || typeof endpointConfig !== 'object') continue

            const endpointPrefix = toScreamingSnakeCase(endpointName)
            const epConfig = endpointConfig as Record<string, unknown>

            if ('publicUrl' in epConfig && typeof epConfig.publicUrl === 'string') {
              // 生成完整的 key: COMPONENT_MIDDLEWARE_ENDPOINT_PUBLIC_URL
              const key = `${componentPrefix}_${middlewarePrefix}_${endpointPrefix}_PUBLIC_URL`
              result[key] = JSON.stringify(epConfig.publicUrl)
              
              // 同时生成 WebSocket 版本
              const wsKey = `${componentPrefix}_${middlewarePrefix}_${endpointPrefix}_WS_URL`
              result[wsKey] = JSON.stringify(httpToWsUrl(epConfig.publicUrl))
            }
          }
        }
      }
    }
  }

  // 添加基础 API URL (指向 main component)
  if (config.components.main?.publicUrl) {
    result['BASE_URL'] = JSON.stringify('/api')
    result['API_BASE_URL'] = JSON.stringify(config.components.main.publicUrl)
  }

  return result
}

/**
 * 导出供 vite.config.ts 使用的 define 对象
 */
export const viteDefineGlobals = generateGlobals()

/**
 * 打印所有生成的全局变量（用于调试）
 */
export function printGlobals(): void {
  console.log('Generated Vite Define Globals:')
  for (const [key, value] of Object.entries(viteDefineGlobals)) {
    console.log(`  ${key}: ${value}`)
  }
}

