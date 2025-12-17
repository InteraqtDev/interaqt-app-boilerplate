import { describe, test, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * 云服务 Terraform Module 测试
 * 
 * 测试目标：
 * 1. 验证 module 文件存在
 * 2. 验证 module 定义了必需的资源
 * 3. 验证 module 的 outputs 定义正确
 * 4. 验证 module 的 variables 定义正确
 */
describe('Cloud Terraform Modules', () => {
  const modulesDir = join(__dirname, '../../terraform/modules/cloud/volcengine');

  describe('Redis Module', () => {
    const redisModuleDir = join(modulesDir, 'redis');

    test('应该存在所有必需的文件', () => {
      expect(existsSync(join(redisModuleDir, 'main.tf'))).toBe(true);
      expect(existsSync(join(redisModuleDir, 'variables.tf'))).toBe(true);
      expect(existsSync(join(redisModuleDir, 'outputs.tf'))).toBe(true);
    });

    test('main.tf 应该定义 Redis 实例资源', async () => {
      const mainContent = await readFile(join(redisModuleDir, 'main.tf'), 'utf-8');
      
      // 验证 resource 定义
      expect(mainContent).toContain('resource "volcengine_redis_instance" "this"');
      
      // 验证关键配置参数
      expect(mainContent).toContain('instance_name');
      expect(mainContent).toContain('instance_class');
      expect(mainContent).toContain('engine_version');
      expect(mainContent).toContain('password');
      
      // 验证 tags
      expect(mainContent).toContain('tags');
      expect(mainContent).toContain('managed-by');
    });

    test('variables.tf 应该定义所有必需的变量', async () => {
      const varsContent = await readFile(join(redisModuleDir, 'variables.tf'), 'utf-8');
      
      const requiredVars = [
        'resource_name',
        'environment',
        'password',
        'instance_type',
        'engine_version'
      ];
      
      for (const varName of requiredVars) {
        expect(varsContent).toContain(`variable "${varName}"`);
      }
      
      // 验证敏感变量标记
      expect(varsContent).toMatch(/variable\s+"password"[\s\S]*sensitive\s*=\s*true/);
    });

    test('outputs.tf 应该定义所有必需的 outputs', async () => {
      const outputsContent = await readFile(join(redisModuleDir, 'outputs.tf'), 'utf-8');
      
      const requiredOutputs = [
        'instance_id',
        'endpoint',
        'port',
        'password',
        'connection_string'
      ];
      
      for (const outputName of requiredOutputs) {
        expect(outputsContent).toContain(`output "${outputName}"`);
      }
      
      // 验证敏感 output 标记
      expect(outputsContent).toMatch(/output\s+"password"[\s\S]*sensitive\s*=\s*true/);
      expect(outputsContent).toMatch(/output\s+"connection_string"[\s\S]*sensitive\s*=\s*true/);
    });
  });

  describe('PostgreSQL Module', () => {
    const pgModuleDir = join(modulesDir, 'rds-postgresql');

    test('应该存在所有必需的文件', () => {
      expect(existsSync(join(pgModuleDir, 'main.tf'))).toBe(true);
      expect(existsSync(join(pgModuleDir, 'variables.tf'))).toBe(true);
      expect(existsSync(join(pgModuleDir, 'outputs.tf'))).toBe(true);
    });

    test('main.tf 应该定义 RDS PostgreSQL 实例资源', async () => {
      const mainContent = await readFile(join(pgModuleDir, 'main.tf'), 'utf-8');
      
      // 验证 resource 定义
      expect(mainContent).toContain('resource "volcengine_rds_postgresql_instance" "this"');
      expect(mainContent).toContain('resource "volcengine_rds_postgresql_database" "this"');
      
      // 验证关键配置参数
      expect(mainContent).toContain('instance_name');
      expect(mainContent).toContain('db_engine_version');
      expect(mainContent).toContain('super_account_name');
      expect(mainContent).toContain('super_account_password');
      
      // 验证 tags
      expect(mainContent).toContain('tags');
      expect(mainContent).toContain('managed-by');
    });

    test('variables.tf 应该定义所有必需的变量', async () => {
      const varsContent = await readFile(join(pgModuleDir, 'variables.tf'), 'utf-8');
      
      const requiredVars = [
        'resource_name',
        'environment',
        'username',
        'password',
        'database_name',
        'engine_version'
      ];
      
      for (const varName of requiredVars) {
        expect(varsContent).toContain(`variable "${varName}"`);
      }
      
      // 验证敏感变量标记
      expect(varsContent).toMatch(/variable\s+"password"[\s\S]*sensitive\s*=\s*true/);
    });

    test('outputs.tf 应该定义所有必需的 outputs', async () => {
      const outputsContent = await readFile(join(pgModuleDir, 'outputs.tf'), 'utf-8');
      
      const requiredOutputs = [
        'instance_id',
        'endpoint',
        'port',
        'username',
        'password',
        'database',
        'connection_string'
      ];
      
      for (const outputName of requiredOutputs) {
        expect(outputsContent).toContain(`output "${outputName}"`);
      }
      
      // 验证敏感 output 标记
      expect(outputsContent).toMatch(/output\s+"password"[\s\S]*sensitive\s*=\s*true/);
      expect(outputsContent).toMatch(/output\s+"connection_string"[\s\S]*sensitive\s*=\s*true/);
    });
  });

  describe('Module 一致性', () => {
    test('所有模块应该使用相同的 provider 版本', async () => {
      const redisMain = await readFile(join(modulesDir, 'redis/main.tf'), 'utf-8');
      const pgMain = await readFile(join(modulesDir, 'rds-postgresql/main.tf'), 'utf-8');
      
      // 提取 provider 版本
      const versionRegex = /version\s*=\s*"([^"]+)"/;
      const redisVersion = redisMain.match(versionRegex)?.[1];
      const pgVersion = pgMain.match(versionRegex)?.[1];
      
      expect(redisVersion).toBeDefined();
      expect(pgVersion).toBeDefined();
      expect(redisVersion).toBe(pgVersion);
    });

    test('所有模块应该包含环境标签', async () => {
      const modules = ['redis', 'rds-postgresql'];
      
      for (const moduleName of modules) {
        const mainContent = await readFile(
          join(modulesDir, moduleName, 'main.tf'),
          'utf-8'
        );
        
        expect(mainContent).toContain('key   = "environment"');
        expect(mainContent).toContain('value = var.environment');
      }
    });

    test('所有模块应该有等待资源的配置', async () => {
      const modules = ['redis', 'rds-postgresql'];
      
      for (const moduleName of modules) {
        const mainContent = await readFile(
          join(modulesDir, moduleName, 'main.tf'),
          'utf-8'
        );
        
        // 验证有等待机制
        expect(mainContent).toMatch(/resource\s+"time_sleep"/);
        expect(mainContent).toContain('create_duration');
      }
    });
  });
});

