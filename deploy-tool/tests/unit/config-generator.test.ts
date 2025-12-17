/**
 * ConfigGenerator 测试
 * 验证配置生成和合并逻辑
 */
import { describe, it, expect } from 'vitest';
import { ConfigGenerator } from '../../src/config-generator.js';
import type { ApplicationConfig, DeploymentConfig } from '../../../config/types.js';

describe('ConfigGenerator - Middleware 合并', () => {
  it('should merge middleware from application.json', () => {
    const applicationConfig: ApplicationConfig = {
      version: '1.0.0',
      components: {
        main: {
          name: '测试组件',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              type: 'postgresql',
              version: '>=14.0.0',
              publicAccess: false,
              requiredFields: ['username', 'password', 'database']
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const deploymentConfig: DeploymentConfig = {
      provider: 'local',
      environment: 'test',
      components: {
        main: {
          deploymentType: 'local',
          replicas: 1,
          host: 'localhost',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              deploymentType: 'container',
              use: 'postgresql',
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
      }
    };

    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, 'test');
    const finalConfig = generator.generate();

    expect(finalConfig).toBeDefined();
    expect(finalConfig?.components.main.middlewareDependencies.mainDb).toBeDefined();
    expect(finalConfig?.components.main.middlewareDependencies.mainDb.type).toBe('postgresql');
    expect(finalConfig?.components.main.middlewareDependencies.mainDb.version).toBe('>=14.0.0');
  });

  it('should merge extra middleware from deploy.{env}.json that are not in application.json', () => {
    const applicationConfig: ApplicationConfig = {
      version: '1.0.0',
      components: {
        communication: {
          name: '通信组件',
          port: 3001,
          middlewareDependencies: {
            centrifugo: {
              type: 'centrifugo',
              version: 'v6.5.1',
              publicAccess: true,
              requiredFields: ['tokenHmacSecretKey']
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const deploymentConfig: DeploymentConfig = {
      provider: 'local',
      environment: 'test',
      components: {
        communication: {
          deploymentType: 'local',
          replicas: 1,
          host: 'localhost',
          port: 3001,
          middlewareDependencies: {
            // centrifugo 在 application.json 中已定义
            centrifugo: {
              deploymentType: 'container',
              use: 'centrifugo',
              replicas: 1,
              dependencies: ['components.communication.middlewareDependencies.redis'],
              config: {
                tokenHmacSecretKey: 'test-secret',
                engine: 'redis',
                redisAddress: '${ref:components.communication.middlewareDependencies.redis.endpoint}',
                redisPassword: '${ref:components.communication.middlewareDependencies.redis.config.password}'
              }
            },
            // redis 在 application.json 中未定义，是额外添加的
            redis: {
              deploymentType: 'container',
              use: 'redis',
              version: '7.0.15',
              replicas: 1,
              config: {
                password: 'redis123456'
              }
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, 'test');
    const finalConfig = generator.generate();

    expect(finalConfig).toBeDefined();
    
    // 验证 centrifugo（在 application.json 中定义的）被正确合并
    expect(finalConfig?.components.communication.middlewareDependencies.centrifugo).toBeDefined();
    expect(finalConfig?.components.communication.middlewareDependencies.centrifugo.type).toBe('centrifugo');
    expect(finalConfig?.components.communication.middlewareDependencies.centrifugo.version).toBe('v6.5.1');
    
    // 验证 redis（只在 deploy.{env}.json 中定义的）也被正确合并
    expect(finalConfig?.components.communication.middlewareDependencies.redis).toBeDefined();
    expect(finalConfig?.components.communication.middlewareDependencies.redis.type).toBe('redis');
    expect(finalConfig?.components.communication.middlewareDependencies.redis.use).toBe('redis');
    expect(finalConfig?.components.communication.middlewareDependencies.redis.config.password).toBe('redis123456');
  });

  it('should use "use" field as type for extra middleware', () => {
    const applicationConfig: ApplicationConfig = {
      version: '1.0.0',
      components: {
        main: {
          name: '测试组件',
          port: 3000,
          middlewareDependencies: {},
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const deploymentConfig: DeploymentConfig = {
      provider: 'local',
      environment: 'test',
      components: {
        main: {
          deploymentType: 'local',
          replicas: 1,
          host: 'localhost',
          port: 3000,
          middlewareDependencies: {
            customMiddleware: {
              deploymentType: 'container',
              use: 'custom-image',
              replicas: 1,
              config: {
                someConfig: 'value'
              }
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, 'test');
    const finalConfig = generator.generate();

    expect(finalConfig).toBeDefined();
    expect(finalConfig?.components.main.middlewareDependencies.customMiddleware).toBeDefined();
    // 当没有在 application.json 中定义时，应该使用 "use" 字段作为 type
    expect(finalConfig?.components.main.middlewareDependencies.customMiddleware.type).toBe('custom-image');
    expect(finalConfig?.components.main.middlewareDependencies.customMiddleware.use).toBe('custom-image');
  });

  it('should handle multiple extra middleware', () => {
    const applicationConfig: ApplicationConfig = {
      version: '1.0.0',
      components: {
        main: {
          name: '测试组件',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              type: 'postgresql',
              version: '>=14.0.0',
              publicAccess: false,
              requiredFields: ['username', 'password', 'database']
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const deploymentConfig: DeploymentConfig = {
      provider: 'local',
      environment: 'test',
      components: {
        main: {
          deploymentType: 'local',
          replicas: 1,
          host: 'localhost',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              deploymentType: 'container',
              use: 'postgresql',
              replicas: 1,
              config: {
                username: 'testuser',
                password: 'testpass',
                database: 'testdb'
              }
            },
            redis: {
              deploymentType: 'container',
              use: 'redis',
              replicas: 1,
              config: {
                password: 'redis123'
              }
            },
            memcached: {
              deploymentType: 'container',
              use: 'memcached',
              replicas: 1,
              config: {}
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, 'test');
    const finalConfig = generator.generate();

    expect(finalConfig).toBeDefined();
    
    // 验证所有 middleware 都被包含
    expect(finalConfig?.components.main.middlewareDependencies.mainDb).toBeDefined();
    expect(finalConfig?.components.main.middlewareDependencies.redis).toBeDefined();
    expect(finalConfig?.components.main.middlewareDependencies.memcached).toBeDefined();
    
    // 验证 mainDb 有 version（来自 application.json）
    expect(finalConfig?.components.main.middlewareDependencies.mainDb.version).toBe('>=14.0.0');
    
    // 验证 redis 和 memcached 的 type 来自 use 字段
    expect(finalConfig?.components.main.middlewareDependencies.redis.type).toBe('redis');
    expect(finalConfig?.components.main.middlewareDependencies.memcached.type).toBe('memcached');
  });

  it('should not duplicate middleware that exist in both configs', () => {
    const applicationConfig: ApplicationConfig = {
      version: '1.0.0',
      components: {
        main: {
          name: '测试组件',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              type: 'postgresql',
              version: '>=14.0.0',
              publicAccess: false,
              requiredFields: ['username', 'password', 'database']
            }
          },
          externalServices: {},
          applicationConfig: {}
        }
      }
    };

    const deploymentConfig: DeploymentConfig = {
      provider: 'local',
      environment: 'test',
      components: {
        main: {
          deploymentType: 'local',
          replicas: 1,
          host: 'localhost',
          port: 3000,
          middlewareDependencies: {
            mainDb: {
              deploymentType: 'container',
              use: 'postgresql',
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
      }
    };

    const generator = new ConfigGenerator(applicationConfig, deploymentConfig, 'test');
    const finalConfig = generator.generate();

    expect(finalConfig).toBeDefined();
    
    const mainDbKeys = Object.keys(finalConfig?.components.main.middlewareDependencies || {}).filter(
      key => key === 'mainDb'
    );
    
    // 应该只有一个 mainDb
    expect(mainDbKeys.length).toBe(1);
    
    // 应该使用 application.json 中的元数据
    expect(finalConfig?.components.main.middlewareDependencies.mainDb.type).toBe('postgresql');
    expect(finalConfig?.components.main.middlewareDependencies.mainDb.version).toBe('>=14.0.0');
  });
});

