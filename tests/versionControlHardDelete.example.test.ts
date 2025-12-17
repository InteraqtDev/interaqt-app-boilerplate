import { describe, expect, test } from "vitest";
import {
  Controller,
  MonoSystem,
  MatchExp
} from 'interaqt';
import {
  User, VersionedStyle, currentVersionInfo,
  CreateStyle, PublishStyle, RollbackVersion, OfflineStyle,
  entities, relations, interactions, dicts
} from '@/backend/versionControlHardDelete.example';
import { PGLiteDB } from '@/main-component/dbclients/PGLite';

describe('Version Control Example with Hard Delete', () => {
  test('Style entity with version control using hard deletion', async () => {

    // Setup system and controller
    const system = new MonoSystem(new PGLiteDB());
    const controller = new Controller({
      system: system,
      entities,
      relations,
      interactions,
      dict: dicts
    });
    await controller.setup(true);

    // Test scenario
    const user = await system.storage.create('User', { name: 'testUser' });

    // 1. Create initial styles
    await controller.callInteraction('CreateStyle', {
      user,
      payload: { content: 'Style 1 content' }
    });

    await controller.callInteraction('CreateStyle', {
      user,
      payload: { content: 'Style 2 content' }
    });

    // Wait for async Transform to process
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check initial styles
    let styles = await system.storage.find('VersionedStyle',
      undefined,
      undefined,
      ['id', 'content', 'status', 'version']
    );
    console.log('Initial styles:', styles);
    expect(styles).toHaveLength(2);
    expect(styles[0].status).toBe('draft');
    expect(styles[1].status).toBe('draft');
    expect(styles[0].version).toBe(0);

    // 2. Publish one style
    const styleToPublish = styles[0];
    const publishResult = await controller.callInteraction('PublishStyle', {
      user,
      payload: { styleId: styleToPublish.id }
    });
    expect(publishResult.error).toBeUndefined();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check version info
    let versionInfo1 = await system.storage.dict.get('currentVersionInfo');
    console.log('Version info after publish:', versionInfo1);
    expect(versionInfo1).toBeDefined();
    expect(versionInfo1.type).toBe('publish');
    expect(versionInfo1.version).toBe(1);

    // Check styles after publish
    styles = await system.storage.find('VersionedStyle',
      undefined,
      undefined,
      ['id', 'content', 'status', 'version']
    );
    console.log('Styles after publish:', styles);
    
    // Should have both old and new version
    const version0Styles = styles.filter(s => s.version === 0);
    const version1Styles = styles.filter(s => s.version === versionInfo1.version);
    expect(version0Styles).toHaveLength(2); // Original version still exists
    expect(version1Styles).toHaveLength(2); // New version created
    
    // Check the published style in new version
    const publishedStyle = version1Styles.find(s => s.content === 'Style 1 content');
    const otherStyle = version1Styles.find(s => s.content === 'Style 2 content');
    
    expect(publishedStyle).toBeDefined();
    expect(otherStyle).toBeDefined();
    expect(publishedStyle.status).toBe('published');
    expect(otherStyle.status).toBe('draft');

    // 3. Create another style and publish again
    await controller.callInteraction('CreateStyle', {
      user,
      payload: { content: 'Style 3 content' }
    });

    await controller.callInteraction('PublishStyle', {
      user,
      payload: { styleId: version1Styles[1].id }
    });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Create another style
    await controller.callInteraction('CreateStyle', {
      user,
      payload: { content: 'Style 4 content' }
    });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    let versionInfo2 = await system.storage.dict.get('currentVersionInfo');
    const version2 = versionInfo2?.version;
    console.log('Version 2:', version2);

    // Check styles before rollback
    const stylesBeforeRollback = await system.storage.find('VersionedStyle',
      undefined,
      undefined,
      ['id', 'content', 'version']
    );
    console.log('Styles before rollback:', stylesBeforeRollback);

    // 4. Rollback to first version
    await controller.callInteraction('RollbackVersion', {
      user,
      payload: { version: versionInfo1.version }
    });

    // Wait for hard deletion to occur
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check rollback results
    let versionInfo3 = await system.storage.dict.get('currentVersionInfo');
    expect(versionInfo3).toBeDefined();
    expect(versionInfo3.type).toBe('rollback');
    expect(versionInfo3.rollbackTo).toBe(versionInfo1.version);

    // Check final styles - old current version should be hard deleted
    const finalStyles = await system.storage.find('VersionedStyle',
      undefined,
      undefined,
      ['id', 'content', 'status', 'version']
    );
    console.log('Final styles after rollback:', finalStyles);

    // Version 2 styles should be hard deleted
    const version2StylesAfterRollback = finalStyles.filter(s => s.version === version2);
    expect(version2StylesAfterRollback).toHaveLength(0); // Hard deleted!

    // Should have styles from the rollback version (version 3)
    const rollbackStyles = finalStyles.filter(s => s.version === versionInfo3.version);
    expect(rollbackStyles).toHaveLength(3); // 3 styles from version 1
    expect(rollbackStyles.find(s => s.content === 'Style 1 content')).toBeDefined();
    expect(rollbackStyles.find(s => s.content === 'Style 2 content')).toBeDefined();
    expect(rollbackStyles.find(s => s.content === 'Style 3 content')).toBeDefined();
    
    // Style 4 should not exist as it was created in version 2 which was deleted
    expect(rollbackStyles.find(s => s.content === 'Style 4 content')).toBeUndefined();

    // Verify total count - should only have version 0, 1, and 3 (rollback version)
    const version0Count = finalStyles.filter(s => s.version === 0).length;
    const version1Count = finalStyles.filter(s => s.version === 1).length;
    const version3Count = finalStyles.filter(s => s.version === versionInfo3.version).length;
    
    console.log(`Version 0: ${version0Count}, Version 1: ${version1Count}, Version 3: ${version3Count}`);
    expect(finalStyles.length).toBe(version0Count + version1Count + version3Count);
  });
});
