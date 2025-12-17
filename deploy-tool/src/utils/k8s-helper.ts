import * as k8s from "@kubernetes/client-node";
import { logger } from "./logger.js";

/**
 * Kubernetes 辅助工具类
 * 提供与 K8s 集群交互的便捷方法
 */
export class K8sHelper {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;

  constructor(kubeconfig?: string, context?: string) {
    this.kc = new k8s.KubeConfig();

    if (kubeconfig) {
      this.kc.loadFromFile(kubeconfig);
    } else {
      this.kc.loadFromDefault();
    }

    if (context) {
      this.kc.setCurrentContext(context);
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  /**
   * 获取当前使用的 context
   */
  getCurrentContext(): string {
    return this.kc.getCurrentContext();
  }

  /**
   * 检查命名空间是否存在
   */
  async namespaceExists(namespace: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespace(namespace);
      return true;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取指定命名空间的 Pods
   */
  async getPods(namespace: string, labelSelector?: string): Promise<k8s.V1Pod[]> {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
      return response.body.items;
    } catch (error: any) {
      logger.error(`获取 Pods 失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取 Pod 状态
   */
  async getPodStatus(namespace: string, podName: string): Promise<string | undefined> {
    try {
      const response = await this.k8sApi.readNamespacedPod(podName, namespace);
      return response.body.status?.phase;
    } catch (error: any) {
      logger.error(`获取 Pod 状态失败: ${error.message}`);
      return undefined;
    }
  }

  /**
   * 等待 Pod 就绪
   */
  async waitForPodReady(namespace: string, labelSelector: string, timeoutSeconds: number = 300): Promise<boolean> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const pods = await this.getPods(namespace, labelSelector);

      if (pods.length === 0) {
        logger.waiting(`等待 Pod 创建... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        await this.sleep(5000);
        continue;
      }

      const allReady = pods.every((pod) => {
        const conditions = pod.status?.conditions || [];
        const readyCondition = conditions.find((c) => c.type === "Ready");
        return readyCondition?.status === "True";
      });

      if (allReady) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        logger.success(`Pod 已就绪 (${elapsedSeconds}s)`);
        return true;
      }

      logger.waiting(`等待 Pod 就绪... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
      await this.sleep(5000);
    }

    logger.error(`等待 Pod 就绪超时 (${timeoutSeconds}s)`);
    return false;
  }

  /**
   * 获取 Service
   */
  async getService(namespace: string, serviceName: string): Promise<k8s.V1Service | undefined> {
    try {
      const response = await this.k8sApi.readNamespacedService(serviceName, namespace);
      return response.body;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return undefined;
      }
      logger.error(`获取 Service 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取 Deployment
   */
  async getDeployment(namespace: string, deploymentName: string): Promise<k8s.V1Deployment | undefined> {
    try {
      const response = await this.appsApi.readNamespacedDeployment(deploymentName, namespace);
      return response.body;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return undefined;
      }
      logger.error(`获取 Deployment 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取 Pod 日志
   */
  async getPodLogs(namespace: string, podName: string, tailLines: number = 100): Promise<string> {
    try {
      const response = await this.k8sApi.readNamespacedPodLog(podName, namespace, undefined, undefined, undefined, undefined, undefined, undefined, undefined, tailLines);
      return response.body;
    } catch (error: any) {
      logger.error(`获取 Pod 日志失败: ${error.message}`);
      return "";
    }
  }

  /**
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
