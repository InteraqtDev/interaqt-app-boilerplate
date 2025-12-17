import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Deployer } from '../../src/deployer.js';
import { writeFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Deployer Integration Tests', () => {
  const testConfigDir = './test-integration-config';
  const testConfigPath = join(testConfigDir, 'app.config.json');

  beforeAll(async () => {
    // 创建测试配置目录
    if (!existsSync(testConfigDir)) {
      await mkdir(testConfigDir, { recursive: true });
    }

    // 创建测试配置文件
    const testConfig = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        testapp: {
          name: '测试应用',
          enabled: true,
          deploymentType: 'container',
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          replicas: 1,
          middlewareDependencies: {
            testdb: {
              type: 'postgresql',
              deploymentType: 'container',
              use: 'postgresql',
              endpoint: '',
              replicas: 1,
              config: {
                username: 'testuser',
                password: 'testpass',
                database: 'testdb'
              }
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {
        testapp: 'http://localhost:3000'
      }
    };

    await writeFile(testConfigPath, JSON.stringify(testConfig, null, 2), 'utf-8');
  });

  afterAll(async () => {
    // 清理测试文件
    if (existsSync(testConfigDir)) {
      await rm(testConfigDir, { recursive: true, force: true });
    }

    // 清理生成的 terraform 文件
    if (existsSync('./terraform/generated')) {
      await rm('./terraform/generated', { recursive: true, force: true });
    }
  });

  test('应该能够加载配置并生成部署计划', async () => {
    const deployer = new Deployer(testConfigPath);
    const plan = await deployer.plan();

    expect(plan).toBeDefined();
    expect(plan.namespace).toBe('lit-test');
    expect(plan.containerMiddleware).toHaveLength(1);
    expect(plan.containerMiddleware[0].middlewareName).toBe('testdb');
    expect(plan.components).toHaveLength(1);
    expect(plan.components[0].componentName).toBe('testapp');
  });

  test('应该能够验证配置', async () => {
    const deployer = new Deployer(testConfigPath);
    
    // 这个测试会执行到验证阶段，但不会真正部署
    // 因为我们没有 Terraform 环境
    await expect(deployer.plan()).resolves.toBeDefined();
  });

  test('应该正确识别 cloud 类型的中间件', async () => {
    // 创建带有 cloud 类型中间件的配置
    const configWithCloud = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        testapp: {
          name: '测试应用',
          enabled: true,
          deploymentType: 'local',
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          replicas: 1,
          middlewareDependencies: {
            cloudStorage: {
              type: 'minio',
              deploymentType: 'cloud',
              endpoint: 'https://test-storage.example.com',
              config: {}
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {
        testapp: 'http://localhost:3000'
      }
    };

    const cloudConfigPath = join(testConfigDir, 'cloud-config.json');
    await writeFile(cloudConfigPath, JSON.stringify(configWithCloud, null, 2), 'utf-8');

    const deployer = new Deployer(cloudConfigPath);
    const plan = await deployer.plan();

    expect(plan.cloudDependencies).toHaveLength(1);
    expect(plan.cloudDependencies[0].middlewareName).toBe('cloudStorage');
    expect(plan.cloudDependencies[0].endpoint).toBe('https://test-storage.example.com');
    expect(plan.containerMiddleware).toHaveLength(0);
  });

  test('应该正确处理 local 类型的组件', async () => {
    const configWithLocal = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        localapp: {
          name: '本地应用',
          enabled: true,
          deploymentType: 'local',
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          middlewareDependencies: {},
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {
        localapp: 'http://localhost:3000'
      }
    };

    const localConfigPath = join(testConfigDir, 'local-config.json');
    await writeFile(localConfigPath, JSON.stringify(configWithLocal, null, 2), 'utf-8');

    const deployer = new Deployer(localConfigPath);
    const plan = await deployer.plan();

    expect(plan.components).toHaveLength(1);
    expect(plan.components[0].deploymentType).toBe('local');
  });
});

