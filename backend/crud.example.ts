import { 
    Entity, 
    Property, 
    Relation, 
    Interaction, 
    Action, 
    Payload, 
    PayloadItem,
    Transform, 
    StateMachine, 
    StateNode, 
    StateTransfer, 
    Count, 
    MatchExp,
    InteractionEventEntity,
    Condition,
    Conditions,
    BoolExp,
    HardDeletionProperty
  } from 'interaqt'
  
  // =============================================================================
  // ENTITIES
  // =============================================================================
  
  export const User = Entity.create({
    name: 'User',
    properties: [
      Property.create({ name: 'username', type: 'string' }),
      Property.create({ name: 'email', type: 'string' }),
      Property.create({ name: 'role', type: 'string', defaultValue: () => 'user' }),
      // Article count will be added after relation is defined
    ]
  })
  
  // State nodes for article lifecycle
  const draftState = StateNode.create({ name: 'draft' })
  const publishedState = StateNode.create({ name: 'published' })
  const deletedState = StateNode.create({ name: 'deleted' })
  
  // Article lifecycle state machine
  const ArticleLifecycleStateMachine = StateMachine.create({
    states: [draftState, publishedState, deletedState],
    initialState: draftState,
    transfers: []  // Will be populated after interactions are defined
  })
  
  export const Article = Entity.create({
    name: 'Article',
    properties: [
      Property.create({ name: 'title', type: 'string' }),
      Property.create({ name: 'content', type: 'string' }),
      Property.create({ name: 'createdAt', type: 'number' }),
      Property.create({
        name: 'status',
        type: 'string'
      }),
      Property.create({
        name: 'isDeleted',
        type: 'boolean'
      })
    ]
  })
  
  // === Filtered Entity ===
  export const ActiveArticle = Entity.create({
    name: 'ActiveArticle',
    baseEntity: Article,
    matchExpression: MatchExp.atom({
      key: 'status',
      value: ['!=', 'deleted']
    })
  })
  
  // =============================================================================
  // RELATIONS
  // =============================================================================
  
  export const UserArticleRelation = Relation.create({
    source: Article,
    sourceProperty: 'author',
    target: User,
    targetProperty: 'articles',
    type: 'n:1'
  })
  
  // =============================================================================
  // CONDITIONS
  // =============================================================================
  
  // Admin role condition
  export const AdminAttributive = Condition.create({
    name: 'Admin',
    content: async function Admin(this: any, event: any) {
      return event.user?.role === 'admin'
    }
  })
  
  // Author role attributive - basic author role
  export const AuthorAttributive = Condition.create({
    name: 'Author',
    content: async function Author(this: any, event: any) {
      return event.user?.role === 'author' || event.user?.role === 'admin'
    }
  })
  
  // Article author attributive - check if user is the author of the article
  export const ArticleAuthorAttributive = Condition.create({
    name: 'ArticleAuthor',
    content: async function ArticleAuthor(this: any, event: any) {
      const articleId = event.payload?.article?.id
      
      if (!articleId) return false
      
      const article = await this.system.storage.findOne('Article',
        MatchExp.atom({ key: 'id', value: ['=', articleId] }),
        undefined,
        [['author', { attributeQuery: ['id'] }]]
      )
      
      return article && article.author.id === event.user.id
    }
  })
  
  // Draft article attributive - payload constraint to only allow draft articles
  export const DraftArticleAttributive = Condition.create({
    name: 'DraftArticle',
    content: async function DraftArticle(this: any, event: any) {
      const article = event.payload?.article
      if (!article?.id) return false
      
      const articleData = await this.system.storage.findOne('Article',
        MatchExp.atom({ key: 'id', value: ['=', article.id] }),
        undefined,
        ['status']
      )
      
      return articleData && articleData.status === 'draft'
    }
  })
  
  // Not deleted article attributive - payload constraint
  export const NotDeletedArticleAttributive = Condition.create({
    name: 'NotDeletedArticle', 
    content: async function NotDeletedArticle(this: any, event: any) {
      const article = event.payload?.article
      if (!article?.id) return false
      
      const articleData = await this.system.storage.findOne('Article',
        MatchExp.atom({ key: 'id', value: ['=', article.id] }),
        undefined,
        ['status']
      )
      
      return articleData && articleData.status !== 'deleted'
    }
  })
  
  // Deleted article attributive - payload constraint for restore
  export const DeletedArticleAttributive = Condition.create({
    name: 'DeletedArticle',
    content: async function DeletedArticle(this: any, event: any) {
      const article = event.payload?.article
      if (!article?.id) return false
      
      const articleData = await this.system.storage.findOne('Article',
        MatchExp.atom({ key: 'id', value: ['=', article.id] }),
        undefined,
        ['status']
      )
      
      return articleData && articleData.status === 'deleted'
    }
  })
  
  // =============================================================================
  // INTERACTIONS
  // =============================================================================
  
  export const CreateArticle = Interaction.create({
    name: 'CreateArticle',
    action: Action.create({ name: 'createArticle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ name: 'title', type: 'string', required: true }),
        PayloadItem.create({ name: 'content', type: 'string', required: true }),
        PayloadItem.create({ name: 'authorId', type: 'string', required: true })
      ]
    }),
    // Only authors or admins can create articles
    conditions: AuthorAttributive
  })
  
  // Combined condition for publish article
  const CanPublishArticle = Conditions.create({
    content: BoolExp.atom(DraftArticleAttributive)
      .and(
        BoolExp.atom(ArticleAuthorAttributive)
          .or(BoolExp.atom(AdminAttributive))
      )
  })
  
  export const PublishArticle = Interaction.create({
    name: 'PublishArticle',
    action: Action.create({ name: 'publishArticle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ 
          name: 'article', 
          type: 'Entity',
          base: Article,
          isRef: true,
          required: true
        })
      ]
    }),
    // Only article author or admin can publish, and article must be draft
    conditions: CanPublishArticle
  })
  
  // Combined condition for delete article
  const CanDeleteArticle = Conditions.create({
    content: BoolExp.atom(NotDeletedArticleAttributive)
      .and(
        BoolExp.atom(ArticleAuthorAttributive)
          .or(BoolExp.atom(AdminAttributive))
      )
  })
  
  export const DeleteArticle = Interaction.create({
    name: 'DeleteArticle',
    action: Action.create({ name: 'deleteArticle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ 
          name: 'article', 
          type: 'Entity',
          base: Article,
          isRef: true,
          required: true
        })
      ]
    }),
    // Only article author or admin can delete, and article must not be deleted
    conditions: CanDeleteArticle
  })
  
  // Combined condition for restore article  
  const CanRestoreArticle = Conditions.create({
    content: BoolExp.atom(DeletedArticleAttributive)
      .and(BoolExp.atom(AdminAttributive))
  })
  
  export const RestoreArticle = Interaction.create({
    name: 'RestoreArticle',
    action: Action.create({ name: 'restoreArticle' }),
    payload: Payload.create({
      items: [
        PayloadItem.create({ 
          name: 'article', 
          type: 'Entity',
          base: Article,
          isRef: true,
          required: true
        })
      ]
    }),
    // Only admins can restore deleted articles
    conditions: CanRestoreArticle
  })
  
  // =============================================================================
  // EXPORTS
  // =============================================================================
  
  export const entities = [User, Article, ActiveArticle]
  export const relations = [UserArticleRelation]
  export const activities = []
  export const interactions = [CreateArticle, PublishArticle, DeleteArticle, RestoreArticle]
  export const dicts = []
  
  // =============================================================================
  // COMPUTATIONS
  // =============================================================================
  
  // Article entity Transform computation
  Article.computation = Transform.create({
    eventDeps: {
      ArticleInteraction: {
        recordName: InteractionEventEntity.name,
        type: 'create'
      }
    },
    callback: function(mutationEvent) {
      const event = mutationEvent.record;
      if (event.interactionName === 'CreateArticle') {
        return {
          title: event.payload.title,
          content: event.payload.content,
          createdAt: Math.floor(Date.now()/1000),
          author: event.payload.authorId  // authorId is already { id: xxx }
        }
      }
      return null
    }
  })
  
  // Article status property StateMachine computation
  Article.properties.find(p => p.name === 'status').computation = ArticleLifecycleStateMachine
  
  // Article isDeleted property computed function
  Article.properties.find(p => p.name === 'isDeleted').computed = (article) => article.status === 'deleted'
  
  // Now add the article count property to User
  User.properties.push(
    Property.create({
      name: 'articleCount',
      type: 'number',
      computation: Count.create({
        property: 'articles'  // Use property name from relation
      })
    })
  )
  
  // Now add transfers to the state machine
  ArticleLifecycleStateMachine.transfers = [
    StateTransfer.create({
      current: draftState,
      next: publishedState,
      trigger: {
        recordName: InteractionEventEntity.name,
        type: 'create',
        record: {
          interactionName: PublishArticle.name
        }
      },
      computeTarget: (mutationEvent) => ({ id: mutationEvent.record.payload.article.id })
    }),
    StateTransfer.create({
      current: publishedState,
      next: deletedState,
      trigger: {
        recordName: InteractionEventEntity.name,
        type: 'create',
        record: {
          interactionName: DeleteArticle.name
        }
      },
      computeTarget: (mutationEvent) => ({ id: mutationEvent.record.payload.article.id })
    }),
    StateTransfer.create({
      current: draftState,
      next: deletedState,
      trigger: {
        recordName: InteractionEventEntity.name,
        type: 'create',
        record: {
          interactionName: DeleteArticle.name
        }
      },
      computeTarget: (mutationEvent) => ({ id: mutationEvent.record.payload.article.id })
    }),
    StateTransfer.create({
      current: deletedState,
      next: draftState,
      trigger: {
        recordName: InteractionEventEntity.name,
        type: 'create',
        record: {
          interactionName: RestoreArticle.name
        }
      },
      computeTarget: (mutationEvent) => ({ id: mutationEvent.record.payload.article.id })
    })
  ]