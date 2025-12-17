import { MonoSystem, Controller, Property } from 'interaqt';
import { entities, relations, interactions, activities, dicts } from '../backend/index.js';
import { entities as initialEntities, dicts as initialDicts, initialInteractions } from './initialData.js';
import { createDatabase } from './database.js';
import AggregatedIntegrationClass from '../integrations/entries/index.js';
import { config as appConfig } from '../config.js';

// Load configuration from app.config.json
const mainConfig = appConfig.components.main;
const dbParams = mainConfig.middlewareDependencies.mainDb;

console.log(`Database Type: ${dbParams?.config.type}`);
const dbEndpoint = dbParams?.endpoints.main.value;
console.log(`Database Address: ${dbEndpoint?.replace(/:[^:@]+@/, ':****@')}`); // Hide password

async function main() {
  try {
    console.log('create system...');
    const system = new MonoSystem(await createDatabase());


    console.log('create integrations...');
    const sideEffectDispatcher = new AggregatedIntegrationClass({
      entities: entities,
      relations: relations,
      activities: activities,
      interactions: interactions,
      dict: dicts,
    });
    await sideEffectDispatcher.configure?.();

    console.log('create controller...');
    const controller = new Controller({
      system: system,
      entities: entities,
      relations: relations,
      activities: activities,
      interactions: interactions,
      dict: dicts,
      recordMutationSideEffects: []
    });

    console.log('set up...');
    await controller.setup(true);
    
    console.log('inserting initial data...');
    
    // Insert initial entities
    for (const [entityName, records] of Object.entries(initialEntities)) {
      for (const record of records) {
        const createdRecord = await system.storage.create(entityName, record);
        console.log(`✅ Created ${entityName}: ${record.username || record.name} (ID: ${createdRecord.id})`);
        
        if (entityName === 'User' && record.username === 'root') {
          const ROOT_PASSWORD = mainConfig.applicationConfig.rootUser?.password || 'admin123456';
          console.log(`   Password: ${ROOT_PASSWORD} (from app.config.json)`);
        }
      }
    }
    
    // Process initial interactions to trigger reactive computations
    console.log('\nprocessing initial interactions...');
    
    for (const interaction of initialInteractions) {
      console.log(`\n📍 Calling interaction: ${interaction.interactionName} for user ${interaction.user.id}`);
      
      // Call the interaction
      const result = await controller.callInteraction(
        interaction.interactionName,
        interaction
      );
      
      if (result.error) {
        console.error(`   ❌ Interaction failed:`, result.error);
        continue;
      }
      
      console.log(`   ✅ Interaction successful`);
    }
    
    // Insert initial dictionaries
    for (const [dictName, value] of Object.entries(initialDicts)) {
      // TODO: Implement dictionary initialization if needed
    }
    
    console.log('\n✅ CMS backend initialized successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Setup failed with error:');
    console.error(error.message || error);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
