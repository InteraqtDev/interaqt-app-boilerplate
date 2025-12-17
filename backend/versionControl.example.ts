import {
    Entity,
    Property,
    StateMachine,
    StateNode,
    StateTransfer,
    Interaction,
    InteractionEventEntity,
    Action,
    Payload,
    PayloadItem,
    Transform,
    Dictionary,
    DICTIONARY_RECORD,
    MatchExp,
    RecordMutationEvent,
    DictionaryEntity,
    Controller
  } from 'interaqt'
  
  // =============================================================================
  // ENTITIES
  // =============================================================================
  
  // Define VersionedStyle entity - this is the actual entity that stores all versions
  export const VersionedStyle = Entity.create({
    name: 'VersionedStyle',
    properties: [
      Property.create({ name: 'content', type: 'string' }),
      Property.create({ name: 'status', type: 'string' }),
      Property.create({ name: 'version', type: 'number' }), // Version identifier
      Property.create({ name: 'createdAt', type: 'number', defaultValue: () => Math.floor(Date.now()/1000) }),
      Property.create({ name: 'isDeleted', type: 'boolean' })
    ]
  })
  
  // Define User entity (needed for interaction calls)
  export const User = Entity.create({
    name: 'User',
    properties: [
      Property.create({ name: 'name', type: 'string' })
    ]
  })
  
  // =============================================================================
  // RELATIONS
  // =============================================================================
  
  // No relations in this example
  
  // =============================================================================
  // DICTIONARIES
  // =============================================================================
  
  // Define dictionary for currentVersionInfo
  export const currentVersionInfo = Dictionary.create({
    name: 'currentVersionInfo',
    type: 'object',
    defaultValue: () => ({ version: 0 })
  })
  
  // =============================================================================
  // INTERACTIONS
  // =============================================================================
  
  // Create style interaction
  export const CreateStyle = Interaction.create({
    name: 'CreateStyle',
    action: Action.create({ name: 'createStyle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ name: 'content', type: 'string', required: true })
      ]
    })
  })
  
  // Publish style interaction
  export const PublishStyle = Interaction.create({
    name: 'PublishStyle',
    action: Action.create({ name: 'publishStyle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ name: 'styleId', type: 'string', required: true })
      ]
    })
  })
  
  // Rollback interaction
  export const RollbackVersion = Interaction.create({
    name: 'RollbackVersion',
    action: Action.create({ name: 'rollbackVersion' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ name: 'version', type: 'number', required: true })
      ]
    })
  })
  
  export const OfflineStyle = Interaction.create({
    name: 'OfflineStyle',
    action: Action.create({ name: 'offlineStyle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ name: 'styleId', type: 'string', required: true })
      ]
    })
  })
  
  // =============================================================================
  // EXPORTS
  // =============================================================================
  
  export const entities = [User, VersionedStyle]
  export const relations = []
  export const activities = []
  export const interactions = [CreateStyle, PublishStyle, RollbackVersion, OfflineStyle]
  export const dicts = [currentVersionInfo]
  
  // =============================================================================
  // COMPUTATIONS
  // =============================================================================
  
  // Define states for status
  const draftState = StateNode.create({ 
    name: 'draft',
    computeValue: (lastValue, mutationEvent) => {
      // 支持 transform 的时候就设置初始状态。
      return lastValue || 'draft';
    }
  })
  const publishedState = StateNode.create({ name: 'published' })
  const offlineState = StateNode.create({ name: 'offline' })
  
  // Status property computation
  VersionedStyle.properties.find(p => p.name === 'status').computation = StateMachine.create({
    states: [draftState, publishedState, offlineState],
    initialState: draftState,
    transfers: [
      StateTransfer.create({ 
        trigger: { recordName: InteractionEventEntity.name, type: 'create', record: { interactionName: PublishStyle.name } }, 
        current: draftState, 
        next: publishedState,
        computeTarget: (mutationEvent: RecordMutationEvent) => ({ id: mutationEvent.record!.payload.styleId })
      }),
      StateTransfer.create({ 
        trigger: { recordName: InteractionEventEntity.name, type: 'create', record: { interactionName: OfflineStyle.name } }, 
        current: publishedState, 
        next: offlineState,
        computeTarget: (mutationEvent: RecordMutationEvent) => ({ id: mutationEvent.record!.payload.styleId })
      })
    ]
  })
  
  // Define state for version info changes
  const versionUpdatedState = StateNode.create({
    name: 'versionUpdated',
    computeValue: (lastValue, mutationEvent) => {
      const event = mutationEvent?.record;
      if (!event) return lastValue || { version: 0 };
  
      const timestamp = Math.floor(Date.now()/1000);
      const newVersion = lastValue.version + 1;
  
      if (event.interactionName === 'PublishStyle') {
        return {
          version: newVersion,
          publishedAt: timestamp,
          type: 'publish'
        };
      } else if (event.interactionName === 'RollbackVersion') {
        return {
          version: newVersion,
          fromVersion: lastValue.version,
          rollbackTo: event.payload.version,
          rollbackAt: timestamp,
          type: 'rollback'
        };
      }
      return lastValue || { version: 0 };
    }
  })
  
  // StateMachine for currentVersionInfo
  currentVersionInfo.computation = StateMachine.create({
    states: [versionUpdatedState],
    initialState: versionUpdatedState,
    transfers: [
      StateTransfer.create({
        current: versionUpdatedState,
        next: versionUpdatedState,
        trigger: {
          recordName: InteractionEventEntity.name,
          type: 'create',
          record: {
            interactionName: 'PublishStyle'
          }
        },
      }),
      StateTransfer.create({
        current: versionUpdatedState,
        next: versionUpdatedState,
        trigger: {
          recordName: InteractionEventEntity.name,
          type: 'create',
          record: {
            interactionName: 'RollbackVersion'
          }
        }
      })
    ]
  })
  
  // Transform for VersionedStyle - handles creation and version copying
  VersionedStyle.computation = Transform.create({
    eventDeps: {
      // Monitor style creation
      StyleCreate: {
        recordName: InteractionEventEntity.name,
        type: 'create'
      },
      // Monitor version info updates for publish/rollback
      VersionUpdate: {
        recordName: DICTIONARY_RECORD,
        type: 'update'
      }
    },
    callback: async function(this: Controller, mutationEvent: RecordMutationEvent) {
      const event = mutationEvent.record!;
  
      // Handle style creation
      if (mutationEvent.type === 'create' && event.interactionName === 'CreateStyle') {
        // Get current version info
        let versionInfo = await this.system.storage.dict.get('currentVersionInfo');
        
        return {
          content: event.payload.content,
          status: 'draft',
          version: versionInfo.version,
          createdAt: Math.floor(Date.now()/1000),
          isDeleted: false
        };
      }
  
      // Handle version updates (publish/rollback)
      if (mutationEvent.type === 'update' && event.key === 'currentVersionInfo') {
        const versionInfo = event.value.raw;
  
        if (versionInfo.type === 'publish') {
          
          // Copy all current version styles to new version
          const currentStyles = await this.system.storage.find('VersionedStyle',
            MatchExp.atom({ key: 'isDeleted', value: ['=', false] }),
            undefined,
            ['*']
          );
  
          return currentStyles.map(style => ({
            ...style,
            id: undefined,
            version: versionInfo.version,
            createdAt: versionInfo.publishedAt,
          }));
        } else if (versionInfo.type === 'rollback') {
          // Copy styles from rollback target version
          const targetStyles = await this.system.storage.find('VersionedStyle',
            MatchExp.atom({ key: 'version', value: ['=', versionInfo.rollbackTo] }),
            undefined,
            ['*']
          );
  
          return targetStyles.map(style => ({
            ...style,
            id: undefined,
            version: versionInfo.version,
            createdAt: versionInfo.rollbackAt,
          }));
        }
      }
  
      return null;
    }
  })
  
  // isDeleted property StateMachine computation
  const notDeletedState = StateNode.create({ name: 'notDeleted', computeValue: (lastValue, mutationEvent) => lastValue || false })
  const deletedState = StateNode.create({ name: 'deleted', computeValue: (lastValue, mutationEvent) => lastValue || true })
  
  VersionedStyle.properties.find(p => p.name === 'isDeleted').computation = StateMachine.create({
    states: [notDeletedState, deletedState],
    initialState: notDeletedState,
    transfers: [
      StateTransfer.create({ 
        current: notDeletedState, 
        next: deletedState, 
        trigger: { 
          recordName: DictionaryEntity.name, 
          type: 'update', 
          record: { key: 'currentVersionInfo' } 
        },
        computeTarget: async function(this: Controller, mutationEvent: RecordMutationEvent) {
          const rollbackTo = mutationEvent.record!.value.raw.rollbackTo;
          if (rollbackTo !== undefined) {
            const fromVersion = mutationEvent.record!.value.raw.fromVersion;
            const styles = await this.system.storage.find('VersionedStyle',
              MatchExp.atom({ key: 'version', value: ['=', fromVersion] }),
              undefined,
              ['*']
            );
            return styles
          }
        }
      })
    ]
  })