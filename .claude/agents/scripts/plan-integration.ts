#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration Implementation Plan Generator
 * 
 * This tool reads agentspace/{module}.integration.json and generates
 * an ordered implementation plan for integrations.
 * 
 * Integration types:
 * - Type 1: External System Integration (Server-Side Processing with State Tracking)
 * - Type 2: Functional Integration (Infrastructure - Auth, Logging, etc.)
 * - Type 3: Client-Direct Integration (Authorization/Signing - Object Storage, etc.)
 * 
 * Output: agentspace/{module}.integration-implementation-plan.json
 */

// Type definitions
interface IntegrationRequirement {
  id: string;
  name: string;
  features: string[];
  features_explanation: Record<string, string>;
  external_system: string;
  purpose: string;
  related_requirements: string[];
  flow_description: string;
  user_interactions: {
    in_current_system: string[];
    in_external_system: string[];
  };
  current_system_data: {
    entity: string;
    properties: string[];
    usage: string;
  }[];
  implementation_requirements: {
    entities_to_create: string[];
    relations_to_create: string[];
    business_entity_computations: string[];
    custom_apis: string[];
  };
  notes: string;
}

interface IntegrationFile {
  integration_metadata: {
    timestamp: string;
    module: string;
    version: string;
  };
  integrations: IntegrationRequirement[];
}

interface IntegrationPlanItem {
  id: string;
  name: string;
  type: 'Type1' | 'Type2' | 'Type3';
  typeDescription: string;
  external_system: string;
  purpose: string;
  features: string[];
  implementation_requirements: {
    entities_to_create: string[];
    relations_to_create: string[];
    custom_apis: string[];
  };
  steps: {
    step: string;
    description: string;
    required: boolean;
  }[];
  notes: string;
  completed: boolean;
  lastError?: string;
}

interface IntegrationImplementationPlan {
  metadata: {
    module: string;
    generatedAt: string;
    totalIntegrations: number;
  };
  integrations: IntegrationPlanItem[];
}

/**
 * Determine integration type based on features and external_system
 */
function determineIntegrationType(integration: IntegrationRequirement): { 
  type: 'Type1' | 'Type2' | 'Type3'; 
  typeDescription: string;
} {
  const features = integration.features || [];
  const externalSystem = integration.external_system?.toLowerCase() || '';
  const name = integration.name?.toLowerCase() || '';
  
  // Type 2: Functional Integration (Infrastructure)
  // - Authentication, authorization, logging, etc.
  // - engineering-api feature with no external system
  if (
    features.includes('engineering-api') && 
    (externalSystem.includes('none') || externalSystem === '' || name.includes('auth'))
  ) {
    return {
      type: 'Type2',
      typeDescription: 'Functional Integration (Infrastructure - Direct storage operations, no external API)'
    };
  }
  
  // Type 3: Client-Direct Integration (Authorization/Signing)
  // - Object storage with pre-signed URLs
  // - Client SDK services
  if (
    features.includes('engineering-api') && 
    (
      name.includes('objectstorage') || 
      name.includes('storage') ||
      name.includes('s3') ||
      name.includes('oss') ||
      externalSystem.includes('storage') ||
      externalSystem.includes('s3')
    )
  ) {
    return {
      type: 'Type3',
      typeDescription: 'Client-Direct Integration (Authorization/Signing - Server provides credentials, client uploads directly)'
    };
  }
  
  // Type 1: External System Integration (Server-Side Processing)
  // - business-task-execution feature
  // - Needs state tracking (APICall/Event entities)
  // - Default for any external API integration
  if (
    features.includes('business-task-execution') ||
    integration.implementation_requirements?.entities_to_create?.length > 0 ||
    externalSystem !== '' && !externalSystem.includes('none')
  ) {
    return {
      type: 'Type1',
      typeDescription: 'External System Integration (Server-Side Processing with State Tracking)'
    };
  }
  
  // Default to Type 2 if unclear
  return {
    type: 'Type2',
    typeDescription: 'Functional Integration (Infrastructure)'
  };
}

/**
 * Generate steps based on integration type
 */
function generateSteps(type: 'Type1' | 'Type2' | 'Type3'): { step: string; description: string; required: boolean; }[] {
  const commonSteps = [
    { step: '4.1', description: 'External System Research and Environment Validation', required: true },
    { step: '4.2', description: 'Integration Design Documentation', required: true },
    { step: '4.2.3', description: 'Create Integration Directory Structure', required: true },
  ];
  
  if (type === 'Type1') {
    return [
      ...commonSteps,
      { step: '4.3', description: 'External SDK/API Testing (CRITICAL - Real API calls)', required: true },
      { step: '4.4', description: 'Implement Integration (Side Effects, APIs, Event Creation)', required: true },
      { step: '4.5', description: 'Integration Testing', required: true },
    ];
  }
  
  if (type === 'Type2') {
    return [
      ...commonSteps,
      { step: '4.3', description: 'External SDK/API Testing', required: false },  // Skip for Type 2
      { step: '4.4', description: 'Implement Integration (APIs, Middleware)', required: true },
      { step: '4.5', description: 'Integration Testing', required: true },
    ];
  }
  
  // Type 3
  return [
    ...commonSteps,
    { step: '4.3', description: 'External SDK/API Testing', required: false },  // Skip for Type 3
    { step: '4.4', description: 'Implement Integration (Authorization APIs)', required: true },
    { step: '4.5', description: 'Integration Testing', required: true },
  ];
}

/**
 * Generate implementation plan from integration requirements
 */
function generateImplementationPlan(integrationFile: IntegrationFile): IntegrationImplementationPlan {
  const integrations = integrationFile.integrations || [];
  
  const planItems: IntegrationPlanItem[] = integrations.map((integration) => {
    const { type, typeDescription } = determineIntegrationType(integration);
    const steps = generateSteps(type);
    
    return {
      id: integration.id,
      name: integration.name,
      type,
      typeDescription,
      external_system: integration.external_system,
      purpose: integration.purpose,
      features: integration.features,
      implementation_requirements: {
        entities_to_create: integration.implementation_requirements?.entities_to_create || [],
        relations_to_create: integration.implementation_requirements?.relations_to_create || [],
        custom_apis: integration.implementation_requirements?.custom_apis || [],
      },
      steps,
      notes: integration.notes,
      completed: false,
    };
  });
  
  // Sort integrations: Type2/Type3 first (simpler), Type1 last (more complex)
  const sortedItems = planItems.sort((a, b) => {
    const typeOrder = { 'Type2': 0, 'Type3': 1, 'Type1': 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
  
  return {
    metadata: {
      module: integrationFile.integration_metadata?.module || 'unknown',
      generatedAt: new Date().toISOString(),
      totalIntegrations: sortedItems.length,
    },
    integrations: sortedItems,
  };
}

/**
 * Read .currentmodule to get current module name
 */
function getCurrentModule(): string {
  const currentModulePath = path.join(process.cwd(), '.currentmodule');
  
  if (!fs.existsSync(currentModulePath)) {
    console.error('Error: .currentmodule file not found. Please ensure .currentmodule exists with a module name.');
    console.error('You can create it by running: echo "your-module-name" > .currentmodule');
    process.exit(1);
  }
  
  try {
    const module = fs.readFileSync(currentModulePath, 'utf-8').trim();
    
    if (!module || typeof module !== 'string') {
      console.error('Error: .currentmodule file must contain a valid module name.');
      process.exit(1);
    }
    
    console.log(`📦 Working with module: ${module}`);
    return module;
  } catch (error) {
    console.error('Error: Failed to read .currentmodule:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  try {
    // Get current module name
    const module = getCurrentModule();
    
    // Define file paths
    const inputPath = path.join(process.cwd(), 'agentspace', `${module}.integration.json`);
    const outputPath = path.join(process.cwd(), 'agentspace', `${module}.integration-implementation-plan.json`);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found at ${inputPath}`);
      console.error(`Expected file: agentspace/${module}.integration.json`);
      console.error('\nPlease ensure the integration requirements file exists before running this script.');
      process.exit(1);
    }
    
    // Read and parse input file
    const integrationData = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as IntegrationFile;
    
    console.log(`\n📖 Reading integration requirements from: ${inputPath}`);
    console.log(`Found ${integrationData.integrations?.length || 0} integrations to plan`);
    
    // Generate implementation plan
    const plan = generateImplementationPlan(integrationData);
    
    // Write output file
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    
    console.log(`\n✅ Integration implementation plan generated successfully!`);
    console.log(`📄 Output written to: ${outputPath}`);
    
    // Display summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total Integrations: ${plan.metadata.totalIntegrations}`);
    
    const type1Count = plan.integrations.filter(i => i.type === 'Type1').length;
    const type2Count = plan.integrations.filter(i => i.type === 'Type2').length;
    const type3Count = plan.integrations.filter(i => i.type === 'Type3').length;
    
    console.log(`   - Type 1 (External System): ${type1Count}`);
    console.log(`   - Type 2 (Functional/Infrastructure): ${type2Count}`);
    console.log(`   - Type 3 (Client-Direct): ${type3Count}`);
    
    console.log(`\n📋 Integration Implementation Order:`);
    plan.integrations.forEach((integration, index) => {
      console.log(`\n   ${index + 1}. ${integration.name} (${integration.type})`);
      console.log(`      Type: ${integration.typeDescription}`);
      console.log(`      External System: ${integration.external_system}`);
      console.log(`      Completed: ${integration.completed}`);
      console.log(`      Required Steps:`);
      integration.steps
        .filter(s => s.required)
        .forEach(step => {
          console.log(`        - ${step.step}: ${step.description}`);
        });
    });
    
    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Review the generated plan at ${outputPath}`);
    console.log(`   2. Run Task 4 to implement integrations one by one`);
    console.log(`   3. Each integration will be marked 'completed: true' when done`);
    
  } catch (error) {
    console.error('Error generating integration implementation plan:', error);
    process.exit(1);
  }
}

// Run main function
main();

