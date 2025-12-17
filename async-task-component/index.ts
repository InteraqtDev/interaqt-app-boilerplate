/**
 * AsyncTask Component
 * 
 * 基于 Temporal 的异步任务执行组件
 * 
 * 导出：
 * - WorkflowCollector: 收集 integration workflows
 * - WorkerManager: 管理 Temporal Workers
 */

export {
  collectIntegrationWorkflows,
  loadWorkflowModule,
  loadActivitiesModule,
  type IntegrationWorkflowInfo
} from './workflow-collector.js'

export {
  WorkerManager,
  type WorkerStatus
} from './worker-manager.js'
