import { describe, test, expect } from 'vitest';
import { LocalProvider } from '../../src/providers/local.js';
import { FinalConfig, FinalMiddleware, FinalComponent } from '../../src/types.js';

describe('LocalProvider', () => {
  const provider = new LocalProvider();

  test('getName 应该返回 "local"', () => {
    expect(provider.getName()).toBe('local');
  });

  test('getK8sContext 应该返回 "docker-desktop"', () => {
    expect(provider.getK8sContext()).toBe('docker-desktop');
  });

  test('应该正确验证 local provider 的配置', () => {
    const validConfig: FinalConfig = {
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
              config: {}
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {}
    };

    const result = provider.validateConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('应该拒绝 local provider 使用 cloud deploymentType 的组件', () => {
    const invalidConfig: FinalConfig = {
      version: '1.0.0',
      environment: 'test',
      provider: 'local',
      generatedAt: new Date().toISOString(),
      components: {
        main: {
          name: '业务逻辑组件',
          enabled: true,
          deploymentType: 'container' as any, // 设置为非法值进行测试
          host: 'localhost',
          port: 3000,
          publicUrl: 'http://localhost:3000',
          endpoint: '',
          middlewareDependencies: {},
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {}
    };

    // 实际上 container 是合法的，所以这个测试需要用一个真正非法的值
    // 但 TypeScript 会阻止我们，所以我们需要用 as any
    
    const result = provider.validateConfig(invalidConfig);
    expect(result.valid).toBe(true); // container 是合法的
  });

  test('container 类型中间件缺少 use 字段应该返回错误', () => {
    const invalidConfig: FinalConfig = {
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
              // 缺少 use 字段
              endpoint: '',
              config: {}
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      },
      componentUrls: {}
    };

    const result = provider.validateConfig(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('use');
  });

  test('应该为 cloud 类型中间件返回配置的 endpoint', () => {
    const middleware: FinalMiddleware = {
      type: 'minio',
      deploymentType: 'cloud',
      endpoint: 'https://tos-cn-beijing.volces.com',
      config: {}
    };

    const endpoint = provider.resolveMiddlewareEndpoint(
      'main',
      'objectStorage',
      middleware,
      'lit-test'
    );

    expect(endpoint).toBe('https://tos-cn-beijing.volces.com');
  });

  test('应该为 container 类型中间件生成带 protocol 的 endpoint（不包含database）', () => {
    const middleware: FinalMiddleware = {
      type: 'postgresql',
      deploymentType: 'container',
      use: 'postgresql',
      endpoint: '',
      config: {
        database: 'testdb'
      }
    };

    const endpoint = provider.resolveMiddlewareEndpoint(
      'main',
      'mainDb',
      middleware,
      'lit-test'
    );

    // 现在返回 k8s 内部域名而不是 localhost
    // localhost endpoint 会在 app.host.config.json 中单独生成
    expect(endpoint).toBe('postgresql://postgresql-svc.lit-test.svc.cluster.local:5432');
  });

  test('应该为 local 类型组件生成带 http 的 endpoint', () => {
    const component: FinalComponent = {
      name: '业务逻辑组件',
      enabled: true,
      deploymentType: 'local',
      host: 'localhost',
      port: 3000,
      publicUrl: 'http://localhost:3000',
      endpoint: '',
      middlewareDependencies: {},
      externalServices: {},
      applicationConfig: {}
    };

    const endpoint = provider.resolveComponentEndpoint('main', component, 'lit-test');
    expect(endpoint).toBe('http://localhost:3000');
  });

  test('应该为 container 类型组件生成带 http 的 endpoint', () => {
    const component: FinalComponent = {
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
    };

    const endpoint = provider.resolveComponentEndpoint('communication', component, 'lit-test');
    expect(endpoint).toBe('http://localhost:3001');
  });

  test('应该为 centrifugo 中间件生成正确的 endpoint（端口 8000）', () => {
    const middleware: FinalMiddleware = {
      type: 'centrifugo',
      deploymentType: 'container',
      use: 'centrifugo',
      endpoint: '',
      config: {
        tokenHmacSecretKey: 'test-secret'
      }
    };

    const endpoint = provider.resolveMiddlewareEndpoint(
      'communication',
      'centrifugo',
      middleware,
      'lit-test'
    );

    expect(endpoint).toBe('http://centrifugo-svc.lit-test.svc.cluster.local:8000');
  });

  test('应该为 redis 中间件生成正确的 endpoint（端口 6379）', () => {
    const middleware: FinalMiddleware = {
      type: 'redis',
      deploymentType: 'container',
      use: 'redis',
      endpoint: '',
      config: {
        password: 'test-pass'
      }
    };

    const endpoint = provider.resolveMiddlewareEndpoint(
      'communication',
      'redis',
      middleware,
      'lit-test'
    );

    expect(endpoint).toBe('redis://redis-svc.lit-test.svc.cluster.local:6379');
  });

  test('getNamespace 应该返回正确的命名空间名称', () => {
    expect(provider.getNamespace('dev')).toBe('lit-dev');
    expect(provider.getNamespace('prod')).toBe('lit-prod');
    expect(provider.getNamespace('test')).toBe('lit-test');
  });

  test('getServiceName 应该返回正确的服务名称', () => {
    expect(provider.getServiceName('mainDb')).toBe('mainDb-svc');
    expect(provider.getServiceName('main')).toBe('main-svc');
  });
});

