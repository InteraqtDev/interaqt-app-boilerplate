import { describe, test, expect, beforeEach } from 'vitest';
import { EndpointManager } from '../../src/endpoint-manager.js';
import { LocalProvider } from '../../src/providers/local.js';
import { FinalConfig } from '../../src/types.js';

describe('EndpointManager', () => {
  let config: FinalConfig;
  let manager: EndpointManager;
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
    
    // 创建测试配置
    config = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        main: {
          name: '业务逻辑组件',
          enabled: true,
          deploymentType: 'local',
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          middlewareDependencies: {
            mainDb: {
              type: 'postgresql',
              deploymentType: 'container',
              use: 'postgresql',
              endpoint: '',
              config: {
                username: 'testuser',
                password: 'testpass',
                database: 'testdb'
              }
            },
            objectStorage: {
              type: 'minio',
              deploymentType: 'cloud',
              endpoint: 'https://tos-cn-beijing.volces.com',
              config: {
                region: 'cn-beijing',
                bucket: 'test'
              }
            },
            messageQueue: {
              type: 'kafka',
              deploymentType: 'cloud',
              endpoint: 'kafka-test.kafka.cn-beijing.volces.com:9491',
              config: {
                instanceId: 'kafka-test'
              }
            }
          },
          externalServices: {},
          applicationConfig: {}
        },
        communication: {
          name: '通信组件',
          enabled: true,
          deploymentType: 'container',
          host: 'localhost',
          port: 3001,
          publicUrl: 'http://localhost:3001',
          endpoint: '',
          middlewareDependencies: {},
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {
        main: 'http://localhost:3000',
        communication: 'http://localhost:3001'
      }
    };

    manager = new EndpointManager(config, './test-config.json', provider);
  });

  test('应该验证 cloud 类型 middleware 的 endpoint 已配置', () => {
    const result = manager.validateCloudEndpoints();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('cloud 类型 middleware 缺少 endpoint 应该返回错误', () => {
    // 移除一个 cloud 类型的 endpoint
    config.components.main.middlewareDependencies.objectStorage.endpoint = '';
    
    const manager2 = new EndpointManager(config, './test-config.json', provider);
    const result = manager2.validateCloudEndpoints();
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('objectStorage');
  });

  test('应该正确保留 cloud 类型 middleware 的 endpoint', () => {
    manager.fillAllEndpoints();
    
    const objectStorageEndpoint = manager.getMiddlewareEndpoint('main', 'objectStorage');
    expect(objectStorageEndpoint).toBe('https://tos-cn-beijing.volces.com');
    
    const messageQueueEndpoint = manager.getMiddlewareEndpoint('main', 'messageQueue');
    expect(messageQueueEndpoint).toBe('kafka-test.kafka.cn-beijing.volces.com:9491');
  });

  test('应该为 container 类型 middleware 生成带 protocol 的 endpoint', () => {
    manager.fillAllEndpoints();
    
    const mainDbEndpoint = manager.getMiddlewareEndpoint('main', 'mainDb');
    // 现在返回 k8s 内部域名而不是 localhost
    expect(mainDbEndpoint).toBe('postgresql://postgresql-svc.lit-test.svc.cluster.local:5432');
  });

  test('应该为 local 部署类型的 component 生成带 http 的 endpoint', () => {
    manager.fillAllEndpoints();
    
    const mainEndpoint = manager.getComponentEndpoint('main');
    expect(mainEndpoint).toBe('http://localhost:3000');
  });

  test('应该为 container 部署类型的 component 生成带 http 的 endpoint', () => {
    manager.fillAllEndpoints();
    
    const commEndpoint = manager.getComponentEndpoint('communication');
    expect(commEndpoint).toBe('http://localhost:3001');
  });

  test('应该能够获取所有 endpoint 信息', () => {
    manager.fillAllEndpoints();
    
    const endpoints = manager.getAllEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    
    // 验证包含组件 endpoint
    const mainEndpoint = endpoints.find(
      e => e.componentName === 'main' && e.type === 'component'
    );
    expect(mainEndpoint).toBeDefined();
    expect(mainEndpoint?.endpoint).toBe('http://localhost:3000');
    
    // 验证包含中间件 endpoint
    const mainDbEndpoint = endpoints.find(
      e => e.componentName === 'main' && e.middlewareName === 'mainDb' && e.type === 'middleware'
    );
    expect(mainDbEndpoint).toBeDefined();
    // 现在返回 k8s 内部域名而不是 localhost
    expect(mainDbEndpoint?.endpoint).toBe('postgresql://postgresql-svc.lit-test.svc.cluster.local:5432');
  });

  test('应该能够单独填写中间件 endpoint', () => {
    const testEndpoint = 'test-endpoint:1234';
    manager.fillMiddlewareEndpoint('main', 'mainDb', testEndpoint);
    
    const endpoint = manager.getMiddlewareEndpoint('main', 'mainDb');
    expect(endpoint).toBe(testEndpoint);
  });

  test('应该能够单独填写组件 endpoint', () => {
    const testEndpoint = 'test-component:5678';
    manager.fillComponentEndpoint('main', testEndpoint);
    
    const endpoint = manager.getComponentEndpoint('main');
    expect(endpoint).toBe(testEndpoint);
  });

  test('获取不存在的组件或中间件应该抛出错误', () => {
    expect(() => {
      manager.getComponentEndpoint('nonexistent');
    }).toThrow();

    expect(() => {
      manager.getMiddlewareEndpoint('main', 'nonexistent');
    }).toThrow();
  });

  test('应该能够生成 host 配置文件，将 container middleware endpoint 替换为 localhost', async () => {
    // 先填充所有 endpoints（使用 k8s 内部域名）
    manager.fillAllEndpoints();
    
    // 验证原始配置使用 k8s 内部域名
    const originalEndpoint = manager.getMiddlewareEndpoint('main', 'mainDb');
    expect(originalEndpoint).toBe('postgresql://postgresql-svc.lit-test.svc.cluster.local:5432');
    
    // 生成 host 配置
    await manager.generateHostConfig();
    
    // 验证生成的 host 配置文件存在
    const { readFileSync, existsSync } = await import('fs');
    const hostConfigPath = './test-config.host.json';
    expect(existsSync(hostConfigPath)).toBe(true);
    
    // 读取 host 配置文件内容
    const hostConfigContent = readFileSync(hostConfigPath, 'utf-8');
    const hostConfig = JSON.parse(hostConfigContent);
    
    // 验证 host 配置中 container middleware 的 endpoint 被替换为 localhost
    const hostMainDbEndpoint = hostConfig.components.main.middlewareDependencies.mainDb.endpoint;
    expect(hostMainDbEndpoint).toBe('postgresql://localhost:5432');
    
    // 验证 cloud middleware 的 endpoint 保持不变
    const hostObjectStorageEndpoint = hostConfig.components.main.middlewareDependencies.objectStorage.endpoint;
    expect(hostObjectStorageEndpoint).toBe('https://tos-cn-beijing.volces.com');
    
    // 验证 component endpoint 保持不变
    const hostMainEndpoint = hostConfig.components.main.endpoint;
    expect(hostMainEndpoint).toBe('http://localhost:3000');
    
    // 验证原始配置没有被修改
    const originalEndpointAfter = manager.getMiddlewareEndpoint('main', 'mainDb');
    expect(originalEndpointAfter).toBe('postgresql://postgresql-svc.lit-test.svc.cluster.local:5432');
  });
});

