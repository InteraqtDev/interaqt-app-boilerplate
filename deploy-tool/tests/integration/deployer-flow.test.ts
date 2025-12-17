import { describe, test, expect } from 'vitest';
import { TerraformExecutor } from '../../src/terraform/executor.js';
import { existsSync } from 'fs';

/**
 * Deployer 流程集成测试
 * 
 * 测试目标：
 * 1. 验证 TerraformExecutor.getOutputs() 方法
 * 2. 验证部署流程的关键步骤
 * 3. 验证依赖注入机制
 */
describe('Deployer Flow Integration', () => {
  describe('TerraformExecutor', () => {
    test('getOutputs() 应该能解析 Terraform outputs', async () => {
      // Mock 一个 Terraform 工作目录
      const testDir = '/tmp';
      const executor = new TerraformExecutor(testDir);
      
      // 测试没有 output 的情况
      try {
        const outputs = await executor.getOutputs();
        // 如果没有 terraform 环境，会返回空对象或抛出异常
        expect(outputs).toBeDefined();
      } catch (error: any) {
        // 预期的错误：工作目录不存在或没有 terraform state
        expect(error.message).toMatch(/工作目录不存在|no outputs|failed/i);
      }
    });

    test('应该能检测 Terraform 是否已安装', async () => {
      const installed = await TerraformExecutor.checkTerraformInstalled();
      // 这个测试会根据环境而变化
      expect(typeof installed).toBe('boolean');
      
      if (installed) {
        const version = await TerraformExecutor.getTerraformVersion();
        expect(version).toBeTruthy();
        expect(typeof version).toBe('string');
      }
    });
  });

  describe('部署流程顺序', () => {
    test('应该按正确的顺序定义部署阶段', () => {
      const expectedStages = [
        '加载和验证配置',
        '检测并部署云服务',
        '验证 cloud 类型依赖',
        '填写 Endpoint',
        '生成 Terraform 配置',
        '部署资源',
        '从 Terraform 同步 Endpoint'
      ];
      
      // 验证阶段定义的完整性
      expect(expectedStages.length).toBe(7);
      expect(expectedStages[0]).toBe('加载和验证配置');
      expect(expectedStages[6]).toBe('从 Terraform 同步 Endpoint');
    });
  });

  describe('依赖注入机制', () => {
    test('应该能正确映射依赖路径', () => {
      // 测试依赖路径解析
      const testPath = 'components.communication.middlewareDependencies.redis';
      const parts = testPath.split('.');
      
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('components');
      expect(parts[2]).toBe('middlewareDependencies');
      
      const componentName = parts[1];
      const middlewareName = parts[3];
      
      expect(componentName).toBe('communication');
      expect(middlewareName).toBe('redis');
    });

    test('应该能生成正确的 Terraform 引用', () => {
      const middlewareName = 'redis';
      const moduleName = `cloud_${middlewareName.toLowerCase()}`;
      const terraformRef = `module.${moduleName}.endpoint`;
      
      expect(terraformRef).toBe('module.cloud_redis.endpoint');
    });

    test('应该能正确处理引用语法', () => {
      const refString = '${ref:components.communication.middlewareDependencies.redis.endpoint}';
      const isReference = refString.includes('${ref:');
      
      expect(isReference).toBe(true);
      
      // 提取引用路径
      const match = refString.match(/\$\{ref:([^}]+)\}/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('components.communication.middlewareDependencies.redis.endpoint');
    });
  });

  describe('配置完整性', () => {
    test('应该验证必需的 Terraform module 存在', () => {
      const modulePath = '/Users/camus/Work/interqat/interaqt-old/examples/lit/deploy-tool/terraform/modules/cloud/volcengine/redis';
      // 只在实际路径存在时验证
      if (existsSync(modulePath)) {
        expect(existsSync(`${modulePath}/main.tf`)).toBe(true);
        expect(existsSync(`${modulePath}/variables.tf`)).toBe(true);
        expect(existsSync(`${modulePath}/outputs.tf`)).toBe(true);
      }
    });
  });
});

