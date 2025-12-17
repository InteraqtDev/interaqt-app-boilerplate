#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

/**
 * Computation Implementation Plan Generator
 * 
 * This tool generates multiple computation plan items for entities that can be created 
 * through different interactions. This design handles circular dependencies between entities 
 * during computation phases.
 * 
 * Example: Entity A and ASnapshot
 * - ASnapshot creation depends on A's creation
 * - A's rollback operation depends on ASnapshot
 * 
 * By splitting A into separate nodes (A@Create and A@Rollback), we can:
 * - Implement ASnapshot computation once A@Create is complete
 * - Test ASnapshot independently without waiting for A's rollback logic
 * - Implement A@Rollback after ASnapshot is complete
 * - Enable proper topological ordering despite circular dependencies
 */

// 定义类型
interface PropertyComputation {
  propertyName: string;
  computationDecision: string;
  dependencies?: string[];
  interactionDependencies?: string[];
  reasoning?: string;
  calculationMethod?: string;
}

interface CreationInteraction {
  name: string;
  description: string;
  dependencies: string[];
}

interface DeletionInteraction {
  name: string;
  description: string;
  dependencies: string[];
}

interface EntityAnalysis {
  purpose: string;
  lifecycle: {
    creation: {
      type: string;
      parent: string | null;
      relatedBusinessEntity?: string;  // 用于 mutation-derived 和 mixed-derived 类型实体
      creationInteractions: CreationInteraction[];
    };
    deletion?: {
      canBeDeleted: boolean;
      deletionType: string;
      deletionInteractions?: DeletionInteraction[];
    };
  };
  computationDecision?: string;
  reasoning?: string;
  calculationMethod?: string;
}

interface Entity {
  name: string;
  entityAnalysis: EntityAnalysis;
  propertyAnalysis: PropertyComputation[];
}

interface RelationAnalysis {
  purpose: string;
  lifecycle: {
    creation: {
      type: string;
      parent: string | null;
      relatedBusinessEntity?: string;  // 用于 mutation-derived 和 mixed-derived 类型关系
      creationInteractions: CreationInteraction[];
    };
    deletion?: {
      canBeDeleted: boolean;
      deletionType: string;
      deletionInteractions?: DeletionInteraction[];
    };
  };
  computationDecision?: string;
  reasoning?: string;
  calculationMethod?: string;
}

interface Relation {
  name: string;
  relationAnalysis: RelationAnalysis;
  propertyAnalysis?: PropertyComputation[];
}

interface DictionaryAnalysis {
  purpose: string;
  type: string;
  collection?: boolean;
  computationDecision?: string;
  reasoning?: string;
  dependencies?: string[];
  interactionDependencies?: string[];
  calculationMethod?: string;
}

interface Dictionary {
  name: string;
  dictionaryAnalysis?: DictionaryAnalysis;
}

interface ComputationAnalysis {
  entities: Entity[];
  relations: Relation[];
  dictionaries: Dictionary[];
}

interface ComputationNode {
  id: string;
  type: 'entity' | 'property' | 'relation' | 'dictionary';
  entityName?: string;
  propertyName?: string;
  relationName?: string;
  dictionaryName?: string;
  computationType: string;
  dependencies: string[];  // 原始的直接计算依赖
  expandedDependencies: string[];  // 展开后的所有依赖（包括实体创建依赖）
  interactionDependencies?: string[];
  reasoning?: string;
  calculationMethod?: string;
  completed: boolean;
  creationInteraction?: CreationInteraction;
  lifecycle?: {
    creation: {
      type: string;
      parent: string | null;
      creationInteractions: CreationInteraction[];
    };
    deletion?: {
      canBeDeleted: boolean;
      deletionType: string;
      deletionInteractions?: DeletionInteraction[];
    };
  };
  ownerProperties?: PropertyComputation[];  // _owner 类型的属性列表（仅用于 entity 节点）
  createdWithRelations?: Relation[];  // created-with-entity 类型的 relation 列表（仅用于 entity 节点）
  createdWithChildren?: Entity[];  // created-with-parent 类型的子实体列表（仅用于 entity 节点）
}

interface ImplementationPlan {
  totalComputations: number;
  implementationOrder: {
    phase: number;
    computations: ComputationNode[];
    description: string;
  }[];
}

// 创建计算节点的唯一ID（不带类型前缀）
function createComputationId(type: string, entityName?: string, propertyName?: string, relationName?: string, dictionaryName?: string, creationInteractionName?: string): string {
  switch (type) {
    case 'entity':
      return creationInteractionName ? `${entityName}@${creationInteractionName}` : entityName!;
    case 'property':
      return `${entityName}.${propertyName}`;
    case 'relation':
      return creationInteractionName ? `${relationName}@${creationInteractionName}` : relationName!;
    case 'dictionary':
      return dictionaryName!;
    default:
      throw new Error(`Unknown computation type: ${type}`);
  }
}

// 解析依赖项，直接返回原始依赖名称（不添加类型前缀）
function parseDependency(dep: string): string {
  // 直接返回原始依赖名称，不添加任何前缀
  return dep;
}

// 检查是否是交互依赖
function isInteractionDependency(dep: string): boolean {
  return dep.includes('Interaction') || 
    ['CreateUser', 'CreateDormitory', 'DeductPoints', 'RequestEviction', 
     'AssignUserToDormitory', 'AssignUserToBed', 'RemoveFromDormitory', 
     'ApproveEviction', 'RejectEviction', 'UpdateUser', 'UpdateUserRole',
     'UpdateDormitory'].includes(dep);
}

// 检查是否是系统依赖
function isSystemDependency(dep: string): boolean {
  return dep === 'InteractionEventEntity';
}

// 根据依赖名称查找对应的节点ID
function findNodeIdByDependency(dep: string, nodes: ComputationNode[]): string | undefined {
  // 如果包含点号，可能是关系或实体的属性引用
  if (dep.includes('.')) {
    const parts = dep.split('.');
    if (parts.length === 2) {
      // 如果是 Relation.property 格式，先尝试找关系节点
      if (parts[0].includes('Relation')) {
        // 尝试找关系节点本身（去掉 .property 部分）
        if (nodes.some(n => n.id === parts[0])) {
          return parts[0];
        }
      }
      // 尝试作为完整的属性ID (Entity.property)
      if (nodes.some(n => n.id === dep)) {
        return dep;
      }
    }
  }
  
  // 直接查找匹配的节点
  if (nodes.some(n => n.id === dep)) {
    return dep;
  }
  
  return undefined;
}

// 构建计算节点和依赖图
function buildComputationGraph(analysis: ComputationAnalysis, dataDesign?: any): { nodes: ComputationNode[], edges: { from: string; to: string }[] } {
  const nodes: ComputationNode[] = [];
  const edges: { from: string; to: string }[] = [];
  
  // Helper function: 为hard-delete实体/关系自动添加_isDeleted_属性
  function addHardDeletionProperty(entityOrRelation: Entity | Relation, isEntity: boolean) {
    const lifecycle = isEntity ? (entityOrRelation as Entity).entityAnalysis?.lifecycle : (entityOrRelation as Relation).relationAnalysis?.lifecycle;
    const deletion = lifecycle?.deletion;
    
    if (deletion && deletion.canBeDeleted && deletion.deletionType === 'hard-delete' && deletion.deletionInteractions && deletion.deletionInteractions.length > 0) {
      const entityName = isEntity ? (entityOrRelation as Entity).name : undefined;
      const relationName = !isEntity ? (entityOrRelation as Relation).name : undefined;
      
      // 为每个删除交互创建_isDeleted_属性的计算节点
      for (const deletionInteraction of deletion.deletionInteractions) {
        const nodeId = createComputationId('property', entityName || relationName, '_isDeleted_');
        const interactionNodeId = `${nodeId}@${deletionInteraction.name}`;
        
        // 使用删除交互的依赖作为属性的计算依赖
        const deps = deletionInteraction.dependencies || [];
        const parsedDeps = deps.map(parseDependency);
        
        // 构建展开的依赖
        const expandedDeps: string[] = [];
        
        // 1. 属性必须依赖于其所在的实体/关系的所有创建交互
        const creationInteractions = lifecycle?.creation?.creationInteractions || [];
        for (const creationInteraction of creationInteractions) {
          const entityNodeId = createComputationId(isEntity ? 'entity' : 'relation', entityName, undefined, relationName, undefined, creationInteraction.name);
          expandedDeps.push(entityNodeId);
        }
        
        // 2. 添加删除交互的依赖
        for (const dep of parsedDeps) {
          if (!expandedDeps.includes(dep)) {
            expandedDeps.push(dep);
          }
          
          // 3. 如果依赖 Entity.property，也要依赖 Entity 的所有创建交互
          if (dep.includes('.')) {
            const entityOrRelationName = dep.split('.')[0];
            // 查找对应的实体，添加其所有创建交互节点
            const depEntity = analysis.entities.find(e => e.name === entityOrRelationName);
            if (depEntity) {
              const depEntityCreationInteractions = depEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
              for (const creationInteraction of depEntityCreationInteractions) {
                const depEntityNodeId = createComputationId('entity', entityOrRelationName, undefined, undefined, undefined, creationInteraction.name);
                if (!expandedDeps.includes(depEntityNodeId)) {
                  expandedDeps.push(depEntityNodeId);
                }
              }
            } else {
              // 如果不是实体，可能是关系，添加原始依赖
              if (!expandedDeps.includes(entityOrRelationName)) {
                expandedDeps.push(entityOrRelationName);
              }
            }
          }
        }
        
        nodes.push({
          id: interactionNodeId,
          type: 'property',
          entityName: entityName || relationName,
          propertyName: '_isDeleted_',
          computationType: 'Statemachine',
          dependencies: deps,  // 保持原始的删除交互依赖
          expandedDependencies: expandedDeps,  // 展开的所有依赖
          interactionDependencies: [deletionInteraction.name],
          reasoning: `Hard deletion property for ${isEntity ? 'entity' : 'relation'} managed by ${deletionInteraction.name}`,
          calculationMethod: `System-managed property that validates deletion rules and enables hard deletion through ${deletionInteraction.name}`,
          completed: false
        });
      }
    }
  }
  
  // Step 1: 为每个实体的每个创建交互创建独立的计算节点
  for (const entity of analysis.entities) {
    // 跳过没有计算的实体（None 或由父实体创建的实体）
    const computationDecision = entity.entityAnalysis?.computationDecision;
    if (!computationDecision || computationDecision === 'None' || computationDecision.startsWith('_parent:')) {
      continue;
    }
    
    const creationInteractions = entity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
    const creationType = entity.entityAnalysis?.lifecycle?.creation?.type;
    const hasComputation = entity.entityAnalysis?.computationDecision && entity.entityAnalysis.computationDecision !== 'None';
    const hasComputedProperties = entity.propertyAnalysis.some(p => 
      p.computationDecision && p.computationDecision !== 'None' && p.computationDecision !== '_owner'
    );
    
    // 收集所有 _owner 类型的属性
    const ownerProperties = entity.propertyAnalysis.filter(p => 
      p.computationDecision === '_owner'
    );
    
    // 收集所有 created-with-entity 类型的 relation（parent 指向当前 entity）
    const createdWithRelations = analysis.relations.filter(relation => {
      const relCreationType = relation.relationAnalysis?.lifecycle?.creation?.type;
      const relParent = relation.relationAnalysis?.lifecycle?.creation?.parent;
      return relCreationType === 'created-with-entity' && relParent === entity.name;
    });
    
    // 收集所有 created-with-parent 类型的子实体（parent 指向当前 entity）
    const createdWithChildren = analysis.entities.filter(childEntity => {
      const creationType = childEntity.entityAnalysis?.lifecycle?.creation?.type;
      const parent = childEntity.entityAnalysis?.lifecycle?.creation?.parent;
      return creationType === 'created-with-parent' && parent === entity.name;
    });
    
    // 如果实体有计算、有需要计算的属性、有 _owner 属性、有 created-with-entity 关系、或有 created-with-parent 子实体，为每个创建交互创建节点
    // 对于 mutation-derived、mixed-derived 或 data-derived 类型的实体，即使没有 creationInteractions 也需要生成节点
    if ((hasComputation || hasComputedProperties || ownerProperties.length > 0 || createdWithRelations.length > 0 || createdWithChildren.length > 0) && 
        (creationInteractions.length > 0 || creationType === 'mutation-derived' || creationType === 'mixed-derived' || creationType === 'data-derived')) {
      
      // 特殊处理：data-derived、mutation-derived 或 mixed-derived 实体且没有 creationInteractions
      if ((creationType === 'data-derived' || creationType === 'mutation-derived' || creationType === 'mixed-derived') && creationInteractions.length === 0) {
        const nodeId = createComputationId('entity', entity.name);
        
        // data-derived 实体的依赖来自其 parent，mutation-derived 和 mixed-derived 实体的依赖来自其 relatedBusinessEntity
        const parent = entity.entityAnalysis?.lifecycle?.creation?.parent;
        const relatedBusinessEntity = entity.entityAnalysis?.lifecycle?.creation?.relatedBusinessEntity;
        const deps = parent ? [parent] : (relatedBusinessEntity ? [relatedBusinessEntity] : []);
        const parsedDeps = deps.map(parseDependency);
        
        nodes.push({
          id: nodeId,
          type: 'entity',
          entityName: entity.name,
          computationType: entity.entityAnalysis?.computationDecision || 'Transform',
          dependencies: parsedDeps,
          expandedDependencies: parsedDeps,
          interactionDependencies: [],  // data-derived、mutation-derived 和 mixed-derived 没有直接的交互依赖
          reasoning: entity.entityAnalysis?.reasoning || `${creationType} entity`,
          calculationMethod: entity.entityAnalysis?.calculationMethod || 'Auto-created via Transform computation',
          completed: false,
          lifecycle: entity.entityAnalysis?.lifecycle,
          ownerProperties: ownerProperties.length > 0 ? ownerProperties : undefined,
          createdWithRelations: createdWithRelations.length > 0 ? createdWithRelations : undefined,
          createdWithChildren: createdWithChildren.length > 0 ? createdWithChildren : undefined
        });
      } else {
        // 正常处理：为每个创建交互创建节点
        for (const creationInteraction of creationInteractions) {
          const nodeId = createComputationId('entity', entity.name, undefined, undefined, undefined, creationInteraction.name);
          
          // 使用创建交互的依赖作为计算依赖
          const deps = creationInteraction.dependencies || [];
          const parsedDeps = deps.map(parseDependency);
          
          // 构建展开的依赖：将实体依赖展开为对应的创建交互节点
          const expandedDeps: string[] = [];
          for (const dep of parsedDeps) {
            // 检查依赖是否是另一个实体
            const depEntity = analysis.entities.find(e => e.name === dep);
            if (depEntity) {
              // 找到被依赖实体的创建交互
              const depCreationInteractions = depEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
              if (depCreationInteractions.length > 0) {
                // 优先查找同名的创建交互
                const matchingInteraction = depCreationInteractions.find(ci => ci.name === creationInteraction.name);
                if (matchingInteraction) {
                  // 如果有同名创建交互，只依赖这一个
                  const depNodeId = createComputationId('entity', dep, undefined, undefined, undefined, matchingInteraction.name);
                  expandedDeps.push(depNodeId);
                } else {
                  // 否则依赖所有创建交互
                  for (const depCreationInteraction of depCreationInteractions) {
                    const depNodeId = createComputationId('entity', dep, undefined, undefined, undefined, depCreationInteraction.name);
                    expandedDeps.push(depNodeId);
                  }
                }
              } else {
                // 如果没有创建交互（data-derived等），直接使用实体名
                expandedDeps.push(dep);
              }
            } else {
              // 不是实体依赖，直接添加
              expandedDeps.push(dep);
            }
          }
          
          nodes.push({
            id: nodeId,
            type: 'entity',
            entityName: entity.name,
            computationType: entity.entityAnalysis?.computationDecision || 'Creation',
            dependencies: parsedDeps,  // 使用创建交互的依赖
            expandedDependencies: expandedDeps,  // 展开的依赖，将实体映射到对应的创建交互节点
            interactionDependencies: [creationInteraction.name],  // 只包含当前创建交互
            reasoning: entity.entityAnalysis?.reasoning || 'Entity creation/setup',
            calculationMethod: entity.entityAnalysis?.calculationMethod || 'Entity must exist before its properties',
            completed: false,
            creationInteraction: {
              name: creationInteraction.name,
              description: creationInteraction.description,
              dependencies: creationInteraction.dependencies
            },
            lifecycle: entity.entityAnalysis?.lifecycle,
            ownerProperties: ownerProperties.length > 0 ? ownerProperties : undefined,  // 添加 _owner 属性列表
            createdWithRelations: createdWithRelations.length > 0 ? createdWithRelations : undefined,  // 添加 created-with-entity 关系列表
            createdWithChildren: createdWithChildren.length > 0 ? createdWithChildren : undefined  // 添加 created-with-parent 子实体列表
          });
        }
      }
    }
    
    // 为有hard-delete的实体添加_isDeleted_属性（integration-event类型已在循环开始处过滤）
    addHardDeletionProperty(entity, true);
  }
  
  // Step 2: 为每个关系的每个创建交互创建独立的计算节点
  for (const relation of analysis.relations) {
    const creationType = relation.relationAnalysis?.lifecycle?.creation?.type;
    
    // 跳过 created-with-entity 类型的关系（已合并到 entity 节点中）
    if (creationType === 'created-with-entity') {
      continue;
    }
    
    const creationInteractions = relation.relationAnalysis?.lifecycle?.creation?.creationInteractions || [];
    const hasComputation = relation.relationAnalysis?.computationDecision && relation.relationAnalysis.computationDecision !== 'None';
    
    // 如果关系有计算，为每个创建交互创建节点，或者为 data-derived/mutation-derived/mixed-derived 类型创建节点
    if (hasComputation && (creationInteractions.length > 0 || creationType === 'data-derived' || creationType === 'mutation-derived' || creationType === 'mixed-derived')) {
      
      // 特殊处理：data-derived、mutation-derived 或 mixed-derived 关系且没有 creationInteractions
      if ((creationType === 'data-derived' || creationType === 'mutation-derived' || creationType === 'mixed-derived') && creationInteractions.length === 0) {
        const nodeId = createComputationId('relation', undefined, undefined, relation.name);
        
        // data-derived 关系的依赖来自其 parent，mutation-derived 和 mixed-derived 关系的依赖来自其 relatedBusinessEntity
        const parent = relation.relationAnalysis?.lifecycle?.creation?.parent;
        const relatedBusinessEntity = relation.relationAnalysis?.lifecycle?.creation?.relatedBusinessEntity;
        const deps = parent ? [parent] : (relatedBusinessEntity ? [relatedBusinessEntity] : []);
        const parsedDeps = deps.map(parseDependency);
        
        // 构建展开的依赖，包括 source 和 target 实体
        const expandedDeps = [...parsedDeps];
        
        // 从 dataDesign 中查找 relation 的 source 和 target 实体
        if (dataDesign && dataDesign.relations && dataDesign.relations[relation.name]) {
          const relationDesign = dataDesign.relations[relation.name];
          
          // 添加 sourceEntity 到展开依赖（如果不在原始依赖中）
          if (relationDesign.sourceEntity && !expandedDeps.includes(relationDesign.sourceEntity)) {
            expandedDeps.push(relationDesign.sourceEntity);
          }
          
          // 添加 targetEntity 到展开依赖（如果不在原始依赖中）
          if (relationDesign.targetEntity && !expandedDeps.includes(relationDesign.targetEntity)) {
            expandedDeps.push(relationDesign.targetEntity);
          }
        }
        
        nodes.push({
          id: nodeId,
          type: 'relation',
          relationName: relation.name,
          computationType: relation.relationAnalysis?.computationDecision || 'Transform',
          dependencies: parsedDeps,
          expandedDependencies: expandedDeps,
          interactionDependencies: [],  // data-derived、mutation-derived 和 mixed-derived 没有直接的交互依赖
          reasoning: relation.relationAnalysis?.reasoning || `${creationType} relation`,
          calculationMethod: relation.relationAnalysis?.calculationMethod || 'Auto-created via Transform computation',
          completed: false,
          lifecycle: relation.relationAnalysis?.lifecycle
        });
      } else {
        // 正常处理：为每个创建交互创建节点
        for (const creationInteraction of creationInteractions) {
          const nodeId = createComputationId('relation', undefined, undefined, relation.name, undefined, creationInteraction.name);
          
          // 使用创建交互的依赖作为计算依赖
          const deps = creationInteraction.dependencies || [];
          const parsedDeps = deps.map(parseDependency);
          
          // 构建展开的依赖，包括 source 和 target 实体
          const expandedDeps: string[] = [];
          
          // 首先展开原始依赖
          for (const dep of parsedDeps) {
            // 检查依赖是否是另一个实体
            const depEntity = analysis.entities.find(e => e.name === dep);
            if (depEntity) {
              // 找到被依赖实体的创建交互
              const depCreationInteractions = depEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
              if (depCreationInteractions.length > 0) {
                // 优先查找同名的创建交互
                const matchingInteraction = depCreationInteractions.find(ci => ci.name === creationInteraction.name);
                if (matchingInteraction) {
                  // 如果有同名创建交互，只依赖这一个
                  const depNodeId = createComputationId('entity', dep, undefined, undefined, undefined, matchingInteraction.name);
                  expandedDeps.push(depNodeId);
                } else {
                  // 否则依赖所有创建交互
                  for (const depCreationInteraction of depCreationInteractions) {
                    const depNodeId = createComputationId('entity', dep, undefined, undefined, undefined, depCreationInteraction.name);
                    expandedDeps.push(depNodeId);
                  }
                }
              } else {
                // 如果没有创建交互（data-derived等），直接使用实体名
                expandedDeps.push(dep);
              }
            } else {
              // 不是实体依赖，直接添加
              expandedDeps.push(dep);
            }
          }
          
          // 从 dataDesign 中查找 relation 的 source 和 target 实体，并展开
          if (dataDesign && dataDesign.relations && dataDesign.relations[relation.name]) {
            const relationDesign = dataDesign.relations[relation.name];
            
            // 处理 sourceEntity
            if (relationDesign.sourceEntity) {
              const sourceEntity = analysis.entities.find(e => e.name === relationDesign.sourceEntity);
              if (sourceEntity) {
                const sourceCreationInteractions = sourceEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
                if (sourceCreationInteractions.length > 0) {
                  // 优先查找同名的创建交互
                  const matchingInteraction = sourceCreationInteractions.find(ci => ci.name === creationInteraction.name);
                  if (matchingInteraction) {
                    const sourceNodeId = createComputationId('entity', relationDesign.sourceEntity, undefined, undefined, undefined, matchingInteraction.name);
                    if (!expandedDeps.includes(sourceNodeId)) {
                      expandedDeps.push(sourceNodeId);
                    }
                  } else {
                    // 否则依赖所有创建交互
                    for (const sourceCreationInteraction of sourceCreationInteractions) {
                      const sourceNodeId = createComputationId('entity', relationDesign.sourceEntity, undefined, undefined, undefined, sourceCreationInteraction.name);
                      if (!expandedDeps.includes(sourceNodeId)) {
                        expandedDeps.push(sourceNodeId);
                      }
                    }
                  }
                } else {
                  // 如果没有创建交互，直接使用实体名
                  if (!expandedDeps.includes(relationDesign.sourceEntity)) {
                    expandedDeps.push(relationDesign.sourceEntity);
                  }
                }
              }
            }
            
            // 处理 targetEntity
            if (relationDesign.targetEntity) {
              const targetEntity = analysis.entities.find(e => e.name === relationDesign.targetEntity);
              if (targetEntity) {
                const targetCreationInteractions = targetEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
                if (targetCreationInteractions.length > 0) {
                  // 优先查找同名的创建交互
                  const matchingInteraction = targetCreationInteractions.find(ci => ci.name === creationInteraction.name);
                  if (matchingInteraction) {
                    const targetNodeId = createComputationId('entity', relationDesign.targetEntity, undefined, undefined, undefined, matchingInteraction.name);
                    if (!expandedDeps.includes(targetNodeId)) {
                      expandedDeps.push(targetNodeId);
                    }
                  } else {
                    // 否则依赖所有创建交互
                    for (const targetCreationInteraction of targetCreationInteractions) {
                      const targetNodeId = createComputationId('entity', relationDesign.targetEntity, undefined, undefined, undefined, targetCreationInteraction.name);
                      if (!expandedDeps.includes(targetNodeId)) {
                        expandedDeps.push(targetNodeId);
                      }
                    }
                  }
                } else {
                  // 如果没有创建交互，直接使用实体名
                  if (!expandedDeps.includes(relationDesign.targetEntity)) {
                    expandedDeps.push(relationDesign.targetEntity);
                  }
                }
              }
            }
          }
          
          nodes.push({
            id: nodeId,
            type: 'relation',
            relationName: relation.name,
            computationType: relation.relationAnalysis?.computationDecision || 'Creation',
            dependencies: parsedDeps,  // 使用创建交互的依赖
            expandedDependencies: expandedDeps,  // 展开的依赖，将实体映射到对应的创建交互节点
            interactionDependencies: [creationInteraction.name],  // 只包含当前创建交互
            reasoning: relation.relationAnalysis?.reasoning || 'Relation creation/setup',
            calculationMethod: relation.relationAnalysis?.calculationMethod || 'Relation must exist',
            completed: false,
            creationInteraction: {
              name: creationInteraction.name,
              description: creationInteraction.description,
              dependencies: creationInteraction.dependencies
            },
            lifecycle: relation.relationAnalysis?.lifecycle
          });
        }
      }
    }
    
    // 为有hard-delete的关系添加_isDeleted_属性
    addHardDeletionProperty(relation, false);
  }
  
  // Step 3: 创建所有属性计算节点（排除 _owner 类型的属性）
  for (const entity of analysis.entities) {
    // 跳过没有计算的实体的属性
    const computationDecision = entity.entityAnalysis?.computationDecision;
    if (!computationDecision || computationDecision === 'None') {
      continue;
    }
    
    for (const prop of entity.propertyAnalysis) {
      // 跳过 _owner 类型的属性（已经合并到 entity 节点中）和 None 类型的属性
      if (prop.computationDecision && prop.computationDecision !== 'None' && prop.computationDecision !== '_owner') {
        const nodeId = createComputationId('property', entity.name, prop.propertyName);
        const deps = prop.dependencies || [];
        
        // 处理 _self. 前缀的依赖，转换为实际的属性引用
        const parsedDeps = deps.map(dep => {
          if (dep.startsWith('_self.')) {
            // 将 _self.propertyName 转换为 EntityName.propertyName
            const propertyName = dep.substring(6); // 移除 '_self.' 前缀
            return `${entity.name}.${propertyName}`;
          }
          return parseDependency(dep);
        });
        
        // 构建展开的依赖
        const expandedDeps: string[] = [];
        
        // 1. 属性必须依赖于其所在的实体的所有创建交互
        const entityCreationInteractions = entity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
        for (const creationInteraction of entityCreationInteractions) {
          const entityNodeId = createComputationId('entity', entity.name, undefined, undefined, undefined, creationInteraction.name);
          expandedDeps.push(entityNodeId);
        }
        
        // 2. 添加处理后的依赖
        for (const dep of parsedDeps) {
          if (!expandedDeps.includes(dep)) {
            expandedDeps.push(dep);
          }
          
          // 3. 如果依赖 Entity.property，也要依赖 Entity 的所有创建交互
          if (dep.includes('.')) {
            const entityOrRelationName = dep.split('.')[0];
            // 查找对应的实体，添加其所有创建交互节点
            const depEntity = analysis.entities.find(e => e.name === entityOrRelationName);
            if (depEntity) {
              const depEntityCreationInteractions = depEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
              for (const creationInteraction of depEntityCreationInteractions) {
                const depEntityNodeId = createComputationId('entity', entityOrRelationName, undefined, undefined, undefined, creationInteraction.name);
                if (!expandedDeps.includes(depEntityNodeId)) {
                  expandedDeps.push(depEntityNodeId);
                }
              }
            } else {
              // 如果不是实体，可能是关系，添加原始依赖
              if (!expandedDeps.includes(entityOrRelationName)) {
                expandedDeps.push(entityOrRelationName);
              }
            }
          }
        }
        
        nodes.push({
          id: nodeId,
          type: 'property',
          entityName: entity.name,
          propertyName: prop.propertyName,
          computationType: prop.computationDecision,
          dependencies: deps,  // 保持原始的依赖（带 _self. 前缀）
          expandedDependencies: expandedDeps,  // 展开的所有依赖（_self. 已转换）
          interactionDependencies: prop.interactionDependencies,
          reasoning: prop.reasoning,
          calculationMethod: prop.calculationMethod,
          completed: false
        });
      }
    }
  }
  
  // Step 4: 处理字典级别的计算
  for (const dict of analysis.dictionaries) {
    if (dict.dictionaryAnalysis && dict.dictionaryAnalysis.computationDecision && dict.dictionaryAnalysis.computationDecision !== 'None') {
      const nodeId = createComputationId('dictionary', undefined, undefined, undefined, dict.name);
      const deps = dict.dictionaryAnalysis.dependencies || [];
      const parsedDeps = deps.map(parseDependency);
      
      // 构建展开的依赖
      const expandedDeps: string[] = [];
      for (const dep of parsedDeps) {
        expandedDeps.push(dep);
        
        // 如果依赖 Entity.property，也要依赖 Entity 的所有创建交互
        if (dep.includes('.')) {
          const entityOrRelationName = dep.split('.')[0];
          // 查找对应的实体，添加其所有创建交互节点
          const depEntity = analysis.entities.find(e => e.name === entityOrRelationName);
          if (depEntity) {
            const depEntityCreationInteractions = depEntity.entityAnalysis?.lifecycle?.creation?.creationInteractions || [];
            for (const creationInteraction of depEntityCreationInteractions) {
              const depEntityNodeId = createComputationId('entity', entityOrRelationName, undefined, undefined, undefined, creationInteraction.name);
              if (!expandedDeps.includes(depEntityNodeId)) {
                expandedDeps.push(depEntityNodeId);
              }
            }
          } else {
            // 如果不是实体，可能是关系，添加原始依赖
            if (!expandedDeps.includes(entityOrRelationName)) {
              expandedDeps.push(entityOrRelationName);
            }
          }
        }
      }
      
      nodes.push({
        id: nodeId,
        type: 'dictionary',
        dictionaryName: dict.name,
        computationType: dict.dictionaryAnalysis.computationDecision!,
        dependencies: parsedDeps,  // 保持原始的计算依赖
        expandedDependencies: expandedDeps,  // 展开的所有依赖
        interactionDependencies: dict.dictionaryAnalysis.interactionDependencies,
        reasoning: dict.dictionaryAnalysis.reasoning || '',
        calculationMethod: dict.dictionaryAnalysis.calculationMethod || '',
        completed: false
      });
    }
  }
  
  // Step 5: 构建边（依赖关系）- 使用 expandedDependencies 构建完整的依赖图
  for (const node of nodes) {
    for (const dep of node.expandedDependencies) {
      // 检查是否是交互或系统依赖
      const isInteractionOrSystem = isInteractionDependency(dep) || isSystemDependency(dep);
      
      if (!isInteractionOrSystem) {
        // 尝试找到依赖对应的节点ID
        const fromNodeId = findNodeIdByDependency(dep, nodes);
        if (fromNodeId) {
          // 避免重复边
          if (!edges.some(e => e.from === fromNodeId && e.to === node.id)) {
            edges.push({ from: fromNodeId, to: node.id });
          }
        }
      }
    }
  }
  
  return { nodes, edges };
}

// 拓扑排序
function topologicalSort(nodes: ComputationNode[], edges: { from: string; to: string }[]): ComputationNode[][] {
  // 创建邻接表和入度表
  const adjacencyList: Map<string, string[]> = new Map();
  const inDegree: Map<string, number> = new Map();
  
  // 初始化
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  
  // 构建邻接表和入度表
  for (const edge of edges) {
    // 只处理存在的节点之间的边
    if (inDegree.has(edge.to)) {
      const fromList = adjacencyList.get(edge.from) || [];
      fromList.push(edge.to);
      adjacencyList.set(edge.from, fromList);
      
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }
  }
  
  // 分层处理
  const levels: ComputationNode[][] = [];
  const visited = new Set<string>();
  
  while (visited.size < nodes.length) {
    // 找出当前层（入度为0的节点）
    const currentLevel: ComputationNode[] = [];
    
    for (const node of nodes) {
      if (!visited.has(node.id) && inDegree.get(node.id) === 0) {
        currentLevel.push(node);
        visited.add(node.id);
      }
    }
    
    if (currentLevel.length === 0 && visited.size < nodes.length) {
      // 找出未处理的节点（可能依赖于不存在的计算节点）
      const remaining = nodes.filter(n => !visited.has(n.id));
      console.log('\nNote: Some computations depend on non-computed properties/relations:');
      for (const node of remaining) {
        // 检查展开依赖中缺失的节点
        const missingExpandedDeps = node.expandedDependencies.filter(d => 
          !isInteractionDependency(d) && 
          !isSystemDependency(d) && 
          !nodes.some(n => n.id === d)
        );
        
        // 但显示原始依赖，这样更清晰
        const missingOriginalDeps = node.dependencies.filter(d => 
          !isInteractionDependency(d) && 
          !isSystemDependency(d) && 
          !nodes.some(n => n.id === d)
        );
        
        if (missingExpandedDeps.length > 0) {
          console.log(`  - ${node.id} has missing dependencies in graph: ${missingExpandedDeps.join(', ')}`);
          if (missingOriginalDeps.length > 0) {
            console.log(`    (original computation dependencies: ${missingOriginalDeps.join(', ')})`);
          }
        }
      }
      currentLevel.push(...remaining);
      remaining.forEach(n => visited.add(n.id));
    }
    
    if (currentLevel.length > 0) {
      levels.push(currentLevel);
      
      // 更新入度
      for (const node of currentLevel) {
        const neighbors = adjacencyList.get(node.id) || [];
        for (const neighbor of neighbors) {
          inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        }
      }
    }
  }
  
  return levels;
}

// 生成实现计划
function generateImplementationPlan(levels: ComputationNode[][], totalNodes: number): ImplementationPlan {
  const phases = levels.map((level, index) => {
    // 按类型分组
    const entityComputations = level.filter(n => n.type === 'entity');
    const propertyComputations = level.filter(n => n.type === 'property');
    const relationComputations = level.filter(n => n.type === 'relation');
    const dictionaryComputations = level.filter(n => n.type === 'dictionary');
    
    let description = `Phase ${index + 1}: `;
    const parts: string[] = [];
    
    if (entityComputations.length > 0) {
      parts.push(`${entityComputations.length} entity computation(s)`);
    }
    if (propertyComputations.length > 0) {
      parts.push(`${propertyComputations.length} property computation(s)`);
    }
    if (relationComputations.length > 0) {
      parts.push(`${relationComputations.length} relation computation(s)`);
    }
    if (dictionaryComputations.length > 0) {
      parts.push(`${dictionaryComputations.length} dictionary computation(s)`);
    }
    
    description += parts.join(', ');
    
    return {
      phase: index + 1,
      computations: level,
      description
    };
  });
  
  return {
    totalComputations: totalNodes,
    implementationOrder: phases
  };
}

// 读取 .currentmodule 获取当前模块名
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

// 主函数
function main() {
  try {
    // 获取当前模块名
    const module = getCurrentModule();
    
    // 读取输入文件（带模块前缀）
    const inputPath = path.join(process.cwd(), 'agentspace', `${module}.computation-analysis.json`);
    const dataDesignPath = path.join(process.cwd(), 'agentspace', `${module}.data-design.json`);
    const outputPath = path.join(process.cwd(), 'agentspace', `${module}.computation-implementation-plan.json`);
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found at ${inputPath}`);
      console.error(`Expected file: ${module}.computation-analysis.json`);
      process.exit(1);
    }
    
    if (!fs.existsSync(dataDesignPath)) {
      console.error(`Error: Data design file not found at ${dataDesignPath}`);
      console.error(`Expected file: ${module}.data-design.json`);
      process.exit(1);
    }
    
    const analysisData = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as ComputationAnalysis;
    const dataDesignData = JSON.parse(fs.readFileSync(dataDesignPath, 'utf-8'));
    
    // 构建计算图
    const { nodes, edges } = buildComputationGraph(analysisData, dataDesignData);
    
    console.log(`Found ${nodes.length} computations to analyze`);
    console.log(`Found ${edges.length} dependency edges`);
    
    // 拓扑排序
    const levels = topologicalSort(nodes, edges);
    
    console.log(`Organized into ${levels.length} implementation phases`);
    
    // 生成实现计划
    const plan = generateImplementationPlan(levels, nodes.length);
    
    // 输出结果
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    
    console.log(`\n✅ Implementation plan generated successfully!`);
    console.log(`📄 Output written to: ${outputPath}`);
    
    console.log(`\n📊 Total computations: ${plan.totalComputations}`);
    
    console.log(`\n📋 Implementation Phases:`);
    for (const phase of plan.implementationOrder) {
      console.log(`\n  ${phase.description}`);
      console.log(`  Computations:`);
      for (const comp of phase.computations) {
        let name = '';
        if (comp.type === 'entity') {
          name = `Entity: ${comp.entityName}`;
          if (comp.creationInteraction) {
            name += ` (via ${comp.creationInteraction.name})`;
          }
          // 显示合并的 _owner 属性
          if (comp.ownerProperties && comp.ownerProperties.length > 0) {
            const ownerProps = comp.ownerProperties.map(p => p.propertyName).join(', ');
            name += ` [includes _owner properties: ${ownerProps}]`;
          }
          // 显示合并的 created-with-entity 关系
          if (comp.createdWithRelations && comp.createdWithRelations.length > 0) {
            const relations = comp.createdWithRelations.map(r => r.name).join(', ');
            name += ` [includes created-with-entity relations: ${relations}]`;
          }
          // 显示合并的 created-with-parent 子实体
          if (comp.createdWithChildren && comp.createdWithChildren.length > 0) {
            const children = comp.createdWithChildren.map(e => e.name).join(', ');
            name += ` [includes created-with-parent children: ${children}]`;
          }
        } else if (comp.type === 'property') {
          name = `Property: ${comp.entityName}.${comp.propertyName}`;
        } else if (comp.type === 'relation') {
          name = `Relation: ${comp.relationName}`;
          if (comp.creationInteraction) {
            name += ` (via ${comp.creationInteraction.name})`;
          }
        } else if (comp.type === 'dictionary') {
          name = `Dictionary: ${comp.dictionaryName}`;
        }
        console.log(`    - ${name} (${comp.computationType}) [completed: ${comp.completed}]`);
      }
    }
    
  } catch (error) {
    console.error('Error generating implementation plan:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
