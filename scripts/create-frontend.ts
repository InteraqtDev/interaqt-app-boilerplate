#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

const FRONTEND_REPO = 'git@github.com:InteraqtDev/axii-frontend-boilerplate.git';
const FRONTEND_DIR = path.join(process.cwd(), 'frontend');

async function createFrontend() {
  try {
    console.log('🚀 Creating frontend from boilerplate...');
    
    // Check if frontend directory already exists
    if (existsSync(FRONTEND_DIR)) {
      console.log('⚠️  Frontend directory already exists. Removing it first...');
      rmSync(FRONTEND_DIR, { recursive: true, force: true });
    }
    
    // Clone the repository
    console.log('📦 Cloning frontend boilerplate...');
    execSync(`git clone ${FRONTEND_REPO} frontend`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Remove .git directory from cloned repository
    const gitDir = path.join(FRONTEND_DIR, '.git');
    if (existsSync(gitDir)) {
      console.log('🧹 Removing .git directory...');
      rmSync(gitDir, { recursive: true, force: true });
    }
    
    console.log('✅ Frontend boilerplate successfully created!');
    console.log(`📁 Frontend directory: ${FRONTEND_DIR}`);
    
  } catch (error) {
    console.error('❌ Error creating frontend:', error);
    process.exit(1);
  }
}

// Run the script
createFrontend();
