import { describe, test, expect, beforeEach } from 'vitest'
import { 
  Controller, MonoSystem, MatchExp
} from 'interaqt'
import {
  User, Article, ActiveArticle, UserArticleRelation,
  CreateArticle, PublishArticle, DeleteArticle, RestoreArticle,
  entities, relations, interactions
} from '@/backend/crud.example.js'
import { PGLiteDB } from '@/main-component/dbclients/PGLite';

describe('Simple CRUD Example', () => {
  let system: MonoSystem
  let controller: Controller

  beforeEach(async () => {
    // Create fresh system and controller for each test
    system = new MonoSystem(new PGLiteDB())
    
    controller = new Controller({
      system,
      entities,
      relations,
      interactions,
    })

    await controller.setup(true)
  })

  test('should create an article', async () => {
    // Setup: Create a test user with author role
    const testUser = await system.storage.create('User', {
      username: 'john_doe',
      email: 'john@example.com',
      role: 'author'  // Set author role
    })

    // Act: Create an article
    const result = await controller.callInteraction('CreateArticle', {
      user: testUser,
      payload: {
        title: 'My First Article',
        content: 'This is the content of my first article.',
        authorId: { id: testUser.id }
      }
    })

    // Assert: Check interaction succeeded
    expect(result.error).toBeUndefined()

    // Verify article was created
    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'My First Article'] }),
      undefined,
      ['title', 'content', 'status', 'isDeleted', 'author', 'id']
    )
    
    expect(article).toBeTruthy()
    expect(article.title).toBe('My First Article')
    expect(article.content).toBe('This is the content of my first article.')
    expect(article.status).toBe('draft')
    expect(article.isDeleted).toBe(false)
    expect(article.author.id).toBe(testUser.id)

    // Verify user's article count
    const updatedUser = await system.storage.findOne('User',
      MatchExp.atom({ key: 'id', value: ['=', testUser.id] }),
      undefined,
      ['username', 'email', 'articleCount', 'id']
    )
    expect(updatedUser.articleCount).toBe(1)
  })

  test('should publish an article', async () => {
    // Setup: Create user with author role and article
    const testUser = await system.storage.create('User', {
      username: 'jane_doe',
      email: 'jane@example.com',
      role: 'author'  // Set author role
    })

    const createResult = await controller.callInteraction('CreateArticle', {
      user: testUser,
      payload: {
        title: 'Article to Publish',
        content: 'This article will be published.',
        authorId: { id: testUser.id }
      }
    })

    expect(createResult.error).toBeUndefined()

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Article to Publish'] }),
      undefined,
      ['id', 'title', 'status']
    )

    // Act: Publish the article (author can publish their own article)
    const publishResult = await controller.callInteraction('PublishArticle', {
      user: testUser,
      payload: {
        article: { id: article.id }
      }
    })

    // Assert
    expect(publishResult.error).toBeUndefined()

    const publishedArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['id', 'status']
    )
    
    expect(publishedArticle.status).toBe('published')
  })

  test('should soft delete an article', async () => {
    // Setup: Create user with author role and article
    const testUser = await system.storage.create('User', {
      username: 'delete_test',
      email: 'delete@example.com',
      role: 'author'  // Set author role
    })

    await controller.callInteraction('CreateArticle', {
      user: testUser,
      payload: {
        title: 'Article to Delete',
        content: 'This article will be deleted.',
        authorId: { id: testUser.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Article to Delete'] }),
      undefined,
      ['id']
    )

    // Act: Delete the article (author can delete their own article)
    const deleteResult = await controller.callInteraction('DeleteArticle', {
      user: testUser,
      payload: {
        article: { id: article.id }
      }
    })

    // Assert
    expect(deleteResult.error).toBeUndefined()

    // Article still exists but is marked as deleted
    const deletedArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['id', 'status', 'isDeleted']
    )
    
    expect(deletedArticle).toBeTruthy()
    expect(deletedArticle.status).toBe('deleted')
    expect(deletedArticle.isDeleted).toBe(true)

    // User's article count should not include deleted articles
    const updatedUser = await system.storage.findOne('User',
      MatchExp.atom({ key: 'id', value: ['=', testUser.id] }),
      undefined,
      ['articleCount']
    )
    // The Count computation now counts all articles (including deleted)
    expect(updatedUser.articleCount).toBe(1)
  })

  test('should filter active articles using ActiveArticle entity', async () => {
    // Setup: Create user with author role and multiple articles
    const testUser = await system.storage.create('User', {
      username: 'filter_test',
      email: 'filter@example.com',
      role: 'author'  // Set author role
    })

    // Create 3 articles
    for (let i = 1; i <= 3; i++) {
      await controller.callInteraction('CreateArticle', {
        user: testUser,
        payload: {
          title: `Article ${i}`,
          content: `Content of article ${i}`,
          authorId: { id: testUser.id }
        }
      })
    }

    // Delete the second article (author can delete their own article)
    const articleToDelete = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Article 2'] }),
      undefined,
      ['id']
    )

    await controller.callInteraction('DeleteArticle', {
      user: testUser,
      payload: {
        article: { id: articleToDelete.id }
      }
    })

    // Act: Query active articles
    const activeArticles = await system.storage.find('ActiveArticle',
      undefined,
      undefined,
      ['id', 'title']
    )

    // Assert
    expect(activeArticles.length).toBe(2)
    expect(activeArticles.find(a => a.title === 'Article 1')).toBeTruthy()
    expect(activeArticles.find(a => a.title === 'Article 2')).toBeFalsy()  // Deleted
    expect(activeArticles.find(a => a.title === 'Article 3')).toBeTruthy()
  })

  test('should restore a deleted article', async () => {
    // Setup: Create author and admin users
    const authorUser = await system.storage.create('User', {
      username: 'author_user',
      email: 'author@example.com',
      role: 'author'
    })

    const adminUser = await system.storage.create('User', {
      username: 'admin_user',
      email: 'admin@example.com',
      role: 'admin'
    })

    // Author creates an article
    await controller.callInteraction('CreateArticle', {
      user: authorUser,
      payload: {
        title: 'Article to Restore',
        content: 'This article will be restored.',
        authorId: { id: authorUser.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Article to Restore'] }),
      undefined,
      ['id']
    )

    // Author deletes the article
    await controller.callInteraction('DeleteArticle', {
      user: authorUser,
      payload: {
        article: { id: article.id }
      }
    })

    // Verify it's deleted
    let currentArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['status']
    )
    expect(currentArticle.status).toBe('deleted')

    // Act: Admin restores the article
    const restoreResult = await controller.callInteraction('RestoreArticle', {
      user: adminUser,
      payload: {
        article: { id: article.id }
      }
    })

    // Assert
    expect(restoreResult.error).toBeUndefined()

    currentArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['status', 'isDeleted']
    )
    
    expect(currentArticle.status).toBe('draft')  // Back to draft
    expect(currentArticle.isDeleted).toBe(false)

    // Should appear in active articles again
    const activeArticles = await system.storage.find('ActiveArticle',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['id']
    )
    expect(activeArticles.length).toBe(1)

    // Author's article count should be 1 again
    const updatedUser = await system.storage.findOne('User',
      MatchExp.atom({ key: 'id', value: ['=', authorUser.id] }),
      undefined,
      ['articleCount']
    )
    expect(updatedUser.articleCount).toBe(1)
  })

  test('should handle complex workflow: create → publish → delete → restore', async () => {
    // Setup: Use admin user who can perform all operations
    const adminUser = await system.storage.create('User', {
      username: 'workflow_admin',
      email: 'workflow@example.com',
      role: 'admin'
    })

    // Create
    const createResult = await controller.callInteraction('CreateArticle', {
      user: adminUser,
      payload: {
        title: 'Workflow Article',
        content: 'Testing complete workflow',
        authorId: { id: adminUser.id }
      }
    })
    expect(createResult.error).toBeUndefined()

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Workflow Article'] }),
      undefined,
      ['id', 'status']
    )
    expect(article.status).toBe('draft')

    // Publish
    const publishResult = await controller.callInteraction('PublishArticle', {
      user: adminUser,
      payload: { article: { id: article.id } }
    })
    expect(publishResult.error).toBeUndefined()

    let currentArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['status']
    )
    expect(currentArticle.status).toBe('published')

    // Delete
    const deleteResult = await controller.callInteraction('DeleteArticle', {
      user: adminUser,
      payload: { article: { id: article.id } }
    })
    expect(deleteResult.error).toBeUndefined()

    currentArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['status', 'isDeleted']
    )
    expect(currentArticle.status).toBe('deleted')
    expect(currentArticle.isDeleted).toBe(true)

    // Restore
    const restoreResult = await controller.callInteraction('RestoreArticle', {
      user: adminUser,
      payload: { article: { id: article.id } }
    })
    expect(restoreResult.error).toBeUndefined()

    currentArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'id', value: ['=', article.id] }),
      undefined,
      ['status', 'isDeleted']
    )
    
    expect(currentArticle.status).toBe('draft')  // Restored to draft
    expect(currentArticle.isDeleted).toBe(false)
  })

  // === Permission System Tests ===
  
  test('should deny regular users from creating articles', async () => {
    // Setup: Create a regular user (not author or admin)
    const regularUser = await system.storage.create('User', {
      username: 'regular_user',
      email: 'regular@example.com',
      role: 'user'  // Regular user role
    })

    // Act: Try to create an article
    const result = await controller.callInteraction('CreateArticle', {
      user: regularUser,
      payload: {
        title: 'Unauthorized Article',
        content: 'This should fail',
        authorId: { id: regularUser.id }
      }
    })

    // Assert: Should fail with permission error
    expect(result.error).toBeTruthy()
    expect((result.error as any).type).toBe('condition check failed')
  })

  test('should deny non-authors from publishing other users articles', async () => {
    // Setup: Create two authors
    const author1 = await system.storage.create('User', {
      username: 'author1',
      email: 'author1@example.com',
      role: 'author'
    })

    const author2 = await system.storage.create('User', {
      username: 'author2', 
      email: 'author2@example.com',
      role: 'author'
    })

    // Author1 creates an article
    await controller.callInteraction('CreateArticle', {
      user: author1,
      payload: {
        title: 'Author1 Article',
        content: 'Created by author1',
        authorId: { id: author1.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Author1 Article'] }),
      undefined,
      ['id']
    )

    // Act: Author2 tries to publish author1's article
    const publishResult = await controller.callInteraction('PublishArticle', {
      user: author2,
      payload: {
        article: { id: article.id }
      }
    })

    // Assert: Should fail with permission error
    expect(publishResult.error).toBeTruthy()
    expect((publishResult.error as any).type).toBe('condition check failed')
  })

  test('should allow admins to operate on any article', async () => {
    // Setup: Create author and admin
    const author = await system.storage.create('User', {
      username: 'content_author',
      email: 'content_author@example.com',
      role: 'author'
    })

    const admin = await system.storage.create('User', {
      username: 'super_admin',
      email: 'admin@example.com',
      role: 'admin'
    })

    // Author creates an article
    await controller.callInteraction('CreateArticle', {
      user: author,
      payload: {
        title: 'Author Article',
        content: 'Created by author',
        authorId: { id: author.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Author Article'] }),
      undefined,
      ['id']
    )

    // Act: Admin publishes author's article
    const publishResult = await controller.callInteraction('PublishArticle', {
      user: admin,
      payload: {
        article: { id: article.id }
      }
    })

    // Assert: Admin can publish any article
    expect(publishResult.error).toBeUndefined()

    // Admin can also delete it
    const deleteResult = await controller.callInteraction('DeleteArticle', {
      user: admin,
      payload: {
        article: { id: article.id }
      }
    })
    expect(deleteResult.error).toBeUndefined()
  })

  test('should enforce payload attributive constraints', async () => {
    // Setup: Create admin user
    const admin = await system.storage.create('User', {
      username: 'payload_test_admin',
      email: 'payload_admin@example.com',
      role: 'admin'
    })

    // Create and publish an article
    await controller.callInteraction('CreateArticle', {
      user: admin,
      payload: {
        title: 'Payload Test Article',
        content: 'Testing payload constraints',
        authorId: { id: admin.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Payload Test Article'] }),
      undefined,
      ['id']
    )

    await controller.callInteraction('PublishArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Act 1: Try to publish an already published article
    const republishResult = await controller.callInteraction('PublishArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Assert: Should fail because article is not in draft status
    expect(republishResult.error).toBeTruthy()
    expect((republishResult.error as any).type).toBe('condition check failed')

    // Act 2: Delete the article
    await controller.callInteraction('DeleteArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Try to delete again
    const redeleteResult = await controller.callInteraction('DeleteArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Assert: Should fail because article is already deleted
    expect(redeleteResult.error).toBeTruthy()
    expect((redeleteResult.error as any).type).toBe('condition check failed')

    // Act 3: Try to restore a non-deleted article (create a new one first)
    await controller.callInteraction('CreateArticle', {
      user: admin,
      payload: {
        title: 'Active Article',
        content: 'This article is not deleted',
        authorId: { id: admin.id }
      }
    })

    const activeArticle = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'Active Article'] }),
      undefined,
      ['id']
    )

    const restoreActiveResult = await controller.callInteraction('RestoreArticle', {
      user: admin,
      payload: { article: { id: activeArticle.id } }
    })

    // Assert: Should fail because article is not deleted
    expect(restoreActiveResult.error).toBeTruthy()
    expect((restoreActiveResult.error as any).type).toBe('condition check failed')
  })

  test('should allow multiple attributives with OR logic', async () => {
    // The PublishArticle interaction allows either the article author OR an admin
    const author = await system.storage.create('User', {
      username: 'or_test_author',
      email: 'or_author@example.com',
      role: 'author'
    })

    const admin = await system.storage.create('User', {
      username: 'or_test_admin',
      email: 'or_admin@example.com',
      role: 'admin'
    })

    const regularUser = await system.storage.create('User', {
      username: 'or_test_regular',
      email: 'or_regular@example.com',
      role: 'user'
    })

    // Author creates article
    await controller.callInteraction('CreateArticle', {
      user: author,
      payload: {
        title: 'OR Logic Test Article',
        content: 'Testing OR attributive logic',
        authorId: { id: author.id }
      }
    })

    const article = await system.storage.findOne('Article',
      MatchExp.atom({ key: 'title', value: ['=', 'OR Logic Test Article'] }),
      undefined,
      ['id']
    )

    // Test 1: Author can publish (ArticleAuthorAttributive passes)
    const authorPublishResult = await controller.callInteraction('PublishArticle', {
      user: author,
      payload: { article: { id: article.id } }
    })
    expect(authorPublishResult.error).toBeUndefined()

    // Reset article to draft for next test
    await controller.callInteraction('DeleteArticle', {
      user: author,
      payload: { article: { id: article.id } }
    })
    await controller.callInteraction('RestoreArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Test 2: Admin can publish (AdminAttributive passes)
    const adminPublishResult = await controller.callInteraction('PublishArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })
    expect(adminPublishResult.error).toBeUndefined()

    // Reset article to draft for next test
    await controller.callInteraction('DeleteArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })
    await controller.callInteraction('RestoreArticle', {
      user: admin,
      payload: { article: { id: article.id } }
    })

    // Test 3: Regular user cannot publish (neither attributive passes)
    const regularPublishResult = await controller.callInteraction('PublishArticle', {
      user: regularUser,
      payload: { article: { id: article.id } }
    })
    expect(regularPublishResult.error).toBeTruthy()
    expect((regularPublishResult.error as any).type).toBe('condition check failed')
  })
}) 