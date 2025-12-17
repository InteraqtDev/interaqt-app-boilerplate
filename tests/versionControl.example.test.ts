import { describe, expect, test } from "vitest";
import {
  Controller,
  MonoSystem,
  InteractionEventEntity,
  MatchExp
} from 'interaqt';
import {
  User, VersionedStyle, currentVersionInfo,
  CreateStyle, PublishStyle, RollbackVersion, OfflineStyle,
  entities, relations, interactions, dicts
} from '@/backend/versionControl.example';
import { PGLiteDB } from '@/main-component/dbclients/PGLite';

describe('Version Control Example', () => {
  test('Style entity with version control', async () => {

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

    // Check InteractionEventEntity was created
    const events = await system.storage.find(InteractionEventEntity.name,
      undefined,
      undefined,
      ['interactionName', 'payload']
    );
    console.log('Interaction events:', events);
    
    // Check all VersionedStyle records (not just non-deleted)
    const allStyles = await system.storage.find('VersionedStyle',
      undefined,
      undefined,
      ['content', 'status', 'version', 'isDeleted']
    );
    console.log('All VersionedStyle records:', allStyles);

    // Check initial styles
    let styles = await system.storage.find('VersionedStyle',
      MatchExp.atom({ key: 'isDeleted', value: ['=', false] }),
      undefined,
      ['content', 'status', 'version']
    );
    console.log('Found styles:', styles);
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

    // Check version info
    let versionInfo1 = await system.storage.dict.get('currentVersionInfo');
    console.log('Version info after publish:', versionInfo1);
    expect(versionInfo1).toBeDefined();
    expect(versionInfo1.type).toBe('publish');
    expect(versionInfo1.version).toBe(1);

    // Check styles after publish
    styles = await system.storage.find('VersionedStyle',
      MatchExp.atom({ key: 'isDeleted', value: ['=', false] }),
      undefined,
      ['id', 'content', 'status', 'version']
    );
    
    // Should have new version copies
    const newVersionStyles = styles.filter(s => s.version === versionInfo1.version);
    expect(newVersionStyles).toHaveLength(2);
    
    // Find the style that was published (same content as the original)
    const publishedStyle = newVersionStyles.find(s => s.content === 'Style 1 content');
    const otherStyle = newVersionStyles.find(s => s.content === 'Style 2 content');
    
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
      payload: { styleId: styles[1].id }
    });

    // create another and rollback
    await controller.callInteraction('CreateStyle', {
      user,
      payload: { content: 'Style 4 content' }
    });

    let versionInfo2;
    versionInfo2 = await system.storage.dict.get('currentVersionInfo');
    const version2 = versionInfo2?.version;

    // 4. Rollback to first version
    await controller.callInteraction('RollbackVersion', {
      user,
      payload: { version: versionInfo1.version }
    });


    // Check rollback results
    let versionInfo3 = await system.storage.dict.get('currentVersionInfo');
    expect(versionInfo3).toBeDefined();
    expect(versionInfo3.type).toBe('rollback');
    expect(versionInfo3.rollbackTo).toBe(versionInfo1.version);

    // Check final styles
    const finalStyles = await system.storage.find('VersionedStyle',
      MatchExp.atom({ key: 'isDeleted', value: ['=', false] }),
      undefined,
      ['content', 'status', 'version']
    );

    // Should have styles from the rollback target version
    const rollbackStyles = finalStyles.filter(s => s.version === versionInfo3.version);
    expect(rollbackStyles).toHaveLength(3);
    expect(rollbackStyles.find(s => s.content === 'Style 1 content')).toBeDefined();
    expect(rollbackStyles.find(s => s.content === 'Style 2 content')).toBeDefined();
    expect(rollbackStyles.find(s => s.content === 'Style 3 content')).toBeDefined(); // Style 3 was not in version 1

    // Verify old current version is marked as deleted
    const deletedStyles = await system.storage.find('VersionedStyle',
      MatchExp.atom({ key: 'version', value: ['=', version2] })
        .and({ key: 'isDeleted', value: ['=', true] }),
      undefined,
      ['content']
    );
    expect(deletedStyles.length).toBeGreaterThan(0);
  });
});
