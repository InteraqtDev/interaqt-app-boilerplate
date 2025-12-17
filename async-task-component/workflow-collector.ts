/**
 * Workflow Collector
 * 
 * 负责收集 integrations 目录下所有 integration 的 workflows
 * 
 * 功能：
 * 1. 扫描 integrations 目录下的所有子目录
 * 2. 检查每个 integration 是否有 workflows 目录
 * 3. 过滤掉黑名单中的 integration
 * 4. 返回所有可用的 workflow 信息
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * Integration Workflow 信息
 */
export interface IntegrationWorkflowInfo {
  /** Integration 名称 */
  integrationName: string
  /** Integration 目录路径 */
  integrationPath: string
  /** Workflows 目录路径 */
  workflowsPath: string
  /** Activities 目录路径（如果存在） */
  activitiesPath?: string
  /** Task Queue 名称（基于 integration 名称生成） */
  taskQueue: string
}

/**
 * 检查目录是否存在
 */
function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory()
  } catch {
    return false
  }
}

/**
 * 检查 integration 是否在黑名单中
 * 
 * @param integrationName - Integration 名称
 * @param blacklistPrefixes - 黑名单前缀列表
 * @returns 是否在黑名单中
 */
function isBlacklisted(integrationName: string, blacklistPrefixes: string[]): boolean {
  return blacklistPrefixes.some(prefix => integrationName.startsWith(prefix))
}

/**
 * 生成 Task Queue 名称
 * 
 * 基于 integration 名称生成唯一的 task queue 名称
 * 格式：integration-{name}-queue
 */
function generateTaskQueueName(integrationName: string): string {
  // 将名称转换为小写，并替换特殊字符
  const normalizedName = integrationName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  return `integration-${normalizedName}-queue`
}

/**
 * 收集 Integration Workflows
 * 
 * 扫描指定目录下的所有 integration，收集包含 workflows 目录的 integration
 * 
 * @param integrationsPath - integrations 目录路径
 * @param blacklistPrefixes - 需要排除的 integration 名称前缀
 * @returns Integration workflow 信息列表
 */
export function collectIntegrationWorkflows(
  integrationsPath: string,
  blacklistPrefixes: string[] = []
): IntegrationWorkflowInfo[] {
  console.log(`[WorkflowCollector] Scanning integrations directory: ${integrationsPath}`)
  
  if (!directoryExists(integrationsPath)) {
    console.warn(`[WorkflowCollector] Integrations directory not found: ${integrationsPath}`)
    return []
  }

  const workflowInfos: IntegrationWorkflowInfo[] = []

  // 读取 integrations 目录下的所有子目录
  const entries = fs.readdirSync(integrationsPath, { withFileTypes: true })
  
  for (const entry of entries) {
    // 只处理目录
    if (!entry.isDirectory()) {
      continue
    }

    const integrationName = entry.name
    const integrationPath = path.join(integrationsPath, integrationName)

    // 跳过 node_modules 和其他隐藏目录
    if (integrationName.startsWith('.') || integrationName === 'node_modules') {
      console.log(`[WorkflowCollector] Skipping hidden/node_modules directory: ${integrationName}`)
      continue
    }

    // 检查黑名单
    if (isBlacklisted(integrationName, blacklistPrefixes)) {
      console.log(`[WorkflowCollector] Skipping blacklisted integration: ${integrationName}`)
      continue
    }

    // 检查是否有 workflows 目录
    const workflowsPath = path.join(integrationPath, 'workflows')
    if (!directoryExists(workflowsPath)) {
      console.log(`[WorkflowCollector] No workflows directory in: ${integrationName}`)
      continue
    }

    // 检查 workflows/index.ts 是否存在
    const workflowsIndexPath = path.join(workflowsPath, 'index.ts')
    if (!fs.existsSync(workflowsIndexPath)) {
      console.warn(`[WorkflowCollector] No index.ts in workflows directory: ${integrationName}`)
      continue
    }

    // 检查 activities 目录（可选）
    const activitiesPath = path.join(integrationPath, 'activities')
    const hasActivities = directoryExists(activitiesPath)

    const workflowInfo: IntegrationWorkflowInfo = {
      integrationName,
      integrationPath,
      workflowsPath,
      activitiesPath: hasActivities ? activitiesPath : undefined,
      taskQueue: generateTaskQueueName(integrationName)
    }

    console.log(`[WorkflowCollector] Found integration with workflows: ${integrationName}`)
    console.log(`  - Workflows path: ${workflowsPath}`)
    console.log(`  - Activities path: ${hasActivities ? activitiesPath : 'none'}`)
    console.log(`  - Task queue: ${workflowInfo.taskQueue}`)

    workflowInfos.push(workflowInfo)
  }

  console.log(`[WorkflowCollector] Found ${workflowInfos.length} integration(s) with workflows`)
  
  return workflowInfos
}

/**
 * 动态加载 workflow 模块
 * 
 * 从指定的 workflow 路径加载 workflow 函数
 * 
 * @param workflowsPath - Workflows 目录路径
 * @returns Workflow 模块导出
 */
export async function loadWorkflowModule(workflowsPath: string): Promise<Record<string, any>> {
  const indexPath = path.join(workflowsPath, 'index.ts')
  
  try {
    // 使用动态 import 加载模块
    const module = await import(indexPath)
    return module
  } catch (error: any) {
    console.error(`[WorkflowCollector] Failed to load workflow module: ${indexPath}`, error.message)
    throw error
  }
}

/**
 * 动态加载 activities 模块
 * 
 * 从指定的 activities 路径加载 activity 函数
 * 
 * @param activitiesPath - Activities 目录路径
 * @returns Activities 模块导出
 */
export async function loadActivitiesModule(activitiesPath: string): Promise<Record<string, any>> {
  const indexPath = path.join(activitiesPath, 'index.ts')
  
  try {
    // 使用动态 import 加载模块
    const module = await import(indexPath)
    return module
  } catch (error: any) {
    console.error(`[WorkflowCollector] Failed to load activities module: ${indexPath}`, error.message)
    throw error
  }
}
