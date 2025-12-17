#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';

/**
 * 同步 node_modules/interaqt/agent 下的所有文件和目录到项目根目录
 * 会覆盖已存在的同名文件/目录
 */

const sourceDir = path.join(process.cwd(), 'node_modules/interaqt/agent');
const targetDir = process.cwd();

interface SyncStats {
  copiedFiles: number;
  copiedDirs: number;
  skippedItems: number;
  errors: string[];
}

/**
 * 检查路径是否存在
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 递归复制目录
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  // 确保目标目录存在
  await fs.mkdir(dest, { recursive: true });
  
  const items = await fs.readdir(src, { withFileTypes: true });
  
  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    
    if (item.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * 递归删除目录
 */
async function removeDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`警告: 删除目录 ${dirPath} 时出错:`, error);
  }
}

/**
 * 同步单个项目（文件或目录）
 */
async function syncItem(itemName: string, stats: SyncStats): Promise<void> {
  const sourcePath = path.join(sourceDir, itemName);
  const targetPath = path.join(targetDir, itemName);
  
  try {
    const sourceStats = await fs.stat(sourcePath);
    const targetExists = await pathExists(targetPath);
    
    if (sourceStats.isDirectory()) {
      // 如果目标已存在，先删除
      if (targetExists) {
        console.log(`删除已存在的目录: ${itemName}`);
        await removeDirectory(targetPath);
      }
      
      console.log(`复制目录: ${itemName}`);
      await copyDirectory(sourcePath, targetPath);
      stats.copiedDirs++;
    } else {
      // 复制文件
      if (targetExists) {
        console.log(`覆盖已存在的文件: ${itemName}`);
      } else {
        console.log(`复制文件: ${itemName}`);
      }
      
      // 确保目标目录存在
      const targetDirPath = path.dirname(targetPath);
      await fs.mkdir(targetDirPath, { recursive: true });
      
      await fs.copyFile(sourcePath, targetPath);
      stats.copiedFiles++;
    }
  } catch (error) {
    const errorMsg = `同步 ${itemName} 时出错: ${error}`;
    console.error(errorMsg);
    stats.errors.push(errorMsg);
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('开始同步 interaqt/agent 文件...');
  console.log(`源目录: ${sourceDir}`);
  console.log(`目标目录: ${targetDir}`);
  console.log('');
  
  // 检查源目录是否存在
  const sourceExists = await pathExists(sourceDir);
  if (!sourceExists) {
    console.error(`错误: 源目录不存在: ${sourceDir}`);
    console.error('请确保已安装 interaqt 包');
    process.exit(1);
  }
  
  const stats: SyncStats = {
    copiedFiles: 0,
    copiedDirs: 0,
    skippedItems: 0,
    errors: []
  };
  
  try {
    // 读取源目录下的所有项目
    const items = await fs.readdir(sourceDir);
    
    if (items.length === 0) {
      console.log('源目录为空，没有需要同步的文件');
      return;
    }
    
    console.log(`发现 ${items.length} 个项目需要同步:`);
    items.forEach(item => console.log(`  - ${item}`));
    console.log('');
    
    // 逐个同步项目
    for (const item of items) {
      await syncItem(item, stats);
    }
    
    // 输出统计信息
    console.log('');
    console.log('同步完成！');
    console.log(`统计信息:`);
    console.log(`  - 复制的文件: ${stats.copiedFiles}`);
    console.log(`  - 复制的目录: ${stats.copiedDirs}`);
    console.log(`  - 跳过的项目: ${stats.skippedItems}`);
    
    if (stats.errors.length > 0) {
      console.log(`  - 错误数量: ${stats.errors.length}`);
      console.log('');
      console.log('错误详情:');
      stats.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (stats.errors.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('同步过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('未捕获的错误:', error);
  process.exit(1);
});
