import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Get current module name from .currentmodule
 */
function getCurrentModule(): string | null {
  const projectRoot = process.cwd();
  const currentModulePath = path.join(projectRoot, '.currentmodule');
  
  if (!fs.existsSync(currentModulePath)) {
    console.log('⚠️  .currentmodule not found - will use non-module-prefixed files');
    return null;
  }
  
  try {
    const module = fs.readFileSync(currentModulePath, 'utf-8').trim();
    
    if (module && typeof module === 'string') {
      console.log(`📦 Working with module: ${module}`);
      return module;
    }
    
    console.log('⚠️  .currentmodule is empty - will use non-module-prefixed files');
    return null;
  } catch (error) {
    console.log('⚠️  Error reading .currentmodule - will use non-module-prefixed files');
    return null;
  }
}

/**
 * Reset the project to start from a specific Task
 * @param taskLevel - The task to reset to (1=start Task 1, 2=start Task 2, 3=start Task 3, 4=start Task 4)
 *                    Task N will delete Task N and all subsequent outputs, keeping Task 1 to N-1
 */
async function resetProject(taskLevel: number = 1) {
  const projectRoot = process.cwd();
  const module = getCurrentModule();
  
  console.log(`Resetting project to start Task ${taskLevel}...`);
  if (module) {
    console.log(`Using module: ${module}`);
  }
  
  // Helper function to replace module placeholder
  const replaceModulePlaceholder = (template: string): string => {
    return module ? template.replace(/\$\{module\}/g, module) : template;
  };

  // Define task outputs for each level (with module prefix placeholders)
  // All outputs are now in agentspace/ directory
  const taskOutputs = {
    // Task 1 outputs
    task1: {
      agentspace: ['${module}.status.json', '${module}.data-concepts.json', '${module}.goals-analysis.json', '${module}.requirements-analysis.json', '${module}.interactions-design.json', '${module}.integration.json'],
    },
    // Task 2 outputs (in addition to Task 1)
    task2: {
      agentspace: ['${module}.data-design.json', '${module}.interaction-design.md', '${module}.computation-analysis.json'],
    },
    // Task 3 outputs (in addition to Task 1 & 2)
    task3: {
      agentspace: [
        '${module}.computation-implementation-plan.json',
        '${module}.business-rules-and-permission-control-implementation-plan.json'
      ],
      tests: ['${module}.business.test.ts', '${module}.permission.test.ts'],
      backend: ['${module}.ts'], // This will be fully implemented
      errors: true, // May contain error documents
    },
    // Task 4 outputs (in addition to Task 1, 2 & 3)
    task4: {
      // Integration design docs: agentspace/{module}.{integration-name}.integration-design.json
      // Note: Integration name is dynamic, need to use pattern matching
      integrationDesignPattern: true,
      // Integration implementation files in integrations/{integration-name}/
      // Note: These need manual cleanup as integration names are dynamic
      // Test files: tests/{integration-name}-external-api.test.ts, tests/{integration-name}-integration.test.ts
      // Note: These also need manual cleanup due to dynamic naming
    }
  };

  // Helper function to delete file safely
  const deleteFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  };

  // Helper function to delete directory safely
  const deleteDirectory = (dirPath: string) => {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    }
    return false;
  };

  // Reset based on task level - delete Task N and all subsequent outputs
  if (taskLevel <= 4) {
    // Delete Task 4 outputs
    console.log('Removing Task 4 outputs...');
    
    // Delete Task 4 error check report
    if (module) {
      const errorReportPath = path.join(projectRoot, 'agentspace', `${module}.task-4-error-check-report.md`);
      if (deleteFile(errorReportPath)) {
        console.log(`  Deleted: agentspace/${module}.task-4-error-check-report.md`);
      }
    }

    // Read integration-implementation-plan.json to get list of integrations to delete
    let integrationsToDelete: string[] = [];
    if (module) {
      const planPath = path.join(projectRoot, 'agentspace', `${module}.integration-implementation-plan.json`);
      if (fs.existsSync(planPath)) {
        try {
          const planContent = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
          // Plan structure: { metadata: {...}, integrations: [...] }
          const integrations = planContent.integrations || planContent;
          if (Array.isArray(integrations)) {
            integrationsToDelete = integrations.map((item: any) => item.name).filter(Boolean);
          }
          console.log(`  Found ${integrationsToDelete.length} integration(s) to clean up from plan`);
        } catch (error) {
          console.log(`  ⚠️  Failed to parse integration-implementation-plan.json`);
        }
      }
    }

    // Delete integration directories
    if (integrationsToDelete.length > 0) {
      const integrationsDir = path.join(projectRoot, 'integrations');
      integrationsToDelete.forEach(integrationName => {
        // Delete integration implementation directory
        const integrationDir = path.join(integrationsDir, integrationName);
        if (deleteDirectory(integrationDir)) {
          console.log(`  Deleted: integrations/${integrationName}/`);
        }
        
        // Delete integration entry file
        const entryFile = path.join(integrationsDir, 'entries', `${integrationName}.entry.ts`);
        if (deleteFile(entryFile)) {
          console.log(`  Deleted: integrations/entries/${integrationName}.entry.ts`);
        }
      });
    }

    // Delete Task 4 integration design documents (pattern: {module}.*.integration-design.json or .md)
    if (module) {
      const agentspaceDir = path.join(projectRoot, 'agentspace');
      if (fs.existsSync(agentspaceDir)) {
        const files = fs.readdirSync(agentspaceDir);
        const integrationDesignPattern = new RegExp(`^${module}\\..*\\.integration-design\\.json$`);
        let deletedCount = 0;
        files.forEach(file => {
          if (integrationDesignPattern.test(file)) {
            const filePath = path.join(agentspaceDir, file);
            if (deleteFile(filePath)) {
              console.log(`  Deleted: agentspace/${file}`);
              deletedCount++;
            }
          }
        });
        
        if (deletedCount > 0) {
          console.log(`  ℹ️  Deleted ${deletedCount} integration design document(s)`);
        }
      }
    }

    // Delete integration test files (pattern: {module}.{integration-name}.*.test.ts)
    if (module && integrationsToDelete.length > 0) {
      const testsDir = path.join(projectRoot, 'tests');
      if (fs.existsSync(testsDir)) {
        const files = fs.readdirSync(testsDir);
        integrationsToDelete.forEach(integrationName => {
          // Match patterns like: basic.nanobanana2-image.external.test.ts, basic.nanobanana2-image.integration.test.ts
          const testPattern = new RegExp(`^${module}\\.${integrationName}\\..*\\.test\\.ts$`);
          files.forEach(file => {
            if (testPattern.test(file)) {
              const filePath = path.join(testsDir, file);
              if (deleteFile(filePath)) {
                console.log(`  Deleted: tests/${file}`);
              }
            }
          });
        });
      }
    }

    // Delete integration-implementation-plan.json
    if (module) {
      const planPath = path.join(projectRoot, 'agentspace', `${module}.integration-implementation-plan.json`);
      if (deleteFile(planPath)) {
        console.log(`  Deleted: agentspace/${module}.integration-implementation-plan.json`);
      }
    }

    // Delete Task 4 progress doc
    if (module) {
      const progressPath = path.join(projectRoot, 'agentspace', `${module}.task-4-progress.md`);
      if (deleteFile(progressPath)) {
        console.log(`  Deleted: agentspace/${module}.task-4-progress.md`);
      }
    }

    // Regenerate aggregated integration to reflect remaining entries
    console.log('Regenerating integrations/entries/index.ts...');
    try {
      execSync('npm run generate:integration', { 
        stdio: 'inherit', 
        cwd: projectRoot 
      });
    } catch (error) {
      console.error('  ⚠️  Failed to regenerate integrations/entries/index.ts');
    }
  }

  if (taskLevel <= 3) {
    // Delete Task 3 outputs
    console.log('Removing Task 3 outputs...');
    
    // Delete test files from Task 3 (with module prefix replacement)
    if (module) {
      taskOutputs.task3.tests.forEach(file => {
        const actualFile = replaceModulePlaceholder(file);
        const filePath = path.join(projectRoot, 'tests', actualFile);
        if (deleteFile(filePath)) {
          console.log(`  Deleted: tests/${actualFile}`);
        }
      });
    }

    // Delete Task 3 agentspace files (with module prefix replacement)
    if (module) {
      taskOutputs.task3.agentspace.forEach(file => {
        const actualFile = replaceModulePlaceholder(file);
        const filePath = path.join(projectRoot, 'agentspace', actualFile);
        if (deleteFile(filePath)) {
          console.log(`  Deleted: agentspace/${actualFile}`);
        }
      });
    }

    // Delete Task 3 error check report
    if (module) {
      const errorReportPath = path.join(projectRoot, 'agentspace', `${module}.task-3-error-check-report.md`);
      if (deleteFile(errorReportPath)) {
        console.log(`  Deleted: agentspace/${module}.task-3-error-check-report.md`);
      }
    }

    // Clean errors directory (with module filter if applicable)
    const errorsDir = path.join(projectRoot, 'agentspace', 'errors');
    if (fs.existsSync(errorsDir)) {
      const files = fs.readdirSync(errorsDir);
      files.forEach(file => {
        // If we have a module prefix, only delete files for this module
        if (!module || file.startsWith(module)) {
          const filePath = path.join(errorsDir, file);
          if (fs.statSync(filePath).isDirectory()) {
            deleteDirectory(filePath);
          } else {
            deleteFile(filePath);
          }
        }
      });
      console.log(`  Cleaned: agentspace/errors/ directory${module ? ` (${module} module files)` : ''}`);
    }

    // Delete backend module file (e.g., backend/content.ts)
    if (module) {
      taskOutputs.task3.backend.forEach(file => {
        // Replace ${module} placeholder with actual module name
        const actualFile = file.replace('${module}', module);
        const backendFilePath = path.join(projectRoot, 'backend', actualFile);
        if (deleteFile(backendFilePath)) {
          console.log(`  Deleted: backend/${actualFile}`);
        }
      });
    }
    
    // Note: backend/index.ts is NOT deleted as it aggregates multiple modules
    // Instead, regenerate it to reflect the current backend modules
    console.log('Regenerating backend/index.ts...');
    try {
      execSync('npm run generate:aggregates', { 
        stdio: 'inherit', 
        cwd: projectRoot 
      });
    } catch (error) {
      console.error('  ⚠️  Failed to regenerate backend/index.ts');
    }
  }

  if (taskLevel <= 2) {
    // Delete Task 2 outputs
    console.log('Removing Task 2 outputs...');
    
    // Delete Task 2 agentspace files (with module prefix replacement)
    if (module) {
      taskOutputs.task2.agentspace.forEach(file => {
        const actualFile = replaceModulePlaceholder(file);
        const filePath = path.join(projectRoot, 'agentspace', actualFile);
        if (deleteFile(filePath)) {
          console.log(`  Deleted: agentspace/${actualFile}`);
        }
      });
    }

    // Delete Task 2 error check report
    if (module) {
      const errorReportPath = path.join(projectRoot, 'agentspace', `${module}.task-2-error-check-report.md`);
      if (deleteFile(errorReportPath)) {
        console.log(`  Deleted: agentspace/${module}.task-2-error-check-report.md`);
      }
    }
  }

  if (taskLevel <= 1) {
    // Delete Task 1 outputs
    console.log('Removing Task 1 outputs...');
    
    // Delete agentspace files (with module prefix replacement)
    if (module) {
      const agentspaceDir = path.join(projectRoot, 'agentspace');
      if (fs.existsSync(agentspaceDir)) {
        taskOutputs.task1.agentspace.forEach(file => {
          const actualFile = replaceModulePlaceholder(file);
          const filePath = path.join(agentspaceDir, actualFile);
          if (deleteFile(filePath)) {
            console.log(`  Deleted: agentspace/${actualFile}`);
          }
        });
      }
    }

    // Delete Task 1 error check report
    if (module) {
      const errorReportPath = path.join(projectRoot, 'agentspace', `${module}.task-1-error-check-report.md`);
      if (deleteFile(errorReportPath)) {
        console.log(`  Deleted: agentspace/${module}.task-1-error-check-report.md`);
      }
    }

    // Note: agentspace/{module}.status.json is NOT deleted to preserve module information
    // Users should manually delete agentspace/{module}.status.json if they want a complete reset
  }

  // Note: Test files are already handled above in Task 3 section with module prefix filtering
  // No additional test cleanup needed here to avoid deleting other modules' test files



  
  // Clean errors directory (with module filter if applicable)
  const errorsRootDir = path.join(projectRoot, 'errors');
  if (fs.existsSync(errorsRootDir)) {
    const files = fs.readdirSync(errorsRootDir);
    files.forEach(file => {
      // If we have a module prefix, only delete files for this module
      if (!module || file.startsWith(module)) {
        const filePath = path.join(errorsRootDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          deleteDirectory(filePath);
          console.log(`  Deleted: errors/${file}/`);
        } else {
          deleteFile(filePath);
          console.log(`  Deleted: errors/${file}`);
        }
      }
    });
    console.log(`  Cleaned: errors/ directory${module ? ` (${module} module files)` : ''}`);
  }

  // Update agentspace/{module}.status.json - set to start Task N (completed: false)
  if (module && taskLevel >= 1 && taskLevel <= 4) {
    const statusContent: {
      module?: string;
      currentTask: string;
      completed: boolean;
      completedItems?: string[];
      completionCriteria?: string;
    } = {
      module: module,
      currentTask: `Task ${taskLevel}`,
      completed: false,  // Task N has not started yet
    };
    
    // Record completed items from previous tasks (Task 1 to N-1)
    statusContent.completedItems = [];
    
    if (taskLevel >= 2) {
      // Task 1 was completed
      statusContent.completedItems = [
        'Task 1: Requirements Analysis - COMPLETE',
        'detailed-requirements.md created',
        'test-cases.md created',
        'interaction-matrix.md created'
      ];
    }
    
    if (taskLevel >= 3) {
      // Task 1 & 2 were completed
      statusContent.completedItems = [
        ...statusContent.completedItems,
        'Task 2: Design and Analysis - COMPLETE',
        'data-design.json created',
        'interaction-design.md created',
        'computation-analysis.json created'
      ];
    }
    
    if (taskLevel >= 4) {
      // Task 1, 2 & 3 were completed
      statusContent.completedItems = [
        ...statusContent.completedItems,
        'Task 3: Code Generation and Progressive Testing - COMPLETE',
        'computation-implementation-plan.json created',
        'business-rules-and-permission-control-implementation-plan.json created',
        'Backend implementation completed',
        'All business and permission tests passing'
      ];
    }
    
    const statusFilePath = path.join(projectRoot, 'agentspace', `${module}.status.json`);
    fs.writeFileSync(
      statusFilePath,
      JSON.stringify(statusContent, null, 2),
      'utf8'
    );
    console.log(`Updated: agentspace/${module}.status.json - ready to start Task ${taskLevel}`);
  }

  console.log(`\nProject successfully reset to start Task ${taskLevel}!`);
  
  if (taskLevel === 1) {
    console.log('All task outputs deleted. Ready to start Task 1 from the beginning.');
  } else if (taskLevel === 2) {
    console.log('Task 1 outputs preserved. Ready to start Task 2.');
  } else if (taskLevel === 3) {
    console.log('Task 1 & 2 outputs preserved. Ready to start Task 3.');
  } else if (taskLevel === 4) {
    console.log('Task 1, 2 & 3 outputs preserved. Ready to start Task 4.');
  }
  
  if (module) {
    console.log(`Module: ${module}`);
  }
}

// Parse command line arguments
const taskLevel = process.argv[2] ? parseInt(process.argv[2], 10) : 1;

// Validate the task level
if (isNaN(taskLevel) || taskLevel < 1 || taskLevel > 4) {
  console.error('Error: Task level must be a number between 1 and 4');
  console.log('\nUsage: npm run reset [taskLevel]');
  console.log('  taskLevel 1: Reset to start Task 1 (delete all outputs)');
  console.log('  taskLevel 2: Reset to start Task 2 (keep Task 1 outputs)');
  console.log('  taskLevel 3: Reset to start Task 3 (keep Task 1 & 2 outputs)');
  console.log('  taskLevel 4: Reset to start Task 4 (keep Task 1, 2 & 3 outputs)');
  console.log('\nExample: npm run reset 2  # Reset to start Task 2');
  process.exit(1);
}

resetProject(taskLevel).catch(console.error);
